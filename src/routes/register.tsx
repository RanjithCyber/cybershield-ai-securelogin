import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, KeyRound, Mail, User as UserIcon, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { PasswordMeter } from "@/components/PasswordMeter";
import { registerUser, attemptLogin } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — CyberShield Secure Access AI" },
      { name: "description", content: "Create your CyberShield account. AI-powered authentication, password intelligence, and zero-trust sessions." },
      { property: "og:title", content: "Create account — CyberShield Secure Access AI" },
      { property: "og:description", content: "AI-powered authentication and password intelligence." },
    ],
    links: [{ rel: "canonical", href: "/register" }],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      registerUser({ username, email, password, confirm });
      const r = attemptLogin(username, password, false);
      if (r.ok) {
        toast.success("Account created", { description: "Welcome to CyberShield." });
        refresh();
        navigate({ to: "/dashboard" });
      } else {
        toast.success("Account created — please sign in");
        navigate({ to: "/" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 grid-bg" aria-hidden />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <Logo size={26} />
        <div className="glass slide-up mt-6 rounded-2xl p-7 sm:p-8">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-muted-foreground">Start a free CyberShield identity in under a minute.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field icon={<UserIcon className="h-4 w-4" />} label="Username">
              <input value={username} onChange={(e) => setUsername(e.target.value)} required maxLength={32}
                autoComplete="username"
                className="bg-transparent w-full text-sm outline-none placeholder:text-muted-foreground/70" placeholder="jane_doe" />
            </Field>
            <Field icon={<Mail className="h-4 w-4" />} label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255}
                autoComplete="email"
                className="bg-transparent w-full text-sm outline-none placeholder:text-muted-foreground/70" placeholder="jane@company.com" />
            </Field>
            <Field icon={<KeyRound className="h-4 w-4" />} label="Password">
              <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={128}
                autoComplete="new-password"
                className="bg-transparent w-full text-sm outline-none placeholder:text-muted-foreground/70" placeholder="••••••••" />
              <button type="button" onClick={() => setShow((s) => !s)} className="text-muted-foreground hover:text-foreground" aria-label="toggle password">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </Field>
            <PasswordMeter password={password} />
            <Field icon={<KeyRound className="h-4 w-4" />} label="Confirm password">
              <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required maxLength={128}
                autoComplete="new-password"
                className="bg-transparent w-full text-sm outline-none placeholder:text-muted-foreground/70" placeholder="••••••••" />
            </Field>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-gradient-to-r from-[color:var(--cyber-cyan)] via-[color:var(--cyber-violet)] to-[color:var(--cyber-magenta)] px-4 py-2.5 text-sm font-semibold text-[color:var(--background)] disabled:opacity-60"
            >
              <span className="inline-flex items-center justify-center gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {busy ? "Creating account…" : "Create account"}
              </span>
            </button>

            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link to="/" className="text-[color:var(--cyber-cyan)] hover:underline">Sign in</Link>
            </p>
          </form>
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
