# GuardianCircle Documentation

Privacy-first personal safety application for Android — v1.1.

## Contents

| Document | Description |
|---|---|
| [Architecture Overview](architecture/overview.md) | High-level system design and data flows |
| [ADR Index](architecture/adr/index.md) | All Architecture Decision Records |
| [Module Breakdown](architecture/module-breakdown.md) | Full feature slice dependency graph |
| [Database Schema](architecture/database-schema.md) | SQLite schema and migration strategy |
| [Security Threat Model](security/threat-model.md) | Threat model and mitigations |
| [Encryption Design](security/encryption.md) | Key management and encryption strategy |
| [Feature: SOS](features/sos.md) | SOS trigger, escalation, and duress PIN |
| [Feature: Guardians](features/guardian.md) | Guardian CRUD, QR pairing, notification handler |
| [Feature: Notifications](features/notifications.md) | FCM relay, SMS fallback, push receive |
| [Privacy Policy Requirements](privacy/privacy-policy-requirements.md) | Legal requirements (DPDP Act 2023) |
| [Play Store Checklist](release/play-store-checklist.md) | Release readiness — v1.1 |
| [Development Roadmap](roadmap/roadmap.md) | Phased delivery — Phases 1–4 complete |
| [Testing Strategy](testing/testing-strategy.md) | Test pyramid and coverage targets |
| [Accessibility Guide](ux/accessibility.md) | WCAG and Android accessibility |
| [Onboarding Flow](ux/onboarding-flow.md) | First-run user experience |

## Core Principles

1. **No GuardianCircle backend** — the device is the server
2. **No user accounts** — cryptographic local identity only (Android Keystore)
3. **Offline-first** — all safety-critical features work without internet
4. **Domestic violence threat model** — every feature evaluated against abuser access
5. **Privacy by default** — no telemetry, no analytics, no cloud data (ADR-007)
6. **BYOK AI only** — API keys stored locally in Android Keystore, never on our servers

## Implemented Features (v1.1)

| Feature | Status | Notes |
|---|---|---|
| One-tap SOS (long press / shake / volume buttons) | ✅ Done | |
| Guardian network — up to 10, QR-paired | ✅ Done | QR scanning via react-native-camera-kit |
| Encrypted FCM push + SMS fallback alerts | ✅ Done | |
| BLE offline SOS mesh | ✅ Done | 28-byte beacon; relay enrollment notifications |
| Vehicle crash detection (speed + G-force FSM) | ✅ Done | |
| Fall detection (confidence-scored algorithm) | ✅ Done | |
| Journey mode + recurring check-ins | ✅ Done | |
| Persistent journey notification | ✅ Done | |
| Evidence log (photo / audio / text, 24h auto-delete) | ✅ Done | |
| Smart geofencing — unsafe place memory | ✅ Done | |
| Sensitivity profiles (Normal / Gym / Driving / Sleep) | ✅ Done | |
| Silent SOS | ✅ Done | |
| Duress PIN | ✅ Done | |
| Decoy mode (icon disguise) | ✅ Done | |
| BYOK AI assistant (OpenAI / Anthropic / Gemini) | ✅ Done | Custom persona/system prompt support |
| CI/CD (TypeScript + ESLint + Jest + Android APK) | ✅ Done | |

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | React Native 0.75.4 | Hermes, Old Architecture (New Arch not yet stable on this RN version) |
| Navigation | @react-navigation v6 | v7 requires react-native-screens v4 which requires RN ≥ 0.82 |
| Database | op-sqlite | Synchronous SQLite, no ORM overhead |
| Key-value | react-native-mmkv | Encrypted, synchronous, fast |
| QR scanning | react-native-camera-kit v18 | Works with RN 0.75; vision-camera v5 requires New Architecture |
| BLE | Custom native module (BluetoothMeshModule.kt) | Standard BLE advertising/scanning; 28-byte rotating-ID beacon |
| Notifications | @notifee/react-native | BLE relay enrollment + SOS actions |
| Secure storage | react-native-keychain → Android Keystore | API keys never leave the device |

## Quick Start (Development)

```bash
# Prerequisites: Node 20+, JDK 17, Android SDK API 29–35

npm install

# Run on device / emulator
npm run android

# Type check + lint + tests
npm run typecheck
npm run lint
npm run test:coverage
```

### Release build

Build from **Android Studio** (Build → Generate Signed Bundle / APK → APK → release).

> **Note:** `gradle.properties` configures the Gradle daemon with 4 GB heap (`-Xmx4096m`) which is required for Hermes bytecode compilation. Command-line `gradlew.bat` may fail on machines where the loopback TCP port is blocked by a firewall; use Android Studio's embedded build in that case.

Signing credentials live in `android/gradle.properties.local` (gitignored).
See `android/app/build.gradle` for the full signing config.

## Website

The GitHub Pages site at `docs/` is auto-published from the `main` branch:
- `docs/index.html` — product landing page
- `docs/privacy.html` — Privacy Policy
- `docs/terms.html` — Terms & Conditions
