create extension if not exists "pgcrypto";

create type source_type as enum (
  'official_primary',
  'music_database',
  'journalistic',
  'interview',
  'specialized_publication',
  'encyclopedic'
);

create type historical_event_category as enum (
  'politics',
  'culture',
  'technology',
  'music',
  'film',
  'television',
  'society',
  'fashion',
  'historical'
);

create type curiosity_status as enum ('confirmed', 'unconfirmed', 'disputed');

create type narrative_facet as enum (
  'artist_moment',
  'world_context',
  'musical_scene',
  'reception_vs_legacy'
);

create type narrative_status as enum ('pending', 'published', 'failed_validation', 'stale');

create type statement_kind as enum ('fact', 'interpretation', 'critical_opinion', 'unconfirmed');

create type recommendation_reason as enum (
  'same_era',
  'same_genre_movement',
  'direct_influence',
  'historical_importance'
);

create table sources (
  id uuid primary key default gen_random_uuid(),
  type source_type not null,
  title text not null,
  url text not null,
  published_or_retrieved_date date,
  license_type text,
  attribution_text text,
  created_at timestamptz not null default now()
);

create table artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active_from date,
  active_to date,
  created_at timestamptz not null default now(),
  constraint active_dates_order check (active_to is null or active_from is null or active_to >= active_from)
);

create table albums (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists(id),
  title text not null,
  slug text not null unique,
  release_date date not null,
  genre text,
  label text,
  duration_seconds integer,
  track_count integer,
  cover_art_url text,
  created_at timestamptz not null default now()
);
create index albums_release_date_idx on albums(release_date);
create index albums_artist_id_idx on albums(artist_id);

create table tracks (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id),
  title text not null,
  track_number integer,
  duration_seconds integer
);
create index tracks_album_id_idx on tracks(album_id);

create table credits (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references albums(id),
  track_id uuid references tracks(id),
  person_name text not null,
  role text not null,
  source_id uuid not null references sources(id)
);
create index credits_album_id_idx on credits(album_id);

create table performance_records (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id),
  kind text not null check (kind in ('chart_position', 'certification', 'sales_figure', 'award')),
  label text not null,
  value text not null,
  record_date date,
  source_id uuid not null references sources(id)
);
create index performance_records_album_id_idx on performance_records(album_id);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id),
  publication text not null,
  rating_or_verdict text,
  published_date date,
  stance text not null check (stance in ('contemporary', 'retrospective')),
  summary text not null,
  source_url text not null,
  source_id uuid not null references sources(id)
);
create index reviews_album_id_idx on reviews(album_id);

create table historical_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  category historical_event_category not null,
  relevance_score real not null default 0.5,
  summary text not null,
  source_id uuid not null references sources(id)
);
create index historical_events_date_idx on historical_events(event_date);
create index historical_events_category_idx on historical_events(category);

create table curiosities (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id),
  summary text not null,
  status curiosity_status not null default 'unconfirmed',
  source_id uuid not null references sources(id)
);
create index curiosities_album_id_idx on curiosities(album_id);

create table influences (
  id uuid primary key default gen_random_uuid(),
  from_album_id uuid references albums(id),
  from_artist_id uuid references artists(id),
  to_album_id uuid references albums(id),
  to_artist_id uuid references artists(id),
  explanation text not null,
  source_id uuid not null references sources(id),
  constraint influence_from_defined check (from_album_id is not null or from_artist_id is not null),
  constraint influence_to_defined check (to_album_id is not null or to_artist_id is not null)
);
create index influences_from_album_idx on influences(from_album_id);
create index influences_to_album_idx on influences(to_album_id);

create table recommendations (
  id uuid primary key default gen_random_uuid(),
  subject_album_id uuid not null references albums(id),
  recommended_album_id uuid not null references albums(id),
  reason recommendation_reason not null,
  explanation text not null,
  unique (subject_album_id, recommended_album_id)
);
create index recommendations_subject_album_idx on recommendations(subject_album_id);

create table narrative_articles (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id),
  facet narrative_facet not null,
  status narrative_status not null default 'pending',
  language text not null default 'pt-BR',
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (album_id, facet)
);
create index narrative_articles_album_id_idx on narrative_articles(album_id);

create table narrative_statements (
  id uuid primary key default gen_random_uuid(),
  narrative_article_id uuid not null references narrative_articles(id) on delete cascade,
  text text not null,
  kind statement_kind not null,
  "order" integer not null default 0
);
create index narrative_statements_article_idx on narrative_statements(narrative_article_id);

create table narrative_statement_sources (
  id uuid primary key default gen_random_uuid(),
  narrative_statement_id uuid not null references narrative_statements(id) on delete cascade,
  source_id uuid not null references sources(id),
  unique (narrative_statement_id, source_id)
);

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'sources', 'artists', 'albums', 'tracks', 'credits', 'performance_records',
    'reviews', 'historical_events', 'curiosities', 'influences', 'recommendations',
    'narrative_articles', 'narrative_statements', 'narrative_statement_sources'
  ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for select using (true)',
      t || '_public_read', t
    );
  end loop;
end $$;
