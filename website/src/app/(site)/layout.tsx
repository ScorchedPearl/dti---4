import type { Metadata, Viewport } from "next";
import BackToTop from "@/components/BackToTop";
// Fonts are bundled with the app (no download at build time, so deploys cannot fail on Google Fonts).
// Anthropic's own typefaces (Tiempos, Styrene) are licensed; Newsreader and DM Sans are the closest open ones.
import "@fontsource-variable/newsreader/wght.css";
import "@fontsource-variable/newsreader/wght-italic.css";
import "@fontsource-variable/dm-sans/wght.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "IIITA Registration Experience · Group 10",
  description:
    "Design Thinking project by Group 10: how first year students experience registration at IIITA, and our ReadyPass and Gate-to-Room Pass concepts. Empathize, Define and Ideate explained with motion graphics.",
};

metadata.openGraph = { title: "IIITA Registration Experience · Group 10", description: "Making IIITA registration feel certain, not stressful: research, problem framing, ideas, and a working ReadyPass and Gate-to-Room Pass app.", type: "website" };

export const viewport: Viewport = { colorScheme: "light", themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip">Skip to content</a>
        <div id="main">{children}</div>
        <BackToTop />
      </body>
    </html>
  );
}
