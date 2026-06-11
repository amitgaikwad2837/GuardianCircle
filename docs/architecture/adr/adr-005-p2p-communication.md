# ADR-005: Peer-to-Peer Communication Only

**Status:** Accepted  
**Date:** 2026-06-11

## Decision

GuardianCircle communicates guardian alerts via:

1. **SMS** (primary) — works without internet, no GuardianCircle server
2. **Phone calls** (escalation) — works without internet
3. **FCM push notifications** (enhancement, app-to-app only) — see ADR-006
4. **Bluetooth LE mesh** (offline fallback, P1 feature) — see BLE spec

GuardianCircle owns no message routing infrastructure. SMS routes through the user's carrier. FCM routes through a stateless open-source relay (ADR-006).

## SMS Reliability Considerations

- SMS delivery is not guaranteed in all network conditions
- App implements retry queue with exponential backoff for failed SMS
- Escalation engine continues to next level after timeout regardless of SMS delivery confirmation
- Users advised during onboarding that SMS requires carrier coverage

## No WebSocket / REST API

There is no GuardianCircle REST API, WebSocket server, or real-time database. This is a feature, not a limitation — it means GuardianCircle cannot be compelled by a court order to produce user communications, because it does not possess them.
