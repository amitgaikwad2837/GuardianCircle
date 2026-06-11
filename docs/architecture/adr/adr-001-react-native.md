# ADR-001: React Native over Kotlin Native

**Status:** Accepted  
**Date:** 2026-06-11  
**Deciders:** Principal Architect, Staff Mobile Engineer

## Context

The product targets Android only at launch but has a stated future goal of iOS support. The team has TypeScript expertise. A decision is needed on the primary development platform.

## Decision

Use **React Native 0.75+ with TypeScript** as the primary development framework.

## Consequences

### Accepted trade-offs
- React Native Headless JS for background tasks is less powerful than Kotlin WorkManager — mitigated by native Kotlin services for critical background work
- Bridge overhead (~5ms) for sensor data — mitigated by dedicated native Turbo Modules for fall/distress detection
- Larger APK size than pure native (~15MB base overhead)

### Benefits
- ~40% code reuse if iOS port is undertaken
- TypeScript provides strong typing for security-critical domain logic
- Faster iteration on UI with hot reload
- Rich ecosystem for navigation, state management, and testing

### Native modules required (Kotlin)
- `SmsModule` — silent SMS dispatch
- `CryptoModule` — Android Keystore integration
- `SensorModule` — high-frequency accelerometer/gyroscope
- `ContactPickerModule` — system contact picker
- `BackgroundTaskModule` — ForegroundService management
- `BluetoothMeshModule` — BLE advertising and scanning
- `WidgetModule` — home screen widget

## Alternatives Considered

| Option | Rejected Reason |
|---|---|
| Kotlin Native | No iOS path; longer development time; smaller talent pool |
| Flutter/Dart | Less mature security library ecosystem; no Android Keystore Dart bindings |
| Capacitor/Ionic | Web-based; unacceptable for sensor-intensive features |
