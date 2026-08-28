create table era_news_cache (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id) on delete cascade,
  title text not null,
  date text not null,
  url text not null,
  created_at timestamptz not null default now(),
  unique (album_id, url)
);
create index era_news_cache_album_id_idx on era_news_cache(album_id);

alter table era_news_cache enable row level security;
create policy era_news_cache_public_read on era_news_cache for select using (true);
