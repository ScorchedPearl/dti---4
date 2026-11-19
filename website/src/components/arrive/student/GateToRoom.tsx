"use client";

import {
  AppWindow, BadgeCheck, BedDouble, Bell, Check, ChevronRight, Droplets, Fan, KeyRound, Lightbulb, Lock, MapPin, QrCode, ScanLine, Send, Sparkles,
  Stethoscope, Users, UtensilsCrossed, WashingMachine, Wrench, X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CHECKLIST, FAQ, FIX_ITEMS, ROOM_CHECKS, desk, fixLabel } from "@/lib/arrive/catalog";
import { errMsg, relTime } from "@/lib/arrive/client";
import type { StudentState, Ticket } from "@/lib/arrive/types";
import Scanner, { canScan } from "../Scanner";
import { Button, FormError, Pill, Qr, useToast } from "../ui";
import { HelpLink, Top } from "./Shell";
import { useArrive, useStudent } from "./Provider";

/* ================================================================== reporting day */
export function Day() {
  const s = useStudent();
  if (s.checkin) return <RouteView />;
  return <GateView />;
}

function GateView() {
  const s = useStudent();
  const { run } = useArrive();
  const toast = useToast();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [scan, setScan] = useState(false);
  const [scanOk, setScanOk] = useState(false);
  useEffect(() => setScanOk(canScan()), []);
  const sl = s.slots.find((x) => x.id === s.booking?.slotId);

  async function checkIn(c = code) {
    setErr(""); setBusy(true);
    try {
      const r = await run("/api/me/checkin", { json: { code: c } });
      toast(`Checked in. Your token is #${r.checkin?.token}`);
      router.refresh();
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); setScan(false); }
  }

  if (!s.booking) {
    return (
      <><Top title="Reporting day" action={<HelpLink />} />
        <main className="main"><div className="page">
          <section className="card"><div className="empty"><div className="ic"><QrCode /></div><b className="h3">Your gate pass appears here</b>
            <p>Reporting day is {CHECKLIST.reportingDay}. Get every document accepted and book a slot, and your Ready to Report pass becomes your Gate-to-Room Pass.</p>
            <Link href="/app" className="btn accent">Go to my checklist</Link></div></section>
          <div className="banner info"><Users size={20} /><span><b>Not finished in time?</b>You can still report. Show your JoSAA number at the gate and start at Desk A, where staff check your documents by hand.</span></div>
        </div></main></>
    );
  }
  return (
    <>
      <Top title="Check in at the gate" action={<HelpLink />} />
      <main className="main">
        <div className="page">
          <div className="stack-sm center" style={{ paddingTop: 6 }}>
            <span className="eyebrow">Welcome to IIITA</span>
            <h2 className="h1">{sl ? sl.day.replace("Mon", "Monday").replace("Jul", "July") : CHECKLIST.reportingDay}</h2>
            <p className="muted">Your slot {sl?.label ?? ""} · {CHECKLIST.gate}</p>
          </div>
          <div className="gate-qr"><Qr value={`ARRIVE:${s.booking.passCode}`} label="Your gate pass QR code" /></div>
          <p className="center small muted">Show this to the gate staff to scan, <b>or</b> check yourself in with the code on the gate poster.</p>

          <section className="card stack">
            <h2 className="h3">Check in yourself</h2>
            {scan ? (
              <>
                <Scanner onCode={(t) => { setCode(t.replace(/^ARRIVE-GATE:/i, "")); checkIn(t); }} />
                <button className="btn ghost block" onClick={() => setScan(false)}><X size={16} />Stop camera</button>
              </>
            ) : (
              <form className="stack" onSubmit={(e) => { e.preventDefault(); checkIn(); }}>
                <label className="field">Gate code from the poster
                  <input className="mono" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))} placeholder="4 letters or digits" autoCapitalize="characters" autoComplete="off" />
                </label>
                <FormError>{err}</FormError>
                <Button className="accent block" busy={busy} disabled={code.trim().length < 4} type="submit"><ScanLine size={18} />Check in</Button>
                {scanOk && <button type="button" className="btn ghost block" onClick={() => setScan(true)}><QrCode size={18} />Scan the gate poster</button>}
              </form>
            )}
          </section>

          <section className="card stack">
            <div className="row"><Users size={20} color="var(--teal)" /><h2 className="h3">Family with you?</h2></div>
            <p className="muted small">Parents can wait in the shaded seating in Hall 2, with water and fans. We ping this phone when your desk is ready, so nobody has to stand in a line.</p>
          </section>
        </div>
      </main>
    </>
  );
}

function NotifyToggle() {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("unsupported");
  useEffect(() => { setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission); }, []);
  if (perm !== "default") return null;
  return (
    <button className="banner info" onClick={async () => setPerm(await Notification.requestPermission())}>
      <Bell size={20} /><span><b>Turn on desk alerts</b>Get a notification even when this tab is in the background.</span><ChevronRight className="chev" size={18} />
    </button>
  );
}

function RouteView() {
  const s = useStudent();
  const route = s.route;
  const now = route.find((r) => r.status === "waiting" || r.status === "called");
  const done = route.filter((r) => r.status === "done" || r.status === "skipped").length;
  const pct = now ? Math.max(8, 100 - now.ahead * 12) : 100;

  return (
    <>
      <Top title="My route" action={<HelpLink />} />
      <main className="main">
        <div className="page">
          <div className="between"><span className="small muted">Token <b className="token" style={{ fontSize: 16, color: "var(--ink)" }}>#{s.checkin!.token}</b> · checked in {relTime(Date.parse(s.checkin!.at))}</span><Pill status="ok" label={`${done} of ${route.length} done`} /></div>

          {!now ? (
            <div className="now-card"><span className="eyebrow">Finished</span><div className="title">Registration complete</div><p className="soft">Every step is done. Welcome to IIIT Allahabad.</p><Link href="/app/settled" className="btn light">See my summary</Link></div>
          ) : now.desk === "R" ? (
            <div className="now-card"><span className="eyebrow">Last step</span><div className="title">Your room is ready</div><p className="soft">The hostel office has handed over your key. Check the room and accept it.</p><Link href="/app/room" className="btn light"><BedDouble size={18} />Open room handover</Link></div>
          ) : now.status === "called" ? (
            <div className="now-card"><span className="live">Called {now.calledAt ? relTime(now.calledAt) : ""}</span><div className="title">Go to Desk {now.desk} now</div><p className="soft">{desk(now.desk).name} · {desk(now.desk).where}. Staff are expecting you and will finish this step.</p></div>
          ) : (
            <div className="now-card" aria-live="polite">
              <div className="between"><span className="eyebrow">Next: Desk {now.desk} · {desk(now.desk).name}</span><span className="live">Live</span></div>
              <div className="row" style={{ alignItems: "flex-end", gap: 14 }}>
                <div className="bignum">{now.ahead}</div>
                <div style={{ paddingBottom: 6 }}><b style={{ fontSize: 16 }}>{now.ahead === 1 ? "person" : "people"} ahead</b><div className="soft">about {now.etaMin} min</div></div>
              </div>
              <div className="meter" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Queue progress"><i style={{ width: `${pct}%` }} /></div>
              <p className="soft"><MapPin size={14} style={{ display: "inline", verticalAlign: -2 }} /> {desk(now.desk).where}. Wait anywhere. We will ping you.</p>
            </div>
          )}

          <NotifyToggle />

          <section className="card">
            <div className="stepper">
              {route.map((r) => {
                const k = desk(r.desk);
                const fin = r.status === "done" || r.status === "skipped";
                const cur = r === now;
                return (
                  <div key={r.desk} className={`step ${fin ? "fin" : cur ? "now" : ""}`}>
                    <span className="n" aria-hidden>{fin ? <Check size={18} /> : r.desk}</span>
                    <div><div className="t">{r.desk === "R" ? (s.room?.label ?? "Your room") : `${k.key} · ${k.name}`}</div><div className="w">{r.desk === "R" ? (s.room?.wing ?? "Hostel") : k.where}{r.status === "skipped" ? " · Green lane, verified through ReadyPass" : ""}</div></div>
                    <span className="small" style={{ paddingTop: 6 }}>{r.status === "skipped" ? <span className="okc">Skipped</span> : r.status === "done" ? <span className="okc">Done</span> : cur ? <b>Now</b> : <span className="faint">Later</span>}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

/* ================================================================== room */
function TicketCard({ t }: { t: Ticket }) {
  const order = ["reported", "assigned", "fixed"];
  const at = order.indexOf(t.status);
  return (
    <section className="card stack">
      <div className="between"><b className="h3">#{t.code} · {fixLabel(t.item)}</b><Pill status={t.status === "fixed" ? "ok" : "review"} label={t.status === "fixed" ? "Fixed" : t.status === "assigned" ? "Assigned" : "Reported"} /></div>
      {t.note && <p className="small muted">&ldquo;{t.note}&rdquo;</p>}
      <div className="timeline">
        <div className={`tl ${at >= 0 ? "on" : ""}`}><span className="d" /><span>Reported</span><span className="small faint">{relTime(Date.parse(t.createdAt))}</span></div>
        <div className={`tl ${at >= 1 ? "on" : ""}`}><span className="d" /><span>Assigned to maintenance</span><span className="small faint">#{t.code}</span></div>
        <div className={`tl ${at >= 2 ? "on" : ""}`}><span className="d" /><span>Fixed</span><span className="small faint">{at >= 2 ? "done" : t.eta ? `by ${t.eta.replace("Today, ", "")}` : ""}</span></div>
      </div>
    </section>
  );
}

const ESSENTIALS: [React.ReactNode, string, string][] = [
  [<Droplets key="w" size={18} />, "Water cooler", "End of the corridor"],
  [<UtensilsCrossed key="m" size={18} />, "Mess", "Dinner 7:30 to 9:30 pm"],
  [<Stethoscope key="d" size={18} />, "Medical room", "BH-1 ground floor"],
  [<WashingMachine key="l" size={18} />, "Laundry", "Drop by 8 am, back next day"],
];

export function Room() {
  const s = useStudent();
  const { run } = useArrive();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const room = s.room;
  const step = s.route.find((r) => r.desk === "R");
  if (!room) {
    return (<><Top title="My room" action={<HelpLink />} /><main className="main"><div className="page"><section className="card"><div className="empty"><div className="ic"><BedDouble /></div><b className="h3">No room allocated yet</b><p>The hostel office allocates rooms by 24 Jul. You will see it here with the inspection card.</p></div></section></div></main></>);
  }
  const ready = !!step && (step.status === "waiting" || step.status === "called" || step.status === "done");
  const why = room.acceptedAt ? "" : !s.checkin ? "Handover opens on reporting day, after you check in." : !ready ? "Finish the hostel office step first. They hand over your key." : !room.passed ? "This room has not passed inspection yet. The caretaker has been told." : "";

  async function accept() {
    setBusy(true);
    try { await run("/api/me/room/accept"); toast("Room accepted. Welcome home."); router.push("/app/settled"); }
    catch (e) { toast(errMsg(e), "error"); setBusy(false); }
  }

  return (
    <>
      <Top title={room.label} action={<HelpLink />} />
      <main className="main">
        <div className="page">
          {room.acceptedAt && <div className="banner good"><BadgeCheck size={20} /><span><b>You accepted this room</b>{room.acceptedAt}. Report anything that breaks, any time.</span></div>}
          <section className="card stack">
            <div className="between"><h2 className="h3">Inspection card</h2>{room.checks ? <Pill status={room.passed ? "ok" : "action"} label={room.passed ? "Passed" : "Not passed"} /> : <Pill status="todo" label="Not inspected" />}</div>
            <p className="small muted">{room.inspectedBy ? `Checked by caretaker ${room.inspectedBy} at ${room.inspectedAt?.split(", ")[1] ?? room.inspectedAt}. Photo taken after cleaning.` : "The caretaker inspects every room before handover."}</p>
            {room.checks && (
              <div className="checks">
                {ROOM_CHECKS.map((c, i) => (
                  <div className="check" key={c}><span className={`ic${room.checks![i] ? "" : " no"}`}>{room.checks![i] ? <Check size={14} /> : <X size={14} />}</span><span>{c}</span><span className={`small ${room.checks![i] ? "okc" : "badc"}`}>{room.checks![i] ? "OK" : "Fix needed"}</span></div>
                ))}
              </div>
            )}
          </section>

          <section className="card stack">
            <div className="row"><Users size={20} color="var(--teal)" /><h2 className="h3">Room-mate</h2></div>
            {room.mate ? (
              <div className="row"><div className="avatar">{room.mate.name.split(" ").map((p) => p[0]).join("")}</div><div className="grow"><b>{room.mate.name}</b><p className="small muted">{room.mate.branch}{room.mate.phone ? ` · ${room.mate.phone}` : ""}</p></div></div>
            ) : <p className="small muted">Single occupancy.</p>}
            {room.mate && !room.mate.phone && <p className="small muted">Contact details appear once you both accept the room.</p>}
          </section>

          {s.tickets.map((t) => <TicketCard key={t.id} t={t} />)}

          {!room.acceptedAt && (
            <div className="stack-sm">
              <Button className="accent block" busy={busy} disabled={!!why} onClick={accept}><KeyRound size={18} />Accept my room</Button>
              {why && <p className="small muted center">{why}</p>}
            </div>
          )}
          <Link href="/app/room/report" className={`btn ${room.acceptedAt ? "" : "ghost"} block`} aria-disabled={!s.checkin} onClick={(e) => { if (!s.checkin) { e.preventDefault(); toast("You can report problems once you have checked in.", "error"); } }}>
            <Wrench size={18} />Something is wrong? Report it
          </Link>

          <section className="card stack">
            <h2 className="h3">Day-one essentials</h2>
            <div className="facts">
              {ESSENTIALS.map(([i, t, d]) => <div className="fact" key={t}><span className="eyebrow" style={{ color: "var(--teal)" }}>{i}{t}</span><b className="small">{d}</b></div>)}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

const FIX_ICON: Record<string, React.ReactNode> = {
  lock: <Lock size={26} />, fan: <Fan size={26} />, light: <Lightbulb size={26} />, tap: <Droplets size={26} />, window: <AppWindow size={26} />, clean: <Sparkles size={26} />,
};

export function Report() {
  const s = useStudent();
  const { run } = useArrive();
  const toast = useToast();
  const router = useRouter();
  const [item, setItem] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function send() {
    if (!item) return;
    setBusy(true); setErr("");
    try {
      const r = await run<StudentState & { code: string }>("/api/me/room/report", { json: { item, note } });
      toast(`Reported. Ticket #${r.code}`);
      router.push("/app/room");
    } catch (e) { setErr(errMsg(e)); setBusy(false); }
  }
  return (
    <>
      <Top title="Report a problem" back="/app/room" />
      <main className="main">
        <div className="page">
          <p className="muted">Pick what is wrong. Maintenance gets it straight away and you can track it on your room page.</p>
          <div className="fixgrid" role="group" aria-label="What is wrong">
            {FIX_ITEMS.map((f) => <button key={f.id} aria-pressed={item === f.id} onClick={() => setItem(f.id)}>{FIX_ICON[f.id]}{f.label}</button>)}
          </div>
          <label className="field">Anything to add? (optional)
            <textarea rows={3} maxLength={400} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. the lock does not close fully" />
          </label>
          <FormError>{err}</FormError>
          <Button className="block" busy={busy} disabled={!item} onClick={send}><Send size={18} />Send report</Button>
          <p className="small muted center">{item ? `${s.room?.label ?? "Your room"} is added automatically.` : "Choose an item above to continue."}</p>
        </div>
      </main>
    </>
  );
}

export function Settled() {
  const s = useStudent();
  const open = s.tickets.filter((t) => t.status !== "fixed");
  const accepted = !!s.room?.acceptedAt;
  return (
    <>
      <Top title="Settled" back="/app/room" />
      <main className="main">
        <div className="page">
          <div className="settled">
            <div className="tick"><Check size={48} strokeWidth={3} /></div>
            <h2 className="h1">{accepted ? "You are settled in" : "Almost there"}</h2>
            <p className="muted" style={{ maxWidth: 420 }}>{accepted ? `Registration is complete and ${s.room?.label ?? "your room"} is yours.` : "Accept your room to finish registration."}{open.length ? ` Your ${fixLabel(open[0].item).toLowerCase()} repair is tracked until it is fixed.` : ""}</p>
          </div>
          <section className="card stack">
            <h2 className="h3">For your family</h2>
            <p className="small muted">{s.booking?.sharedLang ? "The status link you shared now shows: room accepted, repairs tracked, mess and medical room locations." : "Share your pass with a parent and they get a live status link: checked in, room accepted, repairs tracked."}</p>
            {!s.booking?.sharedLang && <Link href="/app/pass" className="btn ghost sm" style={{ alignSelf: "flex-start" }}>Share my status</Link>}
          </section>
          <section className="card stack">
            <h2 className="h3">Your first week</h2>
            <p className="small muted">Orientation starts Tuesday 28 Jul, 9:30 am in the main auditorium. Your timetable appears on the ERP once the academic section finishes enrolment.</p>
          </section>
          <Link href="/app/room" className="btn ghost block">Back to my room</Link>
        </div>
      </main>
    </>
  );
}

/* ================================================================== help */
const SUGGEST = [...FAQ.slice(0, 3).map((f) => f.q), "Can I leave my luggage somewhere?"];

export function Help() {
  const s = useStudent();
  const { run } = useArrive();
  const toast = useToast();
  const [text, setText] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [s.chat.length, sending]);

  // Escalated when the plain "IIITA Help" fallback has no volunteer reply after it.
  const waiting = s.chat.some((m) => m.author === "bot" && m.name === "IIITA Help" && !s.chat.some((x) => x.author === "volunteer" && x.id > m.id));

  async function ask(q: string) {
    const t = q.trim();
    if (!t || sending) return;
    setSending(t); setText("");
    await new Promise((r) => setTimeout(r, 700));
    try { await run("/api/me/help", { json: { text: t } }); } catch (e) { toast(errMsg(e), "error"); setText(t); } finally { setSending(null); }
  }

  return (
    <>
      <Top title="Help" action={<Link href={s.checkin ? "/app/day" : "/app"} className="iconbtn" aria-label="Close help"><X size={20} /></Link>} />
      <main className="main">
        <div className="page">
          <p className="small muted">Answers come from the official FAQ. If it cannot answer, a verified senior volunteer replies within 10 minutes.</p>
          <div className="chat" aria-live="polite">
            <div className="msg bot"><small>IIITA Help</small>Hi {s.me.first}. Ask anything about reporting, documents, fees or the hostel.</div>
            {s.chat.map((m) => (
              <div key={m.id} className={`msg ${m.author}`}>
                {m.author !== "student" && <small>{m.author === "volunteer" && <BadgeCheck size={13} />}{m.name}</small>}
                {m.body}
              </div>
            ))}
            {sending && <><div className="msg student">{sending}</div><div className="msg bot typing" aria-label="Typing"><i /><i /><i /></div></>}
            {!sending && waiting && <p className="tiny faint center">A senior volunteer will reply here. You can leave this screen.</p>}
            <div ref={end} />
          </div>
          <div className="qchips" aria-label="Suggested questions">{SUGGEST.map((q) => <button key={q} onClick={() => ask(q)} disabled={!!sending}>{q}</button>)}</div>
          <form className="composer" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a question" aria-label="Your question" maxLength={500} autoComplete="off" />
            <button className="btn accent" type="submit" disabled={!text.trim() || !!sending} aria-label="Send"><Send size={18} /></button>
          </form>
        </div>
      </main>
    </>
  );
}
