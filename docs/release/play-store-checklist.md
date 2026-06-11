# Play Store Release Checklist

## Technical Requirements
- [ ] Target SDK: API 34 (Android 14)
- [ ] Minimum SDK: API 29 (Android 10)
- [ ] 64-bit compliance: arm64-v8a ABI included
- [ ] ProGuard/R8 obfuscation: enabled in release build
- [ ] No cleartext HTTP traffic (network_security_config.xml configured)
- [ ] Play App Signing: enrolled
- [ ] All optional permissions declared with `android:required="false"`
- [ ] Runtime permissions: requested contextually, not at launch
- [ ] Background location: separate runtime request after foreground granted
- [ ] Exact alarms: `USE_EXACT_ALARM` or `SCHEDULE_EXACT_ALARM` declared
- [ ] Battery optimisation exemption: user prompted contextually
- [ ] Foreground service notification: clear and non-dismissable during active monitoring
- [ ] Widget compliant with Android 12 widget guidelines
- [ ] App tested on Android 10, 11, 12, 13, 14

## Permissions Justification (for Play review)
- [ ] `SEND_SMS` — documented: emergency alerts to guardians
- [ ] `CALL_PHONE` — documented: emergency escalation calls
- [ ] `RECEIVE_SMS` — documented: parses guardian acknowledgment replies
- [ ] `ACCESS_FINE_LOCATION` — documented: shared with guardians during emergency
- [ ] `ACCESS_BACKGROUND_LOCATION` — documented: journey monitoring when backgrounded
- [ ] `READ_CONTACTS` — documented: single contact selection for guardian addition
- [ ] `RECORD_AUDIO` — documented: optional emergency evidence recording

## Store Listing
- [ ] App icon: 512×512 PNG, no alpha
- [ ] Feature graphic: 1024×500 PNG
- [ ] Screenshots: minimum 2 phone screenshots
- [ ] Short description: under 80 characters, no medical claims
- [ ] Full description: fall detection wellness disclaimer included
- [ ] Content rating questionnaire: completed (Violence: none, Privacy: location)
- [ ] Privacy policy URL: published and accessible

## Data Safety Form
- [ ] No data collected by GuardianCircle declared
- [ ] FCM device identifier declared (app functionality, not shared, encrypted)
- [ ] User-initiated AI requests disclosed
- [ ] User can delete all data: Yes

## Legal / Compliance
- [ ] Fall detection disclaimer: present in app and store listing
- [ ] No medical device claims anywhere in listing or app
- [ ] Age restriction: 13+ stated in description
- [ ] Privacy policy covers DPDP Act 2023 requirements
- [ ] Terms of service: published

## Pre-Launch Testing
- [ ] Full SOS flow on 5 physical devices
- [ ] Offline SOS (airplane mode) tested
- [ ] Duress PIN flow verified
- [ ] Decoy mode verified
- [ ] Journey monitoring background tested
- [ ] Check-in escalation tested
- [ ] Phonebook guardian add tested
- [ ] Push notification delivery tested (both parties have app)
- [ ] Battery impact measured across all modes
- [ ] Accessibility: TalkBack full navigation tested
- [ ] Large font (200% scale) layout verified
- [ ] High contrast mode verified
