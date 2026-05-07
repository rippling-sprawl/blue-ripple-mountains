import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyShows } from "@/lib/queries/shows";
import { formatShowDate } from "@/lib/dates";

export const metadata = { title: "My Shows — Blue Ripple Mountains" };
export const dynamic = "force-dynamic";

export default async function MyShowsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my-shows");

  const shows = await listMyShows(user.id);

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">My Shows</h1>
        <p className="text-ink-muted">{shows.length} shows you&apos;ve added.</p>
      </div>
      {shows.length === 0 ? (
        <p className="rounded-md border border-line bg-bg-surface p-6 text-center text-ink-muted">
          No shows yet. Browse{" "}
          <Link href="/setlists" className="text-accent hover:underline">
            Setlists
          </Link>{" "}
          to add one.
        </p>
      ) : (
        <ul className="space-y-2">
          {shows.map((s) => {
            const headliner = s.bands.find((b) => b.position === 0)?.band ?? s.bands[0]?.band;
            const target = headliner ? `/setlists/${headliner.slug}/${s.slug}` : `#`;
            return (
              <li key={s.id}>
                <Link
                  href={target}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-bg-surface px-4 py-3 transition hover:border-accent/50 hover:bg-bg-raised"
                >
                  <div className="min-w-0">
                    <div className="font-medium">
                      {headliner?.name ?? "—"}
                      {s.bands.length > 1 && (
                        <span className="text-ink-muted">
                          {" "}+ {s.bands.length - 1} more
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-ink-muted">
                      {formatShowDate(s.date_start, s.date_end)} ·{" "}
                      {s.venue_name ?? s.festival_name} ·{" "}
                      {[s.city, s.state].filter(Boolean).join(", ")}
                    </div>
                  </div>
                  {!s.is_verified && (
                    <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-accent">
                      Unverified
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
