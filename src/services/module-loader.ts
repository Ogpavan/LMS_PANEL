import { adminModules } from "@/modules";
import type { AdminModule } from "@/types/admin";

export function loadAdminModules(): AdminModule[] {
  return adminModules;
}

export function loadModule(moduleKey: string) {
  return adminModules.find((module) => module.key === moduleKey) ?? null;
}
