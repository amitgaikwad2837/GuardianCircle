import { NativeModules } from 'react-native';
import { Logger } from '@core/logger/Logger';
import type { Coordinates } from '@core/location/LocationService';

const TAG = 'SmsService';

interface NativeSmsModule {
  send(phoneNumber: string, message: string): Promise<'sent'>;
  sendBatch(phoneNumbers: string[], message: string): Promise<string[]>;
}

const NativeSms = NativeModules.SmsModule as NativeSmsModule;

export const SmsTemplates = {
  sosAlert(senderName: string, location: Coordinates | null, incidentId: string): string {
    const time   = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const locStr = location
      ? `https://maps.google.com/?q=${location.lat.toFixed(6)},${location.lng.toFixed(6)}`
      : 'Location unavailable';
    const ref = incidentId.slice(0, 8);
    return `\u{1F6A8} ${senderName} needs help!\nLoc: ${locStr}\nTime: ${time}\nRef: ${ref}`;
  },

  escalationUpdate(
    senderName: string,
    location: Coordinates | null,
    level: number,
    incidentId: string,
  ): string {
    const time   = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const locStr = location
      ? `https://maps.google.com/?q=${location.lat.toFixed(6)},${location.lng.toFixed(6)}`
      : 'Location unavailable';
    const ref = incidentId.slice(0, 8);
    return `⚠️ UPDATE #${level}: ${senderName} still needs help\nLoc: ${locStr}\nTime: ${time}\nRef: ${ref}`;
  },
};

const MAX_RETRIES = 3;
// Retry delays per attempt: 2 s then 10 s. 30 s was a carrier-throttle guard
// that is inappropriate on the SOS critical path — every second matters.
const RETRY_DELAYS_MS = [2_000, 10_000] as const;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const SmsService = {
  /**
   * Sends a single SMS with up to MAX_RETRIES attempts.
   * Returns 'sent' on success, 'failed' after all retries exhausted.
   * Does not throw.
   */
  async send(
    phoneNumber: string,
    message: string,
    retries = MAX_RETRIES,
  ): Promise<'sent' | 'failed'> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await NativeSms.send(phoneNumber, message);
        Logger.info(TAG, 'SMS sent', {
          to: phoneNumber.slice(0, 6) + '****',
          attempt,
        });
        return 'sent';
      } catch (err) {
        const isLast = attempt === retries;
        Logger.warn(TAG, `SMS attempt ${attempt}/${retries} failed`, {
          to: phoneNumber.slice(0, 6) + '****',
          error: err instanceof Error ? err.message.slice(0, 80) : String(err),
        });
        if (!isLast) {await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 10_000);}
      }
    }
    Logger.error(TAG, 'SMS failed after all retries', {
      to: phoneNumber.slice(0, 6) + '****',
    });
    return 'failed';
  },

  /**
   * Sends the same message to multiple recipients in parallel.
   * Each recipient gets its own retry budget.
   */
  async sendBatch(
    phoneNumbers: string[],
    message: string,
  ): Promise<Map<string, 'sent' | 'failed'>> {
    const results = new Map<string, 'sent' | 'failed'>();
    await Promise.allSettled(
      phoneNumbers.map(async (phone) => {
        results.set(phone, await this.send(phone, message));
      }),
    );
    return results;
  },

  /** Fire-and-forget variant — use when you cannot await (e.g. background handler). */
  sendNoWait(phoneNumber: string, message: string): void {
    void this.send(phoneNumber, message);
  },
};
