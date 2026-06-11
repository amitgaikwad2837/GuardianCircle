# ADR-008: BYOK AI — Keys Never Leave Device

**Status:** Accepted  
**Date:** 2026-06-11

## Decision

AI features are powered exclusively by user-supplied API keys (BYOK — Bring Your Own Key).

- Keys stored in Android Keystore (hardware-backed)
- Keys never logged, never included in crash reports, never sent to GuardianCircle
- AI requests go directly from device to provider (OpenAI / Anthropic / Gemini)
- Each AI request requires per-session explicit user consent showing exactly what data is sent
- Default state: no AI provider configured; AI features are opt-in

## Supported Providers (v1.0)

| Provider | Model | Use Case |
|---|---|---|
| OpenAI | gpt-4o-mini | Safety guidance, incident reports |
| Anthropic | claude-haiku-4-5 | Safety guidance, incident reports |
| Google Gemini | gemini-1.5-flash | Safety guidance, travel assistance |

## Key Lifecycle

```
User enters key → validate format → store in Android Keystore
  ↓
AI request → retrieve key from Keystore → add to Authorization header
  ↓
Response received → key reference released from memory
  ↓
User deletes key → Keystore entry deleted → key unrecoverable
```

## Privacy Disclosure (shown before every AI session)

> "This conversation will be sent to [Provider]. Your API key is used directly from your device. GuardianCircle never sees your messages or your key. Review [Provider]'s privacy policy before sharing sensitive details."
