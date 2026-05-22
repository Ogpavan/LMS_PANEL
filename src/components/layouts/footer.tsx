"use client";

import { useAppSettingsStore } from "@/store/app-settings-store";

export function Footer() {
  const general = useAppSettingsStore((state) => state.general);

  return (
    <footer className="mt-auto border-t border-border/70 px-4 py-4 text-center text-[13px] font-normal leading-[20px] text-muted-foreground lg:px-6">
      {general.lmsName} · {general.supportEmail} · {general.supportContact}
    </footer>
  );
}
