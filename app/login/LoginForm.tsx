"use client";

import { useTransition } from "react";
import { sendMagicLink } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await sendMagicLink(formData);
        });
      }}
      className="space-y-3"
    >
      <input type="hidden" name="next" value={next ?? ""} />
      <input
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        className="w-full rounded-md border border-line bg-bg-surface px-3 py-2 text-ink outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-accent px-3 py-2 font-medium text-bg-base transition hover:bg-accent-muted disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Send magic link"}
      </button>
    </form>
  );
}
