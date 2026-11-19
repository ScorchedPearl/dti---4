"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";

export default function ArriveError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="parent" style={{ minHeight: "100dvh", justifyContent: "center" }}>
      <div className="empty" role="alert">
        <div className="ic" style={{ background: "var(--bad-bg)", color: "var(--bad)" }}><TriangleAlert /></div>
        <h1 className="h2">Something went wrong</h1>
        <p>Your data is safe. Try again, and if it keeps happening, ask at the help desk.</p>
        <button className="btn" onClick={reset}><RefreshCw size={16} />Try again</button>
      </div>
    </main>
  );
}
