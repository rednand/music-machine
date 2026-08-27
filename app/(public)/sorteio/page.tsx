import Link from "next/link";
import { getLotteryPool } from "@/app/actions/lottery";
import { LotteryScreen } from "@/components/LotteryScreen";

export default async function SorteioPage() {
  const pool = await getLotteryPool();

  return (
    <div className="relative mx-auto max-w-[980px] px-6 py-[74px] pb-[140px] md:pl-0 md:pr-[clamp(24px,4vw,72px)]">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-[#6b6577] transition-colors hover:text-[#d1145a]"
      >
        ← HOME
      </Link>

      <h1 className="font-heading text-[clamp(30px,3.4vw,50px)] font-extrabold tracking-[-0.03em] text-[#120f18]">
        Sorteio
      </h1>
      <p className="mt-4 max-w-[560px] font-light text-[#443f4f]">
        Sorteia um álbum entre os que aparecem nas grandes listas de melhores álbuns (Rolling Stone, NME, Pitchfork,
        Apple Music, MOJO, Q Magazine, Consequence) para você ouvir hoje.
      </p>

      <div className="mt-10">
        {pool.length === 0 ? (
          <p className="font-light text-[#443f4f]">Nenhuma lista carregada ainda.</p>
        ) : (
          <LotteryScreen pool={pool} />
        )}
      </div>
    </div>
  );
}
