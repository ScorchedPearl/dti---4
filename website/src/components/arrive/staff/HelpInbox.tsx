"use client";

import { BadgeCheck, MessagesSquare, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, errMsg, relTime } from "@/lib/arrive/client";
import type { ChatMsg } from "@/lib/arrive/types";
import { Empty, Pill, Spinner, useToast } from "../ui";
import { Head, useConsole, useStaffData } from "./ConsoleShell";

type Thread = { id: number; name: string; branch: string; last: string; at: number; open: number };

export function HelpInbox() {
  const toast = useToast();
  const { refreshCounts } = useConsole();
  const { data, setData } = useStaffData<{ threads: Thread[] }>("/api/staff/help", 5000);
  const [sel, setSel] = useState<number | null>(null);
  const cur = data?.threads.find((t) => t.id === sel) ?? data?.threads[0];
  const msgs = useStaffData<{ messages: ChatMsg[] }>(cur ? `/api/staff/help/${cur.id}` : "/api/staff/help", 4000);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const list = cur && msgs.data && "messages" in msgs.data ? msgs.data.messages : null;
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [list?.length, cur?.id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!cur || text.trim().length < 2) return;
    setBusy(true);
    try {
      const r = await api<{ messages: ChatMsg[]; threads: Thread[] }>(`/api/staff/help/${cur.id}`, { json: { text } });
      msgs.setData({ messages: r.messages });
      setData({ threads: r.threads });
      setText(""); refreshCounts();
      toast(`Reply sent to ${cur.name}`);
    } catch (err) { toast(errMsg(err), "error"); } finally { setBusy(false); }
  }

  return (
    <div className="c-page">
      <Head title="Help inbox" sub="Questions the official FAQ could not answer. Students are told a senior replies within 10 minutes." />
      {!data ? <Spinner /> : !data.threads.length ? (
        <section className="card"><Empty icon={<MessagesSquare />} title="Inbox is clear">When the FAQ cannot answer a student, their question lands here.</Empty></section>
      ) : (
        <div className="split">
          <section className="card flush" aria-label="Conversations">
            {data.threads.map((t) => (
              <button key={t.id} className="qitem" aria-current={cur?.id === t.id} onClick={() => setSel(t.id)}>
                <b>{t.name}</b>{t.open ? <Pill status="action" label="Waiting" /> : <span className="tiny faint">{relTime(t.at)}</span>}
                <span className="small muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.last}</span>
              </button>
            ))}
          </section>
          {cur && (
            <section className="card stack">
              <div className="between"><div><h2 className="h3">{cur.name}</h2><p className="small muted">{cur.branch}</p></div>{cur.open ? <Pill status="action" label={`Asked ${relTime(cur.at)}`} /> : <Pill status="ok" label="Answered" />}</div>
              <div className="chat" style={{ maxHeight: 460, overflowY: "auto", padding: 4 }}>
                {!list ? <Spinner /> : list.map((m) => (
                  <div key={m.id} className={`msg ${m.author === "student" ? "bot" : m.author === "volunteer" ? "student" : "volunteer"}`} style={m.author === "student" ? undefined : { alignSelf: "flex-end" }}>
                    <small style={m.author === "volunteer" ? { color: "#a7ecdf" } : undefined}>{m.author === "student" ? cur.name : m.author === "volunteer" ? <><BadgeCheck size={13} />{m.name}</> : m.name}</small>
                    {m.body}
                  </div>
                ))}
                <div ref={end} />
              </div>
              <form className="row" onSubmit={send}>
                <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Reply to ${cur.name.split(" ")[0]}…`} aria-label="Reply" maxLength={800} />
                <button className="btn accent" disabled={busy || text.trim().length < 2} aria-label="Send reply"><Send size={18} /></button>
              </form>
              <p className="tiny faint">Your name and “verified volunteer” appear with your reply. If you are not sure, check with the office first.</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
