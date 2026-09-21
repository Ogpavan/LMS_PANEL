"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Search,
  Bell,
  MoonStar,
  SunMedium,
  Menu,
  User,
  Settings,
  LogOut,
  FileText,
  BadgeDollarSign,
  CircleHelp
} from "lucide-react";

import type { PageDefinition } from "@/types/admin";

import { adminConfig } from "@/config/admin.config";
import { useAuthStore } from "@/store/auth-store";
import { useSidebarStore } from "@/store/sidebar-store";
import { useThemeStore } from "@/store/theme-store";
import { Input } from "@/components/ui/input";
import { Popup } from "@/components/ui/popup";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

const NAV_SEARCH_ITEMS = [
  { title: "Quizzes", description: "Manage LMS quizzes, questions, options & Google Forms sync", href: "/dashboard/academy/assessments/quizzes", category: "Assessments" },
  { title: "Assignments", description: "Create and track student assignments and marks", href: "/dashboard/academy/assessments/assignments", category: "Assessments" },
  { title: "Browse Courses Catalog", description: "Browse active academy courses catalog", href: "/dashboard/academy/courses/browse", category: "Courses" },
  { title: "Course Directory", description: "Manage all courses, sections, lessons, and pricing", href: "/dashboard/academy/courses/directory", category: "Courses" },
  { title: "Course Categories", description: "Manage course categories and taxonomy", href: "/dashboard/academy/courses/categories", category: "Courses" },
  { title: "Instructors Directory", description: "Manage instructors, profiles, and courses assigned", href: "/dashboard/academy/instructors/directory", category: "People" },
  { title: "Students Directory", description: "Manage students, enrollments, and status", href: "/dashboard/academy/students/directory", category: "People" },
  { title: "Live Classes", description: "View and manage active live classes", href: "/dashboard/academy/live-classes/all", category: "Live Classes" },
  { title: "Schedule Live Class", description: "Schedule new live class sessions", href: "/dashboard/academy/live-classes/schedule", category: "Live Classes" },
  { title: "Certificates", description: "Manage certificate templates and issuance queue", href: "/dashboard/academy/certificates", category: "Certificates" },
  { title: "Support Tickets", description: "View and resolve student support tickets", href: "/dashboard/academy/support/tickets", category: "Support" },
  { title: "Support Enquiries", description: "Manage incoming student enquiries", href: "/dashboard/academy/support/enquiries", category: "Support" },
  { title: "Support Feedback", description: "Review student feedback and ratings", href: "/dashboard/academy/support/feedback", category: "Support" },
  { title: "Student Reports", description: "View student progress and performance reports", href: "/dashboard/academy/reports/students", category: "Analytics" },
  { title: "Course Reports", description: "Analyze course enrollment and completion metrics", href: "/dashboard/academy/reports/courses", category: "Analytics" },
  { title: "Revenue Reports", description: "View financial reports and revenue breakdown", href: "/dashboard/academy/reports/revenue", category: "Analytics" },
  { title: "Attendance", description: "Track class and session attendance", href: "/dashboard/academy/attendance", category: "Operations" },
  { title: "Profile & Settings", description: "Manage user account settings and profile", href: "/dashboard/academy/profile", category: "Account" }
];

export function Navbar({ page }: { page: PageDefinition }) {
  const router = useRouter();
  const setMobileOpen = useSidebarStore((state) => state.setMobileOpen);
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const { mode, toggleMode } = useThemeStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const filteredNavItems = NAV_SEARCH_ITEMS.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border/70 bg-white px-4 py-3 lg:px-6 dark:bg-card",
        isCollapsed ? "lg:left-[84px]" : "lg:left-[260px]"
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1680px] items-center gap-3"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="lg:hidden"
        >
          <Menu className="h-[18px] w-[18px]" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium leading-[22px] text-foreground">
            {page.title}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="hidden items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-[14px] font-normal text-muted-foreground hover:border-primary/50 transition-colors md:flex cursor-pointer"
        >
          <Search className="h-4 w-4" />
          <span>Search modules, pages, widgets</span>
          <kbd className="ml-2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            Ctrl K
          </kbd>
        </button>
        <Button variant="ghost" size="icon" onClick={toggleMode}>
          {mode === "dark" ? (
            <SunMedium className="h-[18px] w-[18px]" />
          ) : (
            <MoonStar className="h-[18px] w-[18px]" />
          )}
        </Button>
        <Button variant="ghost" size="icon">
          <Bell className="h-[18px] w-[18px]" />
        </Button>
        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen((value) => !value)}
            className="grid h-10 w-10 place-items-center rounded-full border border-border/70 bg-card text-left shadow-sm transition-colors hover:bg-muted/60"
            aria-label="Open profile menu"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/12 text-[14px] font-semibold text-primary">
              {getInitials(user?.name ?? "Admin User")}
            </div>
          </button>

          {isProfileOpen ? (
            <div className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-[286px] rounded-2xl border border-border/70 bg-card p-0 shadow-[0_18px_42px_rgba(75,70,92,0.16)]">
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="relative">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/12 text-[15px] font-semibold text-primary ring-2 ring-primary/20">
                    {getInitials(user?.name ?? "Admin User")}
                  </div>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold leading-[22px] text-foreground">
                    {user?.name ?? "User"}
                  </div>
                  <div className="truncate text-[13px] leading-[20px] text-muted-foreground">
                    {formatRoleLabel(user?.role ?? adminConfig.defaultRole)}
                  </div>
                </div>
              </div>

              <div className="h-px bg-border/80" />

              <div className="space-y-1 p-2">
                <Link
                  href="/dashboard/academy/profile"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-[15px] font-medium leading-[22px] text-foreground transition-colors hover:bg-muted/70"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Profile</span>
                </Link>
                <Link
                  href="/dashboard/academy/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-[15px] font-medium leading-[22px] text-foreground transition-colors hover:bg-muted/70"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Settings</span>
                </Link>
                <Link
                  href="/dashboard/academy/billing"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-[15px] font-medium leading-[22px] text-foreground transition-colors hover:bg-muted/70"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">Billing Plan</span>
                  <span className="inline-flex min-w-6 items-center justify-center rounded-md bg-[hsl(0_100%_64%)] px-1.5 py-0.5 text-[12px] font-semibold leading-none text-white">
                    4
                  </span>
                </Link>
              </div>

              <div className="h-px bg-border/80" />

              <div className="space-y-1 p-2">
                <Link
                  href="/dashboard/academy/pricing"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-[15px] font-medium leading-[22px] text-foreground transition-colors hover:bg-muted/70"
                >
                  <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>Pricing</span>
                </Link>
                <Link
                  href="/dashboard/academy/faq"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-[15px] font-medium leading-[22px] text-foreground transition-colors hover:bg-muted/70"
                >
                  <CircleHelp className="h-4 w-4 text-muted-foreground" />
                  <span>FAQ</span>
                </Link>
              </div>

              <div className="h-px bg-border/80" />

              <div className="p-3">
                <button
                  type="button"
                  onClick={async () => {
                    setIsProfileOpen(false);
                    try {
                      await fetch("/api/v1/auth/logout", { method: "POST" });
                    } catch {
                      // Clear local UI state even when the server is temporarily unavailable.
                    }
                    clearSession();
                    router.push("/login");
                  }}
                  className="flex min-h-9 w-full items-center justify-center gap-2 rounded-md bg-[hsl(0_100%_64%)] px-3 py-2 text-[15px] font-medium leading-[22px] text-white shadow-sm transition-colors hover:bg-[hsl(0_100%_60%)]"
                >
                  <span>Logout</span>
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Global Quick Search Popup Modal */}
      {isSearchOpen && (
        <Popup
          open={true}
          onOpenChange={(open) => !open && setIsSearchOpen(false)}
          title="Search LMS Modules & Pages"
          description="Quickly navigate to any module, table, or feature (or press Ctrl+K)."
        >
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Type to search modules (e.g. quizzes, courses, students, live classes...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="pl-9 pr-8 h-10 text-[14px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto space-y-1.5 pr-1">
              {filteredNavItems.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery("");
                    router.push(item.href);
                  }}
                  className="flex w-full items-center justify-between p-3 rounded-lg border border-border/60 hover:border-primary/50 hover:bg-primary/5 text-left transition-colors cursor-pointer group"
                >
                  <div>
                    <p className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-md shrink-0 ml-3">
                    {item.category}
                  </span>
                </button>
              ))}
              {filteredNavItems.length === 0 && (
                <div className="p-8 text-center text-[13px] text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">No modules found</p>
                  <p>No LMS modules match &quot;{searchQuery}&quot;.</p>
                </div>
              )}
            </div>
          </div>
        </Popup>
      )}
    </header>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatRoleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
