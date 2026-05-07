import Link from "next/link";
import { notFound } from "next/navigation";
import { getBandBySlug, getShowBySlug } from "@/lib/queries/shows";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { SetlistTable } from "@/components/SetlistTable";
import { SetlistEditor } from "@/components/SetlistEditor";
import { NotesEditor } from "@/components/NotesEditor";
import { FriendTagger } from "@/components/FriendTagger";
import { ShowLinksEditor } from "@/components/ShowLinksEditor";
import { NugsImportButton } from "@/components/NugsImportButton";
import { formatShowDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

type SongRow = Database["public"]["Tables"]["setlist_songs"]["Row"];
type LinkRow = Database["public"]["Tables"]["show_links"]["Row"];
type NoteRow = Database["public"]["Tables"]["notes"]["Row"];
type TagRow = Database["public"]["Tables"]["note_tagged_friends"]["Row"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ band: string; show: string }>;
}) {
  const { show } = await params;
  const s = await getShowBySlug(show);
  return {
    title: s ? `${s.venue_name ?? s.festival_name ?? "Show"} — ${s.date_start}` : "Show",
  };
}

export default async function ShowPage({
  params,
}: {
  params: Promise<{ band: string; show: string }>;
}) {
  const { band, show } = await params;
  const [bandRow, showRow] = await Promise.all([
    getBandBySlug(band),
    getShowBySlug(show),
  ]);
  if (!bandRow || !showRow) notFound();
  if (!showRow.bands.some((b) => b.band.id === bandRow.id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const setlistRes = await supabase
    .from("setlists")
    .select("*, setlist_songs(*)")
    .eq("show_id", showRow.id)
    .eq("band_id", bandRow.id)
    .maybeSingle();

  const linksRes = await supabase
    .from("show_links")
    .select("*")
    .eq("show_id", showRow.id);

  const setlist = setlistRes.data as unknown as
    | { setlist_songs: SongRow[] }
    | null;
  const links = (linksRes.data as unknown as LinkRow[] | null) ?? [];
  const songs = setlist?.setlist_songs ?? [];

  let myNote: NoteRow | null = null;
  let myTags: TagRow[] = [];
  let isAdmin = false;
  if (user) {
    const noteRes = await supabase
      .from("notes")
      .select("*")
      .eq("show_id", showRow.id)
      .eq("user_id", user.id)
      .maybeSingle();
    myNote = (noteRes.data as unknown as NoteRow | null) ?? null;
    if (myNote) {
      const tagsRes = await supabase
        .from("note_tagged_friends")
        .select("*")
        .eq("note_id", myNote.id);
      myTags = (tagsRes.data as unknown as TagRow[] | null) ?? [];
    }
    const profRes = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin =
      (profRes.data as unknown as { is_admin: boolean } | null)?.is_admin ?? false;
  }

  const canEditLinks = !!user && (isAdmin || user.id === showRow.created_by);

  return (
    <div className="space-y-8 pt-4">
      <div>
        <Link href={`/setlists/${band}`} className="text-sm text-accent hover:underline">
          ← {bandRow.name}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {showRow.is_festival && showRow.festival_name
            ? showRow.festival_name
            : showRow.venue_name ?? "—"}
        </h1>
        <p className="text-ink-muted">
          {formatShowDate(showRow.date_start, showRow.date_end)}
          {showRow.venue_name && showRow.is_festival ? ` · ${showRow.venue_name}` : ""}
          {(showRow.city || showRow.state) && (
            <> · {[showRow.city, showRow.state].filter(Boolean).join(", ")}</>
          )}
          {!showRow.is_verified && (
            <span className="ml-2 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-accent">
              Unverified
            </span>
          )}
        </p>
        {showRow.bands.length > 1 && (
          <p className="mt-2 text-sm text-ink-muted">
            with{" "}
            {showRow.bands
              .filter((b) => b.band.id !== bandRow.id)
              .map((b) => b.band.name)
              .join(", ")}
          </p>
        )}
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Setlist</h2>
          <div className="flex flex-wrap gap-2">
            {bandRow.slug === "billy-strings" && user && (
              <NugsImportButton
                showId={showRow.id}
                bandId={bandRow.id}
                bandSlug={band}
                showSlug={show}
                defaultContainerId={
                  links
                    .find((l) => l.kind === "nugs")
                    ?.url.match(/\/release\/(\d+)/)?.[1] ?? ""
                }
              />
            )}
            <SetlistEditor
              showId={showRow.id}
              bandId={bandRow.id}
              bandSlug={band}
              showSlug={show}
              initial={songs}
              signedIn={!!user}
            />
          </div>
        </div>
        <SetlistTable songs={songs} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Notes</h2>
        <NotesEditor
          showId={showRow.id}
          initial={myNote?.content ?? ""}
          signedIn={!!user}
        />
        {user && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-ink-muted">Who was there</h3>
            <FriendTagger
              showId={showRow.id}
              bandSlug={band}
              showSlug={show}
              initial={myTags.map((t) => ({
                user_id: t.user_id,
                display_name: t.display_name,
              }))}
              signedIn
            />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Links</h2>
          <ShowLinksEditor
            showId={showRow.id}
            bandSlug={band}
            showSlug={show}
            initial={links.map((l) => ({ kind: l.kind, url: l.url, label: l.label }))}
            canEdit={canEditLinks}
          />
        </div>
        {links.length === 0 ? (
          <p className="text-sm text-ink-muted">No links yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {links.map((l) => (
              <li key={l.id}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  {l.label ?? l.kind}
                </a>{" "}
                <span className="text-xs text-ink-dim">({l.kind})</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
