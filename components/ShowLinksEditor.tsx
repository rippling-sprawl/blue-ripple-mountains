"use client";

import { useState, useTransition } from "react";
import { saveShowLinksAction } from "@/lib/actions/links";

type Kind = "reddit" | "nugs" | "billybase" | "bmfsdb" | "other";
const KINDS: Kind[] = ["reddit", "nugs", "billybase", "bmfsdb", "other"];

type Link = { kind: Kind; url: string; label: string | null };

export function ShowLinksEditor({
  showId,
  bandSlug,
  showSlug,
  initial,
  canEdit,
}: {
  showId: string;
  bandSlug: string;
  showSlug: string;
  initial: Link[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [links, setLinks] = useState<Link[]>(initial);
  const [isPending, startTransition] = useTransition();

  if (!canEdit) return null;
  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
      >
        {initial.length === 0 ? "Add links" : "Edit links"}
      </button>
    );
  }

  const update = (i: number, patch: Partial<Link>) =>
    setLinks((curr) => curr.map((l, ix) => (ix === i ? { ...l, ...patch } : l)));

  const add = () =>
    setLinks((curr) => [...curr, { kind: "other", url: "", label: null }]);

  const remove = (i: number) => setLinks((curr) => curr.filter((_, ix) => ix !== i));

  const save = () =>
    startTransition(async () => {
      await saveShowLinksAction({ showId, bandSlug, showSlug, links });
      setEditing(false);
    });

  return (
    <div className="space-y-3 rounded-md border border-line bg-bg-surface p-4">
      {links.map((l, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
          <select
            value={l.kind}
            onChange={(e) => update(i, { kind: e.target.value as Kind })}
            className="rounded-md border border-line bg-bg-base px-2 py-1.5"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <input
            value={l.url}
            onChange={(e) => update(i, { url: e.target.value })}
            placeholder="https://…"
            className="flex-1 min-w-0 rounded-md border border-line bg-bg-base px-2 py-1.5 outline-none focus:border-accent"
          />
          <input
            value={l.label ?? ""}
            onChange={(e) => update(i, { label: e.target.value || null })}
            placeholder="label"
            className="w-32 rounded-md border border-line bg-bg-base px-2 py-1.5 outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-ink-muted hover:text-red-400"
          >
            ×
          </button>
        </div>
      ))}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={add}
          className="text-xs text-accent hover:underline"
        >
          + Add link
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setLinks(initial);
              setEditing(false);
            }}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg-base hover:bg-accent-muted disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
