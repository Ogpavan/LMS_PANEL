"use client";

import { useAppSettingsStore } from "@/store/app-settings-store";

export function LogoMark({ collapsed = false }: { collapsed?: boolean }) {
  const general = useAppSettingsStore((state) => state.general);
  const mark = general.lmsName.trim().charAt(0).toUpperCase() || "L";

  return (
    <div className="flex items-center gap-3">
      <div
        className="grid h-9 w-9 place-items-center rounded-lg text-[15px] font-semibold leading-[22px] text-white"
        style={{ backgroundColor: general.primaryColor }}
      >
        {mark}
      </div>
      {!collapsed ? (
        <div>
          <div className="font-heading text-[15px] font-semibold leading-[22px]">
            {general.lmsName}
          </div>
        </div>
      ) : null}
    </div>
  );
}
