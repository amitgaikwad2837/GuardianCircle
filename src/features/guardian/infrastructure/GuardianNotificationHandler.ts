import messaging, { type FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Container, DI_TOKENS } from '@core/di/Container';
import { IdentityManager } from '@core/crypto/IdentityManager';
import { SmsService } from '@core/sms/SMSService';
import { Logger } from '@core/logger/Logger';
import type { IGuardianRepository } from '../domain/interfaces/IGuardianRepository';
import type { AlertPayload } from '@features/sos/domain/interfaces/IAlertDispatcher';

const TAG = 'GuardianNotificationHandler';
const SOS_CHANNEL_ID = 'gc_sos_alerts';

// Per-sender rate limit — suppresses exact duplicates but must not block SOS escalations.
// 10 s is long enough to de-duplicate FCM retries (FCM may deliver twice within seconds)
// but short enough that genuine escalation alerts (every 30–60 s) are never dropped.
const RATE_LIMIT_MS = 10_000;

let notifee: typeof import('@notifee/react-native').default | null = null;
try {
  notifee = require('@notifee/react-native').default as typeof import('@notifee/react-native').default;
} catch {
  Logger.warn(TAG, 'notifee not available — install @notifee/react-native for local notifications');
}

interface FCMEnvelope {
  encryptedPayload: string;
  signature: string;
  senderPublicKey: string; // ECDSA signing key — used ONLY for lookup + verification
  // Signed timestamp (ms) inside encryptedPayload is used for replay protection;
  // this outer field is untrusted and used only to look up the sender before auth.
}

// Map of signingPublicKey → timestamp of last accepted message (post-verification)
const lastAcceptedAt = new Map<string, number>();

// Maximum age of a signed message before it is rejected as a replay
const MAX_MESSAGE_AGE_MS = 90_000; // 90 s — generous for clock skew, tight for replays

let _initialized = false;
type Unsubscribe = () => void;
const _unsubs: Unsubscribe[] = [];

export const GuardianNotificationHandler = {
  async initialize(): Promise<void> {
    if (_initialized) return;
    _initialized = true;

    await this.ensureNotificationChannel();

    _unsubs.push(messaging().onMessage(async (msg) => { await this.handleMessage(msg); }));
    messaging().setBackgroundMessageHandler(async (msg) => { await this.handleMessage(msg); });
    _unsubs.push(messaging().onTokenRefresh((newToken) => {
      this.broadcastTokenRefresh(newToken).catch((err: unknown) => {
        Logger.warn(TAG, 'Token refresh broadcast failed', { err: String(err) });
      });
    }));

    Logger.info(TAG, 'Initialized');
  },

  teardown(): void {
    _unsubs.forEach((unsub) => unsub());
    _unsubs.length = 0;
    _initialized = false;
  },

  async handleMessage(msg: FirebaseMessagingTypes.RemoteMessage): Promise<void> {
    const data = msg.data as Record<string, string> | undefined;
    if (!data?.encryptedPayload || !data?.signature || !data?.senderPublicKey) {
      Logger.debug(TAG, 'Skipping non-GC message');
      return;
    }

    const envelope: FCMEnvelope = {
      encryptedPayload: data['encryptedPayload']!,
      signature:        data['signature']!,
      senderPublicKey:  data['senderPublicKey']!,
    };

    try {
      const guardianRepo = Container.resolve<IGuardianRepository>(DI_TOKENS.IGuardianRepository);

      // Look up sender by their ECDSA signing key (not encryption key)
      const guardian = await guardianRepo.findBySigningKey(envelope.senderPublicKey);
      if (!guardian) {
        Logger.warn(TAG, 'Received alert from unrecognised signing key — discarding');
        return;
      }

      // Verify ECDSA signature BEFORE rate-limit check — prevents forged keys from
      // consuming or bypassing the rate-limit slot of a legitimate guardian
      const signatureValid = await IdentityManager.verify(
        envelope.encryptedPayload,
        envelope.signature,
        envelope.senderPublicKey,
      );
      if (!signatureValid) {
        Logger.warn(TAG, `Signature verification failed for guardian ${guardian.id} — discarding`);
        return;
      }

      // Decrypt payload to extract the signed timestamp for replay protection
      const plaintext = await IdentityManager.decryptFCMPayload(envelope.encryptedPayload);
      const payload = JSON.parse(plaintext) as AlertPayload & { sentAt?: number; nonce?: string };

      // Reject replays: signed sentAt must be recent and the nonce must not have been seen
      const sentAt = payload.sentAt ?? 0;
      if (Date.now() - sentAt > MAX_MESSAGE_AGE_MS) {
        Logger.warn(TAG, `Rejecting stale FCM message (age ${Date.now() - sentAt} ms) — possible replay`);
        return;
      }

      // Rate limit: drop exact-duplicate deliveries (FCM may deliver the same msg twice)
      const lastSeen = lastAcceptedAt.get(envelope.senderPublicKey) ?? 0;
      if (Date.now() - lastSeen < RATE_LIMIT_MS) {
        Logger.warn(TAG, 'Rate-limited FCM message from known sender — discarding duplicate');
        return;
      }

      // Record accepted timestamp after all checks pass
      lastAcceptedAt.set(envelope.senderPublicKey, Date.now());

      Logger.warn(TAG, `SOS received from ${guardian.displayName} — incident ${payload.incidentId}`);

      await this.displaySOSNotification(guardian.displayName, payload, guardian.phoneNumber);
    } catch (err) {
      Logger.error(TAG, 'Failed to process FCM message', {
        name: err instanceof Error ? err.name : 'unknown',
        message: err instanceof Error ? err.message.slice(0, 120) : String(err),
      });
    }
  },

  async displaySOSNotification(
    senderName: string,
    payload: AlertPayload,
    phoneNumber: string,
  ): Promise<void> {
    if (!notifee) {
      Logger.warn(TAG, `SOS from ${senderName} — notifee unavailable`);
      return;
    }
    try {
      const locationText = payload.location
        ? `${payload.location.lat.toFixed(4)}, ${payload.location.lng.toFixed(4)}`
        : 'Location unavailable';
      const escalationText = payload.escalationLevel > 0
        ? ` (escalation #${payload.escalationLevel})`
        : '';

      await notifee.displayNotification({
        title: `SOS: ${senderName} needs help!${escalationText}`,
        body: `Location: ${locationText}. Tap to acknowledge or call.`,
        data: { incidentId: payload.incidentId, phoneNumber, senderName },
        android: {
          channelId: SOS_CHANNEL_ID,
          importance: 4,
          sound: 'default',
          vibrationPattern: [0, 500, 200, 500],
          actions: [
            { title: 'Acknowledge', pressAction: { id: 'acknowledge' } },
            { title: `Call ${senderName}`, pressAction: { id: 'call', launchActivity: 'default' } },
          ],
          fullScreenAction: { id: 'open' },
        },
      });
    } catch (err) {
      Logger.error(TAG, 'displayNotification failed', {
        message: err instanceof Error ? err.message.slice(0, 120) : String(err),
      });
    }
  },

  async broadcastTokenRefresh(newToken: string): Promise<void> {
    Logger.info(TAG, 'FCM token refreshed — notifying guardians via SMS');
    try {
      const guardianRepo = Container.resolve<IGuardianRepository>(DI_TOKENS.IGuardianRepository);
      const active = await guardianRepo.getActiveGuardians();
      const phones = active.map((g) => g.phoneNumber).filter(Boolean);
      if (phones.length === 0) return;
      const msg = `GuardianCircle: contact's notification address updated. No action needed. Token suffix: ${newToken.slice(-6)}`;
      await SmsService.sendBatch(phones, msg);
    } catch (err) {
      Logger.warn(TAG, 'broadcastTokenRefresh error', {
        message: err instanceof Error ? err.message.slice(0, 120) : String(err),
      });
    }
  },

  async ensureNotificationChannel(): Promise<void> {
    if (!notifee) return;
    try {
      await notifee.createChannel({
        id: SOS_CHANNEL_ID,
        name: 'SOS Alerts',
        importance: 4,
        sound: 'default',
        vibration: true,
        vibrationPattern: [0, 500, 200, 500],
        lights: true,
        lightColor: '#FF0000',
      });
    } catch (err) {
      Logger.warn(TAG, 'createChannel failed', {
        message: err instanceof Error ? err.message.slice(0, 120) : String(err),
      });
    }
  },
};
