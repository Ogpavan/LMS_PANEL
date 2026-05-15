import { adminConfig } from "@/config/admin.config";
import { getRegistrySnapshot } from "@/services/registry-service";

export function getRegisteredPages() {
  return [...getRegistrySnapshot(adminConfig.currentRole).pages.values()];
}

export function getPageByHref(href: string) {
  return getRegistrySnapshot(adminConfig.currentRole).pagesByHref.get(href) ?? null;
}
