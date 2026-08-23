"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingIndicator } from "@/components/LoadingIndicator";

export function YearSearchForm() {
  const router = useRouter();
  const [year, setYear] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsNavigating(true);
    router.push(`/years/${year.trim()}`);
  }

  return (
    <div className="max-w-[420px]">
      <form onSubmit={handleSubmit} className="flex items-center gap-4 border-b border-[#171420]/[0.22] px-0.5 pb-3.5">
        <span className="h-3.5 w-3.5 flex-none rounded-full border-[1.6px] border-[#d1145a]" />
        <input
          role="searchbox"
          type="search"
          inputMode="numeric"
          value={year}
          onChange={(event) => setYear(event.target.value)}
          placeholder="digite um ano, ex: 1986..."
          disabled={isNavigating}
          className="w-full border-0 bg-transparent text-base text-[#171420] outline-none placeholder:text-[#a8a2b0] disabled:opacity-60"
        />
        <button type="submit" disabled={isNavigating} className="sr-only">
          Buscar
        </button>
      </form>

      {isNavigating && <LoadingIndicator label="Abrindo ano..." className="mt-4" />}
    </div>
  );
}
