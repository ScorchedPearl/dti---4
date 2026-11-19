"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-render the server component every `ms` while the tab is visible. */
export default function AutoRefresh({ ms = 20000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, ms);
    return () => clearInterval(t);
  }, [router, ms]);
  return null;
}
