# Development Roadmap

## Phase 1 — Foundation (Weeks 1–4)
Goal: App boots, navigates, stores encrypted data, passes security review of key management.

- [ ] React Native + TypeScript project initialisation
- [ ] Android native module scaffolding (Kotlin)
- [ ] SQLCipher integration + initial migrations
- [ ] Android Keystore native module
- [ ] MMKV setup
- [ ] Navigation structure
- [ ] Theme system + design tokens
- [ ] Accessibility foundation (TalkBack, semantic roles)
- [ ] Typed EventBus
- [ ] Onboarding screens (UI only)
- [ ] CI/CD (GitHub Actions): lint, typecheck, test, build
- [ ] Unit test framework

**Exit gate:** Security architect reviews key management implementation.

## Phase 2 — Core Safety (Weeks 5–10)
Goal: Full SOS flow works offline, including all trigger methods, escalation, and duress PIN.

- [ ] Guardian CRUD
- [ ] Phonebook guardian add (ContactPickerModule)
- [ ] QR guardian pairing
- [ ] SMS native module
- [ ] SOS trigger (tap, long press, shake, volume buttons)
- [ ] Cancellation window (configurable 5–30s)
- [ ] Escalation engine (Level 0/1/2/3)
- [ ] Silent SOS
- [ ] Duress PIN + decoy mode
- [ ] SMS acknowledgment parser
- [ ] Location service (emergency only)
- [ ] Incident history storage
- [ ] Home screen widget

**Exit gate:** Full SOS regression test on 5 physical devices. Offline test (airplane mode).

## Phase 3 — Detection & Monitoring (Weeks 11–16)
Goal: Distress, fall, journey, check-in, and geofencing features complete.

- [ ] SensorModule native Kotlin (high-frequency accelerometer/gyro)
- [ ] Distress detection engine (behavioural signals)
- [ ] Fall detection algorithm + confirmation UX
- [ ] Journey monitoring (start, track, deviation, overdue)
- [ ] Check-in system (one-time, recurring, escalation)
- [ ] Smart geofencing (safe/unsafe zones)
- [ ] Background service hardening (ForegroundService, WakeLock, AlarmManager)
- [ ] Battery optimisation pass (measure impact per mode)

**Exit gate:** Detection features tested across device matrix. Battery impact within targets.

## Phase 4 — Privacy & Communications (Weeks 17–20)
Goal: All domestic violence protections and app-to-app notifications complete.

- [ ] App icon disguise (alias activities)
- [ ] Delayed guardian removal
- [ ] Hidden gesture SOS (volume buttons)
- [ ] FCM relay deployment (open source Cloud Function)
- [ ] Push notification receive + decrypt + display
- [ ] FCM token exchange at pairing time
- [ ] BYOK AI integration (OpenAI, Anthropic, Gemini)
- [ ] AI consent screen (per-session)
- [ ] Privacy settings screens
- [ ] Security audit (internal)

**Exit gate:** DV threat model review with subject matter expert.

## Phase 5 — Polish & Release (Weeks 21–24)
Goal: Play Store submission.

- [ ] Accessibility audit (TalkBack, Switch Access, Voice Access, large text)
- [ ] Localisation: English + Hindi
- [ ] Onboarding refinement (elderly user testing)
- [ ] Performance profiling
- [ ] Local crash log system
- [ ] Play Store assets (icon, screenshots, description)
- [ ] Privacy policy publication
- [ ] Beta testing (100 users, closed track)
- [ ] Bug fixes from beta
- [ ] Play Store submission

## v1.1 (Post-Launch)
- Voice trigger SOS (Whisper.cpp / Vosk)
- Bluetooth LE mesh beaconing
- Vehicle crash detection
- Tamil, Bengali, Telugu localisation

## v2.0
- Wear OS companion
- Evidence vault with cryptographic chain of custody
- On-device AI (llama.cpp for basic models)
- WebRTC peer-to-peer real-time location sharing

## v3.0
- iOS port
- Satellite messaging integration
- Community safe zone mapping (privacy-preserving)
