# Testing Strategy

## Test Pyramid

```
         E2E (Detox)       10% — critical user journeys on real devices
       Integration Tests    20% — use cases with real modules (SQLite, SMS mock)
      Unit Tests             70% — domain + application layers, pure functions
```

## Coverage Targets

| Layer | Target | Tool |
|---|---|---|
| Domain entities + rules | 95% | Jest |
| Application (use cases) | 90% | Jest |
| Infrastructure adapters | 70% | Jest + integration |
| Presentation (screens) | 60% | React Testing Library |
| Native modules (Kotlin) | 80% | JUnit |

## Unit Tests

All use cases are tested with mocked infrastructure adapters.  
Domain logic has zero external dependencies — pure functions, pure Jest.

```
src/features/sos/application/__tests__/
  TriggerSOSUseCase.test.ts
  CancelSOSUseCase.test.ts
  EscalateAlertUseCase.test.ts
  SilentSOSUseCase.test.ts

src/features/distress/application/__tests__/
  DetectDistressUseCase.test.ts
  ConfidenceScoringUseCase.test.ts

src/features/guardian/application/__tests__/
  AddGuardianUseCase.test.ts
  PhonebookPickerUseCase.test.ts
  PairGuardianQRUseCase.test.ts
```

## Integration Tests

Test use cases with real SQLite (in-memory SQLCipher), mocked SMS module.

Key scenarios:
- Full SOS trigger → incident created → alert dispatched → escalation timer set
- Guardian pairing round-trip (QR encode → decode → store → verify)
- Missed check-in → escalation chain executes in correct order
- Duress PIN → decoy state returned → real guardians not visible

## E2E Tests (Detox)

| Test | Priority | Device |
|---|---|---|
| Full SOS: trigger → countdown → SMS dispatch | P0 | Emulator |
| SOS cancellation within window | P0 | Emulator |
| Duress PIN → decoy state + silent background SOS | P0 | Physical |
| Journey: start → deviation → guardian SMS | P0 | Emulator |
| Missed check-in → guardian notification | P1 | Emulator |
| Fall detection → confirmation dialog → SOS | P1 | Physical |
| Guardian add from phonebook | P1 | Physical |
| Push notification received by guardian device | P1 | 2× Physical |
| Offline SOS (airplane mode) | P0 | Physical |

## Device Testing Matrix

| Device | Android | RAM | Priority |
|---|---|---|---|
| Samsung Galaxy A14 | 13 | 4 GB | P0 |
| Redmi Note 12 | 12 | 4 GB | P0 |
| Realme Narzo 50 | 11 | 4 GB | P0 |
| Pixel 6a | 14 | 6 GB | P1 |
| OnePlus Nord CE3 | 13 | 8 GB | P1 |
| Moto G (older) | 10 | 3 GB | P1 |

## Battery Impact Tests

Measure battery consumption over 1 hour for each mode:

| Mode | Max Target | Measurement Method |
|---|---|---|
| App closed, no detection | 0% | Android Battery Historian |
| Background: distress detection on | < 2%/hr | Battery Historian |
| Active journey monitoring | < 3%/hr | Battery Historian |
| Emergency active (GPS + alerts) | < 15%/hr | Battery Historian |
| BLE mesh advertising | < 1%/hr | Battery Historian |

## Accessibility Tests

- TalkBack: navigate entire app by touch exploration only — no trap
- Switch Access: all actions reachable
- Voice Access: all interactive elements have labels
- Large font (200%): no text clipped, no layout breakage
- High contrast: all text passes 4.5:1 contrast ratio
