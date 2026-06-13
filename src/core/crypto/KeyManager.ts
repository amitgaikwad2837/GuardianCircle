import { NativeModules } from 'react-native';

interface CryptoModuleInterface {
  generateKeyPair(alias: string): Promise<{ publicKey: string; keyAlias: string }>;
  generateAESKey(alias: string, hardwareBacked: boolean): Promise<void>;
  getKeyMaterial(alias: string): Promise<string>;
  sign(data: string, keyAlias: string): Promise<string>;
  verify(data: string, signature: string, publicKey: string): Promise<boolean>;
  encrypt(plaintext: string, keyAlias: string): Promise<{ ciphertext: string; iv: string }>;
  decrypt(ciphertext: string, iv: string, keyAlias: string): Promise<string>;
  isHardwareBacked(alias: string): Promise<boolean>;
  deleteKey(alias: string): Promise<void>;
}

const CryptoModule = NativeModules.CryptoModule as CryptoModuleInterface;

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
    return CryptoModule.generateKeyPair('identity_private_key');
  }

  static async generateDatabaseKey(): Promise<void> {
    return CryptoModule.generateAESKey('db_encryption_key', false);
  }

  static async getDatabaseKey(): Promise<string> {
    return CryptoModule.getKeyMaterial('db_encryption_key');
  }

  static async sign(data: string, keyAlias: string): Promise<string> {
    return CryptoModule.sign(data, keyAlias);
  }

  static async verify(data: string, signature: string, publicKey: string): Promise<boolean> {
    return CryptoModule.verify(data, signature, publicKey);
  }

  static async encrypt(plaintext: string, keyAlias: string): Promise<EncryptResult> {
    return CryptoModule.encrypt(plaintext, keyAlias);
  }

  static async decrypt(ciphertext: string, iv: string, keyAlias: string): Promise<string> {
    return CryptoModule.decrypt(ciphertext, iv, keyAlias);
  }

  static async isHardwareBacked(keyAlias: string): Promise<boolean> {
    return CryptoModule.isHardwareBacked(keyAlias);
  }

  static async deleteKey(keyAlias: string): Promise<void> {
    return CryptoModule.deleteKey(keyAlias);
  }
}
