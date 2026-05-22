"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, RefreshCcw, ShieldCheck, UserCog, Users } from "lucide-react";
import { toast } from "sonner";

import type { WidgetRendererProps } from "@/types/admin";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRegistrySnapshot } from "@/services/registry-service";
import { useAuthStore } from "@/store/auth-store";

interface AccessUserRecord {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "INSTRUCTOR" | "STUDENT";
  permissions: string[] | null;
  createdAt: string;
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

interface AssignablePage {
  key: string;
  title: string;
  href: string;
  group: string;
}

const protectedPageKeys = new Set([
  "academy.instructors.permissions",
  "academy.administration.roles-permissions",
  "academy.administration.settings"
]);

const roleOptions: Array<AccessUserRecord["role"]> = ["ADMIN", "INSTRUCTOR", "STUDENT"];

export function AcademyRolesPermissionsWidget({ config }: WidgetRendererProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [records, setRecords] = useState<AccessUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<AccessUserRecord["role"]>("INSTRUCTOR");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(["academy.dashboard"]);

  const assignablePages = useMemo(() => {
    const snapshot = getRegistrySnapshot("admin");

    return [...snapshot.pages.values()]
      .filter((page) => page.href.startsWith("/dashboard/academy"))
      .filter((page) => !protectedPageKeys.has(page.key))
      .map((page) => ({
        key: page.key,
        title: page.title,
        href: page.href,
        group: resolvePageGroup(page.href)
      }))
      .sort((left, right) =>
        left.group === right.group
          ? left.title.localeCompare(right.title)
          : left.group.localeCompare(right.group)
      );
  }, []);

  const groupedPages = useMemo(() => {
    const groups = new Map<string, AssignablePage[]>();

    for (const page of assignablePages) {
      const existing = groups.get(page.group);
      if (existing) {
        existing.push(page);
      } else {
        groups.set(page.group, [page]);
      }
    }

    return [...groups.entries()];
  }, [assignablePages]);

  const selectedUser = useMemo(
    () => records.find((record) => record.id === selectedUserId) ?? null,
    [records, selectedUserId]
  );

  const summary = useMemo(() => {
    const instructors = records.filter((record) => record.role === "INSTRUCTOR").length;
    const admins = records.filter((record) => record.role === "ADMIN").length;
    const granular = records.filter(
      (record) => record.role === "INSTRUCTOR" && Array.isArray(record.permissions)
    ).length;

    return [
      {
        label: "Total LMS users",
        value: String(records.length),
        icon: Users,
        iconClassName: "bg-[#ece9ff] text-[#7367f0]",
        valueClassName: "text-[#7367f0]"
      },
      {
        label: "Admins",
        value: String(admins),
        icon: ShieldCheck,
        iconClassName: "bg-[#dff7ff] text-[#00bad1]",
        valueClassName: "text-[#00bad1]"
      },
      {
        label: "Instructors",
        value: String(instructors),
        icon: UserCog,
        iconClassName: "bg-[#e4f7ec] text-[#28c76f]",
        valueClassName: "text-[#28c76f]"
      },
      {
        label: "Granular access",
        value: String(granular),
        icon: KeyRound,
        iconClassName: "bg-[#fff1e4] text-[#ff9f43]",
        valueClassName: "text-[#ff9f43]"
      }
    ];
  }, [records]);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadUsers();
  }, [accessToken]);

  useEffect(() => {
    if (!selectedUser && records.length > 0) {
      syncSelection(records[0]);
    }
  }, [records, selectedUser]);

  const isCurrentUser = selectedUser?.id === currentUser?.id;

  async function loadUsers() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/administration/access-users", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const result = (await response.json()) as ApiResponse<AccessUserRecord[]>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Unable to load user access", {
          description: result.error ?? "Please try again."
        });
        setRecords([]);
        return;
      }

      setRecords(result.data.map((record) => ({ ...record, permissions: normalizePermissions(record.permissions) })));
    } catch {
      toast.error("Unable to load user access", {
        description: "Please try again."
      });
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }

  function syncSelection(record: AccessUserRecord) {
    setSelectedUserId(record.id);
    setSelectedRole(record.role);
    setSelectedPermissions(record.role === "INSTRUCTOR" ? withDashboard(record.permissions) : []);
  }

  function togglePermission(pageKey: string) {
    if (pageKey === "academy.dashboard" || selectedRole !== "INSTRUCTOR") {
      return;
    }

    setSelectedPermissions((current) =>
      current.includes(pageKey)
        ? current.filter((item) => item !== pageKey)
        : [...current, pageKey]
    );
  }

  async function handleSave() {
    if (!selectedUser) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/v1/administration/access-users/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          role: selectedRole,
          permissions: selectedRole === "INSTRUCTOR" ? withDashboard(selectedPermissions) : null
        })
      });

      const result = (await response.json()) as ApiResponse<AccessUserRecord>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Access settings could not be saved", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      const normalized = {
        ...result.data,
        permissions: normalizePermissions(result.data.permissions)
      };

      setRecords((current) =>
        current.map((record) => (record.id === normalized.id ? normalized : record))
      );
      syncSelection(normalized);

      toast.success("Role access updated", {
        description: `${normalized.name} now has the configured LMS access.`
      });
    } catch {
      toast.error("Access settings could not be saved", {
        description: "Please try again."
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-0">
          <div className="grid gap-px overflow-hidden rounded-md bg-border/70 md:grid-cols-2 xl:grid-cols-4">
            {summary.map(({ label, value, icon: Icon, iconClassName, valueClassName }) => (
              <div key={label} className="flex items-center gap-4 bg-white px-5 py-3 dark:bg-card">
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-md ${iconClassName}`}>
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-medium leading-[20px] text-muted-foreground">
                    {label}
                  </div>
                  <div className={`mt-0.5 text-[30px] font-semibold leading-none tracking-[-0.03em] ${valueClassName}`}>
                    {value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{config.title ?? "Role access"}</CardTitle>
                <p className="mt-1 text-[14px] leading-[22px] text-muted-foreground">
                  Select an LMS user to manage their role and page-level access.
                </p>
              </div>
              <Button variant="outline" onClick={() => void loadUsers()} disabled={isLoading}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
                Loading LMS users...
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((record) => {
                  const isSelected = record.id === selectedUserId;
                  const roleLabel = record.role.charAt(0) + record.role.slice(1).toLowerCase();

                  return (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => syncSelection(record)}
                      className={`w-full rounded-md border px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? "border-[hsl(var(--primary))] bg-primary/5"
                          : "border-border/70 bg-card hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground">{record.name}</div>
                          <div className="truncate text-[13px] leading-[20px] text-muted-foreground">
                            {record.email}
                          </div>
                        </div>
                        <Badge className="bg-primary/10 text-primary">{roleLabel}</Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>
                  {selectedUser ? `${selectedUser.name} access` : "LMS access"}
                </CardTitle>
                <p className="mt-1 text-[14px] leading-[22px] text-muted-foreground">
                  Assign a role and, for instructors, choose exactly which academy pages they can open.
                </p>
              </div>
              <Button onClick={() => void handleSave()} disabled={!selectedUser || isSaving || isCurrentUser}>
                {isSaving ? "Saving..." : "Save Access"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedUser ? (
              <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
                Select a user to manage role access.
              </div>
            ) : (
              <div className="space-y-5">
                {isCurrentUser ? (
                  <div className="rounded-md border border-dashed border-border px-4 py-4 text-[13px] leading-[20px] text-muted-foreground">
                    Your own account is locked here to avoid accidental access loss.
                  </div>
                ) : null}

                <div className="rounded-md border border-border/70 bg-card">
                  <div className="border-b border-border/70 px-4 py-3">
                    <div className="text-[15px] font-medium text-foreground">Role</div>
                  </div>
                  <div className="grid gap-3 p-4 md:grid-cols-3">
                    {roleOptions.map((role) => {
                      const checked = selectedRole === role;

                      return (
                        <label
                          key={role}
                          className={`flex items-start gap-3 rounded-md border px-3 py-3 ${
                            checked ? "border-[hsl(var(--primary))] bg-primary/5" : "border-border/70 bg-muted/10"
                          }`}
                        >
                          <input
                            type="radio"
                            name="user-role"
                            checked={checked}
                            onChange={() => setSelectedRole(role)}
                            disabled={isCurrentUser}
                            className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-foreground">
                              {role.charAt(0) + role.slice(1).toLowerCase()}
                            </div>
                            <div className="text-[12px] leading-[18px] text-muted-foreground">
                              {describeRole(role)}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {selectedRole === "INSTRUCTOR" ? (
                  <>
                    <div className="rounded-md border border-border/70 bg-muted/10 p-4 text-[13px] leading-[20px] text-muted-foreground">
                      `Dashboard` is always kept enabled so the instructor has a valid landing page after login.
                    </div>

                    {groupedPages.map(([group, pages]) => (
                      <div key={group} className="rounded-md border border-border/70 bg-card">
                        <div className="border-b border-border/70 px-4 py-3">
                          <div className="text-[15px] font-medium text-foreground">{group}</div>
                        </div>
                        <div className="grid gap-3 p-4 md:grid-cols-2">
                          {pages.map((page) => {
                            const checked = selectedPermissions.includes(page.key);
                            const isLocked = page.key === "academy.dashboard";

                            return (
                              <label
                                key={page.key}
                                className={`flex items-start gap-3 rounded-md border px-3 py-3 ${
                                  checked
                                    ? "border-[hsl(var(--primary))] bg-primary/5"
                                    : "border-border/70 bg-muted/10"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={isLocked || isCurrentUser}
                                  onChange={() => togglePermission(page.key)}
                                  className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                                />
                                <div className="min-w-0">
                                  <div className="font-medium text-foreground">{page.title}</div>
                                  <div className="text-[12px] leading-[18px] text-muted-foreground">
                                    {page.href}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="rounded-md border border-dashed border-border px-4 py-4 text-[13px] leading-[20px] text-muted-foreground">
                    {selectedRole === "ADMIN"
                      ? "Admins receive full LMS access without page-level restrictions."
                      : "Students do not receive admin shell page access from this screen."}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function normalizePermissions(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.filter((item): item is string => typeof item === "string");
}

function withDashboard(value: string[] | null) {
  const permissions = Array.isArray(value) ? [...value] : [];

  if (!permissions.includes("academy.dashboard")) {
    permissions.unshift("academy.dashboard");
  }

  return [...new Set(permissions)];
}

function resolvePageGroup(href: string) {
  const parts = href.split("/").filter(Boolean);
  const academyIndex = parts.indexOf("academy");
  const nextPart = parts[academyIndex + 1];

  if (!nextPart) {
    return "Overview";
  }

  return nextPart
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function describeRole(role: AccessUserRecord["role"]) {
  switch (role) {
    case "ADMIN":
      return "Full LMS administration access";
    case "INSTRUCTOR":
      return "Granular course and teaching access";
    case "STUDENT":
    default:
      return "Learner account with no admin shell access";
  }
}
