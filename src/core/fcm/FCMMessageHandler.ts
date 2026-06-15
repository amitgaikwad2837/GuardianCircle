import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import { EventBus } from '@core/events/EventBus';
import { Logger } from '@core/logger/Logger';
import { IdentityManager } from '@core/crypto/IdentityManager';
import { Container, DI_TOKENS } from '@core/di/Container';

// Minimal interface — avoids importing from @features (architecture boundary).
// The concrete guardian repo satisfies this structurally.
interface GuardianSigningLookup {
  getById(id: string): Promise<{ signingPublicKey?: string } | null>;
}

const TAG = 'FCMMessageHandler';

interface AckPayload {
  type: 'sos_ack';
  incidentId: string;
  guardianId: string;
  guardianName: string;
  etaMinutes?: string;  // FCM data values are always strings
  signature?: string;   // ECDSA signature over "${incidentId}:${guardianId}"
  [key: string]: string | undefined; // satisfies Record<string, string | undefined>
}

function isAckPayload(data: Record<string, string | undefined>): data is AckPayload {
  return (
    data.type === 'sos_ack' &&
    typeof data.incidentId === 'string' &&
    typeof data.guardianId === 'string' &&
    typeof data.guardianName === 'string'
  );
}

async function verifyAckSignature(payload: AckPayload): Promise<boolean> {
  if (!payload.signature) {
    // Guardian apps paired before signature support was added are implicitly trusted
    // until they update. Log a warning but do not block — field roll-out is gradual.
    Logger.warn(TAG, 'sos_ack has no signature — accepting (pre-v2 guardian app)', {
      guardianId: payload.guardianId,
    });
    return true;
  }

  try {
    const guardianRepo = Container.resolve<GuardianSigningLookup>(DI_TOKENS.IGuardianRepository);
    const guardian = await guardianRepo.getById(payload.guardianId).catch(() => null);

    if (!guardian?.signingPublicKey) {
      Logger.warn(TAG, 'sos_ack — guardian has no signingPublicKey, accepting', {
        guardianId: payload.guardianId,
      });
      return true;
    }

    // Signed canonical message: "<incidentId>:<guardianId>"
    const canonicalMsg = `${payload.incidentId}:${payload.guardianId}`;
    const valid = await IdentityManager.verify(canonicalMsg, payload.signature, guardian.signingPublicKey);
    if (!valid) {
      Logger.warn(TAG, 'sos_ack signature INVALID — dropping spoofed ack', {
        guardianId: payload.guardianId,
        incidentId: payload.incidentId,
      });
    }
    return valid;
  } catch (err) {
    Logger.warn(TAG, 'sos_ack signature verification failed with error — accepting', {
      error: err instanceof Error ? err.message : String(err),
    });
    // Fail-open on verification errors so a key-store crash doesn't silence all acks.
    return true;
  }
}

async function handleAck(data: Record<string, string | undefined>): Promise<void> {
  if (!isAckPayload(data)) {return;}

  const verified = await verifyAckSignature(data);
  if (!verified) {return;}

  const etaMinutes = data.etaMinutes != null ? parseInt(data.etaMinutes, 10) : undefined;

  Logger.info(TAG, 'sos_ack received', {
    guardianId: data.guardianId,
    incidentId: data.incidentId,
    etaMinutes,
  });

  EventBus.emit('sos:acknowledged', {
    incidentId: data.incidentId,
    guardianId: data.guardianId,
    guardianName: data.guardianName,
    etaMinutes: Number.isFinite(etaMinutes) ? etaMinutes : undefined,
  });

  // If the app is in the background, post a local notification so the user
  // sees the acknowledgement even without opening the app.
  const channelId = await notifee.createChannel({
    id: 'guardian_ack',
    name: 'Guardian acknowledgements',
    importance: 4, // HIGH
  });

  const etaLabel = etaMinutes != null ? ` — ETA ${etaMinutes} min` : '';

  await notifee.displayNotification({
    title: `${data.guardianName} acknowledged`,
    body: `On the way${etaLabel}`,
    android: {
      channelId,
      smallIcon: 'ic_notification',
      pressAction: { id: 'default' },
    },
  });
}

let registered = false;

export const FCMMessageHandler = {
  register(): void {
    if (registered) {return;}
    registered = true;

    // Foreground messages
    messaging().onMessage(async (remoteMessage) => {
      const data = remoteMessage.data as Record<string, string | undefined> | undefined;
      if (data) {await handleAck(data);}
    });

    // Background / quit: the app was opened via notification tap — check initial notification
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (!remoteMessage?.data) {return;}
        void handleAck(remoteMessage.data as Record<string, string | undefined>);
      })
      .catch((err: unknown) => {
        Logger.warn(TAG, 'getInitialNotification failed', { err });
      });

    // App opened from background via notification tap
    messaging().onNotificationOpenedApp((remoteMessage) => {
      if (!remoteMessage.data) {return;}
      void handleAck(remoteMessage.data as Record<string, string | undefined>);
    });

    Logger.info(TAG, 'FCM handlers registered');
  },
};
