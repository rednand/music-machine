import type { CreditRow } from "@/app/lib/db/album";

export function CreditsList({ credits }: { credits: CreditRow[] }) {
  if (credits.length === 0) {
    return null;
  }

  return (
    <div className="mt-[30px]">
      <div className="font-mono text-[9.5px] tracking-[0.22em] text-[#a8a2b0]">MÚSICOS</div>
      <div className="mt-[14px] flex gap-[10px] overflow-x-auto pb-1">
        {credits.map((credit) => (
          <span
            key={credit.id}
            className="flex-none whitespace-nowrap rounded-full border border-white/90 bg-white/55 px-[18px] py-[10px] text-[13.5px] text-[#443f4f] backdrop-blur-md"
          >
            {credit.person_name} — {credit.role}
          </span>
        ))}
      </div>
    </div>
  );
}
