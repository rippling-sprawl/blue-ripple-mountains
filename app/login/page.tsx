import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in — Blue Ripple Mountains" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(params.next ?? "/");

  return (
    <div className="mx-auto max-w-md space-y-6 pt-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-ink-muted">
          Enter your email and we&apos;ll send a magic link.
        </p>
      </div>
      <LoginForm next={params.next} />
      {params.sent === "1" && (
        <p className="rounded-md border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
          Check your email for the sign-in link.
        </p>
      )}
      {params.error && (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {params.error}
        </p>
      )}
    </div>
  );
}
