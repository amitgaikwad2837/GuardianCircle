# Encryption Design

## Layers

```
Layer 1: Android Full Disk Encryption (OS — not our responsibility)
Layer 2: SQLCipher AES-256-GCM (database)
Layer 3: AES-256-GCM per file (evidence vault)
Layer 4: Android Keystore (key storage — hardware-backed where available)
Layer 5: Ed25519 signing (guardian identity)
Layer 6: X25519 key exchange (guardian pairing)
Layer 7: TLS 1.3 (AI provider network calls)
```

## Key Hierarchy

```
Android Keystore (hardware-backed on devices with StrongBox)
  ├── identity_private_key       Ed25519 — signs pairing payloads and incident records
  ├── db_encryption_key          AES-256 — SQLCipher PRAGMA key
  ├── evidence_master_key        AES-256 — derives per-file keys
  ├── real_pin_hash              Argon2id(pin, salt, m=65536, t=3, p=4)
  ├── duress_pin_hash            Argon2id(duressPin, salt, ...)
  ├── ai_openai_key              Raw API key
  ├── ai_anthropic_key           Raw API key
  └── ai_gemini_key              Raw API key
```

## PIN Hashing Parameters

```
Algorithm:  Argon2id
Memory:     65536 KB (64 MB) — resistant to GPU attacks
Iterations: 3
Parallelism: 4
Hash length: 32 bytes
Salt:       16 bytes, cryptographically random, stored alongside hash
```

## Guardian Pairing Cryptography

```
1. User generates Ed25519 key pair (or reuses identity key pair)
2. QR code contains: { publicKey, displayName, phone, timestamp, nonce }
   signed with identity private key
3. Guardian scans → verifies signature → stores public key
4. Bidirectional verification: guardian sends ack signed with their key
5. Both parties store verified public key for future message encryption
```

## Evidence File Encryption

```
For each evidence file:
  1. Generate random 32-byte file key from evidence_master_key + file_id (HKDF)
  2. Generate random 12-byte IV
  3. Encrypt with AES-256-GCM
  4. Store: encrypted_file | 16-byte auth tag
  5. Store IV and key derivation inputs in database (not the key itself)

Chain of custody:
  - SHA-256 hash of plaintext recorded at capture time
  - Hash stored in evidence table
  - On export: hash re-verified before export
```

## StrongBox Detection

```typescript
// At app startup, detect StrongBox availability
const isHardwareBacked = await CryptoModule.isHardwareBacked('identity_private_key');

if (!isHardwareBacked) {
  // Show one-time advisory: "Your device doesn't support hardware-backed
  // key storage. Your data is still encrypted but may be less secure
  // on rooted devices."
}
```

## Root Detection

On startup, check for root indicators:
- `/system/app/Superuser.apk` present
- `su` binary in common paths
- Test-keys build

On rooted device: show warning, offer to continue with acknowledgement. Do not block (users may have legitimate reasons). Log event to audit log.
