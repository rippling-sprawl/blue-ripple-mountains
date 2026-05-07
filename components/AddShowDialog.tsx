"use client";

import { useState, useTransition } from "react";
import { addShowAction } from "@/lib/actions/shows";

export function AddShowDialog({
  bandSlug,
  bandName,
}: {
  bandSlug: string;
  bandName: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (formData: FormData) => {
    setError(null);
    const openers = String(formData.get("openers") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const isFestival = formData.get("is_festival") === "on";
    const festivalName = String(formData.get("festival_name") ?? "").trim();
    startTransition(async () => {
      const res = await addShowAction({
        bandSlug,
        date: String(formData.get("date") ?? ""),
        dateEnd: String(formData.get("date_end") ?? "") || null,
        venue: String(formData.get("venue") ?? ""),
        city: String(formData.get("city") ?? ""),
        state: String(formData.get("state") ?? ""),
        isFestival,
        festivalName: festivalName || null,
        openerNames: openers,
      });
      if (res && "error" in res) setError(res.error);
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/20"
      >
        + Add show
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-lg border border-line bg-bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add a {bandName} show</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-ink-muted hover:text-ink"
          >
            ×
          </button>
        </div>
        <form action={onSubmit} className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" name="date" type="date" required />
            <Field label="End date (festival)" name="date_end" type="date" />
          </div>
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
          <Field
            label="Openers (comma-separated)"
            name="openers"
            placeholder="Band 1, Band 2"
          />
          {error && <p className="text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
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
