import { NativeModules } from 'react-native';
import { DuressPinService } from '@features/security/application/DuressPinService';
import { SecureStore }    from '@core/storage/secure/SecureStore';

// ── Helpers ────────────────────────────────────────────────────────────────

// Simulate real hashing: hashPin returns a deterministic "hash" by joining
// the inputs so we can test equality without a real PBKDF2 implementation.
function mockHashFn(pin: string, salt: string): { hash: string } {
  return { hash: `HASH(${pin},${salt})` };
}

// SecureStore backed by an in-memory map so tests are isolated.
// PIN_FAILED_ATTEMPTS and PIN_LOCKED_UNTIL were moved to SecureStore (Task #10),
// so all rate-limit state lives here — not in PreferencesStore.
const _store: Map<string, string> = new Map();

const KEYS = {
  pinFailedAttempts: 'gc_pin_failed_attempts',
  pinLockedUntil:    'gc_pin_locked_until',
} as const;

function stubSecureStore(): void {
  jest.spyOn(SecureStore, 'set').mockImplementation(async (key, value) => {
    _store.set(key, value);
  });
  jest.spyOn(SecureStore, 'get').mockImplementation(async (key) => {
    return _store.get(key) ?? null;
  });
  jest.spyOn(SecureStore, 'delete').mockImplementation(async (key) => {
    _store.delete(key);
  });
}

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  _store.clear();
  stubSecureStore();

  // Mock CryptoModule methods used by DuressPinService
  NativeModules.CryptoModule.generateSalt = jest.fn().mockResolvedValue('SALT');
  NativeModules.CryptoModule.hashPin      = jest.fn().mockImplementation(
    (pin: string, salt: string) => Promise.resolve(mockHashFn(pin, salt)),
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── validatePinFormat ──────────────────────────────────────────────────────

describe('validatePinFormat', () => {
  it('accepts a valid 4-digit PIN', () => {
    expect(() => DuressPinService.validatePinFormat('1357')).not.toThrow();
  });

  it('accepts a valid 8-digit PIN', () => {
    expect(() => DuressPinService.validatePinFormat('13572468')).not.toThrow();
  });

  it('throws when PIN is too short (< 4 digits)', () => {
    expect(() => DuressPinService.validatePinFormat('123')).toThrow('4');
  });

  it('throws when PIN is too long (> 8 digits)', () => {
    expect(() => DuressPinService.validatePinFormat('123456789')).toThrow('8');
  });

  it('throws when PIN contains non-digit characters', () => {
    expect(() => DuressPinService.validatePinFormat('12ab')).toThrow('digits');
  });

  it('throws for a sequential PIN (1234)', () => {
    expect(() => DuressPinService.validatePinFormat('1234')).toThrow('simple');
  });

  it('throws for a repeating PIN (0000)', () => {
    expect(() => DuressPinService.validatePinFormat('0000')).toThrow('simple');
  });
});

// ── setRealPin / isEnabled ─────────────────────────────────────────────────

describe('setRealPin', () => {
  it('stores a salt:hash pair in SecureStore and marks pin as enabled', async () => {
    await DuressPinService.setRealPin('9753');
    expect(await DuressPinService.isEnabled()).toBe(true);
  });

  it('calls CryptoModule.generateSalt and hashPin', async () => {
    await DuressPinService.setRealPin('9753');
    expect(NativeModules.CryptoModule.generateSalt).toHaveBeenCalled();
    expect(NativeModules.CryptoModule.hashPin).toHaveBeenCalledWith('9753', 'SALT');
  });

  it('throws for a PIN that fails format validation', async () => {
    await expect(DuressPinService.setRealPin('1234')).rejects.toThrow('simple');
  });
});

// ── checkPin — real PIN ────────────────────────────────────────────────────

describe('checkPin — real PIN', () => {
  beforeEach(async () => {
    await DuressPinService.setRealPin('9753');
  });

  it('returns "real" when correct PIN is entered', async () => {
    const result = await DuressPinService.checkPin('9753');
    expect(result).toBe('real');
  });

  it('returns "wrong" when an incorrect PIN is entered', async () => {
    const result = await DuressPinService.checkPin('8642');
    expect(result).toBe('wrong');
  });

  it('resets failed attempt counter on correct PIN', async () => {
    // Seed the counter directly in SecureStore (now owns this state)
    _store.set(KEYS.pinFailedAttempts, '3');
    await DuressPinService.checkPin('9753');
    expect(Number(_store.get(KEYS.pinFailedAttempts))).toBe(0);
  });
});

// ── checkPin — duress PIN ─────────────────────────────────────────────────

describe('checkPin — duress PIN', () => {
  beforeEach(async () => {
    await DuressPinService.setRealPin('9753');
    await DuressPinService.setDuressPin('8642');
  });

  it('returns "duress" when the duress PIN is entered', async () => {
    const result = await DuressPinService.checkPin('8642');
    expect(result).toBe('duress');
  });

  it('returns "real" for the real PIN when duress PIN is also configured', async () => {
    const result = await DuressPinService.checkPin('9753');
    expect(result).toBe('real');
  });

  it('returns "wrong" for a PIN that matches neither', async () => {
    const result = await DuressPinService.checkPin('1357');
    expect(result).toBe('wrong');
  });
});

// ── setDuressPin validation ────────────────────────────────────────────────

describe('setDuressPin', () => {
  beforeEach(async () => {
    await DuressPinService.setRealPin('9753');
  });

  it('throws when the duress PIN is the same as the real PIN', async () => {
    await expect(DuressPinService.setDuressPin('9753')).rejects.toThrow(
      'cannot be the same',
    );
  });

  it('sets isDuressEnabled to true after a valid duress PIN', async () => {
    await DuressPinService.setDuressPin('8642');
    expect(await DuressPinService.isDuressEnabled()).toBe(true);
  });
});

// ── Rate limiting ──────────────────────────────────────────────────────────

describe('rate limiting', () => {
  beforeEach(async () => {
    await DuressPinService.setRealPin('9753');
  });

  it('increments failed attempt counter on wrong PIN', async () => {
    // Use a valid-format but wrong PIN (0000 fails format validation)
    await DuressPinService.checkPin('8642');
    expect(Number(_store.get(KEYS.pinFailedAttempts))).toBe(1);
  });

  it('locks out after 5 failed attempts', async () => {
    // Seed 4 prior failures directly in SecureStore
    _store.set(KEYS.pinFailedAttempts, '4');
    await DuressPinService.checkPin('1357'); // 5th wrong attempt → lockout
    expect(Number(_store.get(KEYS.pinLockedUntil))).toBeGreaterThan(Date.now());
  });

  it('throws immediately when locked out', async () => {
    // Set lock to 60 s in the future via SecureStore
    _store.set(KEYS.pinLockedUntil, String(Date.now() + 60_000));
    await expect(DuressPinService.checkPin('9753')).rejects.toThrow(
      'Too many failed attempts',
    );
  });
});

// ── clearAll / clearDuressPin ─────────────────────────────────────────────

describe('clearAll', () => {
  beforeEach(async () => {
    await DuressPinService.setRealPin('9753');
    await DuressPinService.setDuressPin('8642');
  });

  it('disables the PIN lock after clearAll', async () => {
    await DuressPinService.clearAll();
    expect(await DuressPinService.isEnabled()).toBe(false);
  });

  it('removes duress PIN recognition after clearAll', async () => {
    await DuressPinService.clearAll();
    expect(await DuressPinService.isDuressEnabled()).toBe(false);
  });

  it('clearDuressPin only removes the duress PIN, not the real PIN', async () => {
    await DuressPinService.clearDuressPin();
    expect(await DuressPinService.isEnabled()).toBe(true);
    expect(await DuressPinService.isDuressEnabled()).toBe(false);
  });
});
