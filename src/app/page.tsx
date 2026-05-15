import { redirect } from "next/navigation";

import { adminConfig } from "@/config/admin.config";

export default function HomePage() {
  redirect(adminConfig.defaultRoute);
}
