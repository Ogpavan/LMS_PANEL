"use client";

import { cn } from "@/utils/cn";
import { useLayoutStore } from "@/store/layout-store";

export function ContentContainer({ children }: { children: React.ReactNode }) {
  const density = useLayoutStore((state) => state.density);

  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-[1680px] flex-1 flex-col",
        density === "compact" ? "gap-4 p-4 lg:p-5" : "gap-5 p-4 lg:p-6"
      )}
    >
      {children}
    </main>
  );
}
