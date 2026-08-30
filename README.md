# Nebula Admin Framework

Config-driven admin shell built with Next.js App Router, TypeScript, Tailwind CSS, Zustand, Framer Motion, Lucide React, and shadcn-style primitives.

## Database Setup

Apply the Prisma schema and seed required defaults once when provisioning a database:

```bash
npm run prisma:setup
```

Normal API requests never run schema creation or seed queries. Create migrations
with `npm run prisma:migrate:dev` and apply committed migrations in deployments
with `npm run prisma:migrate:deploy`.

Production seeding does not create demo accounts. Set `INITIAL_ADMIN_EMAIL`,
`INITIAL_ADMIN_PASSWORD`, and optionally `INITIAL_ADMIN_NAME` when provisioning
the first administrator.

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
