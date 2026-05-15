"use client";

export function LogoMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-[15px] font-semibold leading-[22px] text-white">
        A
      </div>
      {!collapsed ? (
        <div>
          <div className="text-[15px] font-semibold leading-[22px]">Admin Shell</div>
        </div>
      ) : null}
    </div>
  );
}
