import type {
  BreadcrumbItem,
  RegistrySnapshot,
  RouteMatch,
  SidebarItemConfig
} from "@/types/admin";

function normalizePath(path: string) {
  if (!path) return "/";
  return path === "/" ? "/" : path.replace(/\/+$/, "");
}

function walkNavigation(
  items: SidebarItemConfig[],
  targetHref: string,
  parents: BreadcrumbItem[] = []
): BreadcrumbItem[] | null {
  for (const item of items) {
    const ownCrumbs = item.href
      ? [...parents, { title: item.title, href: item.href }]
      : [...parents];

    if (item.href && normalizePath(item.href) === targetHref) {
      return ownCrumbs;
    }

    if (item.children?.length) {
      const nested = walkNavigation(item.children, targetHref, ownCrumbs);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

export function resolveRoute(
  snapshot: RegistrySnapshot,
  slug?: string[]
): RouteMatch | null {
  const href = normalizePath(`/${(slug ?? []).join("/") || ""}`);
  const page = snapshot.pagesByHref.get(href);

  if (!page) {
    return null;
  }

  for (const section of snapshot.navigation) {
    const breadcrumbs = walkNavigation(section.items, href);
    if (breadcrumbs) {
      return {
        page,
        breadcrumbs,
        section: section.section
      };
    }
  }

  return {
    page,
    breadcrumbs: [{ title: page.title, href: page.href }]
  };
}
