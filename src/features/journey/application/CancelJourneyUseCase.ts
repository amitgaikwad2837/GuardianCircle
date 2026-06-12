import { Container, DI_TOKENS } from '@core/di/Container';
import { EventBus } from '@core/events/EventBus';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
import type { IJourneyRepository } from '../domain/interfaces/IJourneyRepository';

export class CancelJourneyUseCase {
  private readonly repo: IJourneyRepository;

  constructor() {
    this.repo = Container.resolve<IJourneyRepository>(DI_TOKENS.IJourneyRepository);
  }

  async execute(journeyId: string): Promise<void> {
    await this.repo.updateStatus(journeyId, 'cancelled');
    PreferencesStore.delete(PREF_KEYS.LAST_ACTIVE_JOURNEY_ID);
    EventBus.emit('journey:cancelled', { journeyId });
  }
}
