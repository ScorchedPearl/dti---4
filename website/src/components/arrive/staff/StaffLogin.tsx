"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errMsg } from "@/lib/arrive/client";
import { BrandPanel } from "../StudentLogin";
import { Button, FormError } from "../ui";

const DEMO_PASSWORD = "arrive-2026";
const ROLES: [string, string][] = [
  ["admin@iiita.ac.in", "Admin"], ["verify@iiita.ac.in", "Verifier"], ["desk@iiita.ac.in", "Desk and gate"], ["warden@iiita.ac.in", "Warden"], ["senior@iiita.ac.in", "Senior volunteer"],
];

export default function StaffLogin({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e?: React.FormEvent, creds?: { email: string; password: string }) {
    e?.preventDefault();
    setErr(""); setBusy(true);
    try {
      await api("/api/staff/login", { json: creds ?? { email, password } });
      router.replace("/staff");
      router.refresh();
    } catch (e) { setErr(errMsg(e)); setBusy(false); }
  }

  return (
    <div className="auth">
      <BrandPanel title="Run reporting day from one screen." text="Verify uploads before students travel, check them in at the gate, call the next person at each desk, hand over inspected rooms and answer questions the FAQ cannot." />
      <main className="auth-main">
        <form className="auth-card" onSubmit={submit} noValidate>
          <div className="stack">
            <div className="logo lg">IA</div>
            <h1 className="h1">Staff console</h1>
            <p className="muted">For the registration office, desk staff, wardens and verified senior volunteers.</p>
          </div>
          <div className="stack-lg">
            <label className="field">Work email<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@iiita.ac.in" /></label>
            <label className="field">Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <FormError>{err}</FormError>
            <Button className="block" busy={busy} type="submit"><LogIn size={18} />Sign in</Button>
          </div>
          {demo && (
            <div className="card stack-sm" style={{ background: "var(--tint)" }}>
              <b className="small">Showcase accounts</b>
              <p className="tiny muted">This is a demo. Tap a role to sign in (the password is <span className="mono">{DEMO_PASSWORD}</span> if you type it).</p>
              <div className="row wrap" style={{ gap: 6 }}>{ROLES.map(([e, r]) => <button type="button" key={e} className="btn ghost xs" disabled={busy} onClick={() => { setEmail(e); setPassword(DEMO_PASSWORD); submit(undefined, { email: e, password: DEMO_PASSWORD }); }}>{r}</button>)}</div>
            </div>
          )}
          <p className="auth-foot"><Link href="/app/login">Student sign in</Link> · <Link href="/">About this project</Link></p>
        </form>
      </main>
    </div>
  );
}
