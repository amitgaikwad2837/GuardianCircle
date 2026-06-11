# ADR-007: No Analytics SDK

**Status:** Accepted  
**Date:** 2026-06-11

## Decision

GuardianCircle will not include any analytics SDK (Google Analytics, Firebase Analytics, Mixpanel, Amplitude, or equivalent).

## Rationale

1. **Domestic violence threat model**: An abuser with access to a shared Google account or family dashboard could confirm the app is installed and track usage patterns.
2. **Data Safety form integrity**: The Play Store Data Safety section declares no data is collected. Any analytics SDK violates this declaration.
3. **DPDP Act 2023 compliance**: India's Digital Personal Data Protection Act requires explicit consent for behavioural data collection. Silent analytics on a safety app for vulnerable populations creates compliance risk.
4. **Core product promise**: "Your data never leaves your device" is a first-class marketing claim. Analytics breaks it on day one.

## Alternative Metrics

| Need | Privacy-Safe Method |
|---|---|
| Crash rates | Local crash log + user-initiated export (ADR-004) |
| Install/retention | Play Store Console aggregate stats (no PII, no SDK) |
| Feature adoption | Play Store Console cohort analysis |
| User feedback | In-app feedback form → email (user-initiated) |

## Revisit Conditions

This decision may be revisited if a privacy-preserving, on-device-only analytics approach (e.g., differential privacy aggregation with explicit opt-in) is evaluated and approved by a privacy review.
