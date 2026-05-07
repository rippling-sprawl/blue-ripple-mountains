import Link from "next/link";
import { listBands } from "@/lib/queries/shows";

export const metadata = { title: "Setlists — Blue Ripple Mountains" };
export const dynamic = "force-dynamic";

export default async function SetlistsIndex() {
  const bands = await listBands();
  bands.sort((a, b) => b.show_count - a.show_count || a.name.localeCompare(b.name));

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Setlists</h1>
        <p className="text-ink-muted">Browse shows by band.</p>
      </div>
      {bands.length === 0 ? (
        <p className="rounded-md border border-line bg-bg-surface p-6 text-center text-ink-muted">
          No bands yet. Run the import script or add a show.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {bands.map((b) => (
            <li key={b.id}>
              <Link
                href={`/setlists/${b.slug}`}
                className="flex items-center justify-between rounded-md border border-line bg-bg-surface px-4 py-3 transition hover:border-accent/50 hover:bg-bg-raised"
              >
                <span className="font-medium">{b.name}</span>
                <span className="text-sm text-ink-muted">{b.show_count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
