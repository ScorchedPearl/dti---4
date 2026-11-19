"use client";

import { Activity, BadgeCheck, BedDouble, CreditCard, FileSearch, MessagesSquare, ScanLine, Users } from "lucide-react";
import Link from "next/link";
import { docType, fixLabel } from "@/lib/arrive/catalog";
import { relTime } from "@/lib/arrive/client";
import { Spinner } from "../ui";
import { Head, ROLE_LABEL, can, useConsole, useStaffData } from "./ConsoleShell";

type O = {
  students: number; passes: number; toReview: number; checkedIn: number; settled: number; openTickets: number; openHelp: number; feePending: number;
  desks: { key: string; name: string; waiting: number; called: number; done: number }[];
  activity: { action: string; detail: string | null; at: string; student: string | null; staff: string | null }[];
};

function describe(a: O["activity"][number]) {
  const doc = a.detail ? docType(a.detail)?.short : "";
  const map: Record<string, string> = {
    "doc.upload": `${a.student} uploaded ${doc}`,
    "doc.digilocker": `${a.student} fetched ${doc} from DigiLocker`,
    "doc.accept": `${a.staff} accepted ${a.student}'s ${doc}`,
    "doc.reject": `${a.staff} asked ${a.student} to redo ${doc}`,
    "pass.issue": `${a.student} got a Ready to Report pass`,
    "slot.change": `${a.student} changed slot`,
    "gate.checkin": `${a.student} checked in, token #${a.detail}`,
    "desk.call": `Desk ${a.detail} called ${a.student}`,
    "desk.done": `${a.student} finished ${a.detail === "R" ? "room handover" : `Desk ${a.detail}`}`,
    "desk.requeue": `${a.student} went back in line at Desk ${a.detail}`,
    "ticket.open": `${a.student} reported: ${fixLabel(a.detail ?? "")}`,
    "help.reply": `${a.staff} replied to ${a.student}`,
    "room.inspect": `${a.staff} inspected a room`,
    "student.add": `${a.staff} added ${a.student}`,
    "fee.confirm": `${a.staff} confirmed ${a.student}'s fee`,
  };
  return map[a.action] ?? (a.action.startsWith("ticket.") ? `${a.staff} marked ticket ${a.detail} ${a.action.split(".")[1]}` : a.action);
}

export function Overview() {
  const { me } = useConsole();
  const { data: d } = useStaffData<O>("/api/staff/overview", 6000);
  const tiles: { l: string; v: number | undefined; icon: React.ReactNode; href?: string; alert?: boolean; show: boolean }[] = [
    { l: "Students", v: d?.students, icon: <Users size={15} />, href: "/staff/students", show: can(me, "verifier") },
    { l: "Waiting for review", v: d?.toReview, icon: <FileSearch size={15} />, href: "/staff/documents", alert: !!d?.toReview, show: can(me, "verifier") },
    { l: "Passes issued", v: d?.passes, icon: <BadgeCheck size={15} />, show: true },
    { l: "Fee unconfirmed", v: d?.feePending, icon: <CreditCard size={15} />, href: "/staff/students", show: me.role === "admin" },
    { l: "Checked in", v: d?.checkedIn, icon: <ScanLine size={15} />, href: "/staff/gate", show: true },
    { l: "Settled in rooms", v: d?.settled, icon: <BedDouble size={15} />, href: "/staff/rooms", show: true },
    { l: "Open repair tickets", v: d?.openTickets, icon: <BedDouble size={15} />, href: "/staff/rooms", alert: !!d?.openTickets, show: can(me, "warden") },
    { l: "Questions for seniors", v: d?.openHelp, icon: <MessagesSquare size={15} />, href: "/staff/help", alert: !!d?.openHelp, show: can(me, "volunteer") },
  ];
  return (
    <div className="c-page">
      <Head title="Overview" sub={`Signed in as ${me.name} · ${ROLE_LABEL[me.role]}${me.title && me.title !== ROLE_LABEL[me.role] ? ` · ${me.title}` : ""}`} />
      <div className="stats">
        {tiles.filter((t) => t.show).map((t) => {
          const body = (<><span className="l">{t.icon}{t.l}</span><span className="v">{t.v ?? "–"}</span></>);
          return t.href ? <Link key={t.l} href={t.href} className={`stat${t.alert ? " alert" : ""}`}>{body}</Link> : <div key={t.l} className="stat">{body}</div>;
        })}
      </div>
      <div className="split even">
        <section className="card flush">
          <div className="card-head" style={{ padding: "16px 18px 0" }}><h2 className="h3">Desks right now</h2>{can(me, "desk") && <Link href="/staff/desks" className="small">Open desks</Link>}</div>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Desk</th><th>Waiting</th><th>Called</th><th>Done</th></tr></thead>
            <tbody>{d ? d.desks.map((k) => (
              <tr key={k.key}><td><b>{k.key}</b> · {k.name}</td><td className="num"><b>{k.waiting}</b></td><td className="num">{k.called}</td><td className="num">{k.done}</td></tr>
            )) : <tr><td colSpan={4}><Spinner /></td></tr>}</tbody>
          </table></div>
        </section>
        <section className="card">
          <div className="card-head"><h2 className="h3">Recent activity</h2><Activity size={18} color="var(--faint)" /></div>
          {!d ? <Spinner /> : d.activity.length ? (
            <div className="stack-sm">
              {d.activity.map((a, i) => (
                <div key={i} className="between small" style={{ padding: "6px 0", borderBottom: i < d.activity.length - 1 ? "1px solid var(--line)" : 0 }}>
                  <span>{describe(a)}</span><span className="faint tiny" style={{ whiteSpace: "nowrap" }}>{relTime(Date.parse(a.at))}</span>
                </div>
              ))}
            </div>
          ) : <p className="muted small">Nothing yet today. Actions by students and staff show up here.</p>}
        </section>
      </div>
    </div>
  );
}
