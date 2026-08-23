import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { getIsAdmin } from "@/app/lib/auth";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const isAdmin = await getIsAdmin(supabase);

  if (isAdmin) {
    redirect("/");
  }

  return (
    <div className="relative mx-auto max-w-[620px] px-6 py-[120px]">
      <h1 className="font-heading text-[32px] font-extrabold tracking-[-0.02em] text-[#120f18]">Entrar</h1>
      <p className="mt-4 max-w-md text-[17px] font-light leading-relaxed text-[#443f4f]">
        Acesso restrito para administração do acervo.
      </p>
      <div className="mt-8">
        <GoogleSignInButton />
      </div>
    </div>
  );
}
