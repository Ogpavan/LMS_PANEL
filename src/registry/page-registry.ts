import { adminConfig } from "@/config/admin.config";
import { getRegistrySnapshot } from "@/services/registry-service";

export function getRegisteredPages() {
  return [...getRegistrySnapshot(adminConfig.defaultRole).pages.values()];
}

export function getPageByHref(href: string) {
  return getRegistrySnapshot(adminConfig.defaultRole).pagesByHref.get(href) ?? null;
}
