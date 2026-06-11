import { NativeModules } from 'react-native';

const { CryptoModule } = NativeModules;

/**
 * Android Keystore wrapper.
 * All cryptographic operations that require hardware-backed keys go through here.
 */
export interface KeyPair {
  publicKey: string; // base64-encoded Ed25519 public key
  keyAlias: string;
}

export interface EncryptResult {
  ciphertext: string; // base64
  iv: string; // base64, 12 bytes
}

export class KeyManager {
  static async generateIdentityKeyPair(): Promise<KeyPair> {
    return CryptoModule.generateKeyPair('identity_private_key') as Promise<KeyPair>;
  }

  static async generateDatabaseKey(): Promise<void> {
    return CryptoModule.generateAESKey('db_encryption_key', false) as Promise<void>;
  }

  static async getDatabaseKey(): Promise<string> {
    return CryptoModule.getKeyMaterial('db_encryption_key') as Promise<string>;
  }

  static async sign(data: string, keyAlias: string): Promise<string> {
    return CryptoModule.sign(data, keyAlias) as Promise<string>;
  }

  static async verify(data: string, signature: string, publicKey: string): Promise<boolean> {
    return CryptoModule.verify(data, signature, publicKey) as Promise<boolean>;
  }

  static async encrypt(plaintext: string, keyAlias: string): Promise<EncryptResult> {
    return CryptoModule.encrypt(plaintext, keyAlias) as Promise<EncryptResult>;
  }

  static async decrypt(ciphertext: string, iv: string, keyAlias: string): Promise<string> {
    return CryptoModule.decrypt(ciphertext, iv, keyAlias) as Promise<string>;
  }

  static async isHardwareBacked(keyAlias: string): Promise<boolean> {
    return CryptoModule.isHardwareBacked(keyAlias) as Promise<boolean>;
  }

  static async deleteKey(keyAlias: string): Promise<void> {
    return CryptoModule.deleteKey(keyAlias) as Promise<void>;
  }
}
