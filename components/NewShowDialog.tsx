"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createShowAction } from "@/lib/actions/shows";

export function NewShowDialog({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (formData: FormData) => {
    setError(null);
    const bandNames = String(formData.get("bands") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const isFestival = formData.get("is_festival") === "on";
    const festivalName = String(formData.get("festival_name") ?? "").trim();
    startTransition(async () => {
      const res = await createShowAction({
        date: String(formData.get("date") ?? ""),
        dateEnd: String(formData.get("date_end") ?? "") || null,
        bandNames,
        venue: String(formData.get("venue") ?? ""),
        city: String(formData.get("city") ?? ""),
        state: String(formData.get("state") ?? ""),
        isFestival,
        festivalName: festivalName || null,
        notes: String(formData.get("notes") ?? ""),
      });
      if (res && "error" in res) setError(res.error);
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        type="button"
        className="group rounded-lg border border-line bg-bg-surface p-6 text-left transition hover:border-accent/50 hover:bg-bg-raised"
      >
        <h2 className="text-xl font-medium">
          New Show{" "}
          <span className="ml-1 text-accent transition group-hover:translate-x-1">+</span>
        </h2>
        <p className="mt-2 text-ink-muted">
          Log a show you&apos;re going to — bands, venue, notes.
        </p>
      </button>
    );
  }

  if (!signedIn) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
        <div className="w-full max-w-md space-y-3 rounded-lg border border-line bg-bg-surface p-5">
          <h2 className="text-lg font-semibold">Sign in to add a show</h2>
          <p className="text-sm text-ink-muted">
            Adding shows requires a signed-in account.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
            <Link
              href="/login?next=/"
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg-base hover:bg-accent-muted"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-lg border border-line bg-bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New show</h2>
          <button
            onClick={() => setOpen(false)}
            type="button"
            className="text-ink-muted hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <form action={onSubmit} className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" name="date" type="date" required />
            <Field label="End date (optional)" name="date_end" type="date" />
          </div>
          <Field
            label="Bands (comma-separated, headliner first)"
            name="bands"
            placeholder="Billy Strings, Fireside Collective"
            required
          />
          <Field label="Venue" name="venue" placeholder="The Orange Peel" required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" name="city" placeholder="Asheville" required />
            <Field label="State" name="state" placeholder="NC" required />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_festival" />
            <span>This is a festival</span>
          </label>
          <Field label="Festival name (optional)" name="festival_name" />
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-muted">Notes (optional)</span>
            <textarea
              name="notes"
              rows={3}
              placeholder="Who you're going with, what you're hoping to hear…"
              className="rounded-md border border-line bg-bg-base px-2 py-1.5 outline-none focus:border-accent"
            />
          </label>
          {error && <p className="text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-line px-3 py-1.5 text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-accent px-3 py-1.5 font-medium text-bg-base hover:bg-accent-muted disabled:opacity-60"
            >
              {isPending ? "Adding…" : "Add show"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-ink-muted">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="rounded-md border border-line bg-bg-base px-2 py-1.5 outline-none focus:border-accent"
      />
    </label>
  );
}
