import { NativeModules } from 'react-native';
import { SecureStore }   from '@core/storage/secure/SecureStore';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
import { Logger }        from '@core/logger/Logger';

const TAG = 'DuressPinService';

/**
 * Secure keys used in SecureStore (Keychain / Android Keystore).
 * Values are Argon2id hashes — never the raw PIN.
 */
const KEYS = {
  realPinHash:   'gc_real_pin_hash',
  duressPinHash: 'gc_duress_pin_hash',
  pinEnabled:    'gc_pin_enabled',
} as const;

/** Minimum and maximum PIN length. */
const PIN_MIN_LENGTH = 4;
const PIN_MAX_LENGTH = 8;

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30_000; // 30 s, doubles on each successive lockout

interface HashResult {
  hash: string;
}

interface NativeCryptoModule {
  hashPin(pin: string, salt: string): Promise<HashResult>;
  generateSalt(): Promise<string>;
}

const Crypto = NativeModules.CryptoModule as NativeCryptoModule;

/**
 * DuressPinService manages two PIN codes:
 *   1. Real PIN  — used for normal app unlock.
 *   2. Duress PIN — when entered instead of the real PIN, silently triggers SOS
 *      and optionally shows a decoy guardian list.
 *
 * Both PINs are stored as Argon2id hashes (m=65536, t=3, p=4) via the
 * Android Keystore-backed CryptoModule. Raw PINs are never stored.
 *
 * Security note: duress PIN must differ from the real PIN by at least one digit.
 */
export const DuressPinService = {
  /**
   * Sets up the real PIN (required before duress PIN can be set).
   * Generates a new random salt and stores the hash in SecureStore.
   */
  async setRealPin(pin: string): Promise<void> {
    DuressPinService.validatePinFormat(pin);
    const salt = await Crypto.generateSalt();
    const { hash } = await Crypto.hashPin(pin, salt);
    await SecureStore.set(KEYS.realPinHash, `${salt}:${hash}`);
    await SecureStore.set(KEYS.pinEnabled, 'true');
    PreferencesStore.setBoolean(PREF_KEYS.CHECKLIST_DURESS_PIN_SET, true);
    Logger.info(TAG, 'Real PIN set');
  },

  /**
   * Sets the duress PIN. Throws if it matches the real PIN or fails validation.
   */
  async setDuressPin(pin: string): Promise<void> {
    DuressPinService.validatePinFormat(pin);

    const isSameAsReal = await DuressPinService.verifyRealPin(pin);
    if (isSameAsReal) {
      throw new Error('Duress PIN cannot be the same as your real PIN.');
    }

    const salt = await Crypto.generateSalt();
    const { hash } = await Crypto.hashPin(pin, salt);
    await SecureStore.set(KEYS.duressPinHash, `${salt}:${hash}`);
    Logger.info(TAG, 'Duress PIN set');
  },

  /**
   * Returns true if the real PIN is configured.
   */
  async isEnabled(): Promise<boolean> {
    const flag = await SecureStore.get(KEYS.pinEnabled);
    return flag === 'true';
  },

  /**
   * Returns true if the duress PIN is configured.
   */
  async isDuressEnabled(): Promise<boolean> {
    const stored = await SecureStore.get(KEYS.duressPinHash);
    return stored !== null && stored.length > 0;
  },

  /**
   * Checks the entered PIN against both real and duress PIN.
   * Returns:
   *   'real'   — matches the real PIN, proceed with normal login
   *   'duress' — matches the duress PIN, trigger silent SOS + decoy UI
   *   'wrong'  — matches neither
   * Throws if the account is locked out due to too many failed attempts.
   */
  async checkPin(enteredPin: string): Promise<'real' | 'duress' | 'wrong'> {
    await DuressPinService.enforceRateLimit();

    const realMatch = await DuressPinService.verifyRealPin(enteredPin);
    if (realMatch) {
      await DuressPinService.resetFailedAttempts();
      return 'real';
    }

    const duressMatch = await DuressPinService.verifyDuressPin(enteredPin);
    if (duressMatch) {
      await DuressPinService.resetFailedAttempts();
      Logger.warn(TAG, 'Duress PIN entered — triggering silent SOS');
      return 'duress';
    }

    await DuressPinService.recordFailedAttempt();
    Logger.debug(TAG, 'Wrong PIN entered');
    return 'wrong';
  },

  /** Clears the real PIN, duress PIN, and disables the lock. */
  async clearAll(): Promise<void> {
    await SecureStore.delete(KEYS.realPinHash);
    await SecureStore.delete(KEYS.duressPinHash);
    await SecureStore.set(KEYS.pinEnabled, 'false');
    Logger.info(TAG, 'All PINs cleared');
  },

  /** Clears only the duress PIN. */
  async clearDuressPin(): Promise<void> {
    await SecureStore.delete(KEYS.duressPinHash);
    Logger.info(TAG, 'Duress PIN cleared');
  },

  // ── Private helpers ────────────────────────────────────────────────────────

  enforceRateLimit(): Promise<void> {
    const lockedUntil = PreferencesStore.getNumber(PREF_KEYS.PIN_LOCKED_UNTIL) ?? 0;
    if (Date.now() < lockedUntil) {
      const remainingSec = Math.ceil((lockedUntil - Date.now()) / 1000);
      return Promise.reject(new Error(`Too many failed attempts. Try again in ${remainingSec} seconds.`));
    }
    return Promise.resolve();
  },

  recordFailedAttempt(): Promise<void> {
    const attempts = (PreferencesStore.getNumber(PREF_KEYS.PIN_FAILED_ATTEMPTS) ?? 0) + 1;
    PreferencesStore.setNumber(PREF_KEYS.PIN_FAILED_ATTEMPTS, attempts);
    if (attempts >= MAX_ATTEMPTS) {
      // Exponential backoff: 30 s, 60 s, 120 s, …
      const multiplier = Math.pow(2, Math.floor(attempts / MAX_ATTEMPTS) - 1);
      const lockoutMs = LOCKOUT_DURATION_MS * multiplier;
      PreferencesStore.setNumber(PREF_KEYS.PIN_LOCKED_UNTIL, Date.now() + lockoutMs);
      Logger.warn(TAG, `PIN locked out for ${lockoutMs / 1000} s after ${attempts} failed attempts`);
    }
    return Promise.resolve();
  },

  resetFailedAttempts(): Promise<void> {
    PreferencesStore.setNumber(PREF_KEYS.PIN_FAILED_ATTEMPTS, 0);
    PreferencesStore.setNumber(PREF_KEYS.PIN_LOCKED_UNTIL, 0);
    return Promise.resolve();
  },

  async verifyRealPin(pin: string): Promise<boolean> {
    const stored = await SecureStore.get(KEYS.realPinHash);
    if (!stored) {return false;}
    return DuressPinService.verifyHash(pin, stored);
  },

  async verifyDuressPin(pin: string): Promise<boolean> {
    const stored = await SecureStore.get(KEYS.duressPinHash);
    if (!stored) {return false;}
    return DuressPinService.verifyHash(pin, stored);
  },

  async verifyHash(pin: string, saltAndHash: string): Promise<boolean> {
    const [salt, expectedHash] = saltAndHash.split(':');
    if (!salt || !expectedHash) {return false;}
    const { hash } = await Crypto.hashPin(pin, salt);
    return hash === expectedHash;
  },

  validatePinFormat(pin: string): void {
    if (pin.length < PIN_MIN_LENGTH || pin.length > PIN_MAX_LENGTH) {
      throw new Error(
        `PIN must be ${PIN_MIN_LENGTH}–${PIN_MAX_LENGTH} digits.`,
      );
    }
    if (!/^\d+$/.test(pin)) {
      throw new Error('PIN must contain only digits.');
    }
    // Reject trivially sequential PINs (1234, 0000, etc.)
    const isSequential = [...pin].every(
      (d, i, a) => i === 0 || Number(d) === Number(a[i - 1]!) + 1,
    );
    const isRepeating = new Set(pin.split('')).size === 1;
    if (isSequential || isRepeating) {
      throw new Error('PIN is too simple. Avoid sequences like 1234 or repeated digits like 0000.');
    }
  },
};
