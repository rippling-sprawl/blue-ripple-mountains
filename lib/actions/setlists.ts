"use server";

import { revalidatePath } from "next/cache";
import { createUntypedClient } from "@/lib/supabase/server-untyped";

export type SongInput = {
  set_number: number;
  position: number;
  title: string;
  duration_seconds: number | null;
};

export async function saveSetlistAction(args: {
  showId: string;
  bandId: string;
  bandSlug: string;
  showSlug: string;
  songs: SongInput[];
}) {
  const supabase = await createUntypedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required" };

  // Find or create setlist row owned by current user.
  let { data: setlist } = await supabase
    .from("setlists")
    .select("*")
    .eq("show_id", args.showId)
    .eq("band_id", args.bandId)
    .maybeSingle();

  if (!setlist) {
    const { data: created, error: createErr } = await supabase
      .from("setlists")
      .insert({
        show_id: args.showId,
        band_id: args.bandId,
        source: "user",
        created_by: user.id,
      })
      .select()
      .single();
    if (createErr || !created) return { error: createErr?.message ?? "Create failed" };
    setlist = created;
  }

  // Wipe & rewrite songs (simplest correct approach for an editor).
  const setlistId = setlist!.id;
  await supabase.from("setlist_songs").delete().eq("setlist_id", setlistId);

  if (args.songs.length > 0) {
    const { error } = await supabase.from("setlist_songs").insert(
      args.songs.map((s) => ({
        setlist_id: setlistId,
        set_number: s.set_number,
        position: s.position,
        title: s.title,
        duration_seconds: s.duration_seconds,
      })),
    );
    if (error) return { error: error.message };
  }

  await supabase.from("setlists").update({ updated_at: new Date().toISOString() }).eq("id", setlistId);

  revalidatePath(`/setlists/${args.bandSlug}/${args.showSlug}`);
  return { ok: true };
}
