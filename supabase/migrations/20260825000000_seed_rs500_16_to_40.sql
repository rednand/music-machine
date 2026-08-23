-- Popula os álbuns #16 a #40 da lista RS500_Greatest_Albums.xlsx (Rolling Stone).
-- Mesma metodologia da migration 20260824000000: ficha técnica (faixas, duração, capa) obtida
-- da API do Deezer (edição original, não remasters/deluxe, quando identificável), datas de
-- lançamento e selo conferidos manualmente quando a Deezer só tinha metadado de reedição.
-- Conteúdo narrativo, créditos e curiosidades escritos manualmente com base em fatos amplamente
-- documentados. O card "Tecnologia" fala da tecnologia do MUNDO no ano do álbum, não da gravação.

-- =========================================================================
-- #16 The Clash - London Calling (1979)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'London Calling - Wikipedia', 'https://en.wikipedia.org/wiki/London_Calling', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('The Clash', 'the-clash', '1976-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'London Calling', 'the-clash-london-calling', '1979-12-14', 'Punk Rock', 'CBS', 19,
       'https://cdn-images.dzcdn.net/images/cover/1dbb7d7bee08ed2b18deabffd675bd36/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'the-clash'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('London Calling', 1, 199),
  ('Brand New Cadillac', 2, 128),
  ('Jimmy Jazz', 3, 235),
  ('Hateful', 4, 167),
  ($q$Rudie Can't Fail$q$, 5, 207),
  ('Spanish Bombs', 6, 198),
  ('The Right Profile', 7, 233),
  ('Lost in the Supermarket', 8, 227),
  ('Clampdown', 9, 230),
  ('The Guns of Brixton', 10, 192),
  ($q$Wrong 'Em Boyo$q$, 11, 190),
  ('Death or Glory', 12, 235),
  ('Koka Kola', 13, 109),
  ('The Card Cheat', 14, 230),
  ($q$Lover's Rock$q$, 15, 243),
  ('Four Horsemen', 16, 180),
  ($q$I'm Not Down$q$, 17, 180),
  ('Revolution Rock', 18, 336),
  ('Train in Vain (Stand by Me)', 19, 189)
) as t(title, track_number, duration_seconds)
where a.slug = 'the-clash-london-calling'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Guy Stevens', 'Produção')) as c(person_name, role)
where a.slug = 'the-clash-london-calling' and s.url = 'https://en.wikipedia.org/wiki/London_Calling'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'UK Albums Chart', '#9'), ('certification', 'RIAA (Estados Unidos)', 'Platina')) as p(kind, label, value)
where a.slug = 'the-clash-london-calling' and s.url = 'https://en.wikipedia.org/wiki/London_Calling';

insert into curiosities (album_id, summary, status, source_id)
select a.id, $q$A gravadora insistiu em vender o disco duplo pelo preço de um álbum simples, decisão que ajudou a impulsionar suas vendas.$q$, 'confirmed', s.id
from albums a, sources s
where a.slug = 'the-clash-london-calling' and s.url = 'https://en.wikipedia.org/wiki/London_Calling';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'the-clash-london-calling'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', $q$Em 1979, o Clash enfrentava pressão financeira e a cobrança da gravadora após o insucesso comercial de discos anteriores, e respondeu ampliando radicalmente sua paleta sonora além do punk.$q$, 'interpretation', 0),
  ('world_context', 'O governo de Margaret Thatcher assumia o poder no Reino Unido em 1979, inaugurando uma era de austeridade econômica.', 'interpretation', 0),
  ('world_context', 'O punk original já dava sinais de esgotamento, abrindo espaço para bandas que misturavam reggae, rockabilly e ska.', 'interpretation', 1),
  ('world_context', 'Em 1979, a Sony lançava o Walkman no Japão, tornando a música portátil um fenômeno de massa pela primeira vez.', 'interpretation', 2),
  ('musical_scene', $q$Ao lado de bandas como Sex Pistols e The Jam, o Clash liderava a segunda onda do punk britânico, agora expandindo-se para além das três cordas básicas do gênero.$q$, 'interpretation', 0),
  ('reception_vs_legacy', $q$No lançamento, "London Calling" foi aclamado pela crítica por sua ambição estilística, embora a gravadora temesse que o disco duplo vendido ao preço de um único prejudicasse as vendas.$q$, 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "London Calling" é frequentemente citado como um dos maiores discos de rock já feitos, símbolo da capacidade do punk de se reinventar.$q$, 'critical_opinion', 1),
  ('album_summary', 'O disco duplo em que o Clash expandiu o punk para reggae, rockabilly e ska, sem perder a urgência política.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'the-clash-london-calling';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/London_Calling'
where a.slug = 'the-clash-london-calling';

-- =========================================================================
-- #17 Kanye West - My Beautiful Dark Twisted Fantasy (2010)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'My Beautiful Dark Twisted Fantasy - Wikipedia', 'https://en.wikipedia.org/wiki/My_Beautiful_Dark_Twisted_Fantasy', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Kanye West', 'kanye-west', '1996-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'My Beautiful Dark Twisted Fantasy', 'kanye-west-my-beautiful-dark-twisted-fantasy', '2010-11-22', 'Hip Hop', 'Roc-A-Fella', 13,
       'https://cdn-images.dzcdn.net/images/cover/742aba8510ba803bea51d304cf2ca786/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'kanye-west'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Dark Fantasy', 1, 281),
  ('Gorgeous', 2, 358),
  ('POWER', 3, 292),
  ('All Of The Lights (Interlude)', 4, 62),
  ('All Of The Lights', 5, 300),
  ('Monster', 6, 380),
  ('So Appalled', 7, 398),
  ('Devil In A New Dress', 8, 352),
  ('Runaway', 9, 548),
  ('Hell Of A Life', 10, 328),
  ('Blame Game', 11, 470),
  ('Lost In The World', 12, 257),
  ('Who Will Survive In America', 13, 98)
) as t(title, track_number, duration_seconds)
where a.slug = 'kanye-west-my-beautiful-dark-twisted-fantasy'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Kanye West', 'Produção')) as c(person_name, role)
where a.slug = 'kanye-west-my-beautiful-dark-twisted-fantasy' and s.url = 'https://en.wikipedia.org/wiki/My_Beautiful_Dark_Twisted_Fantasy'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#1'), ('certification', 'RIAA (Estados Unidos)', 'Platina')) as p(kind, label, value)
where a.slug = 'kanye-west-my-beautiful-dark-twisted-fantasy' and s.url = 'https://en.wikipedia.org/wiki/My_Beautiful_Dark_Twisted_Fantasy';

insert into curiosities (album_id, summary, status, source_id)
select a.id, $q$West convidou uma extensa lista de colaboradores para as sessões no Havaí, incluindo Justin Vernon (Bon Iver) e Nicki Minaj, que gravou seu verso icônico em "Monster".$q$, 'confirmed', s.id
from albums a, sources s
where a.slug = 'kanye-west-my-beautiful-dark-twisted-fantasy' and s.url = 'https://en.wikipedia.org/wiki/My_Beautiful_Dark_Twisted_Fantasy';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'kanye-west-my-beautiful-dark-twisted-fantasy'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', $q$Em 2010, Kanye West reconstruía sua imagem pública após a polêmica interrupção do discurso de Taylor Swift no VMA de 2009, refugiando-se no Havaí para gravar um álbum de redenção artística.$q$, 'interpretation', 0),
  ('world_context', 'Os EUA atravessavam a recuperação lenta da crise financeira de 2008 durante o primeiro mandato de Barack Obama.', 'interpretation', 0),
  ('world_context', 'As redes sociais se tornavam centrais na forma como celebridades geriam sua imagem pública, tema direto da polêmica que envolveu West.', 'interpretation', 1),
  ('world_context', 'Em 2010, a Apple lançava o primeiro iPad, popularizando os tablets e mudando a forma de consumo de mídia digital.', 'interpretation', 2),
  ('musical_scene', 'Reunindo colaboradores como Kid Cudi, Rick Ross e Bon Iver, o disco elevou o hip-hop mainstream a um patamar de ambição orquestral raramente visto no gênero.', 'interpretation', 0),
  ('reception_vs_legacy', $q$No lançamento, o disco foi recebido com aclamação quase unânime da crítica, ajudando a reverter a imagem pública desgastada de West.$q$, 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "My Beautiful Dark Twisted Fantasy" é amplamente considerado o auge criativo de Kanye West e um dos discos mais influentes do hip-hop do século XXI.$q$, 'critical_opinion', 1),
  ('album_summary', 'O álbum de redenção artística que reconstruiu a imagem de Kanye West em uma obra máxima do hip-hop.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'kanye-west-my-beautiful-dark-twisted-fantasy';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/My_Beautiful_Dark_Twisted_Fantasy'
where a.slug = 'kanye-west-my-beautiful-dark-twisted-fantasy';

-- =========================================================================
-- #19 Kendrick Lamar - To Pimp a Butterfly (2015)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'To Pimp a Butterfly - Wikipedia', 'https://en.wikipedia.org/wiki/To_Pimp_a_Butterfly', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Kendrick Lamar', 'kendrick-lamar', '2003-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'To Pimp a Butterfly', 'kendrick-lamar-to-pimp-a-butterfly', '2015-03-16', 'Hip Hop', 'TDE', 16,
       'https://cdn-images.dzcdn.net/images/cover/00dd0da365a94b1829302d6b7fec70e6/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'kendrick-lamar'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ($q$Wesley's Theory$q$, 1, 287),
  ('For Free? (Interlude)', 2, 131),
  ('King Kunta', 3, 235),
  ('Institutionalized', 4, 271),
  ('These Walls', 5, 301),
  ('u', 6, 268),
  ('Alright', 7, 219),
  ('For Sale? (Interlude)', 8, 292),
  ('Momma', 9, 283),
  ('Hood Politics', 10, 293),
  ('How Much A Dollar Cost', 11, 262),
  ('Complexion (A Zulu Love)', 12, 263),
  ('The Blacker The Berry', 13, 331),
  ($q$You Ain't Gotta Lie (Momma Said)$q$, 14, 242),
  ('i', 15, 336),
  ('Mortal Man', 16, 727)
) as t(title, track_number, duration_seconds)
where a.slug = 'kendrick-lamar-to-pimp-a-butterfly'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Kendrick Lamar', 'Produção executiva'), ('Terrace Martin', 'Produção')) as c(person_name, role)
where a.slug = 'kendrick-lamar-to-pimp-a-butterfly' and s.url = 'https://en.wikipedia.org/wiki/To_Pimp_a_Butterfly'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#1'), ('certification', 'RIAA (Estados Unidos)', 'Platina')) as p(kind, label, value)
where a.slug = 'kendrick-lamar-to-pimp-a-butterfly' and s.url = 'https://en.wikipedia.org/wiki/To_Pimp_a_Butterfly';

insert into curiosities (album_id, summary, status, source_id)
select a.id, $q$A faixa "Alright" se tornou um hino não-oficial do movimento Black Lives Matter, cantada em protestos por todo o país.$q$, 'confirmed', s.id
from albums a, sources s
where a.slug = 'kendrick-lamar-to-pimp-a-butterfly' and s.url = 'https://en.wikipedia.org/wiki/To_Pimp_a_Butterfly';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'kendrick-lamar-to-pimp-a-butterfly'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', $q$Em 2015, Kendrick Lamar processava o peso da fama repentina após o sucesso de "good kid, m.A.A.d city", questionando sua responsabilidade como voz de uma geração em meio a tensões raciais crescentes nos EUA.$q$, 'interpretation', 0),
  ('world_context', 'O movimento Black Lives Matter ganhava força nacional em 2015, após uma sequência de mortes de afro-americanos por policiais.', 'interpretation', 0),
  ('world_context', 'O jazz e o funk viviam um renascimento de influência sobre o hip-hop, impulsionado por músicos como Kamasi Washington e Thundercat.', 'interpretation', 1),
  ('world_context', 'Em 2015, o Apple Watch chegava ao mercado, e os serviços de streaming se consolidavam como principal forma de consumo de música gravada.', 'interpretation', 2),
  ('musical_scene', 'Reunindo jazzistas como Kamasi Washington e Thundercat, Lamar aproximou o hip-hop mainstream do jazz e do funk como nunca antes.', 'interpretation', 0),
  ('reception_vs_legacy', $q$No lançamento, o disco foi recebido com aclamação avassaladora da crítica, tornando-se rapidamente associado às manifestações do Black Lives Matter, com "Alright" adotada como hino de protesto.$q$, 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "To Pimp a Butterfly" é visto como um dos discos mais politicamente relevantes e musicalmente ambiciosos do hip-hop contemporâneo.$q$, 'critical_opinion', 1),
  ('album_summary', 'O retrato ambicioso e politizado de Kendrick Lamar sobre raça, fama e identidade na América contemporânea.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'kendrick-lamar-to-pimp-a-butterfly';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/To_Pimp_a_Butterfly'
where a.slug = 'kendrick-lamar-to-pimp-a-butterfly';

-- =========================================================================
-- #20 Radiohead - Kid A (2000)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Kid A - Wikipedia', 'https://en.wikipedia.org/wiki/Kid_A', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Radiohead', 'radiohead', '1985-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Kid A', 'radiohead-kid-a', '2000-10-02', 'Rock Experimental', 'Parlophone', 11,
       'https://cdn-images.dzcdn.net/images/cover/e5925065cdb1cefbc3bd75af4a1f1801/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'radiohead'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Everything In Its Right Place', 1, 251),
  ('Kid A', 2, 284),
  ('The National Anthem', 3, 351),
  ('How to Disappear Completely', 4, 356),
  ('Treefingers', 5, 222),
  ('Optimistic', 6, 315),
  ('In Limbo', 7, 211),
  ('Idioteque', 8, 309),
  ('Morning Bell', 9, 275),
  ('Motion Picture Soundtrack', 10, 200),
  ('Untitled', 11, 52)
) as t(title, track_number, duration_seconds)
where a.slug = 'radiohead-kid-a'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Nigel Godrich', 'Produção')) as c(person_name, role)
where a.slug = 'radiohead-kid-a' and s.url = 'https://en.wikipedia.org/wiki/Kid_A'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#1'), ('certification', 'RIAA (Estados Unidos)', 'Platina')) as p(kind, label, value)
where a.slug = 'radiohead-kid-a' and s.url = 'https://en.wikipedia.org/wiki/Kid_A';

insert into curiosities (album_id, summary, status, source_id)
select a.id, $q$A banda se recusou a lançar singles ou fazer clipes tradicionais para promover o disco, optando por "blips" de vídeo abstratos distribuídos gratuitamente.$q$, 'confirmed', s.id
from albums a, sources s
where a.slug = 'radiohead-kid-a' and s.url = 'https://en.wikipedia.org/wiki/Kid_A';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'radiohead-kid-a'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', $q$Em 2000, o Radiohead reagia à ansiedade de repetir o sucesso de "OK Computer" abandonando deliberadamente as estruturas de guitarra do rock em favor de texturas eletrônicas e composição fragmentada.$q$, 'interpretation', 0),
  ('world_context', 'A eleição presidencial americana de 2000 terminava em uma disputa jurídica inédita entre Bush e Gore.', 'interpretation', 0),
  ('world_context', $q$O medo do "bug do milênio" havia dominado o imaginário coletivo poucos meses antes, alimentando ansiedades sobre tecnologia e futuro.$q$, 'interpretation', 1),
  ('world_context', 'Em 2000, o Napster popularizava o compartilhamento digital de música, ameaçando o modelo de negócio tradicional da indústria fonográfica.', 'interpretation', 2),
  ('musical_scene', $q$Em contraste com o rock alternativo guiado por guitarras que dominava o final dos anos 1990, "Kid A" aproximou o Radiohead da música eletrônica de artistas como Aphex Twin.$q$, 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, a crítica ficou dividida entre o fascínio pela ousadia sonora e a estranheza com o abandono do formato de rock que consagrara a banda.', 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "Kid A" é amplamente considerado uma obra visionária que previu a fragmentação sonora do rock no século XXI.$q$, 'critical_opinion', 1),
  ('album_summary', 'O disco em que o Radiohead abandonou o rock de guitarras para abraçar a eletrônica fragmentada, antecipando os anos 2000.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'radiohead-kid-a';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Kid_A'
where a.slug = 'radiohead-kid-a';

-- =========================================================================
-- #21 Bruce Springsteen - Born to Run (1975)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Born to Run (album) - Wikipedia', 'https://en.wikipedia.org/wiki/Born_to_Run_(album)', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Bruce Springsteen', 'bruce-springsteen', '1972-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Born to Run', 'bruce-springsteen-born-to-run', '1975-08-25', 'Rock', 'Columbia', 8,
       'https://cdn-images.dzcdn.net/images/cover/a9b2ca622c4dcbb5eb576ced899e9cc9/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'bruce-springsteen'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Thunder Road', 1, 290),
  ('Tenth Avenue Freeze-Out', 2, 191),
  ('Night', 3, 181),
  ('Backstreets', 4, 389),
  ('Born to Run', 5, 270),
  ($q$She's the One$q$, 6, 270),
  ('Meeting Across the River', 7, 196),
  ('Jungleland', 8, 573)
) as t(title, track_number, duration_seconds)
where a.slug = 'bruce-springsteen-born-to-run'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Jon Landau', 'Produção'), ('Bruce Springsteen', 'Produção')) as c(person_name, role)
where a.slug = 'bruce-springsteen-born-to-run' and s.url = 'https://en.wikipedia.org/wiki/Born_to_Run_(album)'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#3'), ('certification', 'RIAA (Estados Unidos)', 'Multi-Platina')) as p(kind, label, value)
where a.slug = 'bruce-springsteen-born-to-run' and s.url = 'https://en.wikipedia.org/wiki/Born_to_Run_(album)';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'Springsteen apareceu simultaneamente nas capas das revistas Time e Newsweek na mesma semana de outubro de 1975, um feito raríssimo para um músico até então pouco conhecido do grande público.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'bruce-springsteen-born-to-run' and s.url = 'https://en.wikipedia.org/wiki/Born_to_Run_(album)';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'bruce-springsteen-born-to-run'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1975, Bruce Springsteen enfrentava a pressão de sua gravadora para produzir um sucesso comercial depois de dois discos aclamados pela crítica mas sem grande retorno de vendas.', 'interpretation', 0),
  ('world_context', 'Os EUA atravessavam o fim recente da Guerra do Vietnã e o trauma persistente do Watergate em 1975.', 'interpretation', 0),
  ('world_context', 'A classe trabalhadora americana enfrentava estagnação econômica, tema recorrente nas letras de Springsteen sobre fuga e redenção.', 'interpretation', 1),
  ('world_context', 'Em 1975, a Sony lançava o Betamax, dando início à disputa de formatos que definiria a era do videocassete doméstico.', 'interpretation', 2),
  ('musical_scene', $q$Springsteen sintetizava o rock épico do "Wall of Sound" de Phil Spector com a tradição do rock'n'roll americano, ao lado de artistas como Bob Seger.$q$, 'interpretation', 0),
  ('reception_vs_legacy', $q$No lançamento, "Born to Run" foi recebido com aclamação retumbante, e Springsteen apareceu nas capas das revistas Time e Newsweek na mesma semana.$q$, 'fact', 0),
  ('reception_vs_legacy', 'Hoje, o disco é considerado a obra que definiu Springsteen como o poeta épico da classe trabalhadora americana.', 'critical_opinion', 1),
  ('album_summary', 'O disco que transformou Bruce Springsteen no poeta épico dos sonhos e frustrações da classe trabalhadora americana.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'bruce-springsteen-born-to-run';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Born_to_Run_(album)'
where a.slug = 'bruce-springsteen-born-to-run';

-- =========================================================================
-- #22 The Notorious B.I.G. - Ready to Die (1994)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Ready to Die - Wikipedia', 'https://en.wikipedia.org/wiki/Ready_to_Die', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('The Notorious B.I.G.', 'the-notorious-big', '1992-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Ready to Die', 'the-notorious-big-ready-to-die', '1994-09-13', 'Hip Hop', 'Bad Boy', 17,
       'https://cdn-images.dzcdn.net/images/cover/7143c2cd04a78c9c969d230c69465a03/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'the-notorious-big'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Intro', 1, 203),
  ('Things Done Changed', 2, 238),
  ('Gimme the Loot', 3, 285),
  ('Machine Gun Funk', 4, 255),
  ('Warning', 5, 220),
  ('Ready to Die', 6, 264),
  ('One More Chance', 7, 283),
  ('Fuck Me (Interlude)', 8, 91),
  ('The What', 9, 237),
  ('Juicy', 10, 302),
  ('Everyday Struggle', 11, 319),
  ('Me and My Bitch', 12, 240),
  ('Big Poppa', 13, 252),
  ('Respect', 14, 321),
  ('Friend of Mine', 15, 208),
  ('Unbelievable', 16, 223),
  ('Suicidal Thoughts', 17, 170)
) as t(title, track_number, duration_seconds)
where a.slug = 'the-notorious-big-ready-to-die'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ($q$Sean "Puffy" Combs$q$, 'Produção executiva'), ('Easy Mo Bee', 'Produção')) as c(person_name, role)
where a.slug = 'the-notorious-big-ready-to-die' and s.url = 'https://en.wikipedia.org/wiki/Ready_to_Die'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('certification', 'RIAA (Estados Unidos)', 'Diamante')) as p(kind, label, value)
where a.slug = 'the-notorious-big-ready-to-die' and s.url = 'https://en.wikipedia.org/wiki/Ready_to_Die';

insert into curiosities (album_id, summary, status, source_id)
select a.id, $q$O disco foi lançado poucos meses antes do nascimento da filha de Biggie, e a faixa "Juicy" narra diretamente sua própria trajetória da pobreza ao sucesso.$q$, 'confirmed', s.id
from albums a, sources s
where a.slug = 'the-notorious-big-ready-to-die' and s.url = 'https://en.wikipedia.org/wiki/Ready_to_Die';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'the-notorious-big-ready-to-die'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1994, Christopher Wallace, o Notorious B.I.G., tinha 22 anos e narrava sua própria trajetória entre o crime e a ambição de se tornar uma estrela do rap em seu álbum de estreia.', 'interpretation', 0),
  ('world_context', 'A cidade de Nova York enfrentava altos índices de criminalidade e uma guerra às drogas em plena escalada em 1994.', 'interpretation', 0),
  ('world_context', 'A rivalidade entre as cenas de hip-hop da Costa Leste e da Costa Oeste começava a se acirrar, disputa que marcaria tragicamente os anos seguintes.', 'interpretation', 1),
  ('world_context', 'Em 1994, a Sony lançava o PlayStation no Japão, marcando uma nova era para os videogames domésticos.', 'interpretation', 2),
  ('musical_scene', $q$Lançado em um momento de ascensão do gangsta rap da Costa Leste, "Ready to Die" consolidou o Brooklyn como potência rival da cena de Los Angeles.$q$, 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, o disco foi aclamado pela crítica por sua narrativa crua e versatilidade, alçando Biggie a estrela instantânea do hip-hop.', 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "Ready to Die" é considerado um dos discos fundamentais do hip-hop dos anos 1990, ainda mais reverenciado após o assassinato de Biggie em 1997.$q$, 'critical_opinion', 1),
  ('album_summary', 'O relato cru e ambicioso da trajetória de Notorious B.I.G., que o consagrou como uma das maiores vozes do hip-hop.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'the-notorious-big-ready-to-die';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Ready_to_Die'
where a.slug = 'the-notorious-big-ready-to-die';

-- =========================================================================
-- #23 The Velvet Underground - The Velvet Underground and Nico (1967)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'The Velvet Underground & Nico - Wikipedia', 'https://en.wikipedia.org/wiki/The_Velvet_Underground_%26_Nico', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('The Velvet Underground', 'the-velvet-underground', '1964-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'The Velvet Underground and Nico', 'the-velvet-underground-and-nico', '1967-03-12', 'Rock', 'Verve', 11,
       'https://cdn-images.dzcdn.net/images/cover/5722e04a2ba2539c02ac2afb655a4f93/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'the-velvet-underground'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Sunday Morning', 1, 173),
  ($q$I'm Waiting For The Man$q$, 2, 277),
  ('Femme Fatale', 3, 159),
  ('Venus In Furs', 4, 310),
  ('Run Run Run', 5, 260),
  ($q$All Tomorrow's Parties$q$, 6, 355),
  ('Heroin', 7, 433),
  ('There She Goes Again', 8, 158),
  ($q$I'll Be Your Mirror$q$, 9, 131),
  ($q$The Black Angel's Death Song$q$, 10, 190),
  ('European Son', 11, 467)
) as t(title, track_number, duration_seconds)
where a.slug = 'the-velvet-underground-and-nico'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Andy Warhol', 'Produção')) as c(person_name, role)
where a.slug = 'the-velvet-underground-and-nico' and s.url = 'https://en.wikipedia.org/wiki/The_Velvet_Underground_%26_Nico'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('certification', 'RIAA (Estados Unidos)', 'Platina')) as p(kind, label, value)
where a.slug = 'the-velvet-underground-and-nico' and s.url = 'https://en.wikipedia.org/wiki/The_Velvet_Underground_%26_Nico';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'A capa com a banana de Andy Warhol, que podia ser descascada revelando outra imagem por baixo, tornou-se um dos designs mais icônicos da história do rock.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'the-velvet-underground-and-nico' and s.url = 'https://en.wikipedia.org/wiki/The_Velvet_Underground_%26_Nico';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'the-velvet-underground-and-nico'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', $q$Em 1967, o Velvet Underground vivia sob a curadoria de Andy Warhol, que impôs a cantora alemã Nico ao grupo e financiou as gravações através de sua "Factory" artística em Nova York.$q$, 'interpretation', 0),
  ('world_context', $q$Os EUA viviam o auge dos protestos contra a Guerra do Vietnã e o "Verão do Amor" hippie se espalhava pela Califórnia em 1967.$q$, 'interpretation', 0),
  ('world_context', 'Enquanto a costa oeste abraçava o otimismo psicodélico do Verão do Amor, a cena underground de Nova York cultivava uma estética mais sombria e urbana.', 'interpretation', 1),
  ('world_context', 'Em 1967, a BBC2 iniciava as primeiras transmissões regulares de televisão a cores da Europa.', 'interpretation', 2),
  ('musical_scene', 'Em contraste direto com o otimismo psicodélico da Califórnia, o Velvet Underground trazia temas urbanos sombrios como drogas e sadomasoquismo, antecipando o punk e o rock alternativo.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, o disco vendeu mal e foi amplamente ignorado pela crítica da época, ofuscado pelo fenômeno psicodélico da Costa Oeste.', 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "The Velvet Underground and Nico" é considerado um dos discos mais influentes já feitos, citado como semente do punk, do rock alternativo e do art rock.$q$, 'critical_opinion', 1),
  ('album_summary', 'O disco underground que passou despercebido no lançamento e se tornou semente de gerações de rock alternativo.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'the-velvet-underground-and-nico';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/The_Velvet_Underground_%26_Nico'
where a.slug = 'the-velvet-underground-and-nico';

-- =========================================================================
-- #24 The Beatles - Sgt. Pepper's Lonely Hearts Club Band (1967)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', $q$Sgt. Pepper's Lonely Hearts Club Band - Wikipedia$q$, 'https://en.wikipedia.org/wiki/Sgt._Pepper%27s_Lonely_Hearts_Club_Band', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('The Beatles', 'the-beatles', '1960-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, $q$Sgt. Pepper's Lonely Hearts Club Band$q$, 'the-beatles-sgt-peppers-lonely-hearts-club-band', '1967-06-02', 'Rock', 'Capitol', 13,
       'https://cdn-images.dzcdn.net/images/cover/4fcb73352b17d47429a273c5112632b0/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'the-beatles'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ($q$Sgt. Pepper's Lonely Hearts Club Band$q$, 1, 122),
  ('With A Little Help From My Friends', 2, 164),
  ('Lucy In The Sky With Diamonds', 3, 208),
  ('Getting Better', 4, 168),
  ('Fixing A Hole', 5, 156),
  ($q$She's Leaving Home$q$, 6, 215),
  ('Being For The Benefit Of Mr. Kite!', 7, 157),
  ('Within You Without You', 8, 304),
  ($q$When I'm Sixty Four$q$, 9, 157),
  ('Lovely Rita', 10, 162),
  ('Good Morning Good Morning', 11, 161),
  ($q$Sgt. Pepper's Lonely Hearts Club Band (Reprise)$q$, 12, 79),
  ('A Day In The Life', 13, 337)
) as t(title, track_number, duration_seconds)
where a.slug = 'the-beatles-sgt-peppers-lonely-hearts-club-band'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('George Martin', 'Produção')) as c(person_name, role)
where a.slug = 'the-beatles-sgt-peppers-lonely-hearts-club-band' and s.url = 'https://en.wikipedia.org/wiki/Sgt._Pepper%27s_Lonely_Hearts_Club_Band'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#1'), ('certification', 'RIAA (Estados Unidos)', 'Diamante')) as p(kind, label, value)
where a.slug = 'the-beatles-sgt-peppers-lonely-hearts-club-band' and s.url = 'https://en.wikipedia.org/wiki/Sgt._Pepper%27s_Lonely_Hearts_Club_Band';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'A capa do disco reúne recortes de mais de 70 personalidades, de Karl Marx a Marilyn Monroe, escolhidas pessoalmente pelos próprios Beatles.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'the-beatles-sgt-peppers-lonely-hearts-club-band' and s.url = 'https://en.wikipedia.org/wiki/Sgt._Pepper%27s_Lonely_Hearts_Club_Band';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'the-beatles-sgt-peppers-lonely-hearts-club-band'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1967, exaustos da rotina de turnês e da fama, os Beatles se reinventaram como uma banda fictícia, se escondendo atrás de alter egos para explorar liberdade criativa total em estúdio.', 'interpretation', 0),
  ('world_context', $q$O "Verão do Amor" psicodélico se espalhava por São Francisco e Londres em 1967, em meio à escalada da Guerra do Vietnã.$q$, 'interpretation', 0),
  ('world_context', 'A psicodelia se tornava linguagem cultural dominante entre a juventude ocidental, da moda à arte gráfica.', 'interpretation', 1),
  ('world_context', 'Em 1967, a União Soviética lançava a sonda Venera 4, primeira espaçonave a transmitir dados diretamente da atmosfera de outro planeta.', 'interpretation', 2),
  ('musical_scene', $q$Construído sob a influência direta de "Pet Sounds", dos Beach Boys, "Sgt. Pepper's" elevou o álbum-conceito psicodélico a um novo patamar de ambição e influenciou uma geração de bandas.$q$, 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, o disco foi recebido com aclamação unânime e imediata, sendo visto como um divisor de águas na forma como o público passou a tratar álbuns como obras de arte completas.', 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "Sgt. Pepper's" é constantemente citado entre os maiores álbuns já feitos, marco da transição do rock de canções avulsas para obras conceituais.$q$, 'critical_opinion', 1),
  ('album_summary', 'O álbum-conceito psicodélico que elevou o disco de rock à condição de obra de arte completa.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'the-beatles-sgt-peppers-lonely-hearts-club-band';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Sgt._Pepper%27s_Lonely_Hearts_Club_Band'
where a.slug = 'the-beatles-sgt-peppers-lonely-hearts-club-band';

-- =========================================================================
-- #25 Carole King - Tapestry (1971)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Tapestry (Carole King album) - Wikipedia', 'https://en.wikipedia.org/wiki/Tapestry_(Carole_King_album)', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Carole King', 'carole-king', '1958-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Tapestry', 'carole-king-tapestry', '1971-02-10', 'Folk / Pop', 'Sony', 12,
       'https://cdn-images.dzcdn.net/images/cover/e34d44b406921cbdc47251fe7fae37ac/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'carole-king'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('I Feel the Earth Move', 1, 178),
  ('So Far Away', 2, 235),
  ($q$It's Too Late$q$, 3, 233),
  ('Home Again', 4, 149),
  ('Beautiful', 5, 188),
  ('Way Over Yonder', 6, 284),
  ($q$You've Got a Friend$q$, 7, 309),
  ('Where You Lead', 8, 200),
  ('Will You Love Me Tomorrow?', 9, 252),
  ('Smackwater Jack', 10, 218),
  ('Tapestry', 11, 194),
  ('(You Make Me Feel Like) A Natural Woman', 12, 229)
) as t(title, track_number, duration_seconds)
where a.slug = 'carole-king-tapestry'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Lou Adler', 'Produção'), ('James Taylor', 'Violão')) as c(person_name, role)
where a.slug = 'carole-king-tapestry' and s.url = 'https://en.wikipedia.org/wiki/Tapestry_(Carole_King_album)'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#1'), ('certification', 'RIAA (Estados Unidos)', 'Diamante')) as p(kind, label, value)
where a.slug = 'carole-king-tapestry' and s.url = 'https://en.wikipedia.org/wiki/Tapestry_(Carole_King_album)';

insert into curiosities (album_id, summary, status, source_id)
select a.id, $q$James Taylor, amigo íntimo de King, tocou violão no disco e gravou sua própria versão de "You've Got a Friend" quase simultaneamente, ambas se tornando sucessos.$q$, 'confirmed', s.id
from albums a, sources s
where a.slug = 'carole-king-tapestry' and s.url = 'https://en.wikipedia.org/wiki/Tapestry_(Carole_King_album)';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'carole-king-tapestry'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1971, Carole King deixava de ser vista apenas como compositora de sucessos para outros artistas para assumir, pela primeira vez, o centro do palco como cantora e intérprete de suas próprias canções.', 'interpretation', 0),
  ('world_context', 'O movimento feminista ganhava força nos EUA, questionando papéis tradicionais de gênero no início dos anos 1970.', 'interpretation', 0),
  ('world_context', 'O cantor-compositor confessional se consolidava como formato dominante da música popular americana no início da década.', 'interpretation', 1),
  ('world_context', 'Em 1971, a Texas Instruments lançava a primeira calculadora eletrônica de bolso comercialmente viável.', 'interpretation', 2),
  ('musical_scene', 'Ao lado de contemporâneos como James Taylor e Joni Mitchell, King ajudou a consolidar o cantor-compositor confessional como força central da música dos anos 1970.', 'interpretation', 0),
  ('reception_vs_legacy', $q$No lançamento, "Tapestry" foi recebido com entusiasmo imediato, permanecendo no topo das paradas americanas por 15 semanas consecutivas.$q$, 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "Tapestry" é considerado um dos discos mais importantes já feitos por uma cantora-compositora, referência permanente do gênero.$q$, 'critical_opinion', 1),
  ('album_summary', 'O disco em que Carole King deixou de compor para os outros e se tornou uma das maiores intérpretes de sua geração.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'carole-king-tapestry';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Tapestry_(Carole_King_album)'
where a.slug = 'carole-king-tapestry';

-- =========================================================================
-- #26 Patti Smith - Horses (1975)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Horses (album) - Wikipedia', 'https://en.wikipedia.org/wiki/Horses_(album)', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Patti Smith', 'patti-smith', '1974-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Horses', 'patti-smith-horses', '1975-11-10', 'Punk Rock', 'Arista', 8,
       'https://cdn-images.dzcdn.net/images/cover/6d8164d4f569651063531577cc1e1b30/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'patti-smith'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Gloria: In Excelsis Deo', 1, 354),
  ('Redondo Beach', 2, 204),
  ('Birdland', 3, 554),
  ('Free Money', 4, 230),
  ('Kimberly', 5, 265),
  ('Break It Up', 6, 240),
  ($q$Land: Horses / Land of a Thousand Dances / La Mer(de)$q$, 7, 566),
  ('Elegie', 8, 161)
) as t(title, track_number, duration_seconds)
where a.slug = 'patti-smith-horses'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('John Cale', 'Produção')) as c(person_name, role)
where a.slug = 'patti-smith-horses' and s.url = 'https://en.wikipedia.org/wiki/Horses_(album)'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('certification', 'RIAA (Estados Unidos)', 'Ouro')) as p(kind, label, value)
where a.slug = 'patti-smith-horses' and s.url = 'https://en.wikipedia.org/wiki/Horses_(album)';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'A icônica foto de capa, de Patti Smith em terno masculino, foi tirada por Robert Mapplethorpe, seu amigo e ex-companheiro.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'patti-smith-horses' and s.url = 'https://en.wikipedia.org/wiki/Horses_(album)';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'patti-smith-horses'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1975, Patti Smith era uma poeta da cena underground de Nova York que decidiu transformar sua poesia falada em canção, unindo rock básico a uma performance vocal quase ritualística.', 'interpretation', 0),
  ('world_context', 'A Guerra do Vietnã chegava ao fim em abril de 1975, com a queda de Saigon.', 'interpretation', 0),
  ('world_context', 'A cena punk incipiente fervilhava em clubes como o CBGB, em Nova York, berço de bandas como Television e Ramones.', 'interpretation', 1),
  ('world_context', 'Em 1975, o encontro em órbita entre uma espaçonave americana e uma soviética na missão Apollo-Soyuz simbolizava um breve degelo na Guerra Fria.', 'interpretation', 2),
  ('musical_scene', $q$Gravado em torno da cena do CBGB e ao lado de bandas como Television, "Horses" ajudou a lançar as bases do punk rock americano antes mesmo de o gênero ganhar esse nome.$q$, 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, o disco foi recebido com entusiasmo pela crítica underground, embora tenha vendido modestamente fora dos círculos alternativos de Nova York.', 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "Horses" é considerado um dos discos fundadores do punk rock e um marco da presença feminina na vanguarda do gênero.$q$, 'critical_opinion', 1),
  ('album_summary', 'O disco de estreia que uniu poesia e rock básico, lançando as bases do punk rock americano.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'patti-smith-horses';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Horses_(album)'
where a.slug = 'patti-smith-horses';

-- =========================================================================
-- #27 Wu-Tang Clan - Enter the Wu-Tang (36 Chambers) (1993)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Enter the Wu-Tang (36 Chambers) - Wikipedia', 'https://en.wikipedia.org/wiki/Enter_the_Wu-Tang_(36_Chambers)', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Wu-Tang Clan', 'wu-tang-clan', '1992-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Enter the Wu-Tang (36 Chambers)', 'wu-tang-clan-enter-the-wu-tang-36-chambers', '1993-11-09', 'Hip Hop', 'Loud', 12,
       'https://cdn-images.dzcdn.net/images/cover/b7e83ef65099d5f01c84b1e2a8391f02/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'wu-tang-clan'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Bring Da Ruckus', 1, 250),
  ('Shame On a Nigga', 2, 177),
  ('Clan In Da Front', 3, 273),
  ('Wu-Tang: 7th Chamber', 4, 365),
  ('Can It Be All So Simple / Intermission', 5, 413),
  ($q$Da Mystery of Chessboxin'$q$, 6, 288),
  ($q$Wu-Tang Clan Ain't Nuthing ta F' Wit$q$, 7, 216),
  ('C.R.E.A.M. (Cash Rules Everything Around Me)', 8, 252),
  ('Method Man', 9, 350),
  ('Protect Ya Neck', 10, 292),
  ('Tearz', 11, 257),
  ('Wu-Tang: 7th Chamber - Part II (Conclusion)', 12, 370)
) as t(title, track_number, duration_seconds)
where a.slug = 'wu-tang-clan-enter-the-wu-tang-36-chambers'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('RZA', 'Produção')) as c(person_name, role)
where a.slug = 'wu-tang-clan-enter-the-wu-tang-36-chambers' and s.url = 'https://en.wikipedia.org/wiki/Enter_the_Wu-Tang_(36_Chambers)'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('certification', 'RIAA (Estados Unidos)', 'Platina')) as p(kind, label, value)
where a.slug = 'wu-tang-clan-enter-the-wu-tang-36-chambers' and s.url = 'https://en.wikipedia.org/wiki/Enter_the_Wu-Tang_(36_Chambers)';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'O contrato incomum negociado pelo RZA permitiu que cada integrante do grupo assinasse contratos solo com gravadoras diferentes, estratégia que multiplicou o alcance da marca Wu-Tang.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'wu-tang-clan-enter-the-wu-tang-36-chambers' and s.url = 'https://en.wikipedia.org/wiki/Enter_the_Wu-Tang_(36_Chambers)';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'wu-tang-clan-enter-the-wu-tang-36-chambers'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1993, nove rappers do Staten Island se uniram sob a visão do produtor RZA, que exigiu um contrato incomum permitindo que cada integrante também assinasse carreiras solo com outras gravadoras.', 'interpretation', 0),
  ('world_context', 'Bill Clinton assumia a presidência dos EUA em 1993, em meio a debates sobre criminalidade urbana e desigualdade racial.', 'interpretation', 0),
  ('world_context', 'Filmes de artes marciais de Hong Kong dublados eram amplamente consumidos em fitas VHS nos bairros populares de Nova York, influência direta na estética do grupo.', 'interpretation', 1),
  ('world_context', 'Em 1993, a Intel lançava o processador Pentium, marcando uma nova geração de computadores pessoais mais poderosos.', 'interpretation', 2),
  ('musical_scene', 'Ao lado de Nas e Notorious B.I.G., o Wu-Tang Clan ajudou a devolver o protagonismo do hip-hop à Costa Leste em um momento de domínio do g-funk californiano.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, o disco foi recebido com entusiasmo crescente por meio do boca a boca das ruas, antes de se tornar um sucesso comercial reconhecido pela crítica especializada.', 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "Enter the Wu-Tang (36 Chambers)" é considerado um dos discos mais influentes da história do hip-hop, responsável por lançar as carreiras solo de nove artistas.$q$, 'critical_opinion', 1),
  ('album_summary', 'O disco de estreia que apresentou o Wu-Tang Clan e sua estética crua inspirada em filmes de artes marciais.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'wu-tang-clan-enter-the-wu-tang-36-chambers';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Enter_the_Wu-Tang_(36_Chambers)'
where a.slug = 'wu-tang-clan-enter-the-wu-tang-36-chambers';

-- =========================================================================
-- #28 D'Angelo - Voodoo (2000)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', $q$Voodoo (D'Angelo album) - Wikipedia$q$, 'https://en.wikipedia.org/wiki/Voodoo_(D%27Angelo_album)', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ($q$D'Angelo$q$, 'dangelo', '1995-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Voodoo', 'dangelo-voodoo', '2000-01-25', 'R&B / Neo Soul', 'EMI', 13,
       'https://cdn-images.dzcdn.net/images/cover/5d18f588dbadfae952e81b274052f7e4/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'dangelo'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Playa Playa', 1, 429),
  ($q$Devil's Pie$q$, 2, 321),
  ('Left And Right', 3, 286),
  ('The Line', 4, 316),
  ('Send It On', 5, 358),
  ('Chicken Grease', 6, 278),
  ($q$One Mo'Gin$q$, 7, 373),
  ('The Root', 8, 393),
  ('Spanish Joint', 9, 344),
  ('Feel Like Makin Love', 10, 382),
  ($q$Greatdayndamornin'/Booty$q$, 11, 454),
  ('Untitled (How Does It Feel)', 12, 431),
  ('Africa', 13, 376)
) as t(title, track_number, duration_seconds)
where a.slug = 'dangelo-voodoo'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ($q$D'Angelo$q$, 'Produção'), ('Questlove', 'Bateria')) as c(person_name, role)
where a.slug = 'dangelo-voodoo' and s.url = 'https://en.wikipedia.org/wiki/Voodoo_(D%27Angelo_album)'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#1'), ('certification', 'RIAA (Estados Unidos)', 'Platina')) as p(kind, label, value)
where a.slug = 'dangelo-voodoo' and s.url = 'https://en.wikipedia.org/wiki/Voodoo_(D%27Angelo_album)';

insert into curiosities (album_id, summary, status, source_id)
select a.id, $q$O clipe de "Untitled (How Does It Feel)", com D'Angelo em plano único, se tornou tão marcante que o próprio artista relatou desconforto com a atenção física recebida depois do lançamento.$q$, 'confirmed', s.id
from albums a, sources s
where a.slug = 'dangelo-voodoo' and s.url = 'https://en.wikipedia.org/wiki/Voodoo_(D%27Angelo_album)';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'dangelo-voodoo'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', $q$Em 2000, D'Angelo passou anos refugiado no lendário estúdio Electric Lady, em Nova York, buscando obsessivamente capturar o "groove" impreciso e humano das gravações de soul clássico.$q$, 'interpretation', 0),
  ('world_context', 'Os EUA atravessavam a disputada eleição presidencial entre Bush e Gore em 2000.', 'interpretation', 0),
  ($q$world_context$q$, $q$O neo soul se consolidava como movimento próprio, unindo D'Angelo, Erykah Badu e Lauryn Hill em uma nova geração de música negra.$q$, 'interpretation', 1),
  ('world_context', 'Em 2000, a Sony lançava o PlayStation 2, consolidando os videogames como indústria de entretenimento de massa.', 'interpretation', 2),
  ('musical_scene', $q$Ao lado de Erykah Badu e do coletivo Soulquarians, D'Angelo ajudou a consolidar o neo soul como movimento próprio no final dos anos 1990.$q$, 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, o disco foi aclamado pela crítica por sua sofisticação musical, e o clipe de "Untitled (How Does It Feel)" gerou enorme repercussão.', 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "Voodoo" é considerado o auge do neo soul e uma das produções mais influentes da música negra contemporânea.$q$, 'critical_opinion', 1),
  ('album_summary', 'A obra-prima do neo soul gravada ao longo de anos no lendário estúdio Electric Lady.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'dangelo-voodoo';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Voodoo_(D%27Angelo_album)'
where a.slug = 'dangelo-voodoo';

-- =========================================================================
-- #29 The Beatles - The Beatles (White Album) (1968)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'The Beatles (album) - Wikipedia', 'https://en.wikipedia.org/wiki/The_Beatles_(album)', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'The Beatles (White Album)', 'the-beatles-white-album', '1968-11-22', 'Rock', 'Apple', 30,
       'https://cdn-images.dzcdn.net/images/cover/f8b236243adae6bc187d27157bc61ae9/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'the-beatles'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Back In The U.S.S.R.', 1, 163),
  ('Dear Prudence', 2, 235),
  ('Glass Onion', 3, 137),
  ('Ob-La-Di, Ob-La-Da', 4, 188),
  ('Wild Honey Pie', 5, 52),
  ('The Continuing Story Of Bungalow Bill', 6, 194),
  ('While My Guitar Gently Weeps', 7, 285),
  ('Happiness Is A Warm Gun', 8, 163),
  ('Martha My Dear', 9, 148),
  ($q$I'm So Tired$q$, 10, 123),
  ('Blackbird', 11, 138),
  ('Piggies', 12, 124),
  ('Rocky Raccoon', 13, 213),
  ($q$Don't Pass Me By$q$, 14, 230),
  ($q$Why Don't We Do It In The Road?$q$, 15, 100),
  ('I Will', 16, 104),
  ('Julia', 17, 176),
  ('Birthday', 18, 163),
  ('Yer Blues', 19, 239),
  ($q$Mother Nature's Son$q$, 20, 167),
  ($q$Everybody's Got Something To Hide Except Me And My Monkey$q$, 21, 144),
  ('Sexy Sadie', 22, 195),
  ('Helter Skelter', 23, 269),
  ('Long, Long, Long', 24, 183),
  ('Revolution 1', 25, 255),
  ('Honey Pie', 26, 160),
  ('Savoy Truffle', 27, 173),
  ('Cry Baby Cry', 28, 182),
  ('Revolution 9', 29, 502),
  ('Good Night', 30, 193)
) as t(title, track_number, duration_seconds)
where a.slug = 'the-beatles-white-album'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('George Martin', 'Produção')) as c(person_name, role)
where a.slug = 'the-beatles-white-album' and s.url = 'https://en.wikipedia.org/wiki/The_Beatles_(album)'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#1'), ('certification', 'RIAA (Estados Unidos)', 'Diamante')) as p(kind, label, value)
where a.slug = 'the-beatles-white-album' and s.url = 'https://en.wikipedia.org/wiki/The_Beatles_(album)';

insert into curiosities (album_id, summary, status, source_id)
select a.id, $q$A capa completamente branca, sem nenhuma imagem além do nome da banda gravado em relevo, foi uma resposta deliberada ao visual extravagante de "Sgt. Pepper's".$q$, 'confirmed', s.id
from albums a, sources s
where a.slug = 'the-beatles-white-album' and s.url = 'https://en.wikipedia.org/wiki/The_Beatles_(album)';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'the-beatles-white-album'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1968, os Beatles retornavam de um retiro espiritual na Índia com dezenas de novas canções, mas as sessões de gravação expuseram tensões internas crescentes entre os quatro integrantes.', 'interpretation', 0),
  ('world_context', '1968 foi um dos anos mais turbulentos do século XX, marcado pelos assassinatos de Martin Luther King Jr. e Robert Kennedy e por protestos estudantis globais.', 'interpretation', 0),
  ('world_context', 'O interesse ocidental por espiritualidade oriental atingia seu auge, refletido no retiro do próprio grupo com o Maharishi Mahesh Yogi na Índia.', 'interpretation', 1),
  ('world_context', 'Em 1968, a Intel era fundada por Robert Noyce e Gordon Moore, dando início a uma nova era da indústria de semicondutores.', 'interpretation', 2),
  ('musical_scene', 'Em um ano de fragmentação política e musical, o disco duplo dos Beatles refletiu essa dispersão ao saltar entre rock pesado, folk, avant-garde e pastiche, sem um fio condutor único.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, a crítica ficou dividida entre o fascínio pela diversidade de estilos e a sensação de que o disco duplo carecia de coesão.', 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "The Beatles" (White Album) é visto como um retrato fascinante de quatro artistas cada vez mais individuais dentro de uma mesma banda, à beira da separação.$q$, 'critical_opinion', 1),
  ('album_summary', 'O disco duplo fragmentado que revelou os Beatles como quatro artistas individuais cada vez mais distantes um do outro.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'the-beatles-white-album';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/The_Beatles_(album)'
where a.slug = 'the-beatles-white-album';

-- =========================================================================
-- #30 Jimi Hendrix - Are You Experienced (1967)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Are You Experienced - Wikipedia', 'https://en.wikipedia.org/wiki/Are_You_Experienced', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Jimi Hendrix', 'jimi-hendrix', '1966-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Are You Experienced', 'jimi-hendrix-are-you-experienced', '1967-05-12', 'Rock', 'Track', 17,
       'https://cdn-images.dzcdn.net/images/cover/b83888148da4c3978b9c3870d8cb3166/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'jimi-hendrix'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Purple Haze', 1, 170),
  ('Manic Depression', 2, 223),
  ('Hey Joe', 3, 210),
  ('Love Or Confusion', 4, 192),
  ('May This Be Love', 5, 191),
  ($q$I Don't Live Today$q$, 6, 234),
  ('The Wind Cries Mary', 7, 201),
  ('Fire', 8, 164),
  ('Third Stone From The Sun', 9, 404),
  ('Foxey Lady', 10, 198),
  ('Are You Experienced?', 11, 256),
  ('Stone Free', 12, 216),
  ('51st Anniversary', 13, 196),
  ('Highway Chile', 14, 212),
  ('Can You See Me', 15, 153),
  ('Remember', 16, 169),
  ('Red House', 17, 231)
) as t(title, track_number, duration_seconds)
where a.slug = 'jimi-hendrix-are-you-experienced'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Chas Chandler', 'Produção')) as c(person_name, role)
where a.slug = 'jimi-hendrix-are-you-experienced' and s.url = 'https://en.wikipedia.org/wiki/Are_You_Experienced'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'UK Albums Chart', '#2'), ('certification', 'RIAA (Estados Unidos)', 'Multi-Platina')) as p(kind, label, value)
where a.slug = 'jimi-hendrix-are-you-experienced' and s.url = 'https://en.wikipedia.org/wiki/Are_You_Experienced';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'Hendrix precisou se mudar para Londres para encontrar reconhecimento, já que nos EUA era visto apenas como músico de acompanhamento de outros artistas.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'jimi-hendrix-are-you-experienced' and s.url = 'https://en.wikipedia.org/wiki/Are_You_Experienced';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'jimi-hendrix-are-you-experienced'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1967, Jimi Hendrix era um guitarrista americano até então obscuro que precisou se mudar para Londres para encontrar a banda e o público que reconheceriam sua genialidade.', 'interpretation', 0),
  ('world_context', $q$A Guerra do Vietnã se intensificava em 1967, e o "Verão do Amor" psicodélico se espalhava por Londres e São Francisco.$q$, 'interpretation', 0),
  ('world_context', 'Uma nova cena de rock guiada pelo virtuosismo instrumental emergia em Londres, epicentro europeu da experimentação psicodélica.', 'interpretation', 1),
  ('world_context', 'Em 1967, o primeiro transplante de coração humano bem-sucedido era realizado na África do Sul pelo cirurgião Christiaan Barnard.', 'interpretation', 2),
  ('musical_scene', 'Ao lado de guitarristas como Eric Clapton e Pete Townshend, Hendrix redefiniu o que era possível fazer com uma guitarra elétrica na cena de rock londrina.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, o disco causou sensação imediata no Reino Unido, consolidando Hendrix como o guitarrista mais revolucionário de sua geração antes mesmo de ele se tornar amplamente conhecido nos EUA.', 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "Are You Experienced" é considerado um dos discos de estreia mais influentes da história do rock, com Hendrix constantemente citado como o maior guitarrista de todos os tempos.$q$, 'critical_opinion', 1),
  ('album_summary', 'O disco de estreia que revelou Jimi Hendrix como o guitarrista mais revolucionário de sua geração.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'jimi-hendrix-are-you-experienced';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Are_You_Experienced'
where a.slug = 'jimi-hendrix-are-you-experienced';

-- =========================================================================
-- #31 Miles Davis - Kind of Blue (1959)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Kind of Blue - Wikipedia', 'https://en.wikipedia.org/wiki/Kind_of_Blue', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Miles Davis', 'miles-davis', '1944-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Kind of Blue', 'miles-davis-kind-of-blue', '1959-08-17', 'Jazz', 'Columbia', 5,
       'https://cdn-images.dzcdn.net/images/cover/88aec77a2c4a8ed8dd3c709a9fe418bc/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'miles-davis'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('So What', 1, 562),
  ('Freddie Freeloader', 2, 586),
  ('Blue in Green', 3, 337),
  ('All Blues', 4, 693),
  ('Flamenco Sketches', 5, 566)
) as t(title, track_number, duration_seconds)
where a.slug = 'miles-davis-kind-of-blue'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Miles Davis', 'Produção'), ('John Coltrane', 'Saxofone'), ('Bill Evans', 'Piano')) as c(person_name, role)
where a.slug = 'miles-davis-kind-of-blue' and s.url = 'https://en.wikipedia.org/wiki/Kind_of_Blue'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('certification', 'RIAA (Estados Unidos)', 'Multi-Platina')) as p(kind, label, value)
where a.slug = 'miles-davis-kind-of-blue' and s.url = 'https://en.wikipedia.org/wiki/Kind_of_Blue';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'A maior parte das faixas foram gravadas em apenas uma ou duas tomadas, com os músicos improvisando sobre esboços harmônicos que Davis apresentou pouco antes das gravações.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'miles-davis-kind-of-blue' and s.url = 'https://en.wikipedia.org/wiki/Kind_of_Blue';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'miles-davis-kind-of-blue'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1959, Miles Davis reunia um time de músicos de elite para gravar praticamente sem ensaios prévios, guiando a banda apenas com esboços harmônicos simples para estimular improvisação genuína.', 'interpretation', 0),
  ('world_context', 'A Guerra Fria se intensificava em 1959, com a Revolução Cubana liderada por Fidel Castro naquele mesmo ano.', 'interpretation', 0),
  ('world_context', 'O jazz modal começava a se afastar da complexidade harmônica do bebop em busca de uma linguagem mais aberta e espacial.', 'interpretation', 1),
  ('world_context', 'Em 1959, a Texas Instruments e a Fairchild desenvolviam de forma independente o circuito integrado, tecnologia que revolucionaria toda a eletrônica.', 'interpretation', 2),
  ('musical_scene', 'Reunindo John Coltrane, Bill Evans e Cannonball Adderley, "Kind of Blue" consolidou o jazz modal como nova linguagem, afastando-se da complexidade harmônica do bebop.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, o disco foi recebido com respeito imediato pela crítica de jazz, embora seu impacto total só tenha sido plenamente reconhecido com o tempo.', 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "Kind of Blue" é unanimemente considerado o álbum de jazz mais vendido e influente da história.$q$, 'critical_opinion', 1),
  ('album_summary', 'O disco que consolidou o jazz modal e se tornou o álbum de jazz mais vendido e influente da história.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'miles-davis-kind-of-blue';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Kind_of_Blue'
where a.slug = 'miles-davis-kind-of-blue';


-- =========================================================================
-- #33 Amy Winehouse - Back to Black (2006)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Back to Black - Wikipedia', 'https://en.wikipedia.org/wiki/Back_to_Black', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Amy Winehouse', 'amy-winehouse', '2003-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Back to Black', 'amy-winehouse-back-to-black', '2006-10-27', 'Soul / Jazz', 'Island', 11,
       'https://cdn-images.dzcdn.net/images/cover/5772b495f0dcdf660d0fc88c4c38a3fa/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'amy-winehouse'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Rehab', 1, 212),
  ($q$You Know I'm No Good$q$, 2, 259),
  ('Me & Mr Jones', 3, 154),
  ('Just Friends', 4, 191),
  ('Back To Black', 5, 240),
  ('Love Is A Losing Game', 6, 155),
  ('Tears Dry On Their Own', 7, 184),
  ('Wake Up Alone', 8, 221),
  ('Some Unholy War', 9, 141),
  ('He Can Only Hold Her', 10, 164),
  ('Addicted', 11, 162)
) as t(title, track_number, duration_seconds)
where a.slug = 'amy-winehouse-back-to-black'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Mark Ronson', 'Produção'), ('Salaam Remi', 'Produção')) as c(person_name, role)
where a.slug = 'amy-winehouse-back-to-black' and s.url = 'https://en.wikipedia.org/wiki/Back_to_Black'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'UK Albums Chart', '#1'), ('certification', 'RIAA (Estados Unidos)', 'Multi-Platina')) as p(kind, label, value)
where a.slug = 'amy-winehouse-back-to-black' and s.url = 'https://en.wikipedia.org/wiki/Back_to_Black';

insert into curiosities (album_id, summary, status, source_id)
select a.id, $q$A faixa "Rehab" narra a recusa real de Winehouse em buscar tratamento para o abuso de substâncias, tema que ganhou contornos trágicos após sua morte em 2011.$q$, 'confirmed', s.id
from albums a, sources s
where a.slug = 'amy-winehouse-back-to-black' and s.url = 'https://en.wikipedia.org/wiki/Back_to_Black';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'amy-winehouse-back-to-black'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 2006, Amy Winehouse atravessava o fim de um relacionamento tumultuado com Blake Fielder-Civil, canalizando a dor em canções diretamente inspiradas no soul e no doo-wop dos anos 1960.', 'interpretation', 0),
  ('world_context', 'O Reino Unido vivia os últimos anos do governo de Tony Blair em 2006, em meio a debates sobre a participação britânica na Guerra do Iraque.', 'interpretation', 0),
  ('world_context', 'Um revival do soul e R&B vintage ganhava força na cena musical britânica, ao lado de artistas como Duffy e Adele pouco depois.', 'interpretation', 1),
  ('world_context', 'Em 2006, o Twitter era lançado e o YouTube, recém-adquirido pelo Google, começava a transformar a forma como a música circulava.', 'interpretation', 2),
  ('musical_scene', 'Ao lado do produtor Mark Ronson, Winehouse liderou um revival do soul e do doo-wop dos anos 1960 dentro do pop britânico contemporâneo.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, o disco foi recebido com aclamação imediata, consolidando Winehouse como uma das vozes mais distintas de sua geração.', 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "Back to Black" é visto com ainda mais peso emocional após a morte prematura de Winehouse em 2011, e permanece um marco do revival soul dos anos 2000.$q$, 'critical_opinion', 1),
  ('album_summary', 'O relato confessional de uma separação dolorosa, transformado em um dos discos de soul mais marcantes dos anos 2000.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'amy-winehouse-back-to-black';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Back_to_Black'
where a.slug = 'amy-winehouse-back-to-black';

-- =========================================================================
-- #34 Stevie Wonder - Innervisions (1973)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Innervisions - Wikipedia', 'https://en.wikipedia.org/wiki/Innervisions', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Stevie Wonder', 'stevie-wonder', '1961-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Innervisions', 'stevie-wonder-innervisions', '1973-08-03', 'Soul / Funk', 'Tamla/Motown', 9,
       'https://cdn-images.dzcdn.net/images/cover/1cf2b7972e30a477b82f03302ec5453d/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'stevie-wonder'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Too High', 1, 276),
  ('Visions', 2, 323),
  ('Living For The City', 3, 443),
  ('Golden Lady', 4, 295),
  ('Higher Ground', 5, 222),
  ('Jesus Children Of America', 6, 250),
  ('All In Love Is Fair', 7, 222),
  ($q$Don't You Worry 'Bout A Thing$q$, 8, 285),
  ($q$He's Misstra Know-It-All$q$, 9, 336)
) as t(title, track_number, duration_seconds)
where a.slug = 'stevie-wonder-innervisions'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Stevie Wonder', 'Produção')) as c(person_name, role)
where a.slug = 'stevie-wonder-innervisions' and s.url = 'https://en.wikipedia.org/wiki/Innervisions'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#4'), ('certification', 'RIAA (Estados Unidos)', 'Platina')) as p(kind, label, value)
where a.slug = 'stevie-wonder-innervisions' and s.url = 'https://en.wikipedia.org/wiki/Innervisions';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'Poucos dias após o lançamento do disco, Wonder sofreu um grave acidente de carro que o deixou em coma por dias, sobrevivendo mas perdendo temporariamente o olfato.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'stevie-wonder-innervisions' and s.url = 'https://en.wikipedia.org/wiki/Innervisions';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'stevie-wonder-innervisions'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1973, Stevie Wonder consolidava sua fase de maior liberdade criativa na Motown, compondo sozinho a maior parte dos instrumentos do disco poucos dias antes de sofrer um grave acidente de carro.', 'interpretation', 0),
  ('world_context', 'O escândalo de Watergate começava a se desenrolar nos EUA em 1973, minando a confiança pública no governo.', 'interpretation', 0),
  ('world_context', 'A crise urbana e a desigualdade racial nas grandes cidades americanas eram temas centrais da produção musical negra do período.', 'interpretation', 1),
  ('world_context', 'Em 1973, o primeiro telefone celular portátil era demonstrado publicamente pela Motorola em Nova York.', 'interpretation', 2),
  ('musical_scene', 'Ao lado de Marvin Gaye e Curtis Mayfield, Wonder consolidava a soul music dos anos 1970 como veículo direto de crítica social urbana.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, o disco foi recebido com aclamação unânime da crítica, ganhando ainda mais repercussão após o grave acidente de carro que quase matou Wonder poucos dias depois.', 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "Innervisions" é considerado um dos discos mais completos da carreira de Stevie Wonder, equilibrando crítica social e espiritualidade.$q$, 'critical_opinion', 1),
  ('album_summary', 'O retrato musical da América urbana dos anos 1970, gravado por Stevie Wonder pouco antes de quase perder a vida em um acidente.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'stevie-wonder-innervisions';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Innervisions'
where a.slug = 'stevie-wonder-innervisions';

-- =========================================================================
-- #35 The Beatles - Rubber Soul (1965)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Rubber Soul - Wikipedia', 'https://en.wikipedia.org/wiki/Rubber_Soul', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Rubber Soul', 'the-beatles-rubber-soul', '1965-12-03', 'Rock', 'Parlophone', 14,
       'https://cdn-images.dzcdn.net/images/cover/da80520440d5d29876b9df3e375793b5/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'the-beatles'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Drive My Car', 1, 148),
  ('Norwegian Wood (This Bird Has Flown)', 2, 123),
  ($q$You Won't See Me$q$, 3, 199),
  ('Nowhere Man', 4, 162),
  ('Think For Yourself', 5, 137),
  ('The Word', 6, 162),
  ('Michelle', 7, 161),
  ('What Goes On', 8, 167),
  ('Girl', 9, 150),
  ($q$I'm Looking Through You$q$, 10, 145),
  ('In My Life', 11, 145),
  ('Wait', 12, 133),
  ('If I Needed Someone', 13, 141),
  ('Run For Your Life', 14, 141)
) as t(title, track_number, duration_seconds)
where a.slug = 'the-beatles-rubber-soul'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('George Martin', 'Produção')) as c(person_name, role)
where a.slug = 'the-beatles-rubber-soul' and s.url = 'https://en.wikipedia.org/wiki/Rubber_Soul'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#1'), ('certification', 'RIAA (Estados Unidos)', 'Multi-Platina')) as p(kind, label, value)
where a.slug = 'the-beatles-rubber-soul' and s.url = 'https://en.wikipedia.org/wiki/Rubber_Soul';

insert into curiosities (album_id, summary, status, source_id)
select a.id, $q$O título "Rubber Soul" é um trocadilho com a expressão "plastic soul", usada por músicos negros americanos para descrever artistas brancos que imitavam a soul music.$q$, 'confirmed', s.id
from albums a, sources s
where a.slug = 'the-beatles-rubber-soul' and s.url = 'https://en.wikipedia.org/wiki/Rubber_Soul';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'the-beatles-rubber-soul'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1965, os Beatles começavam a se distanciar da imagem de banda pop adolescente, influenciados pelo folk de Bob Dylan durante as gravações.', 'interpretation', 0),
  ('world_context', 'A Guerra do Vietnã se intensificava em 1965, com o envio de tropas de combate americanas em massa.', 'interpretation', 0),
  ('world_context', 'O folk de Bob Dylan influenciava diretamente bandas pop a aprofundar o conteúdo lírico de suas canções.', 'interpretation', 1),
  ('world_context', 'Em 1965, a Sony lançava o CV-2000, um dos primeiros videocassetes domésticos portáteis, ainda anos antes da popularização em massa do formato.', 'interpretation', 2),
  ('musical_scene', $q$Influenciado diretamente pelo folk de Bob Dylan, "Rubber Soul" marcou a transição dos Beatles de banda pop adolescente para artistas de introspecção lírica mais madura.$q$, 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, a crítica reconheceu de imediato o salto de maturidade lírica e musical da banda em relação aos discos anteriores.', 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "Rubber Soul" é visto como o disco-bisagra que abriu caminho para a fase mais experimental e madura dos Beatles.$q$, 'critical_opinion', 1),
  ('album_summary', 'O disco-bisagra em que os Beatles deixaram de ser banda pop adolescente para se tornarem artistas maduros.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'the-beatles-rubber-soul';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Rubber_Soul'
where a.slug = 'the-beatles-rubber-soul';

-- =========================================================================
-- #36 Michael Jackson - Off the Wall (1979)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Off the Wall - Wikipedia', 'https://en.wikipedia.org/wiki/Off_the_Wall_(album)', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Michael Jackson', 'michael-jackson', '1968-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Off the Wall', 'michael-jackson-off-the-wall', '1979-08-10', 'Disco / Pop', 'Epic', 10,
       'https://cdn-images.dzcdn.net/images/cover/9a1084ee1062fd9cd8dbeb1a8978351d/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'michael-jackson'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ($q$Don't Stop 'Til You Get Enough$q$, 1, 365),
  ('Rock with You', 2, 203),
  ('Workin Day and Night', 3, 312),
  ('Get on the Floor', 4, 278),
  ('Off the Wall', 5, 229),
  ('Girlfriend', 6, 184),
  ($q$She's Out of My Life$q$, 7, 218),
  ($q$I Can't Help It$q$, 8, 267),
  ($q$It's the Falling in Love$q$, 9, 226),
  ('Burn This Disco Out', 10, 220)
) as t(title, track_number, duration_seconds)
where a.slug = 'michael-jackson-off-the-wall'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Quincy Jones', 'Produção')) as c(person_name, role)
where a.slug = 'michael-jackson-off-the-wall' and s.url = 'https://en.wikipedia.org/wiki/Off_the_Wall_(album)'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#3'), ('certification', 'RIAA (Estados Unidos)', 'Multi-Platina')) as p(kind, label, value)
where a.slug = 'michael-jackson-off-the-wall' and s.url = 'https://en.wikipedia.org/wiki/Off_the_Wall_(album)';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'Apesar do sucesso avassalador, o disco foi praticamente ignorado nas principais categorias do Grammy, frustração que Jackson usou como motivação para "Thriller".', 'confirmed', s.id
from albums a, sources s
where a.slug = 'michael-jackson-off-the-wall' and s.url = 'https://en.wikipedia.org/wiki/Off_the_Wall_(album)';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'michael-jackson-off-the-wall'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1979, Michael Jackson buscava se libertar da imagem infantil dos Jackson 5, reunindo o produtor Quincy Jones pela primeira vez para provar sua capacidade como artista solo adulto.', 'interpretation', 0),
  ('world_context', 'O governo de Margaret Thatcher assumia o poder no Reino Unido em 1979, e a crise do petróleo abalava a economia americana.', 'interpretation', 0),
  ('world_context', $q$A febre da disco music atingia seu auge nos clubes americanos, pouco antes do movimento de reação "disco sucks" que se seguiria.$q$, 'interpretation', 1),
  ('world_context', 'Em 1979, a Sony e a Philips uniam forças para desenvolver o que se tornaria o Compact Disc, lançado poucos anos depois.', 'interpretation', 2),
  ('musical_scene', 'Lançado no auge da disco music, "Off the Wall" fundiu disco, funk e balada pop, ajudando a determinar a transição do gênero para o R&B dos anos 1980.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, o disco foi um sucesso comercial e de crítica imediato, embora tenha sido ignorado pela Academia do Grammy nas categorias principais.', 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "Off the Wall" é visto como o disco que estabeleceu as bases do estrelato solo de Michael Jackson, antecipando o fenômeno global que seria "Thriller".$q$, 'critical_opinion', 1),
  ('album_summary', $q$O disco que provou a capacidade de Michael Jackson como astro pop solo, abrindo caminho para "Thriller".$q$, 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'michael-jackson-off-the-wall';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Off_the_Wall_(album)'
where a.slug = 'michael-jackson-off-the-wall';

-- =========================================================================
-- #37 Dr. Dre - The Chronic (1992)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'The Chronic - Wikipedia', 'https://en.wikipedia.org/wiki/The_Chronic', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Dr. Dre', 'dr-dre', '1985-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'The Chronic', 'dr-dre-the-chronic', '1992-12-15', 'Hip Hop', 'Deathrow', 16,
       'https://cdn-images.dzcdn.net/images/cover/36cffacf94fdcc49921affe8a865f6f1/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'dr-dre'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('The Chronic (Intro)', 1, 118),
  ($q$Fuck Wit Dre Day (And Everybody's Celebratin')$q$, 2, 292),
  ('Let Me Ride', 3, 261),
  ('The Day The Niggaz Took Over', 4, 273),
  ($q$Nuthin' But A "G" Thang$q$, 5, 238),
  ('Deeez Nuuuts', 6, 306),
  ($q$Lil' Ghetto Boy$q$, 7, 329),
  ('A Nigga Witta Gun', 8, 232),
  ('Rat-Tat-Tat-Tat', 9, 229),
  ('The $20 Sack Pyramid', 10, 173),
  ('Lyrical Gangbang', 11, 244),
  ('High Powered', 12, 164),
  ($q$The Doctor's Office$q$, 13, 64),
  ('Stranded On Death Row', 14, 287),
  ('The Roach (The Chronic Outro)', 15, 277),
  ($q$Bitches Ain't Shit$q$, 16, 287)
) as t(title, track_number, duration_seconds)
where a.slug = 'dr-dre-the-chronic'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Dr. Dre', 'Produção')) as c(person_name, role)
where a.slug = 'dr-dre-the-chronic' and s.url = 'https://en.wikipedia.org/wiki/The_Chronic'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#3'), ('certification', 'RIAA (Estados Unidos)', 'Multi-Platina')) as p(kind, label, value)
where a.slug = 'dr-dre-the-chronic' and s.url = 'https://en.wikipedia.org/wiki/The_Chronic';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'O disco apresentou ao mundo um então desconhecido Snoop Dogg, que se tornaria uma das maiores estrelas do hip-hop nos anos seguintes.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'dr-dre-the-chronic' and s.url = 'https://en.wikipedia.org/wiki/The_Chronic';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'dr-dre-the-chronic'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1992, Dr. Dre deixava o N.W.A em meio a disputas contratuais para fundar a Death Row Records junto com Suge Knight, buscando provar sua visão sonora sem as amarras do grupo anterior.', 'interpretation', 0),
  ('world_context', 'Os tumultos de Los Angeles de 1992, após a absolvição dos policiais que espancaram Rodney King, expunham tensões raciais profundas nos EUA.', 'interpretation', 0),
  ('world_context', 'A cultura gangsta rap da Costa Oeste ganhava visibilidade nacional crescente, para além do círculo underground de Los Angeles.', 'interpretation', 1),
  ('world_context', 'Em 1992, a IBM lançava o ThinkPad, marcando a popularização dos computadores portáteis no mercado corporativo.', 'interpretation', 2),
  ('musical_scene', $q$Ao lançar as bases do "G-funk", com samples de funk dos anos 1970 e sintetizadores arrastados, Dr. Dre redefiniu o som do hip-hop da Costa Oeste na década de 1990.$q$, 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, o disco foi recebido com entusiasmo imediato, consolidando o G-funk como o som dominante do hip-hop da Costa Oeste na primeira metade dos anos 1990.', 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "The Chronic" é considerado um dos discos mais influentes da história do hip-hop, responsável por lançar a carreira solo de Snoop Dogg.$q$, 'critical_opinion', 1),
  ('album_summary', 'O disco que definiu o som G-funk e consolidou a Costa Oeste como potência do hip-hop dos anos 1990.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'dr-dre-the-chronic';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/The_Chronic'
where a.slug = 'dr-dre-the-chronic';

-- =========================================================================
-- #38 Bob Dylan - Blonde on Blonde (1966)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Blonde on Blonde - Wikipedia', 'https://en.wikipedia.org/wiki/Blonde_on_Blonde', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Blonde on Blonde', 'bob-dylan-blonde-on-blonde', '1966-06-20', 'Rock', 'Columbia', 14,
       'https://cdn-images.dzcdn.net/images/cover/0a59ebd1192454bac7b5d273f0b017c9/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'bob-dylan'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Rainy Day Women #12 & 35', 1, 274),
  ('Pledging My Time', 2, 228),
  ('Visions of Johanna', 3, 451),
  ('One of Us Must Know (Sooner or Later)', 4, 292),
  ('I Want You', 5, 185),
  ('Stuck Inside of Mobile with the Memphis Blues Again', 6, 424),
  ('Leopard-Skin Pill-Box Hat', 7, 237),
  ('Just Like a Woman', 8, 290),
  ($q$Most Likely You Go Your Way (And I'll Go Mine)$q$, 9, 207),
  ('Temporary Like Achilles', 10, 300),
  ('Absolutely Sweet Marie', 11, 294),
  ('Fourth Time Around', 12, 273),
  ('Obviously Five Believers', 13, 213),
  ('Sad-Eyed Lady of the Lowlands', 14, 679)
) as t(title, track_number, duration_seconds)
where a.slug = 'bob-dylan-blonde-on-blonde'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Bob Johnston', 'Produção')) as c(person_name, role)
where a.slug = 'bob-dylan-blonde-on-blonde' and s.url = 'https://en.wikipedia.org/wiki/Blonde_on_Blonde'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#9'), ('certification', 'RIAA (Estados Unidos)', 'Platina')) as p(kind, label, value)
where a.slug = 'bob-dylan-blonde-on-blonde' and s.url = 'https://en.wikipedia.org/wiki/Blonde_on_Blonde';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'Boa parte do disco foi gravado com músicos de sessão de Nashville que nunca haviam trabalhado com um artista de rock, adaptando-se em tempo real ao estilo de Dylan.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'bob-dylan-blonde-on-blonde' and s.url = 'https://en.wikipedia.org/wiki/Blonde_on_Blonde';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'bob-dylan-blonde-on-blonde'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1966, Bob Dylan levava sua banda elétrica para gravar em Nashville, cidade símbolo da música country, buscando um som mais amplo e orquestral do que em discos anteriores.', 'interpretation', 0),
  ('world_context', 'A Guerra do Vietnã se intensificava em 1966, dividindo a opinião pública americana.', 'interpretation', 0),
  ('world_context', 'Nashville consolidava-se como polo de gravação profissional, atraindo artistas de fora do circuito country tradicional.', 'interpretation', 1),
  ('world_context', 'Em 1966, o Lunar Orbiter 1 dos EUA enviava a primeira fotografia da Terra vista da órbita da Lua.', 'interpretation', 2),
  ('musical_scene', 'Ao gravar com músicos de sessão de Nashville, Dylan expandiu o rock elétrico para um som mais amplo e orquestral, influenciando a aproximação entre rock e country que se seguiria.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, a crítica elogiou a ambição do disco duplo, embora parte do público ainda resistisse à fase elétrica de Dylan.', 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "Blonde on Blonde" é considerado um dos discos mais completos da carreira de Dylan, síntese de sua fase elétrica mais aclamada.$q$, 'critical_opinion', 1),
  ('album_summary', 'O disco duplo gravado em Nashville que expandiu o rock elétrico de Bob Dylan para uma escala orquestral.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'bob-dylan-blonde-on-blonde';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Blonde_on_Blonde'
where a.slug = 'bob-dylan-blonde-on-blonde';

-- =========================================================================
-- #39 Talking Heads - Remain in Light (1980)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Remain in Light - Wikipedia', 'https://en.wikipedia.org/wiki/Remain_in_Light', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Talking Heads', 'talking-heads', '1975-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Remain in Light', 'talking-heads-remain-in-light', '1980-10-08', 'New Wave', 'Sire', 8,
       'https://cdn-images.dzcdn.net/images/cover/875f5b50833ff9d7950934bf1792a43a/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'talking-heads'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Born Under Punches (The Heat Goes On)', 1, 348),
  ('Crosseyed and Painless', 2, 287),
  ('The Great Curve', 3, 387),
  ('Once in a Lifetime', 4, 258),
  ('Houses in Motion', 5, 273),
  ('Seen and Not Seen', 6, 204),
  ('Listening Wind', 7, 283),
  ('The Overload', 8, 360)
) as t(title, track_number, duration_seconds)
where a.slug = 'talking-heads-remain-in-light'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Brian Eno', 'Produção')) as c(person_name, role)
where a.slug = 'talking-heads-remain-in-light' and s.url = 'https://en.wikipedia.org/wiki/Remain_in_Light'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#19'), ('certification', 'RIAA (Estados Unidos)', 'Ouro')) as p(kind, label, value)
where a.slug = 'talking-heads-remain-in-light' and s.url = 'https://en.wikipedia.org/wiki/Remain_in_Light';

insert into curiosities (album_id, summary, status, source_id)
select a.id, $q$A canção "Once in a Lifetime" e seu clipe, com David Byrne em movimentos de dança robóticos, se tornaram um dos vídeos mais influentes da história da MTV, ainda antes da emissora existir.$q$, 'confirmed', s.id
from albums a, sources s
where a.slug = 'talking-heads-remain-in-light' and s.url = 'https://en.wikipedia.org/wiki/Remain_in_Light';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'talking-heads-remain-in-light'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1980, o Talking Heads, guiado por David Byrne e o produtor Brian Eno, se afastava da estrutura pop convencional para explorar polirritmos africanos e composição coletiva em estúdio.', 'interpretation', 0),
  ('world_context', 'A crise dos reféns no Irã dominava a política externa americana em 1980, no ano da eleição de Ronald Reagan.', 'interpretation', 0),
  ('world_context', 'A New Wave se consolidava como resposta mais melódica e experimental ao punk, ao lado de bandas como Devo.', 'interpretation', 1),
  ('world_context', 'Em 1980, a IBM assinava contrato com a Microsoft para o sistema operacional de seu primeiro computador pessoal, o IBM PC.', 'interpretation', 2),
  ('musical_scene', 'Influenciado pela polirritmia afrobeat de Fela Kuti, o disco aproximou a New Wave americana de texturas musicais africanas raramente exploradas pelo rock até então.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, o disco foi recebido com aclamação imediata pela crítica especializada, embora seu experimentalismo limitasse seu alcance comercial mais amplo.', 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "Remain in Light" é considerado um dos discos mais influentes da New Wave e um marco na fusão entre rock e música africana.$q$, 'critical_opinion', 1),
  ('album_summary', 'O disco em que o Talking Heads fundiu New Wave e polirritmos africanos sob a produção de Brian Eno.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'talking-heads-remain-in-light';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Remain_in_Light'
where a.slug = 'talking-heads-remain-in-light';

-- =========================================================================
-- #40 David Bowie - The Rise and Fall of Ziggy Stardust and the Spiders From Mars (1972)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'The Rise and Fall of Ziggy Stardust and the Spiders from Mars - Wikipedia', 'https://en.wikipedia.org/wiki/The_Rise_and_Fall_of_Ziggy_Stardust_and_the_Spiders_from_Mars', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('David Bowie', 'david-bowie', '1964-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'The Rise and Fall of Ziggy Stardust and the Spiders From Mars', 'david-bowie-the-rise-and-fall-of-ziggy-stardust', '1972-06-16', 'Glam Rock', 'RCA', 11,
       'https://cdn-images.dzcdn.net/images/cover/23bdeda0503dec55e7ba6a9f56d0c3c2/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'david-bowie'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Five Years', 1, 283),
  ('Soul Love', 2, 214),
  ('Moonage Daydream', 3, 279),
  ('Starman', 4, 254),
  ($q$It Ain't Easy$q$, 5, 177),
  ('Lady Stardust', 6, 201),
  ('Star', 7, 167),
  ('Hang on to Yourself', 8, 159),
  ('Ziggy Stardust', 9, 193),
  ('Suffragette City', 10, 208),
  ($q$Rock 'n' Roll Suicide$q$, 11, 178)
) as t(title, track_number, duration_seconds)
where a.slug = 'david-bowie-the-rise-and-fall-of-ziggy-stardust'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Ken Scott', 'Produção'), ('David Bowie', 'Produção')) as c(person_name, role)
where a.slug = 'david-bowie-the-rise-and-fall-of-ziggy-stardust' and s.url = 'https://en.wikipedia.org/wiki/The_Rise_and_Fall_of_Ziggy_Stardust_and_the_Spiders_from_Mars'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'UK Albums Chart', '#5'), ('certification', 'RIAA (Estados Unidos)', 'Platina')) as p(kind, label, value)
where a.slug = 'david-bowie-the-rise-and-fall-of-ziggy-stardust' and s.url = 'https://en.wikipedia.org/wiki/The_Rise_and_Fall_of_Ziggy_Stardust_and_the_Spiders_from_Mars';

insert into curiosities (album_id, summary, status, source_id)
select a.id, $q$Bowie encerrou a turnê do disco anunciando abruptamente, em pleno show, a "morte" de Ziggy Stardust, sem avisar previamente sua própria banda.$q$, 'confirmed', s.id
from albums a, sources s
where a.slug = 'david-bowie-the-rise-and-fall-of-ziggy-stardust' and s.url = 'https://en.wikipedia.org/wiki/The_Rise_and_Fall_of_Ziggy_Stardust_and_the_Spiders_from_Mars';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'david-bowie-the-rise-and-fall-of-ziggy-stardust'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1972, David Bowie criava Ziggy Stardust, um alter ego andrógino de astro do rock alienígena, para escapar do anonimato relativo de sua carreira até então.', 'interpretation', 0),
  ('world_context', 'O escândalo de Watergate começava a se desenrolar nos EUA em 1972, embora suas consequências só ficassem claras depois.', 'interpretation', 0),
  ('world_context', 'O glam rock explodia no Reino Unido, com Bowie, T. Rex e Roxy Music explorando androginia e teatralidade no visual do rock.', 'interpretation', 1),
  ('world_context', 'Em 1972, a sonda americana Pioneer 10 era lançada, tornando-se futuramente a primeira espaçonave a deixar o Sistema Solar.', 'interpretation', 2),
  ('musical_scene', 'Ao lado de T. Rex e Roxy Music, Bowie liderava a explosão do glam rock britânico, explorando teatralidade e androginia de forma até então inédita no rock mainstream.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, o disco consolidou Bowie como estrela do rock britânico, com a persona Ziggy Stardust gerando fascínio imediato entre crítica e público.', 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, "Ziggy Stardust" é considerado um dos discos-conceito mais influentes do rock, e a persona de Bowie continua sendo referência para gerações de artistas.$q$, 'critical_opinion', 1),
  ('album_summary', 'O disco-conceito que apresentou Ziggy Stardust, o alter ego andrógino que transformou David Bowie em estrela do glam rock.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'david-bowie-the-rise-and-fall-of-ziggy-stardust';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/The_Rise_and_Fall_of_Ziggy_Stardust_and_the_Spiders_from_Mars'
where a.slug = 'david-bowie-the-rise-and-fall-of-ziggy-stardust';
