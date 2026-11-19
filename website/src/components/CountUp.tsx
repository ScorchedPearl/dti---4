"use client";

import { useEffect, useRef, useState } from "react";

/** Counts a number up once when it scrolls into view. "≥16" keeps its prefix; reduced-motion users see the final value. */
export default function CountUp({ value }: { value: string }) {
  const m = value.match(/^(\D*)(\d+)(\D*)$/);
  const ref = useRef<HTMLSpanElement>(null);
  const target = m ? Number(m[2]) : 0;
  const [n, setN] = useState(target);

  useEffect(() => {
    if (!m || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    setN(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / 1100);
        setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!m) return <>{value}</>;
  return <span ref={ref} aria-label={value}>{m[1]}{n}{m[3]}</span>;
}
