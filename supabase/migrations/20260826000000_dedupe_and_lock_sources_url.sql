-- Causa raiz dos erros de "duplicate key" em credits/performance_records ao rodar os seeds
-- do RS500 mais de uma vez: a tabela sources nunca teve unicidade por url, então tentativas
-- repetidas (dos meus seeds e também da ingestão real do app) inseriam a mesma fonte várias
-- vezes. Como as consultas de credits/performance_records/curiosities/narrative_statement_sources
-- fazem um cross join com "sources s where s.url = '...'", múltiplas linhas de sources para a
-- mesma url faziam o mesmo (album_id, person_name, role) aparecer mais de uma vez dentro do
-- MESMO insert, violando a constraint.
--
-- Algumas dessas duplicatas já estão referenciadas por dados reais (créditos, curiosidades,
-- etc.) de álbuns já cadastrados — não são órfãs. Esta versão reaponta todas as referências
-- para a linha mais antiga de cada url (a "canônica"), só então apaga as duplicatas e trava
-- a url como única. Cada comando recalcula o mapeamento via CTE própria (nada de tabela
-- temporária, que não sobrevive entre comandos no pooler do Supabase).

with dedupe as (
  select s.id as dup_id, c.keep_id
  from sources s
  join (
    select url, min(id::text)::uuid as keep_id
    from sources
    group by url
    having count(*) > 1
  ) c on c.url = s.url
  where s.id <> c.keep_id
)
update credits
set source_id = dedupe.keep_id
from dedupe
where credits.source_id = dedupe.dup_id;

with dedupe as (
  select s.id as dup_id, c.keep_id
  from sources s
  join (
    select url, min(id::text)::uuid as keep_id
    from sources
    group by url
    having count(*) > 1
  ) c on c.url = s.url
  where s.id <> c.keep_id
)
update performance_records
set source_id = dedupe.keep_id
from dedupe
where performance_records.source_id = dedupe.dup_id;

with dedupe as (
  select s.id as dup_id, c.keep_id
  from sources s
  join (
    select url, min(id::text)::uuid as keep_id
    from sources
    group by url
    having count(*) > 1
  ) c on c.url = s.url
  where s.id <> c.keep_id
)
update curiosities
set source_id = dedupe.keep_id
from dedupe
where curiosities.source_id = dedupe.dup_id;

with dedupe as (
  select s.id as dup_id, c.keep_id
  from sources s
  join (
    select url, min(id::text)::uuid as keep_id
    from sources
    group by url
    having count(*) > 1
  ) c on c.url = s.url
  where s.id <> c.keep_id
)
update reviews
set source_id = dedupe.keep_id
from dedupe
where reviews.source_id = dedupe.dup_id;

with dedupe as (
  select s.id as dup_id, c.keep_id
  from sources s
  join (
    select url, min(id::text)::uuid as keep_id
    from sources
    group by url
    having count(*) > 1
  ) c on c.url = s.url
  where s.id <> c.keep_id
)
update historical_events
set source_id = dedupe.keep_id
from dedupe
where historical_events.source_id = dedupe.dup_id;

-- narrative_statement_sources tem unique(narrative_statement_id, source_id): reaponta só
-- onde não cria conflito; o que sobrar apontando pra duplicata é redundante e será apagado.
with dedupe as (
  select s.id as dup_id, c.keep_id
  from sources s
  join (
    select url, min(id::text)::uuid as keep_id
    from sources
    group by url
    having count(*) > 1
  ) c on c.url = s.url
  where s.id <> c.keep_id
)
update narrative_statement_sources nss
set source_id = dedupe.keep_id
from dedupe
where nss.source_id = dedupe.dup_id
and not exists (
  select 1 from narrative_statement_sources nss2
  where nss2.narrative_statement_id = nss.narrative_statement_id
  and nss2.source_id = dedupe.keep_id
);

with dedupe as (
  select s.id as dup_id, c.keep_id
  from sources s
  join (
    select url, min(id::text)::uuid as keep_id
    from sources
    group by url
    having count(*) > 1
  ) c on c.url = s.url
  where s.id <> c.keep_id
)
delete from narrative_statement_sources nss
using dedupe
where nss.source_id = dedupe.dup_id;

with dedupe as (
  select s.id as dup_id, c.keep_id
  from sources s
  join (
    select url, min(id::text)::uuid as keep_id
    from sources
    group by url
    having count(*) > 1
  ) c on c.url = s.url
  where s.id <> c.keep_id
)
delete from sources s
using dedupe
where s.id = dedupe.dup_id;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sources_url_key') then
    alter table sources add constraint sources_url_key unique (url);
  end if;
end $$;
