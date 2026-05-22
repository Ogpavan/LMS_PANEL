"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-[15px] font-medium leading-[22px] transition-[transform,box-shadow,background-color,color,border-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_2px_0_rgba(0,0,0,0.12),0_6px_14px_rgba(115,103,240,0.18)] hover:bg-primary/90 active:shadow-[0_1px_0_rgba(0,0,0,0.12),0_2px_6px_rgba(115,103,240,0.16)]",
        ghost:
          "bg-transparent text-foreground hover:bg-muted hover:text-foreground active:bg-muted/90 active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]",
        soft:
          "bg-secondary text-secondary-foreground shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:bg-secondary/80 active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]",
        outline:
          "border border-border bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:bg-muted active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] dark:bg-white/5"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.memo(
  React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { className, variant, size, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  })
);
