import type { ISOSRepository } from '../domain/interfaces/ISOSRepository';
import { EventBus } from '@core/events/EventBus';

export class CancelSOSUseCase {
  constructor(private readonly sosRepo: ISOSRepository) {}

  async execute(incidentId: string, reason: 'user' | 'timeout'): Promise<void> {
    await this.sosRepo.updateIncident(incidentId, {
      status: 'cancelled',
      resolvedAt: new Date(),
      cancelledReason: reason,
    });

    EventBus.emit('sos:cancelled', { incidentId, reason });
  }
}
