"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function SignOutButton({ email }: { email: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      title={email}
      className="rounded-md border border-line px-3 py-1.5 text-ink-muted hover:text-ink"
    >
      {isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}
