import notifee, { AndroidImportance, AndroidStyle, EventType } from '@notifee/react-native';
import { EventBus } from '@core/events/EventBus';
import { ArriveJourneyUseCase } from '../application/ArriveJourneyUseCase';
import { CancelJourneyUseCase } from '../application/CancelJourneyUseCase';
import { Logger } from '@core/logger/Logger';

const TAG = 'JourneyNotificationService';

const CHANNEL_ID  = 'gc_journey_active';
const NOTIF_ID    = 'gc_journey_persistent';
const ACTION_ARRIVED  = 'arrived';
const ACTION_CANCEL   = 'cancel';

let _initialized = false;
type Unsub = () => void;
const _unsubs: Unsub[] = [];

export const JourneyNotificationService = {
  async initialize(): Promise<void> {
    if (_initialized) {return;}
    _initialized = true;

    await notifee.createChannel({
      id:          CHANNEL_ID,
      name:        'Active Journey',
      importance:  AndroidImportance.LOW,
      sound:       '',
    });

    const onStarted = ({ journeyId }: { journeyId: string }): void => {
      void _postPersistentNotification(journeyId);
    };

    const onEnded = (): void => {
      void notifee.cancelNotification(NOTIF_ID);
    };

    EventBus.on('journey:started',   onStarted);
    EventBus.on('journey:arrived',   onEnded);
    EventBus.on('journey:cancelled', onEnded);

    _unsubs.push(
      () => EventBus.off('journey:started',   onStarted),
      () => EventBus.off('journey:arrived',   onEnded),
      () => EventBus.off('journey:cancelled', onEnded),
    );

    // Foreground event handler for notification action buttons
    const stopFg = notifee.onForegroundEvent(({ type, detail }) => {
      if (type !== EventType.ACTION_PRESS) {return;}
      const journeyId = detail.notification?.data?.journeyId as string | undefined;
      if (!journeyId) {return;}

      if (detail.pressAction?.id === ACTION_ARRIVED) {
        void new ArriveJourneyUseCase().execute(journeyId).catch((err) => {
          Logger.error(TAG, 'Arrive failed from notification', {
            message: err instanceof Error ? err.message : String(err),
          });
        });
      } else if (detail.pressAction?.id === ACTION_CANCEL) {
        void new CancelJourneyUseCase().execute(journeyId).catch((err) => {
          Logger.error(TAG, 'Cancel failed from notification', {
            message: err instanceof Error ? err.message : String(err),
          });
        });
      }
    });
    _unsubs.push(stopFg);

    // Background event handler (app killed / background)
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type !== EventType.ACTION_PRESS) {return;}
      const journeyId = detail.notification?.data?.journeyId as string | undefined;
      if (!journeyId) {return;}

      if (detail.pressAction?.id === ACTION_ARRIVED) {
        await new ArriveJourneyUseCase().execute(journeyId).catch(() => {});
        await notifee.cancelNotification(NOTIF_ID);
      } else if (detail.pressAction?.id === ACTION_CANCEL) {
        await new CancelJourneyUseCase().execute(journeyId).catch(() => {});
        await notifee.cancelNotification(NOTIF_ID);
      }
    });
  },

  teardown(): void {
    _unsubs.forEach((fn) => fn());
    _unsubs.length = 0;
    _initialized = false;
  },
};

async function _postPersistentNotification(journeyId: string): Promise<void> {
  await notifee.displayNotification({
    id:    NOTIF_ID,
    title: 'Journey Active',
    body:  'GuardianCircle is monitoring your journey. Tap "I\'ve Arrived" when you reach your destination.',
    data:  { journeyId },
    android: {
      channelId:  CHANNEL_ID,
      importance: AndroidImportance.LOW,
      ongoing:    true,
      asForegroundService: false,
      style: {
        type:      AndroidStyle.BIGTEXT,
        text:      'GuardianCircle is monitoring your journey. Your guardians will be alerted if you go overdue.',
      },
      actions: [
        {
          title:         "I've Arrived",
          pressAction:   { id: ACTION_ARRIVED, launchActivity: 'default' },
        },
        {
          title:         'Cancel Journey',
          pressAction:   { id: ACTION_CANCEL },
        },
      ],
      smallIcon:   'ic_notification',
      color:       '#4CAF50',
    },
  });
}
