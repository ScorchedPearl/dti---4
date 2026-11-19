"use client";

import {
  AlertTriangle, BadgeCheck, Camera, CheckCircle2, ChevronRight, Clock3, Copy, CreditCard, FileCheck2, FileClock, FileText, FileUp, Hourglass,
  Image as ImageIcon, Info, Lock, MessageCircle, Navigation, Send, Share2, ShieldCheck, XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CHANGES, CHECKLIST, DOC_TYPES, PROOF, docType, inr, type DocStatus, type DocType } from "@/lib/arrive/catalog";
import { ApiError, errMsg } from "@/lib/arrive/client";
import { MAX_BYTES, checkImage, compress, isImage, isPdf, kb, type Quality } from "@/lib/arrive/image";
import type { StudentDoc, StudentState } from "@/lib/arrive/types";
import { Button, Pill, Qr, Ring, Sheet, useToast } from "../ui";
import { HelpLink, Top } from "./Shell";
import { useArrive, useStudent } from "./Provider";

const ORDER: Record<DocStatus, number> = { action: 0, todo: 1, review: 2, ok: 3 };
const ICON: Record<DocStatus, React.ReactNode> = {
  ok: <FileCheck2 size={20} />, review: <Hourglass size={19} />, action: <XCircle size={20} />, todo: <FileUp size={19} />,
};

export const pending = (s: StudentState) => s.docs.filter((d) => d.status !== "ok");
const needYou = (s: StudentState) => s.docs.filter((d) => d.status === "action" || d.status === "todo");

function meta(d: StudentDoc, t: DocType) {
  if (d.status === "action") return d.reason?.split(". ")[0].replace(/\.$/, "") + ".";
  if (d.status === "ok") return d.source ?? "Accepted";
  if (d.status === "review") return "Verification team reviews within 48 hours";
  return t.digi ? "Available in DigiLocker, no scan needed" : `${PROOF[t.proof].label}${t.changed ? ` · changed ${t.changed}` : ""}`;
}

/* ================================================================== checklist */
export function Checklist() {
  const s = useStudent();
  const ok = s.docs.filter((d) => d.status === "ok").length;
  const need = needYou(s);
  const all = ok === s.docs.length;
  const docs = [...s.docs].sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const headline = all ? "Everything is accepted" : need.length ? `${need.length} item${need.length > 1 ? "s" : ""} need${need.length > 1 ? "" : "s"} you` : "Waiting on review";
  return (
    <>
      <Top title="My checklist" action={<HelpLink />} />
      <main className="main">
        <div className="page">
          <section className="card lift stack-lg" aria-label="Progress">
            <div className="hero">
              <Ring n={ok} total={s.docs.length} />
              <div className="stack-sm">
                <span className="eyebrow">Hi {s.me.first}</span>
                <div className="big">{headline}</div>
                <p className="muted small">{all ? (s.booking ? "Your Ready to Report pass is issued." : "Book a reporting slot to get your pass.") : "Your pass unlocks when every line is green."}</p>
              </div>
            </div>
            <div className="facts">
              <div className="fact"><span className="eyebrow"><Lock size={12} />Checklist</span><b>{CHECKLIST.version} · frozen {CHECKLIST.frozenOn}</b></div>
              <div className="fact"><span className="eyebrow"><CreditCard size={12} />Fee</span>
                <b className={s.fee.status === "paid" ? "okc" : "revc"}>{s.fee.status === "paid" ? `Paid · ${(s.fee.note ?? "confirmed").replace(/^Confirmed/, "confirmed")}` : "Pending confirmation"}</b></div>
            </div>
          </section>

          {s.booking ? (
            <Link href="/app/pass" className="banner good" style={{ textDecoration: "none" }}><BadgeCheck size={20} /><span><b>Your pass is ready</b>Show it at the main gate on {CHECKLIST.reportingDay}.</span><ChevronRight className="chev" size={18} style={{ marginLeft: "auto", alignSelf: "center" }} /></Link>
          ) : null}
          <Link href="/app/changes" className="banner warn" style={{ textDecoration: "none" }}><AlertTriangle size={20} /><span><b>1 rule changed on 2 Jul</b>Anti-ragging undertaking now needs a notary. See what changed.</span><ChevronRight size={18} style={{ marginLeft: "auto", alignSelf: "center", opacity: .6 }} /></Link>

          <div className="section-label"><h2 className="h3">Documents</h2><span className="small muted">{ok} of {s.docs.length} accepted</span></div>
          <div className="card flush doclist">
            {docs.map((d) => {
              const t = docType(d.id)!;
              return (
                <Link key={d.id} href={`/app/documents/${d.id}`} className={`docrow ${d.status}`}>
                  <span className="dicon" aria-hidden>{ICON[d.status]}</span>
                  <span className="nm">{t.name}</span>
                  <Pill status={d.status} />
                  <span className="meta">{meta(d, t)}</span>
                </Link>
              );
            })}
          </div>
          <Link href={s.booking ? "/app/pass" : "/app/review"} className={`btn block ${all ? "accent" : ""}`}>{s.booking ? "Open my pass" : "Review and get my pass"}<ChevronRight size={18} /></Link>
        </div>
      </main>
    </>
  );
}

/* ================================================================== document detail */
function Sample({ t }: { t: DocType }) {
  const notary = t.proof === "notary";
  const c = notary ? "#bf3528" : "#1f6f78";
  const [a, b, d] = t.callouts;
  const split = (s: string) => { const w = s.split(" "); const h = Math.ceil(w.length / 2); return [w.slice(0, h).join(" "), w.slice(h).join(" ")]; };
  const [a1, a2] = split(a), [b1, b2] = split(b), [d1, d2] = split(d);
  return (
    <svg className="sample" viewBox="0 0 340 220" role="img" aria-label={`Annotated sample of a correct ${t.name}: ${t.callouts.join(", ")}`}>
      <rect x="18" y="14" width="190" height="192" rx="6" fill="#fff" stroke="#d9d2c0" />
      {t.photo ? (
        <g><rect x="63" y="34" width="100" height="124" rx="4" fill="#eef1f4" /><circle cx="113" cy="82" r="24" fill="#c9d2dc" /><path d="M73 158 q40 -58 80 0" fill="#c9d2dc" /></g>
      ) : (
        <g>
          <text x="113" y="34" textAnchor="middle" fontSize="10" fontWeight="700" fill="#333">{t.short.toUpperCase()}</text>
          {[52, 64, 76, 88, 100, 112, 124, 136].map((y, i) => <rect key={y} x="32" y={y} width={i % 3 ? 150 : 118} height="5" rx="2" fill="#e8e2d4" />)}
          <rect x="32" y="52" width="72" height="5" rx="2" fill="#7da7d9" />
        </g>
      )}
      <circle cx={notary ? 66 : 170} cy="176" r="17" fill="none" stroke={c} strokeWidth="2.5" strokeDasharray={notary ? "0" : "3 3"} />
      <path d="M132 184 q12 -14 22 -2 t24 -4" fill="none" stroke="#17375e" strokeWidth="2" />
      <rect x="130" y="192" width="54" height="5" rx="2" fill="#e8e2d4" />
      <g fontSize="10.5" fontWeight="700" fontFamily="Inter, sans-serif">
        <line x1={t.photo ? 160 : 104} y1={t.photo ? 70 : 54} x2="220" y2="44" stroke="#7da7d9" /><text x="224" y="44" fill="#2a5a92">{a1}</text><text x="224" y="57" fill="#2a5a92">{a2}</text>
        <line x1={notary ? 83 : 186} y1="170" x2="220" y2="118" stroke={c} /><text x="224" y="118" fill={c}>{b1}</text><text x="224" y="131" fill={c}>{b2}</text>
        <line x1="184" y1="194" x2="220" y2="190" stroke="#8a6d1a" /><text x="224" y="188" fill="#8a6d1a">{d1}</text><text x="224" y="201" fill="#8a6d1a">{d2}</text>
      </g>
    </svg>
  );
}

type Pending = { kind: "large-image"; file: File; est: number } | { kind: "large-pdf"; file: File } | { kind: "quality"; file: File; q: Quality };

export function DocDetail({ id }: { id: string }) {
  const s = useStudent();
  const { run } = useArrive();
  const toast = useToast();
  const t = docType(id);
  const d = s.docs.find((x) => x.id === id);
  const [phase, setPhase] = useState<"idle" | "checking" | "uploading">("idle");
  const [sheet, setSheet] = useState<"digi" | null>(null);
  const [pend, setPend] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const pick = useRef<HTMLInputElement>(null);
  const cam = useRef<HTMLInputElement>(null);

  if (!t || !d) {
    return (<><Top title="Document" back="/app" /><main className="main"><div className="page"><div className="empty"><div className="ic"><FileText /></div><b className="h3">This document is not on your checklist</b><Link className="btn ghost" href="/app">Back to my checklist</Link></div></div></main></>);
  }
  const proof = PROOF[t.proof];

  async function send(file: File) {
    setPend(null); setPhase("uploading");
    const fd = new FormData(); fd.append("file", file);
    try {
      await run(`/api/me/docs/${id}/upload`, { form: fd });
      toast("Uploaded. The verification team will check it.");
    } catch (e) {
      if (e instanceof ApiError && e.code === "too_large" && isImage(file)) setPend({ kind: "large-image", file, est: 0 });
      else toast(errMsg(e), "error");
    } finally { setPhase("idle"); }
  }

  /** Size handling after the quality check: upload, offer to compress, or explain the PDF limit. */
  async function proceed(file: File) {
    setPend(null);
    if (file.size <= MAX_BYTES) return send(file);
    if (isPdf(file)) return setPend({ kind: "large-pdf", file });
    setPhase("checking");
    try { const c = await compress(file); setPend({ kind: "large-image", file, est: c.size }); }
    catch (e) { toast(errMsg(e), "error"); } finally { setPhase("idle"); }
  }

  async function handle(file: File | undefined) {
    if (!file) return;
    if (!isImage(file) && !isPdf(file)) return toast("Only PDF, JPG or PNG files are accepted.", "error");
    if (t!.photo && isPdf(file)) return toast("The photo must be an image (JPG or PNG), not a PDF.", "error");
    // Every image is checked on the original file, before any compression.
    if (isImage(file)) {
      setPhase("checking");
      let q: Quality | null = null;
      try { q = await checkImage(file, t!.photo ? "photo" : "doc"); }
      catch (e) { toast(errMsg(e), "error"); setPhase("idle"); return; }
      setPhase("idle");
      if (q.issues.length) return setPend({ kind: "quality", file, q });
    }
    await proceed(file);
  }

  async function shrinkAndSend(file: File) {
    setBusy(true);
    try { const c = await compress(file); await send(c); } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); }
  }

  async function digi() {
    setBusy(true);
    try {
      const r = await run<StudentState & { sandbox: boolean }>(`/api/me/docs/${id}/digilocker`);
      setSheet(null);
      toast(r.sandbox ? "Fetched from DigiLocker (sandbox) and accepted" : "Fetched from DigiLocker and accepted");
    } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); }
  }

  const canUpload = d.status === "todo" || d.status === "action" || d.status === "review";
  const inputs = (
    <>
      <input ref={pick} type="file" hidden accept={t.photo ? "image/jpeg,image/png" : "application/pdf,image/jpeg,image/png"} onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={cam} type="file" hidden accept="image/*" capture={t.photo ? "user" : "environment"} onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} />
    </>
  );

  return (
    <>
      <Top title={t.short} back="/app" action={<HelpLink />} />
      <main className="main">
        <div className="page">
          <section className="card stack">
            <div className="between" style={{ alignItems: "flex-start" }}><h2 className="h2">{t.name}</h2><Pill status={phase === "idle" ? d.status : "review"} label={phase === "idle" ? undefined : "Checking"} /></div>
            <div className="row wrap"><span className="tag"><ShieldCheck size={13} />{proof.label}</span>{t.changed && <span className="tag warn"><Clock3 size={13} />Changed {t.changed}</span>}{t.digi && <span className="tag">In DigiLocker</span>}</div>
            <p className="muted small">{proof.detail} {t.hint}</p>
          </section>

          {phase !== "idle" ? (
            <section className="card checking" aria-live="polite"><span className="spin" aria-hidden /><div className="grow"><b>{phase === "checking" ? "Checking your file" : "Uploading"}</b><p className="muted small">Size, format{t.photo ? ", sharpness and light" : ""}. This takes a few seconds.</p><div className="progress mt"><i style={{ width: phase === "checking" ? "45%" : "85%" }} /></div></div></section>
          ) : d.status === "ok" ? (
            <div className="banner good"><CheckCircle2 size={20} /><span><b>Accepted</b>{d.source ?? "Checked by the verification team"}. Nothing more to do here.</span></div>
          ) : d.status === "review" ? (
            <div className="banner warn"><Hourglass size={20} /><span><b>Being reviewed</b>The verification team checks uploads within 48 hours. You will see it here and get an SMS when it is done.{d.fileName && <> File: <a href={`/api/me/docs/${id}/file`} target="_blank" rel="noreferrer">{d.fileName}</a></>}</span></div>
          ) : d.status === "action" ? (
            <div className="banner bad"><XCircle size={20} /><span><b>Rejected. Please upload again.</b>{d.reason}</span></div>
          ) : null}

          {phase === "idle" && canUpload && (
            <>
              {t.digi && d.status !== "review" && (
                <div className="stack-sm">
                  <Button className="accent block" onClick={() => setSheet("digi")}><ShieldCheck size={18} />Fetch from DigiLocker</Button>
                  <p className="small muted center">Your board already issued it there, so it is accepted straight away.</p>
                </div>
              )}
              <div className={`drop${over ? " over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
                onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files?.[0]); }}>
                <b>{d.status === "review" ? "Uploaded the wrong file? Replace it" : t.digi ? "Or upload a scan" : t.photo ? "Upload a new photo" : "Upload a scan"}</b>
                <p className="small muted">{t.photo ? "JPG or PNG. Big photos are shrunk for you." : "PDF, JPG or PNG, up to 2 MB. Make sure all four corners are visible."}</p>
                <div className="btns">
                  <button className="btn ghost sm" onClick={() => cam.current?.click()}><Camera size={16} />{t.photo ? "Take a photo" : "Scan with camera"}</button>
                  <button className="btn ghost sm" onClick={() => pick.current?.click()}><FileUp size={16} />Choose file</button>
                </div>
                {inputs}
              </div>
            </>
          )}

          <section className="card stack">
            <h2 className="h3">What a correct one looks like</h2>
            <Sample t={t} />
            <p className="small muted">Mismatched names and missing dates are the most common reasons for rejection.</p>
          </section>
        </div>
      </main>

      <Sheet open={sheet === "digi"} onClose={() => setSheet(null)} title="Share from DigiLocker">
        <p className="muted">IIIT Allahabad wants to read <b>one</b> document from your DigiLocker account. Nothing else is shared.</p>
        <div className="filecard"><span className="ext"><ShieldCheck size={20} /></span><div className="grow"><b>{t.name}</b><p className="small muted">Issued by your board · {s.me.name}</p></div></div>
        <Button className="accent block" busy={busy} onClick={digi}>Allow and fetch</Button>
        <button className="btn ghost block" onClick={() => setSheet(null)}>Not now</button>
      </Sheet>

      <Sheet open={pend?.kind === "large-image"} onClose={() => setPend(null)} title="This photo is too large">
        {pend?.kind === "large-image" && <>
          <p className="muted">It is {kb(pend.file.size)} and the limit is 2 MB. We can shrink it on your phone without losing readability.</p>
          <Button className="accent block" busy={busy} onClick={() => shrinkAndSend(pend.file)}>Compress to about {kb(pend.est || 900 * 1024)} and upload</Button>
          <button className="btn ghost block" onClick={() => { setPend(null); pick.current?.click(); }}>Choose another file</button>
        </>}
      </Sheet>
      <Sheet open={pend?.kind === "large-pdf"} onClose={() => setPend(null)} title="This PDF is too large">
        {pend?.kind === "large-pdf" && <>
          <p className="muted">It is {kb(pend.file.size)} and the limit is 2 MB. Save it again from your scanner app at a lower quality (150 dpi is enough), or take a clear photo of the page instead. We shrink photos for you.</p>
          <button className="btn block" onClick={() => { setPend(null); cam.current?.click(); }}><Camera size={16} />Take a photo instead</button>
          <button className="btn ghost block" onClick={() => { setPend(null); pick.current?.click(); }}>Choose another file</button>
        </>}
      </Sheet>
      <Sheet open={pend?.kind === "quality"} onClose={() => setPend(null)} title={pend?.kind === "quality" ? pend.q.issues[0].title : ""}>
        {pend?.kind === "quality" && <>
          <div className="filecard" data-sharp={pend.q.metrics.sharp} data-noise={pend.q.metrics.noise} data-bright={pend.q.metrics.bright} data-faces={pend.q.metrics.faces ?? "n/a"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pend.q.preview} alt={t.photo ? "Preview of the photo you chose" : "Preview of the scan you chose"} />
            <div className="grow"><b>{pend.file.name}</b><p className="small muted">{kb(pend.file.size)}</p></div>
          </div>
          <ul className="stack-sm" style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
            {pend.q.issues.map((i) => (
              <li key={i.code} className="row" style={{ alignItems: "flex-start" }}><XCircle size={18} color="var(--bad)" style={{ flex: "none", marginTop: 2 }} /><span className="small"><b>{i.title}.</b> <span className="muted">{i.tip}</span></span></li>
            ))}
          </ul>
          <p className="small muted">{t.photo ? "Photos like this are usually rejected, and you would have to upload again." : "If the verification team cannot read it, they will ask you to upload again."}</p>
          <button className="btn accent block" onClick={() => { setPend(null); cam.current?.click(); }}><Camera size={16} />{t.photo ? "Take it again" : "Scan it again"}</button>
          <button className="btn ghost block" onClick={() => { setPend(null); pick.current?.click(); }}><ImageIcon size={16} />Choose another {t.photo ? "photo" : "file"}</button>
          <button className="linkbtn" style={{ alignSelf: "center" }} onClick={() => proceed(pend.file)}>Upload this one anyway</button>
        </>}
      </Sheet>
    </>
  );
}

/* ================================================================== review */
export function Review() {
  const s = useStudent();
  const { run } = useArrive();
  const toast = useToast();
  const router = useRouter();
  const [slot, setSlot] = useState<number | null>(s.booking?.slotId ?? null);
  const [busy, setBusy] = useState(false);
  const left = pending(s);
  const feeOk = s.fee.status === "paid";
  const changing = !!s.booking && slot !== s.booking.slotId;
  const why = left.length ? `Your pass unlocks when every document is accepted (${left.length} left).` : !feeOk ? "Your fee is not confirmed yet." : slot === null ? "Choose a reporting slot to continue." : s.checkin ? "You have checked in, so your slot is fixed." : "You can change your slot until 24 Jul.";

  async function getPass() {
    if (slot === null) return;
    setBusy(true);
    try {
      await run("/api/me/booking", { json: { slotId: slot } });
      toast(s.booking ? "Slot changed. Your pass is updated." : "Your Ready to Report pass is ready");
      router.push("/app/pass");
    } catch (e) { toast(errMsg(e), "error"); setBusy(false); }
  }

  return (
    <>
      <Top title="Review" back="/app" action={<HelpLink />} />
      <main className="main">
        <div className="page">
          <section className="card stack">
            <div className="card-head" style={{ margin: 0 }}><h2 className="h3">Documents</h2><span className="small muted">{s.docs.length - left.length} of {s.docs.length} accepted</span></div>
            {left.length ? (
              <>
                <p className="small muted">{left.length} still need attention before your pass unlocks:</p>
                <div className="card flush doclist">
                  {left.map((d) => { const t = docType(d.id)!; return (
                    <Link key={d.id} href={`/app/documents/${d.id}`} className={`docrow ${d.status}`}><span className="dicon" aria-hidden>{ICON[d.status]}</span><span className="nm">{t.name}</span><Pill status={d.status} /><span className="meta">{meta(d, t)}</span></Link>
                  ); })}
                </div>
              </>
            ) : <div className="banner good"><CheckCircle2 size={20} /><span><b>All {s.docs.length} documents accepted</b>Nothing will be asked for again at the desks.</span></div>}
          </section>

          <section className="card stack">
            <h2 className="h3">Fee</h2>
            <dl className="kv"><dt>Semester fee</dt><dd>{inr(s.fee.amount)}</dd><dt>Status</dt><dd className={feeOk ? "okc" : "revc"}>{feeOk ? `Paid · ref ${s.fee.ref}` : (s.fee.note ?? "Pending")}</dd></dl>
            {!feeOk && <p className="small muted">Payments confirm within 15 minutes. If it still shows pending, ask in Help with your bank reference. Do not pay again.</p>}
          </section>

          <section className="card stack">
            <h2 className="h3" id="slot-label">Reporting slot</h2>
            <p className="small muted">Choose when you arrive on {CHECKLIST.reportingDay}. Slots keep the hall from filling up at once.</p>
            <div className="stack-sm" role="radiogroup" aria-labelledby="slot-label">
              {s.slots.map((x) => (
                <button key={x.id} className="slot" role="radio" aria-checked={slot === x.id} disabled={(x.full && s.booking?.slotId !== x.id) || !!s.checkin} onClick={() => setSlot(x.id)}>
                  <span className="radio" aria-hidden /><span><b>{x.day}</b> · {x.label}</span>
                  <span className={`left${x.left > 0 && x.left <= 15 ? " low" : ""}`}>{s.booking?.slotId === x.id ? "Your slot" : x.full ? "Full" : `${x.left} places left`}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="stack-sm">
            <Button className="accent block" busy={busy} disabled={left.length > 0 || !feeOk || slot === null || !!s.checkin || (!!s.booking && !changing)} onClick={getPass}>
              <BadgeCheck size={18} />{s.booking ? (changing ? "Change my slot" : "Pass already issued") : "Get my Ready to Report pass"}
            </Button>
            <p className="small muted center" aria-live="polite">{why}</p>
            {s.booking && !changing && <Link href="/app/pass" className="btn ghost block">Open my pass</Link>}
          </div>
        </div>
      </main>
    </>
  );
}

/* ================================================================== pass */
function shareText(s: StudentState, lang: "en" | "hi", link: string) {
  const sl = s.slots.find((x) => x.id === s.booking?.slotId);
  const when = sl ? `${sl.day}, ${sl.label}` : CHECKLIST.reportingDay;
  const originals = DOC_TYPES.filter((t) => t.proof === "original" && s.docs.some((d) => d.id === t.id));
  return lang === "hi"
    ? `${s.me.first} का IIIT इलाहाबाद रजिस्ट्रेशन पूरा और स्वीकृत है।\nरिपोर्टिंग: ${when}, मुख्य गेट (देवघाट)।\nसाथ लाएँ: ${originals.length ? originals.map((t) => t.id === "cat" ? "जाति प्रमाण पत्र (मूल)" : t.id === "med" ? "मेडिकल प्रमाण पत्र (मूल)" : t.name).join(", ") : "कुछ नहीं"}। कोई और दस्तावेज़ नहीं माँगा जाएगा।\nलाइव स्थिति: ${link}`
    : `${s.me.first}'s IIIT Allahabad registration is complete and accepted.\nReporting: ${when}, main gate (Deoghat).\nBring: ${originals.length ? originals.map((t) => `original ${t.short.toLowerCase()} certificate`).join(", ") : "nothing extra"}. No other document will be asked for.\nLive status: ${link}`;
}

export function Pass() {
  const s = useStudent();
  const { run } = useArrive();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"en" | "hi">((s.booking?.sharedLang as "en" | "hi") ?? "en");

  if (!s.booking) {
    const left = pending(s).length;
    return (
      <><Top title="My pass" action={<HelpLink />} />
        <main className="main"><div className="page"><section className="card">
          <div className="empty"><div className="ic"><BadgeCheck /></div><b className="h3">No pass yet</b>
            <p>{left ? `${left} document${left > 1 ? "s" : ""} still need${left > 1 ? "" : "s"} to be accepted. Then book a reporting slot.` : "Everything is accepted. Book a reporting slot to get your pass."}</p>
            <Link className="btn accent" href={left ? "/app" : "/app/review"}>{left ? "Go to my checklist" : "Book my slot"}</Link></div>
        </section></div></main></>
    );
  }
  const sl = s.slots.find((x) => x.id === s.booking!.slotId);
  const originals = DOC_TYPES.filter((t) => t.proof === "original" && s.docs.some((d) => d.id === t.id));
  const link = typeof window !== "undefined" ? `${window.location.origin}/s/${s.booking.shareToken}` : `/s/${s.booking.shareToken}`;
  const text = shareText(s, lang, link);
  const phone = s.me.parentPhone;
  const sendVia = async (how: "sms" | "wa" | "copy" | "native") => {
    run("/api/me/share", { json: { lang } }).catch(() => {});
    const to = s.me.parentName || "your parent";
    if (how === "copy") {
      try { await navigator.clipboard.writeText(text); toast("Copied. Paste it into any chat."); } catch { toast("Copy was blocked. Long-press the message to copy it.", "error"); }
      return;
    }
    if (how === "native" && navigator.share) { try { await navigator.share({ text }); toast(`Shared with ${to}`); } catch { /* cancelled */ } return; }
    window.location.href = how === "sms" ? `sms:+91${phone}?&body=${encodeURIComponent(text)}` : `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;
    toast(lang === "hi" ? `Opening a message to ${to} in Hindi` : `Opening a message to ${to}`);
  };

  return (
    <>
      <Top title="Ready to Report" action={<HelpLink />} />
      <main className="main">
        <div className="page">
          <article className="pass" aria-label="Ready to Report pass">
            <div className="top">
              <div className="between"><span className="org"><span className="logo" style={{ width: 30, height: 30, fontSize: 12, borderRadius: 9 }}>IA</span>IIIT Allahabad</span><span className="pill ready"><span className="light" />Ready</span></div>
              <div><div className="pname">{s.me.name}</div><div className="meta">{s.me.branch} · JoSAA {s.me.josaa}</div></div>
            </div>
            <div className="perf" aria-hidden />
            <div className="bottom">
              <dl className="kv" style={{ gridTemplateColumns: "auto 1fr" }}>
                <dt>Arrive</dt><dd>{sl ? `${sl.day} · ${sl.label}` : CHECKLIST.reportingDay}</dd>
                <dt>Gate</dt><dd>{CHECKLIST.gate}</dd>
                <dt>Desk A</dt><dd>Green lane, skip</dd>
                <dt>Originals</dt><dd>{originals.length ? originals.map((t) => t.short).join(", ") : "None"}</dd>
              </dl>
              <div><div className="qrbox"><Qr value={`ARRIVE:${s.booking.passCode}`} label="QR code to scan at the gate" /></div><div className="code mono">{s.booking.passCode}</div></div>
            </div>
          </article>

          <Button className="block" onClick={() => setOpen(true)}><Share2 size={18} />Share with my parent</Button>
          <div className="banner info"><Info size={20} /><span><b>On reporting day</b>Show this QR at the gate. It becomes your Gate-to-Room Pass and guides you desk by desk.</span></div>
          <Link href="/app/day" className="btn ghost block"><Navigation size={18} />See reporting day (Gate-to-Room Pass)</Link>
          <Link href="/app/review" className="linkbtn" style={{ alignSelf: "center" }}>Change my slot</Link>
        </div>
      </main>

      <Sheet open={open} onClose={() => setOpen(false)} title="Share with a parent">
        <div className="between"><span className="small muted">Language</span>
          <div className="seg" role="group" aria-label="Language"><button aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button><button aria-pressed={lang === "hi"} onClick={() => setLang("hi")} lang="hi">हिन्दी</button></div>
        </div>
        <div className="card" style={{ background: "var(--tint)" }}><p className="sharetxt" lang={lang}>{text}</p></div>
        <p className="tiny muted">The link shows your live status on reporting day: checked in, which desk, room accepted. It does not show your documents.</p>
        <Button className="accent block" onClick={() => sendVia("sms")} disabled={!phone}><Send size={18} />Send by SMS to {s.me.parentName || "parent"}{phone ? ` (${phone.slice(0, 2)}••• ••${phone.slice(-3)})` : ""}</Button>
        <div className="sharebtns">
          <button className="btn ghost" onClick={() => sendVia("wa")} disabled={!phone}><MessageCircle size={18} />WhatsApp</button>
          <button className="btn ghost" onClick={() => sendVia(typeof navigator !== "undefined" && "share" in navigator ? "native" : "copy")}>{typeof navigator !== "undefined" && "share" in navigator ? <><Share2 size={18} />More</> : <><Copy size={18} />Copy</>}</button>
        </div>
      </Sheet>
    </>
  );
}

/* ================================================================== rule changes */
export function Changes() {
  const s = useStudent();
  return (
    <>
      <Top title="Rule changes" back="/app" />
      <main className="main">
        <div className="page">
          <p className="muted">Every change to the checklist is listed here with its date and reason. The list freezes 10 days before reporting, so nothing new appears after that.</p>
          {CHANGES.map((c, i) => {
            const mine = c.doc && s.docs.some((d) => d.id === c.doc);
            const doc = c.doc ? docType(c.doc) : null;
            return (
              <section key={c.v} className="card stack">
                <div className="between"><b className="h3">{c.v} · {c.date}</b>{i === 0 && mine ? <Pill status="review" label="Affects you" /> : <span className="tag"><FileClock size={13} />{i === CHANGES.length - 1 ? "First version" : "Update"}</span>}</div>
                <p className={i === 0 ? "" : "muted"}>{c.text}</p>
                {mine && doc && <Link className="btn ghost sm" style={{ alignSelf: "flex-start" }} href={`/app/documents/${doc.id}`}>Open {doc.name.toLowerCase()}<ChevronRight size={16} /></Link>}
              </section>
            );
          })}
          <div className="banner good"><Lock size={20} /><span><b>Frozen on {CHECKLIST.frozenOn}</b>Nothing new will be added before you report on {CHECKLIST.reportingDay.replace(" 2026", "")}.</span></div>
        </div>
      </main>
    </>
  );
}
