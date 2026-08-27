import { SectionCard } from "@/components/SectionCard";
import type { ListPlacementEntry } from "@/app/lib/ingestion/album-context";

export function ListsSection({ placements }: { placements: ListPlacementEntry[] }) {
  if (placements.length === 0) {
    return null;
  }

  return (
    <SectionCard id="listas" title="Listas">
      <ul className="flex flex-col gap-3">
        {placements.map((placement) => (
          <li
            key={placement.listName}
            className="flex items-center justify-between gap-4 rounded-lg border border-white/90 bg-white/50 px-4 py-3 backdrop-blur-xl"
          >
            <span className="font-sans text-sm text-[#443f4f]">{placement.listName}</span>
            <span className="font-mono text-xs tracking-[0.18em] text-[#d1145a]">#{placement.position}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
