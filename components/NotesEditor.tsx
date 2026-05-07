"use client";

import { useEffect, useRef, useState } from "react";

type Status = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 1500;

export function NotesEditor({
  showId,
  initial,
  signedIn,
}: {
  showId: string;
  initial: string;
  signedIn: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<Status>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef(initial);
  const pending = useRef(false);

  // Save the latest value to the server.
  const save = async (content: string) => {
    if (content === lastSent.current) return;
    setStatus("saving");
    pending.current = true;
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ show_id: showId, content }),
      });
      if (!res.ok) throw new Error(await res.text());
      lastSent.current = content;
      setStatus("saved");
      setSavedAt(new Date());
    } catch (err) {
      console.error("notes save failed", err);
      setStatus("error");
    } finally {
      pending.current = false;
    }
  };

  // Debounced save on every keystroke.
  useEffect(() => {
    if (!signedIn) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(value), DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, signedIn]);

  // Beacon-flush on tab hide / page unload — the mobile-critical path.
  useEffect(() => {
    if (!signedIn) return;
    const flush = () => {
      if (value === lastSent.current) return;
      const blob = new Blob(
        [JSON.stringify({ show_id: showId, content: value })],
        { type: "application/json" },
      );
      navigator.sendBeacon?.("/api/notes", blob);
      lastSent.current = value;
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [value, showId, signedIn]);

  if (!signedIn) {
    return (
      <div className="rounded-md border border-line bg-bg-surface p-4 text-sm text-ink-muted">
        Sign in to take notes on this show.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Notes from the show — emotions, who you were with, songs that hit…"
        rows={8}
        className="w-full resize-y rounded-md border border-line bg-bg-surface px-3 py-2 text-base outline-none focus:border-accent"
      />
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <span aria-live="polite">
          {status === "saving" && "Saving…"}
          {status === "saved" && savedAt && `Saved ${formatRelative(savedAt)}`}
          {status === "error" && (
            <span className="text-red-400">Save failed — retrying.</span>
          )}
          {status === "idle" && "Auto-saves as you type."}
        </span>
        <span>{value.length} chars</span>
      </div>
    </div>
  );
}

function formatRelative(d: Date): string {
  const sec = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return d.toLocaleTimeString();
}
