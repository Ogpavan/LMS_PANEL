"use client";

import { motion } from "framer-motion";

import type { PageDefinition } from "@/types/admin";

import { Breadcrumbs } from "@/components/navigation/breadcrumbs";

export function PageHeader({
  page,
  breadcrumbs
}: {
  page: PageDefinition;
  breadcrumbs: { title: string; href: string }[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="space-y-2"
    >
      <Breadcrumbs items={breadcrumbs} />
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold leading-[42px]">
            {page.title}
          </h1>
          {page.description ? (
            <p className="mt-1.5 max-w-2xl text-[13px] font-normal leading-[20px] text-muted-foreground">
              {page.description}
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
