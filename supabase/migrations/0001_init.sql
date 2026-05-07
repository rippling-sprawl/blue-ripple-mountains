-- Blue Ripple Mountains schema
-- Idempotent: safe to re-run during development.

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- profiles: extends auth.users
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- bands
-- ----------------------------------------------------------------------------
create table if not exists public.bands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists bands_name_idx on public.bands (lower(name));

-- ----------------------------------------------------------------------------
-- shows
-- ----------------------------------------------------------------------------
create table if not exists public.shows (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  date_start date not null,
  date_end date,
  venue_name text,
  city text,
  state text,
  is_festival boolean not null default false,
  festival_name text,
  is_verified boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (date_start, venue_name)
);

create index if not exists shows_date_start_idx on public.shows (date_start desc);
create index if not exists shows_created_by_idx on public.shows (created_by);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shows_touch_updated_at on public.shows;
create trigger shows_touch_updated_at
  before update on public.shows
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- show_bands (many-to-many)
-- ----------------------------------------------------------------------------
create table if not exists public.show_bands (
  show_id uuid not null references public.shows(id) on delete cascade,
  band_id uuid not null references public.bands(id) on delete cascade,
  position smallint not null default 0,
  primary key (show_id, band_id)
);

create index if not exists show_bands_band_idx on public.show_bands (band_id);

-- ----------------------------------------------------------------------------
-- setlists + setlist_songs
-- ----------------------------------------------------------------------------
create table if not exists public.setlists (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  band_id uuid not null references public.bands(id) on delete cascade,
  source text,
  external_id text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (show_id, band_id)
);

drop trigger if exists setlists_touch_updated_at on public.setlists;
create trigger setlists_touch_updated_at
  before update on public.setlists
  for each row execute function public.touch_updated_at();

create table if not exists public.setlist_songs (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  set_number smallint not null default 1,
  position smallint not null,
  title text not null,
  duration_seconds int
);

create index if not exists setlist_songs_setlist_idx
  on public.setlist_songs (setlist_id, set_number, position);

-- ----------------------------------------------------------------------------
-- notes (per-user, one per show)
-- ----------------------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (show_id, user_id)
);

drop trigger if exists notes_touch_updated_at on public.notes;
create trigger notes_touch_updated_at
  before update on public.notes
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- note_tagged_friends
-- ----------------------------------------------------------------------------
create table if not exists public.note_tagged_friends (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  display_name text,
  check (user_id is not null or display_name is not null)
);

create index if not exists note_tagged_friends_note_idx on public.note_tagged_friends (note_id);

-- ----------------------------------------------------------------------------
-- show_links
-- ----------------------------------------------------------------------------
create table if not exists public.show_links (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  kind text not null check (kind in ('reddit', 'nugs', 'billybase', 'bmfsdb', 'other')),
  url text not null,
  label text
);

create index if not exists show_links_show_idx on public.show_links (show_id);

-- ----------------------------------------------------------------------------
-- helper: is_admin()
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.bands enable row level security;
alter table public.shows enable row level security;
alter table public.show_bands enable row level security;
alter table public.setlists enable row level security;
alter table public.setlist_songs enable row level security;
alter table public.notes enable row level security;
alter table public.note_tagged_friends enable row level security;
alter table public.show_links enable row level security;

-- profiles
drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all" on public.profiles for select using (true);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and is_admin = (select is_admin from public.profiles where id = auth.uid()));

-- bands: anonymous read, authenticated create, owner/admin update
drop policy if exists "bands_read_all" on public.bands;
create policy "bands_read_all" on public.bands for select using (true);

drop policy if exists "bands_insert_authed" on public.bands;
create policy "bands_insert_authed" on public.bands for insert
  to authenticated with check (true);

drop policy if exists "bands_update_admin" on public.bands;
create policy "bands_update_admin" on public.bands for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- shows
drop policy if exists "shows_read_all" on public.shows;
create policy "shows_read_all" on public.shows for select using (true);

drop policy if exists "shows_insert_authed" on public.shows;
create policy "shows_insert_authed" on public.shows for insert
  to authenticated with check (
    created_by = auth.uid()
    and (public.is_admin() or is_verified = false)
  );

drop policy if exists "shows_update_owner_or_admin" on public.shows;
create policy "shows_update_owner_or_admin" on public.shows for update
  to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (
    -- only admins can flip is_verified
    public.is_admin() or is_verified = (select is_verified from public.shows s where s.id = shows.id)
  );

drop policy if exists "shows_delete_admin" on public.shows;
create policy "shows_delete_admin" on public.shows for delete
  to authenticated using (public.is_admin());

-- show_bands
drop policy if exists "show_bands_read_all" on public.show_bands;
create policy "show_bands_read_all" on public.show_bands for select using (true);

drop policy if exists "show_bands_insert_authed" on public.show_bands;
create policy "show_bands_insert_authed" on public.show_bands for insert
  to authenticated with check (true);

drop policy if exists "show_bands_delete_admin_or_creator" on public.show_bands;
create policy "show_bands_delete_admin_or_creator" on public.show_bands for delete
  to authenticated using (
    public.is_admin()
    or exists (
      select 1 from public.shows s
      where s.id = show_bands.show_id and s.created_by = auth.uid()
    )
  );

-- setlists
drop policy if exists "setlists_read_all" on public.setlists;
create policy "setlists_read_all" on public.setlists for select using (true);

drop policy if exists "setlists_insert_authed" on public.setlists;
create policy "setlists_insert_authed" on public.setlists for insert
  to authenticated with check (created_by = auth.uid());

drop policy if exists "setlists_update_owner_or_admin" on public.setlists;
create policy "setlists_update_owner_or_admin" on public.setlists for update
  to authenticated using (created_by = auth.uid() or public.is_admin());

drop policy if exists "setlists_delete_owner_or_admin" on public.setlists;
create policy "setlists_delete_owner_or_admin" on public.setlists for delete
  to authenticated using (created_by = auth.uid() or public.is_admin());

-- setlist_songs (write-through via parent setlist ownership)
drop policy if exists "setlist_songs_read_all" on public.setlist_songs;
create policy "setlist_songs_read_all" on public.setlist_songs for select using (true);

drop policy if exists "setlist_songs_write_owner_or_admin" on public.setlist_songs;
create policy "setlist_songs_write_owner_or_admin" on public.setlist_songs for all
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.setlists sl
      where sl.id = setlist_songs.setlist_id and sl.created_by = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.setlists sl
      where sl.id = setlist_songs.setlist_id and sl.created_by = auth.uid()
    )
  );

-- notes (private to owner; admin can read for verification context)
drop policy if exists "notes_read_owner_or_admin" on public.notes;
create policy "notes_read_owner_or_admin" on public.notes for select
  to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "notes_write_self" on public.notes;
create policy "notes_write_self" on public.notes for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- note_tagged_friends
drop policy if exists "note_tags_read_owner_or_admin" on public.note_tagged_friends;
create policy "note_tags_read_owner_or_admin" on public.note_tagged_friends for select
  to authenticated using (
    public.is_admin()
    or exists (
      select 1 from public.notes n
      where n.id = note_tagged_friends.note_id and n.user_id = auth.uid()
    )
  );

drop policy if exists "note_tags_write_owner" on public.note_tagged_friends;
create policy "note_tags_write_owner" on public.note_tagged_friends for all
  to authenticated
  using (
    exists (
      select 1 from public.notes n
      where n.id = note_tagged_friends.note_id and n.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.notes n
      where n.id = note_tagged_friends.note_id and n.user_id = auth.uid()
    )
  );

-- show_links
drop policy if exists "show_links_read_all" on public.show_links;
create policy "show_links_read_all" on public.show_links for select using (true);

drop policy if exists "show_links_write_owner_or_admin" on public.show_links;
create policy "show_links_write_owner_or_admin" on public.show_links for all
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.shows s
      where s.id = show_links.show_id and s.created_by = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.shows s
      where s.id = show_links.show_id and s.created_by = auth.uid()
    )
  );
