// Static catalog for IIITA Arrive: the documents, desks, FAQ and checklist history.
// Shared by the server (seed, validation) and the client (labels, hints, samples).

export type DocStatus = "todo" | "review" | "ok" | "action";
export type Proof = "self" | "notary" | "original";
export type DeskKey = "A" | "B" | "C" | "H" | "R";
export type StepStatus = "pending" | "skipped" | "waiting" | "called" | "done";
export type TicketStatus = "reported" | "assigned" | "fixed";
export type StaffRole = "admin" | "verifier" | "desk" | "warden" | "volunteer";

export type DocType = {
  id: string;
  name: string;
  short: string;
  proof: Proof;
  /** can be fetched from DigiLocker instead of scanned */
  digi?: boolean;
  /** this document is a photo of the student, run the photo quality check */
  photo?: boolean;
  /** only required for these categories */
  categories?: string[];
  /** changed in the latest checklist version */
  changed?: string;
  hint: string;
  callouts: [string, string, string];
};

export const DOC_TYPES: DocType[] = [
  { id: "jee", name: "JEE Main scorecard", short: "JEE scorecard", proof: "self", hint: "Pulled from your JoSAA record.", callouts: ["Name exactly as in JoSAA", "Application number visible", "Downloaded after results"] },
  { id: "c10", name: "Class 10 certificate (date of birth)", short: "Class 10", proof: "self", digi: true, hint: "Used as proof of date of birth.", callouts: ["Name exactly as in JoSAA", "Date of birth readable", "Board seal visible"] },
  { id: "c12", name: "Class 12 marksheet", short: "Class 12", proof: "self", digi: true, hint: "Your board has issued it to DigiLocker.", callouts: ["Name exactly as in JoSAA", "Your signature on every page", "All subjects and marks visible"] },
  { id: "cat", name: "Category certificate (OBC-NCL)", short: "Category", proof: "original", categories: ["OBC-NCL", "SC", "ST", "EWS"], hint: "Issued after 1 Apr 2026, central government format.", callouts: ["Name exactly as in JoSAA", "Central list format", "Date after 1 Apr 2026"] },
  { id: "inc", name: "Income certificate", short: "Income", proof: "self", categories: ["OBC-NCL", "EWS"], hint: "Any financial year after April 2025.", callouts: ["Name exactly as in JoSAA", "Issuing officer's signature", "Date after 1 Apr 2025"] },
  { id: "aff", name: "Anti-ragging undertaking", short: "Anti-ragging", proof: "notary", changed: "2 Jul", hint: "Fill the UGC form, sign it, then get it notarised.", callouts: ["Name exactly as in JoSAA", "Notary seal and stamp", "Date after 1 Apr 2026"] },
  { id: "med", name: "Medical fitness certificate", short: "Medical", proof: "original", hint: "Signed by a registered doctor (MBBS or above).", callouts: ["Name exactly as in JoSAA", "Doctor's seal and reg. no.", "Date after 1 Apr 2026"] },
  { id: "pho", name: "Passport-size photo", short: "Photo", proof: "self", photo: true, hint: "Daylight, plain light wall, face in focus.", callouts: ["Face centred, both ears visible", "Plain light background", "Taken after 1 Apr 2026"] },
  { id: "aad", name: "Aadhaar card", short: "Aadhaar", proof: "self", digi: true, hint: "Masked Aadhaar is fine.", callouts: ["Name exactly as in JoSAA", "Photo clearly visible", "Masked number is fine"] },
];

export const docType = (id: string) => DOC_TYPES.find((d) => d.id === id);
export const docsForCategory = (category: string) => DOC_TYPES.filter((d) => !d.categories || d.categories.includes(category));

export const PROOF: Record<Proof, { label: string; detail: string }> = {
  self: { label: "Self-attested copy", detail: "Sign each page yourself. No notary needed." },
  notary: { label: "Notarised", detail: "Needs a notary's stamp and signature. This changed on 2 Jul 2026." },
  original: { label: "Bring the original", detail: "Upload a scan now and show the original at Desk A." },
};

export const STATUS_LABEL: Record<DocStatus, string> = { todo: "To upload", review: "In review", ok: "Accepted", action: "Action needed" };

export const REJECT_REASONS = [
  "Photo is blurry and the face is shadowed. Retake it in daylight against a plain wall.",
  "Name does not match your JoSAA record. Upload a copy with your name exactly as registered.",
  "Page is cut off. Make sure all four corners are visible.",
  "Certificate is older than the allowed date. Get a fresh one issued after 1 Apr 2026.",
  "Notary seal is missing. The undertaking must be notarised.",
  "File is unreadable. Scan again in good light.",
];

export const DESKS: { key: DeskKey; name: string; where: string; minutes: number }[] = [
  { key: "A", name: "Document check", where: "Hall 1 · Desk A", minutes: 3 },
  { key: "B", name: "ID photo and student card", where: "Hall 1 · Desk B", minutes: 2 },
  { key: "C", name: "Academic section", where: "Admin block · Room 4", minutes: 3 },
  { key: "H", name: "Hostel office", where: "BH-3 ground floor", minutes: 2 },
  { key: "R", name: "Room handover", where: "Your room", minutes: 0 },
];
export const desk = (k: string) => DESKS.find((d) => d.key === k)!;

export const ROOM_CHECKS = ["Cleaned and mopped", "Fan and light work", "Water tap and drain", "Door lock", "Window and mesh", "Mattress and table"];

export const FIX_ITEMS = [
  { id: "lock", label: "Door lock" },
  { id: "fan", label: "Fan" },
  { id: "light", label: "Light" },
  { id: "tap", label: "Water tap" },
  { id: "window", label: "Window" },
  { id: "clean", label: "Cleaning" },
] as const;
export const fixLabel = (id: string) => FIX_ITEMS.find((f) => f.id === id)?.label ?? id;

export const CHANGES = [
  { v: "v3", date: "2 Jul 2026", text: "Anti-ragging undertaking must now be notarised (UGC circular, June 2026).", doc: "aff" },
  { v: "v2", date: "20 Jun 2026", text: "Income certificate accepted from any financial year after April 2025.", doc: "inc" },
  { v: "v1", date: "5 Jun 2026", text: "Checklist published.", doc: null },
] as const;
export const CHECKLIST = { version: "v3", frozenOn: "6 Jul 2026", reportingDay: "Mon 27 Jul 2026", gate: "Main gate, Deoghat", fee: 148500 };

export type Faq = { q: string; a: string; k: string[] };
export const FAQ: Faq[] = [
  { q: "Do I need the original category certificate?", a: "Yes. Upload a scan in ReadyPass and carry the original to Desk A. Source: advisory v3, item 4.", k: ["category", "obc", "caste", "sc ", "st ", "ews"] },
  { q: "Can my parents stay on campus tonight?", a: "No overnight stay for parents. The guest house in Jhalwa has rooms; book at the hostel office. Source: hostel rules 2026, 3.1.", k: ["parent", "stay", "night", "guest house"] },
  { q: "What if my fee shows pending?", a: "Payments confirm within 15 minutes. If it still shows pending after that, ask here and share the bank reference. Do not pay again.", k: ["fee", "pending", "payment", "paid", "refund"] },
  { q: "Where do I get a notary?", a: "Any notary public near your home can stamp the undertaking. On campus day there is no notary, so get it done before you travel.", k: ["notary", "notarised", "notarized", "affidavit", "undertaking"] },
  { q: "What should I bring on reporting day?", a: "Your Ready to Report pass (on this phone), the originals listed on the pass, two passport photos and a pen. Nothing else is asked for at the desks.", k: ["bring", "carry", "originals", "reporting day"] },
  { q: "Can I change my reporting slot?", a: "Yes, until 24 Jul. Open Review, pick another slot that has places, and your pass updates automatically.", k: ["slot", "reschedule", "change time", "late"] },
  { q: "When is the mess open?", a: "Breakfast 7:30 to 9:30 am, lunch 12:30 to 2:30 pm, dinner 7:30 to 9:30 pm. Your student card works from day one.", k: ["mess", "food", "dinner", "lunch", "breakfast"] },
  { q: "How do I reach the campus from the station?", a: "Prayagraj Junction is 20 km away. Prepaid autos at the station's civil lines exit cost about ₹350. On 26 and 27 Jul the institute bus leaves every hour from 7 am.", k: ["station", "reach", "bus", "auto", "airport", "travel"] },
];

export const SENIOR_FALLBACK = "The FAQ does not cover this. I have passed it to a verified senior volunteer. Expect a reply within 10 minutes.";

export function matchFaq(text: string): Faq | undefined {
  const t = ` ${text.toLowerCase()} `;
  return FAQ.find((f) => f.q.toLowerCase() === text.toLowerCase().trim()) ?? FAQ.find((f) => f.k.some((k) => t.includes(k)));
}

export const inr = (n: number) => "₹ " + n.toLocaleString("en-IN");
