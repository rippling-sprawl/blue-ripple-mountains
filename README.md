# blueripplemountains

The wook's concert book.

A Next.js + Supabase app for logging shows, setlists, and notes.

## Quick start

```bash
# 1. Install deps
npm install

# 2. Configure env
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Apply the schema in Supabase
# Either via the dashboard SQL editor, or:
#   supabase db push   (supabase-cli linked to ezeihnppbfwmgeffbbqt)
# Schema lives in supabase/migrations/0001_init.sql

# 4. Dev server
npm run dev
```

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind
- Supabase (auth: magic link; DB: Postgres with RLS)
- Vercel for hosting

## File map

```
app/                    Next.js routes
  /                     Home (nav hub + new-show dialog)
  /setlists             Band index
  /setlists/[band]      Per-band show list
  /setlists/[band]/[show]  Setlist + notes + links
  /my-shows             User's shows (auth-gated)
  /login                Magic-link sign-in
  /admin                Verification queue (admin-only)
  /auth/callback        Magic-link code exchange
  /api/notes            Autosave endpoint (used by sendBeacon flush)
  /api/shows/[id]       Nugs proxy

components/             React components
lib/
  actions/              Server Actions (mutations)
  queries/              Server-side data loaders (reads)
  supabase/             Supabase clients (browser, server, admin, untyped)
  dates.ts, slugify.ts  Shared helpers
supabase/migrations/    SQL migrations
```

## Verification checklist

- Sign in with `baker1797@gmail.com` and confirm `profiles.is_admin = true` on your row.
- Add show: any signed-in user adds a show → appears with an "Unverified" badge → admin verifies at `/admin`.
- Notes autosave: open a show on mobile, type, switch tabs mid-keystroke, return — content persisted (`navigator.sendBeacon` flushes on `pagehide`).
- Nugs enrichment (Billy Strings only): on a Billy show, click "Import from Nugs" with a container ID → tracks populated.
