"use client";

import { BedDouble, FileSearch, LayoutDashboard, LogOut, MessagesSquare, ScanLine, Users, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { StaffRole } from "@/lib/arrive/catalog";
import { api, initials } from "@/lib/arrive/client";
import type { StaffMe } from "@/lib/arrive/types";
import { ToastProvider, usePoll } from "../ui";

type Counts = { toReview: number; openHelp: number; openTickets: number };
const Ctx = createContext<{ me: StaffMe; counts: Counts | null; refreshCounts: () => void } | null>(null);
export const useConsole = () => useContext(Ctx)!;
export const can = (me: StaffMe, ...roles: StaffRole[]) => me.role === "admin" || roles.includes(me.role);

export const ROLE_LABEL: Record<StaffRole, string> = { admin: "Admin", verifier: "Verifier", desk: "Desk and gate", warden: "Warden", volunteer: "Senior volunteer" };

export default function ConsoleShell({ me, children }: { me: StaffMe; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [counts, setCounts] = useState<Counts | null>(null);
  const refreshCounts = useCallback(() => {
    api<Counts>("/api/staff/overview").then(setCounts).catch((e) => { if (e?.status === 401) router.replace("/staff/login"); });
  }, [router]);
  useEffect(() => { refreshCounts(); }, [refreshCounts, path]);
  usePoll(refreshCounts, 10000);

  const nav: { href: string; label: string; icon: ReactNode; show: boolean; cnt?: number }[] = [
    { href: "/staff", label: "Overview", icon: <LayoutDashboard size={19} />, show: true },
    { href: "/staff/documents", label: "Documents", icon: <FileSearch size={19} />, show: can(me, "verifier"), cnt: counts?.toReview },
    { href: "/staff/gate", label: "Gate", icon: <ScanLine size={19} />, show: can(me, "desk") },
    { href: "/staff/desks", label: "Desks", icon: <UsersRound size={19} />, show: can(me, "desk") },
    { href: "/staff/rooms", label: "Rooms", icon: <BedDouble size={19} />, show: can(me, "warden"), cnt: counts?.openTickets },
    { href: "/staff/help", label: "Help inbox", icon: <MessagesSquare size={19} />, show: can(me, "volunteer"), cnt: counts?.openHelp },
    { href: "/staff/students", label: "Students", icon: <Users size={19} />, show: can(me, "verifier") },
  ];
  async function signOut() {
    await api("/api/staff/logout", { method: "POST", json: {} }).catch(() => {});
    router.replace("/staff/login");
    router.refresh();
  }
  return (
    <ToastProvider>
      <Ctx.Provider value={{ me, counts, refreshCounts }}>
        <div className="console">
          <aside className="c-side">
            <div className="brand"><div className="logo">IA</div><span><b style={{ fontFamily: "var(--f-h)", fontSize: 16 }}>IIITA Arrive</b><span className="tiny" style={{ display: "block", color: "#8ea3bf" }}>Staff console</span></span></div>
            <nav aria-label="Console">
              {nav.filter((n) => n.show).map((n) => (
                <Link key={n.href} href={n.href} className="navl" aria-current={(n.href === "/staff" ? path === n.href : path.startsWith(n.href)) ? "page" : undefined}>
                  {n.icon}{n.label}{n.cnt ? <span className="cnt" style={{ marginLeft: "auto" }}>{n.cnt}</span> : null}
                </Link>
              ))}
            </nav>
            <button className="iconbtn c-out" onClick={signOut} aria-label="Sign out" style={{ background: "transparent", color: "#b5c4d8", borderColor: "rgba(255,255,255,.15)" }}><LogOut size={18} /></button>
            <div className="who">
              <div className="avatar">{initials(me.name)}</div>
              <div className="grow"><b>{me.name}</b><span style={{ color: "#8ea3bf" }}>{ROLE_LABEL[me.role]}</span></div>
              <button className="iconbtn" onClick={signOut} aria-label="Sign out" title="Sign out" style={{ background: "transparent", color: "#b5c4d8", border: 0 }}><LogOut size={18} /></button>
            </div>
          </aside>
          <main className="c-main">{children}</main>
        </div>
      </Ctx.Provider>
    </ToastProvider>
  );
}

export function Head({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="c-head">
      <div className="stack-sm"><h1 className="h1">{title}</h1>{sub && <p className="muted">{sub}</p>}</div>
      {children && <div className="row wrap">{children}</div>}
    </div>
  );
}

/** Fetch a staff endpoint, keep it fresh, and expose a setter for mutation responses. */
export function useStaffData<T>(path: string, ms = 5000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const load = useCallback(() => {
    api<T>(path).then((d) => { setData(d); setError(null); }).catch((e) => {
      if (e?.status === 401) router.replace("/staff/login");
      else setError(e.message);
    });
  }, [path, router]);
  useEffect(() => { load(); }, [load]);
  usePoll(load, ms);
  return { data, setData, error, reload: load };
}
