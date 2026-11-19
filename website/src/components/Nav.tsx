"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import styles from "./Nav.module.css";

const LINKS = [
  ["problem", "Problem"],
  ["empathize", "Empathize"],
  ["define", "Define · A2"],
  ["ideate", "Ideate · A3"],
  ["solution", "Solution"],
  ["team", "Team"],
];

export default function Nav() {
  const [active, setActive] = useState("problem");
  const [progress, setProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      setProgress(h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight));
      setScrolled(h.scrollTop > 8);
      let cur = "problem";
      for (const [id] of LINKS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < 140) cur = id;
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={`${styles.nav} ${scrolled || open ? styles.solid : ""}`}>
      <div className={`container ${styles.inner}`}>
        <a href="#top" className={styles.brand} onClick={() => setOpen(false)}>
          <span>G10</span> IIITA Registration
        </a>

        <nav aria-label="Sections" className={styles.links}>
          {LINKS.map(([id, l]) => (
            <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined} className={active === id ? styles.on : undefined}>
              {l}
            </a>
          ))}
          <span className={styles.sep} aria-hidden />
          <Link href="/prototype" className={styles.proto}>Prototype · A4</Link>
          <a href="/app/login" className={styles.app}>Open the app</a>
        </nav>

        <button
          type="button"
          className={styles.burger}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Sections" className={styles.sheet}>
          <div className={`container ${styles.sheetIn}`}>
            {LINKS.map(([id, l]) => (
              <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined} className={active === id ? styles.on : undefined} onClick={() => setOpen(false)}>
                {l}
              </a>
            ))}
            <Link href="/prototype" onClick={() => setOpen(false)}>Prototype · A4</Link>
            <a href="/app/login" className={styles.appM}>Open the app →</a>
          </div>
        </nav>
      )}
      <div className={styles.progress} style={{ transform: `scaleX(${progress})` }} />
    </header>
  );
}
