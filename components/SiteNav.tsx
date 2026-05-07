import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";

export async function SiteNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-line bg-bg-surface/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          <span className="text-accent">▲</span>{" "}
          <span>Blue Ripple Mountains</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-ink-muted">
          <Link href="/setlists" className="hover:text-ink">Setlists</Link>
          <Link href="/my-shows" className="hover:text-ink">My Shows</Link>
          {user ? (
            <SignOutButton email={user.email ?? ""} />
          ) : (
            <Link href="/login" className="rounded-md bg-accent/15 px-3 py-1.5 text-accent hover:bg-accent/25">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
