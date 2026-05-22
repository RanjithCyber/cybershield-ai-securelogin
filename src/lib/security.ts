// Password intelligence: entropy, strength, breach-like checks.

const COMMON = new Set([
  "password", "password1", "123456", "12345678", "qwerty", "letmein",
  "admin", "admin123", "welcome", "iloveyou", "monkey", "dragon",
  "abc123", "111111", "passw0rd", "sunshine", "princess", "qwerty123",
]);

export interface PasswordReport {
  score: 0 | 1 | 2 | 3 | 4; // 0 = weakest
  entropy: number;
  label: "Critical" | "Weak" | "Fair" | "Strong" | "Excellent";
  feedback: string[];
  breached: boolean;
}

export function analyzePassword(pw: string): PasswordReport {
  const feedback: string[] = [];
  if (!pw) {
    return { score: 0, entropy: 0, label: "Critical", feedback: ["Enter a password"], breached: false };
  }
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/\d/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 32;
  const entropy = pw.length * Math.log2(Math.max(2, pool));

  if (pw.length < 8) feedback.push("Use at least 8 characters");
  if (!/[A-Z]/.test(pw)) feedback.push("Add an uppercase letter");
  if (!/[a-z]/.test(pw)) feedback.push("Add a lowercase letter");
  if (!/\d/.test(pw)) feedback.push("Add a digit");
  if (!/[^a-zA-Z0-9]/.test(pw)) feedback.push("Add a symbol (!@#$…)");
  if (/(.)\1\1/.test(pw)) feedback.push("Avoid repeated characters");
  if (/(0123|1234|2345|3456|4567|5678|6789|abcd|qwer)/i.test(pw)) feedback.push("Avoid sequential patterns");

  const breached = COMMON.has(pw.toLowerCase());
  if (breached) feedback.unshift("This password appears in known breach lists");

  let score: 0 | 1 | 2 | 3 | 4 = 0;
  if (breached) score = 0;
  else if (entropy < 28) score = 1;
  else if (entropy < 45) score = 2;
  else if (entropy < 65) score = 3;
  else score = 4;
  if (pw.length < 8) score = Math.min(score, 1) as typeof score;

  const label = (["Critical", "Weak", "Fair", "Strong", "Excellent"] as const)[score];
  if (score >= 4 && feedback.length === 0) feedback.push("Excellent — keep this password unique to one service");
  return { score, entropy, label, feedback, breached };
}

// AI Security Assistant — rules-based "AI" that generates contextual insights.
import type { LoginEvent, SessionRecord, User } from "./auth";

export interface Insight {
  id: string;
  severity: "info" | "warn" | "critical";
  title: string;
  body: string;
  action?: string;
}

export function generateInsights(user: User, events: LoginEvent[], sessions: SessionRecord[]): Insight[] {
  const insights: Insight[] = [];
  const mine = events.filter((e) => e.username === user.username);
  const recent = mine.slice(0, 30);
  const failed = recent.filter((e) => !e.success).length;
  const highRisk = recent.filter((e) => e.risk >= 70);

  if (failed >= 3) {
    insights.push({
      id: "i_brute",
      severity: failed >= 5 ? "critical" : "warn",
      title: failed >= 5 ? "Possible brute-force attempt detected" : "Multiple failed sign-ins",
      body: `There have been ${failed} failed sign-in attempts on your account recently. If this wasn't you, rotate your password and enable 2FA immediately.`,
      action: "Rotate password",
    });
  }

  if (!user.twoFAEnabled) {
    insights.push({
      id: "i_2fa",
      severity: "warn",
      title: "Two-factor authentication is off",
      body: "Accounts with 2FA are ~99% less likely to be compromised. Turn on TOTP (Google Authenticator compatible) to harden your account.",
      action: "Enable 2FA",
    });
  }

  if (highRisk.length > 0) {
    const ev = highRisk[0];
    insights.push({
      id: "i_geo",
      severity: "critical",
      title: "Anomalous sign-in pattern observed",
      body: `An attempt from ${ev.location} (${ev.ip}) on ${ev.device} scored ${ev.risk}/100. Flags: ${ev.flags.join(", ") || "none"}. Confirm this was you.`,
      action: "Review session",
    });
  }

  const mySessions = sessions.filter((s) => s.userId === user.id);
  if (mySessions.length >= 3) {
    insights.push({
      id: "i_sessions",
      severity: "info",
      title: `${mySessions.length} active sessions across devices`,
      body: "If you don't recognize all of them, revoke unfamiliar sessions and sign out everywhere.",
      action: "Manage sessions",
    });
  }

  insights.push({
    id: "i_tip",
    severity: "info",
    title: "Daily security tip",
    body: "Never reuse a password across services. A password manager + 2FA neutralizes most credential-stuffing attacks.",
  });

  return insights;
}

export function explainEvent(e: LoginEvent): string {
  const parts: string[] = [];
  parts.push(e.success ? `Successful sign-in for ${e.username}.` : `Failed sign-in attempt for ${e.username}.`);
  parts.push(`Risk score: ${e.risk}/100.`);
  if (e.flags.length) parts.push(`Flags: ${e.flags.join(", ")}.`);
  if (e.risk >= 70) parts.push("Recommend forcing password rotation and reviewing recent sessions.");
  else if (e.risk >= 40) parts.push("Monitor this account; consider step-up auth on next sign-in.");
  else parts.push("No immediate action required.");
  return parts.join(" ");
}
