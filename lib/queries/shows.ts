import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type ShowRow = Database["public"]["Tables"]["shows"]["Row"];
type BandRow = Database["public"]["Tables"]["bands"]["Row"];

export type BandSummary = BandRow & { show_count: number };

export type ShowWithBands = ShowRow & {
  bands: Array<{ band: BandRow; position: number }>;
};

export async function listBands(): Promise<BandSummary[]> {
  const supabase = await createClient();
  const res = await supabase
    .from("bands")
    .select("*, show_bands(show_id)")
    .order("name", { ascending: true });

  const rows = (res.data ?? []) as unknown as Array<
    BandRow & { show_bands: Array<{ show_id: string }> }
  >;

  return rows.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    created_at: b.created_at,
    show_count: Array.isArray(b.show_bands) ? b.show_bands.length : 0,
  }));
}

export async function getBandBySlug(slug: string): Promise<BandRow | null> {
  const supabase = await createClient();
  const res = await supabase.from("bands").select("*").eq("slug", slug).maybeSingle();
  return (res.data as BandRow | null) ?? null;
}

type RawShowJoined = ShowRow & {
  show_bands: Array<{ position: number; band: BandRow }>;
};

function shapeShow(s: RawShowJoined): ShowWithBands {
  const bands = (s.show_bands ?? [])
    .map((sb) => ({ band: sb.band, position: sb.position }))
    .sort((a, b) => a.position - b.position);
  const { show_bands: _drop, ...show } = s;
  return { ...show, bands };
}

export async function listShowsForBand(bandId: string): Promise<ShowWithBands[]> {
  const supabase = await createClient();
  const res = await supabase
    .from("show_bands")
    .select("show:shows(*, show_bands(position, band:bands(*)))")
    .eq("band_id", bandId);

  const rows = (res.data ?? []) as unknown as Array<{ show: RawShowJoined | null }>;
  const shaped = rows
    .map((r) => (r.show ? shapeShow(r.show) : null))
    .filter((s): s is ShowWithBands => s !== null);
  shaped.sort((a, b) => (a.date_start < b.date_start ? 1 : -1));
  return shaped;
}

export async function getShowBySlug(slug: string): Promise<ShowWithBands | null> {
  const supabase = await createClient();
  const res = await supabase
    .from("shows")
    .select("*, show_bands(position, band:bands(*))")
    .eq("slug", slug)
    .maybeSingle();
  const row = res.data as unknown as RawShowJoined | null;
  return row ? shapeShow(row) : null;
}

export async function listMyShows(userId: string): Promise<ShowWithBands[]> {
  const supabase = await createClient();
  const res = await supabase
    .from("shows")
    .select("*, show_bands(position, band:bands(*))")
    .eq("created_by", userId)
    .order("date_start", { ascending: false });
  const rows = (res.data ?? []) as unknown as RawShowJoined[];
  return rows.map(shapeShow);
}
