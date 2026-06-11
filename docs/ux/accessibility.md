# Accessibility Guidelines

## Standards

- WCAG 2.1 Level AA minimum
- Android Accessibility Guidelines
- Material Design Accessibility

## Requirements by Category

### Touch Targets
- Minimum: 48×48 dp for all interactive elements
- SOS button: 120 dp diameter (emergency use, gloved hands)
- Confirm/Cancel dialogs: minimum 72 dp buttons

### Colour Contrast
- Body text: 4.5:1 against background
- Large text (18sp+): 3:1 against background
- UI components and graphics: 3:1
- Status must never be conveyed by colour alone — always use icon + colour

### Screen Reader (TalkBack)
- All interactive elements: `accessibilityLabel` (what it is) + `accessibilityHint` (what it does)
- Images: `accessibilityLabel` or `accessibilityRole="image"` with label
- Status updates: `accessibilityLiveRegion="polite"` (non-urgent) or `"assertive"` (SOS countdown)
- No keyboard traps — all modals dismissable by back gesture
- Reading order matches visual order

### SOS Button Specific
```
accessibilityLabel="SOS Emergency Button"
accessibilityHint="Hold for 2 seconds to send emergency alert to your guardians"
accessibilityRole="button"
```

### Text Scaling
- Support up to 200% font scale
- Use `sp` units for all text
- Layouts must not clip or overlap at 200%
- Test with: Settings → Accessibility → Font size → Largest

### Reduce Motion
- Respect `AccessibilityInfo.isReduceMotionEnabled()`
- Replace animations with instant transitions when enabled
- SOS pulsing animation: replace with static indicator

### Voice Navigation (Voice Access)
- All interactive elements must have unique, speakable labels
- Do not rely on position-based labels ("top button", "left icon")

### Switch Access
- All actions must be reachable via linear navigation
- No actions only accessible via swipe or drag

### High Contrast
- Support Android High Contrast Text setting
- Test all screens in high contrast mode
- Ensure SOS button remains clearly visible

## Component Checklist

| Component | TalkBack | Touch Target | Contrast | Scaling |
|---|---|---|---|---|
| SOSButton | ✓ label + hint | 120 dp | 4.5:1 | Proportional |
| GuardianCard | ✓ | 48 dp min | 4.5:1 | Wraps |
| NavigationTabs | ✓ role=tab | 48 dp | 3:1 | Fixed height |
| ConfirmDialog | ✓ | 72 dp | 4.5:1 | Wraps |
| StatusBadge | ✓ (not colour-only) | N/A | 3:1 | Scales |
| CheckInCard | ✓ | 48 dp | 4.5:1 | Wraps |
| PhoneNumberPicker | ✓ | 48 dp | 4.5:1 | Wraps |

## Elderly User Considerations

- Default font scale: 1.2× (above Android system default)
- Onboarding: max 4 steps, simple language, no jargon
- Avoid abbreviations in primary UI (not "BLE mesh" — use "Nearby alert sharing")
- Tutorial screens with optional voice walkthrough
- Settings grouped by task, not by technology
