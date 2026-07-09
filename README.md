# QueueLess

A live virtual waitlist app. Business owners sign up, get a shareable link for their queue, and manage walk-ins from a real-time dashboard. Customers join from their phone and watch their position update live — no refreshing, no app download, no standing in line.

**Live demo:** https://queueless-client.vercel.app
**Demo video:** *(add link once recorded)*

---

## The problem

Small walk-in businesses — barbershops, clinics, food trucks — still make people physically stand in line or shout out names to know when it's their turn. QueueLess replaces that with a link: customers join remotely, see their live position, and get notified by email when they're almost up. Business owners get a live-updating dashboard to manage the line from any device.

## How it works

1. A business owner signs up and gets a unique queue link (e.g. `/join/hopes-cafe`) automatically.
2. They share that link — QR code, Instagram bio, a sign at the counter.
3. Customers open the link, enter their name, and get a live status page showing their position.
4. The owner sees everyone currently waiting on their dashboard, updating in real time as people join.
5. When the owner clicks **Notify**, the customer's status page updates instantly and they receive an email.

*(Add 2–3 screenshots here: the join form, the live status page, the dashboard table)*

## Architecture

```
React (customer app)  ─┐
                        ├──► Supabase (Postgres + Auth + Realtime)
React (admin dashboard)─┘              ▲
                                        │
                        Node.js/Express API ──► Resend (email)
```

- The **React frontend** talks to Supabase directly for reads and for Realtime subscriptions (governed entirely by Row Level Security).
- The **Express API** is the trusted layer for anything with real logic: calculating queue position, verifying the owner's auth token, and triggering email notifications. It uses Supabase's service_role key, which never reaches the browser.
- **Supabase Realtime** pushes database changes straight to both the customer's status page and the owner's dashboard over a WebSocket — when the owner clicks "Seat," the customer's screen updates with no polling and no refresh.

## Tech stack

| Layer | Tool |
|---|---|
| Frontend | React (Vite), React Router |
| Backend | Node.js, Express |
| Database, Auth, Realtime | Supabase (Postgres) |
| Email notifications | Resend |
| Hosting | Vercel (frontend), Render (API) |

## Key technical details

- **Row Level Security everywhere.** No table is publicly writable by default. Customers can only insert their own queue entry; only a queue's actual owner (verified via `auth.uid()`) can update or delete entries in it — enforced at the database level, not just in application code.
- **Self-serve multi-tenancy.** Any number of businesses can sign up independently; each gets its own auto-generated unique slug, queue, and isolated dashboard — no manual database work required per business.
- **Real-time, not polling.** Both the customer and owner views subscribe directly to Postgres changes via Supabase Realtime, so state stays in sync across devices without any client ever asking "did anything change?"
- **Clear frontend/backend boundary.** Simple reads of public data go straight from React to Supabase. Anything involving business logic, validation, or an authenticated action goes through the Express API.

## Running it locally

### Prerequisites
- Node.js
- A free Supabase project
- A free Resend account (for email notifications)

### 1. Clone and install
```bash
git clone https://github.com/yourusername/queueless.git
cd queueless

cd queueless-server && npm install
cd ../queueless-client && npm install
```

### 2. Set up the database
In your Supabase project's SQL Editor, run `queueless-server/schema.sql` — it creates all tables, Row Level Security policies, and enables Realtime on `queue_entries`.

### 3. Environment variables

`queueless-server/.env`:
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
PORT=3000
```

`queueless-client/.env`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:3000
```

### 4. Run both apps
```bash
# Terminal 1
cd queueless-server
node server.js

# Terminal 2
cd queueless-client
npm run dev
```

Visit `http://localhost:5173`.

## What I'd build next

- SMS notifications as a Twilio-backed alternative to email
- Estimated wait times based on historical seating duration
- Multiple queues per business (e.g. separate lines for different services)
- Automated tests for the Express API and RLS policies

## What this project taught me

Building this end to end — including debugging real issues like stale Realtime subscriptions, RLS policies silently blocking reads, and SPA routing 404s on Vercel — was as valuable as the initial build itself. Full-stack development is as much about reasoning through *why* something broke as it is about writing the first working version.
