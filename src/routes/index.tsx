import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldAlert, User as UserIcon, Loader2, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";
import { attemptLogin, recentFailures } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — CyberShield Secure Access AI" },
      { name: "description", content: "Sign in to the CyberShield Secure Access AI console. AI-monitored authentication with risk scoring and 2FA." },
      { property: "og:title", content: "Sign in — CyberShield Secure Access AI" },
      { property: "og:description", content: "AI-monitored authentication with risk scoring and 2FA." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [need2fa, setNeed2fa] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [fails, setFails] = useState(0);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  useEffect(() => {
    if (username) setFails(recentFailures(username));
  }, [username]);

  function fillDemo(u: string, p: string) {
    setUsername(u); setPassword(p);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 450));
      const result = attemptLogin(username, password, remember);
      if (!result.ok) {
        toast.error(result.reason || "Sign-in failed", {
          description: `Risk score ${result.risk}/100 · ${result.flags.join(", ") || "no flags"}`,
        });
        setFails(recentFailures(username));
        return;
      }
      if (result.user!.twoFAEnabled) {
        setNeed2fa(true);
        setPendingUser(result.user!.username);
        toast.info("2FA required", { description: "Enter the 6-digit code from your authenticator app. (Demo: any 6 digits)" });
      } else {
        toast.success("Welcome back", {
          description: `Risk score ${result.risk}/100 · session active`,
        });
        refresh();
        navigate({ to: "/dashboard" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  function confirm2FA(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      toast.error("Enter a 6-digit code");
      return;
    }
    toast.success(`Welcome back, ${pendingUser}`, { description: "2FA verified · session active" });
    refresh();
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 grid-bg" aria-hidden />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-10">
        <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          {/* Left: brand panel */}
          <section className="hidden lg:block fade-in">
            <Logo size={28} />
            <h1 className="mt-8 text-5xl font-bold leading-[1.05] tracking-tight">
              AI-driven access<br />
              for the modern <span className="gradient-text">perimeter.</span>
            </h1>
            <p className="mt-5 max-w-md text-muted-foreground">
              CyberShield monitors every sign-in with adversarial risk scoring, anomaly detection
              and adaptive 2FA — purpose-built for SOC teams and identity engineers.
            </p>

            <ul className="mt-8 grid gap-3 text-sm">
              {[
                ["AI risk engine", "Per-request scoring · brute-force & geo anomaly detection"],
                ["Zero-trust sessions", "Device fingerprinting · auto expiry · remote revoke"],
                ["Audit-grade telemetry", "Immutable login ledger · exportable analyst views"],
              ].map(([t, d]) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[color:var(--cyber-cyan)] shadow-[0_0_12px_var(--cyber-cyan)]" />
                  <div>
                    <div className="font-semibold">{t}</div>
                    <div className="text-muted-foreground">{d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Right: form */}
          <section className="slide-up">
            <div className="glass relative overflow-hidden rounded-2xl p-7 sm:p-9 scanline">
              <div className="lg:hidden mb-6"><Logo size={24} /></div>
              <header>
                <div className="inline-flex items-center gap-2 rounded-full neon-border px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--cyber-green)] shadow-[0_0_8px_var(--cyber-green)]" />
                  Secure channel · TLS 1.3
                </div>
                <h2 className="mt-4 text-2xl font-bold">{need2fa ? "Verify identity" : "Access console"}</h2>
                <p className="text-sm text-muted-foreground">
                  {need2fa ? "Enter the 6-digit code from your authenticator app." : "Authenticate to continue to the CyberShield console."}
                </p>
              </header>

              {!need2fa ? (
                <form
                  onSubmit={onSubmit}
                  action="#"
                  method="post"
                  className="mt-6 space-y-4"
                  autoComplete="on"
                  noValidate
                >
                  <Field icon={<UserIcon className="h-4 w-4" />} label="Username or email">
                    <input
                      name="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      required
                      maxLength={64}
                      className="bg-transparent w-full text-sm outline-none placeholder:text-muted-foreground/70"
                      placeholder="admin"
                    />
                  </Field>
                  <Field icon={<KeyRound className="h-4 w-4" />} label="Password">
                    <input
                      name="password"
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      maxLength={128}
                      className="bg-transparent w-full text-sm outline-none placeholder:text-muted-foreground/70"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="text-muted-foreground hover:text-foreground">
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </Field>

                  <div className="flex items-center justify-between text-xs">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="h-3.5 w-3.5 accent-[color:var(--cyber-cyan)]"
                      />
                      <span className="text-muted-foreground">Remember this device (7 days)</span>
                    </label>
                    <span className="font-mono text-muted-foreground">30-min idle expiry</span>
                  </div>

                  {fails >= 3 && (
                    <div className="flex items-start gap-2 rounded-md border border-[color:var(--cyber-amber)]/40 bg-[color:var(--cyber-amber)]/10 p-3 text-xs">
                      <ShieldAlert className="h-4 w-4 text-[color:var(--cyber-amber)]" />
                      <span><strong>{fails}</strong> recent failed attempts for this user. AI engine has raised the risk threshold.</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    onClick={(e) => {
                      // Belt-and-braces: handle the click directly so a pre-hydration
                      // native form submit can never bypass our handler.
                      if (e.currentTarget.form) {
                        e.preventDefault();
                        onSubmit(e as unknown as React.FormEvent);
                      }
                    }}
                    className="group relative w-full overflow-hidden rounded-md bg-gradient-to-r from-[color:var(--cyber-cyan)] via-[color:var(--cyber-violet)] to-[color:var(--cyber-magenta)] px-4 py-2.5 text-sm font-semibold text-[color:var(--background)] shadow-[0_8px_30px_-10px_var(--cyber-violet)] transition hover:brightness-110 disabled:opacity-60"
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
                      {busy ? "Authenticating…" : "Sign in securely"}
                    </span>
                  </button>


                  <p className="text-center text-xs text-muted-foreground">
                    No account?{" "}
                    <Link to="/register" className="text-[color:var(--cyber-cyan)] hover:underline">Create one</Link>
                  </p>
                </form>
              ) : (
                <form onSubmit={confirm2FA} className="mt-6 space-y-4">
                  <Field icon={<Fingerprint className="h-4 w-4" />} label="One-time code (TOTP)">
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      autoFocus
                      placeholder="123 456"
                      className="bg-transparent w-full text-lg tracking-[0.5em] font-mono outline-none placeholder:text-muted-foreground/40"
                    />
                  </Field>
                  <button
                    type="submit"
                    className="w-full rounded-md bg-gradient-to-r from-[color:var(--cyber-cyan)] via-[color:var(--cyber-violet)] to-[color:var(--cyber-magenta)] px-4 py-2.5 text-sm font-semibold text-[color:var(--background)]"
                  >
                    Verify and continue
                  </button>
                  <button type="button" onClick={() => setNeed2fa(false)} className="w-full text-xs text-muted-foreground hover:text-foreground">
                    Use a different account
                  </button>
                </form>
              )}

              <div className="my-6 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> Demo accounts <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { u: "admin", p: "admin123", r: "Admin" },
                  { u: "analyst", p: "analyst123", r: "Analyst" },
                  { u: "user", p: "user123", r: "User" },
                ].map((d) => (
                  <button
                    key={d.u}
                    type="button"
                    onClick={() => fillDemo(d.u, d.p)}
                    className="rounded-md border border-border bg-secondary/60 px-2 py-2 text-left hover:border-[color:var(--cyber-cyan)] hover:bg-[color:var(--cyber-cyan)]/5 transition"
                  >
                    <div className="font-semibold">{d.r}</div>
                    <div className="text-muted-foreground font-mono text-[10px]">{d.u} / {d.p}</div>
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-4 text-center text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
              All telemetry is simulated · No data leaves your browser
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2 rounded-md border border-border bg-input px-3 py-2.5 focus-within:border-[color:var(--cyber-cyan)] focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--cyber-cyan)_25%,transparent)] transition">
        <span className="text-muted-foreground">{icon}</span>
        {children}
      </div>
    </label>
  );
}
