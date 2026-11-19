# IIITA Registration Experience · Group 10

One Next.js app with three parts:

| URL | What it is |
|---|---|
| `/` | Design Thinking project site (Empathize → Define → Ideate → Solution) with motion videos |
| `/prototype` | Assignment 4 clickable prototype: phone frame, wireframe/styled toggle, usability-test kit |
| `/app`, `/staff`, `/s/…` | **IIITA Arrive**, the working product: student app, staff console, parent status page |

## Run locally

Needs Node 22.13 or newer (the database uses Node's built-in `node:sqlite`).

```bash
npm install
npm run dev -- -p 3210
```

Open http://localhost:3210. The database (`.data/arrive.db`) and upload folder are created and seeded on the first request.

```bash
npm run db:reset   # wipe local data; it re-seeds on the next request
npm run lint
npm run typecheck
npm run build && npm start
```

## Trying IIITA Arrive

**Student** (`/app/login`): the example student is Ananya Verma, JoSAA application `260310442817`, date of birth `14/03/2008` (the login page can fill these in during development). Other seeded students: Kabir Singh `260310551203` (02/11/2007), Rohan Iyer `260310667734` (21/01/2008), Meera Nair `260310778921` (09/09/2007). Without an SMS provider the one-time code is shown on screen in development.

**Staff** (`/staff/login`), password from `ARRIVE_STAFF_PASSWORD` (default `arrive-2026`, see `.env.example`):

| Email | Role | Can use |
|---|---|---|
| `admin@iiita.ac.in` | Admin | Everything, plus adding or importing students and confirming fees |
| `verify@iiita.ac.in` | Verifier | Document review, student list |
| `desk@iiita.ac.in` | Desk and gate | Gate check-in, desks A, B, C, H |
| `warden@iiita.ac.in` | Warden | Room inspections, repair tickets |
| `senior@iiita.ac.in` | Senior volunteer | Help inbox |

Student and staff sessions use different cookies, so you can be signed in as both in one browser (two tabs).

### The full journey

1. Student fixes the rejected photo, fetches Class 12 from DigiLocker, uploads the income certificate and the notarised undertaking.
2. Verifier accepts them in **Documents**. The student's checklist turns green within seconds.
3. Student books a slot in **Review** and gets the Ready to Report pass (real QR), then shares it with a parent by SMS / WhatsApp in English or Hindi. The link opens `/s/<token>`.
4. At the gate, staff scan the pass (or type the code / JoSAA number), or the student types the poster code from **Gate**.
5. In **Desks**, staff call the next student; the student's phone shows a full-screen alert and vibrates. "Done" queues them at the next desk.
6. After the hostel office, the student accepts the room, can report a problem (ticket `#R-1182` onwards), and the warden assigns and fixes it.
7. Questions the FAQ cannot answer land in the **Help inbox** for a senior volunteer.

### Loading the allotment list

Admins open **Students → Import CSV** and upload the JoSAA / CSAB allotment export (or any sheet saved as CSV). Required columns: `josaa`, `dob`, `name`, `branch`, `phone`; optional: `category` (GEN if empty), `parent_name`, `parent_phone`. Common JoSAA headings ("Application No", "Candidate Name", "Allotted Program", "Mobile No"…) are recognised, dates can be `DD/MM/YYYY` or `YYYY-MM-DD`, and `+91` / leading `0` on phone numbers is removed. A preview lists new rows, students already added and rows with problems before anything is saved. Re-uploading the same file only adds new students. Template: `/students-template.csv`.

## Configuration

See `.env.example`. Everything works without configuration in development. For production:

- `ARRIVE_STAFF_PASSWORD`: set before first start (it is hashed into the database when seeding).
- `SMS_WEBHOOK_URL`: required for student sign-in in production (POST `{to, text}` to your SMS relay).
- `DIGILOCKER_CLIENT_ID`: partner credentials; otherwise the sandbox issuer is used and marked as such.
- `ARRIVE_DATA_DIR`: persistent disk location for the database and uploads.

## Where things are

- `src/app/(site)`: project site and `/prototype` (own root layout and CSS).
- `src/app/(arrive)`: IIITA Arrive pages and `arrive.css`, the design system (own root layout).
- `src/app/api`: route handlers (`auth`, `me` for students, `staff`).
- `src/server`: database schema and seed, auth, domain logic, file serving, SMS adapter.
- `src/components/arrive`: student screens (`student/`), staff console (`staff/`), shared UI.
- `src/lib/arrive`: catalog (documents, desks, FAQ), shared types, API client, image helpers.
- `src/data/content.json`: project-site content (personas, journeys, stories, boards).

## Deploying

The app runs as one Node server with a persistent disk (SQLite file + uploads), for example a small VM or a container with a volume. Serverless hosts such as Vercel do not keep local files between requests; move the data layer in `src/server` to Postgres and object storage first.
