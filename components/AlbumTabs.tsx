const TABS = [
  { id: "album", label: "ÁLBUM" },
  { id: "artista", label: "ARTISTA" },
  { id: "mundo", label: "MUNDO" },
  { id: "cenario", label: "CENÁRIO" },
  { id: "desempenho", label: "DESEMPENHO" },
  { id: "legado", label: "LEGADO" },
  { id: "influencia", label: "INFLUÊNCIA" },
  { id: "curiosidades", label: "CURIOSIDADES" },
  { id: "linha-do-tempo", label: "LINHA DO TEMPO" }
];

export function AlbumTabs() {
  return (
    <nav className="flex flex-wrap gap-[26px] border-y border-[#171420]/[0.12] px-0.5 py-4">
      {TABS.map((tab) => (
        <a
          key={tab.id}
          href={`#${tab.id}`}
          className="font-mono text-[9.5px] tracking-[0.2em] text-[#6b6577] transition-colors hover:text-[#d1145a]"
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
