import { Container, DI_TOKENS } from '@core/di/Container';
import type { ICheckInRepository } from '../domain/interfaces/ICheckInRepository';
import type { CheckIn, CheckInType } from '../domain/entities/CheckIn';

export interface ScheduleCheckInInput {
  label?: string;
  type?: CheckInType;
  scheduledAt: Date;
  recurrenceRule?: string;
  escalationDelayMinutes?: number;
  guardianIds?: string[];
  journeyId?: string;
}

export class ScheduleCheckInUseCase {
  private readonly repo: ICheckInRepository;

  constructor() {
    this.repo = Container.resolve<ICheckInRepository>(DI_TOKENS.ICheckInRepository);
  }

  async execute(input: ScheduleCheckInInput): Promise<CheckIn> {
    if (input.scheduledAt < new Date()) {
      throw new Error('Check-in must be scheduled in the future.');
    }

    return this.repo.create({
      label: input.label,
      type: input.type ?? (input.recurrenceRule ? 'recurring' : 'one_time'),
      scheduledAt: input.scheduledAt,
      recurrenceRule: input.recurrenceRule,
      guardianIds: input.guardianIds ?? [],
      escalationDelayMinutes: input.escalationDelayMinutes ?? 15,
      status: 'pending',
      journeyId: input.journeyId,
    });
  }
}
