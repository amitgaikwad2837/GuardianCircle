package com.guardiancircle.modules

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyInfo
import android.security.keystore.KeyProperties
import android.util.Base64
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.SecureRandom
import java.security.Signature
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.KeyGenerator
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * Android Keystore-backed cryptographic operations.
 * All keys are stored in hardware-backed Keystore where available (StrongBox).
 * Keys never leave the secure enclave.
 */
@ReactModule(name = CryptoModule.NAME)
class CryptoModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "CryptoModule"
        private const val KEYSTORE_PROVIDER  = "AndroidKeyStore"
        private const val AES_TRANSFORMATION = "AES/GCM/NoPadding"
        private const val EC_ALGORITHM       = "EC"
        private const val GCM_TAG_LENGTH     = 128
        private const val GCM_IV_LENGTH      = 12
        private const val DB_KEY_PREFS       = "gc_db_key_v1"
        private const val DB_KEY_ENTRY       = "encrypted_passphrase"
    }

    private val keyStore: KeyStore =
        KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }

    override fun getName() = NAME

    // ─── Key Generation ───────────────────────────────────────────────────────

    @ReactMethod
    fun generateKeyPair(keyAlias: String, promise: Promise) {
        try {
            val keyPairGen = KeyPairGenerator.getInstance(EC_ALGORITHM, KEYSTORE_PROVIDER)
            val spec = KeyGenParameterSpec.Builder(
                keyAlias,
                KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
            )
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setUserAuthenticationRequired(false)
                .build()

            keyPairGen.initialize(spec)
            val keyPair = keyPairGen.generateKeyPair()
            val publicKeyB64 = Base64.encodeToString(keyPair.public.encoded, Base64.NO_WRAP)

            val result = Arguments.createMap()
            result.putString("publicKey", publicKeyB64)
            result.putString("keyAlias", keyAlias)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("KEY_GEN_FAILED", e.message, e)
        }
    }

    /**
     * Generates an EC key pair for ECDH key agreement (FCM payload encryption).
     * Must use a separate key from the identity signing key because
     * Android Keystore does not permit the same key for both SIGN and AGREE_KEY.
     */
    @ReactMethod
    fun generateECDHKeyPair(keyAlias: String, promise: Promise) {
        try {
            val keyPairGen = KeyPairGenerator.getInstance(EC_ALGORITHM, KEYSTORE_PROVIDER)
            val spec = KeyGenParameterSpec.Builder(
                keyAlias,
                KeyProperties.PURPOSE_AGREE_KEY
            )
                .setUserAuthenticationRequired(false)
                .build()

            keyPairGen.initialize(spec)
            val keyPair = keyPairGen.generateKeyPair()
            val publicKeyB64 = Base64.encodeToString(keyPair.public.encoded, Base64.NO_WRAP)

            val result = Arguments.createMap()
            result.putString("publicKey", publicKeyB64)
            result.putString("keyAlias", keyAlias)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ECDH_KEY_GEN_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun generateAESKey(keyAlias: String, requireBiometric: Boolean, promise: Promise) {
        try {
            val keyGen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE_PROVIDER)
            val specBuilder = KeyGenParameterSpec.Builder(
                keyAlias,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)

            if (requireBiometric) {
                specBuilder.setUserAuthenticationRequired(true)
            }

            keyGen.init(specBuilder.build())
            keyGen.generateKey()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("AES_KEY_GEN_FAILED", e.message, e)
        }
    }

    // ─── Signing ──────────────────────────────────────────────────────────────

    @ReactMethod
    fun sign(data: String, keyAlias: String, promise: Promise) {
        try {
            val privateKey = keyStore.getKey(keyAlias, null)
                ?: return promise.reject("KEY_NOT_FOUND", "Key $keyAlias not found")

            val sig = Signature.getInstance("SHA256withECDSA")
            sig.initSign(privateKey as java.security.PrivateKey)
            sig.update(Base64.decode(data, Base64.NO_WRAP))
            val signed = Base64.encodeToString(sig.sign(), Base64.NO_WRAP)
            promise.resolve(signed)
        } catch (e: Exception) {
            promise.reject("SIGN_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun verify(data: String, signature: String, publicKeyB64: String, promise: Promise) {
        try {
            val pubKeyBytes = Base64.decode(publicKeyB64, Base64.NO_WRAP)
            val keyFactory = KeyFactory.getInstance(EC_ALGORITHM)
            val pubKey = keyFactory.generatePublic(java.security.spec.X509EncodedKeySpec(pubKeyBytes))

            val sig = Signature.getInstance("SHA256withECDSA")
            sig.initVerify(pubKey)
            sig.update(Base64.decode(data, Base64.NO_WRAP))
            val valid = sig.verify(Base64.decode(signature, Base64.NO_WRAP))
            promise.resolve(valid)
        } catch (e: Exception) {
            promise.reject("VERIFY_FAILED", e.message, e)
        }
    }

    // ─── Symmetric Encryption ─────────────────────────────────────────────────

    @ReactMethod
    fun encrypt(plaintext: String, keyAlias: String, promise: Promise) {
        try {
            val key = keyStore.getKey(keyAlias, null)
                ?: return promise.reject("KEY_NOT_FOUND", "Key $keyAlias not found")

            val cipher = Cipher.getInstance(AES_TRANSFORMATION)
            cipher.init(Cipher.ENCRYPT_MODE, key as javax.crypto.SecretKey)

            val ciphertext = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
            val result = Arguments.createMap()
            result.putString("ciphertext", Base64.encodeToString(ciphertext, Base64.NO_WRAP))
            result.putString("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ENCRYPT_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun decrypt(ciphertext: String, iv: String, keyAlias: String, promise: Promise) {
        try {
            val key = keyStore.getKey(keyAlias, null)
                ?: return promise.reject("KEY_NOT_FOUND", "Key $keyAlias not found")

            val cipher = Cipher.getInstance(AES_TRANSFORMATION)
            val spec = GCMParameterSpec(GCM_TAG_LENGTH, Base64.decode(iv, Base64.NO_WRAP))
            cipher.init(Cipher.DECRYPT_MODE, key as javax.crypto.SecretKey, spec)

            val plaintext = cipher.doFinal(Base64.decode(ciphertext, Base64.NO_WRAP))
            promise.resolve(String(plaintext, Charsets.UTF_8))
        } catch (e: Exception) {
            promise.reject("DECRYPT_FAILED", e.message, e)
        }
    }

    // ─── Recipient Encryption (E2E push, sender side) ─────────────────────────

    /**
     * Encrypts a plaintext for delivery via the FCM relay.
     * Uses ECDH key agreement with the recipient's ECDH public key.
     * The ephemeral public key is prepended for the recipient to decrypt.
     *
     * Output format: `ephemeral_pubkey_b64|iv_b64|ciphertext_b64`
     */
    @ReactMethod
    fun encryptForRecipient(plaintext: String, recipientPublicKeyB64: String, promise: Promise) {
        try {
            val recipientKeyBytes = Base64.decode(recipientPublicKeyB64, Base64.NO_WRAP)
            val keyFactory        = KeyFactory.getInstance(EC_ALGORITHM)
            val recipientPubKey   = keyFactory.generatePublic(
                java.security.spec.X509EncodedKeySpec(recipientKeyBytes)
            )

            val ephemeralGen = KeyPairGenerator.getInstance(EC_ALGORITHM)
            ephemeralGen.initialize(256)
            val ephemeralPair = ephemeralGen.generateKeyPair()

            val keyAgreement = KeyAgreement.getInstance("ECDH")
            keyAgreement.init(ephemeralPair.private)
            keyAgreement.doPhase(recipientPubKey, true)
            val sharedSecret = keyAgreement.generateSecret()

            val digest    = java.security.MessageDigest.getInstance("SHA-256")
            val aesKeyBytes = digest.digest(sharedSecret)
            val aesKey    = SecretKeySpec(aesKeyBytes, "AES")

            val iv     = ByteArray(GCM_IV_LENGTH).also { SecureRandom().nextBytes(it) }
            val cipher = Cipher.getInstance(AES_TRANSFORMATION)
            cipher.init(Cipher.ENCRYPT_MODE, aesKey, GCMParameterSpec(GCM_TAG_LENGTH, iv))
            val ciphertext = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))

            val ephemeralPubB64 = Base64.encodeToString(ephemeralPair.public.encoded, Base64.NO_WRAP)
            val ivB64           = Base64.encodeToString(iv, Base64.NO_WRAP)
            val ciphertextB64   = Base64.encodeToString(ciphertext, Base64.NO_WRAP)
            promise.resolve("$ephemeralPubB64|$ivB64|$ciphertextB64")
        } catch (e: Exception) {
            promise.reject("ENCRYPT_RECIPIENT_FAILED", e.message, e)
        }
    }

    /**
     * Decrypts a payload that was encrypted for us via encryptForRecipient.
     * Uses ECDH with our ECDH private key (stored in Keystore under keyAlias).
     *
     * Input format: `ephemeral_pubkey_b64|iv_b64|ciphertext_b64`
     */
    @ReactMethod
    fun decryptFromSender(encryptedPayload: String, keyAlias: String, promise: Promise) {
        try {
            val parts = encryptedPayload.split("|")
            if (parts.size != 3) {
                return promise.reject("INVALID_PAYLOAD", "Expected format: pubkey|iv|ciphertext")
            }

            val senderEphemeralPubKeyBytes = Base64.decode(parts[0], Base64.NO_WRAP)
            val iv                         = Base64.decode(parts[1], Base64.NO_WRAP)
            val ciphertextBytes            = Base64.decode(parts[2], Base64.NO_WRAP)

            val ourPrivateKey = keyStore.getKey(keyAlias, null)
                ?: return promise.reject("KEY_NOT_FOUND", "Key $keyAlias not found")

            val keyFactory = KeyFactory.getInstance(EC_ALGORITHM)
            val senderEphemeralPubKey = keyFactory.generatePublic(
                java.security.spec.X509EncodedKeySpec(senderEphemeralPubKeyBytes)
            )

            val keyAgreement = KeyAgreement.getInstance("ECDH", KEYSTORE_PROVIDER)
            keyAgreement.init(ourPrivateKey)
            keyAgreement.doPhase(senderEphemeralPubKey, true)
            val sharedSecret = keyAgreement.generateSecret()

            val digest      = java.security.MessageDigest.getInstance("SHA-256")
            val aesKeyBytes = digest.digest(sharedSecret)
            val aesKey      = SecretKeySpec(aesKeyBytes, "AES")

            val cipher = Cipher.getInstance(AES_TRANSFORMATION)
            cipher.init(Cipher.DECRYPT_MODE, aesKey, GCMParameterSpec(GCM_TAG_LENGTH, iv))
            val plaintext = cipher.doFinal(ciphertextBytes)

            promise.resolve(String(plaintext, Charsets.UTF_8))
        } catch (e: Exception) {
            promise.reject("DECRYPT_FROM_SENDER_FAILED", e.message, e)
        }
    }

    // ─── Key Management ───────────────────────────────────────────────────────

    @ReactMethod
    fun isHardwareBacked(keyAlias: String, promise: Promise) {
        try {
            val key = keyStore.getKey(keyAlias, null)
            if (key == null) { promise.resolve(false); return }

            val isHW = when (key) {
                is java.security.PrivateKey -> {
                    val keyFactory = KeyFactory.getInstance(key.algorithm, KEYSTORE_PROVIDER)
                    val keyInfo = keyFactory.getKeySpec(key, KeyInfo::class.java)
                    keyInfo.isInsideSecureHardware
                }
                is javax.crypto.SecretKey -> {
                    val keyFactory = SecretKeyFactory.getInstance(key.algorithm, KEYSTORE_PROVIDER)
                    val keyInfo = keyFactory.getKeySpec(key, KeyInfo::class.java) as KeyInfo
                    keyInfo.isInsideSecureHardware
                }
                else -> false
            }
            promise.resolve(isHW)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun deleteKey(keyAlias: String, promise: Promise) {
        try {
            if (keyStore.containsAlias(keyAlias)) keyStore.deleteEntry(keyAlias)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("DELETE_KEY_FAILED", e.message, e)
        }
    }

    // ─── Database Key Derivation ──────────────────────────────────────────────

    /**
     * Returns a stable 32-byte base64 passphrase for SQLCipher.
     *
     * On first call: generates a random 32-byte passphrase, encrypts it with the
     * Keystore AES key (random IV per GCM spec), stores ciphertext+IV in app SharedPreferences.
     * On subsequent calls: reads stored ciphertext+IV, decrypts with Keystore key → same passphrase.
     *
     * This is deterministic because we store the encrypted form of the passphrase, not the passphrase
     * derived from the key (which would change on every call due to GCM's random IV).
     */
    @ReactMethod
    fun getKeyMaterial(keyAlias: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(DB_KEY_PREFS, Context.MODE_PRIVATE)
            val stored = prefs.getString(DB_KEY_ENTRY, null)

            val key = keyStore.getKey(keyAlias, null)
                ?: return promise.reject("KEY_NOT_FOUND", "Key $keyAlias not found")
            val secretKey = key as javax.crypto.SecretKey

            if (stored != null) {
                // Decrypt stored passphrase
                val parts      = stored.split(":")
                val ciphertext = Base64.decode(parts[0], Base64.NO_WRAP)
                val iv         = Base64.decode(parts[1], Base64.NO_WRAP)
                val cipher     = Cipher.getInstance(AES_TRANSFORMATION)
                cipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(GCM_TAG_LENGTH, iv))
                val passphrase = cipher.doFinal(ciphertext)
                promise.resolve(Base64.encodeToString(passphrase, Base64.NO_WRAP))
            } else {
                // First call: generate, encrypt, persist
                val passphrase = ByteArray(32).also { SecureRandom().nextBytes(it) }
                val cipher     = Cipher.getInstance(AES_TRANSFORMATION)
                cipher.init(Cipher.ENCRYPT_MODE, secretKey)
                val ciphertext = cipher.doFinal(passphrase)
                val iv         = cipher.iv
                val entry      = "${Base64.encodeToString(ciphertext, Base64.NO_WRAP)}:" +
                                  Base64.encodeToString(iv, Base64.NO_WRAP)
                prefs.edit().putString(DB_KEY_ENTRY, entry).apply()
                promise.resolve(Base64.encodeToString(passphrase, Base64.NO_WRAP))
            }
        } catch (e: Exception) {
            promise.reject("KEY_MATERIAL_FAILED", e.message, e)
        }
    }

    // ─── PIN Hashing ──────────────────────────────────────────────────────────

    /**
     * Generates a cryptographically random 32-byte salt, base64-encoded.
     */
    @ReactMethod
    fun generateSalt(promise: Promise) {
        try {
            val salt = ByteArray(32)
            SecureRandom().nextBytes(salt)
            promise.resolve(Base64.encodeToString(salt, Base64.NO_WRAP))
        } catch (e: Exception) {
            promise.reject("SALT_GEN_FAILED", e.message, e)
        }
    }

    /**
     * Hashes a PIN with PBKDF2-HMAC-SHA256 (310,000 iterations — NIST 2023 recommendation).
     */
    @ReactMethod
    fun hashPin(pin: String, saltB64: String, promise: Promise) {
        try {
            val salt      = Base64.decode(saltB64, Base64.NO_WRAP)
            val spec      = PBEKeySpec(pin.toCharArray(), salt, 310_000, 256)
            val factory   = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
            val hashBytes = factory.generateSecret(spec).encoded
            spec.clearPassword()
            val result = Arguments.createMap()
            result.putString("hash", Base64.encodeToString(hashBytes, Base64.NO_WRAP))
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("HASH_PIN_FAILED", e.message, e)
        }
    }
}
