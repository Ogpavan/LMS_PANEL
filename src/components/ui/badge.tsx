"use client";

import * as React from "react";

import { cn } from "@/utils/cn";

export const Badge = React.memo(function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[13px] font-medium leading-[18px] text-muted-foreground",
        className
      )}
      {...props}
    />
  );
});
