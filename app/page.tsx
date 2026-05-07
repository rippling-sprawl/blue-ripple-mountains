import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewShowDialog } from "@/components/NewShowDialog";

export const dynamic = "force-dynamic";

const navTiles = [
  {
    href: "/setlists",
    title: "Setlists",
    blurb: "Browse shows by band — setlists, durations, venues.",
  },
  {
    href: "/my-shows",
    title: "My Shows",
    blurb: "Every concert I've been to, in one place.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-12">
      <section className="space-y-3 pt-8">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          The wook&apos;s concert book.
        </h1>
        <p className="max-w-prose text-ink-muted">
          A living log of every show I&apos;ve been to — bands, setlists, notes,
          and the people who were there.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {navTiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group rounded-lg border border-line bg-bg-surface p-6 transition hover:border-accent/50 hover:bg-bg-raised"
          >
            <h2 className="text-xl font-medium">
              {tile.title}
              <span className="ml-1 text-accent transition group-hover:translate-x-1">
                →
              </span>
            </h2>
            <p className="mt-2 text-ink-muted">{tile.blurb}</p>
          </Link>
        ))}
        <NewShowDialog signedIn={!!user} />
      </section>
    </div>
  );
}
