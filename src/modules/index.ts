import type { AdminModule } from "@/types/admin";

import { academyModule } from "@/modules/academy/module";
import { analyticsModule } from "@/modules/analytics/module";
import { crmModule } from "@/modules/crm/module";
import { ecommerceModule } from "@/modules/ecommerce/module";
import { logisticsModule } from "@/modules/logistics/module";

export const adminModules: AdminModule[] = [
  academyModule,
  crmModule,
  analyticsModule,
  ecommerceModule,
  logisticsModule
];
