import { VerifyEmailForm } from "@/components/auth/recovery-forms";

export default async function VerifyEmailPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <VerifyEmailForm token={params.token ?? ""} />;
}
