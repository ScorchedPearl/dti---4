# Handoff 2: Build the Assignment 4 wireframes and clickable prototype in Figma

You are building the **Figma** deliverable for a Design Thinking assignment. The coded prototype in Next.js is a separate job (see `1-prototype-nextjs.md`). This file is self-contained.

## 1. Context in one paragraph

Group 10 (8 students, B.Tech V sem Section A, IIIT Allahabad, Design Thinking July to December 2026) studied first-year registration at IIITA:
- **Assignment 1:** 30 student records.
- **Assignment 2:** personas, POVs, journey maps, and two problem statements:
  - **PS-1:** certainty before travel.
  - **PS-2:** from the gate to a ready room.
- **Assignment 3:** ideation chose two app concepts, **ReadyPass** (PS-1) and **Gate-to-Room Pass** (PS-2), plus a physical Smart Stop Strip for the course problem PS-T, which is out of scope here.

**Assignment 4** asks for:
1. Initial wireframes.
2. Connecting them into a clickable prototype in Figma or Miro.
3. Testing the wireframe-based prototype.
4. Iteratively improving the wireframes.

The brief's example has 5 screens (Login, Home, Food Selection, Shopping Cart, Order Confirmation) for a canteen app. We apply the same structure to our own concepts. The rubric weights **process** more than outcome, so v1, the test evidence and v2 must all be visible in the file.

The user is Vishwas (VS). Keep explanations short and plain.

## 2. Before you start

- **The Figma connector must be authorised.** If Figma tools fail with an auth error, tell the user to run `/mcp` in a Claude Code terminal and authorise Figma. You cannot do it for them.
- Load the `figma:figma-use` skill before any `use_figma` call. Load `figma:figma-create-new-file` before creating a file, and `figma:figma-generate-design` for composing screens.
- Create a new Figma Design file named **"Group 10 · A4 · IIITA Arrive wireframes"**.
- All content and data come from `/Users/kaizopearl/Desktop/DTI/website/src/data/content.json` and section 5 below. Use the same strings so the Figma file and the coded prototype match.

## 3. File structure (pages)

1. **Cover:** title, team table (codes, names, roll numbers below), problem statements PS-1 and PS-2, HMW questions, and a legend for the status colours.
2. **User flows:** two flow diagrams, one per concept, showing screen-to-screen arrows and decision points (document accepted or rejected, all green or not, slot chosen or not, desk ready, room OK or report).
3. **v1 Wireframes · ReadyPass:** low-fi greyscale wireframes, 390×844 iPhone frames.
4. **v1 Wireframes · Gate-to-Room Pass:** same style.
5. **Clickable prototype:** prototype connections on the v1 frames, with a flow starting point per concept (see section 6).
6. **Test plan and results:** the task table (section 7), the facilitator script, and **empty** results tables for the team to fill in after real sessions.
7. **v2 Wireframes:** left empty with placeholders "v2 · after testing". Each v2 frame sits next to its v1 frame with a sticky note "Finding → Change". **Do not invent findings.** Leave a template the team fills in after testing.

Team: SD Sudhanshu IIT2024081 · VS Vishwas IIT2024087 · VR Vichanshu Raj IIT2024083 · SS Saumya Sood IIT2024018 · ST Satwik Santosh IIT2024084 · KM Kyan Mahajan IIT2024092 · AP Akshat Parmar IIT2024077 · SR Sarthak Sharma IIT2024043.

## 4. Wireframe style (v1)

- Greyscale only:
  - Background `#FAFAFA`
  - Cards white with a 1.5px `#BDBDBD` border
  - Text `#222` and `#666`
  - Primary button fill `#444` with white text
- Image placeholders: grey rectangles with a diagonal cross.
- Status shown by **label text and a filled or empty dot**, not colour: "● Accepted", "◐ In review", "✕ Action needed", "○ To upload".
- One font. Inter, or a hand-drawn font such as Architects Daughter if available, at 3 sizes only (24, 16, 13).
- Use auto layout, an 8px grid, 16px side padding, and 44px minimum tap targets.
- Name every layer and frame clearly, e.g. `RP-02 My checklist`, `GR-03 Desk ready alert`.
- Make reusable components: status chip, document row, primary button, bottom tab bar, app bar with back and help, bottom sheet.

## 5. Screens and exact content

Example student: **Ananya Verma**, JoSAA 260310442817, DOB 14/03/2008, phone ending 4417.

### ReadyPass (PS-1)

The five core frames match the brief's five screens.

| Frame | Brief equivalent | Content |
|---|---|---|
| **RP-01 Sign in** | Login | "ReadyPass", "Prove you are ready before you leave home". Fields: JoSAA application number, Date of birth. Note "One-time code to the phone ending 4417". Button "Send code and sign in". |
| **RP-02 My checklist** | Home | Progress ring "5/9 accepted", headline "3 items need you". Checklist "v3 · frozen 6 Jul 2026"; Fee "Paid · confirmed in 4 min". Banner "1 rule changed on 2 Jul". Document list sorted action needed first (see the table below). Button "Review and get my pass". Tab bar: Checklist · My pass · Help. |
| **RP-03 Document detail** | Food selection | Passport-size photo, "✕ Action needed", reason "Photo is blurry and the face is shadowed. Retake it in daylight against a plain wall." Tag "Self-attested copy". Upload area "PDF or JPG, up to 2 MB" with "Choose file". "What a correct one looks like" sample with callouts: Name exactly as in JoSAA · Your signature on every page · Date after 1 Apr 2026. Variant **RP-03b** for Class 12 has a "Fetch from DigiLocker" primary button. |
| **RP-04 Review** | Shopping cart | Pending documents list. Fee ₹1,48,500, paid, ref IIITA26-88412. Reporting slot radios: Mon 27 Jul 09:30 to 10:30 "Full" (disabled), 10:30 to 11:30 "12 places left", 14:00 to 15:00 "31 places left". Button "Get my Ready to Report pass", disabled until everything is accepted and a slot is chosen, with the reason shown below it. |
| **RP-05 Ready to Report pass** | Order confirmation | IIIT Allahabad, "● Ready", Ananya Verma · B.Tech IT, QR placeholder. Arrive Mon 27 Jul 10:30 to 11:30 · Gate: Main gate, Deoghat · Desk A: green lane, skip · Bring originals: category certificate. Buttons "Share with my parent" and "See reporting day". |

Supporting frames:
- **RP-06 Rule changes:** v3 2 Jul anti-ragging undertaking now notarised; v2 20 Jun; v1 5 Jun; "Frozen on 6 Jul".
- **RP-07 Help:** chat with suggested questions and a "verified senior volunteer" reply.
- **Sheets:**
  - **RP-S1 Choose file:** `IMG_2041.jpg` 1.1 MB indoors, `IMG_2077.jpg` 640 KB outside.
  - **RP-S2 File too large:** 6.8 MB, with "Compress to about 900 KB and upload".
  - **RP-S3 DigiLocker consent:** "Allow and fetch".
  - **RP-S4 Share with parent:** English/हिन्दी toggle, summary text, "Send by SMS to Papa".

Document list for RP-02 (sorted):

| Order | Document | State |
|---|---|---|
| 1 | Passport-size photo | ✕ Action needed |
| 2 | Class 12 marksheet | ○ To upload, "Available in DigiLocker" |
| 3 | Income certificate | ○ To upload |
| 4 | Anti-ragging undertaking | ○ To upload, "Notarised, changed 2 Jul" |
| 5 | Category certificate | ◐ In review |
| 6 | JEE Main scorecard | ● Accepted, from JoSAA |
| 7 | Class 10 certificate | ● Accepted, from DigiLocker |
| 8 | Medical fitness | ● Accepted |
| 9 | Aadhaar | ● Accepted, from DigiLocker |

### Gate-to-Room Pass (PS-2)

| Frame | Brief equivalent | Content |
|---|---|---|
| **GR-01 Check in at the gate** | Login | "Welcome to IIITA, Mon 27 July, your slot 10:30 to 11:30". QR, "Scan at the gate". Card: families wait in shaded seating in Hall 2, and we ping this phone when the desk is ready. |
| **GR-02 My route** | Home | Token #247 · "1 of 5 done". Now card: "Next: Desk B · ID photo and student card · 6 people ahead · about 12 min · Hall 1 · Wait anywhere, we will ping you". Stepper: ✓ A Document check (green lane) → B ID photo (now) → C Academic section, Admin block Room 4 → H Hostel office, BH-3 → R Room 214, BH-3. Tab bar: Route · Room · Help. |
| **GR-03 Desk ready alert** | Selection | Full screen: "IT IS YOUR TURN · Go to Desk B · ID photo and student card · Hall 1 · Desk staff hold your place for 5 minutes". Button "I am on my way". |
| **GR-04 Room handover** | Cart / review | Inspection card "Passed", checked by caretaker R. Yadav at 9:12, with 6 checks: cleaned, fan and light, tap and drain, door lock, window and mesh, mattress and table. Room-mate card. Buttons "Accept my room" and "Something is wrong? Report it". Day-one essentials. |
| **GR-05 Settled** | Confirmation | "You are settled in", "A status link was sent to your parent's phone". |

Supporting frames:
- **GR-06 Report a problem:** grid of door lock, fan, light, water tap, window and cleaning; an optional note; "Send report". Then **GR-06b** shows ticket #R-1182 with the timeline Reported → Assigned to maintenance → Fixed by 6:00 pm.
- **GR-07 Help:** a senior buddy chat. The luggage question gets "Cloak room next to Hall 2, free, till 6 pm".

## 6. Prototype connections

- **ReadyPass:**
  - RP-01 → RP-02 → tap the photo row → RP-03 → "Choose file" → RP-S1.
  - In RP-S1, `IMG_2077` → RP-02 with the photo accepted (use a variant frame `RP-02b`).
  - RP-02 → "Review" → RP-04 → choose a slot → RP-04b (enabled button) → RP-05 → "Share" → RP-S4.
  - Banner → RP-06. Help icon → RP-07. Back arrows go back.
- **Gate-to-Room Pass:** GR-01 → GR-02 → "after delay 3 s" → GR-03 → GR-02b (B done, C now) → … → GR-04 → Report → GR-06 → GR-06b → Accept → GR-05.
- Set flow starting points named **"ReadyPass"** and **"Gate-to-Room Pass"**. Use Smart Animate or Instant, and "Move in from bottom" for sheets.

## 7. Test plan page (from the A3 test plan; leave results blank)

Test with 10 to 15 first-years and 3 parents for ReadyPass, and one section of juniors plus 2 wardens for Gate-to-Room Pass. The method is think-aloud. Per task, record success or fail, time, taps or errors, a 1 to 7 ease rating, and quotes.

| Task | Text |
|---|---|
| R1 | Find the document that was rejected and why. |
| R2 | Fix the rejected passport photo. |
| R3 | Add your Class 12 marksheet without scanning anything. |
| R4 | Find out if the anti-ragging undertaking needs a notary. |
| R5 | Book a reporting slot and get your Ready to Report pass. |
| R6 | Send your parent a summary of the pass in Hindi. |
| G1 | You have reached the campus gate. Check in. |
| G2 | How many people are ahead of you at your next desk? |
| G3 | Ask if you can leave your luggage somewhere and get an answer from a person. |
| G4 | When your desk is ready, tell the app you are on your way. |
| G5 | The door lock in your room is loose. Report it. |
| G6 | Accept your room. |

Success targets from the Assignment 2 hypotheses:
- 85% or more identify all documents (H1).
- 80% or more would feel ready to travel (H1, H2).
- Clarity 4/5 or more, and 50% fewer "where next?" questions (H3).
- Help reply in under 10 min (H4).
- Repair ticket logged in under 1 min (H5, US-23).

## 8. Definition of done

- Pages 1 to 6 are complete and page 7 has its templates.
- Every frame is named, and components are used for repeated parts.
- Both flows play end to end in Figma's Present mode.
- Share the Figma link with the user, and say in one line what you could not do (for example, whether the hand-drawn font was unavailable).
- Do not fabricate test results or v2 changes. Those come from the team's real sessions.
