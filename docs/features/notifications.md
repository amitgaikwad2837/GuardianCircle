# Feature: Push Notifications (App-to-App)

## Overview
When a guardian also has GuardianCircle installed, emergency alerts are delivered as push notifications in addition to SMS. Push notifications provide richer UI (acknowledge button, call button) and faster delivery.

SMS is always sent first and is the primary channel. Push notifications are an enhancement, never a replacement.

## Architecture
- FCM used as transport layer only
- All payloads encrypted end-to-end with guardian's Ed25519/X25519 public key
- Stateless open-source relay function (Firebase Cloud Functions)
- Relay receives and forwards encrypted blobs — cannot read content

## Notification Types

| Type | Channel | Bypasses DND | Actions |
|---|---|---|---|
| SOS | guardian_alerts | Yes | Acknowledge, Call |
| Distress detected | guardian_alerts | Yes | Acknowledge, Call |
| Check-in missed | guardian_alerts | No | Call |
| Journey overdue | guardian_alerts | No | Call |
| SOS cancelled | guardian_updates | No | — |

## Token Management
- FCM token exchanged during QR/invite guardian pairing
- Token included in pairing QR payload
- Token refresh → new token sent to guardians via silent SMS
- Token stored in guardian record in SQLCipher database

## Guardian-Side Requirements
- Guardian must have GuardianCircle installed
- Guardian must have granted notification permission
- Guardian's app must not be in battery-restricted mode

## Fallback
If FCM delivery fails or guardian does not have app: SMS was already sent. No further action required.

## Relay Source
`relay/functions/src/index.ts` — MIT licensed, self-hostable.

## Privacy
- FCM relay stores nothing
- GuardianCircle servers store no message content
- FCM token declared in Play Store Data Safety as device identifier for app functionality
