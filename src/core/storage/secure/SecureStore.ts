import * as Keychain from 'react-native-keychain';

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
  },

  async get(key: string): Promise<string | null> {
    const result = await Keychain.getGenericPassword({ service: key });
    if (!result) return null;
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
