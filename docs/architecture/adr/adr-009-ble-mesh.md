---
status: accepted
date: 2026-06-13
---

# ADR-009 — Offline BLE SOS Mesh

## Context

GuardianCircle's primary alert channel (FCM push + SMS fallback) requires internet or cellular connectivity. In scenarios where the user has no signal — remote areas, underground spaces, buildings with poor reception — no alert reaches guardians. This is the most critical gap in the safety model.

BLE (Bluetooth Low Energy) advertising is available without network access, has a range of ~10–30 m, and does not reveal the device's identity or network address to third parties.

## Decision

Implement an offline SOS mesh using BLE advertising and scanning:

1. **When SOS is active and device is offline**, `BleMeshOrchestrator` instructs `BluetoothMeshModule` to start advertising a 28-byte beacon at 250 ms intervals.
2. **Beacon structure** (28 bytes):
   - 4 bytes: protocol magic (`0x47 0x43 0x4D 0x01`)
   - 12 bytes: rotating pseudonymous ID (changes every 15 minutes via HKDF; not linkable to user identity)
   - 4 bytes: UNIX timestamp (seconds)
   - 4 bytes: hop count + TTL
   - 4 bytes: CRC32
3. **Nearby enrolled devices** (devices whose users have opted in to BLE relay) scan for the magic prefix. On match they re-advertise the beacon with hop count incremented, extending coverage.
4. **Relay enrollment** is opt-in, surfaced via an `@notifee/react-native` notification shown once during onboarding and accessible from Settings.
5. **No location information** is embedded in the beacon. Guardians can only learn that an SOS was triggered, not where.

## Consequences

**Good:**
- SOS alerts propagate without internet or cellular, purely over BLE
- Rotating IDs prevent passive tracking — the beacon cannot be linked to a specific person across 15-minute windows
- No third-party infrastructure: GuardianCircle operates no relay servers
- Complements existing FCM/SMS channels; both run in parallel when online

**Bad / trade-offs:**
- Effective only if other GuardianCircle users are nearby — coverage depends on adoption density
- BLE advertising increases battery drain while SOS is active (mitigated by 250 ms interval and stopping as soon as connectivity is restored)
- Android 12+ requires `BLUETOOTH_ADVERTISE` and `BLUETOOTH_SCAN` permissions; must handle denial gracefully
- 28-byte payload is tight; future extensions (e.g. priority level) require a protocol version bump

## Alternatives considered

- **Wi-Fi Direct**: higher bandwidth but requires device discovery negotiation — too slow for emergency use
- **Apple Nearby Interaction / Google Nearby**: closed ecosystems, require separate SDKs, not available cross-platform without accounts
- **LoRa/other RF**: requires hardware not present on standard phones

## Related

- [ADR-006](adr-006-fcm-relay.md) — FCM relay (primary alert channel, requires internet)
- [ADR-007](adr-007-no-analytics.md) — No analytics (BLE scan data must not be logged)
- `src/features/ble-mesh/` — feature implementation
- `android/app/src/main/java/com/guardiancircle/modules/BluetoothMeshModule.kt`
