# Module Breakdown

## Feature Slices

| Feature | Domain Entities | Key Use Cases | Infrastructure Adapters |
|---|---|---|---|
| `sos` | SOSEvent, EscalationLevel | TriggerSOS, CancelSOS, EscalateAlert, SilentSOS | SMSAlertDispatcher, CallDispatcher, LocationBroadcaster |
| `guardian` | Guardian | AddGuardian, RemoveGuardian, PairQR, VerifyGuardian, PhonebookPicker | GuardianRepository, QRCodeGenerator, ContactPickerModule |
| `distress` | DistressEvent, DistressSignal | DetectDistress, ScoreConfidence | MotionAnalyzer, PatternDetector, BehavioralAnalyzer |
| `fall-detection` | FallEvent | DetectFall, ConfirmFall | SensorFusionAdapter, FallAlgorithm |
| `journey` | Journey, Waypoint | StartJourney, MonitorJourney, DetectDeviation | LocationService, JourneyRepository |
| `checkin` | CheckIn | ScheduleCheckIn, CompleteCheckIn, EscalateMissed | CheckInRepository, NotificationScheduler |
| `geofence` | Geofence, GeofenceEvent | CreateGeofence, MonitorGeofence | AndroidGeofencingAPI, GeofenceRepository |
| `vehicle-crash` | CrashEvent | DetectCrash, ConfirmCrash | MotionSensorAdapter, GPSSpeedMonitor |
| `bluetooth-mesh` | MeshBeacon | StartBeaconing, RelayBeacon, DiscoverPeers | BluetoothMeshModule (native Kotlin) |
| `voice-trigger` | VoiceTriggerConfig | ConfigureTrigger, StartListening | VoiceTriggerModule (native Kotlin) |
| `ai-assistant` | AIProviderConfig, ChatMessage | SendMessage, GetSafetyGuidance, StoreKey | OpenAIProvider, AnthropicProvider, GeminiProvider |
| `settings` | AppSettings, SafetySettings | UpdateSettings, SetDuressPin, ConfigureDecoy | PreferencesStore, SecureStore |

## Core Modules

| Module | Responsibility | Key Exports |
|---|---|---|
| `core/crypto` | Key generation, encryption, signing | KeyManager, EncryptionService, IdentityManager |
| `core/storage/database` | SQLCipher lifecycle, migrations | DatabaseManager, all Repositories |
| `core/storage/secure` | Keystore-backed secret storage | SecureStore |
| `core/storage/preferences` | MMKV settings | PreferencesStore |
| `core/events` | Typed cross-feature event bus | EventBus, EventTypes |
| `core/permissions` | Runtime permission management | PermissionManager |
| `core/sensors` | Accelerometer/Gyro abstraction | AccelerometerService, SensorFusion |
| `core/location` | GPS and fused location | LocationService, GeocodeService |
| `core/navigation` | React Navigation setup + deep links | AppNavigator, NavigationTypes |
| `core/theme` | Design tokens, typography, colours | tokens, ThemeProvider |

## Native Modules (Kotlin)

| Module | Exposes to JS | Android API Used |
|---|---|---|
| `SmsModule` | `sendSMS(to, body)` | `SmsManager` |
| `CryptoModule` | `generateKeyPair`, `encrypt`, `decrypt`, `sign`, `verify` | `android.security.keystore` |
| `SensorModule` | `startListening(hz)`, `onData(callback)` | `SensorManager` |
| `ContactPickerModule` | `pickContact()` | `ContactsContract`, `Intent.ACTION_PICK` |
| `BackgroundTaskModule` | `startForegroundService`, `stopForegroundService` | `ForegroundService` |
| `BluetoothMeshModule` | `startBeacon`, `stopBeacon`, `scanForBeacons` | `BluetoothLeAdvertiser`, `BluetoothLeScanner` |
| `WidgetModule` | Widget update bridge | `AppWidgetManager` |
