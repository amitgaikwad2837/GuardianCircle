# Development Roadmap

## Phase 1 — Foundation ✅ Complete
Goal: App boots, navigates, stores encrypted data, passes CI.

- [x] React Native + TypeScript project initialisation
- [x] Android native module scaffolding (Kotlin)
- [x] SQLCipher integration + initial migrations (op-sqlite)
- [x] Android Keystore native module (CryptoModule)
- [x] MMKV setup
- [x] Navigation structure (React Navigation)
- [x] Theme system + design tokens (Material You)
- [x] Accessibility foundation (TalkBack, semantic roles)
- [x] Typed EventBus (EventEmitter3)
- [x] Onboarding screens (Welcome, Identity, Permissions, FirstGuardian)
- [x] CI/CD (GitHub Actions): lint, typecheck, test, build APK
- [x] Unit test framework (Jest + 74 passing tests)

## Phase 2 — Core Safety ✅ Complete
Goal: Full SOS flow works offline, including all trigger methods, escalation, and duress PIN.

- [x] Guardian CRUD (add, edit, delete, list)
- [x] Phonebook guardian add (ContactPickerModule)
- [x] QR guardian pairing (QRPairScreen, key exchange)
- [x] SMS native module (SmsModule Kotlin)
- [x] SOS trigger — long press, shake, volume buttons
- [x] Cancellation window (configurable 5–30s)
- [x] Escalation engine (Level 0/1/2/3)
- [x] Silent SOS
- [x] Duress PIN + decoy mode
- [x] Location service (emergency use only)
- [x] Incident history storage (SQLite)
- [x] AlertDispatcher (FCM push + SMS fallback + phone call)

## Phase 3 — Detection & Monitoring ✅ Complete
Goal: Distress, fall, crash, journey, check-in, and geofencing complete.

- [x] SensorModule native Kotlin (high-frequency accelerometer/gyro)
- [x] Distress detection engine (behavioural signals + confidence scoring)
- [x] Fall detection algorithm + confirmation UX (FallResponseScreen)
- [x] Vehicle crash detection (speed + G-force FSM)
- [x] Journey monitoring (start, track, deviation, overdue, arrival)
- [x] Check-in system (one-time, recurring, escalation)
- [x] Persistent journey notification ('I've Arrived' / 'Cancel' actions)
- [x] Smart geofencing — unsafe place memory, re-entry alerts
- [x] Sensitivity profiles (Normal / Gym / Driving / Sleep)
- [x] Evidence log (photo, audio, text; auto-delete after 24h)

## Phase 4 — Privacy & Communications ✅ Complete
Goal: All domestic violence protections and app-to-app notifications complete.

- [x] App icon disguise (alias activities, AppIconService)
- [x] Delayed guardian removal (scheduleRemoval)
- [x] Hidden gesture SOS (volume buttons via MediaSession)
- [x] FCM push notification receive + decrypt + display
- [x] GuardianNotificationHandler (verify signature → decrypt payload)
- [x] BYOK AI integration (OpenAI, Anthropic, Gemini)
- [x] AI consent screen (per-session key validation)
- [x] Privacy settings screens (WipeData, DecoyMode, DuressPIN)

## Phase 5 — Polish & Release (In Progress)
Goal: Play Store submission.

- [ ] Accessibility audit (TalkBack, Switch Access, Voice Access, large text)
- [ ] Localisation: English + Hindi
- [ ] Onboarding refinement (elderly user testing)
- [ ] Performance profiling
- [ ] Local crash log system
- [ ] Play Store assets (icon, screenshots, store description)
- [ ] Beta testing (100 users, closed track)
- [ ] Bug fixes from beta
- [ ] Play Store submission

## v1.1 (Post-Launch)
- Voice trigger SOS (Whisper.cpp / Vosk)
- Bluetooth LE mesh beaconing
- Tamil, Bengali, Telugu localisation
- Home screen widget

## v2.0
- Wear OS companion
- Evidence vault with cryptographic chain of custody
- On-device AI (llama.cpp for basic models)
- WebRTC peer-to-peer real-time location sharing

## v3.0
- iOS port
- Satellite messaging integration
- Community safe zone mapping (privacy-preserving)
