# Onboarding Flow

## Design Principles
- Maximum 4 screens before user reaches safety-functional state
- No account creation at any step
- Every permission explained with plain-language rationale
- Skip options on all optional steps
- Completable in under 2 minutes

## Screen 1 — Welcome

**Purpose:** Establish trust. Explain the no-account, no-server approach.

**Components:**
- GuardianCircle logo
- Headline: "Your safety, your control."
- 3 trust bullets:
  - "Works without internet"
  - "No account required"
  - "Your data never leaves your phone"
- Primary CTA: "Get Started"
- Secondary: "How does this work?" (expands explainer)

**Accessibility:** Hero text ≥ 24sp. CTA button 72 dp height.

---

## Screen 2 — Permissions

**Purpose:** Request all permissions with honest plain-language rationale. Group by importance.

**Required (safety-critical):**
- SMS — "To send emergency alerts to your guardians"
- Phone — "To call your guardians if they don't respond"
- Location — "To share your location during an emergency"

**Optional (enhanced features):**
- Background location — "For journey monitoring when the app is in the background"
- Notifications — "For check-in reminders and guardian alerts"
- Contacts — "To add guardians from your phone contacts"
- Microphone — "To record audio evidence (you control when this happens)"

**Components:**
- Permission list with icons, plain labels, one-line rationale
- Toggle for each optional permission
- "Grant Permissions" button (requests all enabled)
- Note: "You can change these any time in Settings"

**Accessibility:** Each permission item is a single accessible row with label + description.

---

## Screen 3 — Your Profile

**Purpose:** Set display name (shown to guardians in alerts). Optional PIN setup.

**Components:**
- Text field: "What should your guardians call you?" (optional, 50 char max)
- PIN section (optional):
  - "Protect the app with a PIN"
  - PIN entry + confirm (6 digits)
  - "Why set a PIN?" expandable explanation
- Duress PIN section (shown only if PIN is set):
  - "Set a different PIN that shows a safer version of the app"
  - "Learn more" links to DV safety explanation

**Empty state:** Name field placeholder: "e.g. Priya" (culturally relevant for India launch)

**Skip:** "I'll do this later" — proceeds to guardian step with anonymous profile.

---

## Screen 4 — Add Your First Guardian

**Purpose:** App is not functional for its core purpose without at least one guardian. Make this easy.

**Components:**
- Headline: "Who should we contact in an emergency?"
- Subtext: "Your guardian receives a message if you trigger an alert."
- Three add methods (large cards):
  - "Choose from contacts" → phonebook picker
  - "Enter a phone number" → manual entry
  - "Scan their QR code" → QR scanner
- Skip: "I'll add a guardian later" (shows warning: "Without a guardian, SOS will only be logged locally")

**Post-addition:** Show guardian card with "Test alert" option (sends a non-emergency test SMS).

---

## Completion

After onboarding: navigate to Home screen.

Show one-time tip overlay:
- "Hold the red button for 2 seconds to send an emergency alert"
- Dismiss: "Got it"

MMKV key `onboarding_complete` set to `true`. Onboarding never shown again.
