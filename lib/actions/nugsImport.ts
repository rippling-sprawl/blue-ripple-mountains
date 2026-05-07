"use server";

import { revalidatePath } from "next/cache";
import { createUntypedClient } from "@/lib/supabase/server-untyped";

const NUGS_API = "https://catalog.nugs.net/api/v1/shows/";

type NugsTrack = {
  trackNum?: number;
  setNum?: number;
  songTitle?: string;
  totalRunningTime?: number | string;
};

export async function importFromNugsAction(args: {
  showId: string;
  bandId: string;
  bandSlug: string;
  showSlug: string;
  containerId: string;
}) {
  if (!/^\d+$/.test(args.containerId)) return { error: "Invalid Nugs container id" };

  const supabase = await createUntypedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required" };

  let payload: { Response?: { tracks?: NugsTrack[] } };
  try {
    const r = await fetch(NUGS_API + args.containerId, {
      headers: { "User-Agent": "blueripplemountains/1.0" },
    });
    if (!r.ok) return { error: `Nugs HTTP ${r.status}` };
    payload = await r.json();
  } catch (err) {
    return { error: `Upstream error: ${(err as Error).message}` };
  }

  const tracks = payload.Response?.tracks ?? [];

  // Upsert the setlist row.
  let { data: setlist } = await supabase
    .from("setlists")
    .select("id")
    .eq("show_id", args.showId)
    .eq("band_id", args.bandId)
    .maybeSingle();

  if (!setlist) {
    const ins = await supabase
      .from("setlists")
      .insert({
        show_id: args.showId,
        band_id: args.bandId,
        source: "nugs",
        external_id: args.containerId,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (ins.error || !ins.data) return { error: ins.error?.message ?? "create failed" };
    setlist = ins.data;
  } else {
    await supabase
      .from("setlists")
      .update({ source: "nugs", external_id: args.containerId })
      .eq("id", setlist.id);
  }

  await supabase.from("setlist_songs").delete().eq("setlist_id", setlist.id);

  if (tracks.length > 0) {
    const rows = tracks
      .filter((t) => t.songTitle)
      .map((t, i) => ({
        setlist_id: setlist!.id,
        set_number: typeof t.setNum === "number" ? (t.setNum === 4 ? 99 : t.setNum) : 1,
        position: t.trackNum ?? i + 1,
        title: t.songTitle!,
        duration_seconds:
          typeof t.totalRunningTime === "number"
            ? Math.round(t.totalRunningTime)
            : Number(t.totalRunningTime) || null,
      }));
    if (rows.length > 0) {
      const { error } = await supabase.from("setlist_songs").insert(rows);
      if (error) return { error: error.message };
    }
  }

  // Optionally seed a Nugs link (skip if one already exists).
  const existingLink = await supabase
    .from("show_links")
    .select("id")
    .eq("show_id", args.showId)
    .eq("kind", "nugs")
    .maybeSingle();
  if (!existingLink.data) {
    await supabase.from("show_links").insert({
      show_id: args.showId,
      kind: "nugs",
      url: `https://play.nugs.net/release/${args.containerId}`,
      label: "Nugs",
    });
  }

  revalidatePath(`/setlists/${args.bandSlug}/${args.showSlug}`);
  return { ok: true, count: tracks.length };
}
