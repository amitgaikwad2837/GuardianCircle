# Threat Model

## Threat Actors

| Actor | Capability | Primary Goal |
|---|---|---|
| **Abusive partner** | Physical device access, may know PIN, legal authority over shared accounts | Surveillance, evidence deletion, guardian manipulation, coercion |
| **Thief** | Physical device access, does not know PIN | Data exfiltration if device unlocked |
| **Passive network attacker** | Observe SMS content and metadata | Location data, guardian identity |
| **Active network attacker** | MITM on AI provider HTTPS | API key theft |
| **GuardianCircle (ourselves)** | Full access to relay infrastructure | Zero — by design, we cannot access user data |
| **Law enforcement** | Legal compulsion of GuardianCircle | User data — mitigated: we hold none |

## Threat Scenarios

### T1 — Abuser Inspects Phone

| Step | Attack | Mitigation |
|---|---|---|
| Finds app | Sees GuardianCircle installed | App icon disguise (appears as Weather/Calculator) |
| Opens app | Sees real guardian list | Decoy mode shows fake guardians |
| Compels PIN entry | Enters user's PIN | Duress PIN shows empty/decoy state + silently triggers SOS |
| Deletes app | Removes protection | Delayed guardian removal; guardian receives no-heartbeat alert (v2) |
| Finds SOS history | Sees past incidents | Duress mode shows no history |

### T2 — Device Seized (Law Enforcement or Theft)

| Data | Protection |
|---|---|
| Database content | SQLCipher AES-256, key in Android Keystore |
| Evidence files | AES-256-GCM encrypted, per-file IV |
| AI provider keys | Android Keystore, hardware-backed |
| PIN | Argon2id hash, never stored in plaintext |
| FCM token | No sensitive value — cannot be used to read messages |

### T3 — Network Attack on AI Requests

- All AI requests use TLS 1.3 to provider endpoint
- API keys are added to request headers at the last moment (from Keystore)
- Keys exist in JS memory only for the duration of the request
- No AI request is made without explicit user confirmation

### T4 — Relay Compromise

- FCM relay receives only encrypted ciphertext
- Even a fully compromised relay cannot read message content
- Worst case: relay drops messages → SMS fallback already sent

### T5 — BLE Passive Tracking

- Static BLE device ID allows passive location tracking
- Mitigation: rotating pseudonymous IDs (15-minute window, matching iOS AirTag standard)
- BLE mesh is opt-in; off by default

## Attack Surface Summary

| Surface | Exposure | Risk Level |
|---|---|---|
| SQLite database file | Encrypted, Keystore key | Low |
| MMKV storage | Non-sensitive settings only | Low |
| SMS content | Plaintext (carrier-level) | Medium — accepted, location in SMS is intentional |
| FCM relay | Encrypted payload | Low |
| AI provider requests | TLS 1.3 | Low |
| BLE advertising | Rotating IDs | Low (opt-in) |
| Android Keystore | Hardware-backed | Very Low |
| Crash logs | Sanitised, local only | Low |
