import { createRegistrySnapshot } from "@/registry/admin-registry";
import type { RegistrySnapshot, UserRole } from "@/types/admin";

const cache = new Map<string, RegistrySnapshot>();

function getCacheKey(role: UserRole, permissions?: string[] | null) {
  const normalizedPermissions =
    role === "instructor" && permissions ? [...permissions].sort().join("|") : "";

  return `${role}::${normalizedPermissions}`;
}

export function getRegistrySnapshot(role: UserRole = "admin", permissions?: string[] | null) {
  const cacheKey = getCacheKey(role, permissions);
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const snapshot = createRegistrySnapshot(role, permissions);
  cache.set(cacheKey, snapshot);
  return snapshot;
}

export function invalidateRegistrySnapshot(role?: UserRole) {
  if (role) {
    cache.delete(role);
    return;
  }

  cache.clear();
}
