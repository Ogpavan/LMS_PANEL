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

function filterItemByRole(item: SidebarItemConfig, role: UserRole): SidebarItemConfig | null {
  if (item.roles?.length && !item.roles.includes(role)) {
    return null;
  }

  const children = item.children
    ?.map((child) => filterItemByRole(child, role))
    .filter(Boolean) as SidebarItemConfig[] | undefined;

  if (!item.href && (!children || !children.length)) {
    return null;
  }

  return {
    ...item,
    children
  };
}

export function createRegistrySnapshot(role: UserRole = "admin"): RegistrySnapshot {
  const pages = new Map<string, PageDefinition>();
  const pagesByHref = new Map<string, PageDefinition>();
  const widgetDefinitions = [...widgetRegistry];
  const layoutDefinitions = [...layoutRegistry];

  adminModules.forEach((module) => {
    if (module.widgets?.length) {
      widgetDefinitions.push(...module.widgets);
    }

    if (module.layouts?.length) {
      layoutDefinitions.push(...module.layouts);
    }

    module.pages.forEach((page) => {
      if (page.roles?.length && !page.roles.includes(role)) {
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
        .map((item) => filterItemByRole(item, role))
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
