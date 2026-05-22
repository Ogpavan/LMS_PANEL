import type { LucideIcon } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

export type UserRole = "admin" | "instructor" | "student";

export type IconName = keyof typeof import("lucide-react");

export type WidgetSize =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "full";

export interface WidgetInstanceConfig {
  id: string;
  widgetKey: string;
  title?: string;
  description?: string;
  size?: WidgetSize;
  props?: Record<string, unknown>;
}

export interface PageDefinition {
  key: string;
  title: string;
  href: string;
  moduleKey: string;
  icon?: IconName;
  badge?: string;
  description?: string;
  roles?: UserRole[];
  breadcrumbLabel?: string;
  layoutKey: string;
  widgets?: WidgetInstanceConfig[];
  meta?: Record<string, unknown>;
}

export interface SidebarItemConfig {
  title: string;
  href?: string;
  icon?: IconName;
  badge?: string;
  roles?: UserRole[];
  pageKey?: string;
  children?: SidebarItemConfig[];
}

export interface SidebarSectionConfig {
  section: string;
  items: SidebarItemConfig[];
}

export interface LayoutRendererProps {
  page: PageDefinition;
  widgets: WidgetInstanceConfig[];
}

export interface WidgetRendererProps {
  config: WidgetInstanceConfig;
  page: PageDefinition;
}

export interface BreadcrumbItem {
  title: string;
  href: string;
}

export interface RouteMatch {
  page: PageDefinition;
  breadcrumbs: BreadcrumbItem[];
  section?: string;
}

export interface AdminModule {
  key: string;
  title: string;
  pages: PageDefinition[];
  navigation: SidebarSectionConfig[];
  widgets?: WidgetDefinition[];
  layouts?: LayoutDefinition[];
}

export type LayoutComponent = ComponentType<LayoutRendererProps>;
export type WidgetComponent = ComponentType<WidgetRendererProps>;
export type PageFallbackComponent = ComponentType<{ page: PageDefinition }>;

export interface WidgetDefinition {
  key: string;
  component: WidgetComponent;
}

export interface LayoutDefinition {
  key: string;
  component: LayoutComponent;
}

export interface RegistrySnapshot {
  modules: AdminModule[];
  pages: Map<string, PageDefinition>;
  pagesByHref: Map<string, PageDefinition>;
  widgets: Map<string, WidgetDefinition>;
  layouts: Map<string, LayoutDefinition>;
  navigation: SidebarSectionConfig[];
}

export interface QuickAction {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  href?: string;
}

export interface ShellContextValue {
  page: PageDefinition;
  breadcrumbs: BreadcrumbItem[];
  section?: string;
  children: ReactNode;
}
