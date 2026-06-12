import { NativeModules } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { Logger } from '@core/logger/Logger';

const TAG = 'SOSFallback';

/**
 * Last-resort SOS SMS path that operates WITHOUT the DI container, database, or Keystore.
 *
 * Rationale: TriggerSOSUseCase resolves three DI dependencies at call time. If bootstrap
 * failed (DB open error, Keystore unavailable, migration crash), the Container throws and
 * normal SOS silently fails. This module reads guardian phone numbers from a dedicated
 * MMKV store that is written during guardian onboarding — before the DB is even open —
 * and sends raw SMS via the native SmsModule.
 *
 * Security note: phone numbers stored here are not encrypted. They are stored in the
 * app's private MMKV partition (not accessible without root). This is an intentional
 * trade-off — availability of emergency contact takes priority over at-rest encryption
 * for a plain phone number.
 */

const FALLBACK_KEY = 'gc_sos_phones';
const storage = new MMKV({ id: 'gc_sos_fallback' });

interface NativeSmsModule {
  send(phoneNumber: string, message: string): Promise<'sent'>;
}

const NativeSms = NativeModules.SmsModule as NativeSmsModule | undefined;

export const SOSFallback = {
  /** Called when a guardian is added/updated — keeps the fallback list in sync. */
  setGuardianPhones(phones: string[]): void {
    storage.set(FALLBACK_KEY, JSON.stringify(phones));
  },

  getGuardianPhones(): string[] {
    try {
      const raw = storage.getString(FALLBACK_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  },

  /**
   * Sends a minimal SOS SMS to all stored guardian phones.
   * Does NOT throw — logs errors and continues to next phone.
   */
  async send(): Promise<void> {
    if (!NativeSms) {
      Logger.error(TAG, 'SmsModule unavailable — SOSFallback cannot send');
      return;
    }

    const phones = this.getGuardianPhones();
    if (phones.length === 0) {
      Logger.warn(TAG, 'SOSFallback triggered but no phones stored');
      return;
    }

    const message = 'EMERGENCY: GuardianCircle SOS triggered. Please check on this person immediately.';

    for (const phone of phones) {
      try {
        await NativeSms.send(phone, message);
        Logger.warn(TAG, 'SOSFallback SMS sent', { to: phone.slice(0, 6) + '****' });
      } catch (err) {
        Logger.error(TAG, 'SOSFallback SMS failed', {
          to: phone.slice(0, 6) + '****',
          message: err instanceof Error ? err.message.slice(0, 80) : String(err),
        });
      }
    }
  },
};
