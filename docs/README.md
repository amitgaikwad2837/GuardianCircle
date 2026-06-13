# GuardianCircle Documentation

Privacy-first personal safety application for Android — v1.0.

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
| [Play Store Checklist](release/play-store-checklist.md) | Release readiness — v1.0 |
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

## Implemented Features (v1.0)

| Feature | Status |
|---|---|
| One-tap SOS (long press / shake / volume buttons) | ✅ Done |
| Guardian network — up to 10, QR-paired | ✅ Done |
| Encrypted FCM push + SMS fallback alerts | ✅ Done |
| Vehicle crash detection (speed + G-force FSM) | ✅ Done |
| Fall detection (confidence-scored algorithm) | ✅ Done |
| Journey mode + recurring check-ins | ✅ Done |
| Persistent journey notification | ✅ Done |
| Evidence log (photo / audio / text, 24h auto-delete) | ✅ Done |
| Smart geofencing — unsafe place memory | ✅ Done |
| Sensitivity profiles (Normal / Gym / Driving / Sleep) | ✅ Done |
| Silent SOS | ✅ Done |
| Duress PIN | ✅ Done |
| Decoy mode (icon disguise) | ✅ Done |
| BYOK AI assistant (OpenAI / Anthropic / Gemini) | ✅ Done |
| CI/CD (TypeScript + ESLint + Jest + Android APK) | ✅ Done |

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

### Release build (Windows)

```cmd
cd android
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
gradlew.bat assembleRelease
adb install -r app\build\outputs\apk\release\app-release.apk
```

Signing credentials live in `android/gradle.properties.local` (gitignored).
See `android/app/build.gradle` for the full signing config.

## Website

The GitHub Pages site at `docs/` is auto-published from the `main` branch:
- `docs/index.html` — product landing page
- `docs/privacy.html` — Privacy Policy
- `docs/terms.html` — Terms & Conditions
