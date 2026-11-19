"use client";

import { CameraOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (o: { formats: string[] }) => Detector;

/** True when this browser can read QR codes from the camera (Chrome on Android, Edge, recent Safari). */
export const canScan = () => typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;

/** Live camera view that calls onCode once with the first QR code it reads. */
export default function Scanner({ onCode }: { onCode: (text: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  const done = useRef(false);
  const cb = useRef(onCode);
  cb.current = onCode;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let live = true;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (!live || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const det = new (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector({ formats: ["qr_code"] });
        const tick = async () => {
          if (!live || done.current || !video.current) return;
          try {
            const r = await det.detect(video.current);
            if (r[0]?.rawValue) { done.current = true; cb.current(r[0].rawValue); return; }
          } catch { /* frame not ready */ }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setErr("Camera is blocked. Allow camera access in your browser, or type the code instead.");
      }
    })();
    return () => { live = false; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  if (err) return <div className="banner warn"><CameraOff size={18} /><span>{err}</span></div>;
  return <video ref={video} className="video" muted playsInline aria-label="Camera view for scanning a QR code" />;
}
