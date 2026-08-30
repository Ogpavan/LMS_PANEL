"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppSettingsStore } from "@/store/app-settings-store";

function AuthCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const general = useAppSettingsStore((state) => state.general);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <p className="text-sm font-semibold text-primary">{general.lmsName}</p>
        <h1 className="mt-3 font-heading text-3xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mt-7">{children}</div>
      </section>
    </main>
  );
}

function StatusMessage({ kind, children }: { kind: "error" | "success"; children: React.ReactNode }) {
  return (
    <div className={kind === "error"
      ? "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      : "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"}
    >
      {children}
    </div>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <AuthCard title="Forgot password" description="Enter your account email and we will send a secure reset link.">
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setLoading(true);
          setError(null);
          setMessage(null);

          try {
            const response = await fetch("/api/v1/auth/forgot-password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email })
            });
            const result = (await response.json()) as { success?: boolean; error?: string; message?: string };
            if (!response.ok || !result.success) setError(result.error ?? "Request failed");
            else setMessage(result.message ?? "Check your email for the reset link.");
          } catch {
            setError("Unable to request a reset link right now");
          } finally {
            setLoading(false);
          }
        }}
      >
        <label className="block text-sm font-medium text-foreground">
          Email
          <Input className="mt-2" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        {error ? <StatusMessage kind="error">{error}</StatusMessage> : null}
        {message ? <StatusMessage kind="success">{message}</StatusMessage> : null}
        <Button className="w-full" type="submit" disabled={loading}>{loading ? "Sending..." : "Send reset link"}</Button>
        <p className="text-center text-sm"><Link className="text-primary hover:underline" href="/login">Back to login</Link></p>
      </form>
    </AuthCard>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(token ? null : "The reset link is missing its token");
  const [loading, setLoading] = useState(false);

  return (
    <AuthCard title="Set a new password" description="Use at least 12 characters with upper and lowercase letters, a number, and a symbol.">
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          if (password !== confirmPassword) return setError("Passwords do not match");
          if (!token) return setError("The reset link is invalid");
          setLoading(true);

          try {
            const response = await fetch("/api/v1/auth/reset-password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token, password })
            });
            const result = (await response.json()) as { success?: boolean; error?: string; message?: string };
            if (!response.ok || !result.success) setError(result.error ?? "Password reset failed");
            else setMessage(result.message ?? "Password updated.");
          } catch {
            setError("Unable to update your password right now");
          } finally {
            setLoading(false);
          }
        }}
      >
        <label className="block text-sm font-medium">New password<Input className="mt-2" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label className="block text-sm font-medium">Confirm password<Input className="mt-2" type="password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
        {error ? <StatusMessage kind="error">{error}</StatusMessage> : null}
        {message ? <StatusMessage kind="success">{message} <Link className="font-semibold underline" href="/login">Sign in</Link></StatusMessage> : null}
        <Button className="w-full" type="submit" disabled={loading || Boolean(message)}>{loading ? "Updating..." : "Update password"}</Button>
      </form>
    </AuthCard>
  );
}

export function VerifyEmailForm({ token }: { token: string }) {
  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [message, setMessage] = useState(token ? "Verifying your email..." : "The verification link is missing its token.");

  useEffect(() => {
    if (!token) return;

    void fetch("/api/v1/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    })
      .then(async (response) => {
        const result = (await response.json()) as { success?: boolean; error?: string; message?: string };
        if (!response.ok || !result.success) throw new Error(result.error ?? "Verification failed");
        setStatus("success");
        setMessage(result.message ?? "Email verified.");
      })
      .catch((error: Error) => {
        setStatus("error");
        setMessage(error.message);
      });
  }, [token]);

  return (
    <AuthCard title="Verify email" description="Confirming ownership of your account email keeps your account secure.">
      <StatusMessage kind={status === "error" ? "error" : "success"}>{message}</StatusMessage>
      {status !== "loading" ? <p className="mt-5 text-center text-sm"><Link className="text-primary hover:underline" href="/login">Continue to login</Link></p> : null}
    </AuthCard>
  );
}
