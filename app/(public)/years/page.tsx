import Link from "next/link";
import { getDiscoveryPage } from "@/app/actions/discovery";
import { YearSearchForm } from "@/components/YearSearchForm";

export default async function YearsIndexPage() {
  const result = await getDiscoveryPage();
  const years =
    result.state === "ready"
      ? Array.from(new Set(result.collection.map((entry) => entry.releaseYear))).sort((a, b) => Number(a) - Number(b))
      : [];

  return (
    <div className="relative mx-auto max-w-[980px] px-6 py-[74px] pb-[140px] md:pl-0 md:pr-[clamp(24px,4vw,72px)]">
      <h1 className="font-heading text-[clamp(30px,3.4vw,50px)] font-extrabold tracking-[-0.03em] text-[#120f18]">
        Eras
      </h1>
      <p className="mt-4 max-w-[520px] font-light text-[#443f4f]">
        Escolha um ano para ver o que aconteceu no mundo e quais álbuns do acervo foram lançados nele.
      </p>

      <div className="mt-10">
        <YearSearchForm />
      </div>

      {years.length > 0 && (
        <div className="mt-12 flex flex-wrap gap-3">
          {years.map((year) => (
            <Link
              key={year}
              href={`/years/${year}`}
              className="rounded-full border border-white/90 bg-white/50 px-4 py-2 font-mono text-[11px] tracking-[0.18em] text-[#443f4f] backdrop-blur-xl transition-colors hover:border-[#d1145a]/40 hover:text-[#d1145a]"
            >
              {year}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
