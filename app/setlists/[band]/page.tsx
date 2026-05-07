import { notFound } from "next/navigation";
import Link from "next/link";
import { getBandBySlug, listShowsForBand } from "@/lib/queries/shows";
import { createClient } from "@/lib/supabase/server";
import { ShowGrid } from "@/components/ShowGrid";
import { AddShowDialog } from "@/components/AddShowDialog";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ band: string }>;
}) {
  const { band } = await params;
  const b = await getBandBySlug(band);
  return { title: b ? `${b.name} — Setlists` : "Band — Setlists" };
}

export default async function BandPage({
  params,
}: {
  params: Promise<{ band: string }>;
}) {
  const { band } = await params;
  const b = await getBandBySlug(band);
  if (!b) notFound();

  const shows = await listShowsForBand(b.id);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Link href="/setlists" className="text-sm text-accent hover:underline">
            ← All bands
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">{b.name}</h1>
          <p className="text-ink-muted">{shows.length} shows</p>
        </div>
        {user && <AddShowDialog bandSlug={b.slug} bandName={b.name} />}
      </div>
      <ShowGrid shows={shows} bandSlug={b.slug} />
    </div>
  );
}
