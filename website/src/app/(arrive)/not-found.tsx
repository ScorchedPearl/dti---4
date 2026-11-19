import { Compass } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="parent" style={{ minHeight: "100dvh", justifyContent: "center" }}>
      <div className="empty">
        <div className="ic"><Compass /></div>
        <h1 className="h2">This page does not exist</h1>
        <p>The link may be old or mistyped. Status links stop working if the pass is cancelled.</p>
        <div className="row wrap" style={{ justifyContent: "center" }}>
          <Link href="/app" className="btn">Open IIITA Arrive</Link>
          <Link href="/" className="btn ghost">Project site</Link>
        </div>
      </div>
    </main>
  );
}
