import { NativeModules } from 'react-native';
import { KeyManager, type EncryptResult } from './KeyManager';

const Crypto = NativeModules.CryptoModule as {
  encryptForRecipient(plaintext: string, recipientPublicKey: string): Promise<string>;
};

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
   * Encrypts a payload for delivery via the FCM relay.
   * Uses ECDH + AES-256-GCM via the native CryptoModule.
   * The recipient decrypts using their private key.
   *
   * Output format: `ephemeral_pubkey_b64|iv_b64|ciphertext_b64`
   */
  static async encryptForRecipient(plaintext: string, recipientPublicKey: string): Promise<string> {
    return Crypto.encryptForRecipient(plaintext, recipientPublicKey);
  }
}
