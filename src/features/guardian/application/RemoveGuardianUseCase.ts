import type { IGuardianRepository } from '../domain/interfaces/IGuardianRepository';
import { EventBus } from '@core/events/EventBus';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';

const DELAYED_REMOVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class RemoveGuardianUseCase {
  constructor(private readonly repo: IGuardianRepository) {}

  async execute(guardianId: string, immediate = false): Promise<void> {
    const useDelayedRemoval =
      !immediate &&
      PreferencesStore.getBoolean(PREF_KEYS.IS_DECOY_MODE_ENABLED);

    if (useDelayedRemoval) {
      // Schedule removal — no notification sent to guardian at any point
      await this.repo.scheduleRemoval(guardianId, DELAYED_REMOVAL_MS);
    } else {
      await this.repo.delete(guardianId);
    }

    // Never notify the removed guardian
    EventBus.emit('guardian:removed', { guardianId, isSilent: true });
  }

  /** Panic removal — immediate, no delay, no notification. For safety-critical scenarios. */
  async panicRemove(guardianId: string): Promise<void> {
    await this.repo.delete(guardianId);
    EventBus.emit('guardian:removed', { guardianId, isSilent: true });
  }
}
