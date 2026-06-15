import notifee, { AndroidImportance, AndroidVisibility, EventType } from '@notifee/react-native';
import { EventBus } from '@core/events/EventBus';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
import { Logger } from '@core/logger/Logger';
import { BleMeshService } from '../infrastructure/BleMeshService';
import type { ReceivedBeacon } from '../infrastructure/BleMeshService';

const TAG = 'BleMeshOrchestrator';

// BLE message type codes from native layer
const BLE_TYPE_SOS   = 1;
const BLE_TYPE_RELAY = 3;

const CHANNEL_ID    = 'gc_ble_relay';
const ENROLL_NOTIF  = 'ble_enroll';
const RELAY_NOTIF   = 'ble_relay_sos';

// Minimum gap between relay notifications to avoid spam (one alert per 60 s)
const RELAY_NOTIF_COOLDOWN_MS = 60_000;

/**
 * Singleton orchestrator for BLE mesh offline SOS.
 *
 * Responsibilities:
 *  1. When user triggers SOS: start BLE beacon (regardless of internet state —
 *     belt-and-suspenders; stops on cancel/resolve).
 *  2. When scanning enabled and SOS beacon detected nearby:
 *     - First time: show "enroll as relay helper?" notification.
 *     - Enrolled: show "nearby SOS — tap to relay" notification.
 *  3. When user accepts relay: re-broadcast beacon with hopCount+1.
 *
 * Must be initialised once from App.tsx via `BleMeshOrchestrator.init()`.
 */
class BleMeshOrchestratorImpl {
  private scanUnsubscribe: (() => void) | null = null;
  private lastRelayNotifAt = 0;
  private isBeaconing = false;
  private isScanning = false;
  private unsubscribeEvents: (() => void)[] = [];

  /** Call once at app startup. */
  async init(): Promise<void> {
    if (!BleMeshService.isSupported) {
      Logger.info(TAG, 'BLE not supported on this device — skipping');
      return;
    }

    await this.ensureNotifChannel();
    this.subscribeSosEvents();
    this.subscribeNotifeeActions();

    if (PreferencesStore.getBoolean(PREF_KEYS.BLUETOOTH_MESH_ENABLED)) {
      await this.startScanning();
    }

    Logger.info(TAG, 'Initialised');
  }

  // ── SOS lifecycle ─────────────────────────────────────────────────────────

  private subscribeSosEvents(): void {
    const offTriggered = EventBus.on('sos:triggered', () => {
      void this.startSosBeacon();
    });

    const offCancelled = EventBus.on('sos:cancelled', () => {
      void this.stopBeacon();
    });

    const offResolved = EventBus.on('sos:resolved', () => {
      void this.stopBeacon();
    });

    this.unsubscribeEvents.push(offTriggered, offCancelled, offResolved);
  }

  private async startSosBeacon(): Promise<void> {
    if (this.isBeaconing) { return; }
    try {
      await BleMeshService.startBeacon('SOS');
      this.isBeaconing = true;
      EventBus.emit('ble:beacon_started', { messageType: 'SOS' });
      Logger.info(TAG, 'SOS beacon started');
    } catch (err) {
      Logger.warn(TAG, 'Could not start SOS beacon', { err });
    }
  }

  private async stopBeacon(): Promise<void> {
    if (!this.isBeaconing) { return; }
    try {
      await BleMeshService.stopBeacon();
      this.isBeaconing = false;
      EventBus.emit('ble:beacon_stopped', {});
      Logger.info(TAG, 'Beacon stopped');
    } catch (err) {
      Logger.warn(TAG, 'Could not stop beacon', { err });
    }
  }

  // ── Scanning lifecycle ────────────────────────────────────────────────────

  async startScanning(): Promise<void> {
    if (this.isScanning) { return; }
    try {
      await BleMeshService.startScanning();
      this.isScanning = true;
      this.scanUnsubscribe = BleMeshService.onBeaconReceived(
        (b) => { void this.onBeaconReceived(b); },
      );
      Logger.info(TAG, 'BLE scanning started');
    } catch (err) {
      Logger.warn(TAG, 'Could not start scanning', { err });
    }
  }

  async stopScanning(): Promise<void> {
    if (!this.isScanning) { return; }
    try {
      await BleMeshService.stopScanning();
      this.scanUnsubscribe?.();
      this.scanUnsubscribe = null;
      this.isScanning = false;
      Logger.info(TAG, 'BLE scanning stopped');
    } catch (err) {
      Logger.warn(TAG, 'Could not stop scanning', { err });
    }
  }

  // ── Beacon received from a nearby device ─────────────────────────────────

  private async onBeaconReceived(beacon: ReceivedBeacon): Promise<void> {
    const type = beacon.messageType;
    if (type !== BLE_TYPE_SOS && type !== BLE_TYPE_RELAY) { return; }
    if (beacon.hopCount >= 5) { return; } // max relay depth reached

    Logger.info(TAG, 'Nearby SOS beacon received', { messageType: beacon.messageType, hopCount: beacon.hopCount });
    EventBus.emit('ble:sos_detected', { hopCount: beacon.hopCount });

    const enrolled = PreferencesStore.getBoolean(PREF_KEYS.MESH_RELAY_ENROLLED);
    const prompted = PreferencesStore.getBoolean(PREF_KEYS.MESH_ENROLLMENT_PROMPTED);

    if (!enrolled && !prompted) {
      // First encounter — show enrollment ask
      PreferencesStore.setBoolean(PREF_KEYS.MESH_ENROLLMENT_PROMPTED, true);
      await this.showEnrollmentNotification();
    } else if (enrolled) {
      // Already enrolled — show relay notification (rate-limited)
      const now = Date.now();
      if (now - this.lastRelayNotifAt > RELAY_NOTIF_COOLDOWN_MS) {
        this.lastRelayNotifAt = now;
        await this.showRelayNotification(beacon.hopCount);
      }
    }
  }

  // ── Relay action ──────────────────────────────────────────────────────────

  private async relayBeacon(originalHopCount: number): Promise<void> {
    try {
      // Re-broadcast the SOS with hopCount+1 so it travels further
      await BleMeshService.startBeacon('RELAY');
      EventBus.emit('ble:relaying', { hopCount: originalHopCount + 1 });
      Logger.info(TAG, 'Relaying SOS beacon', { hopCount: originalHopCount + 1 });

      // Stop re-broadcasting after 30 s (enough for nearby devices to pick it up)
      setTimeout(() => { void BleMeshService.stopBeacon(); }, 30_000);
    } catch (err) {
      Logger.warn(TAG, 'Could not relay beacon', { err });
    }
  }

  // ── Notifee setup + action handling ──────────────────────────────────────

  private async ensureNotifChannel(): Promise<void> {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Offline SOS Relay',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      vibration: true,
      vibrationPattern: [0, 300, 200, 300],
    });
  }

  private async showEnrollmentNotification(): Promise<void> {
    await notifee.displayNotification({
      id: ENROLL_NOTIF,
      title: '🔵 Be a GuardianCircle relay?',
      body: 'A nearby user may have triggered an emergency SOS. Enable relay to help extend their signal when there\'s no internet.',
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        pressAction: { id: 'open' },
        actions: [
          {
            title: 'Enable relay',
            pressAction: { id: 'enroll' },
          },
          {
            title: 'Not now',
            pressAction: { id: 'dismiss_enroll' },
          },
        ],
        smallIcon: 'ic_notification',
        color: '#00897B',
      },
    });
  }

  private async showRelayNotification(hopCount: number): Promise<void> {
    const hopsLabel = hopCount === 0 ? 'directly nearby' : `${hopCount} hop${hopCount > 1 ? 's' : ''} away`;
    await notifee.displayNotification({
      id: RELAY_NOTIF,
      title: '🚨 Someone nearby needs help',
      body: `A GuardianCircle SOS was detected (${hopsLabel}). Tap to relay their emergency signal to help it reach more people.`,
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        pressAction: { id: 'open' },
        actions: [
          {
            title: 'Relay SOS',
            pressAction: { id: `relay:${hopCount}` },
          },
          {
            title: 'Dismiss',
            pressAction: { id: 'dismiss_relay' },
          },
        ],
        smallIcon: 'ic_notification',
        color: '#C62828',
        vibrationPattern: [0, 500, 200, 500],
        fullScreenAction: { id: 'default' },
      },
    });
  }

  private subscribeNotifeeActions(): void {
    // Foreground events
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.ACTION_PRESS) {
        void this.handleNotifAction(detail.pressAction?.id ?? '');
      }
    });

    // Background events (app not in foreground)
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.ACTION_PRESS) {
        await this.handleNotifAction(detail.pressAction?.id ?? '');
      }
    });
  }

  private async handleNotifAction(actionId: string): Promise<void> {
    if (actionId === 'enroll') {
      PreferencesStore.setBoolean(PREF_KEYS.MESH_RELAY_ENROLLED, true);
      EventBus.emit('ble:relay_enrolled', {});
      Logger.info(TAG, 'User enrolled as relay helper');
      await notifee.cancelNotification(ENROLL_NOTIF);

    } else if (actionId === 'dismiss_enroll') {
      await notifee.cancelNotification(ENROLL_NOTIF);

    } else if (actionId.startsWith('relay:')) {
      const hopCount = parseInt(actionId.split(':')[1] ?? '0', 10);
      await notifee.cancelNotification(RELAY_NOTIF);
      await this.relayBeacon(hopCount);

    } else if (actionId === 'dismiss_relay') {
      await notifee.cancelNotification(RELAY_NOTIF);
    }
  }

  /** Called from Settings when user toggles BLE mesh on/off. */
  async setEnabled(enabled: boolean): Promise<void> {
    PreferencesStore.setBoolean(PREF_KEYS.BLUETOOTH_MESH_ENABLED, enabled);
    if (enabled) {
      await this.startScanning();
    } else {
      await this.stopScanning();
    }
  }

  get beaconing(): boolean { return this.isBeaconing; }
  get scanning(): boolean { return this.isScanning; }
}

export const BleMeshOrchestrator = new BleMeshOrchestratorImpl();
