# Handoff 1: Build the Assignment 4 clickable prototype (Next.js)

You are picking up a Design Thinking course project. Read this whole brief before touching code. Everything you need is here or in the files it points to.

## 1. Who and what

- **Course:** Design Thinking, B.Tech V semester, Section A, IIIT Allahabad (July to December 2026).
- **Team:** Group 10, eight members.

  | Code | Name | Roll |
  |---|---|---|
  | SD | Sudhanshu | IIT2024081 |
  | VS | Vishwas | IIT2024087 |
  | VR | Vichanshu Raj | IIT2024083 |
  | SS | Saumya Sood | IIT2024018 |
  | ST | Satwik Santosh | IIT2024084 |
  | KM | Kyan Mahajan | IIT2024092 |
  | AP | Akshat Parmar | IIT2024077 |
  | SR | Sarthak Sharma | IIT2024043 |

- **The user is Vishwas.** Talk to him in plain, short English.
- **Project topic:** the first-year registration experience at IIITA, from preparing documents at home to settling into a hostel room.

## 2. Assignment 4 brief

Prototyping and Testing stage. It was due 15 Nov 2026, so it is now late.

The rubric weights process more than outcome: observation, participation, resourcefulness, and quality and novelty of the outcome.

The brief uses a canteen ordering app as a worked example, with 5 screens: Login, Home, Food Selection, Shopping Cart, Order Confirmation. The actual task is:

> "For the solutions created in the previous assignment, create appropriate wireframes, clickable prototypes, test the wireframe based prototypes and improve the same."

So the steps are:
1. Initial wireframes.
2. Connect them into an interactive (clickable) prototype.
3. Test the prototype with users.
4. Iteratively improve it.

The canteen app is optional extra credit.

## 3. What came before (A1 to A3)

- **A1, Empathize:** 30 cleaned student records, coded into themes:
  - DOC ≈14: documents asked for that were not listed
  - ERP ≈15: portal crashes and status
  - QUE ≈9: queues and tokens
  - NAV ≈8: not knowing the next desk
  - PEER ≥16: relied on seniors' WhatsApp groups
  - HOST ≈12: room not ready
  - TIME, STAFF, EMO, MESS
- **A2, Define:**
  - Four personas:
    - Ananya Verma, the Prepared Planner: Patna, fixed return ticket.
    - Kabir Singh, the Digitally Blocked Registrant: mobile hotspot, ERP failures.
    - Rohan Iyer, the Guided Newcomer: trusts seniors, first visit.
    - Meera Nair, the Transitioning Resident: Kochi, parents leave the next morning.
  - Master POV: students rarely fail registration for lack of effort; what runs out is confidence.
  - **PS-1, certainty before travel:** students cannot confirm before leaving home that their documents, uploads and fee are complete and accepted.
  - **PS-2, from gate to a ready room:** on reporting day students don't know the next desk, the wait, or whether the room is usable.
  - Hypotheses:
    - H1: frozen, dated checklist with samples.
    - H2: per-document status and readiness receipt.
    - H3: route token with live wait.
    - H4: official senior help channel.
    - H5: room inspection gate and a door QR for defects.
  - 26 user stories, US-01 to US-26.
- **A3, Ideate:** mind maps, brainstorm boards and SCAMPER, converging on three concepts:
  - **ReadyPass (PS-1), scored 4.5/5:** a personalised checklist where every line is an upload slot with a status light (grey to upload, amber in review, green accepted, red action needed). JoSAA and DigiLocker items turn green automatically. Each item has an annotated sample and a notarisation tag. A rule change triggers an alert and a change-log entry, and the list freezes 10 days before reporting. When everything is green, the student books a reporting slot and gets a "Ready to Report" pass with a QR, which can be shared with a parent in Hindi or English.
  - **Gate-to-Room Pass (PS-2), scored 4.7/5:** the same QR checks the student in at the gate. A slot-based e-token shows the personal route (Desk A document check, then B ID photo, C academic section, hostel office, room) and the live wait. It pings the phone when the desk is ready, so families wait in shaded seating. Pre-verified students take a green lane past Desk A. Badged senior buddies answer from the same official FAQ. Each room passes an inspection card before handover, and a scan-to-report QR on the door creates a tracked repair ticket.
  - **Smart Stop Strip (PS-T, course problem), scored 3.9:** a physical handrail strip. It is out of scope for the app prototype; prototype it in cardboard.
- **A3 test plan:**

  | Concept | Prototype | Test with | Success signal |
  |---|---|---|---|
  | ReadyPass | Clickable flow | 10 to 15 current first-years plus 3 parents | 85% or more identify all documents; 80% or more say they would feel ready to travel |
  | Gate-to-Room Pass | Paper tokens and role-play of 3 desks | One section of juniors plus 2 wardens | Clarity 4/5 or more; 50% fewer "where next?" questions; 90% of rooms pass |

## 4. Where things live

- **Local folder:** `/Users/kaizopearl/Desktop/DTI`
  - `website/`: Next.js 15 App Router, React 19, TypeScript, `motion`, `lucide-react`. Run with `npm run dev` on port 3210; `.claude/launch.json` names it `dti-site`.
  - `source/`: Python generators for the A2 and A3 PDF reports. `a2.py` and `a3.py` hold the full report text and data.
  - `website/src/data/content.json`: personas, journeys, stories, epics, HMW, votes, hypotheses, POVs, mind maps, brainstorm boards, SCAMPER, problem statements and team. Treat it as the single source of truth.
  - `website/src/app/page.tsx`: the project site. Sections are Problem, Empathize, Define, Ideate, Solution and Team, with motion videos (`src/videos/*`) and per-member walkthrough videos (`src/videos/member/*`, `src/components/TeamVideos.tsx`).
- **GitHub repos (both public, owner ScorchedPearl):**
  - `https://github.com/ScorchedPearl/dti`: Assignment 2 content plus the website.
  - `https://github.com/ScorchedPearl/dti---assign-3`: Assignments 1, 2, 3 plus the website.
  - Both repos are pushed from **separate clean copies**, not from the Desktop folder. The Desktop folder is not a git repo; `website/.git` is a stale `create-next-app` repo, so ignore it. To push, clone the repo into a scratch folder, `rsync -a --exclude .git --exclude node_modules --exclude .next --exclude .DS_Store --exclude '*.tsbuildinfo' website/ <clone>/website/`, then commit and push.
- **Commit rules from the user:**
  - Author is ScorchedPearl.
  - **No mention of Claude anywhere in commit messages or trailers.** The user had them removed.
  - Earlier commits were backdated into fixed windows: `dti` in Sept 24 to 30, `dti---assign-3` in Oct 23 to 27. **Ask the user what date to use for A4 commits** before committing.
- **Miro:** six boards exist for A2 and A3. Their links are in `assignment-2/miro-boards.md` and `assignment-3/miro-boards.md` in the assign-3 repo.

## 5. Current state of the prototype (unfinished, uncommitted)

The previous session started this inside `website/` and was stopped before testing. These files exist only on the Desktop and are **not committed**:

- `website/src/app/prototype/page.tsx`: the `/prototype` route. It loads the Exo 2 and Architects Daughter fonts via `next/font` (variables `--font-exo`, `--font-sketch`) and renders `<ArriveBench/>`.
- `website/src/app/prototype/prototype.css`: all styles, scoped under `.pt`. It has light tokens, the phone frame, every screen style and a `.screen.wire` low-fi skin.
- `website/src/components/prototype/data.ts`: documents, slots, route, FAQ, screen map, test tasks, `fresh()` initial state and a `localStorage` helper.
- `website/src/components/prototype/Screens.tsx`: all 13 screen components, plus `Qr`, `Ring`, `Sample` and `Chip`.
- `website/src/components/prototype/ArriveBench.tsx`: the client component holding state, navigation stack, bottom sheets (file picker, too-large, DigiLocker consent, share), the desk-ready alert, toasts, timers (category review auto-accepts 9 s after sign-in; the queue ticks every 3.5 s), the usability-test kit and the controls rail.
- `website/src/app/page.tsx`: has a new "Try the Assignment 4 prototype" link card under `<SolutionVideo />`.

`tsc` and `eslint` passed. It was **never opened in a browser**. Either verify and finish it, or rebuild it to the spec below. Keep it in Next.js; the user asked for "everything only in Next.js".

## 6. The prototype to deliver

The route is `/prototype`, named **"IIITA Arrive"**. It is one page with a phone frame on the right and a controls rail on the left. Below 860px wide, the phone comes first and the rail below it. Below 460px, the phone fills the width so it can be tested on a real phone. The example student is Ananya Verma, JoSAA application 260310442817, DOB 14/03/2008, phone ending 4417.

### 6a. ReadyPass (PS-1). These map to the brief's 5 screens.

| # | Screen | Canteen analogue | Content and behaviour |
|---|---|---|---|
| 1 | **Sign in** | Login | JoSAA application number and DOB (prefilled), with "We send a one-time code to the phone ending 4417". Button: "Send code and sign in". |
| 2 | **My checklist** | Home | A progress ring (n/9 accepted) and a headline ("2 items need you"). Checklist version "v3 · frozen 6 Jul 2026"; fee "Paid · confirmed in 4 min". An amber banner "1 rule changed on 2 Jul" opens the change log. Document list sorted action, then to upload, then review, then accepted, each with a status chip and a one-line hint. Bottom button: "Review and get my pass". |
| 3 | **Document detail** | Food selection | Name, status chip, proof tag (Self-attested, Notarised or Bring the original), "Changed 2 Jul" tag where relevant, a rejection reason, "Fetch from DigiLocker" (for Class 12), an upload area (PDF or JPG, 2 MB max), and an annotated SVG sample (name as in JoSAA, signature or notary seal, date after 1 Apr 2026). |
| 4 | **Review** | Shopping cart | Pending documents (each links back), the fee (₹1,48,500, paid, ref IIITA26-88412), and reporting slot radios (27 Jul 09:30 full; 10:30 with 12 places left; 14:00 with 31 places left). "Get my Ready to Report pass" stays disabled until every document is accepted and a slot is chosen, and says why underneath. |
| 5 | **Ready to Report pass** | Order confirmation | Gradient pass with name, branch, QR, slot, gate, "Desk A: green lane", originals to bring. Buttons: "Share with my parent", which opens a bottom sheet with an English/हिन्दी toggle, the summary text, and "Send by SMS to Papa"; and "See reporting day", which switches to the Gate-to-Room Pass. |
| 6 | Rule changes | (extra) | v3 2 Jul: anti-ragging undertaking now notarised. v2 20 Jun. v1 5 Jun. "Frozen on 6 Jul". |
| 7 | Help | (extra) | Chat with suggested questions answered from the FAQ. Anything else gets "passed to a verified senior volunteer", and 3.5 s later "Rahul S. · B.Tech 3rd year · verified volunteer" replies. The luggage question gets "Yes. Cloak room next to Hall 2, free, open till 6 pm". |

Bottom tabs: Checklist, My pass, Help.

The nine documents and their starting states:

| Document | Starting state |
|---|---|
| JEE Main scorecard | Accepted, from JoSAA |
| Class 10 certificate | Accepted, from DigiLocker |
| Class 12 marksheet | To upload, available in DigiLocker |
| Category certificate (OBC-NCL) | In review, auto-accepts after about 9 s; bring the original |
| Income certificate | To upload; picking `inc_scanner.pdf` (6.8 MB) offers "Compress to about 900 KB and upload" |
| Anti-ragging undertaking | To upload; notarised; changed 2 Jul |
| Medical fitness certificate | Accepted |
| Passport-size photo | Action needed: "Photo is blurry and the face is shadowed. Retake it in daylight against a plain wall." `IMG_2041.jpg` (indoors) is rejected again; `IMG_2077.jpg` (outside) is accepted |
| Aadhaar card | Accepted, from DigiLocker |

Uploads show "Checking your file" for about 1.6 s.

### 6b. Gate-to-Room Pass (PS-2)

| # | Screen | Content and behaviour |
|---|---|---|
| 1 | **Check in at the gate** | "Welcome to IIITA, Mon 27 July, slot 10:30". QR, "Scan at the gate", and a card telling families to wait in Hall 2 shaded seating. |
| 2 | **My route** (home) | Token #247, "x of 5 done". A navy "now" card shows the next desk, people ahead (counts down), an estimated wait, a progress meter and "Wait anywhere. We will ping you". Below it, a vertical stepper: A Document check (skipped, green lane), B ID photo and student card (Hall 1), C Academic section (Admin block Room 4), H Hostel office (BH-3), R Room 214 BH-3. |
| 3 | **Your desk is ready** | A full-screen teal alert: "IT IS YOUR TURN · Go to Desk B · place held 5 minutes". "I am on my way" marks the desk done and moves to the next one. |
| 4 | Help | Shared with ReadyPass. |
| 5 | **Room handover** | Inspection card "Passed", checked by caretaker R. Yadav at 9:12, six checks (cleaned, fan and light, tap and drain, door lock, window and mesh, mattress and table). Room-mate card. "Accept my room", "Something is wrong? Report it", and day-one essentials (water cooler, mess 7:30 to 9:30 pm, medical BH-1, laundry). |
| 6 | **Report a problem** | A 3×3 grid (door lock, fan, light, water tap, window, cleaning), an optional note, and "Send report", which creates ticket #R-1182 with a timeline (Reported, Assigned to maintenance, Fixed by 6:00 pm). |
| 7 | **Settled** | "You are settled in", plus a note that family got a status link. |

Bottom tabs: Route, Room, Help.

### 6c. Controls rail (this is what makes it an A4 deliverable)

- **Concept toggle:** ReadyPass or Gate-to-Room Pass.
- **Fidelity toggle:** "Wireframe (v1, low-fi)" switches the phone to a greyscale, dashed-border, Architects Daughter skin with the same flows. "Styled" is the clickable prototype. This covers both "wireframes" and "clickable prototype".
- **Screen map:** numbered list of the screens; click one to jump there. Plus "Reset prototype data".
- **Usability test kit:** a participant field and the task list below. Each task has a **Start** button that starts a timer and counts taps inside the phone. Tasks auto-complete when the participant reaches the target event; the facilitator can also press "Mark success" or "Gave up". After each task, the facilitator records a 1 to 7 ease rating (SEQ) and a note.
- **Results table** for the device: "Copy results" copies tab-separated rows (time, participant, task, result, seconds, taps, ease, notes, fidelity) for Google Sheets. Do not offer file downloads.

Test tasks:

| Task | Text | Completes on |
|---|---|---|
| R1 | Find the document that was rejected and why. | opening the passport photo |
| R2 | Fix the rejected passport photo. | photo accepted |
| R3 | Add your Class 12 marksheet without scanning anything. | DigiLocker fetch |
| R4 | Find out if the anti-ragging undertaking needs a notary. | opening that document |
| R5 | Book a reporting slot and get your Ready to Report pass. | pass created |
| R6 | Send your parent a summary of the pass in Hindi. | share sent in Hindi |
| G1 | You have reached the campus gate. Check in. | check-in |
| G2 | Tell me how many people are ahead of you at your next desk. | manual |
| G3 | Ask if you can leave your luggage somewhere, and get an answer from a person. | senior reply |
| G4 | When your desk is ready, tell the app you are on your way. | "I am on my way" |
| G5 | The door lock in your room is loose. Report it. | report sent |
| G6 | Accept your room. | room accepted |

## 7. Look and feel

- Match the project site's palette: navy `#17375e`, teal `#1f6f78`, status green, amber, red and grey.
- Fonts: Exo 2 for headings, Inter for body.
- The app looks like a real Indian student app. Keep every string plain English, with no lorem ipsum.
- Respect `prefers-reduced-motion`, give keyboard focus a visible state, and use 44px minimum touch targets.
- No horizontal scroll at 375px.

## 8. Definition of done

1. `/prototype` works end to end for every task above in a browser, on desktop and at 375px, with no console errors. Verify with the Browser pane: start the `dti-site` preview and click through every task.
2. Wireframe mode renders every screen legibly.
3. `npm run build` passes, plus `npx tsc --noEmit` and `npx eslint`.
4. The project site links to `/prototype` (the card under the Solution video).
5. Ask the user for the commit date, then commit and push to **both** repos as described in section 4, with no Claude mention.
6. Tell the user plainly what was verified and what wasn't. The prototype only *enables* testing; **never invent test results.** Real sessions with first-years and parents have to happen.

## 9. Nice next steps (only if asked)

- **Iteration (v2):** after real tests, make changes based on the findings and keep v1 and v2 side by side, with a change log mapping each finding to a change. Do not fabricate findings.
- A short "how to run a session" script page for facilitators.
- The canteen app's 5 screens as a small optional route.
