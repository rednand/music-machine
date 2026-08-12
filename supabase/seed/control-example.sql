with new_source as (
  insert into sources (type, title, url, license_type, attribution_text)
  values (
    'encyclopedic',
    'Control (album) - Wikipedia',
    'https://en.wikipedia.org/wiki/Control_(Janet_Jackson_album)',
    'CC-BY-SA-4.0',
    'Wikipedia contributors, CC BY-SA 4.0'
  )
  returning id
),
new_artist as (
  insert into artists (name, slug, active_from)
  values ('Janet Jackson', 'janet-jackson', '1982-01-01')
  returning id
),
new_album as (
  insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
  select id, 'Control', 'janet-jackson-control', '1986-02-04', 'Funk / Soul', 'A&M Records', 9,
         'https://upload.wikimedia.org/wikipedia/en/2/2e/Control_janet_jackson_album.jpg'
  from new_artist
  returning id, artist_id
),
new_article_moment as (
  insert into narrative_articles (album_id, facet, status, language, generated_at)
  select id, 'artist_moment', 'published', 'pt-BR', now() from new_album
  returning id
),
new_article_world as (
  insert into narrative_articles (album_id, facet, status, language, generated_at)
  select id, 'world_context', 'published', 'pt-BR', now() from new_album
  returning id
),
new_article_scene as (
  insert into narrative_articles (album_id, facet, status, language, generated_at)
  select id, 'musical_scene', 'published', 'pt-BR', now() from new_album
  returning id
),
new_article_legacy as (
  insert into narrative_articles (album_id, facet, status, language, generated_at)
  select id, 'reception_vs_legacy', 'published', 'pt-BR', now() from new_album
  returning id
),
statement_moment as (
  insert into narrative_statements (narrative_article_id, text, kind, "order")
  select id,
         'Em fevereiro de 1986, Janet Jackson tinha 19 anos e buscava se libertar da influência do pai e da comparação constante com Michael Jackson.',
         'interpretation', 0
  from new_article_moment
  returning id
),
statement_world as (
  insert into narrative_statements (narrative_article_id, text, kind, "order")
  select id, 'O desastre do ônibus espacial Challenger, em 28 de janeiro de 1986, chocou os Estados Unidos poucos dias antes do lançamento de Control.', 'fact', 0
  from new_article_world
  returning id
),
statement_scene as (
  insert into narrative_statements (narrative_article_id, text, kind, "order")
  select id, 'Enquanto Madonna consolidava sua carreira e Whitney Houston dominava as paradas, Janet lançou um álbum que ajudou a moldar o R&B e o pop do fim dos anos 80.', 'interpretation', 0
  from new_article_scene
  returning id
),
statement_legacy as (
  insert into narrative_statements (narrative_article_id, text, kind, "order")
  select id, 'Control é hoje visto como o álbum que redefiniu a imagem artística de Janet Jackson.', 'critical_opinion', 0
  from new_article_legacy
  returning id
)
insert into narrative_statement_sources (narrative_statement_id, source_id)
select statement_moment.id, new_source.id from statement_moment, new_source
union all
select statement_world.id, new_source.id from statement_world, new_source
union all
select statement_scene.id, new_source.id from statement_scene, new_source
union all
select statement_legacy.id, new_source.id from statement_legacy, new_source;

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'Diz-se que Janet gravou várias faixas em segredo para evitar interferência da família.', 'unconfirmed', s.id
from albums a, sources s
where a.slug = 'janet-jackson-control'
limit 1;

insert into credits (album_id, person_name, role, source_id)
(select a.id, 'Jimmy Jam', 'Produtor', s.id from albums a, sources s where a.slug = 'janet-jackson-control' limit 1)
union all
(select a.id, 'Terry Lewis', 'Produtor', s.id from albums a, sources s where a.slug = 'janet-jackson-control' limit 1);

insert into performance_records (album_id, kind, label, value, source_id)
(select a.id, 'chart_position', 'Billboard 200', '1', s.id from albums a, sources s where a.slug = 'janet-jackson-control' limit 1)
union all
(select a.id, 'certification', 'RIAA (Estados Unidos)', '5x Platina', s.id from albums a, sources s where a.slug = 'janet-jackson-control' limit 1);
