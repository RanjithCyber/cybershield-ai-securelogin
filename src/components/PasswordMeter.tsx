import { analyzePassword } from "@/lib/security";
import { cn } from "@/lib/utils";

export function PasswordMeter({ password }: { password: string }) {
  const r = analyzePassword(password);
  const colors = ["bg-[color:var(--cyber-red)]", "bg-[color:var(--cyber-red)]", "bg-[color:var(--cyber-amber)]", "bg-[color:var(--cyber-cyan)]", "bg-[color:var(--cyber-green)]"] as const;
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all",
              i <= r.score ? colors[r.score] : "bg-border/60",
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono uppercase tracking-wider text-muted-foreground">
          {r.label} {r.entropy > 0 && <span className="text-foreground/60">· {Math.round(r.entropy)} bits</span>}
        </span>
        {r.breached && (
          <span className="text-[color:var(--cyber-red)] font-medium">⚠ Breached</span>
        )}
      </div>
      {r.feedback.length > 0 && (
        <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside">
          {r.feedback.slice(0, 3).map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      )}
    </div>
  );
}
