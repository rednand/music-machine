alter table artists add column spotify_artist_id text;

create table artist_discography_cache (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists(id) on delete cascade,
  title text not null,
  release_year text not null,
  external_id text not null,
  created_at timestamptz not null default now(),
  unique (artist_id, external_id)
);
create index artist_discography_cache_artist_id_idx on artist_discography_cache(artist_id);

alter table artist_discography_cache enable row level security;
create policy artist_discography_cache_public_read on artist_discography_cache for select using (true);
