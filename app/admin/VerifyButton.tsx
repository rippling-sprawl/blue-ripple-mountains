"use client";

import { useTransition } from "react";
import { verifyShowAction } from "@/lib/actions/shows";

export function VerifyButton({ showId }: { showId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await verifyShowAction(showId);
        })
      }
      disabled={isPending}
      className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg-base hover:bg-accent-muted disabled:opacity-60"
    >
      {isPending ? "Verifying…" : "Verify"}
    </button>
  );
}
