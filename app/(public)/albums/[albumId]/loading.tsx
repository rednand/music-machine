import { LoadingIndicator } from "@/components/LoadingIndicator";

export default function AlbumLoading() {
  return (
    <div className="relative mx-auto flex max-w-[980px] flex-col items-center justify-center px-6 py-[140px] text-center">
      <LoadingIndicator label="Preparando o contexto do álbum..." className="text-[11px]" />
      <p className="mt-4 max-w-[420px] font-sans text-sm font-light text-[#443f4f]">
        Estamos reunindo faixas, curiosidades e o contexto histórico deste álbum. Isso pode levar
        alguns segundos na primeira visita.
      </p>
    </div>
  );
}
