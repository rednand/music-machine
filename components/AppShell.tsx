"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AdminDebugPanel } from "@/components/AdminDebugPanel";
import { signOut } from "@/app/actions/auth";

const NAV_ITEMS = [
  { href: "/", label: "Acervo" },
  { href: "/years", label: "Eras" }
];

export function AppShell({ children, isAdmin = false }: { children: React.ReactNode; isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-full">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          transition: "background 700ms ease",
          background:
            "radial-gradient(1000px 700px at 82% -6%, rgba(var(--album-tint, 209, 20, 90), var(--album-tint-alpha, 0.16)), transparent 65%), radial-gradient(760px 560px at 4% 12%, rgba(109,92,224,0.16), transparent 60%), radial-gradient(1100px 700px at 60% 74%, rgba(13,122,92,0.11), transparent 62%), radial-gradient(700px 500px at 12% 96%, rgba(255,178,102,0.13), transparent 60%)"
        }}
      />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[76px] flex-col items-center justify-between overflow-hidden border-r border-[#171420]/[0.08] bg-white/50 py-5 pb-6 backdrop-blur-xl md:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between gap-6 py-16 font-mono text-[9.5px] tracking-[0.3em] text-[#171420]/[0.06]"
        >
          {Array.from({ length: 10 }).map((_, index) => (
            <span key={index} className="[writing-mode:vertical-rl]">
              ACERVO
            </span>
          ))}
        </div>

        <Link
          href="/"
          aria-label="Acervo"
          className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full shadow-[0_8px_20px_-8px_rgba(209,20,90,0.6)]"
          style={{ background: "linear-gradient(150deg, #ff7fae, #d1145a)" }}
        >
          <span className="h-3 w-3 rounded-full border-2 border-white/95" />
        </Link>

        <nav className="relative flex flex-col items-center gap-8 font-mono text-[9.5px] tracking-[0.26em]">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "[writing-mode:vertical-rl] bg-white/50 backdrop-blur-xl transition-colors hover:text-[#d1145a]",
                  active ? "text-[#d1145a]" : "text-[#6b6577]"
                )}
              >
                {item.label.toUpperCase()}
              </Link>
            );
          })}
        </nav>

        {isAdmin ? (
          <button
            type="button"
            onClick={() => signOut()}
            className="relative bg-white/50 font-mono text-[9.5px] tracking-[0.26em] text-[#d1145a] backdrop-blur-xl [writing-mode:vertical-rl] hover:text-[#120f18]"
          >
            SAIR
          </button>
        ) : null}
      </aside>

      <main className="relative z-10 pb-16 md:pb-0 md:pl-[clamp(104px,9vw,140px)]">
        {children}
        {isAdmin && (
          <div className="mx-auto max-w-[980px] px-6 pb-10 md:pr-[clamp(24px,4vw,72px)]">
            <AdminDebugPanel />
          </div>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-[#171420]/[0.08] bg-white/70 p-2 backdrop-blur-xl md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-4 py-1 font-mono text-[10px] tracking-[0.18em] transition-colors",
                active ? "text-[#d1145a]" : "text-[#6b6577]"
              )}
            >
              {item.label.toUpperCase()}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
