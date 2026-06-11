# Privacy Policy Requirements

## Governing Laws

| Jurisdiction | Law | Applicability |
|---|---|---|
| India (primary) | Digital Personal Data Protection Act 2023 (DPDP) | Primary market |
| EU | GDPR | If distributed to EU |
| USA | CCPA | If distributed to California |

## Required Sections

### 1. Data We Do NOT Collect
GuardianCircle does not operate servers that collect, store, or process user personal data.

### 2. Data Stored On Your Device
The following data is stored locally on your device, encrypted:
- Display name (optional)
- Guardian names and phone numbers
- Emergency incident history
- Journey records and waypoints
- Check-in history
- Evidence files (audio, photos, videos)
- App settings and preferences

### 3. SMS and Phone Calls
Emergency alerts are sent via your carrier's SMS and calling service. GuardianCircle does not store, intercept, or have access to these communications.

### 4. AI Features (BYOK)
When you use AI features:
- Your API key is stored only on your device using Android's secure key storage
- Requests are sent directly from your device to your chosen AI provider (OpenAI, Anthropic, or Google)
- GuardianCircle never receives, stores, or processes AI requests or responses
- You must review the privacy policy of your chosen AI provider

### 5. Push Notifications
If your guardian also has GuardianCircle installed:
- Emergency alerts may be delivered via push notification
- Notification content is encrypted on your device before transmission
- Our relay service receives only an encrypted blob it cannot read
- FCM tokens are exchanged between devices at pairing time and not stored on our servers

### 6. Crash Reports
Crash information is stored locally only. We never automatically transmit crash data. You may optionally share a sanitised crash log to help us fix issues.

### 7. No Third-Party Data Sharing
GuardianCircle does not share any user data with third parties, advertisers, data brokers, or analytics companies.

### 8. Children
This app is not intended for users under 13 years of age.

### 9. Your Rights (DPDP / GDPR)
- **Access**: All your data is on your device; you have full access
- **Export**: Settings → Privacy → Export Data
- **Delete**: Settings → Privacy → Delete All Data (immediate, irreversible)
- **Correction**: Edit data directly in the app

### 10. Security
We use AES-256-GCM encryption for stored data and Android Keystore for key management. See our public security documentation for details.

### 11. Changes to This Policy
Material changes will be communicated via an in-app notice before they take effect.

### 12. Contact
[privacy@guardiancircle.app]

## Data Safety Form (Play Store)

| Field | Value |
|---|---|
| Data collected by app | None (all data stored locally) |
| Data shared with third parties | None by GuardianCircle |
| Data encrypted in transit | Yes (TLS 1.3 for AI requests) |
| Data encrypted at rest | Yes (AES-256-GCM) |
| Users can request deletion | Yes — in-app, immediate |
| Committed to Play Families Policy | N/A (13+ only) |

**FCM token note**: FCM tokens are used for push notification delivery. They are not stored on GuardianCircle servers. Declare under "App functionality" → "Device or other IDs" → "Not shared" → "Encrypted in transit" → "User can delete" (by uninstalling or clearing data).
