"use client";

import Link from "next/link";

import { adminConfig } from "@/config/admin.config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NotFoundPage() {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Page not registered</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-[13px] font-normal leading-[20px] text-muted-foreground">
        <p>
          This route does not exist in the current admin configuration. Add a new page
          definition to a module and it will be picked up automatically by the shell.
        </p>
        <Link href={adminConfig.defaultRoute}>
          <Button>Go to default dashboard</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
