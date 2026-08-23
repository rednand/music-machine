"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAlbum } from "@/app/actions/admin";

export function AdminDeleteAlbumButton({ albumId, albumTitle }: { albumId: string; albumTitle: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsDeleting(true);
    setError(null);
    const result = await deleteAlbum(albumId);
    if (result.state === "error") {
      setIsDeleting(false);
      setError(result.message);
      return;
    }
    router.push("/");
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="font-mono text-[10px] tracking-[0.2em] text-[#6b6577] transition-colors hover:text-[#d1145a]"
      >
        EXCLUIR ÁLBUM
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-[#d1145a]/30 bg-white/70 p-4">
      <p className="font-sans text-sm text-[#120f18]">
        Excluir <strong>{albumTitle}</strong> permanentemente? Essa ação não pode ser desfeita.
      </p>
      <div className="mt-3 flex items-center gap-4 font-mono text-[10px] tracking-[0.2em]">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isDeleting}
          className="text-[#d1145a] disabled:opacity-60"
        >
          {isDeleting ? "EXCLUINDO..." : "SIM, EXCLUIR"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isDeleting}
          className="text-[#6b6577] hover:text-[#120f18]"
        >
          CANCELAR
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-[#d1145a]">{error}</p>}
    </div>
  );
}
