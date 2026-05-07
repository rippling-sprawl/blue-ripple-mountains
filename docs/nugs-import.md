# Nugs bulk import

Two scripts under `scripts/` populate Billy Strings setlists from Nugs without anyone clicking through the UI. Both are idempotent — safe to re-run as new shows are added in Supabase or new releases land on Nugs.

## Source data

`everything.json` (also at `bmfs/everything.json`) is a JSONP dump of the Nugs catalog `containersAll` endpoint. It is wrapped in `jsonp_nn17(...)` and contains every Billy Strings container the Nugs site knows about (releases, including non-show items — the script filters to `containerTypeStr === "Show"`).

To refresh: re-pull the catalog from Nugs and overwrite the file. The scripts read whichever copy exists at the project root, falling back to `bmfs/everything.json`.

The per-show track listing (titles, set numbers, durations) is **not** in `everything.json` — it lives at `https://catalog.nugs.net/api/v1/shows/{containerID}` and is fetched on demand by the second script.

## Storage model

Container IDs are stored as `show_links` rows of `kind = 'nugs'` with URL `https://play.nugs.net/release/{containerID}`. Why a link row instead of a column on `shows`:

- The schema already supports `kind = 'nugs'` and the in-app import flow writes the same row.
- No DDL/migration needed.
- The container ID is recoverable from the URL with `/\/release\/(\d+)/`.

Setlists themselves go into `setlists` (one row per show/band) and `setlist_songs` (one row per track). `setlist_songs.duration_seconds` is what `components/SetlistTable.tsx` uses for the length-based cell coloring.

## Prerequisites

- `.env.local` must contain `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The service role key bypasses RLS — required because there is no auth session in a script.
- `everything.json` (or `bmfs/everything.json`) present at project root.
- `npm install` has been run so `@supabase/supabase-js` resolves.

## scripts/merge-nugs-containers.mjs

Walks every Billy Strings show in the DB and inserts a `show_links` row pointing at its Nugs container.

```bash
node scripts/merge-nugs-containers.mjs
```

**Match logic:**
- Exact date match: DB `shows.date_start` (`YYYY-MM-DD`) vs container `performanceDateFormatted` (`YYYY/MM/DD`, normalized).
- When multiple containers share a date, prefer the one whose `venueCity` does **not** end in ` Audio` — Nugs publishes both a video release and an audio-only release for some shows, both with the same setlist; the video container is treated as canonical.
- Shows that already have a `kind = 'nugs'` link are skipped (idempotent).

**Output:** JSON summary of `matched`, `skipped_existing`, `ambiguous_resolved`, and `unmatched` shows. Unmatched shows are usually future dates not yet in the Nugs catalog; re-run after refreshing `everything.json`.

## scripts/import-nugs-setlists.mjs

For every Billy Strings show that has a Nugs link, fetches `catalog.nugs.net/api/v1/shows/{containerID}` and writes the tracks into `setlists` + `setlist_songs`.

```bash
node scripts/import-nugs-setlists.mjs
```

Mirrors `lib/actions/nugsImport.ts` but uses the service role key instead of an authenticated user. Notable behavior:

- Shows whose `setlists` row already has any `setlist_songs` are **skipped** to preserve manual edits. (The interactive import action overwrites — this script does not, by design.)
- Shows without a Nugs link are skipped silently (run the merge script first).
- `set_number = 4` is rewritten to `99` to match the encoding used elsewhere in the app for "Encore".
- Failures (HTTP errors, JSON parse errors, insert errors) are collected in `summary.failed` rather than aborting the run.

**Output:** JSON summary with `imported`, `skipped_no_link`, `skipped_existing`, `failed`.

## Re-running

Both scripts are designed to be re-run any time. Typical triggers:

| Situation | Steps |
|---|---|
| New Billy Strings show added in the app | `node scripts/merge-nugs-containers.mjs` → if matched, `node scripts/import-nugs-setlists.mjs` |
| New release on Nugs (e.g., a previously-unmatched future show) | Refresh `everything.json` → run both scripts |
| You want to refresh a setlist Nugs has updated | Delete the existing `setlist_songs` rows for that setlist (the script skips on non-empty), then run import |

## Limitations

- **Billy Strings only.** Both scripts hardcode the `billy-strings` band slug. The pattern would generalize, but each artist has its own catalog dump and quirks.
- `everything.json` is a manual snapshot. There is no scheduled refresh.
- The audio-vs-video container heuristic (` Audio` suffix on `venueCity`) is empirical, not documented by Nugs. If they change the convention, the merge script may pick the wrong container for ambiguous dates.
- Skipping shows with existing setlist songs means re-imports require manual cleanup. Trade-off: protects manual edits.
