import { BedDouble, CheckCircle2, Circle, Clock3, MapPin, ShieldCheck, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AutoRefresh from "@/components/arrive/AutoRefresh";
import { parentStatus } from "@/server/arrive";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Registration status", robots: { index: false, follow: false } };

const T = {
  en: {
    title: (n: string) => `${n}'s registration`, ready: "All documents accepted", notReady: "Documents still being checked", slot: "Reporting slot",
    waiting: "Not at the gate yet", checkedIn: (t: number) => `Checked in at the gate · token #${t}`, now: "Now at", steps: (d: number, n: number) => `${d} of ${n} steps done`,
    room: "Room", accepted: "Room accepted. Settled in.", notAccepted: "Room not accepted yet", tickets: (n: number) => `${n} repair${n > 1 ? "s" : ""} being fixed`,
    family: "Families wait in the shaded seating in Hall 2, with water and fans. Parents cannot stay overnight on campus; the guest house in Jhalwa has rooms.",
    live: "Updates by itself. No sign-in needed.", lang: "हिन्दी में देखें",
  },
  hi: {
    title: (n: string) => `${n} का रजिस्ट्रेशन`, ready: "सभी दस्तावेज़ स्वीकृत", notReady: "दस्तावेज़ों की जाँच चल रही है", slot: "रिपोर्टिंग समय",
    waiting: "अभी गेट पर नहीं पहुँचे", checkedIn: (t: number) => `गेट पर चेक-इन हो गया · टोकन #${t}`, now: "अभी यहाँ", steps: (d: number, n: number) => `${n} में से ${d} चरण पूरे`,
    room: "कमरा", accepted: "कमरा स्वीकार कर लिया। सब तय हो गया।", notAccepted: "कमरा अभी स्वीकार नहीं हुआ", tickets: (n: number) => `${n} मरम्मत चल रही है`,
    family: "परिवार हॉल 2 में छायादार जगह पर पानी और पंखों के साथ प्रतीक्षा कर सकते हैं। माता-पिता कैंपस में रात नहीं रुक सकते; झलवा के गेस्ट हाउस में कमरे मिलते हैं।",
    live: "यह पेज अपने आप अपडेट होता है। लॉग-इन की ज़रूरत नहीं।", lang: "View in English",
  },
};

export default async function ParentPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { token } = await params;
  const lang = (await searchParams).lang === "hi" ? "hi" : "en";
  const p = parentStatus(token);
  if (!p) notFound();
  const t = T[lang];
  const pct = Math.round((100 * p.stepsDone) / p.stepsTotal);
  return (
    <main className="parent" lang={lang}>
      <AutoRefresh />
      <div className="between">
        <div className="row"><div className="logo">IA</div><b style={{ fontFamily: "var(--f-h)" }}>IIIT Allahabad</b></div>
        <Link href={`?lang=${lang === "hi" ? "en" : "hi"}`} className="btn ghost sm" lang={lang === "hi" ? "en" : "hi"}>{t.lang}</Link>
      </div>
      <section className="card lift stack-lg">
        <div className="stack-sm"><span className="eyebrow">{p.branch}</span><h1 className="h1">{t.title(p.name)}</h1></div>
        <div className={`banner ${p.ready ? "good" : "warn"}`}>{p.ready ? <ShieldCheck size={20} /> : <Clock3 size={20} />}<span><b>{p.ready ? t.ready : t.notReady}</b>{t.slot}: {p.slot}</span></div>
        <div className="stack-sm">
          <div className="row">{p.checkedIn ? <CheckCircle2 size={20} color="var(--ok)" /> : <Circle size={20} color="var(--faint)" />}<b>{p.checkedIn && p.token ? t.checkedIn(p.token) : t.waiting}</b></div>
          {p.checkedIn && <>
            <div className="progress"><i style={{ width: `${pct}%` }} /></div>
            <p className="small muted">{t.steps(p.stepsDone, p.stepsTotal)}{p.current ? ` · ${t.now}: ${p.current}` : ""}</p>
          </>}
        </div>
        {p.room && (
          <div className="row" style={{ alignItems: "flex-start" }}><BedDouble size={20} color={p.roomAccepted ? "var(--ok)" : "var(--faint)"} /><div><b>{t.room}: {p.room}</b><p className="small muted">{p.roomAccepted ? t.accepted : t.notAccepted}</p></div></div>
        )}
        {p.openTickets > 0 && <div className="row"><Wrench size={20} color="var(--rev)" /><span className="small">{t.tickets(p.openTickets)}</span></div>}
      </section>
      <section className="card row" style={{ alignItems: "flex-start" }}><MapPin size={20} color="var(--teal)" style={{ flex: "none" }} /><p className="small muted">{t.family}</p></section>
      <p className="tiny faint center">{t.live}</p>
    </main>
  );
}
