# Feature: SOS System

## Overview
The SOS system is the primary safety feature. It must trigger within 2 seconds of activation, work offline, and be accessible in a single gesture.

## Trigger Methods

| Method | Gesture | Cancellation | Silent Option |
|---|---|---|---|
| Long press | Hold SOS button 1.5s | Yes | Yes |
| Quick tap | Tap → confirmation → countdown | Yes | Yes |
| Shake | 3× in 2s (configurable threshold) | Yes | Yes |
| Volume buttons | Hold both 3s | Yes | Yes |
| Widget | Tap widget → countdown | Yes | Yes |
| Lock screen | Lock screen action | Yes | Yes |

## Cancellation Window
- Default: 10 seconds
- Range: 5–30 seconds (user-configurable)
- Displayed as countdown with large cancel button
- Haptic pulse every second during countdown

## Escalation Levels

| Level | Trigger | Action |
|---|---|---|
| 0 | t=0 | SMS to all guardians with location |
| 1 | t+5 min (no ack) | Call Priority-1 guardian |
| 2 | t+10 min (no ack) | Call Priority-2, SMS update |
| 3 | t+15 min (user-configured) | Continuous location SMS every N min |

All timings configurable. Escalation stops when any guardian acknowledges.

## Silent SOS
- No visual feedback on device (screen remains unchanged)
- No sound, no vibration
- SMS dispatched in background
- Incident logged locally
- Activated via: swipe left on SOS button, hidden gesture, or duress PIN

## SMS Template
```
EMERGENCY ALERT: {name} may be in danger.

Location: https://maps.google.com/?q={lat},{lng}
Time: {datetime}
Reply SAFE to acknowledge.

Sent via GuardianCircle
```

## Acknowledgment Parsing
Incoming SMS parsed for: "SAFE", "OK", "IM OK", "I'M SAFE", "GOT IT"
Levenshtein distance ≤ 2 for fuzzy matching.

## State Machine
```
IDLE → COUNTDOWN → ACTIVE → RESOLVED
  ↑         ↓
  └─ CANCELLED
```

## Domain Files
- `src/features/sos/domain/entities/SOSEvent.ts`
- `src/features/sos/domain/entities/EscalationLevel.ts`
- `src/features/sos/application/TriggerSOSUseCase.ts`
- `src/features/sos/application/EscalateAlertUseCase.ts`
