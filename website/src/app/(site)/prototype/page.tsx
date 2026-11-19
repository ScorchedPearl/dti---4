import type { Metadata } from "next";
import { Architects_Daughter, Exo_2 } from "next/font/google";
import ArriveBench from "@/components/prototype/ArriveBench";
import "./prototype.css";

const exo = Exo_2({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-exo" });
const sketch = Architects_Daughter({ subsets: ["latin"], weight: "400", variable: "--font-sketch" });

export const metadata: Metadata = {
  title: "IIITA Arrive Prototype · Group 10",
  description: "Assignment 4 clickable prototype of ReadyPass (PS-1) and Gate-to-Room Pass (PS-2), with wireframe mode and a built-in usability-test kit.",
};

export default function PrototypePage() {
  return (
    <div className={`${exo.variable} ${sketch.variable}`}>
      <ArriveBench />
    </div>
  );
}
