"use client";

import { useState, useTransition } from "react";
import { importFromNugsAction } from "@/lib/actions/nugsImport";

export function NugsImportButton({
  showId,
  bandId,
  bandSlug,
  showSlug,
}: {
  showId: string;
  bandId: string;
  bandSlug: string;
  showSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const [containerId, setContainerId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = () =>
    startTransition(async () => {
      setError(null);
      setSuccess(null);
      const res = await importFromNugsAction({
        showId,
        bandId,
        bandSlug,
        showSlug,
        containerId: containerId.trim(),
      });
      if ("error" in res && res.error) setError(res.error);
      else if ("ok" in res) {
        setSuccess(`Imported ${res.count} tracks`);
        setOpen(false);
      }
    });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
      >
        Import from Nugs
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-bg-surface p-3 text-sm">
      <input
        value={containerId}
        onChange={(e) => setContainerId(e.target.value)}
        placeholder="Nugs container ID"
        className="rounded-md border border-line bg-bg-base px-2 py-1.5 outline-none focus:border-accent"
      />
      <button
        onClick={submit}
        disabled={isPending || !containerId.trim()}
        className="rounded-md bg-accent px-3 py-1.5 font-medium text-bg-base hover:bg-accent-muted disabled:opacity-60"
      >
        {isPending ? "Importing…" : "Import"}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="rounded-md border border-line px-3 py-1.5 text-ink-muted hover:text-ink"
      >
        Cancel
      </button>
      {error && <span className="text-red-400">{error}</span>}
      {success && <span className="text-accent">{success}</span>}
    </div>
  );
}
