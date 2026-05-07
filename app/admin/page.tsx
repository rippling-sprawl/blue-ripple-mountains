import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatShowDate } from "@/lib/dates";
import { VerifyButton } from "./VerifyButton";
import type { Database } from "@/lib/supabase/database.types";

export const metadata = { title: "Admin — Blue Ripple Mountains" };
export const dynamic = "force-dynamic";

type ShowRow = Database["public"]["Tables"]["shows"]["Row"];
type BandRow = Database["public"]["Tables"]["bands"]["Row"];
type ShowJoined = ShowRow & {
  show_bands: Array<{ band: BandRow; position: number }>;
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const profRes = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin =
    (profRes.data as unknown as { is_admin: boolean } | null)?.is_admin ?? false;
  if (!isAdmin) {
    return (
      <div className="pt-12 text-center">
        <h1 className="text-2xl font-semibold">Not authorized</h1>
        <p className="text-ink-muted">This page is for the site admin.</p>
      </div>
    );
  }

  const res = await supabase
    .from("shows")
    .select("*, show_bands(position, band:bands(*))")
    .eq("is_verified", false)
    .order("created_at", { ascending: false });

  const rows = (res.data ?? []) as unknown as ShowJoined[];

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Verification queue</h1>
        <p className="text-ink-muted">{rows.length} shows awaiting review.</p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-md border border-line bg-bg-surface p-6 text-center text-ink-muted">
          All caught up.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((s) => {
            const bands = (s.show_bands ?? [])
              .slice()
              .sort((a, b) => a.position - b.position);
            const headliner = bands[0]?.band;
            return (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="font-medium">
                    {headliner ? (
                      <Link
                        href={`/setlists/${headliner.slug}/${s.slug}`}
                        className="hover:underline"
                      >
                        {headliner.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {bands.length > 1 && (
                      <span className="text-ink-muted">
                        {" "}+ {bands.length - 1} more
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-ink-muted">
                    {formatShowDate(s.date_start, s.date_end)} ·{" "}
                    {s.venue_name ?? s.festival_name} ·{" "}
                    {[s.city, s.state].filter(Boolean).join(", ")}
                  </div>
                </div>
                <VerifyButton showId={s.id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
