"use client";

import * as React from "react";

import { cn } from "@/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.memo(
  React.forwardRef<HTMLInputElement, InputProps>(function Input(
    { className, type = "text", ...props },
    ref
  ) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-white px-3 py-2 text-[15px] font-normal leading-[22px] text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring dark:bg-white/5",
          className
        )}
        {...props}
      />
    );
  })
);
