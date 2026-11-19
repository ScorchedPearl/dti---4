"use client";

import { BellRing } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { desk } from "@/lib/arrive/catalog";
import { ApiError, api, errMsg } from "@/lib/arrive/client";
import type { StudentState } from "@/lib/arrive/types";
import { Button, usePoll, useToast } from "../ui";

type Ctx = {
  s: StudentState | null;
  error: string | null;
  refresh: () => Promise<void>;
  /** POST to an /api/me endpoint that returns fresh state; returns the raw response. */
  run: <T = StudentState>(path: string, init?: { json?: unknown; form?: FormData }) => Promise<T>;
};
const C = createContext<Ctx | null>(null);
export function useArrive() {
  const c = useContext(C);
  if (!c) throw new Error("useArrive outside provider");
  return c;
}
/** For pages that render only once state has loaded. */
export const useStudent = () => useArrive().s!;

export function ArriveProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState<StudentState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);

  const onErr = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) { router.replace("/app/login"); return true; }
    return false;
  }, [router]);

  const refresh = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try { setS(await api<StudentState>("/api/me")); setError(null); }
    catch (e) { if (!onErr(e)) setError(errMsg(e)); }
    finally { inflight.current = false; }
  }, [onErr]);

  const run = useCallback(async <T,>(path: string, init?: { json?: unknown; form?: FormData }) => {
    try {
      const r = await api<T>(path, { method: "POST", json: init?.form ? undefined : (init?.json ?? {}), form: init?.form });
      if (r && typeof r === "object" && "docs" in (r as object)) setS(r as unknown as StudentState);
      return r;
    } catch (e) {
      onErr(e);
      throw e;
    }
  }, [onErr]);

  useEffect(() => { refresh(); }, [refresh]);

  // Poll faster while something live is happening: a queue, or a question waiting on a senior.
  const live = !!s && (s.route.some((r) => r.status === "waiting" || r.status === "called") || s.chat.some((m) => m.author === "bot" && m.name === "IIITA Help" && !s.chat.some((x) => x.author === "volunteer" && x.at > m.at)));
  const anyReview = !!s && s.docs.some((d) => d.status === "review");
  usePoll(refresh, live ? 3000 : anyReview ? 6000 : 15000, !!s);

  // Toast when a document's status changes under us (staff reviewed it).
  const prev = useRef<StudentState | null>(null);
  useEffect(() => {
    const p = prev.current;
    if (p && s) {
      for (const d of s.docs) {
        const before = p.docs.find((x) => x.id === d.id);
        if (before?.status === "review" && d.status === "ok") toast("A document was accepted");
        if (before?.status === "review" && d.status === "action") toast("A document needs your attention", "error");
      }
      const pv = p.chat.filter((m) => m.author === "volunteer").length;
      if (s.chat.filter((m) => m.author === "volunteer").length > pv) toast("A senior volunteer replied");
    }
    prev.current = s;
  }, [s, toast]);

  return (
    <C.Provider value={{ s, error, refresh, run }}>
      {children}
      {s && <DeskAlert />}
    </C.Provider>
  );
}

/** Full-screen "it is your turn" alert. Vibrates and raises a system notification once per call. */
function DeskAlert() {
  const { s, run } = useArrive();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const called = s!.route.find((r) => r.status === "called" && !r.ack);
  const seen = useRef<number | null>(null);

  useEffect(() => {
    if (!called?.calledAt || seen.current === called.calledAt) return;
    seen.current = called.calledAt;
    const d = desk(called.desk);
    try { navigator.vibrate?.([300, 120, 300, 120, 600]); } catch { /* not supported */ }
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
      try { new Notification(`Go to Desk ${d.key} now`, { body: `${d.name} · ${d.where}. Your place is held for 5 minutes.`, tag: "arrive-desk" }); } catch { /* blocked */ }
    }
  }, [called]);

  if (!called) return null;
  const d = desk(called.desk);
  return (
    <div className="alert-full" role="alertdialog" aria-modal="true" aria-labelledby="desk-alert-title">
      <div className="pulse"><BellRing size={42} /></div>
      <div className="eyebrow">It is your turn</div>
      <div className="big" id="desk-alert-title">Go to Desk {d.key}</div>
      <p><b>{d.name}</b><br />{d.where}</p>
      <p style={{ opacity: .85, fontSize: 14 }}>Desk staff will hold your place for 5 minutes.</p>
      <Button className="light" busy={busy} autoFocus onClick={async () => {
        setBusy(true);
        try { await run("/api/me/ack"); toast(`On your way to Desk ${d.key}`); } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); }
      }}>I am on my way</Button>
    </div>
  );
}
