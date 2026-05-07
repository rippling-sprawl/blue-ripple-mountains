"use client";

import { useState, useTransition } from "react";
import { setFriendTagsAction } from "@/lib/actions/notes";

type Tag = { user_id?: string | null; display_name?: string | null };

export function FriendTagger({
  showId,
  bandSlug,
  showSlug,
  initial,
  signedIn,
}: {
  showId: string;
  bandSlug: string;
  showSlug: string;
  initial: Tag[];
  signedIn: boolean;
}) {
  const [tags, setTags] = useState<Tag[]>(initial);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!signedIn) return null;

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    setTags((curr) => [...curr, { display_name: v }]);
    setDraft("");
  };

  const remove = (i: number) => setTags((curr) => curr.filter((_, ix) => ix !== i));

  const save = () =>
    startTransition(async () => {
      await setFriendTagsAction({ showId, bandSlug, showSlug, tags });
    });

  const dirty = JSON.stringify(tags) !== JSON.stringify(initial);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((t, i) => (
          <span
            key={`${t.display_name ?? t.user_id}-${i}`}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-raised px-2 py-1 text-xs"
          >
            {t.display_name ?? "user"}
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-ink-muted hover:text-red-400"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Tag a friend (name)"
          className="flex-1 rounded-md border border-line bg-bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
        >
          Add
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || isPending}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg-base hover:bg-accent-muted disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
