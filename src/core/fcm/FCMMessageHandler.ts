import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import { EventBus } from '@core/events/EventBus';
import { Logger } from '@core/logger/Logger';

const TAG = 'FCMMessageHandler';

interface AckPayload {
  type: 'sos_ack';
  incidentId: string;
  guardianId: string;
  guardianName: string;
  etaMinutes?: string; // FCM data values are always strings
}

function isAckPayload(data: Record<string, string | undefined>): data is AckPayload {
  return (
    data.type === 'sos_ack' &&
    typeof data.incidentId === 'string' &&
    typeof data.guardianId === 'string' &&
    typeof data.guardianName === 'string'
  );
}

async function handleAck(data: Record<string, string | undefined>): Promise<void> {
  if (!isAckPayload(data)) {return;}

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

export const FCMMessageHandler = {
  register(): void {
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
