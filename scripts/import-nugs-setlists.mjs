// One-time bulk import: for every Billy Strings show that has a Nugs link,
// fetch the setlist from catalog.nugs.net and populate setlists + setlist_songs.
// Mirrors lib/actions/nugsImport.ts but runs with the service role key
// (bypasses RLS) so it doesn't need an auth session.
//
// Skips shows that already have a setlist with songs to preserve manual edits.
//
// Run from project root: node scripts/import-nugs-setlists.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1].trim();
const sb = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));

const NUGS_API = "https://catalog.nugs.net/api/v1/shows/";

const { data: band } = await sb.from("bands").select("id").eq("slug", "billy-strings").single();
const { data: sb_rows } = await sb.from("show_bands").select("show_id").eq("band_id", band.id);
const showIds = sb_rows.map((r) => r.show_id);

const { data: shows } = await sb
  .from("shows").select("id, slug, date_start, venue_name").in("id", showIds);
const { data: links } = await sb
  .from("show_links").select("show_id, url").eq("kind", "nugs").in("show_id", showIds);

const linkByShow = new Map();
for (const l of links) {
  const id = l.url.match(/\/release\/(\d+)/)?.[1];
  if (id) linkByShow.set(l.show_id, id);
}

const { data: existingSetlists } = await sb
  .from("setlists").select("id, show_id").eq("band_id", band.id).in("show_id", showIds);
const setlistByShow = new Map(existingSetlists.map((s) => [s.show_id, s.id]));

const { data: existingSongs } = await sb
  .from("setlist_songs").select("setlist_id").in("setlist_id", existingSetlists.map((s) => s.id));
const setlistsWithSongs = new Set(existingSongs.map((s) => s.setlist_id));

const summary = { imported: [], skipped_no_link: [], skipped_existing: [], failed: [] };

for (const s of shows) {
  const containerId = linkByShow.get(s.id);
  if (!containerId) { summary.skipped_no_link.push(`${s.date_start} ${s.venue_name}`); continue; }
  const existingSetlistId = setlistByShow.get(s.id);
  if (existingSetlistId && setlistsWithSongs.has(existingSetlistId)) {
    summary.skipped_existing.push(`${s.date_start} ${s.venue_name}`);
    continue;
  }

  const tag = `${s.date_start} ${s.venue_name} (#${containerId})`;
  let payload;
  try {
    const r = await fetch(NUGS_API + containerId, {
      headers: { "User-Agent": "blueripplemountains/1.0" },
    });
    if (!r.ok) { summary.failed.push(`${tag}: HTTP ${r.status}`); continue; }
    payload = await r.json();
  } catch (err) {
    summary.failed.push(`${tag}: ${err.message}`);
    continue;
  }

  const tracks = payload?.Response?.tracks ?? [];

  let setlistId = existingSetlistId;
  if (!setlistId) {
    const ins = await sb.from("setlists").insert({
      show_id: s.id, band_id: band.id,
      source: "nugs", external_id: containerId,
    }).select("id").single();
    if (ins.error) { summary.failed.push(`${tag}: setlist insert ${ins.error.message}`); continue; }
    setlistId = ins.data.id;
  } else {
    await sb.from("setlists").update({ source: "nugs", external_id: containerId }).eq("id", setlistId);
    await sb.from("setlist_songs").delete().eq("setlist_id", setlistId);
  }

  const rows = tracks
    .filter((t) => t.songTitle)
    .map((t, i) => ({
      setlist_id: setlistId,
      set_number: typeof t.setNum === "number" ? (t.setNum === 4 ? 99 : t.setNum) : 1,
      position: t.trackNum ?? i + 1,
      title: t.songTitle,
      duration_seconds:
        typeof t.totalRunningTime === "number"
          ? Math.round(t.totalRunningTime)
          : Number(t.totalRunningTime) || null,
    }));
  if (rows.length > 0) {
    const { error } = await sb.from("setlist_songs").insert(rows);
    if (error) { summary.failed.push(`${tag}: songs insert ${error.message}`); continue; }
  }

  summary.imported.push(`${tag}: ${rows.length} tracks`);
}

console.log(JSON.stringify(summary, null, 2));
