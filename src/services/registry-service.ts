import { createRegistrySnapshot } from "@/registry/admin-registry";
import type { RegistrySnapshot, UserRole } from "@/types/admin";

const cache = new Map<string, RegistrySnapshot>();

export function getRegistrySnapshot(role: UserRole = "admin") {
  const cached = cache.get(role);
  if (cached) {
    return cached;
  }

  const snapshot = createRegistrySnapshot(role);
  cache.set(role, snapshot);
  return snapshot;
}

export function invalidateRegistrySnapshot(role?: UserRole) {
  if (role) {
    cache.delete(role);
    return;
  }

  cache.clear();
}
