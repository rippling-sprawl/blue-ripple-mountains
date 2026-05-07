"use client";

import { useMemo, useState } from "react";
import type { ShowWithBands } from "@/lib/queries/shows";
import { ShowCard } from "./ShowCard";

export function ShowGrid({
  shows,
  bandSlug,
}: {
  shows: ShowWithBands[];
  bandSlug?: string;
}) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [state, setState] = useState("all");
  const [venue, setVenue] = useState("all");

  const years = useMemo(
    () =>
      Array.from(new Set(shows.map((s) => s.date_start.slice(0, 4))))
        .sort()
        .reverse(),
    [shows],
  );
  const states = useMemo(
    () =>
      Array.from(new Set(shows.map((s) => s.state).filter(Boolean) as string[])).sort(),
    [shows],
  );
  const venues = useMemo(
    () =>
      Array.from(
        new Set(shows.map((s) => s.venue_name).filter(Boolean) as string[]),
      ).sort(),
    [shows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shows.filter((s) => {
      if (year !== "all" && !s.date_start.startsWith(year)) return false;
      if (state !== "all" && s.state !== state) return false;
      if (venue !== "all" && s.venue_name !== venue) return false;
      if (q) {
        const hay = [
          s.venue_name,
          s.city,
          s.state,
          s.festival_name,
          s.date_start,
          ...s.bands.map((b) => b.band.name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [shows, query, year, state, venue]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = filtered.filter((s) => s.date_start >= today);
  const past = filtered.filter((s) => s.date_start < today);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search venue, city, band…"
          className="w-full rounded-md border border-line bg-bg-surface px-3 py-2 text-base outline-none focus:border-accent"
        />
        <div className="flex flex-wrap gap-3">
          <FilterSelect label="Year" value={year} onChange={setYear} options={years} />
          <FilterSelect label="State" value={state} onChange={setState} options={states} />
          <FilterSelect label="Venue" value={venue} onChange={setVenue} options={venues} />
          <div className="ml-auto self-end text-sm text-ink-muted">
            {filtered.length} of {shows.length}
          </div>
        </div>
      </div>

      {upcoming.length > 0 && (
        <Section title="Upcoming" count={upcoming.length}>
          <Tiles shows={upcoming} bandSlug={bandSlug} />
        </Section>
      )}
      <Section title="Past" count={past.length}>
        {past.length === 0 ? (
          <p className="rounded-md border border-line bg-bg-surface p-6 text-center text-ink-muted">
            No shows match these filters.
          </p>
        ) : (
          <Tiles shows={past} bandSlug={bandSlug} />
        )}
      </Section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex min-w-[140px] flex-col gap-1 text-xs text-ink-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-line bg-bg-surface px-2 py-1.5 text-sm text-ink"
      >
        <option value="all">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        {title} <span className="text-sm font-normal text-ink-muted">({count})</span>
      </h2>
      {children}
    </section>
  );
}

function Tiles({ shows, bandSlug }: { shows: ShowWithBands[]; bandSlug?: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {shows.map((s) => (
        <ShowCard key={s.id} show={s} bandSlug={bandSlug} />
      ))}
    </div>
  );
}
