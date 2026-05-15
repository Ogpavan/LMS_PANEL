# Nebula Admin Framework

Config-driven admin shell built with Next.js App Router, TypeScript, Tailwind CSS, Zustand, Framer Motion, Lucide React, and shadcn-style primitives.

## What It Solves

- Sidebar navigation is generated from module config.
- Routes resolve from page manifests, not hand-authored page files.
- Layouts and widgets render through registries.
- Theme, sidebar, and layout preferences persist in Zustand.
- New modules scale by configuration rather than shell edits.

## Core Flow

1. Add a module manifest in `src/modules/<module>/manifest.json`.
2. Register its `navigation` items and `pages` in JSON.
3. Optionally expose module-local `widgets` and `layouts` through `module.ts`.
4. Export the module from `src/modules/index.ts`.
5. The shell automatically exposes sidebar items, routes, breadcrumbs, layouts, and page rendering.

## Key Runtime Pieces

- `src/services/registry-service.ts`: cached registry snapshot access.
- `src/registry/admin-registry.tsx`: merges modules, pages, widgets, layouts, and navigation.
- `src/app/(admin)/[...slug]/page.tsx`: single catch-all admin route.
- `src/components/layouts/app-shell.tsx`: client-first shell container.
- `src/components/layouts/page-renderer.tsx`: layout resolver.
- `src/components/widgets/widget-renderer.tsx`: widget resolver.

## Example: Add A New Page

Add this inside any module's `pages` array:

```ts
{
  key: "hrms.overview",
  title: "HRMS",
  href: "/dashboard/hrms",
  moduleKey: "hrms",
  icon: "BriefcaseBusiness",
  layoutKey: "overview",
  widgets: [
    {
      id: "hrms-hero",
      widgetKey: "hero",
      title: "HRMS workspace",
      size: "full"
    }
  ]
}
```

Then add the corresponding sidebar item in the same module's `navigation` config. No new route file is needed.
