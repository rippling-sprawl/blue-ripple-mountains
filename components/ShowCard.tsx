import Link from "next/link";
import type { ShowWithBands } from "@/lib/queries/shows";
import { formatShowDate } from "@/lib/dates";

export function ShowCard({
  show,
  bandSlug,
}: {
  show: ShowWithBands;
  bandSlug: string;
}) {
  const headliner = show.bands.find((b) => b.position === 0)?.band ?? show.bands[0]?.band;
  const others = show.bands.filter((b) => b.band.id !== headliner?.id);

  return (
    <Link
      href={`/setlists/${bandSlug}/${show.slug}`}
      className="group flex min-w-0 flex-col rounded-lg border border-line bg-bg-surface transition hover:border-accent/50 hover:bg-bg-raised"
    >
      <div className="flex flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xl font-bold leading-tight">
            {formatShowDate(show.date_start, show.date_end)}
          </span>
          {!show.is_verified && (
            <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-accent">
              Unverified
            </span>
          )}
        </div>
        <div className="text-sm font-semibold break-words">
          {show.is_festival && show.festival_name
            ? show.festival_name
            : show.venue_name ?? "—"}
        </div>
        <div className="text-sm text-ink-muted break-words">
          {[show.city, show.state].filter(Boolean).join(", ")}
        </div>
        {others.length > 0 && (
          <div className="mt-1 text-xs text-ink-dim">
            with {others.map((o) => o.band.name).join(", ")}
          </div>
        )}
      </div>
    </Link>
  );
}
