import { NativeModules, Platform } from 'react-native';
import { Container, DI_TOKENS } from '@core/di/Container';
import { EventBus } from '@core/events/EventBus';
import { Logger } from '@core/logger/Logger';
import type { ICheckInRepository } from '../domain/interfaces/ICheckInRepository';

const TAG = 'MissedCheckInUseCase';

interface WorkManagerModule {
  scheduleCheckInEscalation(checkinId: string, delayMinutes: number): Promise<void>;
  cancelCheckInEscalation(checkinId: string): Promise<void>;
}

const WorkManagerNative = NativeModules.WorkManagerModule as WorkManagerModule | undefined;

export class MissedCheckInUseCase {
  private readonly repo: ICheckInRepository;

  constructor() {
    this.repo = Container.resolve<ICheckInRepository>(DI_TOKENS.ICheckInRepository);
  }

  async execute(checkinId: string): Promise<void> {
    const checkin = await this.repo.getById(checkinId);
    if (!checkin || checkin.status !== 'pending') {return;}

    await this.repo.updateStatus(checkinId, 'missed', new Date());
    EventBus.emit('checkin:missed', { checkinId });

    Logger.info(TAG, 'Check-in missed', {
      id: checkinId,
      escalationDelayMinutes: checkin.escalationDelayMinutes,
    });

    // Primary path: WorkManager — survives backgrounding, Doze mode, and process death.
    // The worker broadcasts ACTION_CHECKIN_ESCALATE which the app handles on next foreground.
    if (Platform.OS === 'android' && WorkManagerNative) {
      try {
        await WorkManagerNative.scheduleCheckInEscalation(
          checkinId,
          checkin.escalationDelayMinutes,
        );
        Logger.info(TAG, 'Escalation scheduled via WorkManager', { checkinId });
        return;
      } catch (err) {
        Logger.warn(TAG, 'WorkManager scheduling failed — falling back to setTimeout', {
          message: err instanceof Error ? err.message.slice(0, 80) : String(err),
        });
      }
    }

    // Fallback: setTimeout — only fires while the app is foregrounded.
    // Acceptable for cases where the user is actively using the app.
    setTimeout((): void => {
      void (async () => {
        try {
          const current = await this.repo.getById(checkinId);
          if (current?.status === 'missed') {
            await this.repo.updateStatus(checkinId, 'escalated');
            EventBus.emit('checkin:escalated', { checkinId });
            Logger.info(TAG, 'Escalated via setTimeout fallback', { checkinId });
          }
        } catch (err) {
          Logger.error(TAG, 'setTimeout escalation failed', {
            message: err instanceof Error ? err.message.slice(0, 80) : String(err),
          });
        }
      })();
    }, checkin.escalationDelayMinutes * 60_000);
  }
}
