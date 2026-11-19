import type { Metadata, Viewport } from "next";
// Bundled fonts (no download at build time). Anthropic's own typefaces are licensed; these are the closest open ones.
import "@fontsource-variable/newsreader/wght.css";
import "@fontsource-variable/dm-sans/wght.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./arrive.css";

export const metadata: Metadata = {
  title: { default: "IIITA Arrive", template: "%s · IIITA Arrive" },
  description: "ReadyPass and Gate-to-Room Pass: get every registration document accepted before you travel, then move from the gate to a ready room on reporting day.",
  applicationName: "IIITA Arrive",
};

export const viewport: Viewport = { themeColor: "#f3f7fc", colorScheme: "light", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function ArriveRoot({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
