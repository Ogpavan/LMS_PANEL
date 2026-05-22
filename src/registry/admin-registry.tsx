import { adminModules } from "@/modules";
import { layoutRegistry } from "@/registry/layout-registry";
import { widgetRegistry } from "@/registry/widget-registry";
import type {
  AdminModule,
  PageDefinition,
  RegistrySnapshot,
  SidebarItemConfig,
  SidebarSectionConfig,
  UserRole
} from "@/types/admin";

function mergeNavigation(modules: AdminModule[]) {
  const sections = new Map<string, SidebarSectionConfig>();

  modules.forEach((module) => {
    module.navigation.forEach((section) => {
      const existing = sections.get(section.section);
      if (existing) {
        existing.items.push(...section.items);
      } else {
        sections.set(section.section, {
          section: section.section,
          items: [...section.items]
        });
      }
    });
  });

  return [...sections.values()];
}

function hasCustomInstructorPermissions(role: UserRole, permissions?: string[] | null) {
  return role === "instructor" && Array.isArray(permissions);
}

function canAccessPageKey(
  role: UserRole,
  permissions: Set<string> | null,
  pageKey?: string
) {
  if (!pageKey) {
    return true;
  }

  if (!hasCustomInstructorPermissions(role, permissions ? [...permissions] : null)) {
    return true;
  }

  return permissions?.has(pageKey) ?? false;
}

function filterItemByRole(
  item: SidebarItemConfig,
  role: UserRole,
  permissions: Set<string> | null
): SidebarItemConfig | null {
  const hasCustomPermissions = role === "instructor" && permissions !== null;

  if (item.roles?.length && !item.roles.includes(role) && !(hasCustomPermissions && item.pageKey && permissions.has(item.pageKey))) {
    return null;
  }

  const children = item.children
    ?.map((child) => filterItemByRole(child, role, permissions))
    .filter(Boolean) as SidebarItemConfig[] | undefined;

  if (hasCustomPermissions && item.pageKey && !permissions.has(item.pageKey) && (!children || !children.length)) {
    return null;
  }

  if (!item.href && (!children || !children.length)) {
    return null;
  }

  return {
    ...item,
    children
  };
}

export function createRegistrySnapshot(role: UserRole = "admin", permissions?: string[] | null): RegistrySnapshot {
  const pages = new Map<string, PageDefinition>();
  const pagesByHref = new Map<string, PageDefinition>();
  const widgetDefinitions = [...widgetRegistry];
  const layoutDefinitions = [...layoutRegistry];
  const permissionSet = role === "instructor" && Array.isArray(permissions) ? new Set(permissions) : null;

  adminModules.forEach((module) => {
    if (module.widgets?.length) {
      widgetDefinitions.push(...module.widgets);
    }

    if (module.layouts?.length) {
      layoutDefinitions.push(...module.layouts);
    }

    module.pages.forEach((page) => {
      const hasCustomPermissions = role === "instructor" && permissionSet !== null;

      if (
        page.roles?.length &&
        !page.roles.includes(role) &&
        !(hasCustomPermissions && permissionSet.has(page.key))
      ) {
        return;
      }

      if (hasCustomPermissions && !permissionSet.has(page.key)) {
        return;
      }

      pages.set(page.key, page);
      pagesByHref.set(page.href === "/" ? "/" : page.href.replace(/\/+$/, ""), page);
    });
  });

  const navigation = mergeNavigation(adminModules)
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => filterItemByRole(item, role, permissionSet))
        .filter(Boolean) as SidebarItemConfig[]
    }))
    .filter((section) => section.items.length > 0);

  return {
    modules: adminModules,
    pages,
    pagesByHref,
    widgets: new Map(widgetDefinitions.map((widget) => [widget.key, widget])),
    layouts: new Map(layoutDefinitions.map((layout) => [layout.key, layout])),
    navigation
  };
}
