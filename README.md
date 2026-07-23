# QueueLess

A live virtual waitlist app. Business owners sign up, get a shareable link for their queue, and manage walk-ins from a real-time dashboard. Customers join from their phone and watch their position update live no refreshing, no app download, no standing in line.

**Live demo:** https://queueless-client.vercel.app

---

## The problem

Small walk-in businesses barbershops, clinics, food trucks still make people physically stand in line or shout out names to know when it's their turn. QueueLess replaces that with a link: customers join remotely, see their live position, and get notified by email when they're almost up. Business owners get a live-updating dashboard to manage the line from any device.

## How it works

1. A business owner signs up and gets a unique queue link (e.g. `/join/hopes-cafe`) automatically.
2. Their dashboard shows that link alongside an auto-generated QR code, with one-click copy and download ready to print or post without leaving the app.
3. Customers open the link (or scan the code), enter their name, and get a live status page showing their position.
4. The owner sees everyone currently waiting, notified, or seated on their dashboard, updating in real time as people join.
5. When the owner clicks **Notify**, the customer's status page updates instantly and they receive an email. **Seat** marks them served without removing them from view; only **Remove** takes someone off the table entirely.

---

<img width="1343" height="580" alt="Screenshot 2026-07-20 143054" src="https://github.com/user-attachments/assets/9b9c7a08-673c-4db2-8ade-3a7a3d1afa06" />

---

<img width="1343" height="582" alt="Screenshot 2026-07-20 142829" src="https://github.com/user-attachments/assets/83e6bfb7-e7d0-40b9-b641-0c84a7f20802" />

---

<img width="1342" height="584" alt="Screenshot 2026-07-20 142853" src="https://github.com/user-attachments/assets/cb31b9b3-913e-42d8-a85b-5e7660a27fc1" />

---

<img width="1114" height="582" alt="Screenshot 2026-07-16 205447" src="https://github.com/user-attachments/assets/ebaf0fb5-0ac0-4373-aecb-68097d070ac6" />

---

<img width="1011" height="515" alt="Screenshot 2026-07-16 205515" src="https://github.com/user-attachments/assets/054a7e96-9da3-425d-a952-48f56e4e8d4d" />

---

<img width="670" height="589" alt="here" src="https://github.com/user-attachments/assets/555d4ccb-ec31-46cc-abf2-a303a8d7a182" />





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
- **Supabase Realtime** pushes database changes straight to both the customer's status page and the owner's dashboard over a WebSocket when the owner clicks "Notify" or "Seat," the customer's screen updates with no polling and no refresh.
- The **QR code** is generated client-side by pointing an `<img>` at the [QR Server API](https://goqr.me/api/) with the queue's join URL as a parameter no QR-generation library or backend work needed.

## Tech stack

| Layer | Tool |
|---|---|
| Frontend | React (Vite), React Router |
| Backend | Node.js, Express |
| Database, Auth, Realtime | Supabase (Postgres) |
| Email notifications | Resend |
| QR code generation | [QR Server API](https://goqr.me/api/) |
| Alerts/toasts | SweetAlert2 |
| Hosting | Vercel (frontend), Render (API) |

## Key technical details

- **Row Level Security everywhere.** No table is publicly writable by default. Customers can only insert their own queue entry; only a queue's actual owner (verified via `auth.uid()`) can update or delete entries in it enforced at the database level, not just in application code.
- **Self-serve multi-tenancy.** Any number of businesses can sign up independently; each gets its own auto-generated unique slug, queue, and isolated dashboard no manual database work required per business.
- **Real-time, not polling.** Both the customer and owner views subscribe directly to Postgres changes via Supabase Realtime, so state stays in sync across devices without any client ever asking "did anything change?"
- **Clear frontend/backend boundary.** Simple reads of public data go straight from React to Supabase. Anything involving business logic, validation, or an authenticated action goes through the Express API.
- **Explicit status lifecycle on the dashboard.** A queue entry moves through `waiting → notified → seated`, staying visible on the dashboard the whole time only an explicit **Remove** actually deletes the row. This was a deliberate fix after an earlier version conflated "seated" with "gone," which hid customers the owner still needed to see.
- **`replica identity full` on `queue_entries`.** By default, Postgres only includes the primary key on a deleted row's Realtime payload — not enough to satisfy a filter like `queue_id=eq.<id>`. Setting full replica identity was required to make delete events actually reach filtered subscriptions live, instead of only showing up after a manual refresh.
- **Platform-aware file downloads.** The "Download QR" button uses the standard blob + `<a download>` technique, which works on desktop and Android but is silently ignored by iOS Safari's sandboxing. The app detects iOS and falls back to opening the QR image in a new tab with a "long-press to save" prompt, rather than pretending a one-click download works everywhere.

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
In your Supabase project's SQL Editor, run `queueless-server/schema.sql` it creates all tables, Row Level Security policies, enables Realtime on `queue_entries`, and sets `replica identity full` so filtered delete events are delivered live.

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
- A true native "Save to Photos" flow for iOS, likely via a small share-sheet integration rather than a plain `<a download>` link
- Bulk actions on the dashboard table (the checkbox column is currently placeholder-only)

## What this project taught me

Building this end to end including debugging real issues like stale Realtime subscriptions, RLS policies silently blocking reads, SPA routing 404s on Vercel, and a Postgres replica identity setting that quietly swallowed delete events was as valuable as the initial build itself. Full-stack development is as much about reasoning through *why* something broke as it is about writing the first working version, and about recognizing platform-specific limits (like iOS Safari's download handling) rather than assuming one implementation works everywhere.
