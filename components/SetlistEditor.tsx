"use client";

import { useState, useTransition } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { saveSetlistAction, type SongInput } from "@/lib/actions/setlists";

type Song = Database["public"]["Tables"]["setlist_songs"]["Row"];

type EditableSong = {
  key: string;
  set_number: number;
  position: number;
  title: string;
  duration_seconds: number | null;
};

let nextKey = 0;
const newKey = () => `n${++nextKey}`;

function fromRows(rows: Song[]): EditableSong[] {
  return rows
    .slice()
    .sort((a, b) => a.set_number - b.set_number || a.position - b.position)
    .map((r) => ({
      key: r.id,
      set_number: r.set_number,
      position: r.position,
      title: r.title,
      duration_seconds: r.duration_seconds,
    }));
}

function parseDuration(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const m = t.match(/^(\d+):(\d{1,2})$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  if (/^\d+$/.test(t)) return Number(t);
  return null;
}

function fmtDuration(s: number | null): string {
  if (!s) return "";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function SetlistEditor({
  showId,
  bandId,
  bandSlug,
  showSlug,
  initial,
  signedIn,
}: {
  showId: string;
  bandId: string;
  bandSlug: string;
  showSlug: string;
  initial: Song[];
  signedIn: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [songs, setSongs] = useState<EditableSong[]>(fromRows(initial));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!signedIn || !editing) {
    if (!signedIn) return null;
    return (
      <button
        onClick={() => setEditing(true)}
        className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
      >
        Edit setlist
      </button>
    );
  }

  const addSong = (setNum: number) =>
    setSongs((curr) => [
      ...curr,
      {
        key: newKey(),
        set_number: setNum,
        position: curr.filter((s) => s.set_number === setNum).length + 1,
        title: "",
        duration_seconds: null,
      },
    ]);

  const updateSong = (key: string, patch: Partial<EditableSong>) =>
    setSongs((curr) => curr.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const removeSong = (key: string) =>
    setSongs((curr) => curr.filter((s) => s.key !== key));

  const move = (key: string, dir: -1 | 1) =>
    setSongs((curr) => {
      const ix = curr.findIndex((s) => s.key === key);
      if (ix < 0) return curr;
      const setNum = curr[ix].set_number;
      const same = curr.filter((s) => s.set_number === setNum);
      const localIx = same.findIndex((s) => s.key === key);
      const swapWith = same[localIx + dir];
      if (!swapWith) return curr;
      const next = curr.slice();
      const a = next.findIndex((s) => s.key === key);
      const b = next.findIndex((s) => s.key === swapWith.key);
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });

  const onSave = () => {
    setError(null);
    const grouped = new Map<number, EditableSong[]>();
    for (const s of songs) {
      if (!s.title.trim()) continue;
      const arr = grouped.get(s.set_number) ?? [];
      arr.push(s);
      grouped.set(s.set_number, arr);
    }
    const flat: SongInput[] = [];
    for (const [setNum, arr] of grouped) {
      arr.forEach((s, i) => {
        flat.push({
          set_number: setNum,
          position: i + 1,
          title: s.title.trim(),
          duration_seconds: s.duration_seconds,
        });
      });
    }
    startTransition(async () => {
      const res = await saveSetlistAction({
        showId,
        bandId,
        bandSlug,
        showSlug,
        songs: flat,
      });
      if (res && "error" in res && res.error) {
        setError(res.error);
      } else {
        setEditing(false);
      }
    });
  };

  const sets = [...new Set(songs.map((s) => s.set_number))].sort((a, b) => a - b);
  if (sets.length === 0) sets.push(1);

  return (
    <div className="space-y-4 rounded-md border border-line bg-bg-surface p-4">
      {sets.map((setNum) => (
        <div key={setNum}>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            {setNum >= 99 ? "Encore" : `Set ${setNum}`}
            <button
              type="button"
              onClick={() =>
                setSongs((curr) =>
                  curr.filter((s) => s.set_number !== setNum).concat([]),
                )
              }
              className="text-xs text-ink-muted hover:text-red-400"
            >
              clear
            </button>
          </div>
          <div className="space-y-2">
            {songs
              .filter((s) => s.set_number === setNum)
              .map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <input
                    value={s.title}
                    onChange={(e) => updateSong(s.key, { title: e.target.value })}
                    placeholder="Song title"
                    className="flex-1 rounded-md border border-line bg-bg-base px-2 py-1.5 text-sm outline-none focus:border-accent"
                  />
                  <input
                    defaultValue={fmtDuration(s.duration_seconds)}
                    onBlur={(e) =>
                      updateSong(s.key, {
                        duration_seconds: parseDuration(e.target.value),
                      })
                    }
                    placeholder="m:ss"
                    className="w-20 rounded-md border border-line bg-bg-base px-2 py-1.5 text-sm outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => move(s.key, -1)}
                    className="text-ink-muted hover:text-ink"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(s.key, 1)}
                    className="text-ink-muted hover:text-ink"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSong(s.key)}
                    className="text-ink-muted hover:text-red-400"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            <button
              type="button"
              onClick={() => addSong(setNum)}
              className="text-xs text-accent hover:underline"
            >
              + Add song
            </button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => addSong(Math.max(...sets) + 1)}
          className="text-xs text-ink-muted hover:text-ink"
        >
          + Add another set
        </button>
        <button
          type="button"
          onClick={() => addSong(99)}
          className="text-xs text-ink-muted hover:text-ink"
        >
          + Add encore
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg-base hover:bg-accent-muted disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save setlist"}
        </button>
      </div>
    </div>
  );
}
