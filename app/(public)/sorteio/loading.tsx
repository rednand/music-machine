import { Loader2 } from "lucide-react";

export default function SorteioLoading() {
  return (
    <div className="relative mx-auto flex max-w-[980px] flex-col items-center justify-center gap-4 px-6 py-[140px] text-center">
      <Loader2 className="h-10 w-10 animate-spin text-[#d1145a]" aria-hidden="true" />
      <span className="font-mono text-[11px] tracking-[0.22em] text-[#6b6577]">CARREGANDO AS LISTAS</span>
    </div>
  );
}
