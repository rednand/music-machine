create table list_placements (
  id uuid primary key default gen_random_uuid(),
  list_slug text not null,
  list_name text not null,
  "position" integer not null,
  artist_name text not null,
  album_title text not null,
  normalized_artist text not null,
  normalized_title text not null,
  created_at timestamptz not null default now(),
  unique (list_slug, "position")
);

create index list_placements_match_idx on list_placements (normalized_artist, normalized_title);
