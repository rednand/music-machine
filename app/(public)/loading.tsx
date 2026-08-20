import { LoadingIndicator } from "@/components/LoadingIndicator";

export default function DiscoverLoading() {
  return (
    <div className="relative mx-auto flex max-w-[1560px] flex-col items-center justify-center px-6 py-[140px] text-center">
      <LoadingIndicator label="Carregando o acervo..." className="text-[11px]" />
    </div>
  );
}
