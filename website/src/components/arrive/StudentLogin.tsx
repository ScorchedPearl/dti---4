"use client";

import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, errMsg } from "@/lib/arrive/client";
import { Button, FormError } from "./ui";

const LIGHTS: [string, string, string][] = [
  ["var(--ok)", "JEE Main scorecard", "Accepted"],
  ["#f0b429", "Category certificate", "In review"],
  ["#ef6b5b", "Passport-size photo", "Action needed"],
  ["#8796a8", "Class 12 marksheet", "To upload"],
];

const DEMO_STUDENTS = [
  { name: "Ananya Verma", note: "photo rejected · start here", j: "260310442817", d: "14/03/2008" },
  { name: "Kabir Singh", note: "fee pending", j: "260310551203", d: "02/11/2007" },
  { name: "Meera Nair", note: "documents in review", j: "260310778921", d: "09/09/2007" },
  { name: "Rohan Iyer", note: "pass issued", j: "260310667734", d: "21/01/2008" },
];

export function BrandPanel({ title, text }: { title: string; text: string }) {
  return (
    <aside className="auth-brand">
      <div className="row" style={{ position: "relative", zIndex: 1 }}>
        <div className="logo">IA</div>
        <b style={{ fontFamily: "var(--f-h)", fontSize: 18 }}>IIITA Arrive</b>
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <div className="lights" aria-hidden>
        {LIGHTS.map(([c, n, s]) => (
          <div className="lt" key={n}><span className="light" style={{ background: c, boxShadow: `0 0 12px ${c}` }} /><span>{n}</span><span style={{ color: c }}>{s}</span></div>
        ))}
      </div>
    </aside>
  );
}

export default function StudentLogin({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "code">("details");
  const [josaa, setJosaa] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [wait, setWait] = useState(0);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(t); }, [wait]);

  async function sendCode(e?: React.FormEvent, creds?: { j: string; d: string }) {
    e?.preventDefault();
    setErr("");
    const j = (creds?.j ?? josaa).replace(/\s/g, "");
    const d = creds?.d ?? dob;
    if (!/^\d{12}$/.test(j)) return setErr("The JoSAA application number has 12 digits.");
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d.trim())) return setErr("Enter your date of birth as DD/MM/YYYY.");
    setBusy(true);
    try {
      const r = await api<{ phone: string; devCode?: string }>("/api/auth/otp", { json: { josaa: j, dob: d } });
      // Showcase mode: the server hands back the demo code, so sign in straight away with no code screen.
      if (demo && r.devCode) { await verify(r.devCode, j); return; }
      setPhone(r.phone); setDevCode(r.devCode); setStep("code"); setWait(30); setDigits(["", "", "", "", "", ""]);
      setTimeout(() => boxes.current[0]?.focus(), 50);
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  }

  async function verify(code = digits.join(""), j = josaa.replace(/\s/g, "")) {
    if (code.length !== 6) return setErr("Enter all 6 digits.");
    setErr(""); setBusy(true);
    try {
      await api("/api/auth/verify", { json: { josaa: j, code } });
      router.replace("/app");
      router.refresh();
    } catch (e) { setErr(errMsg(e)); setBusy(false); setDigits(["", "", "", "", "", ""]); boxes.current[0]?.focus(); }
  }

  function setDigit(i: number, v: string) {
    const clean = v.replace(/\D/g, "");
    if (clean.length > 1) {
      const all = clean.slice(0, 6).split("");
      const next = [...digits];
      all.forEach((c, k) => { if (i + k < 6) next[i + k] = c; });
      setDigits(next);
      boxes.current[Math.min(5, i + all.length)]?.focus();
      if (next.every(Boolean)) verify(next.join(""));
      return;
    }
    const next = [...digits]; next[i] = clean; setDigits(next);
    if (clean && i < 5) boxes.current[i + 1]?.focus();
    if (next.every(Boolean)) verify(next.join(""));
  }

  const fmtDob = (v: string) => {
    const d = v.replace(/[^\d]/g, "").slice(0, 8);
    return d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  return (
    <div className="auth">
      <BrandPanel title="Know you are ready before you leave home." text="Upload every registration document, watch each one turn green, book your reporting slot and walk in with a pass. On reporting day, the same pass guides you from the gate to your room." />
      <main className="auth-main">
        <div className="auth-card">
          <div className="stack">
            <div className="logo lg">RP</div>
            <h1 className="h1">{step === "details" ? "Sign in to ReadyPass" : "Enter your code"}</h1>
            <p className="muted">{step === "details" ? "IIIT Allahabad · B.Tech 2026 reporting. Use the details from your JoSAA application." : `We sent a 6-digit code to the phone number on your JoSAA form, ${phone}.`}</p>
          </div>

          {step === "details" ? (
            <form className="stack-lg" onSubmit={sendCode} noValidate>
              <label className="field">JoSAA application number
                <input inputMode="numeric" autoComplete="username" placeholder="12 digits" value={josaa} maxLength={14} onChange={(e) => setJosaa(e.target.value.replace(/[^\d ]/g, ""))} />
              </label>
              <label className="field">Date of birth
                <input inputMode="numeric" autoComplete="bday" placeholder="DD/MM/YYYY" value={dob} onChange={(e) => setDob(fmtDob(e.target.value))} />
              </label>
              <FormError>{err}</FormError>
              <Button className="block" busy={busy} type="submit"><KeyRound size={18} />{demo ? "Sign in" : "Send code and sign in"}</Button>
              {demo && (
                <div className="card stack-sm" style={{ background: "var(--tint)" }}>
                  <b className="small">Showcase students</b>
                  <p className="tiny muted">This is a demo, so there is no real code. Tap a student to sign in.</p>
                  <div className="stack-sm">
                    {DEMO_STUDENTS.map((s) => (
                      <button key={s.j} type="button" className="btn ghost sm" style={{ justifyContent: "space-between" }} disabled={busy}
                        onClick={() => { setJosaa(s.j); setDob(s.d); sendCode(undefined, { j: s.j, d: s.d }); }}>
                        <span>{s.name}</span><span className="tiny muted" style={{ fontWeight: 500 }}>{s.note}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          ) : (
            <form className="stack-lg" onSubmit={(e) => { e.preventDefault(); verify(); }} noValidate>
              <div className="otp" role="group" aria-label="6-digit code">
                {digits.map((d, i) => (
                  <input key={i} ref={(el) => { boxes.current[i] = el; }} className="input" inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} aria-label={`Digit ${i + 1}`} value={d}
                    onChange={(e) => setDigit(i, e.target.value)} onKeyDown={(e) => { if (e.key === "Backspace" && !d && i > 0) boxes.current[i - 1]?.focus(); }} maxLength={6} />
                ))}
              </div>
              {devCode && <div className="dev-note"><ShieldCheck size={18} /><span>No SMS provider is set up on this server, so here is your code: <b>{devCode}</b></span></div>}
              <FormError>{err}</FormError>
              <Button className="block" busy={busy} type="submit">Verify and continue</Button>
              <div className="between small">
                <button type="button" className="linkbtn" onClick={() => { setStep("details"); setErr(""); }}><ArrowLeft size={16} />Change details</button>
                <button type="button" className="linkbtn" disabled={wait > 0 || busy} onClick={() => sendCode()} style={wait > 0 ? { color: "var(--faint)" } : undefined}>{wait > 0 ? `Resend in ${wait}s` : "Resend code"}</button>
              </div>
            </form>
          )}
          <p className="auth-foot">Trouble signing in? Your details must match your JoSAA application exactly.<br /><Link href="/staff/login">Staff sign in</Link> · <Link href="/">About this project</Link></p>
        </div>
      </main>
    </div>
  );
}
