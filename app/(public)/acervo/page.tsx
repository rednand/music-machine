import Link from "next/link";
import { getDiscoveryPage } from "@/app/actions/discovery";
import { AcervoBrowser } from "@/components/AcervoBrowser";

export default async function AcervoPage() {
  const result = await getDiscoveryPage();
  const entries = result.state === "ready" ? result.collection : [];

  return (
    <div className="relative mx-auto max-w-[980px] px-6 py-[74px] pb-[140px] md:pl-0 md:pr-[clamp(24px,4vw,72px)]">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-[#6b6577] transition-colors hover:text-[#d1145a]"
      >
        ← HOME
      </Link>

      <h1 className="font-heading text-[clamp(30px,3.4vw,50px)] font-extrabold tracking-[-0.03em] text-[#120f18]">
        O acervo
      </h1>

      <div className="mt-10">
        {entries.length === 0 ? (
          <p className="font-light text-[#443f4f]">Ainda não há álbuns no acervo.</p>
        ) : (
          <AcervoBrowser entries={entries} />
        )}
      </div>
    </div>
  );
}
