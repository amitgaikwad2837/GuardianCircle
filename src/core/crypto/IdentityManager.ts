import { KeyManager, type KeyPair } from './KeyManager';
import { SecureStore } from '@core/storage/secure/SecureStore';

const IDENTITY_PUBLIC_KEY = 'identity_public_key';

/**
 * Manages the device's local cryptographic identity.
 * Generated once on first launch. Never transmitted to GuardianCircle servers.
 */
export class IdentityManager {
  private static _publicKey: string | null = null;

  static async initialize(): Promise<void> {
    const existing = await SecureStore.get(IDENTITY_PUBLIC_KEY);
    if (existing) {
      this._publicKey = existing;
      return;
    }

    // First launch — generate identity
    const keyPair: KeyPair = await KeyManager.generateIdentityKeyPair();
    await SecureStore.set(IDENTITY_PUBLIC_KEY, keyPair.publicKey);
    this._publicKey = keyPair.publicKey;
  }

  static getPublicKey(): string {
    if (!this._publicKey) {
      throw new Error('IdentityManager not initialized. Call initialize() at app startup.');
    }
    return this._publicKey;
  }

  static async sign(data: string): Promise<string> {
    return KeyManager.sign(data, 'identity_private_key');
  }

  static async verify(data: string, signature: string, publicKey: string): Promise<boolean> {
    return KeyManager.verify(data, signature, publicKey);
  }
}
