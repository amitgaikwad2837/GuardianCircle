import { KeyManager, type EncryptResult } from './KeyManager';

/**
 * AES-256-GCM encryption for evidence files and sensitive payloads.
 */
export class EncryptionService {
  static async encryptString(plaintext: string, keyAlias: string): Promise<EncryptResult> {
    return KeyManager.encrypt(plaintext, keyAlias);
  }

  static async decryptString(
    ciphertext: string,
    iv: string,
    keyAlias: string,
  ): Promise<string> {
    return KeyManager.decrypt(ciphertext, iv, keyAlias);
  }

  /**
   * Encrypt a guardian notification payload for delivery via FCM relay.
   * Uses recipient's Ed25519 public key for key agreement.
   */
  static async encryptForRecipient(plaintext: string, recipientPublicKey: string): Promise<string> {
    // X25519 ECDH key agreement → AES-256-GCM
    // Implemented in native CryptoModule
    const { NativeModules } = require('react-native');
    return NativeModules.CryptoModule.encryptForRecipient(
      plaintext,
      recipientPublicKey,
    ) as Promise<string>;
  }
}
