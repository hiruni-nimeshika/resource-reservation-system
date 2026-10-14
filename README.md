# Reserve: Resource Reservation Management System

A full-stack web app that lets an organisation manage its shared rooms, equipment and vehicles in one place,
and **makes double-booking impossible**. Built for the PrimeWave Lab Software Engineering Internship technical assessment.

**Stack:** Next.js 16 (App Router) · TypeScript · PostgreSQL · Git/GitHub

## The problem and how this solves it

The organisation books resources through informal messages and manual records, which causes overlapping
reservations and uncertainty about availability. This app provides:

| Business need | What the app does |
| --- | --- |
| Organise resources | Admins add, edit and retire resources, grouped by category (rooms, equipment, vehicles, workspaces) with location and capacity. |
| Coordinate reservations | Members book a resource for a time slot, see all their bookings, and cancel them. |
| No more overlaps | A PostgreSQL **exclusion constraint** rejects overlapping bookings, even if two people click at the same instant. |
| Clear availability | Dashboard shows what is free right now; every resource has a day timeline showing free and booked time. |
| Understand usage | Admin usage report: bookings, hours booked, cancellations and utilisation per resource (last 30 days). |
| Reliable as it grows | DB-level integrity, indexes on the hot queries, validation on server and client, tests for the booking rules. |

## Features

- Email/password sign-in with two roles: **member** and **admin**
- Resource directory with category filter and search, live status ("Available now" / "In use until 15:30")
- Per-resource **day timeline** with previous/next day navigation and a "now" marker
- Booking form with clear errors (who has the slot and when) and your entries kept on error
- Booking rules: inside opening hours (06:00–22:00), 15 min to 4 h, not in the past, up to 90 days ahead
- My reservations (upcoming / past & cancelled); admins can view and cancel everyone's
- Retiring a resource keeps its history and is blocked while upcoming bookings exist
- Admin usage report with utilisation bars
- Responsive layout, keyboard-visible focus, accessible form messages

## What I changed myself

This project was developed with assistance from AI tools, which the assessment brief permits. I reviewed the code end to end, ran it against a real PostgreSQL, and made two focused changes myself - the 4-hour booking limit and the floor field - to confirm I understand how the layers connect. Each change is its own commit, and the test suite stays green throughout.

### 1. Maximum booking length: 8 hours → 4 hours

`lib/rules.ts` - `RULES.maxMinutes` is now `4 * 60`. The change ripples through the UI copy in `components/BookingForm.tsx` and in the Features list above. I tightened the boundary test in `tests/rules.test.ts` so it now asserts that a **5-hour** booking is rejected and an exactly **4-hour** booking is accepted - the test proves the exact limit rather than "something long is rejected".

### 2. Added a nullable `floor` field to resources

A new migration `db/migrations/002_add_resource_floor.sql` adds `floor text` to `resources`. It is nullable because existing rows have no value and the field is descriptive, not a key. I traced it through the full request path:

- `lib/validation.ts`  `floor; optionalText(50)` in the Zod schema
- `app/actions/resources.ts` ; read from the form and written in the `INSERT` / `UPDATE`
- `components/ResourceForm.tsx` ; the input on the admin form
- `lib/queries.ts` ; `r.floor` in `RESOURCE_SELECT` and in the `ResourceRow` type
- `app/resources/[id]/page.tsx`; displayed in the resource metadata line

Migrations are append-only: `001_init.sql` is never edited, so the schema's evolution is visible from the commit history alone.

## Getting started

**Prerequisites:** Node.js 20.9+ and PostgreSQL 14+ (or Docker).

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL. Either use Docker...
docker compose up -d
#    ...or create the database yourself in psql:
#    CREATE USER rrms WITH PASSWORD 'rrms' CREATEDB;
#    CREATE DATABASE rrms OWNER rrms;

# 3. Configure environment (Windows: copy .env.example .env)
cp .env.example .env

# 4. Create the tables and load demo data
npm run db:setup

# 5. Run the app
npm run dev        # http://localhost:3000
```

**Demo accounts** (created by the seed script)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@demo.test` | `Admin@1234` |
| Member | `nimal@demo.test` | `Member@1234` |
| Member | `sanduni@demo.test` | `Member@1234` |

New people can also register themselves from the sign-in page (they become members).

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run db:migrate` | Apply SQL migrations in `db/migrations` |
| `npm run db:seed` | Load demo users, resources and sample bookings (safe to re-run) |
| `npm test` | Unit tests for booking rules + integration tests against PostgreSQL |
| `npm run typecheck` | TypeScript check |

## Project structure

```
app/                  Next.js App Router pages and server actions
  actions/            Mutations (auth, reservations, resources): thin wrappers that check auth + validate input
  resources/ reservations/ reports/ login/ register/
components/           UI building blocks (timeline, booking form, tables)
lib/
  reservations.ts     Booking service: all business rules in one place (no Next.js code)
  rules.ts            Pure rule functions (opening hours, duration, past/advance limits)
  queries.ts          Read queries (resources + live status, schedules, reports)
  auth.ts password.ts Sessions (httpOnly cookie, hashed token in DB) and scrypt password hashing
  validation.ts       Zod schemas shared by all actions
  db.ts time.ts       Connection pool, timezone helpers
db/migrations/        Plain SQL schema (versioned)
scripts/              migrate.ts and seed.ts
tests/                rules.test.ts, reservations.db.test.ts
docs/                 ER diagram (Mermaid) and DBML for dbdiagram.io
                      Live diagram: https://dbdiagram.io/d/Resource-Reservation-ER-diagram-6acf9445aebfe7a21feb7255
```

## Key engineering decisions

1. **The database prevents double-booking, not the UI.** A "check then insert" in application code has a race window
   where two requests both see the slot as free. Instead, an `EXCLUDE USING gist` constraint on
   `(resource_id, time range)` makes PostgreSQL reject the second insert atomically. The app catches the error and
   explains who holds the slot. `tests/reservations.db.test.ts` fires 8 simultaneous bookings at one slot and asserts exactly one wins.
2. **Half-open time ranges `[start, end)`**: 10:00-11:00 and 11:00-12:00 are allowed back-to-back.
3. **Timestamps are `timestamptz`; the organisation's timezone is configured** (`APP_TIMEZONE`, default `Asia/Colombo`).
   What users type ("10:00") is converted to an instant by PostgreSQL itself, so there is no hand-rolled offset maths.
4. **Raw SQL with `pg` instead of an ORM.** The key constraint uses a PostgreSQL feature (range exclusion) that ORMs
   cannot express, and a small, explicit query layer is easy to read and reason about. Parameterised queries throughout.
5. **Business rules live in `lib/rules.ts` and `lib/reservations.ts`**, separate from the UI and from Next.js, so they
   are unit-testable and reusable.
6. **Server Actions for mutations**, always re-checking the session on the server; the client is never trusted for "who is booking".
7. **Auth kept deliberately small:** scrypt password hashing (built into Node), random session token in an httpOnly cookie
   with only its SHA-256 hash stored in the database.
8. **Soft retire instead of delete** for resources, so booking history and reports stay accurate.
9. **Plain CSS with design tokens** (no UI framework) to keep the dependency list short.

## Database design

The full schema lives in `db/migrations/001_init.sql`. The live, shareable ER diagram is here:

**https://dbdiagram.io/d/Resource-Reservation-ER-diagram-6acf9445aebfe7a21feb7255**

The diagram is generated from `docs/schema.dbml`. A Mermaid version that renders on GitHub is in `docs/er-diagram.md`.

The design decision that matters most: overlapping confirmed reservations for the same resource are
impossible. This is enforced by a PostgreSQL exclusion constraint on `(resource_id, tstzrange(start_time, end_time, '[)'))`,
not by application code — a check-then-insert in application code has a race condition where two
simultaneous requests can both see the slot as free.

## Assumptions

- One organisation, one timezone. Bookings are within a single day, between 06:00 and 22:00.
- A reservation is not edited in place: cancel and rebook (keeps the audit trail simple).
- Registration is open for the demo. In production this would be invite-only or SSO.

## Possible next steps

Editing reservations, recurring bookings, approval workflows for sensitive resources, email/calendar (ICS) notifications,
rate limiting on sign-in, per-resource opening hours, CSV export of the usage report.
