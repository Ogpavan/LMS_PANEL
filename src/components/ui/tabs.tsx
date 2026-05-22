"use client";

import * as React from "react";

import { cn } from "@/utils/cn";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = React.useContext(TabsContext);

  if (!context) {
    throw new Error("Tabs components must be used within <Tabs />");
  }

  return context;
}

export const Tabs = React.memo(function Tabs({
  value,
  defaultValue,
  onValueChange,
  className,
  children
}: React.HTMLAttributes<HTMLDivElement> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const currentValue = value ?? internalValue;

  const setValue = React.useCallback(
    (nextValue: string) => {
      if (value === undefined) {
        setInternalValue(nextValue);
      }

      onValueChange?.(nextValue);
    },
    [onValueChange, value]
  );

  return (
    <TabsContext.Provider value={{ value: currentValue, setValue }}>
      <div className={cn("space-y-4", className)}>{children}</div>
    </TabsContext.Provider>
  );
});

export const TabsList = React.memo(function TabsList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-b border-border/80 pb-4",
        className
      )}
      {...props}
    />
  );
});

export const TabsTrigger = React.memo(function TabsTrigger({
  value,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
}) {
  const context = useTabsContext();
  const isActive = context.value === value;

  return (
    <button
      type="button"
      data-state={isActive ? "active" : "inactive"}
      className={cn(
        "inline-flex h-auto items-center justify-start gap-2 rounded-md border border-transparent px-4 py-2.5 text-left text-[14px] font-medium leading-[20px] transition-colors whitespace-nowrap",
        "hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary data-[state=active]:hover:text-white",
        "data-[state=inactive]:text-muted-foreground",
        className
      )}
      onClick={() => context.setValue(value)}
      {...props}
    >
      {children}
    </button>
  );
});

export const TabsContent = React.memo(function TabsContent({
  value,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value: string;
}) {
  const context = useTabsContext();

  if (context.value !== value) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)} {...props}>
      {children}
    </div>
  );
});
