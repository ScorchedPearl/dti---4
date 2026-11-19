import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono, Newsreader } from "next/font/google";
import "./arrive.css";

// Anthropic's own typefaces (Tiempos, Styrene) are licensed; Newsreader and DM Sans are the closest open ones.
const head = Newsreader({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--f-head" });
const text = DM_Sans({ subsets: ["latin"], variable: "--f-text" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--f-mono" });

export const metadata: Metadata = {
  title: { default: "IIITA Arrive", template: "%s · IIITA Arrive" },
  description: "ReadyPass and Gate-to-Room Pass: get every registration document accepted before you travel, then move from the gate to a ready room on reporting day.",
  applicationName: "IIITA Arrive",
};

export const viewport: Viewport = { themeColor: "#f3f7fc", colorScheme: "light", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function ArriveRoot({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${head.variable} ${text.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
