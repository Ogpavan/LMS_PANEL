"use client";

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-52 animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-72 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-[28rem] max-w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-6 xl:grid-cols-12">
        <div className="col-span-full h-44 animate-pulse rounded-xl bg-muted" />
        <div className="md:col-span-3 xl:col-span-3 h-36 animate-pulse rounded-xl bg-muted" />
        <div className="md:col-span-3 xl:col-span-3 h-36 animate-pulse rounded-xl bg-muted" />
        <div className="md:col-span-3 xl:col-span-3 h-36 animate-pulse rounded-xl bg-muted" />
        <div className="md:col-span-6 xl:col-span-8 h-72 animate-pulse rounded-xl bg-muted" />
        <div className="md:col-span-6 xl:col-span-4 h-72 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
