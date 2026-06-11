# ADR-003: SQLCipher + MMKV Storage Strategy

**Status:** Accepted  
**Date:** 2026-06-11

## Decision

- **op-sqlite with SQLCipher** for all structured, sensitive data (guardians, incidents, journeys)
- **MMKV** for non-sensitive key-value settings and UI preferences
- **react-native-keychain** backed by Android Keystore for secrets (PIN hashes, AI keys, crypto keys)

## Key Management

SQLCipher database key is generated once, stored in Android Keystore (hardware-backed where available), and never stored in plaintext anywhere in the app.

```
Android Keystore
  └── db_encryption_key (AES-256, hardware-backed)
        └── Used as SQLCipher PRAGMA key at db open
```

## Migration Strategy

SQL migrations are versioned in `src/core/storage/database/migrations/`.  
Schema version tracked in `user_version` PRAGMA.  
Migrations are append-only — no destructive schema changes without a migration.

## Alternatives Considered

| Option | Rejected Reason |
|---|---|
| AsyncStorage | Unencrypted; not suitable for sensitive data |
| Realm | Larger bundle size; proprietary encryption approach |
| WatermelonDB | No SQLCipher support |
| Plain SQLite | No encryption |
