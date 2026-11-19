"use client";

import { ArrowLeft, BedDouble, CircleHelp, ClipboardCheck, FileClock, ListChecks, LogOut, Navigation, RefreshCw, Ticket, WifiOff } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, initials } from "@/lib/arrive/client";
import { ToastProvider } from "../ui";
import { ArriveProvider, useArrive } from "./Provider";

type NavItem = { href: string; label: string; icon: ReactNode; badge?: number };

function useNav(): { primary: NavItem[]; groups: [string, NavItem[]][] } {
  const { s } = useArrive();
  const need = s ? s.docs.filter((d) => d.status === "action" || d.status === "todo").length : 0;
  const checkedIn = !!s?.checkin;
  const checklist = { href: "/app", label: "Checklist", icon: <ListChecks size={20} />, badge: need || undefined };
  const pass = { href: "/app/pass", label: "My pass", icon: <Ticket size={20} /> };
  const day = { href: "/app/day", label: checkedIn ? "Route" : "Reporting day", icon: <Navigation size={20} /> };
  const room = { href: "/app/room", label: "Room", icon: <BedDouble size={20} /> };
  const help = { href: "/app/help", label: "Help", icon: <CircleHelp size={20} /> };
  return {
    primary: checkedIn ? [day, room, pass, help] : [checklist, pass, day, help],
    groups: [
      ["Before travel", [checklist, { href: "/app/review", label: "Review and slot", icon: <ClipboardCheck size={20} /> }, pass, { href: "/app/changes", label: "Rule changes", icon: <FileClock size={20} /> }]],
      ["Reporting day", [{ ...day, label: "My route" }, { ...room, label: "My room" }]],
      ["Support", [help]],
    ],
  };
}

const isActive = (path: string, href: string) => (href === "/app" ? path === "/app" || path.startsWith("/app/documents") : path === href || path.startsWith(href + "/"));

function Frame({ children }: { children: ReactNode }) {
  const { s, error, refresh } = useArrive();
  const path = usePathname();
  const router = useRouter();
  const nav = useNav();
  async function signOut() {
    await api("/api/auth/logout", { method: "POST", json: {} }).catch(() => {});
    router.replace("/app/login");
    router.refresh();
  }
  return (
    <div className="shell">
      <aside className="side" aria-label="Main">
        <div className="brand"><div className="logo">IA</div><div><b style={{ fontFamily: "var(--f-h)", fontSize: 17 }}>IIITA Arrive</b><div className="tiny" style={{ color: "#8ea3bf" }}>ReadyPass · Gate-to-Room</div></div></div>
        {nav.groups.map(([g, items]) => (
          <nav key={g} aria-label={g}>
            <div className="group">{g}</div>
            {items.map((i) => (
              <Link key={i.href + i.label} href={i.href} className="navl" aria-current={isActive(path, i.href) ? "page" : undefined}>{i.icon}{i.label}{i.badge ? <span className="cnt">{i.badge}</span> : null}</Link>
            ))}
          </nav>
        ))}
        {s && (
          <div className="who">
            <div className="avatar">{initials(s.me.name)}</div>
            <div className="grow"><b>{s.me.name}</b><span className="tiny">{s.me.branch}</span></div>
            <button onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={18} /></button>
          </div>
        )}
      </aside>
      <div>
        {!s ? (
          error ? (
            <main className="main"><div className="page" style={{ paddingTop: 60 }}>
              <div className="empty"><div className="ic"><WifiOff /></div><b className="h3">Could not load your details</b><p>{error}</p><button className="btn ghost" onClick={refresh}><RefreshCw size={16} />Try again</button></div>
            </div></main>
          ) : <Loading />
        ) : children}
      </div>
      {s && (
        <nav className="tabbar" aria-label="Main">
          {nav.primary.map((i) => (
            <Link key={i.href} href={i.href} aria-current={isActive(path, i.href) ? "page" : undefined}>
              <span className="ti">{i.icon}</span>{i.label}{i.badge ? <span className="dotb" aria-label={`${i.badge} need you`} /> : null}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

function Loading() {
  return (
    <main className="main" aria-busy="true">
      <div className="page" style={{ paddingTop: 24 }}>
        <div className="skel" style={{ height: 28, width: 180 }} />
        <div className="skel" style={{ height: 150 }} />
        <div className="skel" style={{ height: 64 }} />
        <div className="skel" style={{ height: 320 }} />
      </div>
    </main>
  );
}

/** Sticky page header with optional back link and a right-hand action. */
export function Top({ title, back, action }: { title: string; back?: string; action?: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 4);
    f(); window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <header className={`topbar${scrolled ? " scrolled" : ""}`}>
      {back && <Link href={back} className="iconbtn" aria-label="Back"><ArrowLeft size={20} /></Link>}
      <h1>{title}</h1>
      {action}
    </header>
  );
}

export const HelpLink = () => <Link href="/app/help" className="iconbtn" aria-label="Help"><CircleHelp size={20} /></Link>;

export default function StudentShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ArriveProvider>
        <Frame>{children}</Frame>
      </ArriveProvider>
    </ToastProvider>
  );
}
