# ADR-002: Zustand + React Query over Redux

**Status:** Accepted  
**Date:** 2026-06-11

## Context

Emergency features require isolated, predictable state. A global Redux store creates risk of unrelated state mutations affecting safety-critical flows.

## Decision

Use **Zustand** for per-feature UI state, **React Query** for async/external state (AI provider calls), and a typed **EventBus** for cross-feature signals.

## Consequences

- Each feature slice owns its Zustand store — no shared mutable state
- Emergency SOS state cannot be corrupted by, say, a guardian list update
- Cross-feature communication is explicit and auditable via EventBus
- React Query handles loading/error/retry for AI requests automatically

## Alternatives Considered

| Option | Rejected Reason |
|---|---|
| Redux Toolkit | Global store; excessive boilerplate; coupling risk for emergency features |
| MobX | Observable mutations harder to trace in security audit |
| Context API only | Performance issues with frequent sensor updates |
