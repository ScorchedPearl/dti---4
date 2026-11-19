// Content and test tasks for the IIITA Arrive prototype (Assignment 4).
// ReadyPass (PS-1) and Gate-to-Room Pass (PS-2) come from the Assignment 3 concepts.

export type Status = "ok" | "review" | "action" | "todo" | "checking";
export type Proof = "self" | "notary" | "original";
export type Doc = { id: string; name: string; status: Status; via?: string; proof: Proof; digi?: boolean; bad?: "blur" | "large"; reason?: string; changed?: boolean };
export type Step = { k: string; t: string; w: string; st: "skip" | "done" | "now" | "later"; ahead?: number; note?: string };
export type Msg = { me?: boolean; who?: string; text: string };
export type Data = {
  docs: Doc[]; slot: number | null; pass: boolean; lang: "en" | "hi"; signedIn: boolean;
  checkedIn: boolean; route: Step[]; room: { accepted: boolean; ticket: string | null }; chat: Msg[];
};
export type Concept = "ready" | "gate";

export const DOCS: Doc[] = [
  { id: "jee", name: "JEE Main scorecard", status: "ok", via: "From JoSAA", proof: "self" },
  { id: "c10", name: "Class 10 certificate (date of birth)", status: "ok", via: "From DigiLocker", proof: "self" },
  { id: "c12", name: "Class 12 marksheet", status: "todo", digi: true, proof: "self" },
  { id: "cat", name: "Category certificate (OBC-NCL)", status: "review", proof: "original" },
  { id: "inc", name: "Income certificate", status: "todo", proof: "self", bad: "large" },
  { id: "aff", name: "Anti-ragging undertaking", status: "todo", proof: "notary", changed: true },
  { id: "med", name: "Medical fitness certificate", status: "ok", via: "Uploaded 18 Jun", proof: "original" },
  { id: "pho", name: "Passport-size photo", status: "action", reason: "Photo is blurry and the face is shadowed. Retake it in daylight against a plain wall.", proof: "self", bad: "blur" },
  { id: "aad", name: "Aadhaar card", status: "ok", via: "From DigiLocker", proof: "self" },
];

export const PROOF: Record<Proof, [string, string]> = {
  self: ["Self-attested copy", "Sign each page yourself. No notary needed."],
  notary: ["Notarised", "Needs a notary stamp and signature. Changed on 2 Jul."],
  original: ["Bring the original", "Upload a scan now and show the original at Desk A."],
};

export const SLOTS: [string, string, string][] = [
  ["Mon 27 Jul", "09:30 to 10:30", "full"],
  ["Mon 27 Jul", "10:30 to 11:30", "12 places left"],
  ["Mon 27 Jul", "14:00 to 15:00", "31 places left"],
];

export const ROUTE: Step[] = [
  { k: "A", t: "Document check", w: "Hall 1 · Desk A", st: "skip", note: "Green lane: verified through ReadyPass" },
  { k: "B", t: "ID photo and student card", w: "Hall 1 · Desk B", st: "now", ahead: 6 },
  { k: "C", t: "Academic section", w: "Admin block · Room 4", st: "later", ahead: 2 },
  { k: "H", t: "Hostel office", w: "BH-3 ground floor", st: "later", ahead: 1 },
  { k: "R", t: "Room 214, BH-3", w: "Second floor, east wing", st: "later" },
];

export const FAQ = [
  { q: "Do I need the original category certificate?", a: "Yes. Upload a scan in ReadyPass and carry the original to Desk A. Source: advisory v3, item 4.", k: ["category", "original", "obc"] },
  { q: "Can my parents stay on campus tonight?", a: "No overnight stay for parents. The guest house in Jhalwa has rooms; book at the hostel office. Source: hostel rules 2026, 3.1.", k: ["parent", "stay", "night", "guest"] },
  { q: "What if my fee shows pending?", a: "Payments confirm within 15 minutes. If it still shows pending after that, open Help and share the bank reference. Do not pay again.", k: ["fee", "pending", "payment", "paid"] },
];

export const SCREENS: Record<Concept, [string, string][]> = {
  ready: [["login", "Sign in"], ["home", "My checklist"], ["doc", "Document detail and upload"], ["review", "Review and reporting slot"], ["pass", "Ready to Report pass"], ["log", "Rule changes"], ["help", "Help: FAQ and senior"]],
  gate: [["gate", "Check in at the gate"], ["route", "My route and live wait"], ["ready", "Your desk is ready"], ["help", "Help: senior buddy"], ["room", "Room handover"], ["report", "Report a problem"], ["settled", "Settled"]],
};

export type Task = { id: string; t: string; ev: string | null };
export const TASKS: Record<Concept, Task[]> = {
  ready: [
    { id: "R1", t: "Find the document that was rejected and why.", ev: "open:pho" },
    { id: "R2", t: "Fix the rejected passport photo.", ev: "ok:pho" },
    { id: "R3", t: "Add your Class 12 marksheet without scanning anything.", ev: "ok:c12" },
    { id: "R4", t: "Find out if the anti-ragging undertaking needs a notary.", ev: "open:aff" },
    { id: "R5", t: "Book a reporting slot and get your Ready to Report pass.", ev: "pass" },
    { id: "R6", t: "Send your parent a summary of the pass in Hindi.", ev: "share:hi" },
  ],
  gate: [
    { id: "G1", t: "You have reached the campus gate. Check in.", ev: "checkin" },
    { id: "G2", t: "Tell me how many people are ahead of you at your next desk.", ev: null },
    { id: "G3", t: "Ask if you can leave your luggage somewhere, and get an answer from a person.", ev: "senior" },
    { id: "G4", t: "When your desk is ready, tell the app you are on your way.", ev: "onmyway" },
    { id: "G5", t: "The door lock in your room is loose. Report it.", ev: "report" },
    { id: "G6", t: "Accept your room.", ev: "accept" },
  ],
};

export const fresh = (): Data => ({
  docs: DOCS.map((d) => ({ ...d })), slot: null, pass: false, lang: "en", signedIn: false,
  checkedIn: false, route: ROUTE.map((r) => ({ ...r })), room: { accepted: false, ticket: null }, chat: [],
});

export const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};
