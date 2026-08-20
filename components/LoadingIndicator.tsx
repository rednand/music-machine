import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingIndicator({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 font-mono text-[10px] tracking-[0.22em] text-[#6b6577]", className)}>
      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#d1145a]" aria-hidden="true" />
      <span>{label.toUpperCase()}</span>
    </div>
  );
}
