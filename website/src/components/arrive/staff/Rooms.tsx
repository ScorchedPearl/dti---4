"use client";

import { ClipboardCheck, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { ROOM_CHECKS, fixLabel } from "@/lib/arrive/catalog";
import { api, errMsg, relTime } from "@/lib/arrive/client";
import type { Ticket } from "@/lib/arrive/types";
import { Button, Empty, Pill, Spinner, useToast } from "../ui";
import { Head, useConsole, useStaffData } from "./ConsoleShell";

type RoomRow = { id: number; block: string; number: string; wing: string; checks: boolean[] | null; passed: boolean; inspected_by: string | null; inspected_at: string | null; occupants: number; accepted: number; open: number };
type Data = { rooms: RoomRow[]; tickets: Ticket[] };

export function Rooms() {
  const toast = useToast();
  const { refreshCounts } = useConsole();
  const { data, setData } = useStaffData<Data>("/api/staff/rooms", 8000);
  const [sel, setSel] = useState<number | null>(null);
  const [checks, setChecks] = useState<boolean[]>(ROOM_CHECKS.map(() => false));
  const [busy, setBusy] = useState<string | null>(null);
  const [eta, setEta] = useState<Record<number, string>>({});
  const room = data?.rooms.find((r) => r.id === sel);

  useEffect(() => { if (room) setChecks(room.checks ?? ROOM_CHECKS.map(() => false)); }, [room?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function inspect() {
    if (!room) return;
    setBusy("inspect");
    try {
      const r = await api<Data>("/api/staff/rooms", { json: { roomId: room.id, checks } });
      setData(r);
      toast(checks.every(Boolean) ? `Room ${room.number} passed inspection` : `Room ${room.number} saved as not passed`);
    } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(null); }
  }

  async function setStatus(t: Ticket, status: Ticket["status"]) {
    setBusy(`t${t.id}`);
    try {
      const r = await api<Data>("/api/staff/tickets", { json: { id: t.id, status, eta: eta[t.id] ?? "" } });
      setData(r); refreshCounts();
      toast(`#${t.code} marked ${status}`);
    } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(null); }
  }

  const open = data?.tickets.filter((t) => t.status !== "fixed") ?? [];
  const fixed = data?.tickets.filter((t) => t.status === "fixed") ?? [];
  return (
    <div className="c-page">
      <Head title="Rooms" sub="Inspect each room before handover. A room only shows as Passed to students when all six checks are OK." />
      {!data ? <Spinner /> : (
        <div className="split even">
          <div className="stack-lg">
            <section className="card stack">
              <div className="between"><h2 className="h3">BH-3 · second floor</h2><span className="small muted">{data.rooms.filter((r) => r.passed).length} of {data.rooms.length} passed</span></div>
              <div className="rooms">
                {data.rooms.map((r) => (
                  <button key={r.id} className="roomtile" aria-pressed={sel === r.id} onClick={() => setSel(r.id)}>
                    <b>{r.number}</b>
                    {r.checks ? <Pill status={r.passed ? "ok" : "action"} label={r.passed ? "Passed" : "Failed"} /> : <Pill status="todo" label="To inspect" />}
                    <span className="tiny muted">{r.occupants ? `${r.accepted}/${r.occupants} accepted` : "Empty"}{r.open ? ` · ${r.open} open` : ""}</span>
                  </button>
                ))}
              </div>
            </section>
            {room ? (
              <section className="card stack">
                <div className="between"><h2 className="h3">Inspect room {room.number}</h2><span className="small muted">{room.wing}</span></div>
                {room.inspected_by && <p className="small muted">Last checked by {room.inspected_by}, {room.inspected_at}.</p>}
                <div>
                  {ROOM_CHECKS.map((c, i) => (
                    <div key={c} className="toggle">
                      <span>{c}</span>
                      <span className="seg" role="group" aria-label={c}>
                        <button type="button" aria-pressed={checks[i]} onClick={() => setChecks((x) => x.map((v, k) => (k === i ? true : v)))}>OK</button>
                        <button type="button" aria-pressed={!checks[i]} onClick={() => setChecks((x) => x.map((v, k) => (k === i ? false : v)))}>Fix</button>
                      </span>
                    </div>
                  ))}
                </div>
                <Button className={checks.every(Boolean) ? "accent" : ""} busy={busy === "inspect"} onClick={inspect}><ClipboardCheck size={18} />{checks.every(Boolean) ? "Save: passed" : "Save: not passed"}</Button>
              </section>
            ) : <p className="small muted">Pick a room to record an inspection.</p>}
          </div>

          <section className="card flush">
            <div className="card-head" style={{ padding: "16px 18px 0" }}><h2 className="h3">Repair tickets</h2><span className="small muted">{open.length} open</span></div>
            {!data.tickets.length ? <Empty icon={<Wrench />} title="No tickets">Students report problems from their room page.</Empty> : (
              <div>
                {[...open, ...fixed].map((t) => (
                  <div key={t.id} className="stack-sm" style={{ padding: "14px 18px", borderTop: "1px solid var(--line)" }}>
                    <div className="between wrap"><b>#{t.code} · {fixLabel(t.item)} · Room {t.room}</b><Pill status={t.status === "fixed" ? "ok" : t.status === "assigned" ? "review" : "action"} label={t.status[0].toUpperCase() + t.status.slice(1)} /></div>
                    <p className="small muted">{t.student ?? "Caretaker"} · {relTime(Date.parse(t.createdAt))}{t.note ? ` · “${t.note}”` : ""}{t.eta && t.status !== "fixed" ? ` · fix by ${t.eta}` : ""}</p>
                    {t.status !== "fixed" && (
                      <div className="row wrap">
                        {t.status === "reported" && <>
                          <input className="input" style={{ minHeight: 38, width: 170, fontSize: 14 }} placeholder="Fix by (e.g. 6:00 pm)" value={eta[t.id] ?? ""} onChange={(e) => setEta((m) => ({ ...m, [t.id]: e.target.value }))} aria-label="Fix by" />
                          <Button className="sm" busy={busy === `t${t.id}`} onClick={() => setStatus(t, "assigned")}>Assign to maintenance</Button>
                        </>}
                        <Button className="accent sm" busy={busy === `t${t.id}`} onClick={() => setStatus(t, "fixed")}>Mark fixed</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
