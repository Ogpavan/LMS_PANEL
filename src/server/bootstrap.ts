const databaseReady = Promise.resolve();

/**
 * Database schema changes and seed data are applied explicitly with
 * `npm run prisma:setup`. Keeping this compatibility shim lets API handlers
 * await readiness without performing network or schema work per request.
 */
export function ensureDatabaseSetup() {
  return databaseReady;
}
