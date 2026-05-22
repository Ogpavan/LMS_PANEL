"use client";

import * as React from "react";

import { cn } from "@/utils/cn";

export const Card = React.memo(function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md border border-border/80 bg-card text-card-foreground shadow-shell", className)}
      {...props}
    />
  );
});

export const CardHeader = React.memo(function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1 p-5", className)} {...props} />;
});

export const CardTitle = React.memo(function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-[18px] font-medium leading-[28px] text-foreground", className)} {...props} />
  );
});

export const CardContent = React.memo(function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
});
