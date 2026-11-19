import type { CSSProperties } from "react";
import type { Metadata } from "next";
import "@fontsource-variable/exo-2/wght.css";
import "@fontsource/architects-daughter/400.css";
import ArriveBench from "@/components/prototype/ArriveBench";
import "./prototype.css";

export const metadata: Metadata = {
  title: "IIITA Arrive Prototype · Group 10",
  description: "Assignment 4 clickable prototype of ReadyPass (PS-1) and Gate-to-Room Pass (PS-2), with wireframe mode and a built-in usability-test kit.",
};

const fonts = { "--font-exo": '"Exo 2 Variable"', "--font-sketch": '"Architects Daughter"' } as CSSProperties;

export default function PrototypePage() {
  return (
    <div style={fonts}>
      <ArriveBench />
    </div>
  );
}
