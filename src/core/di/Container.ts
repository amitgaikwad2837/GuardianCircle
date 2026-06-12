/**
 * Lightweight dependency injection container (service locator pattern).
 *
 * Why not a full DI framework?
 * React Native's fast-refresh and module loading make constructor injection
 * frameworks (InversifyJS, tsyringe) add meaningful startup overhead and
 * complexity. A typed service locator achieves the same testability goals
 * with zero runtime cost.
 *
 * Usage:
 *   // Register (once, at app startup):
 *   Container.register('IGuardianRepository', new SQLiteGuardianRepository());
 *
 *   // Resolve (in use cases, services):
 *   const repo = Container.resolve<IGuardianRepository>('IGuardianRepository');
 */

type Token = string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry = new Map<Token, any>();

function register<T>(token: Token, instance: T): void {
  if (registry.has(token)) {
    throw new Error(
      `Container: token "${token}" is already registered. ` +
      'Call unregister() first or use registerOrReplace() for tests.',
    );
  }
  registry.set(token, instance);
}

/** Replaces an existing registration — intended for test setup only. */
function registerOrReplace<T>(token: Token, instance: T): void {
  registry.set(token, instance);
}

function resolve<T>(token: Token): T {
  const instance = registry.get(token) as T | undefined;
  if (instance === undefined) {
    throw new Error(
      `Container: no registration found for token "${token}". ` +
      'Ensure all dependencies are registered before App renders.',
    );
  }
  return instance;
}

function unregister(token: Token): void {
  registry.delete(token);
}

/** Clears all registrations — use only in test teardown. */
function reset(): void {
  registry.clear();
}

function isRegistered(token: Token): boolean {
  return registry.has(token);
}

export const Container = {
  register,
  registerOrReplace,
  resolve,
  unregister,
  reset,
  isRegistered,
};

/**
 * Typed token constants — prevents magic string typos at call sites.
 * Extend this as new services are registered.
 */
export const DI_TOKENS = {
  // Repositories
  IGuardianRepository:   'IGuardianRepository',
  ISOSRepository:        'ISOSRepository',
  IJourneyRepository:    'IJourneyRepository',
  ICheckInRepository:    'ICheckInRepository',
  IGeofenceRepository:   'IGeofenceRepository',
  IEvidenceRepository:   'IEvidenceRepository',
  IDistressRepository:   'IDistressRepository',

  // Services / Dispatchers
  IAlertDispatcher:      'IAlertDispatcher',
  ILocationService:      'ILocationService',
  ISmsService:           'ISmsService',
  IAIProviderFactory:    'IAIProviderFactory',
} as const;

export type DIToken = (typeof DI_TOKENS)[keyof typeof DI_TOKENS];
