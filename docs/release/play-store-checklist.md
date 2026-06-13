# Play Store Release Checklist

## Technical Requirements
- [x] Target SDK: API 35 (Android 15)
- [x] Minimum SDK: API 29 (Android 10)
- [x] 64-bit compliance: arm64-v8a ABI (gradle.properties)
- [x] ProGuard/R8 obfuscation: enabled in release build (build.gradle)
- [x] No cleartext HTTP traffic (network_security_config.xml configured)
- [x] All optional permissions declared with `android:required="false"`
- [x] Runtime permissions: requested contextually (PermissionManager)
- [x] Background location: separate runtime request after foreground granted
- [x] Exact alarms: `SCHEDULE_EXACT_ALARM` declared (check-in escalation)
- [x] Battery optimisation exemption: user prompted contextually
- [x] Foreground service notification: JourneyNotificationService (non-dismissable)
- [x] Release keystore generated and gradle.properties.local configured
- [x] CI builds debug APK successfully (GitHub Actions)
- [ ] Play App Signing: enrolled (do at submission time)
- [ ] App tested on Android 10, 11, 12, 13, 14, 15 (physical + emulator matrix)

## Permissions Justification (for Play review)
- [x] `SEND_SMS` — emergency alerts to guardians
- [x] `CALL_PHONE` — emergency escalation calls (Level 2+)
- [x] `RECEIVE_SMS` — parses guardian acknowledgment replies
- [x] `ACCESS_FINE_LOCATION` — shared with guardians during emergency only
- [x] `ACCESS_BACKGROUND_LOCATION` — journey monitoring when backgrounded
- [x] `READ_CONTACTS` — single contact selection for guardian addition
- [x] `RECORD_AUDIO` — optional emergency evidence recording
- [x] `ACTIVITY_RECOGNITION` — fall and distress detection algorithms
- [x] `POST_NOTIFICATIONS` — safety alerts and journey status
- [x] `BLUETOOTH_*` — future BLE mesh (declared, not yet used)

## Store Listing
- [ ] App icon: 512×512 PNG, no alpha
- [ ] Feature graphic: 1024×500 PNG
- [ ] Screenshots: minimum 2 phone screenshots (target 8 showing all key screens)
- [ ] Short description: under 80 characters, no medical claims
- [ ] Full description: fall detection wellness disclaimer included
- [ ] Content rating questionnaire: completed (Violence: none, Privacy: location)
- [x] Privacy policy URL: published at https://amitgaikwad2837.github.io/GuardianCircle/privacy.html
- [x] Terms of service URL: published at https://amitgaikwad2837.github.io/GuardianCircle/terms.html

## Data Safety Form
- [x] No data collected by GuardianCircle
- [x] FCM device identifier: app functionality only, not shared, encrypted in transit
- [x] User-initiated AI requests: disclosed (BYOK — key stays on device)
- [x] User can delete all data: Yes (Settings → Wipe All Data)

## Legal / Compliance
- [x] Fall/crash detection disclaimer: present on FallResponseScreen and CrashResponseScreen
- [x] No medical device claims anywhere in app or listing
- [x] Age restriction: 13+ in description
- [x] Privacy policy covers DPDP Act 2023 requirements
- [x] Terms of service: published

## Pre-Launch Testing
- [ ] Full SOS flow on 5 physical devices
- [ ] Offline SOS (airplane mode) tested
- [ ] Duress PIN flow verified on device
- [ ] Decoy mode verified (icon changes, name changes)
- [ ] Journey monitoring background tested (screen off, 15+ minutes)
- [ ] Check-in escalation tested (miss a check-in, verify SMS sent)
- [ ] Phonebook guardian add tested
- [ ] Push notification delivery tested (both parties have app)
- [ ] Battery impact measured across all modes
- [ ] Evidence log: capture, view, export, and auto-delete tested
- [ ] Sensitivity profiles: switching and detection threshold changes verified
- [ ] Unsafe place geofence: trigger SOS, exit area, re-enter, verify alert
- [ ] Volume button SOS tested (screen on and screen off)
- [ ] Accessibility: TalkBack full navigation tested
- [ ] Large font (200% scale) layout verified

## v1.0 Release Notes (draft)
GuardianCircle is a privacy-first personal safety app for Android. It requires no account,
stores all data on your device, and never sends your information to GuardianCircle servers.

**What's new in v1.0:**
- One-tap SOS with long press, shake, and volume button triggers
- Guardian network with QR pairing and end-to-end encrypted alerts
- Automatic vehicle crash detection and fall detection
- Journey mode with recurring check-ins and persistent notification
- Evidence log with automatic 24-hour deletion
- Unsafe place memory — alerts when re-entering a danger location
- Sensitivity profiles (Normal / Gym / Driving / Sleep)
- Silent SOS, Duress PIN, and Decoy mode for covert protection
- BYOK AI safety assistant (OpenAI, Anthropic, or Gemini)
