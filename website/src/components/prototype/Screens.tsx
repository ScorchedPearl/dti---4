"use client";

import type { ReactNode } from "react";
import { FAQ, PROOF, SLOTS, type Data, type Doc, type Status } from "./data";

export type Api = {
  D: Data;
  docId: string | null;
  fix: string | null;
  go: (screen: string) => void;
  back: () => void;
  openDoc: (id: string) => void;
  act: (name: string, arg?: string | number) => void;
};

const STAT: Record<Status, [string, string]> = {
  ok: ["Accepted", "s-ok"], review: ["In review", "s-review"], action: ["Action needed", "s-action"], todo: ["To upload", "s-todo"], checking: ["Checking", "s-review"],
};
export const Chip = ({ st }: { st: Status }) => <span className={`chip ${STAT[st][1]}`}><span className="dot" />{STAT[st][0]}</span>;

function Bar({ title, api, back = true, help = false }: { title: string; api: Api; back?: boolean; help?: boolean }) {
  return (
    <div className="appbar">
      {back && <button className="back" onClick={api.back} aria-label="Back">←</button>}
      <h2>{title}</h2>
      {help && <button className="iconbtn" onClick={() => api.go("help")} aria-label="Help">?</button>}
    </div>
  );
}

function Ring({ n, total }: { n: number; total: number }) {
  const r = 38, c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 92 92" role="img" aria-label={`${n} of ${total} accepted`}>
      <circle cx="46" cy="46" r={r} fill="none" stroke="var(--a-todo-bg)" strokeWidth="10" />
      <circle cx="46" cy="46" r={r} fill="none" stroke="var(--a-ok)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(c * n) / total} ${c}`} transform="rotate(-90 46 46)" />
      <text x="46" y="44" textAnchor="middle" fontSize="22" fontWeight="800" fill="var(--a-ink)" fontFamily="var(--a-head)">{n}/{total}</text>
      <text x="46" y="62" textAnchor="middle" fontSize="10.5" fill="var(--a-sub)">accepted</text>
    </svg>
  );
}

export function Qr({ seed }: { seed: number }) {
  let x = seed;
  const rnd = () => (x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const N = 25;
  const cells: ReactNode[] = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const inF = (i < 8 && j < 8) || (i < 8 && j > 16) || (i > 16 && j < 8);
    if (!inF && rnd() > 0.52) cells.push(<rect key={`${i}-${j}`} x={j} y={i} width="1" height="1" fill="#111" />);
  }
  const finder = (cx: number, cy: number) => (
    <g key={`f${cx}${cy}`}><rect x={cx} y={cy} width="7" height="7" fill="#111" /><rect x={cx + 1} y={cy + 1} width="5" height="5" fill="#fff" /><rect x={cx + 2} y={cy + 2} width="3" height="3" fill="#111" /></g>
  );
  return <svg className="qr" viewBox={`0 0 ${N} ${N}`} shapeRendering="crispEdges" role="img" aria-label="QR code for the pass">{cells}{finder(0, 0)}{finder(18, 0)}{finder(0, 18)}</svg>;
}

function Sample({ d }: { d: Doc }) {
  const notary = d.proof === "notary";
  const c = notary ? "#c23b2e" : "#1f6f78";
  return (
    <svg className="sample" viewBox="0 0 320 210" role="img" aria-label={`Annotated sample of a correct ${d.name}`}>
      <rect x="20" y="14" width="190" height="182" rx="4" fill="#fff" stroke="#c9c1ad" />
      <text x="115" y="34" textAnchor="middle" fontSize="10" fontWeight="700" fill="#333">{d.name.split("(")[0].trim()}</text>
      {[50, 62, 74, 86, 98, 110, 122].map((y, i) => <rect key={y} x="34" y={y} width={i % 3 ? 150 : 120} height="5" rx="2" fill="#e3ddcf" />)}
      <rect x="34" y="50" width="70" height="5" rx="2" fill="#7da7d9" />
      <circle cx={notary ? 70 : 168} cy="164" r="17" fill="none" stroke={c} strokeWidth="2.5" strokeDasharray={notary ? "0" : "3 3"} />
      <path d="M135 172 q12 -14 22 -2 t24 -4" fill="none" stroke="#17375e" strokeWidth="2" />
      <rect x="132" y="180" width="54" height="5" rx="2" fill="#e3ddcf" />
      <g fontSize="10.5" fontWeight="700">
        <line x1="104" y1="52" x2="222" y2="40" stroke="#7da7d9" /><text x="226" y="43" fill="#2a5a92">Name exactly</text><text x="226" y="55" fill="#2a5a92">as in JoSAA</text>
        <line x1={notary ? 87 : 185} y1="160" x2="222" y2={notary ? 112 : 128} stroke={c} />
        <text x="226" y={notary ? 115 : 131} fill={c}>{notary ? "Notary seal" : "Your signature"}</text>
        <text x="226" y={notary ? 127 : 143} fill={c}>{notary ? "and stamp" : "on every page"}</text>
        <line x1="186" y1="182" x2="222" y2="180" stroke="#8a6d1a" /><text x="226" y="183" fill="#8a6d1a">Date after</text><text x="226" y="195" fill="#8a6d1a">1 Apr 2026</text>
      </g>
    </svg>
  );
}

const okCount = (D: Data) => D.docs.filter((d) => d.status === "ok").length;
const allOk = (D: Data) => D.docs.every((d) => d.status === "ok");

/* ================================================================ ReadyPass */
export function Login({ api }: { api: Api }) {
  return (
    <>
      <div className="brandmark">
        <div className="logo">RP</div>
        <h2 className="h3 xl">ReadyPass</h2>
        <p className="sub">Prove you are ready before you leave home. IIIT Allahabad, B.Tech 2026 reporting.</p>
      </div>
      <div className="card">
        <label className="afield">JoSAA application number<input id="appno" defaultValue="260310442817" inputMode="numeric" /></label>
        <label className="afield">Date of birth<input id="dob" defaultValue="14/03/2008" /></label>
        <p className="sub">We send a one-time code to the phone number on your JoSAA form, ending 4417.</p>
      </div>
      <button className="cta" onClick={() => api.act("login")}>Send code and sign in</button>
      <p className="sub center">Example details are filled in for testing.</p>
    </>
  );
}

export function Home({ api }: { api: Api }) {
  const { D } = api;
  const need = D.docs.filter((d) => d.status === "action" || d.status === "todo");
  const order: Record<Status, number> = { action: 0, todo: 1, review: 2, checking: 2, ok: 3 };
  const docs = [...D.docs].sort((a, b) => order[a.status] - order[b.status]);
  const meta = (d: Doc) => d.status === "action" ? d.reason!.split(".")[0] + "." : d.status === "ok" ? d.via ?? "Accepted" : d.status === "review" ? "Desk staff review within 48 hours" : d.status === "checking" ? "Checking your file" : d.digi ? "Available in DigiLocker" : PROOF[d.proof][0];
  return (
    <>
      <Bar title="My checklist" api={api} back={false} help />
      <div className="card">
        <div className="hero">
          <Ring n={okCount(D)} total={D.docs.length} />
          <div>
            <div className="big">{allOk(D) ? "Everything is accepted" : need.length ? `${need.length} item${need.length > 1 ? "s" : ""} need you` : "Waiting on review"}</div>
            <p className="sub">{allOk(D) ? (D.pass ? "Your pass is ready." : "Book a slot to get your pass.") : "Your pass unlocks when every line is green."}</p>
          </div>
        </div>
        <dl className="kv"><dt>Checklist version</dt><dd>v3 · frozen 6 Jul 2026</dd><dt>Fee</dt><dd className="okc">Paid · confirmed in 4 min</dd></dl>
      </div>
      <button className="banner warn" onClick={() => api.go("log")}><span>⚠</span><span><b>1 rule changed on 2 Jul</b>Anti-ragging undertaking now needs a notary. See what changed.</span></button>
      <div className="card list">
        {docs.map((d) => (
          <button key={d.id} className="doc" onClick={() => api.openDoc(d.id)}>
            <span className="nm">{d.name}</span><Chip st={d.status} /><span className="meta">{meta(d)}</span>
          </button>
        ))}
      </div>
      <button className={`cta ${allOk(D) ? "teal" : ""}`} onClick={() => api.go(D.pass ? "pass" : "review")}>{D.pass ? "Open my pass" : "Review and get my pass"}</button>
    </>
  );
}

export function DocDetail({ api }: { api: Api }) {
  const d = api.D.docs.find((x) => x.id === api.docId) ?? api.D.docs[0];
  const [pt, pd] = PROOF[d.proof];
  let body: ReactNode;
  if (d.status === "ok") body = <div className="banner good"><span>✓</span><span><b>Accepted</b>{d.via ?? "Checked by the verification team"}. Nothing more to do here.</span></div>;
  else if (d.status === "review") body = <div className="banner warn"><span>⏳</span><span><b>Being reviewed</b>Staff review uploads within 48 hours. You will get an SMS when it is done.</span></div>;
  else if (d.status === "checking") body = <div className="card rowc"><div className="spin" /><div><b>Checking your file</b><p className="sub">Size, format and blur. This takes a few seconds.</p></div></div>;
  else body = (
    <>
      {d.status === "action" && <div className="banner bad"><span>✕</span><span><b>Rejected</b>{d.reason}</span></div>}
      {d.digi && <><button className="cta teal" onClick={() => api.act("digi")}>Fetch from DigiLocker</button><p className="sub center">Already verified there. No scan needed.</p></>}
      <div className="drop"><b>{d.digi ? "Or upload a scan" : "Upload a scan"}</b><p className="sub">PDF or JPG, up to 2 MB. Make sure all four corners are visible.</p><button className="cta ghost" onClick={() => api.act("pick")}>Choose file</button></div>
    </>
  );
  return (
    <>
      <Bar title="Document" api={api} help />
      <div className="card">
        <div className="between"><b className="dname">{d.name}</b><Chip st={d.status} /></div>
        <div className="tags"><span className="tag">{pt}</span>{d.changed && <span className="tag warnt">Changed 2 Jul</span>}</div>
        <p className="sub">{pd}</p>
      </div>
      {body}
      <div className="card"><b className="h3">What a correct one looks like</b><Sample d={d} /><p className="sub">Annotated sample. Mismatched names and missing dates are the most common reasons for rejection.</p></div>
    </>
  );
}

export function Review({ api }: { api: Api }) {
  const { D } = api;
  const pending = D.docs.filter((d) => d.status !== "ok");
  return (
    <>
      <Bar title="Review" api={api} />
      <div className="card">
        <b className="h3">Documents</b>
        {pending.length ? (
          <>
            <p className="sub">{pending.length} still need attention before your pass unlocks:</p>
            {pending.map((d) => <button key={d.id} className="doc" onClick={() => api.openDoc(d.id)}><span className="nm">{d.name}</span><Chip st={d.status} /></button>)}
          </>
        ) : <div className="banner good"><span>✓</span><span><b>All {D.docs.length} documents accepted</b>Nothing will be asked again at the desks.</span></div>}
      </div>
      <div className="card"><b className="h3">Fee</b><dl className="kv"><dt>Semester fee</dt><dd>₹ 1,48,500</dd><dt>Status</dt><dd className="okc">Paid · ref IIITA26-88412</dd></dl></div>
      <div className="card">
        <b className="h3">Reporting slot</b>
        <p className="sub">Choose when you arrive. Slots keep the hall from filling up at once.</p>
        {SLOTS.map(([d, t, left], i) => (
          <button key={t} className="slot" aria-pressed={D.slot === i} disabled={left === "full"} onClick={() => api.act("slot", i)}>
            <span className="radio" /><span><b>{d}</b> · {t}</span><span className="sub">{left === "full" ? "Full" : left}</span>
          </button>
        ))}
      </div>
      <button className="cta teal" disabled={pending.length > 0 || D.slot === null} onClick={() => api.act("getpass")}>Get my Ready to Report pass</button>
      <p className="sub center">{pending.length ? "Your pass unlocks when every document is accepted." : D.slot === null ? "Choose a reporting slot to continue." : "You can change your slot until 24 Jul."}</p>
    </>
  );
}

export function Pass({ api }: { api: Api }) {
  const { D } = api;
  if (!D.pass) return (
    <>
      <Bar title="My pass" api={api} />
      <div className="card"><b className="h3">No pass yet</b><p className="sub">Finish your checklist and book a reporting slot first.</p><button className="cta" onClick={() => api.go("review")}>Go to review</button></div>
    </>
  );
  const [d, t] = SLOTS[D.slot ?? 1];
  return (
    <>
      <Bar title="Ready to Report" api={api} help />
      <div className="pass">
        <div className="between"><b className="passorg">IIIT Allahabad</b><span className="chip s-ok"><span className="dot" />Ready</span></div>
        <div><div className="passname">Ananya Verma</div><p className="sub">B.Tech IT · JoSAA 260310442817</p></div>
        <Qr seed={2603104} />
        <hr />
        <dl className="kv"><dt>Arrive</dt><dd>{d} · {t}</dd><dt>Gate</dt><dd>Main gate, Deoghat</dd><dt>Desk A</dt><dd>Green lane, skip</dd><dt>Bring originals</dt><dd>Category certificate</dd></dl>
      </div>
      <button className="cta" onClick={() => api.act("share")}>Share with my parent</button>
      <div className="banner info"><span>ℹ</span><span><b>On reporting day</b>Show this QR at the gate. It becomes your Gate-to-Room Pass.</span></div>
      <button className="cta ghost" onClick={() => api.act("toGate")}>See reporting day (Gate-to-Room Pass)</button>
    </>
  );
}

export function ChangeLog({ api }: { api: Api }) {
  return (
    <>
      <Bar title="Rule changes" api={api} />
      <p className="sub">Every change to the checklist is listed here, with the date and the reason. The list freezes 10 days before reporting.</p>
      <div className="card">
        <div className="between"><b>v3 · 2 Jul 2026</b><span className="chip s-review"><span className="dot" />Affects you</span></div>
        <p className="sub ink">Anti-ragging undertaking must now be notarised (UGC circular, June 2026).</p>
        <button className="cta ghost" onClick={() => api.openDoc("aff")}>Open anti-ragging undertaking</button>
      </div>
      <div className="card"><b>v2 · 20 Jun 2026</b><p className="sub">Income certificate accepted from any financial year after April 2025.</p></div>
      <div className="card"><b>v1 · 5 Jun 2026</b><p className="sub">Checklist published.</p></div>
      <div className="banner good"><span>🔒</span><span><b>Frozen on 6 Jul</b>Nothing new will be added before you report on 27 Jul.</span></div>
    </>
  );
}

export function Help({ api }: { api: Api }) {
  const { D } = api;
  return (
    <>
      <Bar title="Help" api={api} />
      <p className="sub">Answers come from the official FAQ. If it cannot answer, a verified senior volunteer replies within 10 minutes.</p>
      <div className="chat">
        {!D.chat.length && <div className="msg bot"><small>IIITA Help</small>Hi Ananya. Ask anything about reporting, documents, fees or the hostel.</div>}
        {D.chat.map((m, i) => <div key={i} className={`msg ${m.me ? "me" : "bot"}`}>{!m.me && <small>{m.who}</small>}{m.text}</div>)}
      </div>
      <div className="qchips">{[...FAQ.map((f) => f.q), "Can I leave my luggage somewhere?"].map((q) => <button key={q} onClick={() => api.act("ask", q)}>{q}</button>)}</div>
      <form className="composer" onSubmit={(e) => { e.preventDefault(); const el = (e.currentTarget.elements.namedItem("askbox") as HTMLInputElement); if (el.value.trim()) { api.act("ask", el.value.trim()); el.value = ""; } }}>
        <input id="askbox" name="askbox" placeholder="Type a question" autoComplete="off" aria-label="Your question" /><button type="submit">Ask</button>
      </form>
    </>
  );
}

/* ================================================================ Gate-to-Room Pass */
export function Gate({ api }: { api: Api }) {
  if (api.D.checkedIn) return <Route api={api} />;
  return (
    <>
      <div className="brandmark">
        <div className="logo teal">GR</div>
        <h2 className="h3 xl">Welcome to IIITA</h2>
        <p className="sub">Monday 27 July · Your slot 10:30 to 11:30. Show your pass at the gate to start your route.</p>
      </div>
      <Qr seed={2603104} />
      <button className="cta teal" onClick={() => api.act("checkin")}>Scan at the gate</button>
      <div className="card"><b className="h3">Family with you?</b><p className="sub">Parents can wait in shaded seating in Hall 2 with water. We will ping this phone when your desk is ready, so nobody has to stand in a line.</p></div>
    </>
  );
}

export function Route({ api }: { api: Api }) {
  const { D } = api;
  const now = D.route.find((r) => r.st === "now");
  const done = D.route.filter((r) => r.st === "done" || r.st === "skip").length;
  const ahead = now?.ahead ?? 0;
  return (
    <>
      <Bar title="My route" api={api} back={false} help />
      <div className="between"><span className="sub">Token <b className="ink">#247</b> · Slot 10:30</span><span className="chip s-ok"><span className="dot" />{done} of {D.route.length} done</span></div>
      {now ? now.k === "R" ? (
        <div className="now-card"><span className="sub">Last step</span><div className="nowtitle">Your room is ready</div><button className="cta light" onClick={() => api.go("room")}>Open room handover</button></div>
      ) : (
        <div className="now-card">
          <span className="sub">Next: Desk {now.k} · {now.t}</span>
          <div className="nowrow"><div className="big">{ahead}</div><div>{ahead === 1 ? "person" : "people"} ahead · about {Math.max(1, ahead * 2)} min</div></div>
          <div className="meter"><i style={{ width: `${Math.max(6, 100 - ahead * 14)}%` }} /></div>
          <span className="sub">{now.w}. Wait anywhere. We will ping you.</span>
        </div>
      ) : <div className="now-card"><div className="nowtitle">All done</div></div>}
      <div className="card">
        <div className="steps">
          {D.route.map((r) => {
            const fin = r.st === "done" || r.st === "skip";
            return (
              <div key={r.k} className={`step ${fin ? "done" : r.st === "now" ? "now" : ""}`}>
                <span className="n">{fin ? "✓" : r.k}</span>
                <div><div className="t">{r.t}</div><div className="w">{r.w}{r.note ? ` · ${r.note}` : ""}</div></div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function DeskReady({ api }: { api: Api }) {
  const now = api.D.route.find((r) => r.st === "now") ?? api.D.route[1];
  return (
    <>
      <Bar title="Your desk" api={api} />
      <div className="card"><b className="h3">Desk {now.k} · {now.t}</b><p className="sub">{now.w}. When it is your turn, this phone shows a full-screen alert and vibrates.</p><button className="cta teal" onClick={() => api.act("demoReady")}>Show the alert now</button></div>
    </>
  );
}

export function Room({ api }: { api: Api }) {
  const { D } = api;
  return (
    <>
      <Bar title="Room 214, BH-3" api={api} help />
      <div className="card">
        <div className="between"><b className="h3">Inspection card</b><span className="chip s-ok"><span className="dot" />Passed</span></div>
        <p className="sub">Checked by caretaker R. Yadav at 9:12 today. Photo taken after cleaning.</p>
        {["Cleaned and mopped", "Fan and light work", "Water tap and drain", "Door lock", "Window and mesh", "Mattress and table"].map((t) => <div key={t} className="check"><span className="ok">✓</span><span>{t}</span><span className="sub">ok</span></div>)}
      </div>
      <div className="card"><b className="h3">Room-mate</b><p className="sub">Shared with you on 24 Jul. Contact details appear once you both accept the room.</p></div>
      {D.room.ticket && (
        <div className="card">
          <div className="between"><b className="h3">{D.room.ticket} reported</b><span className="chip s-review"><span className="dot" />Assigned</span></div>
          <div className="timeline">
            <div className="on"><span className="dot" /><span>Reported</span><span className="sub">just now</span></div>
            <div className="on"><span className="dot" /><span>Assigned to maintenance</span><span className="sub">#R-1182</span></div>
            <div><span className="dot" /><span>Fixed</span><span className="sub">by 6:00 pm</span></div>
          </div>
        </div>
      )}
      <button className="cta teal" disabled={D.room.accepted} onClick={() => api.act("accept")}>{D.room.accepted ? "Room accepted" : "Accept my room"}</button>
      <button className="cta ghost" onClick={() => api.go("report")}>Something is wrong? Report it</button>
      <div className="card"><b className="h3">Day-one essentials</b><p className="sub">Water cooler: end of corridor · Mess: dinner 7:30 to 9:30 pm · Medical room: BH-1 ground floor · Laundry: drop by 8 am.</p></div>
    </>
  );
}

export function Report({ api }: { api: Api }) {
  const items: [string, string][] = [["🔒", "Door lock"], ["💨", "Fan"], ["💡", "Light"], ["🚰", "Water tap"], ["🪟", "Window"], ["🧹", "Cleaning"]];
  return (
    <>
      <Bar title="Report a problem" api={api} />
      <p className="sub">Pick what is wrong. Maintenance gets it straight away and you can track it here.</p>
      <div className="fix-grid">{items.map(([i, t]) => <button key={t} aria-pressed={api.fix === t} onClick={() => api.act("fix", t)}><i>{i}</i>{t}</button>)}</div>
      <label className="afield">Anything to add? (optional)<textarea id="fixnote" rows={3} placeholder="e.g. lock does not close fully" /></label>
      <button className="cta" disabled={!api.fix} onClick={() => api.act("report")}>Send report</button>
      <p className="sub center">{api.fix ? "Room 214, BH-3 is added automatically." : "Choose an item above to continue."}</p>
    </>
  );
}

export function Settled({ api }: { api: Api }) {
  const t = api.D.room.ticket;
  return (
    <>
      <div className="settled"><div className="tick">✓</div><h2 className="h3 xl">You are settled in</h2><p className="sub">Registration is complete and Room 214 is yours.{t ? ` Your ${t.toLowerCase()} repair is tracked until it is fixed.` : ""}</p></div>
      <div className="card"><b className="h3">For your family</b><p className="sub">A status link was sent to your parent&apos;s phone: room accepted, repairs tracked, mess and medical room locations.</p></div>
      <button className="cta ghost" onClick={() => api.go("room")}>Back to my room</button>
    </>
  );
}

export const VIEWS: Record<string, (p: { api: Api }) => ReactNode> = {
  login: Login, home: Home, doc: DocDetail, review: Review, pass: Pass, log: ChangeLog, help: Help,
  gate: Gate, route: Route, ready: DeskReady, room: Room, report: Report, settled: Settled,
};
