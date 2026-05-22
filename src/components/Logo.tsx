import { ShieldCheck } from "lucide-react";

export function Logo({ size = 28, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <span
        className="relative inline-flex items-center justify-center rounded-lg neon-border glow-pulse"
        style={{ width: size + 10, height: size + 10 }}
        aria-hidden
      >
        <ShieldCheck
          style={{ width: size, height: size }}
          className="text-[color:var(--cyber-cyan)]"
          strokeWidth={2.2}
        />
      </span>
      {withText && (
        <span className="font-display text-[15px] font-bold tracking-wider">
          <span className="gradient-text">CYBERSHIELD</span>
          <span className="ml-1 text-foreground/70 text-[11px] font-medium tracking-[0.25em]">
            SECURE&nbsp;ACCESS&nbsp;AI
          </span>
        </span>
      )}
    </div>
  );
}
