import { NativeModules } from 'react-native';
import { KeyManager, type KeyPair } from './KeyManager';
import { SecureStore } from '@core/storage/secure/SecureStore';

const IDENTITY_PUBLIC_KEY = 'identity_public_key';
const FCM_ENCRYPTION_PUBLIC_KEY = 'fcm_encryption_public_key';
const FCM_ECDH_ALIAS = 'fcm_encryption_key';

const Crypto = NativeModules.CryptoModule as {
  generateECDHKeyPair(keyAlias: string): Promise<{ publicKey: string; keyAlias: string }>;
  decryptFromSender(encryptedPayload: string, keyAlias: string): Promise<string>;
};

/**
 * Manages the device's local cryptographic identity.
 *
 * Two key pairs:
 * 1. `identity_private_key`  — ECDSA (PURPOSE_SIGN | PURPOSE_VERIFY) for signing SOS alerts.
 * 2. `fcm_encryption_key`    — EC (PURPOSE_AGREE_KEY) for ECDH key agreement to decrypt FCM payloads.
 *
 * Generated once on first launch. Never transmitted to GuardianCircle servers.
 */
export class IdentityManager {
  private static _publicKey: string | null = null;
  private static _fcmPublicKey: string | null = null;

  static async initialize(): Promise<void> {
    const existing = await SecureStore.get(IDENTITY_PUBLIC_KEY);
    if (existing) {
      this._publicKey = existing;
    } else {
      const keyPair: KeyPair = await KeyManager.generateIdentityKeyPair();
      await SecureStore.set(IDENTITY_PUBLIC_KEY, keyPair.publicKey);
      this._publicKey = keyPair.publicKey;
    }
  }

  /** Initialize the ECDH key pair used for receiving encrypted FCM notifications. */
  static async initializeFCMKey(): Promise<void> {
    const existing = await SecureStore.get(FCM_ENCRYPTION_PUBLIC_KEY);
    if (existing) {
      this._fcmPublicKey = existing;
      return;
    }
    const keyPair = await Crypto.generateECDHKeyPair(FCM_ECDH_ALIAS);
    await SecureStore.set(FCM_ENCRYPTION_PUBLIC_KEY, keyPair.publicKey);
    this._fcmPublicKey = keyPair.publicKey;
  }

  static getPublicKey(): string {
    if (!this._publicKey) {
      throw new Error('IdentityManager not initialized. Call initialize() at app startup.');
    }
    return this._publicKey;
  }

  /** Returns the ECDH public key to include in QR pairing and guardian profile. */
  static getFCMPublicKey(): string {
    if (!this._fcmPublicKey) {
      throw new Error('IdentityManager FCM key not initialized. Call initializeFCMKey() at app startup.');
    }
    return this._fcmPublicKey;
  }

  static async sign(data: string): Promise<string> {
    return KeyManager.sign(data, 'identity_private_key');
  }

  static async verify(data: string, signature: string, publicKey: string): Promise<boolean> {
    return KeyManager.verify(data, signature, publicKey);
  }

  /**
   * Decrypts an FCM payload that was encrypted for this device.
   * Uses ECDH with our `fcm_encryption_key` private key.
   */
  static async decryptFCMPayload(encryptedPayload: string): Promise<string> {
    return Crypto.decryptFromSender(encryptedPayload, FCM_ECDH_ALIAS);
  }
}
