import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono, Newsreader } from "next/font/google";
import BackToTop from "@/components/BackToTop";
import "./globals.css";

// Anthropic's own typefaces (Tiempos for headlines, Styrene for UI text) are licensed,
// so these are the closest open ones: Newsreader (serif) and DM Sans (geometric sans).
const display = Newsreader({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-display" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "IIITA Registration Experience · Group 10",
  description:
    "Design Thinking project by Group 10: how first year students experience registration at IIITA, and our ReadyPass and Gate-to-Room Pass concepts. Empathize, Define and Ideate explained with motion graphics.",
};

metadata.openGraph = { title: "IIITA Registration Experience · Group 10", description: "Making IIITA registration feel certain, not stressful: research, problem framing, ideas, and a working ReadyPass and Gate-to-Room Pass app.", type: "website" };

export const viewport: Viewport = { colorScheme: "light", themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <a href="#main" className="skip">Skip to content</a>
        <div id="main">{children}</div>
        <BackToTop />
      </body>
    </html>
  );
}
