"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/app/lib/supabase/client";

export function GoogleSignInButton() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setIsRedirecting(true);
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });

    if (signInError) {
      setIsRedirecting(false);
      setError("Não foi possível iniciar o login. Tente novamente.");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isRedirecting}
        className="inline-flex items-center gap-2 rounded-lg border border-white/90 bg-white/70 px-5 py-3 font-mono text-[11px] tracking-[0.18em] text-[#120f18] backdrop-blur-xl transition-colors hover:border-[#d1145a]/40 disabled:opacity-60"
      >
        {isRedirecting ? "REDIRECIONANDO..." : "ENTRAR COM GOOGLE"}
      </button>
      {error && <p className="mt-3 text-sm text-[#d1145a]">{error}</p>}
    </div>
  );
}
