# GuardianCircle Documentation

Privacy-first personal safety application for Android.

## Contents

| Document | Description |
|---|---|
| [Architecture Overview](architecture/overview.md) | High-level system design |
| [ADR Index](architecture/adr/index.md) | All Architecture Decision Records |
| [Security Model](security/threat-model.md) | Threat model and mitigations |
| [Encryption Design](security/encryption.md) | Key management and encryption strategy |
| [Database Schema](architecture/database-schema.md) | SQLite schema and migration strategy |
| [Feature Specs](features/) | Per-feature specifications |
| [API Contracts](api/internal-contracts.md) | Internal module interfaces |
| [Privacy Policy Requirements](privacy/privacy-policy-requirements.md) | Legal requirements |
| [Play Store Checklist](release/play-store-checklist.md) | Release readiness |
| [Development Roadmap](roadmap/roadmap.md) | Phased delivery plan |
| [Testing Strategy](testing/testing-strategy.md) | Test pyramid and coverage targets |
| [Accessibility Guide](ux/accessibility.md) | WCAG and Android accessibility |
| [Onboarding Flow](ux/onboarding-flow.md) | First-run user experience |

## Core Principles

1. **No GuardianCircle backend** — the device is the server
2. **No user accounts** — cryptographic local identity only
3. **Offline-first** — all safety-critical features work without internet
4. **Domestic violence threat model** — every feature evaluated against abuser access
5. **Privacy by default** — no telemetry, no analytics, no cloud data

## Quick Start (Development)

```bash
# Prerequisites: Node 18+, JDK 17, Android SDK API 29–34

npm install
npm run android
```

See [Development Setup](development/setup.md) for full environment guide.
