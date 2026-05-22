import type { UserRole } from "@/types/admin";

export const adminConfig = {
  appName: "Nebula Admin Framework",
  appDescription: "Config-driven shell for unlimited admin surfaces",
  defaultRoute: "/dashboard/academy",
  primaryColor: "256 90% 63%",
  defaultRole: "student" as UserRole
};
