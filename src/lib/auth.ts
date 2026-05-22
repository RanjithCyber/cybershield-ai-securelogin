import { z } from "zod";

export type Role = "admin" | "analyst" | "user";

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string; // mock hash
  role: Role;
  twoFAEnabled: boolean;
  createdAt: number;
}

export interface SessionRecord {
  id: string;
  userId: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  createdAt: number;
  lastActive: number;
  current?: boolean;
}

export interface LoginEvent {
  id: string;
  userId: string | null;
  username: string;
  success: boolean;
  reason?: string;
  ip: string;
  location: string;
  device: string;
  browser: string;
  risk: number; // 0-100
  flags: string[];
  ts: number;
}

const K_USERS = "csa.users";
const K_SESSIONS = "csa.sessions";
const K_EVENTS = "csa.events";
const K_CURRENT = "csa.current";
const K_REMEMBER = "csa.remember";

// Tiny non-crypto "hash" — clearly marked as mock.
export function mockHash(pw: string): string {
  let h = 2166136261;
  for (let i = 0; i < pw.length; i++) {
    h ^= pw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return "mh_" + (h >>> 0).toString(16).padStart(8, "0") + "_" + pw.length;
}
export const verifyPassword = (pw: string, hash: string) => mockHash(pw) === hash;

function read<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function write<T>(k: string, v: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(k, JSON.stringify(v));
}

export const getUsers = () => read<User[]>(K_USERS, []);
export const setUsers = (u: User[]) => write(K_USERS, u);
export const getSessions = () => read<SessionRecord[]>(K_SESSIONS, []);
export const setSessions = (s: SessionRecord[]) => write(K_SESSIONS, s);
export const getEvents = () => read<LoginEvent[]>(K_EVENTS, []);
export const setEvents = (e: LoginEvent[]) => write(K_EVENTS, e);

export function getCurrentSession(): { userId: string; sessionId: string; expiresAt: number } | null {
  const s = read<{ userId: string; sessionId: string; expiresAt: number } | null>(K_CURRENT, null);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    localStorage.removeItem(K_CURRENT);
    return null;
  }
  return s;
}
export function setCurrentSession(s: { userId: string; sessionId: string; expiresAt: number } | null) {
  if (!s) localStorage.removeItem(K_CURRENT);
  else write(K_CURRENT, s);
}
export const getRemember = () => read<boolean>(K_REMEMBER, false);
export const setRemember = (b: boolean) => write(K_REMEMBER, b);

export function currentUser(): User | null {
  const s = getCurrentSession();
  if (!s) return null;
  return getUsers().find((u) => u.id === s.userId) ?? null;
}

// ---- Seeding -------------------------------------------------------------
export function seedIfEmpty() {
  if (typeof window === "undefined") return;
  const users = getUsers();
  if (users.length > 0) return;

  const now = Date.now();
  const seeded: User[] = [
    { id: "u_admin", username: "admin", email: "admin@cybershield.io", passwordHash: mockHash("admin123"), role: "admin", twoFAEnabled: true, createdAt: now - 86400000 * 90 },
    { id: "u_analyst", username: "analyst", email: "analyst@cybershield.io", passwordHash: mockHash("analyst123"), role: "analyst", twoFAEnabled: true, createdAt: now - 86400000 * 60 },
    { id: "u_user", username: "user", email: "user@cybershield.io", passwordHash: mockHash("user123"), role: "user", twoFAEnabled: false, createdAt: now - 86400000 * 14 },
  ];
  setUsers(seeded);

  // seed events: last 14 days
  const events: LoginEvent[] = [];
  const ips = ["192.168.1.42", "10.0.0.7", "172.16.5.21", "203.0.113.14", "198.51.100.9", "45.33.32.156"];
  const locs = ["Bengaluru, IN", "Mumbai, IN", "Berlin, DE", "Singapore, SG", "New York, US", "Unknown"];
  const browsers = ["Chrome 126", "Safari 17", "Firefox 128", "Edge 126"];
  const devices = ["MacBook Pro", "Windows 11 PC", "iPhone 15", "Pixel 8", "Linux Workstation"];
  for (let i = 0; i < 120; i++) {
    const u = seeded[Math.floor(Math.random() * seeded.length)];
    const success = Math.random() > 0.18;
    const risk = success ? Math.floor(Math.random() * 35) : 40 + Math.floor(Math.random() * 60);
    const flags: string[] = [];
    if (risk > 60) flags.push("anomalous_geo");
    if (!success && Math.random() > 0.5) flags.push("invalid_credentials");
    if (risk > 75) flags.push("tor_exit_node");
    events.push({
      id: "ev_" + i,
      userId: success ? u.id : null,
      username: u.username,
      success,
      reason: success ? undefined : "Invalid credentials",
      ip: ips[Math.floor(Math.random() * ips.length)],
      location: locs[Math.floor(Math.random() * locs.length)],
      device: devices[Math.floor(Math.random() * devices.length)],
      browser: browsers[Math.floor(Math.random() * browsers.length)],
      risk,
      flags,
      ts: now - Math.floor(Math.random() * 86400000 * 14),
    });
  }
  events.sort((a, b) => b.ts - a.ts);
  setEvents(events);

  // seed sessions for admin/analyst
  const sessions: SessionRecord[] = [
    { id: "s_1", userId: "u_admin", device: "MacBook Pro", browser: "Chrome 126", ip: "192.168.1.42", location: "Bengaluru, IN", createdAt: now - 3600_000 * 3, lastActive: now - 60_000 },
    { id: "s_2", userId: "u_admin", device: "iPhone 15", browser: "Safari 17", ip: "203.0.113.14", location: "Mumbai, IN", createdAt: now - 86400000, lastActive: now - 7200_000 },
    { id: "s_3", userId: "u_analyst", device: "Windows 11 PC", browser: "Edge 126", ip: "10.0.0.7", location: "Berlin, DE", createdAt: now - 3600_000 * 5, lastActive: now - 600_000 },
  ];
  setSessions(sessions);
}

// ---- Validation ----------------------------------------------------------
export const registerSchema = z.object({
  username: z.string().trim().min(3, "At least 3 characters").max(32).regex(/^[a-zA-Z0-9_.-]+$/, "Letters, numbers, _ . - only"),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(128),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Required").max(64),
  password: z.string().min(1, "Required").max(128),
});

// ---- Auth actions --------------------------------------------------------
function detectDevice() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const device = /Mac/.test(ua) ? "MacBook" : /Windows/.test(ua) ? "Windows PC" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS Device" : "Linux";
  const browser = /Edg/.test(ua) ? "Edge" : /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "Browser";
  return { device, browser };
}

function fakeIP() {
  return `${10 + Math.floor(Math.random() * 240)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

export function registerUser(input: { username: string; email: string; password: string; confirm: string }) {
  const parsed = registerSchema.parse(input);
  const users = getUsers();
  if (users.some((u) => u.username.toLowerCase() === parsed.username.toLowerCase())) {
    throw new Error("Username already taken");
  }
  if (users.some((u) => u.email.toLowerCase() === parsed.email.toLowerCase())) {
    throw new Error("Email already registered");
  }
  const user: User = {
    id: "u_" + Math.random().toString(36).slice(2, 9),
    username: parsed.username,
    email: parsed.email,
    passwordHash: mockHash(parsed.password),
    role: "user",
    twoFAEnabled: false,
    createdAt: Date.now(),
  };
  setUsers([...users, user]);
  return user;
}

const FAIL_WINDOW_MS = 10 * 60 * 1000;
const FAIL_THRESHOLD = 5;

export function recentFailures(username: string) {
  const cutoff = Date.now() - FAIL_WINDOW_MS;
  return getEvents().filter((e) => e.username === username && !e.success && e.ts > cutoff).length;
}

export interface LoginResult {
  ok: boolean;
  user?: User;
  reason?: string;
  risk: number;
  flags: string[];
  event: LoginEvent;
}

export function attemptLogin(username: string, password: string, remember: boolean): LoginResult {
  const parsed = loginSchema.parse({ username, password });
  const users = getUsers();
  const user = users.find((u) => u.username.toLowerCase() === parsed.username.toLowerCase() || u.email.toLowerCase() === parsed.username.toLowerCase());
  const { device, browser } = detectDevice();
  const ip = fakeIP();
  const flags: string[] = [];
  let risk = 5;

  const recent = recentFailures(parsed.username);
  if (recent >= FAIL_THRESHOLD) { flags.push("brute_force_suspected"); risk += 40; }
  if (recent >= 3) risk += 15;

  const hour = new Date().getHours();
  if (hour < 5 || hour > 23) { flags.push("unusual_hour"); risk += 10; }

  const success = !!user && verifyPassword(parsed.password, user.passwordHash) && recent < FAIL_THRESHOLD;
  if (!success) {
    risk += 25;
    if (!user) flags.push("unknown_account");
    else flags.push("invalid_credentials");
  }

  // new device heuristic
  if (success && user) {
    const known = getSessions().some((s) => s.userId === user.id && s.device === device);
    if (!known) { flags.push("new_device"); risk += 15; }
  }

  risk = Math.min(100, risk);

  const event: LoginEvent = {
    id: "ev_" + Math.random().toString(36).slice(2, 9),
    userId: success && user ? user.id : null,
    username: parsed.username,
    success,
    reason: success ? undefined : recent >= FAIL_THRESHOLD ? "Account temporarily locked" : "Invalid credentials",
    ip,
    location: "Local Network",
    device,
    browser,
    risk,
    flags,
    ts: Date.now(),
  };
  setEvents([event, ...getEvents()].slice(0, 500));

  if (!success || !user) {
    return { ok: false, reason: event.reason, risk, flags, event };
  }

  const sessionId = "s_" + Math.random().toString(36).slice(2, 9);
  const session: SessionRecord = {
    id: sessionId,
    userId: user.id,
    device,
    browser,
    ip,
    location: "Local Network",
    createdAt: Date.now(),
    lastActive: Date.now(),
  };
  setSessions([session, ...getSessions()]);

  const expiresAt = Date.now() + (remember ? 7 * 86400_000 : 30 * 60_000);
  setCurrentSession({ userId: user.id, sessionId, expiresAt });
  setRemember(remember);

  return { ok: true, user, risk, flags, event };
}

export function logoutCurrent() {
  const s = getCurrentSession();
  if (s) {
    setSessions(getSessions().filter((x) => x.id !== s.sessionId));
  }
  setCurrentSession(null);
}

export function revokeSession(id: string) {
  const s = getCurrentSession();
  setSessions(getSessions().filter((x) => x.id !== id));
  if (s?.sessionId === id) setCurrentSession(null);
}

export function revokeAllOthers() {
  const s = getCurrentSession();
  if (!s) return;
  setSessions(getSessions().filter((x) => x.id === s.sessionId));
}

export function touchSession() {
  const s = getCurrentSession();
  if (!s) return;
  const remember = getRemember();
  setCurrentSession({ ...s, expiresAt: Date.now() + (remember ? 7 * 86400_000 : 30 * 60_000) });
  setSessions(getSessions().map((x) => x.id === s.sessionId ? { ...x, lastActive: Date.now() } : x));
}

export function updateUserRole(userId: string, role: Role) {
  setUsers(getUsers().map((u) => u.id === userId ? { ...u, role } : u));
}

export function deleteUser(userId: string) {
  setUsers(getUsers().filter((u) => u.id !== userId));
  setSessions(getSessions().filter((s) => s.userId !== userId));
}

export function setTwoFA(userId: string, enabled: boolean) {
  setUsers(getUsers().map((u) => u.id === userId ? { ...u, twoFAEnabled: enabled } : u));
}

export function changePassword(userId: string, currentPw: string, newPw: string) {
  const users = getUsers();
  const u = users.find((x) => x.id === userId);
  if (!u) throw new Error("User not found");
  if (!verifyPassword(currentPw, u.passwordHash)) throw new Error("Current password is incorrect");
  if (newPw.length < 8) throw new Error("New password must be at least 8 characters");
  setUsers(users.map((x) => x.id === userId ? { ...x, passwordHash: mockHash(newPw) } : x));
}
