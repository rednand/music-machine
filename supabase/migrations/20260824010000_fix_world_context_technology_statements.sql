-- A migration anterior (20260824000000) escreveu, por engano, a tecnologia usada NA GRAVAÇÃO
-- de cada álbum no card "Tecnologia" da seção "O mundo em X", quando esse card deveria falar
-- da tecnologia do MUNDO naquele ano (paralelo a Política e Cultura, que já falavam do mundo).
-- Esta migration corrige apenas o terceiro statement (order = 2) de world_context nos 15 álbuns.

update narrative_statements ns
set text = fixes.text
from (values
  ('marvin-gaye-whats-going-on', 'Em 1971, a Intel lançava o 4004, o primeiro microprocessador comercial, e o correio eletrônico dava os primeiros passos como forma de comunicação entre computadores.'),
  ('the-beach-boys-pet-sounds', 'Em 1966, a sonda soviética Luna 9 realizava o primeiro pouso suave da história na Lua, enquanto a televisão a cores se popularizava nos Estados Unidos.'),
  ('joni-mitchell-blue', 'Em 1971, a sonda americana Mariner 9 entrava em órbita de Marte, ampliando a exploração espacial não-tripulada em plena Guerra Fria.'),
  ('stevie-wonder-songs-in-the-key-of-life', 'Em 1976, a Apple era fundada na garagem de Steve Jobs e Steve Wozniak, e o avião supersônico Concorde entrava em operação comercial regular.'),
  ('the-beatles-abbey-road', 'Em 1969, a ARPANET, rede precursora da internet, transmitia sua primeira mensagem entre computadores, poucas semanas antes do lançamento do disco.'),
  ('nirvana-nevermind', 'Em 1991, a World Wide Web se tornava publicamente acessível pela primeira vez, criada por Tim Berners-Lee no laboratório europeu CERN.'),
  ('fleetwood-mac-rumours', 'Em 1977, a Apple lançava o Apple II, um dos primeiros computadores pessoais de sucesso comercial, e a NASA enviava as sondas Voyager rumo ao espaço profundo.'),
  ('prince-and-the-revolution-purple-rain', 'Em 1984, a Apple lançava o computador Macintosh, com sua interface gráfica revolucionária, e o CD se consolidava como novo formato de áudio.'),
  ('bob-dylan-blood-on-the-tracks', 'Em 1975, a Microsoft era fundada por Bill Gates e Paul Allen, no início da revolução dos computadores pessoais iniciada pelo kit Altair 8800.'),
  ('lauryn-hill-the-miseducation-of-lauryn-hill', 'Em 1998, a Google era fundada na Califórnia e a Apple lançava o iMac, marcando a ascensão da internet como força cultural cotidiana.'),
  ('the-beatles-revolver', 'Em 1966, os Estados Unidos pousavam a sonda Surveyor 1 na Lua, resposta direta ao avanço soviético na corrida espacial.'),
  ('michael-jackson-thriller', 'Em 1982, o CD chegava ao mercado japonês como novo formato de áudio digital, e o Commodore 64 ajudava a popularizar a informática doméstica.'),
  ('aretha-franklin-i-never-loved-a-man-the-way-i-love-you', 'Em 1967, o primeiro caixa eletrônico do mundo entrava em operação em Londres, enquanto a corrida espacial entre EUA e URSS seguia a todo vapor.'),
  ('the-rolling-stones-exile-on-main-st', 'Em 1972, a Atari lançava Pong, o primeiro videogame de sucesso comercial, inaugurando a indústria dos games.'),
  ('public-enemy-it-takes-a-nation-of-millions-to-hold-us-back', 'Em 1988, o transbordador Discovery retomava os voos do programa espacial americano, dois anos após o desastre da Challenger.')
) as fixes(slug, text)
join albums a on a.slug = fixes.slug
join narrative_articles na on na.album_id = a.id and na.facet = 'world_context'
where ns.narrative_article_id = na.id
and ns."order" = 2;
