import type { Database } from "@/lib/supabase/database.types";

type Song = Database["public"]["Tables"]["setlist_songs"]["Row"];

const SHORT_SECONDS = 3 * 60;
const MEDIAN_SECONDS = 4 * 60;
const LONG_SECONDS = 18 * 60;
const SHORT_COLOR = "74, 144, 226";
const LONG_COLOR = "245, 166, 35";

function durationColor(seconds: number): string {
  if (seconds <= 0) return "transparent";
  if (seconds <= MEDIAN_SECONDS) {
    const t = Math.max(0, Math.min(1, (MEDIAN_SECONDS - seconds) / (MEDIAN_SECONDS - SHORT_SECONDS)));
    return `rgba(${SHORT_COLOR}, ${t})`;
  }
  const t = Math.max(0, Math.min(1, (seconds - MEDIAN_SECONDS) / (LONG_SECONDS - MEDIAN_SECONDS)));
  return `rgba(${LONG_COLOR}, ${t})`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function setLabel(setNumber: number): string {
  if (setNumber === 0) return "Set";
  if (setNumber >= 99) return "Encore";
  return `Set ${setNumber}`;
}

export function SetlistTable({ songs }: { songs: Song[] }) {
  if (songs.length === 0) {
    return (
      <p className="rounded-md border border-line bg-bg-surface p-6 text-center text-ink-muted">
        No songs listed yet.
      </p>
    );
  }

  const bySet = new Map<number, Song[]>();
  for (const s of songs) {
    const k = s.set_number ?? 0;
    if (!bySet.has(k)) bySet.set(k, []);
    bySet.get(k)!.push(s);
  }

  const keys = [...bySet.keys()].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {keys.map((setNum) => {
        const items = bySet.get(setNum)!.slice().sort((a, b) => a.position - b.position);
        return (
          <div key={setNum}>
            <div className="rounded-t-md border border-line bg-bg-raised px-3 py-2 font-semibold">
              {setLabel(setNum)}
            </div>
            <div className="overflow-hidden rounded-b-md border border-t-0 border-line">
              <table className="w-full text-sm">
                <thead className="bg-bg-raised text-ink-muted">
                  <tr>
                    <th className="w-14 px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Title</th>
                    <th className="w-24 px-3 py-2 text-center">Length</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((song, i) => (
                    <tr key={song.id} className="border-t border-line">
                      <td className="px-3 py-2 text-ink-muted">{i + 1}</td>
                      <td className="px-3 py-2 break-words">{song.title}</td>
                      <td
                        className="px-3 py-2 text-center font-bold"
                        style={{
                          backgroundColor: durationColor(song.duration_seconds ?? 0),
                        }}
                      >
                        {formatDuration(song.duration_seconds)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
