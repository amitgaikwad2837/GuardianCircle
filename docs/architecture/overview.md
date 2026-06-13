# Architecture Overview

## Pattern: Feature-Sliced Clean Architecture

GuardianCircle uses a hybrid of **Feature-Sliced Design** (top-level organisation) and **Clean Architecture** (within each slice). Dependencies always point inward — outer layers depend on inner layers, never the reverse.

```
src/
  features/<name>/
    domain/          ← Pure business logic. Zero external dependencies.
    application/     ← Use cases. Orchestrates domain. No framework imports.
    infrastructure/  ← Adapters: SQLite, SMS, Location, BLE, AI providers.
    presentation/    ← React Native screens, components, Zustand stores.
  core/              ← Shared infrastructure (crypto, storage, events, nav)
  shared/            ← Shared UI components and hooks
  app/               ← Entry point, providers, root navigator
```

## Dependency Rule

```
presentation → application → domain
infrastructure → domain (implements domain interfaces)
core ← used by any layer except domain
```

Domain entities and interfaces have **zero imports** from React Native, SQLite, or any third-party library.

## Cross-Feature Communication

Features do **not** import each other. All cross-feature communication flows through the typed `EventBus`:

```
SOS feature emits  → 'sos:triggered'
Journey feature    → listens → sends journey location update
Distress feature   → listens → escalates if SOS during distress
```

See [EventTypes](../../src/core/events/EventTypes.ts) for the full event schema.

## State Management

| Layer | Tool | Rationale |
|---|---|---|
| Feature UI state | Zustand (per-feature store) | Isolated, minimal boilerplate |
| Async/server state | React Query | AI provider calls, caching |
| Cross-feature signals | EventBus (EventEmitter3) | Decoupled, typed |
| Persistent settings | MMKV | 30x faster than AsyncStorage |
| Structured data | SQLCipher (op-sqlite) | Encrypted, queryable |

## Background Execution Strategy

Android 10+ aggressively kills background processes. GuardianCircle uses a defence-in-depth approach:

```
Layer 1: ForegroundService (Kotlin) + persistent notification
Layer 2: WakeLock acquisition at SOS trigger
Layer 3: AlarmManager (exact alarms) for escalation timers
Layer 4: User prompted to disable battery optimisation (Doze exemption)
Layer 5: WorkManager FOREGROUND priority for guaranteed execution
```

## Feature Slices (v1.0)

| Slice | Key use cases |
|---|---|
| `sos` | TriggerSOSUseCase, EscalateAlertUseCase, AlertDispatcher |
| `guardian` | AddGuardianUseCase, QR pairing, GuardianNotificationHandler |
| `journey` | StartJourneyUseCase, DeviationCheckUseCase, JourneyNotificationService |
| `checkin` | CompleteCheckInUseCase, MissedCheckInUseCase (recurring) |
| `fall-detection` | FallDetectionUseCase, SensorPipeline, SensitivityConfig |
| `vehicle-crash` | VehicleCrashDetectionUseCase (speed + G-force FSM) |
| `distress` | ConfidenceScoringUseCase, SensorPipeline |
| `geofence` | CreateGeofenceUseCase, UnsafePlaceService (re-entry alerts) |
| `evidence` | EvidenceLogScreen (capture, export, 24h auto-delete) |
| `security` | DuressPinService, DecoyModeScreen |
| `settings` | SensitivityProfilesScreen, AppIconPickerScreen, WipeDataScreen |
| `ai-assistant` | AIProviderFactory, OpenAI / Anthropic / Gemini providers (BYOK) |

## Module Map

See [Module Breakdown](module-breakdown.md) for full dependency graph.

## Data Flow: SOS Trigger

```
User action
  → SOSButton (presentation)
  → TriggerSOSUseCase (application)
  → ISOSRepository, IAlertDispatcher (domain interfaces)
  → SOSRepository, SMSAlertDispatcher (infrastructure)
  → SQLite write + Android SMS API
  → EventBus.emit('sos:triggered')
  → EscalationEngine subscribes → starts timer
```
