import Link from "next/link";
import { getYearContext } from "@/app/actions/year-context";
import { YearTimeline } from "@/components/YearTimeline";

export default async function YearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const result = await getYearContext(year);

  if (result.state === "invalid") {
    return <p className="p-6">Ano inválido. Digite um ano entre 1900 e o ano atual.</p>;
  }

  return (
    <div className="relative mx-auto max-w-[980px] px-6 py-[74px] pb-[140px] md:pl-0 md:pr-[clamp(24px,4vw,72px)]">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-[#6b6577] transition-colors hover:text-[#d1145a]"
      >
        ← HOME
      </Link>

      <h1 className="font-heading text-[clamp(30px,3.4vw,50px)] font-extrabold tracking-[-0.03em] text-[#120f18]">
        {result.year}
      </h1>

      <div className="mt-10">
        {result.timeline.length === 0 ? (
          <p className="font-light text-[#443f4f]">Nada registrado para {result.year} ainda.</p>
        ) : (
          <YearTimeline items={result.timeline} />
        )}
      </div>
    </div>
  );
}
