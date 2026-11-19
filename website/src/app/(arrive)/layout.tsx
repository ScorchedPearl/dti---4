import type { Metadata, Viewport } from "next";
import { Exo_2, Inter } from "next/font/google";
import "./arrive.css";

const head = Exo_2({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--f-head" });
const text = Inter({ subsets: ["latin"], variable: "--f-text" });

export const metadata: Metadata = {
  title: { default: "IIITA Arrive", template: "%s · IIITA Arrive" },
  description: "ReadyPass and Gate-to-Room Pass: get every registration document accepted before you travel, then move from the gate to a ready room on reporting day.",
  applicationName: "IIITA Arrive",
};

export const viewport: Viewport = { themeColor: "#17375e", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function ArriveRoot({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${head.variable} ${text.variable}`}>
      <body>{children}</body>
    </html>
  );
}
