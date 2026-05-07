// One-time merge: assign Nugs container IDs to Billy Strings shows in the DB
// by date-matching against bmfs/everything.json (or ./everything.json).
//
// Storage: writes a `show_links` row of kind='nugs' per matched show, with
// url = https://play.nugs.net/release/{containerID}. NugsImportButton extracts
// the container ID from this link to enable one-click setlist import.
//
// Run from project root: node scripts/merge-nugs-containers.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1].trim();

const supabaseUrl = get("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = get("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const sb = createClient(supabaseUrl, serviceKey);

const jsonPath = existsSync("./everything.json") ? "./everything.json" : "./bmfs/everything.json";
const raw = readFileSync(jsonPath, "utf8");
const m = raw.match(/^jsonp_[\w]+\((.*)\);?\s*$/s);
if (!m) { console.error("everything.json is not in expected jsonp wrapper"); process.exit(1); }
const containers = JSON.parse(m[1]).Response.containers.filter((c) => c.containerTypeStr === "Show");

const byDate = new Map();
for (const c of containers) {
  const iso = c.performanceDateFormatted?.replace(/\//g, "-");
  if (!iso) continue;
  if (!byDate.has(iso)) byDate.set(iso, []);
  byDate.get(iso).push(c);
}

const { data: band, error: bandErr } = await sb
  .from("bands").select("id, name").eq("slug", "billy-strings").maybeSingle();
if (bandErr || !band) { console.error("Billy Strings band not found"); process.exit(1); }

const { data: sb_rows } = await sb.from("show_bands").select("show_id").eq("band_id", band.id);
const showIds = sb_rows.map((r) => r.show_id);
const { data: shows } = await sb
  .from("shows").select("id, slug, date_start, venue_name").in("id", showIds);

const { data: existingLinks } = await sb
  .from("show_links").select("show_id").eq("kind", "nugs").in("show_id", showIds);
const haveLink = new Set(existingLinks.map((l) => l.show_id));

const summary = { matched: 0, skipped_existing: 0, ambiguous_resolved: 0, unmatched: [] };
const inserts = [];

for (const s of shows) {
  if (haveLink.has(s.id)) { summary.skipped_existing++; continue; }
  const candidates = byDate.get(s.date_start) ?? [];
  if (candidates.length === 0) { summary.unmatched.push(`${s.date_start} ${s.venue_name}`); continue; }
  let pick;
  if (candidates.length === 1) {
    pick = candidates[0];
  } else {
    const nonAudio = candidates.filter((c) => !/ Audio$/.test(c.venueCity ?? ""));
    pick = (nonAudio[0] ?? candidates[0]);
    summary.ambiguous_resolved++;
  }
  inserts.push({
    show_id: s.id,
    kind: "nugs",
    url: `https://play.nugs.net/release/${pick.containerID}`,
    label: "Nugs",
  });
  summary.matched++;
}

if (inserts.length > 0) {
  const { error } = await sb.from("show_links").insert(inserts);
  if (error) { console.error("Insert failed:", error.message); process.exit(1); }
}

console.log(JSON.stringify(summary, null, 2));
console.log(`Inserted ${inserts.length} nugs link rows.`);
