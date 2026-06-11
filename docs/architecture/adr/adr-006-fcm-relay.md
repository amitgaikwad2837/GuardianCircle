# ADR-006: Stateless FCM Relay for Push Notifications

**Status:** Accepted  
**Date:** 2026-06-11

## Context

Push notifications require a server-side FCM API call — a device cannot send FCM directly to another device. This creates tension with the no-backend principle.

## Decision

Use a **minimal stateless Firebase Cloud Function** as a dumb relay:

- Receives an encrypted payload from sender device
- Forwards it to FCM without decryption, without storage, without logging PII
- Rate-limited by sender public key (prevents abuse)
- Open source — auditable by anyone
- Self-hostable — users can deploy their own relay

The relay sees: `{ recipientFcmToken, encryptedPayload, signature, senderPublicKey }`.  
It never sees: message content, location, guardian identities, user names.

## Privacy Guarantee

```
Sender device encrypts payload with recipient's public key (Ed25519/X25519)
  → Relay receives opaque ciphertext
  → FCM delivers opaque ciphertext to recipient device
  → Recipient device decrypts with own private key
```

GuardianCircle relay has cryptographic proof it cannot read message content.

## Fallback

SMS is **always** sent regardless of push notification status. Push notifications are an enhancement for users whose guardians also have the app installed.

## Relay Source Code

Located at `relay/functions/src/index.ts`. MIT licensed.
