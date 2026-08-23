-- Popula os álbuns #1 a #15 da lista RS500_Greatest_Albums.xlsx (Rolling Stone).
-- Ficha técnica (faixas, duração, capa) obtida da API do Deezer na época da escrita desta migration.
-- Conteúdo narrativo, créditos e curiosidades escritos manualmente com base em fatos amplamente documentados.

-- =========================================================================
-- #1 Marvin Gaye - What's Going On (1971)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', $q$What's Going On - Wikipedia$q$, 'https://en.wikipedia.org/wiki/What%27s_Going_On_(album)', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Marvin Gaye', 'marvin-gaye', '1961-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, $q$What's Going On$q$, 'marvin-gaye-whats-going-on', '1971-05-21', 'Soul', 'Tamla/Motown', 9,
       'https://cdn-images.dzcdn.net/images/cover/dd5e37f720256949a07a7e1a91754550/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'marvin-gaye'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ($q$What's Going On$q$, 1, 231),
  ($q$What's Happening Brother$q$, 2, 164),
  ($q$Flyin' High (In the Friendly Sky)$q$, 3, 229),
  ('Save the Children', 4, 243),
  ('God Is Love', 5, 102),
  ('Mercy Mercy Me (The Ecology)', 6, 193),
  ('Right On', 7, 451),
  ('Wholy Holy', 8, 188),
  ('Inner City Blues (Make Me Wanna Holler)', 9, 327)
) as t(title, track_number, duration_seconds)
where a.slug = 'marvin-gaye-whats-going-on'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Marvin Gaye', 'Produção'), ('Marvin Gaye', 'Bateria')) as c(person_name, role)
where a.slug = 'marvin-gaye-whats-going-on' and s.url = 'https://en.wikipedia.org/wiki/What%27s_Going_On_(album)'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#6'), ('certification', 'RIAA (Estados Unidos)', 'Platina')) as p(kind, label, value)
where a.slug = 'marvin-gaye-whats-going-on' and s.url = 'https://en.wikipedia.org/wiki/What%27s_Going_On_(album)';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'Insatisfeito com os músicos de sessão, Marvin Gaye tocou boa parte da bateria do disco ele mesmo, algo raro para um artista da Motown na época.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'marvin-gaye-whats-going-on' and s.url = 'https://en.wikipedia.org/wiki/What%27s_Going_On_(album)';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'marvin-gaye-whats-going-on'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Marvin Gaye, então uma das maiores estrelas da Motown, atravessava o luto pela morte da parceira vocal Tammi Terrell e uma crescente desilusão com as fórmulas pop da gravadora; decidido a se expressar como autor, desafiou Berry Gordy para lançar um álbum-conceito sobre a América ao seu redor.', 'interpretation', 0),
  ('world_context', 'Em 1971, os EUA viviam o auge dos protestos contra a Guerra do Vietnã e a tensão racial do pós-movimento dos direitos civis, cenário que atravessa as letras do disco.', 'interpretation', 0),
  ('world_context', 'O soul consciente ganhava força como resposta artística à turbulência social, ao lado de nomes como Curtis Mayfield e Sly and the Family Stone.', 'interpretation', 1),
  ('world_context', 'Estúdios com gravação multipista permitiam sobreposições vocais elaboradas, técnica que Gaye explorou ao "duetar" com a própria voz ao longo do disco.', 'interpretation', 2),
  ('musical_scene', $q$Ao lado de discos como "Curtis", de Curtis Mayfield, "What's Going On" ajudou a redefinir a soul music como veículo de crítica social no início dos anos 1970.$q$, 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, a Motown hesitou em lançar o álbum, temendo que o tom político afastasse o público pop, mas a crítica e o público reagiram com entusiasmo à ousadia temática e sonora do disco.', 'fact', 0),
  ('reception_vs_legacy', $q$Hoje, décadas depois, "What's Going On" é unanimemente aclamado como um dos discos mais importantes da história da música popular americana, e Marvin Gaye é lembrado como pioneiro do soul autoral.$q$, 'critical_opinion', 1),
  ('album_summary', 'Um álbum-conceito que transformou a soul music em ferramenta de crítica social, redefinindo a carreira de Marvin Gaye.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'marvin-gaye-whats-going-on';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/What%27s_Going_On_(album)'
where a.slug = 'marvin-gaye-whats-going-on';

-- =========================================================================
-- #2 The Beach Boys - Pet Sounds (1966)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Pet Sounds - Wikipedia', 'https://en.wikipedia.org/wiki/Pet_Sounds', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('The Beach Boys', 'the-beach-boys', '1961-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Pet Sounds', 'the-beach-boys-pet-sounds', '1966-05-16', 'Pop / Rock', 'Capitol Records', 13,
       'https://cdn-images.dzcdn.net/images/cover/ddfe7ab3d0a960099debb0bf56c70460/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'the-beach-boys'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ($q$Wouldn't It Be Nice$q$, 1, 153),
  ('You Still Believe in Me', 2, 154),
  ($q$That's Not Me$q$, 3, 149),
  ($q$Don't Talk (Put Your Head on My Shoulder)$q$, 4, 177),
  ($q$I'm Waiting for the Day$q$, 5, 185),
  ($q$Let's Go Away for Awhile$q$, 6, 145),
  ('Sloop John B', 7, 183),
  ('God Only Knows', 8, 173),
  ($q$I Know There's an Answer$q$, 9, 196),
  ('Here Today', 10, 186),
  ($q$I Just Wasn't Made for These Times$q$, 11, 199),
  ('Pet Sounds', 12, 158),
  ('Caroline, No', 13, 172)
) as t(title, track_number, duration_seconds)
where a.slug = 'the-beach-boys-pet-sounds'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Brian Wilson', 'Produção'), ('Brian Wilson', 'Composição')) as c(person_name, role)
where a.slug = 'the-beach-boys-pet-sounds' and s.url = 'https://en.wikipedia.org/wiki/Pet_Sounds'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#10'), ('certification', 'RIAA (Estados Unidos)', 'Platina')) as p(kind, label, value)
where a.slug = 'the-beach-boys-pet-sounds' and s.url = 'https://en.wikipedia.org/wiki/Pet_Sounds';

insert into curiosities (album_id, summary, status, source_id)
select a.id, '"Pet Sounds" nasceu da ambição de Brian Wilson de superar "Rubber Soul", dos Beatles, disco que o impressionou profundamente pouco antes das sessões de gravação.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'the-beach-boys-pet-sounds' and s.url = 'https://en.wikipedia.org/wiki/Pet_Sounds';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'the-beach-boys-pet-sounds'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1966, Brian Wilson vivia obcecado em superar os Beatles, afastando-se das turnês para se dedicar inteiramente à composição e à produção em estúdio, enquanto lidava com ansiedade crescente.', 'interpretation', 0),
  ('world_context', 'A Guerra do Vietnã escalava e o serviço militar obrigatório dividia a juventude americana em 1966.', 'interpretation', 0),
  ('world_context', 'A contracultura psicodélica começava a florescer na Califórnia, meses antes do "Verão do Amor" de 1967.', 'interpretation', 1),
  ('world_context', 'Wilson explorou gravação multipista e instrumentação incomum, de theremin a buzinas de bicicleta, para criar texturas sonoras inéditas no pop.', 'interpretation', 2),
  ('musical_scene', $q$Lançado meses depois de "Rubber Soul", dos Beatles — disco que inspirou Wilson diretamente —, "Pet Sounds" elevou o nível de ambição sonora do pop e pavimentou o caminho para o próprio "Sgt. Pepper's".$q$, 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, "Pet Sounds" vendeu menos que discos anteriores do grupo nos EUA e deixou a Capitol descontente, ainda que tenha sido recebido com entusiasmo imediato no Reino Unido.', 'fact', 0),
  ('reception_vs_legacy', 'Hoje, "Pet Sounds" é considerado uma das maiores obras da história do pop, citado como influência direta por artistas de gerações seguintes por sua ousadia harmônica.', 'critical_opinion', 1),
  ('album_summary', 'A obra-prima orquestral de Brian Wilson que redefiniu os limites de ambição e produção do pop.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'the-beach-boys-pet-sounds';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Pet_Sounds'
where a.slug = 'the-beach-boys-pet-sounds';

-- =========================================================================
-- #3 Joni Mitchell - Blue (1971)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Blue (Joni Mitchell album) - Wikipedia', 'https://en.wikipedia.org/wiki/Blue_(Joni_Mitchell_album)', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Joni Mitchell', 'joni-mitchell', '1962-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Blue', 'joni-mitchell-blue', '1971-06-22', 'Folk', 'Reprise Records', 10,
       'https://cdn-images.dzcdn.net/images/cover/4b88942c26d25020a0fd49a7ad304532/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'joni-mitchell'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('All I Want', 1, 214),
  ('My Old Man', 2, 214),
  ('Little Green', 3, 207),
  ('Carey', 4, 182),
  ('Blue', 5, 177),
  ('California', 6, 230),
  ('This Flight Tonight', 7, 172),
  ('River', 8, 245),
  ('A Case of You', 9, 263),
  ('The Last Time I Saw Richard', 10, 256)
) as t(title, track_number, duration_seconds)
where a.slug = 'joni-mitchell-blue'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Joni Mitchell', 'Produção'), ('Henry Lewy', 'Engenharia de gravação')) as c(person_name, role)
where a.slug = 'joni-mitchell-blue' and s.url = 'https://en.wikipedia.org/wiki/Blue_(Joni_Mitchell_album)'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('certification', 'RIAA (Estados Unidos)', 'Platina')) as p(kind, label, value)
where a.slug = 'joni-mitchell-blue' and s.url = 'https://en.wikipedia.org/wiki/Blue_(Joni_Mitchell_album)';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'Joni Mitchell tocou um dulcimer apalachiano em várias faixas do disco, instrumento incomum no formato cantor-compositor da época.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'joni-mitchell-blue' and s.url = 'https://en.wikipedia.org/wiki/Blue_(Joni_Mitchell_album)';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'joni-mitchell-blue'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1971, Joni Mitchell atravessava o fim de relacionamentos importantes e uma fase de vulnerabilidade emocional extrema, decidindo escrever sem filtros sobre amor, perda e liberdade pessoal.', 'interpretation', 0),
  ('world_context', 'O movimento feminista ganhava força nos EUA, questionando papéis tradicionais de gênero no início dos anos 1970.', 'interpretation', 0),
  ('world_context', 'A cena folk de Laurel Canyon, na Califórnia, consolidava-se como polo criativo de cantores-compositores confessionais.', 'interpretation', 1),
  ('world_context', 'Mitchell usou afinações abertas incomuns em violão e o dulcimer apalachiano, ampliando as possibilidades harmônicas do formato voz-e-violão.', 'interpretation', 2),
  ('musical_scene', 'Ao lado de contemporâneos como James Taylor e Neil Young, "Blue" ajudou a consolidar o cantor-compositor confessional como força central da música popular do início dos anos 1970.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, a crítica elogiou a honestidade emocional do disco, ainda que o tom intimista soasse arriscado para uma artista até então vista principalmente como parte da cena folk.', 'fact', 0),
  ('reception_vs_legacy', 'Hoje, "Blue" é constantemente citado como um dos álbuns mais influentes já feitos, referência obrigatória para gerações de cantores-compositores confessionais.', 'critical_opinion', 1),
  ('album_summary', 'O retrato confessional e cru de uma artista em transformação, que se tornou modelo para a canção autoral.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'joni-mitchell-blue';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Blue_(Joni_Mitchell_album)'
where a.slug = 'joni-mitchell-blue';

-- =========================================================================
-- #4 Stevie Wonder - Songs in the Key of Life (1976)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Songs in the Key of Life - Wikipedia', 'https://en.wikipedia.org/wiki/Songs_in_the_Key_of_Life', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Stevie Wonder', 'stevie-wonder', '1961-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Songs in the Key of Life', 'stevie-wonder-songs-in-the-key-of-life', '1976-09-28', 'Soul / R&B', 'Tamla/Motown', 21,
       'https://cdn-images.dzcdn.net/images/cover/ed7d05fc8407ff367c7fe39bd0d28a56/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'stevie-wonder'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ($q$Love's in Need of Love Today$q$, 1, 425),
  ('Have a Talk with God', 2, 162),
  ('Village Ghetto Land', 3, 205),
  ('Contusion', 4, 225),
  ('Sir Duke', 5, 233),
  ('I Wish', 6, 253),
  ('Knocks Me Off My Feet', 7, 217),
  ('Pastime Paradise', 8, 209),
  ('Summer Soft', 9, 254),
  ('Ordinary Pain', 10, 383),
  ($q$Isn't She Lovely$q$, 11, 396),
  ('Joy Inside My Tears', 12, 389),
  ('Black Man', 13, 509),
  ('Ngiculela – Es Una Historia – I Am Singing', 14, 229),
  ($q$If It's Magic$q$, 15, 192),
  ('As', 16, 429),
  ('Another Star', 17, 508),
  ('Saturn', 18, 293),
  ('Ebony Eyes', 19, 248),
  ('All Day Sucker', 20, 305),
  ($q$Easy Goin' Evening (My Mama's Call)$q$, 21, 236)
) as t(title, track_number, duration_seconds)
where a.slug = 'stevie-wonder-songs-in-the-key-of-life'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Stevie Wonder', 'Produção'), ('Stevie Wonder', 'Composição')) as c(person_name, role)
where a.slug = 'stevie-wonder-songs-in-the-key-of-life' and s.url = 'https://en.wikipedia.org/wiki/Songs_in_the_Key_of_Life'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#1'), ('certification', 'RIAA (Estados Unidos)', 'Multi-Platina')) as p(kind, label, value)
where a.slug = 'stevie-wonder-songs-in-the-key-of-life' and s.url = 'https://en.wikipedia.org/wiki/Songs_in_the_Key_of_Life';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'Cego desde os primeiros meses de vida, Stevie Wonder compôs, tocou e produziu praticamente todos os instrumentos do disco, um álbum duplo com mais de dois anos de gravação.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'stevie-wonder-songs-in-the-key-of-life' and s.url = 'https://en.wikipedia.org/wiki/Songs_in_the_Key_of_Life';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'stevie-wonder-songs-in-the-key-of-life'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1976, Stevie Wonder vivia o auge de um contrato milionário e de liberdade criativa plena, e passou mais de dois anos gravando um álbum duplo ambicioso que resumia sua visão de vida, espiritualidade e sociedade.', 'interpretation', 0),
  ('world_context', 'Os EUA celebravam o bicentenário da independência em 1976, em um momento de reflexão nacional após o Watergate.', 'interpretation', 0),
  ('world_context', 'A música negra americana atravessava um momento de expansão criativa, com soul, funk e disco convivendo nas paradas.', 'interpretation', 1),
  ('world_context', 'Wonder incorporou sintetizadores programáveis de forma pioneira, ampliando a paleta sonora da soul music.', 'interpretation', 2),
  ('musical_scene', 'Ao lado de nomes como Earth, Wind & Fire e Marvin Gaye, o disco consolidou a soul dos anos 1970 como território de ambição orquestral e temática.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, o álbum foi recebido com aclamação imediata, alcançando o topo das paradas americanas assim que chegou às lojas — um feito raro na época.', 'fact', 0),
  ('reception_vs_legacy', 'Hoje, "Songs in the Key of Life" é visto como o auge criativo de Stevie Wonder e um dos discos mais completos já feitos na música popular.', 'critical_opinion', 1),
  ('album_summary', 'O ápice criativo de Stevie Wonder, um álbum duplo que sintetiza soul, funk e espiritualidade em escala orquestral.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'stevie-wonder-songs-in-the-key-of-life';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Songs_in_the_Key_of_Life'
where a.slug = 'stevie-wonder-songs-in-the-key-of-life';

-- =========================================================================
-- #5 The Beatles - Abbey Road (1969)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Abbey Road - Wikipedia', 'https://en.wikipedia.org/wiki/Abbey_Road', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('The Beatles', 'the-beatles', '1960-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Abbey Road', 'the-beatles-abbey-road', '1969-09-26', 'Rock', 'Apple Records', 17,
       'https://cdn-images.dzcdn.net/images/cover/aa94ab293730bb7845d2aa8c672b2c29/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'the-beatles'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Come Together', 1, 258),
  ('Something', 2, 181),
  ($q$Maxwell's Silver Hammer$q$, 3, 206),
  ('Oh! Darling', 4, 207),
  ($q$Octopus's Garden$q$, 5, 169),
  ($q$I Want You (She's So Heavy)$q$, 6, 465),
  ('Here Comes the Sun', 7, 184),
  ('Because', 8, 165),
  ('You Never Give Me Your Money', 9, 242),
  ('Sun King', 10, 146),
  ('Mean Mr. Mustard', 11, 66),
  ('Polythene Pam', 12, 72),
  ('She Came in Through the Bathroom Window', 13, 117),
  ('Golden Slumbers', 14, 91),
  ('Carry That Weight', 15, 96),
  ('The End', 16, 142),
  ('Her Majesty', 17, 25)
) as t(title, track_number, duration_seconds)
where a.slug = 'the-beatles-abbey-road'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('George Martin', 'Produção'), ('Geoff Emerick', 'Engenharia de gravação')) as c(person_name, role)
where a.slug = 'the-beatles-abbey-road' and s.url = 'https://en.wikipedia.org/wiki/Abbey_Road'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#1'), ('certification', 'RIAA (Estados Unidos)', 'Multi-Platina')) as p(kind, label, value)
where a.slug = 'the-beatles-abbey-road' and s.url = 'https://en.wikipedia.org/wiki/Abbey_Road';

insert into curiosities (album_id, summary, status, source_id)
select a.id, '"Abbey Road" foi o último álbum gravado pelos Beatles como grupo, ainda que "Let It Be" tenha sido lançado depois, em 1970, com material gravado antes.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'the-beatles-abbey-road' and s.url = 'https://en.wikipedia.org/wiki/Abbey_Road';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'the-beatles-abbey-road'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1969, os Beatles já viviam tensões internas profundas que os levariam ao fim, mas decidiram, a pedido de Paul McCartney, deixar as brigas de lado para gravar juntos uma última vez de forma coesa.', 'interpretation', 0),
  ('world_context', 'O programa espacial Apollo levou o homem à Lua em julho de 1969, meses antes do lançamento do disco.', 'interpretation', 0),
  ('world_context', 'O festival de Woodstock, em agosto de 1969, simbolizava o auge e também o início do declínio da contracultura hippie.', 'interpretation', 1),
  ('world_context', '"Abbey Road" foi um dos primeiros grandes discos a usar extensivamente o sintetizador Moog, além de mesas de mixagem de oito canais.', 'interpretation', 2),
  ('musical_scene', 'Lançado enquanto o rock experimentava tanto o peso do hard rock nascente quanto a sofisticação progressiva, "Abbey Road" mostrou os Beatles reafirmando sua capacidade de síntese estilística até o fim.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, a crítica recebeu o disco com entusiasmo, embora alguns setores o considerassem "comercial demais" em comparação ao experimentalismo de discos anteriores da banda.', 'fact', 0),
  ('reception_vs_legacy', 'Hoje, "Abbey Road" é frequentemente citado como um dos maiores álbuns já feitos, com o medley do lado B reconhecido como um dos pontos altos da carreira do grupo.', 'critical_opinion', 1),
  ('album_summary', 'O último disco gravado pelos Beatles, uma despedida coesa que resume a genialidade coletiva do grupo.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'the-beatles-abbey-road';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Abbey_Road'
where a.slug = 'the-beatles-abbey-road';

-- =========================================================================
-- #6 Nirvana - Nevermind (1991)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Nevermind - Wikipedia', 'https://en.wikipedia.org/wiki/Nevermind', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Nirvana', 'nirvana', '1987-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Nevermind', 'nirvana-nevermind', '1991-09-24', 'Grunge / Rock', 'DGC/Geffen', 13,
       'https://cdn-images.dzcdn.net/images/cover/f0282817b697279e56df13909962a54a/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'nirvana'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Smells Like Teen Spirit', 1, 301),
  ('In Bloom', 2, 254),
  ('Come as You Are', 3, 218),
  ('Breed', 4, 183),
  ('Lithium', 5, 255),
  ('Polly', 6, 174),
  ('Territorial Pissings', 7, 142),
  ('Drain You', 8, 224),
  ('Lounge Act', 9, 156),
  ('Stay Away', 10, 211),
  ('On a Plain', 11, 194),
  ('Something in the Way', 12, 231),
  ('Endless, Nameless', 13, 400)
) as t(title, track_number, duration_seconds)
where a.slug = 'nirvana-nevermind'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Butch Vig', 'Produção'), ('Andy Wallace', 'Mixagem')) as c(person_name, role)
where a.slug = 'nirvana-nevermind' and s.url = 'https://en.wikipedia.org/wiki/Nevermind'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#1'), ('certification', 'RIAA (Estados Unidos)', 'Diamante')) as p(kind, label, value)
where a.slug = 'nirvana-nevermind' and s.url = 'https://en.wikipedia.org/wiki/Nevermind';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'O sucesso de "Nevermind" pegou a própria gravadora de surpresa: a Geffen esperava vender uma fração do que o disco vendeu nos primeiros meses.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'nirvana-nevermind' and s.url = 'https://en.wikipedia.org/wiki/Nevermind';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'nirvana-nevermind'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1991, Kurt Cobain era um jovem músico de Aberdeen, Washington, cético em relação ao sucesso comercial, gravando um disco que misturava pop melódico e fúria punk sem esperar o estrelato que viria a seguir.', 'interpretation', 0),
  ('world_context', 'A União Soviética entrava em colapso final em 1991, encerrando décadas de Guerra Fria.', 'interpretation', 0),
  ('world_context', 'O grunge de Seattle emergia como reação ao excesso glamouroso do hair metal dominante nos anos 1980.', 'interpretation', 1),
  ('world_context', 'A MTV e os videoclipes eram decisivos para a explosão de bandas alternativas, caso do vídeo de "Smells Like Teen Spirit".', 'interpretation', 2),
  ('musical_scene', 'Ao lado de bandas como Pearl Jam e Soundgarden, o Nirvana transformou Seattle no epicentro do rock alternativo, encerrando abruptamente o domínio do hair metal nas paradas.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, "Nevermind" superou expectativas modestas da gravadora e alcançou o topo das paradas em poucos meses, pegando a própria indústria musical de surpresa.', 'fact', 0),
  ('reception_vs_legacy', 'Hoje, "Nevermind" é visto como o disco que encerrou uma era e iniciou outra, marco definitivo da explosão do rock alternativo nos anos 1990.', 'critical_opinion', 1),
  ('album_summary', 'O disco que levou o grunge ao mainstream e encerrou o domínio do hair metal nas paradas americanas.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'nirvana-nevermind';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Nevermind'
where a.slug = 'nirvana-nevermind';

-- =========================================================================
-- #7 Fleetwood Mac - Rumours (1977)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Rumours - Wikipedia', 'https://en.wikipedia.org/wiki/Rumours_(album)', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Fleetwood Mac', 'fleetwood-mac', '1967-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Rumours', 'fleetwood-mac-rumours', '1977-02-04', 'Rock / Pop', 'Warner Bros. Records', 11,
       'https://cdn-images.dzcdn.net/images/cover/9732751ce91d786dcf30069853697078/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'fleetwood-mac'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Second Hand News', 1, 176),
  ('Dreams', 2, 257),
  ('Never Going Back Again', 3, 134),
  ($q$Don't Stop$q$, 4, 193),
  ('Go Your Own Way', 5, 223),
  ('Songbird', 6, 200),
  ('The Chain', 7, 268),
  ('You Make Loving Fun', 8, 213),
  ($q$I Don't Want to Know$q$, 9, 196),
  ('Oh Daddy', 10, 236),
  ('Gold Dust Woman', 11, 295)
) as t(title, track_number, duration_seconds)
where a.slug = 'fleetwood-mac-rumours'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Ken Caillat', 'Produção'), ('Richard Dashut', 'Produção')) as c(person_name, role)
where a.slug = 'fleetwood-mac-rumours' and s.url = 'https://en.wikipedia.org/wiki/Rumours_(album)'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#1'), ('certification', 'RIAA (Estados Unidos)', 'Diamante')) as p(kind, label, value)
where a.slug = 'fleetwood-mac-rumours' and s.url = 'https://en.wikipedia.org/wiki/Rumours_(album)';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'O disco foi gravado em meio a duas separações simultâneas dentro da banda — Christine e John McVie, e Stevie Nicks e Lindsey Buckingham —, cuja tensão real inspirou boa parte das letras.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'fleetwood-mac-rumours' and s.url = 'https://en.wikipedia.org/wiki/Rumours_(album)';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'fleetwood-mac-rumours'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1977, os cinco integrantes do Fleetwood Mac gravavam em meio a duas separações simultâneas, transformando a dor pessoal em material de composição direto.', 'interpretation', 0),
  ('world_context', 'Jimmy Carter assumia a presidência dos EUA em 1977, em um momento de otimismo moderado após o pós-Watergate.', 'interpretation', 0),
  ('world_context', 'O rock adulto contemporâneo disputava espaço nas paradas com o nascente punk rock.', 'interpretation', 1),
  ('world_context', 'O uso extensivo de overdubs vocais e longas horas de estúdio em Sausalito ajudaram a esculpir as harmonias vocais características do disco.', 'interpretation', 2),
  ('musical_scene', 'Enquanto o punk explodia do outro lado do Atlântico, "Rumours" representava o auge do rock polido da Costa Oeste americana, ao lado de Eagles e Linda Ronstadt.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, "Rumours" foi recebido com entusiasmo imediato pelo público, tornando-se um sucesso comercial estrondoso apesar dos dramas pessoais que inspiraram as letras.', 'fact', 0),
  ('reception_vs_legacy', 'Hoje, "Rumours" é considerado um dos maiores discos pop-rock já feitos, e o dramalhão real por trás de sua criação só aumentou seu status mitológico.', 'critical_opinion', 1),
  ('album_summary', 'O retrato sonoro de uma banda se desfazendo por dentro, transformado em um dos discos pop-rock mais amados de todos os tempos.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'fleetwood-mac-rumours';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Rumours_(album)'
where a.slug = 'fleetwood-mac-rumours';

-- =========================================================================
-- #8 Prince and the Revolution - Purple Rain (1984)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Purple Rain (album) - Wikipedia', 'https://en.wikipedia.org/wiki/Purple_Rain_(album)', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Prince and the Revolution', 'prince-and-the-revolution', '1978-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Purple Rain', 'prince-and-the-revolution-purple-rain', '1984-06-25', 'Pop / Rock', 'Warner Bros. Records', 9,
       'https://cdn-images.dzcdn.net/images/cover/526d2d27a16da94b6f46fa4e786a34c9/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'prince-and-the-revolution'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ($q$Let's Go Crazy$q$, 1, 279),
  ('Take Me with U', 2, 234),
  ('The Beautiful Ones', 3, 313),
  ('Computer Blue', 4, 239),
  ('Darling Nikki', 5, 254),
  ('When Doves Cry', 6, 354),
  ('I Would Die 4 U', 7, 169),
  ($q$Baby I'm a Star$q$, 8, 264),
  ('Purple Rain', 9, 521)
) as t(title, track_number, duration_seconds)
where a.slug = 'prince-and-the-revolution-purple-rain'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Prince', 'Produção'), ('Prince', 'Composição')) as c(person_name, role)
where a.slug = 'prince-and-the-revolution-purple-rain' and s.url = 'https://en.wikipedia.org/wiki/Purple_Rain_(album)'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#1'), ('certification', 'RIAA (Estados Unidos)', 'Diamante')) as p(kind, label, value)
where a.slug = 'prince-and-the-revolution-purple-rain' and s.url = 'https://en.wikipedia.org/wiki/Purple_Rain_(album)';

insert into curiosities (album_id, summary, status, source_id)
select a.id, '"Purple Rain" é também a trilha sonora do filme homônimo estrelado por Prince, seu primeiro papel de protagonista no cinema.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'prince-and-the-revolution-purple-rain' and s.url = 'https://en.wikipedia.org/wiki/Purple_Rain_(album)';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'prince-and-the-revolution-purple-rain'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1984, Prince buscava dar o salto do sucesso musical para o estrelato de cinema, estrelando e compondo a trilha semi-autobiográfica de um filme sobre um músico em ascensão em Minneapolis.', 'interpretation', 0),
  ('world_context', 'Os EUA viviam o auge da era Reagan, com otimismo econômico convivendo com tensões da Guerra Fria em 1984.', 'interpretation', 0),
  ('world_context', 'A MTV se consolidava como força cultural dominante, e Prince desafiava as barreiras raciais e de gênero da época com sua estética andrógina.', 'interpretation', 1),
  ('world_context', 'O uso extensivo de sintetizadores e da bateria eletrônica Linn LM-1 ajudou a definir o som minimalista e futurista do "Minneapolis Sound".', 'interpretation', 2),
  ('musical_scene', 'Ao lado de Michael Jackson e Madonna, Prince ajudava a redefinir o pop americano dos anos 1980, misturando funk, rock e new wave em uma identidade só sua.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, tanto o filme quanto o álbum "Purple Rain" foram sucessos imediatos de crítica e público, consolidando Prince como uma das maiores estrelas pop do momento.', 'fact', 0),
  ('reception_vs_legacy', 'Hoje, "Purple Rain" é visto como o auge comercial e artístico de Prince, com a faixa-título entre as canções mais reverenciadas do rock e da soul music.', 'critical_opinion', 1),
  ('album_summary', 'A trilha sonora que transformou Prince, de estrela em ascensão, em um dos maiores ícones pop dos anos 1980.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'prince-and-the-revolution-purple-rain';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Purple_Rain_(album)'
where a.slug = 'prince-and-the-revolution-purple-rain';

-- =========================================================================
-- #9 Bob Dylan - Blood on the Tracks (1975)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Blood on the Tracks - Wikipedia', 'https://en.wikipedia.org/wiki/Blood_on_the_Tracks', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Bob Dylan', 'bob-dylan', '1961-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Blood on the Tracks', 'bob-dylan-blood-on-the-tracks', '1975-01-20', 'Folk Rock', 'Columbia', 10,
       'https://cdn-images.dzcdn.net/images/cover/7ee9e4f89dba0f743a6b24e428e7f6ab/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'bob-dylan'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Tangled Up in Blue', 1, 342),
  ('Simple Twist of Fate', 2, 257),
  ($q$You're a Big Girl Now$q$, 3, 271),
  ('Idiot Wind', 4, 469),
  ($q$You're Gonna Make Me Lonesome When You Go$q$, 5, 173),
  ('Meet Me in the Morning', 6, 261),
  ('Lily, Rosemary and the Jack of Hearts', 7, 531),
  ('If You See Her, Say Hello', 8, 289),
  ('Shelter from the Storm', 9, 302),
  ('Buckets of Rain', 10, 204)
) as t(title, track_number, duration_seconds)
where a.slug = 'bob-dylan-blood-on-the-tracks'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Bob Dylan', 'Produção')) as c(person_name, role)
where a.slug = 'bob-dylan-blood-on-the-tracks' and s.url = 'https://en.wikipedia.org/wiki/Blood_on_the_Tracks'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#1'), ('certification', 'RIAA (Estados Unidos)', 'Platina')) as p(kind, label, value)
where a.slug = 'bob-dylan-blood-on-the-tracks' and s.url = 'https://en.wikipedia.org/wiki/Blood_on_the_Tracks';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'Insatisfeito com a versão original gravada em Nova York, Dylan regravou parte das faixas às pressas em Minneapolis pouco antes do lançamento.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'bob-dylan-blood-on-the-tracks' and s.url = 'https://en.wikipedia.org/wiki/Blood_on_the_Tracks';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'bob-dylan-blood-on-the-tracks'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1975, Bob Dylan atravessava a separação da esposa Sara, canalizando a dor do fim do casamento em um dos discos mais confessionais e diretos de sua carreira.', 'interpretation', 0),
  ('world_context', 'Os EUA ainda processavam o trauma do Watergate e o fim recente da Guerra do Vietnã em 1975.', 'interpretation', 0),
  ('world_context', 'O cantor-compositor confessional se consolidava como formato dominante após o sucesso de artistas como Joni Mitchell e James Taylor.', 'interpretation', 1),
  ('world_context', 'Dylan regravou parte do disco às pressas em estúdios de Minneapolis, processo pouco convencional que reforçou a urgência emocional das faixas.', 'interpretation', 2),
  ('musical_scene', 'Lançado no auge do movimento confessional dos cantores-compositores, "Blood on the Tracks" reafirmou Dylan como mestre da narrativa pessoal em canção, ao lado de nomes como Jackson Browne.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, a crítica ficou dividida entre o entusiasmo pela honestidade emocional das letras e certa estranheza com a mistura entre as sessões de Nova York e as regravações de Minneapolis.', 'fact', 0),
  ('reception_vs_legacy', 'Hoje, "Blood on the Tracks" é amplamente considerado um dos discos mais bem escritos da carreira de Dylan, referência para a canção confessional.', 'critical_opinion', 1),
  ('album_summary', 'O relato cru e direto do fim de um casamento, transformado em um dos discos mais pessoais da carreira de Bob Dylan.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'bob-dylan-blood-on-the-tracks';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Blood_on_the_Tracks'
where a.slug = 'bob-dylan-blood-on-the-tracks';

-- =========================================================================
-- #10 Lauryn Hill - The Miseducation of Lauryn Hill (1998)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'The Miseducation of Lauryn Hill - Wikipedia', 'https://en.wikipedia.org/wiki/The_Miseducation_of_Lauryn_Hill', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Lauryn Hill', 'lauryn-hill', '1993-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'The Miseducation of Lauryn Hill', 'lauryn-hill-the-miseducation-of-lauryn-hill', '1998-08-25', 'R&B / Hip Hop', 'Ruffhouse/Columbia', 14,
       'https://cdn-images.dzcdn.net/images/cover/1322b9d5248a55034f098802072cfac4/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'lauryn-hill'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Intro', 1, 47),
  ('Lost Ones', 2, 333),
  ('Ex-Factor', 3, 327),
  ('To Zion', 4, 369),
  ('Doo Wop (That Thing)', 5, 241),
  ('Superstar', 6, 297),
  ('Final Hour', 7, 256),
  ('When It Hurts So Bad', 8, 342),
  ('I Used to Love Him', 9, 339),
  ('Forgive Them Father', 10, 315),
  ('Every Ghetto, Every City', 11, 314),
  ('Nothing Even Matters', 12, 350),
  ('Everything Is Everything', 13, 293),
  ('The Miseducation of Lauryn Hill', 14, 235)
) as t(title, track_number, duration_seconds)
where a.slug = 'lauryn-hill-the-miseducation-of-lauryn-hill'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Lauryn Hill', 'Produção'), ('Lauryn Hill', 'Composição')) as c(person_name, role)
where a.slug = 'lauryn-hill-the-miseducation-of-lauryn-hill' and s.url = 'https://en.wikipedia.org/wiki/The_Miseducation_of_Lauryn_Hill'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#1'), ('certification', 'RIAA (Estados Unidos)', 'Diamante')) as p(kind, label, value)
where a.slug = 'lauryn-hill-the-miseducation-of-lauryn-hill' and s.url = 'https://en.wikipedia.org/wiki/The_Miseducation_of_Lauryn_Hill';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'Lauryn Hill escreveu e produziu praticamente todo o disco sozinha, grávida de seu primeiro filho durante as gravações, feito raro para uma artista até então conhecida apenas como parte do Fugees.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'lauryn-hill-the-miseducation-of-lauryn-hill' and s.url = 'https://en.wikipedia.org/wiki/The_Miseducation_of_Lauryn_Hill';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'lauryn-hill-the-miseducation-of-lauryn-hill'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1998, Lauryn Hill deixava de ser vista apenas como integrante do Fugees para assumir, sozinha, a composição, produção e direção artística de seu álbum de estreia, então grávida do primeiro filho.', 'interpretation', 0),
  ('world_context', 'O impeachment do presidente Bill Clinton dominava as manchetes americanas em 1998.', 'interpretation', 0),
  ('world_context', 'O hip-hop e o R&B ganhavam cada vez mais espaço no mainstream, disputando o topo das paradas com o pop adolescente em ascensão.', 'interpretation', 1),
  ('world_context', 'Hill gravou boa parte do disco nos estúdios Tuff Gong, na Jamaica, buscando um som mais orgânico, com bandas ao vivo em vez de apenas samples.', 'interpretation', 2),
  ('musical_scene', $q$Lançado em um momento de efervescência do neo soul e do hip-hop consciente, ao lado de D'Angelo e Erykah Badu, o disco ajudou a definir a estética do gênero.$q$, 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, o disco foi recebido com aclamação imediata da crítica e sucesso comercial instantâneo, tornando Lauryn Hill uma das maiores estrelas da música negra do momento.', 'fact', 0),
  ('reception_vs_legacy', 'Hoje, o álbum é considerado um marco do neo soul e um dos discos de estreia mais aclamados da história da música popular.', 'critical_opinion', 1),
  ('album_summary', 'O manifesto de estreia solo de Lauryn Hill, síntese pessoal de hip-hop, soul e reggae.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'lauryn-hill-the-miseducation-of-lauryn-hill';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/The_Miseducation_of_Lauryn_Hill'
where a.slug = 'lauryn-hill-the-miseducation-of-lauryn-hill';

-- =========================================================================
-- #11 The Beatles - Revolver (1966)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Revolver (album) - Wikipedia', 'https://en.wikipedia.org/wiki/Revolver_(Beatles_album)', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Revolver', 'the-beatles-revolver', '1966-08-05', 'Rock', 'Parlophone', 14,
       'https://cdn-images.dzcdn.net/images/cover/6e1e24a3e4311371abd2c888b1f0e13e/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'the-beatles'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Taxman', 1, 157),
  ('Eleanor Rigby', 2, 124),
  ($q$I'm Only Sleeping$q$, 3, 179),
  ('Love You To', 4, 178),
  ('Here, There and Everywhere', 5, 143),
  ('Yellow Submarine', 6, 157),
  ('She Said She Said', 7, 154),
  ('Good Day Sunshine', 8, 128),
  ('And Your Bird Can Sing', 9, 119),
  ('For No One', 10, 118),
  ('Doctor Robert', 11, 133),
  ('I Want to Tell You', 12, 146),
  ('Got to Get You into My Life', 13, 147),
  ('Tomorrow Never Knows', 14, 179)
) as t(title, track_number, duration_seconds)
where a.slug = 'the-beatles-revolver'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('George Martin', 'Produção'), ('Geoff Emerick', 'Engenharia de gravação')) as c(person_name, role)
where a.slug = 'the-beatles-revolver' and s.url = 'https://en.wikipedia.org/wiki/Revolver_(Beatles_album)'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#1'), ('certification', 'RIAA (Estados Unidos)', 'Multi-Platina')) as p(kind, label, value)
where a.slug = 'the-beatles-revolver' and s.url = 'https://en.wikipedia.org/wiki/Revolver_(Beatles_album)';

insert into curiosities (album_id, summary, status, source_id)
select a.id, '"Revolver" marcou o momento em que os Beatles pararam de fazer turnês para se concentrar inteiramente em experimentação de estúdio, usando técnicas então inéditas como fitas invertidas.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'the-beatles-revolver' and s.url = 'https://en.wikipedia.org/wiki/Revolver_(Beatles_album)';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'the-beatles-revolver'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1966, exaustos das turnês e da histeria da Beatlemania, os Beatles decidiram parar de se apresentar ao vivo para se dedicar inteiramente à experimentação em estúdio.', 'interpretation', 0),
  ('world_context', 'A Guerra do Vietnã se intensificava em 1966, gerando os primeiros grandes protestos estudantis nos EUA e no Reino Unido.', 'interpretation', 0),
  ('world_context', 'O interesse ocidental por filosofia e música indianas crescia, refletido no uso da cítara por George Harrison.', 'interpretation', 1),
  ('world_context', 'A banda explorou fitas invertidas e microfones colados a amplificadores Leslie, técnicas então inéditas na música pop.', 'interpretation', 2),
  ('musical_scene', 'Lançado meses antes de "Pet Sounds" ganhar seu status definitivo, "Revolver" antecipou a explosão psicodélica de 1967, elevando o padrão de experimentação sonora no rock.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, a crítica reconheceu de imediato a ambição sonora do disco, embora o público levasse algum tempo para absorver seu caráter mais experimental em relação aos discos anteriores da banda.', 'fact', 0),
  ('reception_vs_legacy', 'Hoje, "Revolver" é frequentemente citado como o momento em que os Beatles se tornaram uma banda de estúdio plena, antecipando toda a psicodelia que viria a seguir.', 'critical_opinion', 1),
  ('album_summary', 'O disco em que os Beatles abandonaram as turnês para se tornarem arquitetos de estúdio, antecipando a psicodelia de 1967.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'the-beatles-revolver';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Revolver_(Beatles_album)'
where a.slug = 'the-beatles-revolver';

-- =========================================================================
-- #12 Michael Jackson - Thriller (1982)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Thriller (album) - Wikipedia', 'https://en.wikipedia.org/wiki/Thriller_(album)', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Michael Jackson', 'michael-jackson', '1968-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Thriller', 'michael-jackson-thriller', '1982-11-30', 'Pop / R&B', 'Epic', 9,
       'https://cdn-images.dzcdn.net/images/cover/f01e09ceb8ad1e96707c1b4aadb5911b/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'michael-jackson'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ($q$Wanna Be Startin' Somethin'$q$, 1, 363),
  ('Baby Be Mine', 2, 260),
  ('The Girl Is Mine', 3, 222),
  ('Thriller', 4, 358),
  ('Beat It', 5, 258),
  ('Billie Jean', 6, 293),
  ('Human Nature', 7, 245),
  ('P.Y.T. (Pretty Young Thing)', 8, 239),
  ('The Lady in My Life', 9, 297)
) as t(title, track_number, duration_seconds)
where a.slug = 'michael-jackson-thriller'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Quincy Jones', 'Produção'), ('Eddie Van Halen', 'Guitarra (participação em "Beat It")')) as c(person_name, role)
where a.slug = 'michael-jackson-thriller' and s.url = 'https://en.wikipedia.org/wiki/Thriller_(album)'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#1'), ('certification', 'RIAA (Estados Unidos)', 'Diamante')) as p(kind, label, value)
where a.slug = 'michael-jackson-thriller' and s.url = 'https://en.wikipedia.org/wiki/Thriller_(album)';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'O videoclipe de 14 minutos de "Thriller", dirigido por John Landis, elevou o videoclipe à condição de curta-metragem cinematográfico.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'michael-jackson-thriller' and s.url = 'https://en.wikipedia.org/wiki/Thriller_(album)';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'michael-jackson-thriller'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1982, Michael Jackson buscava provar que podia ser uma estrela solo ainda maior do que fora com os Jackson 5, reunindo o produtor Quincy Jones para um álbum que cruzasse pop, R&B e rock.', 'interpretation', 0),
  ('world_context', 'Os EUA viviam uma recessão econômica no início do primeiro mandato de Ronald Reagan, em 1982.', 'interpretation', 0),
  ('world_context', 'A MTV, lançada havia pouco mais de um ano, ainda relutava em exibir artistas negros, barreira que "Thriller" ajudaria a derrubar.', 'interpretation', 1),
  ('world_context', 'O videoclipe de 14 minutos de "Thriller", dirigido por John Landis, elevou o videoclipe à condição de curta-metragem cinematográfico.', 'interpretation', 2),
  ('musical_scene', 'Ao cruzar pop, funk e rock, com a guitarra de Eddie Van Halen em "Beat It", "Thriller" rompeu barreiras de gênero e de rádio que separavam artistas negros e brancos no início dos anos 1980.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, "Thriller" foi um sucesso comercial imediato, gerando sucessivos singles de sucesso e dominando as paradas por mais de um ano consecutivo.', 'fact', 0),
  ('reception_vs_legacy', 'Hoje, "Thriller" continua sendo lembrado como o álbum mais vendido da história e um marco na quebra de barreiras raciais na indústria musical e na MTV.', 'critical_opinion', 1),
  ('album_summary', 'O álbum mais vendido da história, que transformou Michael Jackson no maior astro pop do planeta.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'michael-jackson-thriller';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Thriller_(album)'
where a.slug = 'michael-jackson-thriller';

-- =========================================================================
-- #13 Aretha Franklin - I Never Loved a Man the Way I Love You (1967)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'I Never Loved a Man the Way I Love You - Wikipedia', 'https://en.wikipedia.org/wiki/I_Never_Loved_a_Man_the_Way_I_Love_You_(album)', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Aretha Franklin', 'aretha-franklin', '1960-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'I Never Loved a Man the Way I Love You', 'aretha-franklin-i-never-loved-a-man-the-way-i-love-you', '1967-03-10', 'Soul', 'Atlantic', 11,
       'https://cdn-images.dzcdn.net/images/cover/8a552687beffeddaa3219060d452f125/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'aretha-franklin'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Respect', 1, 145),
  ('Drown in My Own Tears', 2, 246),
  ('I Never Loved a Man (The Way I Love You)', 3, 172),
  ('Soul Serenade', 4, 158),
  ($q$Don't Let Me Lose This Dream$q$, 5, 142),
  ('Baby, Baby, Baby', 6, 174),
  ('Dr. Feelgood (Love Is a Serious Business)', 7, 201),
  ('Good Times', 8, 128),
  ('Do Right Woman, Do Right Man', 9, 194),
  ('Save Me', 10, 139),
  ('A Change Is Gonna Come', 11, 253)
) as t(title, track_number, duration_seconds)
where a.slug = 'aretha-franklin-i-never-loved-a-man-the-way-i-love-you'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Jerry Wexler', 'Produção')) as c(person_name, role)
where a.slug = 'aretha-franklin-i-never-loved-a-man-the-way-i-love-you' and s.url = 'https://en.wikipedia.org/wiki/I_Never_Loved_a_Man_the_Way_I_Love_You_(album)'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('certification', 'RIAA (Estados Unidos)', 'Ouro')) as p(kind, label, value)
where a.slug = 'aretha-franklin-i-never-loved-a-man-the-way-i-love-you' and s.url = 'https://en.wikipedia.org/wiki/I_Never_Loved_a_Man_the_Way_I_Love_You_(album)';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'O disco marcou a virada de Aretha Franklin da Columbia para a Atlantic Records, gravado com músicos de sessão em Muscle Shoals, no Alabama, sob produção de Jerry Wexler.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'aretha-franklin-i-never-loved-a-man-the-way-i-love-you' and s.url = 'https://en.wikipedia.org/wiki/I_Never_Loved_a_Man_the_Way_I_Love_You_(album)';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'aretha-franklin-i-never-loved-a-man-the-way-i-love-you'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1967, Aretha Franklin deixava a Columbia Records, onde sentia sua voz contida por arranjos genéricos, para assinar com a Atlantic e o produtor Jerry Wexler, que a levou a gravar em Muscle Shoals, no Alabama.', 'interpretation', 0),
  ('world_context', 'O "Verão Longo e Quente" de 1967 trouxe uma onda de revoltas urbanas nos EUA, incluindo em Detroit, cidade natal de Aretha.', 'interpretation', 0),
  ('world_context', 'O movimento pelos direitos civis buscava novas formas de expressão cultural, e a soul music se tornava trilha sonora dessa luta.', 'interpretation', 1),
  ('world_context', 'A gravação em Muscle Shoals, com músicos de sessão sulistas, trouxe uma sonoridade mais crua e visceral em contraste com produções pop mais polidas da época.', 'interpretation', 2),
  ('musical_scene', 'Lançado no auge da explosão da soul music sulista, ao lado de Otis Redding e Wilson Pickett, o disco consagrou Aretha Franklin como a voz definitiva do gênero.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, o single "Respect" e o álbum foram recebidos com entusiasmo imediato, consolidando da noite para o dia o status de Aretha Franklin como estrela maior da soul music.', 'fact', 0),
  ('reception_vs_legacy', 'Hoje, o disco é visto como o momento definitivo em que Aretha Franklin se tornou a "Rainha do Soul", com "Respect" alçado a hino de dignidade e do movimento pelos direitos civis.', 'critical_opinion', 1),
  ('album_summary', 'O disco de estreia de Aretha Franklin na Atlantic que a consagrou, da noite para o dia, como a Rainha do Soul.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'aretha-franklin-i-never-loved-a-man-the-way-i-love-you';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/I_Never_Loved_a_Man_the_Way_I_Love_You_(album)'
where a.slug = 'aretha-franklin-i-never-loved-a-man-the-way-i-love-you';

-- =========================================================================
-- #14 The Rolling Stones - Exile on Main St. (1972)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'Exile on Main St. - Wikipedia', 'https://en.wikipedia.org/wiki/Exile_on_Main_St.', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('The Rolling Stones', 'the-rolling-stones', '1962-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'Exile on Main St.', 'the-rolling-stones-exile-on-main-st', '1972-05-12', 'Rock', 'Rolling Stones Records', 18,
       'https://cdn-images.dzcdn.net/images/cover/28e5ea6c9e305a2cb85a589b1260a88a/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'the-rolling-stones'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Rocks Off', 1, 271),
  ('Rip This Joint', 2, 142),
  ('Shake Your Hips', 3, 179),
  ('Casino Boogie', 4, 213),
  ('Tumbling Dice', 5, 225),
  ('Sweet Virginia', 6, 265),
  ('Torn and Frayed', 7, 257),
  ('Sweet Black Angel', 8, 174),
  ('Loving Cup', 9, 263),
  ('Happy', 10, 184),
  ('Turd on the Run', 11, 156),
  ('Ventilator Blues', 12, 204),
  ('I Just Want to See His Face', 13, 172),
  ('Let It Loose', 14, 316),
  ('All Down the Line', 15, 229),
  ('Stop Breaking Down', 16, 274),
  ('Shine a Light', 17, 254),
  ('Soul Survivor', 18, 229)
) as t(title, track_number, duration_seconds)
where a.slug = 'the-rolling-stones-exile-on-main-st'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('Jimmy Miller', 'Produção')) as c(person_name, role)
where a.slug = 'the-rolling-stones-exile-on-main-st' and s.url = 'https://en.wikipedia.org/wiki/Exile_on_Main_St.'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('chart_position', 'Billboard 200', '#1'), ('certification', 'RIAA (Estados Unidos)', 'Platina')) as p(kind, label, value)
where a.slug = 'the-rolling-stones-exile-on-main-st' and s.url = 'https://en.wikipedia.org/wiki/Exile_on_Main_St.';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'A maior parte do disco foi gravada no porão úmido e improvisado da mansão alugada por Keith Richards no sul da França, onde a banda vivia como exilada fiscal.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'the-rolling-stones-exile-on-main-st' and s.url = 'https://en.wikipedia.org/wiki/Exile_on_Main_St.';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'the-rolling-stones-exile-on-main-st'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1972, os Rolling Stones viviam como exilados fiscais na França, gravando a maior parte do disco no porão úmido da mansão alugada por Keith Richards, em meio ao vício em heroína do guitarrista.', 'interpretation', 0),
  ('world_context', 'O escândalo de Watergate começava a se desenrolar nos EUA em 1972, embora suas consequências só ficassem claras depois.', 'interpretation', 0),
  ('world_context', 'O rock estava em transição do idealismo dos anos 1960 para um tom mais sujo e decadente no início dos anos 1970.', 'interpretation', 1),
  ('world_context', 'As condições precárias do porão-estúdio em Nellcôte exigiram soluções improvisadas de gravação, o que ajudou a moldar o som cru e abafado característico do disco.', 'interpretation', 2),
  ('musical_scene', $q$Em um momento de transição do rock para sonoridades mais ásperas e roots, "Exile on Main St." consolidou os Rolling Stones como a maior banda de rock'n'roll em atividade.$q$, 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, a crítica recebeu o disco com reações mistas, incomodada com a produção deliberadamente crua e desorganizada, embora o público o tenha consagrado nas paradas.', 'fact', 0),
  ('reception_vs_legacy', 'Hoje, "Exile on Main St." é amplamente considerado o auge artístico dos Rolling Stones, elogiado exatamente pela textura suja que dividiu opiniões no lançamento.', 'critical_opinion', 1),
  ('album_summary', 'O duplo caótico e visceral gravado em exílio fiscal na França, hoje visto como o auge artístico dos Rolling Stones.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'the-rolling-stones-exile-on-main-st';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/Exile_on_Main_St.'
where a.slug = 'the-rolling-stones-exile-on-main-st';

-- =========================================================================
-- #15 Public Enemy - It Takes a Nation of Millions to Hold Us Back (1988)
-- =========================================================================
insert into sources (type, title, url, license_type, attribution_text)
values ('encyclopedic', 'It Takes a Nation of Millions to Hold Us Back - Wikipedia', 'https://en.wikipedia.org/wiki/It_Takes_a_Nation_of_Millions_to_Hold_Us_Back', 'CC-BY-SA-4.0', 'Wikipedia contributors, CC BY-SA 4.0')
on conflict (url) do nothing;

insert into artists (name, slug, active_from)
values ('Public Enemy', 'public-enemy', '1985-01-01')
on conflict (slug) do update set name = excluded.name;

insert into albums (artist_id, title, slug, release_date, genre, label, track_count, cover_art_url)
select id, 'It Takes a Nation of Millions to Hold Us Back', 'public-enemy-it-takes-a-nation-of-millions-to-hold-us-back', '1988-06-28', 'Hip Hop', 'Def Jam Recordings', 16,
       'https://cdn-images.dzcdn.net/images/cover/83a9fcf2a1880788ad099e89b983179e/1000x1000-000000-80-0-0.jpg'
from artists where slug = 'public-enemy'
on conflict (slug) do nothing;

insert into tracks (album_id, title, track_number, duration_seconds)
select a.id, t.title, t.track_number, t.duration_seconds
from albums a, (values
  ('Countdown to Armageddon', 1, 101),
  ('Bring the Noise', 2, 225),
  ($q$Don't Believe the Hype$q$, 3, 318),
  ($q$Cold Lampin' with Flavor$q$, 4, 256),
  ('Terminator X to the Edge of Panic', 5, 271),
  ('Mind Terrorist', 6, 80),
  ('Louder Than a Bomb', 7, 217),
  ('Caught, Can We Get a Witness?', 8, 295),
  ($q$Show 'Em Whatcha Got$q$, 9, 116),
  ('She Watch Channel Zero?!', 10, 229),
  ('Night of the Living Baseheads', 11, 193),
  ('Black Steel in the Hour of Chaos', 12, 384),
  ('Security of the First World', 13, 79),
  ('Rebel Without a Pause', 14, 300),
  ('Prophets of Rage', 15, 198),
  ('Party for Your Right to Fight', 16, 206)
) as t(title, track_number, duration_seconds)
where a.slug = 'public-enemy-it-takes-a-nation-of-millions-to-hold-us-back'
on conflict (album_id, track_number) do nothing;

insert into credits (album_id, person_name, role, source_id)
select a.id, c.person_name, c.role, s.id
from albums a, sources s,
  (values ('The Bomb Squad', 'Produção'), ('Chuck D', 'Composição')) as c(person_name, role)
where a.slug = 'public-enemy-it-takes-a-nation-of-millions-to-hold-us-back' and s.url = 'https://en.wikipedia.org/wiki/It_Takes_a_Nation_of_Millions_to_Hold_Us_Back'
on conflict (album_id, person_name, role) do nothing;

insert into performance_records (album_id, kind, label, value, source_id)
select a.id, p.kind, p.label, p.value, s.id
from albums a, sources s,
  (values ('certification', 'RIAA (Estados Unidos)', 'Platina')) as p(kind, label, value)
where a.slug = 'public-enemy-it-takes-a-nation-of-millions-to-hold-us-back' and s.url = 'https://en.wikipedia.org/wiki/It_Takes_a_Nation_of_Millions_to_Hold_Us_Back';

insert into curiosities (album_id, summary, status, source_id)
select a.id, 'A produção do The Bomb Squad empilhava dezenas de samples em camadas densas e caóticas, técnica então radical para a produção de hip-hop da época.', 'confirmed', s.id
from albums a, sources s
where a.slug = 'public-enemy-it-takes-a-nation-of-millions-to-hold-us-back' and s.url = 'https://en.wikipedia.org/wiki/It_Takes_a_Nation_of_Millions_to_Hold_Us_Back';

insert into narrative_articles (album_id, facet, status, language, generated_at)
select a.id, f.facet, 'published', 'pt-BR', now()
from albums a, (values ('artist_moment'::narrative_facet), ('world_context'::narrative_facet), ('musical_scene'::narrative_facet), ('reception_vs_legacy'::narrative_facet), ('album_summary'::narrative_facet)) as f(facet)
where a.slug = 'public-enemy-it-takes-a-nation-of-millions-to-hold-us-back'
on conflict (album_id, facet) do nothing;

insert into narrative_statements (narrative_article_id, text, kind, "order")
select na.id, s.text, s.kind::statement_kind, s.ord
from narrative_articles na
join albums a on a.id = na.album_id
join (values
  ('artist_moment', 'Em 1988, Chuck D e Flavor Flav, ao lado do coletivo de produção The Bomb Squad, buscavam transformar o Public Enemy em veículo de discurso político militante dentro do hip-hop, então visto por muitos apenas como entretenimento.', 'interpretation', 0),
  ('world_context', 'A era Reagan chegava ao fim em 1988, em meio a tensões raciais persistentes e debate sobre desigualdade nas grandes cidades americanas.', 'interpretation', 0),
  ('world_context', 'O hip-hop consciente ganhava força como ferramenta de crítica social, ao lado de nomes como Boogie Down Productions.', 'interpretation', 1),
  ('world_context', 'A produção do The Bomb Squad empilhava dezenas de samples em camadas densas e caóticas, técnica então radical para a produção de hip-hop.', 'interpretation', 2),
  ('musical_scene', 'Ao lado de grupos como N.W.A e Boogie Down Productions, o Public Enemy ajudou a consolidar o hip-hop político como força central do gênero no final dos anos 1980.', 'interpretation', 0),
  ('reception_vs_legacy', 'No lançamento, a crítica especializada recebeu o disco como um marco imediato, reconhecendo a ousadia sonora e o discurso político direto do grupo.', 'fact', 0),
  ('reception_vs_legacy', 'Hoje, "It Takes a Nation of Millions to Hold Us Back" é unanimemente citado como um dos discos mais influentes e importantes da história do hip-hop.', 'critical_opinion', 1),
  ('album_summary', 'O manifesto sonoro e político que consolidou o Public Enemy como voz definitiva do hip-hop consciente.', 'interpretation', 0)
) as s(facet, text, kind, ord) on s.facet = na.facet::text
where a.slug = 'public-enemy-it-takes-a-nation-of-millions-to-hold-us-back';

insert into narrative_statement_sources (narrative_statement_id, source_id)
select ns.id, s.id
from narrative_statements ns
join narrative_articles na on na.id = ns.narrative_article_id
join albums a on a.id = na.album_id
join sources s on s.url = 'https://en.wikipedia.org/wiki/It_Takes_a_Nation_of_Millions_to_Hold_Us_Back'
where a.slug = 'public-enemy-it-takes-a-nation-of-millions-to-hold-us-back';
