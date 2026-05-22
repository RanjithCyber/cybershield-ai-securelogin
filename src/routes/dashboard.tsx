import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, BarChart3, Bot, Download, LogOut,
  Moon, Settings, Shield, ShieldCheck, Sun, Users, MapPin,
  Smartphone, Monitor, Clock, Trash2, KeyRound, X, Sparkles,
  CheckCircle2, XCircle, TrendingUp, Lock, Search,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { PasswordMeter } from "@/components/PasswordMeter";
import { useAuth } from "@/lib/auth-context";
import {
  getEvents, getSessions, getUsers, revokeSession, revokeAllOthers,
  setTwoFA, deleteUser, updateUserRole, changePassword, type LoginEvent,
  type SessionRecord, type Role,
} from "@/lib/auth";
import { explainEvent, generateInsights } from "@/lib/security";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Console — CyberShield Secure Access AI" },
      { name: "description", content: "SOC-style identity console: AI risk scoring, audit logs, session control and password intelligence." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DashboardPage,
});

type Tab = "overview" | "audit" | "sessions" | "users" | "ai" | "settings";

function DashboardPage() {
  const { user, logout, theme, toggleTheme, refresh } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) { navigate({ to: "/" }); return; }
  }, [user, navigate]);

  // Re-render on changes (mutations write to localStorage)
  const bump = () => setTick((t) => t + 1);

  const events = useMemo<LoginEvent[]>(() => getEvents(), [tick]);
  const sessions = useMemo<SessionRecord[]>(() => getSessions(), [tick]);
  const allUsers = useMemo(() => getUsers(), [tick]);

  if (!user) return null;

  const canSeeAudit = user.role === "admin" || user.role === "analyst";
  const canManageUsers = user.role === "admin";

  const tabs: { id: Tab; label: string; icon: React.ReactNode; show: boolean }[] = ([
    { id: "overview" as Tab, label: "Overview", icon: <Activity className="h-4 w-4" />, show: true },
    { id: "audit" as Tab, label: "Audit Log", icon: <Shield className="h-4 w-4" />, show: canSeeAudit },
    { id: "sessions" as Tab, label: "Sessions", icon: <Monitor className="h-4 w-4" />, show: true },
    { id: "users" as Tab, label: "Users", icon: <Users className="h-4 w-4" />, show: canManageUsers },
    { id: "ai" as Tab, label: "AI Assistant", icon: <Bot className="h-4 w-4" />, show: true },
    { id: "settings" as Tab, label: "Settings", icon: <Settings className="h-4 w-4" />, show: true },
  ] as const).filter((t) => t.show);

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 grid-bg pointer-events-none" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-5 lg:px-8">
        {/* Top bar */}
        <header className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <Logo size={22} withText />
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full neon-border px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.2em]">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--cyber-green)] shadow-[0_0_8px_var(--cyber-green)]" />
              Operational
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:block text-right text-xs leading-tight">
              <div className="font-semibold">{user.username}</div>
              <div className="text-muted-foreground capitalize">{user.role} · {user.email}</div>
            </div>
            <button onClick={toggleTheme} className="rounded-md border border-border bg-secondary/60 p-2 hover:bg-muted transition" aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => { logout(); toast.success("Signed out"); navigate({ to: "/" }); }}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary/60 px-3 py-2 text-xs hover:border-[color:var(--cyber-red)]/60 hover:text-[color:var(--cyber-red)] transition"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </header>

        {/* Tabs */}
        <nav className="mt-4 flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition border",
                tab === t.id
                  ? "border-[color:var(--cyber-cyan)] bg-[color:var(--cyber-cyan)]/10 text-foreground shadow-[0_0_24px_-8px_var(--cyber-cyan)]"
                  : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </nav>

        <main className="mt-5 fade-in">
          {tab === "overview" && <Overview events={events} sessions={sessions} userId={user.id} username={user.username} role={user.role} />}
          {tab === "audit" && canSeeAudit && <AuditLog events={events} />}
          {tab === "sessions" && <Sessions sessions={sessions} userId={user.id} role={user.role} onChange={bump} />}
          {tab === "users" && canManageUsers && <UsersAdmin onChange={bump} users={allUsers} currentId={user.id} />}
          {tab === "ai" && <AIAssistant events={events} sessions={sessions} user={user} />}
          {tab === "settings" && <SettingsPanel onChange={() => { bump(); refresh(); }} />}
        </main>

        <footer className="mt-10 text-center text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
          CyberShield Secure Access AI · v1.0 · simulated telemetry
        </footer>
      </div>
    </div>
  );
}

// --- Overview ---------------------------------------------------------------
function Overview({
  events, sessions, userId, username, role,
}: { events: LoginEvent[]; sessions: SessionRecord[]; userId: string; username: string; role: Role }) {
  const mineEvents = role === "user" ? events.filter((e) => e.username === username) : events;
  const last24h = mineEvents.filter((e) => e.ts > Date.now() - 86400000);
  const failed24h = last24h.filter((e) => !e.success).length;
  const highRisk24h = last24h.filter((e) => e.risk >= 60).length;
  const activeSessions = role === "user" ? sessions.filter((s) => s.userId === userId).length : sessions.length;
  const avgRisk = last24h.length ? Math.round(last24h.reduce((s, e) => s + e.risk, 0) / last24h.length) : 0;

  const series = buildHourlySeries(mineEvents, 24);
  const riskBuckets = [
    { name: "Low (0–39)", value: mineEvents.filter((e) => e.risk < 40).length, color: "var(--cyber-green)" },
    { name: "Medium (40–69)", value: mineEvents.filter((e) => e.risk >= 40 && e.risk < 70).length, color: "var(--cyber-amber)" },
    { name: "High (70+)", value: mineEvents.filter((e) => e.risk >= 70).length, color: "var(--cyber-red)" },
  ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Lock className="h-4 w-4" />} label="Successful 24h" value={last24h.filter(e => e.success).length} accent="cyan" sub={`${last24h.length} total events`} />
        <StatCard icon={<XCircle className="h-4 w-4" />} label="Failed 24h" value={failed24h} accent={failed24h > 5 ? "red" : "amber"} sub={failed24h > 5 ? "Above threshold" : "Within tolerance"} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Avg risk score" value={`${avgRisk}/100`} accent={avgRisk > 50 ? "red" : avgRisk > 30 ? "amber" : "green"} sub={`${highRisk24h} high-risk events`} />
        <StatCard icon={<Monitor className="h-4 w-4" />} label="Active sessions" value={activeSessions} accent="violet" sub="Across all devices" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm tracking-wider">SIGN-IN ACTIVITY · 24H</h3>
              <p className="text-xs text-muted-foreground">Successful vs failed attempts per hour</p>
            </div>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--cyber-cyan)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="var(--cyber-cyan)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gFail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--cyber-red)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="var(--cyber-red)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Area type="monotone" dataKey="success" name="Success" stroke="var(--cyber-cyan)" strokeWidth={2} fill="url(#gSuccess)" />
                <Area type="monotone" dataKey="fail" name="Failed" stroke="var(--cyber-red)" strokeWidth={2} fill="url(#gFail)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-display text-sm tracking-wider">RISK DISTRIBUTION</h3>
          <p className="text-xs text-muted-foreground">All time</p>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskBuckets} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3} stroke="var(--background)">
                  {riskBuckets.map((r) => <Cell key={r.name} fill={r.color} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm tracking-wider">RECENT EVENTS</h3>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">latest 8</span>
          </div>
          <ul className="mt-3 divide-y divide-border/60">
            {mineEvents.slice(0, 8).map((e) => <EventRow key={e.id} e={e} />)}
            {mineEvents.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No events yet</li>}
          </ul>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-display text-sm tracking-wider flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[color:var(--cyber-cyan)]" /> AI HIGHLIGHTS
          </h3>
          <p className="text-xs text-muted-foreground">Top recommendations from the AI engine</p>
          <ul className="mt-3 space-y-2.5">
            {generateInsights({ id: userId, username, email: "", passwordHash: "", role, twoFAEnabled: false, createdAt: 0 }, mineEvents, sessions).slice(0, 3).map((i) => (
              <li key={i.id} className="rounded-lg border border-border/70 bg-secondary/40 p-3">
                <div className="flex items-center gap-2">
                  <SeverityDot s={i.severity} />
                  <span className="text-xs font-semibold">{i.title}</span>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">{i.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; accent: "cyan" | "violet" | "green" | "amber" | "red" }) {
  const colorMap = {
    cyan: "var(--cyber-cyan)", violet: "var(--cyber-violet)", green: "var(--cyber-green)", amber: "var(--cyber-amber)", red: "var(--cyber-red)",
  } as const;
  const c = colorMap[accent];
  return (
    <div className="glass rounded-2xl p-4 relative overflow-hidden">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ background: c }} />
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
        <span style={{ color: c }}>{icon}</span>{label}
      </div>
      <div className="mt-2 text-3xl font-bold font-display" style={{ textShadow: `0 0 24px color-mix(in oklab, ${c} 50%, transparent)` }}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function SeverityDot({ s }: { s: "info" | "warn" | "critical" }) {
  const c = s === "critical" ? "var(--cyber-red)" : s === "warn" ? "var(--cyber-amber)" : "var(--cyber-cyan)";
  return <span className="h-2 w-2 rounded-full" style={{ background: c, boxShadow: `0 0 10px ${c}` }} />;
}

function buildHourlySeries(events: LoginEvent[], hours: number) {
  const now = new Date();
  const buckets: { label: string; success: number; fail: number; ts: number }[] = [];
  for (let i = hours - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600_000);
    d.setMinutes(0, 0, 0);
    buckets.push({ label: format(d, "HH:00"), success: 0, fail: 0, ts: d.getTime() });
  }
  events.forEach((e) => {
    const b = buckets.find((x) => e.ts >= x.ts && e.ts < x.ts + 3600_000);
    if (b) { if (e.success) b.success++; else b.fail++; }
  });
  return buckets;
}

// --- Audit Log --------------------------------------------------------------
function AuditLog({ events }: { events: LoginEvent[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "success" | "fail" | "high">("all");

  const filtered = events.filter((e) => {
    if (filter === "success" && !e.success) return false;
    if (filter === "fail" && e.success) return false;
    if (filter === "high" && e.risk < 70) return false;
    if (q) {
      const s = q.toLowerCase();
      return e.username.toLowerCase().includes(s) || e.ip.includes(s) || e.location.toLowerCase().includes(s) || e.device.toLowerCase().includes(s);
    }
    return true;
  });

  function exportCSV() {
    const headers = ["timestamp", "username", "success", "risk", "ip", "location", "device", "browser", "flags", "reason"];
    const rows = filtered.map((e) => [
      new Date(e.ts).toISOString(), e.username, e.success, e.risk, e.ip, e.location, e.device, e.browser, e.flags.join("|"), e.reason || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cybershield-audit-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} rows`);
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-sm tracking-wider">SECURITY AUDIT LEDGER</h3>
          <p className="text-xs text-muted-foreground">{filtered.length} of {events.length} events</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-input px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search user, IP, device" className="bg-transparent text-xs outline-none w-44" />
          </div>
          <div className="inline-flex rounded-md border border-border bg-secondary/40 p-0.5 text-xs">
            {(["all", "success", "fail", "high"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("px-2.5 py-1 rounded capitalize", filter === f ? "bg-[color:var(--cyber-cyan)]/15 text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {f === "high" ? "High risk" : f}
              </button>
            ))}
          </div>
          <button onClick={exportCSV} className="inline-flex items-center gap-1.5 rounded-md neon-border px-3 py-1.5 text-xs hover:bg-[color:var(--cyber-cyan)]/10 transition">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[800px] text-xs">
          <thead className="text-left text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            <tr className="border-b border-border">
              <th className="py-2 pr-3">When</th>
              <th className="py-2 pr-3">User</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Risk</th>
              <th className="py-2 pr-3">IP / Location</th>
              <th className="py-2 pr-3">Device</th>
              <th className="py-2 pr-3">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.slice(0, 100).map((e) => (
              <tr key={e.id} className="hover:bg-secondary/30">
                <td className="py-2.5 pr-3 whitespace-nowrap text-muted-foreground">{format(e.ts, "MMM d, HH:mm:ss")}</td>
                <td className="py-2.5 pr-3 font-medium">{e.username}</td>
                <td className="py-2.5 pr-3">
                  {e.success
                    ? <span className="inline-flex items-center gap-1 text-[color:var(--cyber-green)]"><CheckCircle2 className="h-3.5 w-3.5" />Success</span>
                    : <span className="inline-flex items-center gap-1 text-[color:var(--cyber-red)]"><XCircle className="h-3.5 w-3.5" />Failed</span>}
                </td>
                <td className="py-2.5 pr-3"><RiskBadge r={e.risk} /></td>
                <td className="py-2.5 pr-3 font-mono">{e.ip}<div className="text-[10px] text-muted-foreground">{e.location}</div></td>
                <td className="py-2.5 pr-3">{e.device}<div className="text-[10px] text-muted-foreground">{e.browser}</div></td>
                <td className="py-2.5 pr-3">
                  {e.flags.length === 0
                    ? <span className="text-muted-foreground">—</span>
                    : <div className="flex flex-wrap gap-1">{e.flags.map((f) => <span key={f} className="rounded bg-[color:var(--cyber-violet)]/15 text-[color:var(--cyber-violet)] px-1.5 py-0.5 text-[10px] font-mono">{f}</span>)}</div>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">No events match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EventRow({ e }: { e: LoginEvent }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        {e.success
          ? <CheckCircle2 className="h-4 w-4 text-[color:var(--cyber-green)] shrink-0" />
          : <XCircle className="h-4 w-4 text-[color:var(--cyber-red)] shrink-0" />}
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{e.username} <span className="text-muted-foreground font-normal">· {e.device} · {e.browser}</span></div>
          <div className="text-[11px] text-muted-foreground truncate">
            {formatDistanceToNow(e.ts, { addSuffix: true })} · {e.ip} · {e.location}
          </div>
        </div>
      </div>
      <RiskBadge r={e.risk} />
    </li>
  );
}

function RiskBadge({ r }: { r: number }) {
  const c = r >= 70 ? "var(--cyber-red)" : r >= 40 ? "var(--cyber-amber)" : "var(--cyber-green)";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-mono"
      style={{ borderColor: `color-mix(in oklab, ${c} 40%, transparent)`, color: c, background: `color-mix(in oklab, ${c} 10%, transparent)` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />{r}
    </span>
  );
}

// --- Sessions ---------------------------------------------------------------
function Sessions({ sessions, userId, role, onChange }: { sessions: SessionRecord[]; userId: string; role: Role; onChange: () => void }) {
  const mine = role === "admin" ? sessions : sessions.filter((s) => s.userId === userId);
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-sm tracking-wider">ACTIVE SESSIONS</h3>
          <p className="text-xs text-muted-foreground">{mine.length} active · idle sessions expire after 30 minutes</p>
        </div>
        <button
          onClick={() => { revokeAllOthers(); onChange(); toast.success("Other sessions revoked"); }}
          className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--cyber-amber)]/40 bg-[color:var(--cyber-amber)]/10 text-[color:var(--cyber-amber)] px-3 py-1.5 text-xs hover:brightness-110 transition"
        >
          <X className="h-3.5 w-3.5" /> Sign out other devices
        </button>
      </div>

      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {mine.map((s) => (
          <li key={s.id} className="rounded-xl border border-border/70 bg-secondary/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-md neon-border p-2">
                  {/iPhone|Android|Pixel/.test(s.device) ? <Smartphone className="h-4 w-4 text-[color:var(--cyber-cyan)]" /> : <Monitor className="h-4 w-4 text-[color:var(--cyber-cyan)]" />}
                </span>
                <div>
                  <div className="text-sm font-semibold">{s.device} <span className="text-muted-foreground font-normal">· {s.browser}</span></div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.location} · <span className="font-mono">{s.ip}</span></div>
                  <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Last active {formatDistanceToNow(s.lastActive, { addSuffix: true })}</div>
                </div>
              </div>
              <button
                onClick={() => { revokeSession(s.id); onChange(); toast.success("Session revoked"); }}
                className="rounded-md border border-border bg-background/60 p-1.5 text-muted-foreground hover:text-[color:var(--cyber-red)] hover:border-[color:var(--cyber-red)]/50 transition"
                aria-label="Revoke session"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
        {mine.length === 0 && <li className="text-sm text-muted-foreground">No active sessions.</li>}
      </ul>
    </div>
  );
}

// --- Users (admin) ----------------------------------------------------------
function UsersAdmin({ users, currentId, onChange }: { users: ReturnType<typeof getUsers>; currentId: string; onChange: () => void }) {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="font-display text-sm tracking-wider">USER MANAGEMENT</h3>
      <p className="text-xs text-muted-foreground">{users.length} accounts · admin can change roles and remove users</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="text-left text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            <tr className="border-b border-border">
              <th className="py-2 pr-3">User</th>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Role</th>
              <th className="py-2 pr-3">2FA</th>
              <th className="py-2 pr-3">Created</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-secondary/30">
                <td className="py-2.5 pr-3 font-medium">{u.username}{u.id === currentId && <span className="ml-2 text-[10px] text-[color:var(--cyber-cyan)]">(you)</span>}</td>
                <td className="py-2.5 pr-3 text-muted-foreground">{u.email}</td>
                <td className="py-2.5 pr-3">
                  <select
                    value={u.role}
                    onChange={(e) => { updateUserRole(u.id, e.target.value as Role); onChange(); toast.success(`Role updated for ${u.username}`); }}
                    className="rounded-md border border-border bg-input px-2 py-1 text-xs"
                  >
                    <option value="admin">admin</option>
                    <option value="analyst">analyst</option>
                    <option value="user">user</option>
                  </select>
                </td>
                <td className="py-2.5 pr-3">
                  <button
                    onClick={() => { setTwoFA(u.id, !u.twoFAEnabled); onChange(); }}
                    className={cn("rounded-md px-2 py-1 text-[11px] font-mono", u.twoFAEnabled ? "bg-[color:var(--cyber-green)]/15 text-[color:var(--cyber-green)]" : "bg-secondary text-muted-foreground")}>
                    {u.twoFAEnabled ? "Enabled" : "Disabled"}
                  </button>
                </td>
                <td className="py-2.5 pr-3 text-muted-foreground">{format(u.createdAt, "MMM d, yyyy")}</td>
                <td className="py-2.5 pr-3 text-right">
                  <button
                    disabled={u.id === currentId}
                    onClick={() => { if (confirm(`Delete ${u.username}?`)) { deleteUser(u.id); onChange(); toast.success("User deleted"); } }}
                    className="rounded-md border border-border bg-background/60 p-1.5 text-muted-foreground hover:text-[color:var(--cyber-red)] hover:border-[color:var(--cyber-red)]/50 transition disabled:opacity-30 disabled:hover:text-muted-foreground disabled:hover:border-border"
                    aria-label="Delete user"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- AI Assistant -----------------------------------------------------------
function AIAssistant({ events, sessions, user }: { events: LoginEvent[]; sessions: SessionRecord[]; user: ReturnType<typeof getUsers>[number] }) {
  const insights = generateInsights(user, events, sessions);
  const [picked, setPicked] = useState<LoginEvent | null>(events[0] ?? null);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <div className="rounded-md neon-border p-2"><Bot className="h-4 w-4 text-[color:var(--cyber-cyan)]" /></div>
          <div>
            <h3 className="font-display text-sm tracking-wider">AI SECURITY ASSISTANT</h3>
            <p className="text-xs text-muted-foreground">Contextual insights generated from your telemetry</p>
          </div>
        </div>

        <ul className="mt-5 space-y-3">
          {insights.map((i) => (
            <li key={i.id} className="rounded-xl border border-border/70 bg-secondary/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2"><SeverityDot s={i.severity} /><span className="font-semibold text-sm">{i.title}</span></div>
                {i.action && (
                  <button onClick={() => toast.info(`${i.action} — demo action`)} className="text-[11px] rounded-md border border-border bg-background/60 px-2 py-1 hover:border-[color:var(--cyber-cyan)] hover:text-[color:var(--cyber-cyan)] transition">
                    {i.action}
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{i.body}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-display text-sm tracking-wider">EVENT EXPLAINER</h3>
        <p className="text-xs text-muted-foreground">Select an event; the AI engine will summarize it.</p>
        <select
          className="mt-3 w-full rounded-md border border-border bg-input px-3 py-2 text-xs"
          value={picked?.id ?? ""}
          onChange={(e) => setPicked(events.find((x) => x.id === e.target.value) ?? null)}
        >
          {events.slice(0, 30).map((e) => (
            <option key={e.id} value={e.id}>
              {format(e.ts, "MMM d HH:mm")} · {e.username} · {e.success ? "success" : "failed"} · risk {e.risk}
            </option>
          ))}
        </select>
        {picked && (
          <div className="mt-4 rounded-xl border border-[color:var(--cyber-cyan)]/30 bg-[color:var(--cyber-cyan)]/5 p-4 scanline relative overflow-hidden">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[color:var(--cyber-cyan)]">
              <Sparkles className="h-3 w-3" /> AI analysis
            </div>
            <p className="mt-2 text-sm leading-relaxed">{explainEvent(picked)}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <div><dt className="opacity-60">IP</dt><dd className="font-mono text-foreground">{picked.ip}</dd></div>
              <div><dt className="opacity-60">Location</dt><dd className="text-foreground">{picked.location}</dd></div>
              <div><dt className="opacity-60">Device</dt><dd className="text-foreground">{picked.device}</dd></div>
              <div><dt className="opacity-60">Browser</dt><dd className="text-foreground">{picked.browser}</dd></div>
            </dl>
          </div>
        )}

        <div className="mt-5">
          <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">Failed attempts by user (7d)</h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={failedByUser(events)} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="username" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="failed" fill="var(--cyber-red)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function failedByUser(events: LoginEvent[]) {
  const cutoff = Date.now() - 7 * 86400000;
  const map = new Map<string, number>();
  events.filter((e) => !e.success && e.ts > cutoff).forEach((e) => map.set(e.username, (map.get(e.username) ?? 0) + 1));
  return Array.from(map.entries()).map(([username, failed]) => ({ username, failed })).sort((a, b) => b.failed - a.failed).slice(0, 6);
}

// --- Settings ---------------------------------------------------------------
function SettingsPanel({ onChange }: { onChange: () => void }) {
  const { user } = useAuth();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  async function onChangePw(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      changePassword(user!.id, cur, next);
      toast.success("Password updated");
      setCur(""); setNext(""); onChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusy(false); }
  }

  function toggle2FA() {
    setTwoFA(user!.id, !user!.twoFAEnabled);
    toast.success(`2FA ${!user!.twoFAEnabled ? "enabled" : "disabled"}`);
    onChange();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="glass rounded-2xl p-5">
        <h3 className="font-display text-sm tracking-wider">ACCOUNT</h3>
        <div className="mt-3 space-y-2 text-sm">
          <Row label="Username" value={user.username} />
          <Row label="Email" value={user.email} />
          <Row label="Role" value={<span className="capitalize">{user.role}</span>} />
          <Row label="Member since" value={format(user.createdAt, "MMM d, yyyy")} />
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-display text-sm tracking-wider flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[color:var(--cyber-cyan)]" /> TWO-FACTOR AUTH</h3>
        <p className="text-xs text-muted-foreground">TOTP · Google Authenticator compatible</p>
        <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3">
          <div className="text-sm">
            Status: <span className={cn("font-mono", user.twoFAEnabled ? "text-[color:var(--cyber-green)]" : "text-[color:var(--cyber-amber)]")}>
              {user.twoFAEnabled ? "ENABLED" : "DISABLED"}
            </span>
          </div>
          <button onClick={toggle2FA} className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition",
            user.twoFAEnabled ? "bg-secondary text-foreground hover:bg-muted" : "bg-gradient-to-r from-[color:var(--cyber-cyan)] to-[color:var(--cyber-violet)] text-[color:var(--background)]")}>
            {user.twoFAEnabled ? "Disable" : "Enable 2FA"}
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 lg:col-span-2">
        <h3 className="font-display text-sm tracking-wider flex items-center gap-2"><KeyRound className="h-4 w-4 text-[color:var(--cyber-cyan)]" /> CHANGE PASSWORD</h3>
        <form onSubmit={onChangePw} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block">
            <div className="mb-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Current password</div>
            <input type="password" required value={cur} onChange={(e) => setCur(e.target.value)} className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-[color:var(--cyber-cyan)]" />
          </label>
          <label className="block">
            <div className="mb-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">New password</div>
            <input type="password" required value={next} onChange={(e) => setNext(e.target.value)} className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-[color:var(--cyber-cyan)]" />
          </label>
          <div className="md:col-span-2"><PasswordMeter password={next} /></div>
          <div className="md:col-span-2">
            <button disabled={busy || !cur || !next} className="rounded-md bg-gradient-to-r from-[color:var(--cyber-cyan)] via-[color:var(--cyber-violet)] to-[color:var(--cyber-magenta)] px-4 py-2 text-sm font-semibold text-[color:var(--background)] disabled:opacity-50">
              {busy ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </div>

      <div className="glass rounded-2xl p-5 lg:col-span-2 border border-[color:var(--cyber-amber)]/30">
        <h3 className="font-display text-sm tracking-wider flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-[color:var(--cyber-amber)]" /> DEMO NOTICE</h3>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          This is a portfolio demonstration. All data lives in your browser's localStorage and uses a mock hashing function — not bcrypt/Argon2.
          Wire the auth layer to a real backend (Node/Express, FastAPI, or Lovable Cloud) before any production use.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-border/40 pb-1.5 last:border-0">
      <span className="text-muted-foreground text-xs uppercase tracking-wider font-mono">{label}</span>
      <span>{value}</span>
    </div>
  );
}
