import type { UserRole } from "@/types/admin";

export const adminConfig = {
  appName: "Nebula Admin Framework",
  appDescription: "Config-driven shell for unlimited admin surfaces",
  defaultRoute: "/dashboard/crm",
  primaryColor: "256 90% 63%",
  currentRole: "admin" as UserRole
};
