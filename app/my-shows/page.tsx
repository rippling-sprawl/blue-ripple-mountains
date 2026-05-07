import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyShows } from "@/lib/queries/shows";
import { ShowGrid } from "@/components/ShowGrid";

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
        <ShowGrid shows={shows} />
      )}
    </div>
  );
}
