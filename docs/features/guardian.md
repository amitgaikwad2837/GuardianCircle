# Feature: Guardian Network

## Overview
Guardians are trusted contacts who receive emergency alerts via SMS, phone calls, and push notifications (if they have the app).

## Guardian Model

| Field | Type | Notes |
|---|---|---|
| id | UUID | Local only |
| displayName | string | Name shown in alerts |
| phoneNumber | E.164 | Required |
| publicKey | Ed25519 | Present if QR-paired |
| fcmToken | string | Present if app installed |
| trustLevel | 1/2/3 | 1=basic, 2=verified, 3=emergency-only |
| notificationPriority | number | Escalation order |
| isDecoy | boolean | Hidden in decoy mode |
| removalScheduledAt | timestamp | Delayed removal |

## Add Methods

| Method | Verification Level | Notes |
|---|---|---|
| Phonebook import | Basic (trust level 1) | Name + number from contacts |
| Manual entry | Basic (trust level 1) | User types name + number |
| QR code scan | Verified (trust level 2) | Cryptographic key exchange |
| Invite link | Verified (trust level 2) | Link expires in 1 hour, single-use |

## QR Pairing Flow
1. User shows QR (contains signed public key + display name + phone)
2. Guardian scans
3. Mutual key exchange via SMS acknowledgment
4. Both parties store verified public key

## Guardian Limits
- Maximum 10 active guardians
- Minimum recommended: 2

## Decoy Guardians
- Created alongside real guardians when decoy mode is enabled
- Separate names and numbers (fake contacts)
- Shown when app opened with duress PIN

## Delayed Removal
- Default: 24-hour delay before removal takes effect
- No notification sent to removed guardian at any point
- User can cancel pending removal within 24 hours
- Panic removal (immediate, no delay) available in Safety Settings

## Domestic Violence Note
A guardian cannot be added without the user's explicit action.
A guardian **cannot** add themselves or monitor the user without consent.
Guardian removal never notifies the removed person.
