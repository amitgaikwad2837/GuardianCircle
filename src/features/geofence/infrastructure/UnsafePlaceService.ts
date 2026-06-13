import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';
import { EventBus } from '@core/events/EventBus';
import { LocationService } from '@core/location/LocationService';
import { Container, DI_TOKENS } from '@core/di/Container';
import { Logger } from '@core/logger/Logger';
import type { IGeofenceRepository } from '../domain/interfaces/IGeofenceRepository';
import type { Coordinates } from '@core/location/LocationService';

const TAG = 'UnsafePlaceService';

const UNSAFE_RADIUS_METERS = 200;
const CHANNEL_ID = 'gc_unsafe_place';

let _initialized = false;
type Unsub = () => void;
const _unsubs: Unsub[] = [];

export const UnsafePlaceService = {
  async initialize(): Promise<void> {
    if (_initialized) {return;}
    _initialized = true;

    await notifee.createChannel({
      id:         CHANNEL_ID,
      name:       'Unsafe Place Alerts',
      importance: AndroidImportance.HIGH,
    });

    const onSOSTriggered = (): void => {
      void (async () => {
        try {
          const loc = await LocationService.getCurrentLocation().catch(() => null);
          if (!loc) {return;}
          await _saveUnsafeGeofence(loc);
          Logger.info(TAG, 'Unsafe place recorded', { lat: loc.lat, lng: loc.lng });
        } catch (err) {
          Logger.error(TAG, 'Failed to save unsafe place', {
            message: err instanceof Error ? err.message : String(err),
          });
        }
      })();
    };

    const onGeofenceEntered = (payload: { geofenceId: string; type: string }): void => {
      if (payload.type !== 'unsafe') {return;}
      void _showUnsafePlaceAlert();
    };

    EventBus.on('sos:triggered', onSOSTriggered);
    EventBus.on('geofence:entered', onGeofenceEntered);

    _unsubs.push(
      () => EventBus.off('sos:triggered', onSOSTriggered),
      () => EventBus.off('geofence:entered', onGeofenceEntered),
    );
  },

  teardown(): void {
    _unsubs.forEach((fn) => fn());
    _unsubs.length = 0;
    _initialized = false;
  },
};

async function _saveUnsafeGeofence(loc: Coordinates): Promise<void> {
  const repo = Container.resolve<IGeofenceRepository>(DI_TOKENS.IGeofenceRepository);
  const all = await repo.getAll();

  // Deduplicate — skip if we already have an unsafe geofence within 100m
  for (const g of all) {
    if (g.type !== 'unsafe') {continue;}
    const dLat = (g.center.lat - loc.lat) * 111_000;
    const dLng = (g.center.lng - loc.lng) * 111_000 * Math.cos((loc.lat * Math.PI) / 180);
    if (Math.sqrt(dLat ** 2 + dLng ** 2) < 100) {return;}
  }

  await repo.create({
    label:             `Unsafe place — ${new Date().toLocaleDateString()}`,
    center:            { lat: loc.lat, lng: loc.lng, timestamp: Date.now() },
    radiusMeters:      UNSAFE_RADIUS_METERS,
    type:              'unsafe',
    alertOn:           'enter',
    isActive:          true,
    guardianIds:       [],
    loiteringDelayMs:  60_000, // 1 min loiter before alerting — avoids instant re-trigger
  });
}

async function _showUnsafePlaceAlert(): Promise<void> {
  await notifee.displayNotification({
    title: 'You are near an unsafe location',
    body:  'GuardianCircle recorded an emergency here. Stay alert — your guardians can be alerted instantly.',
    android: {
      channelId:  CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      style: {
        type: AndroidStyle.BIGTEXT,
        text: 'GuardianCircle recorded an SOS at or near this location. If you feel unsafe, use the SOS button or volume chord.',
      },
      smallIcon: 'ic_notification',
      color:     '#E53935',
      actions: [
        {
          title:       'Trigger SOS',
          pressAction: { id: 'sos', launchActivity: 'default' },
        },
        {
          title:       "I'm Safe",
          pressAction: { id: 'dismiss' },
        },
      ],
    },
  });
}
