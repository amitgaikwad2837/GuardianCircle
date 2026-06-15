import * as Keychain from 'react-native-keychain';
import { Logger } from '@core/logger/Logger';

const TAG = 'SecureStore';

/**
 * Secure key-value store backed by Android Keystore via react-native-keychain.
 * Use this for: PIN hashes, AI API keys, FCM tokens, identity keys.
 * Never use for non-sensitive data — use MMKV instead.
 */
export const SecureStore = {
  async set(key: string, value: string): Promise<void> {
    await Keychain.setGenericPassword(key, value, {
      service: key,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
    });
    // Verify the write landed in hardware-backed storage; warn if the device
    // fell back to software (emulator or device without StrongBox/TEE).
    try {
      const level = await Keychain.getSecurityLevel({ service: key });
      if (level !== Keychain.SECURITY_LEVEL.SECURE_HARDWARE) {
        Logger.warn(TAG, `Key "${key}" stored in SOFTWARE keystore — hardware TEE unavailable`);
      }
    } catch {
      // getSecurityLevel is best-effort; don't fail the write.
    }
  },

  async get(key: string): Promise<string | null> {
    const result = await Keychain.getGenericPassword({ service: key });
    if (!result) {return null;}
    return result.password;
  },

  async delete(key: string): Promise<void> {
    await Keychain.resetGenericPassword({ service: key });
  },

  async exists(key: string): Promise<boolean> {
    const result = await Keychain.getGenericPassword({ service: key });
    return result !== false;
  },
};
