"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  Eye,
  EyeOff
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mapApiRoleToUserRole, useAuthStore } from "@/store/auth-store";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { cn } from "@/utils/cn";

type AuthMode = "login" | "signup";

interface AuthScreenProps {
  mode: AuthMode;
}

export function AuthScreen({ mode }: AuthScreenProps) {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const general = useAppSettingsStore((state) => state.general);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remember, setRemember] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formValues, setFormValues] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[minmax(0,1.95fr)_minmax(420px,0.95fr)]">
        <section className="relative hidden overflow-hidden border-r border-border/70 xl:flex xl:flex-col">
          <div className="flex items-center gap-3 px-8 py-6">
            <div className="relative h-9 w-9">
              <div
                className="absolute left-0 top-0 h-6 w-6 -rotate-45 rounded-[8px]"
                style={{ backgroundColor: general.primaryColor }}
              />
              <div
                className="absolute bottom-0 right-0 h-6 w-6 rotate-45 rounded-[8px]"
                style={{ backgroundColor: general.accentColor }}
              />
            </div>
            <span className="font-heading text-[26px] font-semibold tracking-[-0.02em] text-foreground">
              {general.lmsName}
            </span>
          </div>

          <div className="relative flex flex-1 items-center justify-center px-12 pb-10">
            <div className="absolute inset-x-[7%] bottom-0 h-[38%] rounded-t-[44%] bg-muted/70" />

            <div className="relative z-10 mt-8 flex h-[620px] w-[640px] items-end justify-center">
              <Image
                src="/auth/auth-v2-login-illustration-bordered-light.png"
                alt="Vuexy login illustration"
                width={640}
                height={620}
                priority
                className="h-auto max-h-full w-full max-w-[640px] object-contain"
              />
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-white px-5 py-8 sm:px-8 lg:px-12 xl:px-10 dark:bg-card">
          <div className="w-full max-w-[395px]">
            <div className="mb-10 xl:hidden">
              <div className="mb-8 flex items-center gap-3">
                <div className="relative h-8 w-8">
                  <div
                    className="absolute left-0 top-0 h-5 w-5 -rotate-45 rounded-[7px]"
                    style={{ backgroundColor: general.primaryColor }}
                  />
                  <div
                    className="absolute bottom-0 right-0 h-5 w-5 rotate-45 rounded-[7px]"
                    style={{ backgroundColor: general.accentColor }}
                  />
                </div>
                <span className="font-heading text-[24px] font-semibold text-foreground">
                  {general.lmsName}
                </span>
              </div>
            </div>

            <h1 className="font-heading text-[31px] font-medium leading-[1.25] tracking-[-0.02em] text-foreground">
              {mode === "login" ? `Welcome to ${general.lmsName}` : `Join ${general.lmsName}`}
            </h1>
            <p className="mt-2 text-[17px] leading-7 text-muted-foreground">
              {mode === "login"
                ? general.tagline || "Please sign in to continue."
                : "Create your account to access the learning platform."}
            </p>

            <form
              className={cn("space-y-6", mode === "login" ? "mt-8" : "mt-10")}
              onSubmit={async (event) => {
                event.preventDefault();
                setError(null);
                setSuccess(null);

                if (mode === "signup") {
                  if (formValues.password !== formValues.confirmPassword) {
                    setError("Passwords do not match");
                    return;
                  }
                }

                setIsSubmitting(true);

                try {
                  const response = await fetch(
                    mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/signup",
                    {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify(
                      mode === "login"
                        ? {
                            email: formValues.email,
                            password: formValues.password,
                            remember
                          }
                        : {
                            name: formValues.fullName,
                            email: formValues.email,
                            password: formValues.password,
                            termsAccepted
                          }
                    )
                  });

                  const result = (await response.json()) as {
                    success?: boolean;
                    error?: string;
                    message?: string;
                    expiresAt?: string;
                    user?: {
                      id: number;
                      name: string;
                      email: string;
                      role: string;
                      permissions: string[] | null;
                    };
                  };

                  if (mode === "signup") {
                    if (!response.ok || !result.success) {
                      setError(result.error ?? "Signup failed");
                      return;
                    }

                    setSuccess(result.message ?? "Account created. You can now sign in.");
                    setFormValues((current) => ({
                      ...current,
                      password: "",
                      confirmPassword: ""
                    }));
                    return;
                  }

                  if (
                    !response.ok ||
                    !result.success ||
                    !result.expiresAt ||
                    !result.user
                  ) {
                    setError(result.error ?? "Login failed");
                    return;
                  }

                  setSession({
                    expiresAt: result.expiresAt,
                    user: {
                      id: result.user.id,
                      name: result.user.name,
                      email: result.user.email,
                      role: mapApiRoleToUserRole(result.user.role),
                      permissions: result.user.permissions
                    }
                  });

                  router.push("/dashboard/academy");
                } catch {
                  setError("Unable to sign in right now");
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              {mode === "signup" ? (
                <Field
                  label="Full Name"
                  type="text"
                  value={formValues.fullName}
                  onChange={(value) => setFormValues((current) => ({ ...current, fullName: value }))}
                />
              ) : null}
              <Field
                label="Email"
                type="email"
                value={formValues.email}
                onChange={(value) => setFormValues((current) => ({ ...current, email: value }))}
              />
              <Field
                label="Password"
                type={showPassword ? "text" : "password"}
                value={formValues.password}
                onChange={(value) => setFormValues((current) => ({ ...current, password: value }))}
                trailingButton={
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="text-muted-foreground transition-colors hover:text-primary"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
              {mode === "signup" ? (
                <Field
                  label="Confirm Password"
                  type={showPassword ? "text" : "password"}
                  value={formValues.confirmPassword}
                  onChange={(value) =>
                    setFormValues((current) => ({ ...current, confirmPassword: value }))
                  }
                />
              ) : null}

              {error ? (
                <div className="rounded-md border border-[hsl(0_84%_86%)] bg-[hsl(0_100%_98%)] px-3 py-2 text-[13px] text-[hsl(0_70%_45%)]">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
                  {success} <Link href="/login" className="font-semibold underline">Sign in</Link>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-4 text-[15px] text-foreground">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={mode === "login" ? remember : termsAccepted}
                    onChange={(event) =>
                      mode === "login"
                        ? setRemember(event.target.checked)
                        : setTermsAccepted(event.target.checked)
                    }
                    className="h-[18px] w-[18px] rounded border-input bg-background text-primary focus:ring-ring"
                  />
                  <span>{mode === "login" ? "Remember me" : "I agree to privacy policy & terms"}</span>
                </label>
                {mode === "login" ? (
                  <Link href="/forgot-password" className="text-primary transition-colors hover:text-primary/85">
                    Forgot Password?
                  </Link>
                ) : null}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full shadow-[0_4px_14px_hsl(var(--primary)/0.35)]"
              >
                {isSubmitting ? "Please wait..." : mode === "login" ? "Login" : "Sign Up"}
              </Button>
            </form>

            <p className="mt-7 text-center text-[15px] text-muted-foreground">
              {mode === "login" ? "New on our platform?" : "Already have an account?"}{" "}
              <Link
                href={mode === "login" ? "/signup" : "/login"}
                className="font-medium text-primary transition-colors hover:text-primary/85"
              >
                {mode === "login" ? "Create an account" : "Sign in instead"}
              </Link>
            </p>

          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  type,
  value,
  trailingButton,
  onChange
}: {
  label: string;
  type: string;
  value?: string;
  trailingButton?: ReactNode;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[15px] font-medium text-foreground">{label}</span>
      <span className="flex items-center gap-3">
        <Input
          type={type}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          className={cn(
            "h-9 bg-card shadow-[inset_0_1px_0_rgba(75,70,92,0.02)]",
            trailingButton ? "pr-10" : ""
          )}
        />
        {trailingButton ? (
          <span className="-ml-12 flex h-9 w-9 shrink-0 items-center justify-center">
            {trailingButton}
          </span>
        ) : null}
      </span>
    </label>
  );
}
