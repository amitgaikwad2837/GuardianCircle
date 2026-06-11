# ADR-004: Local-Only Crash Reporting

**Status:** Accepted  
**Date:** 2026-06-11

## Context

Standard crash reporters (Crashlytics, Sentry) capture stack traces that may contain file paths, user IDs, or location data. Given the domestic violence threat model, automatic transmission of any data off-device is unacceptable.

## Decision

Implement a **local-only crash log** system:

1. Global `ErrorBoundary` captures JS crashes
2. Native `UncaughtExceptionHandler` captures native crashes
3. Logs written to encrypted local file (SQLCipher)
4. Log entries sanitised: no PII, no file paths containing user data
5. User can **optionally** export sanitised log via email (user-initiated, never automatic)
6. Logs auto-purge after 30 days

## Log Format (sanitised)

```json
{
  "timestamp": 1718000000000,
  "appVersion": "1.0.0",
  "androidVersion": 13,
  "errorType": "TypeError",
  "errorMessage": "Cannot read property 'id' of undefined",
  "stackHash": "sha256:abc123...",
  "feature": "sos",
  "memoryMB": 245
}
```

Note: no user ID, no guardian data, no location in logs.

## Alternatives Considered

| Option | Rejected Reason |
|---|---|
| Firebase Crashlytics | Automatic data transmission; PII risk in stack traces |
| Sentry (cloud) | Same concern; also requires account |
| Sentry (self-hosted) | Requires GuardianCircle infrastructure — rejected by architecture |
