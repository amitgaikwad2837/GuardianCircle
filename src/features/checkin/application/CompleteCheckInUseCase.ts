import { Container, DI_TOKENS } from '@core/di/Container';
import { EventBus } from '@core/events/EventBus';
import type { ICheckInRepository } from '../domain/interfaces/ICheckInRepository';

export class CompleteCheckInUseCase {
  private readonly repo: ICheckInRepository;

  constructor() {
    this.repo = Container.resolve<ICheckInRepository>(DI_TOKENS.ICheckInRepository);
  }

  async execute(checkinId: string): Promise<void> {
    const checkin = await this.repo.getById(checkinId);
    if (!checkin) throw new Error(`Check-in ${checkinId} not found.`);
    if (checkin.status !== 'pending' && checkin.status !== 'escalated') {
      throw new Error(`Check-in is already ${checkin.status}.`);
    }

    await this.repo.updateStatus(checkinId, 'completed', new Date());
    EventBus.emit('checkin:completed', { checkinId });
  }
}
