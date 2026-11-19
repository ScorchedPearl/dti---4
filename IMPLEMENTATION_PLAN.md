# IIITA Arrive: implementation plan

Turns the Assignment 4 clickable prototype (`website/src/app/(site)/prototype`) into a working product,
while keeping the prototype and its usability-test kit as the A4 deliverable.

Source of truth for scope: `handoff/1-prototype-nextjs.md` (screens, documents, tasks, copy) and
`website/src/data/content.json` (personas, problem statements).

## What existed

| Area | State before this work |
|---|---|
| Project site `/` | Done (Empathize, Define, Ideate, Solution, Team) |
| `/prototype` | Front-end only. Data in `localStorage`, fake timers, simulated uploads, no backend. Never opened in a browser. |
| Backend, database, auth | None |

## Product shape

One Next.js 15 app, three surfaces:

1. **Student app** `/app` (mobile first, desktop sidebar)
   - ReadyPass (PS-1): sign in with JoSAA number + DOB + one-time code, checklist with status lights, document detail with upload / camera / DigiLocker, annotated samples, rule-change log, review + slot booking, Ready to Report pass with a real QR, parent share (SMS / WhatsApp / copy, English or Hindi).
   - Gate-to-Room Pass (PS-2): gate check-in (staff scans the pass, or the student scans or types the poster code), live route with people ahead and ETA, full-screen "it is your turn" alert with vibration and system notification, room inspection card, room-mate, accept room, report a problem with ticket timeline, settled summary.
   - Help: official FAQ answers instantly; anything else is escalated to a verified senior volunteer who replies from the staff console.
2. **Staff console** `/staff` (role based: admin, verifier, desk, warden, volunteer)
   - Overview with live counts and an activity feed (audit log).
   - Document review queue with inline PDF/image preview, accept, or reject with a reason.
   - Gate: printable poster code + QR, check in by scan / pass code / JoSAA number.
   - Desks A, B, C, H: call next, done, back in line, 5-minute hold timer.
   - Rooms: inspection checklist per room, repair tickets (reported → assigned → fixed).
   - Help inbox for senior volunteers.
   - Students: search, add a student, import the JoSAA allotment list from CSV (preview, then import), confirm fee.
3. **Parent status page** `/s/[token]`: no sign-in, English / Hindi, auto-refreshing.

## Architecture

- **Database:** SQLite through Node's built-in `node:sqlite` (no native build step). File at `website/.data/arrive.db`, created and seeded on first request. Schema in `src/server/db.ts`, seed in `src/server/seed.ts`.
- **Domain logic:** `src/server/arrive.ts` (state, uploads, booking, queue, rooms, help, staff queries). All multi-row writes run in transactions.
- **API:** route handlers under `src/app/api/{auth,me,staff}`; one wrapper (`src/server/http.ts`) gives JSON errors, same-origin checks on writes and status codes.
- **Auth:** OTP (hashed, 5-minute expiry, 5 attempts, 4 per 10 minutes) for students; scrypt passwords for staff; opaque session tokens stored hashed, HTTP-only SameSite=Lax cookies; middleware redirects signed-out visitors.
- **Files:** magic-byte checked (PDF, JPG, PNG), 2 MB limit, random names, served only to the owner or staff with `nosniff`.
- **Image quality (browser, `src/lib/arrive/image.ts`):** every image is checked on the original file before any compression. Passport photo: sharpness on the face area resampled to print resolution (600 px tall) with sensor noise subtracted, too dark, washed out, one side in shadow, light behind, portrait orientation, minimum size, and face count where the browser has a face detector. Camera scans of documents: text sharpness, too dark, minimum size. Students can still choose "Upload anyway"; staff review everything.
- **Client:** one state endpoint (`GET /api/me`) polled adaptively (3 s while queued, 6 s while a document is in review, 15 s otherwise). Image compression and a sharpness/brightness check run in the browser.
- **Integrations behind adapters:** SMS (`SMS_WEBHOOK_URL`), DigiLocker (`DIGILOCKER_CLIENT_ID`; sandbox issuer otherwise, labelled as such).
- **Styling:** own design system (`src/app/(arrive)/arrive.css`), Exo 2 + Inter, navy/teal with status colours. Separate root layout via route groups so the project site's CSS never leaks in.

## Milestones

| # | Milestone | Status |
|---|---|---|
| M1 | Route groups, catalog, schema, seed, auth, HTTP helpers | Done |
| M2 | Student APIs (state, upload, DigiLocker, booking, share, check-in, ack, room, tickets, help) | Done |
| M3 | Staff APIs (login, overview, documents, files, gate, desks, rooms, tickets, help, students) | Done |
| M4 | Design system and shared UI (buttons, pills, ring, sheet with focus trap, toasts, QR, scanner) | Done |
| M5 | Student screens: ReadyPass + Gate-to-Room + Help | Done |
| M6 | Staff console screens | Done |
| M7 | Parent page, project-site link, README, env example | Done |
| M9 | CSV import of the allotment list (`src/server/roster.ts`, `/api/staff/students/import`) | Done |
| M8 | Lint, typecheck, production build, end-to-end browser test of every journey, 375 px check, `/prototype` check | Done (see Verification) |

## Verification checklist

- [x] `npx tsc --noEmit`, `npx eslint`, `npm run build`
- [x] Student: OTP sign-in, wrong code, checklist, photo upload, oversize image compression, DigiLocker fetch, review blocked until all green, slot booking, pass + QR, share sheet (Hindi)
- [x] Staff: verifier accept / reject reflects on the student's checklist
- [x] Gate check-in (poster code), desk call → student alert → "I am on my way" → done → next desk; hostel step → room accept → settled
- [x] Report a problem → ticket in warden console → assign → fixed reflects on student
- [x] Help: FAQ answer, escalation, volunteer reply appears for the student
- [x] Parent page in English and Hindi
- [x] 375 px layout, no horizontal scroll; `/prototype` opens with no console errors

### Bugs found and fixed during browser testing

- Staff pages crashed: `node:sqlite` rows have a null prototype and cannot be passed to client components. Rows are now copied to plain objects.
- Accepting a room failed with "cannot start a transaction within a transaction". `tx()` is now re-entrant.
- The "waiting for a senior" hint disappeared once a later FAQ answer arrived. It now checks for any unanswered escalation.
- Help inbox preview showed the latest message instead of the escalated question.
- Page content stayed invisible when the browser froze CSS animations (hidden tab). The page-enter animation no longer touches opacity.
- Desk picker stacked one per row on phones; now a grid.
- Dev server broke after a production build because Next picked the repo root (stray `package-lock.json`) as its root. `next.config.ts` now pins the root. Do not run `npm run build` while `npm run dev` is running; they share `.next`.

### Image check calibration (19 Nov 2026)

Synthetic passport photos (600 and 3000 px, with sensor noise) and two real scanned pages from `public/gallery`, through the real upload screen:

| Case | Score | Result |
|---|---|---|
| Sharp passport photo (normal, 4.4 MB, white wall, darker skin) | 104 to 440 | passes; large files then get the compress offer |
| Blur of 0.1 % of image height and more | 0 to 9 | "looks blurry" (limit 15) |
| Dark room, half-face shadow, backlit, flash-washed, landscape, 300 × 400 forward | — | each flagged with its own message |
| Sharp document page | over 1,100 | passes |
| Slightly soft but readable page | above 50 | passes |
| Shaky page, dark page, 25 % size screenshot | 6 / dark / small | flagged |

Limits live in `LIMITS` in `image.ts`. They are calibrated on test images, not on real phone photos; check them against 10 to 20 real good and bad photos during usability testing. The light-behind check only fires when the face measures below 65 (well-lit darker skin on a white wall measures 80 to 140) so it does not flag skin tone.

## Known limits (need real credentials or decisions)

- **SMS:** no provider configured. In development the code is shown on screen; in production set `SMS_WEBHOOK_URL` or sign-in is refused.
- **DigiLocker:** partner API needs institute registration. Without `DIGILOCKER_CLIENT_ID` the sandbox issuer accepts the document and the record says "sandbox issuer".
- **Payments:** fees are confirmed by the office in the staff console; no gateway integration.
- **Hosting:** SQLite and local file storage suit a single server. For serverless hosting, move to Postgres and object storage (the data layer is isolated in `src/server`).
- **Document contents:** names, dates, seals and signatures are not read automatically (that would need text recognition); the verifier checks them.
- **Usability results:** the app and `/prototype` only enable testing. No test findings have been invented; real sessions are still needed.
