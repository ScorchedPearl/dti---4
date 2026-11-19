"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import QRCode from "qrcode";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { STATUS_LABEL, type DocStatus } from "@/lib/arrive/catalog";

/* ------------------------------------------------------------------ status pill */
export function Pill({ status, label }: { status: DocStatus | "navy"; label?: string }) {
  return (
    <span className={`pill ${status}`}>
      <span className="light" aria-hidden />
      {label ?? (status === "navy" ? "" : STATUS_LABEL[status])}
    </span>
  );
}

export const Spinner = ({ label }: { label?: string }) => <span className="spin" role="status" aria-label={label ?? "Loading"} />;

export function Button({ busy, children, className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button {...p} className={`btn ${className}`} disabled={p.disabled || busy} aria-busy={busy || undefined}>
      {busy && <span className="spin" aria-hidden />}
      {children}
    </button>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <div className="form-error" role="alert"><AlertCircle size={16} />{children}</div>;
}

/* ------------------------------------------------------------------ progress ring */
export function Ring({ n, total, size = 104 }: { n: number; total: number; size?: number }) {
  const r = 42, c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => { const t = requestAnimationFrame(() => setShown(n)); return () => cancelAnimationFrame(t); }, [n]);
  return (
    <svg className="ring" style={{ width: size, height: size }} viewBox="0 0 104 104" role="img" aria-label={`${n} of ${total} accepted`}>
      <circle cx="52" cy="52" r={r} fill="none" stroke="var(--todo-bg)" strokeWidth="11" />
      <circle cx="52" cy="52" r={r} fill="none" stroke={n === total ? "var(--ok)" : "var(--teal)"} strokeWidth="11" strokeLinecap="round"
        strokeDasharray={`${total ? (c * shown) / total : 0} ${c}`} transform="rotate(-90 52 52)" />
      <text x="52" y="52" textAnchor="middle" fontSize="25" fontWeight="800" fill="var(--ink)" fontFamily="var(--f-h)">{n}/{total}</text>
      <text x="52" y="69" textAnchor="middle" fontSize="11" fill="var(--sub)" fontWeight="600">accepted</text>
    </svg>
  );
}

/* ------------------------------------------------------------------ QR */
export function Qr({ value, label }: { value: string; label: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let live = true;
    QRCode.toString(value, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0e2542", light: "#ffffff" } })
      .then((s) => { if (live) setSvg(s); })
      .catch(() => {});
    return () => { live = false; };
  }, [value]);
  if (!svg) return <div className="skel" style={{ aspectRatio: "1" }} aria-hidden />;
  return <div className="qr" role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/* ------------------------------------------------------------------ sheet / dialog */
export function Sheet({ open, onClose, title, children, labelledBy }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    el?.querySelector<HTMLElement>("button, [href], input, textarea, select")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && el) {
        const f = [...el.querySelectorAll<HTMLElement>("button:not(:disabled), [href], input, textarea, select")];
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={labelledBy ?? "sheet-title"} ref={ref}>
        <div className="grab" aria-hidden />
        {title && (
          <div className="sheet-head">
            <h2 className="h2" id="sheet-title">{title}</h2>
            <button className="iconbtn" onClick={onClose} aria-label="Close"><X size={18} /></button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ toasts */
type Toast = { id: number; text: string; kind: "ok" | "error" };
const ToastCtx = createContext<(text: string, kind?: "ok" | "error") => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setItems((t) => [...t.slice(-2), { id, text, kind }]);
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), kind === "error" ? 5000 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind === "error" ? "error" : ""}`} role={t.kind === "error" ? "alert" : "status"}>
            {t.kind === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}{t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="ic">{icon}</div>
      <b className="h3">{title}</b>
      {children}
    </div>
  );
}

/** Poll `fn` every `ms` while the tab is visible. */
export function usePoll(fn: () => void, ms: number, on = true) {
  const f = useRef(fn);
  f.current = fn;
  useEffect(() => {
    if (!on) return;
    const tick = () => { if (document.visibilityState === "visible") f.current(); };
    const t = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, [ms, on]);
}
