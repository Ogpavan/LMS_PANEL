"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { BreadcrumbItem } from "@/types/admin";

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px] font-normal leading-[20px] text-muted-foreground">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={`${item.href}-${item.title}`} className="flex items-center gap-2">
            {isLast ? (
              <span className="font-normal text-foreground">{item.title}</span>
            ) : (
              <Link href={item.href} className="transition-colors hover:text-foreground">
                {item.title}
              </Link>
            )}
            {!isLast ? <ChevronRight className="h-4 w-4" /> : null}
          </div>
        );
      })}
    </div>
  );
}
