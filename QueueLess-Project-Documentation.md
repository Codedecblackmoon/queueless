# QueueLess — Project Documentation & Retrospective

A record of what was built, what was learned, and what to carry forward into future full-stack projects.

**Live app:** https://queueless-client.vercel.app
**Repo:** *(add your GitHub link here)*

---

## 1. Problem Statement & Solution

### The problem
Small walk-in businesses — barbershops, clinics, food trucks, small clinics — still rely on physical lines or shouted names to manage customer flow. This wastes customers' time, gives owners no visibility into who's waiting, and has no way to notify someone remotely when it's their turn.

### The solution
QueueLess is a virtual waitlist app that replaces the physical line with a link:

- A business owner signs up and instantly gets a unique, shareable queue link — no manual setup required.
- Customers open that link, enter their name, and get a live status page showing their position in line.
- The owner manages the queue from a real-time dashboard — notify, seat, or remove customers with one click.
- Customers get an email the moment they're notified, and their status page updates instantly with no refresh.

The core value isn't just "a form that writes to a database" — it's that **both sides of the interaction (customer and owner) see the same live state at the same time**, which is what makes it feel like a real product rather than a static app.

---

## 2. What Was Used (Tech Stack)

| Layer | Tool | Role |
|---|---|---|
| Frontend | React (Vite) | Two client-facing apps: customer join/status flow, owner dashboard |
| Routing | React Router | Client-side navigation, protected routes, URL parameters |
| Backend | Node.js + Express | Business logic, auth verification, notification triggering |
| Database | Supabase (Postgres) | Relational data: businesses → queues → queue entries |
| Auth | Supabase Auth | Owner signup/login, JWT-based session management |
| Realtime | Supabase Realtime (Postgres Changes) | Live updates pushed to both customer and owner UIs via WebSocket |
| Security | Postgres Row Level Security (RLS) | Enforces who can read/write which rows, at the database level |
| Email | Resend | Transactional email notifications |
| Frontend hosting | Vercel | Static hosting + SPA routing for the React app |
| Backend hosting | Render | Hosts the Express API |
| Testing tools | curl / PowerShell `Invoke-RestMethod`, Supabase dashboard | Manual API verification before frontend existed |

**Why this stack:** Supabase covers database, auth, and realtime in one service, which let the project focus on real backend logic (Express) and real frontend state management (React) rather than reinventing infrastructure. This is a genuinely realistic modern stack — many production startups are built this exact way.

---

## 3. Key Lessons Learned

### Technical lessons

- **Row Level Security is not optional polish — it's the actual authorization layer.** Several bugs in this project (a business "existing" but the dashboard showing empty) traced back to missing `select` policies, not application code. RLS needs a policy for *every* operation (select, insert, update, delete) a legitimate user needs to perform — forgetting one doesn't error loudly, it just silently returns nothing.

- **Frontend and backend have different jobs, and mixing them up causes real bugs.** Plain reads of public/permitted data can go straight from React to Supabase using the anon key. Anything involving calculated logic (queue position), validation, or a privileged action needs to go through the Express server. Getting this boundary right made the app's logic easier to reason about, not harder.

- **Realtime subscriptions need cleanup, just like event listeners.** Every `supabase.channel(...)` subscription needs a matching `removeChannel` in a `useEffect` cleanup function, or it silently leaks connections every time a component remounts.

- **React state closures can go stale inside callbacks.** Inside a Realtime event handler set up once when a `useEffect` runs, referencing state directly (`entries`) captures a frozen snapshot. Using the updater-function form (`setEntries(prev => ...)`) avoids this — a subtle but common React bug.

- **A missing `return` statement produces a silent blank page, not a loud error.** One of the most confusing bugs of the project was a component that rendered nothing because the JSX wasn't preceded by `return`. No console error, no crash — just nothing. Worth checking first whenever a component renders blank with a clean console.

- **Duplicate function/effect declarations cause hard-to-trace bugs.** Copy-pasting an updated version of a function without deleting the old one caused both silent bugs (two competing `useEffect`s racing) and hard syntax errors (`Identifier already declared`). Always delete, don't just add, when replacing code.

- **Local success does not mean deployed success.** Several issues (the `business` null crash, SPA routing 404s) worked perfectly locally and broke only once deployed — either because a fix wasn't pushed yet, or because Vercel's static hosting behaves differently from Vite's dev server (client-side routes need an explicit rewrite rule in production).

- **Environment variables are the mechanism that makes deployment painless — if set up early.** Because URLs and keys were pulled into `.env` files from the start rather than hardcoded, switching from localhost to live Render/Vercel URLs required zero code changes — just new values entered in each platform's dashboard.

- **Windows PowerShell isn't bash.** `export`, backslash line continuation, and curl's flag syntax don't translate directly — either use `curl.exe` explicitly with escaped quotes, or use PowerShell-native `Invoke-RestMethod` with a real object body via `ConvertTo-Json`.

### Process lessons

- **Testing the backend in isolation (curl/PowerShell) before any frontend existed** caught real bugs early (position calculation, auth middleware correctness) in a much faster feedback loop than debugging through a UI would have allowed.
- **Deliberately testing failure paths, not just success paths**, mattered as much as testing that things worked — e.g. confirming a protected route actually returns 401 without a token, not just that it works with one.
- **Reading the actual browser console / error message before guessing** consistently resolved issues faster than speculating about the cause.

---

## 4. Key Things to Remember for Future Projects

1. **Design the database schema and RLS policies before writing any frontend code.** Getting the relational structure and access rules right early prevents an entire category of bugs later, and forces clarity about who can do what.

2. **Every table needs a `select` policy for every legitimate reader**, not just insert/update — a common blind spot when adding RLS incrementally as new features are built.

3. **Put anything environment-specific (URLs, keys, ports) into `.env` from the very first line of code that needs it** — retrofitting this later means hunting down every hardcoded string.

4. **When deploying a client-side-routed SPA (React Router, Vue Router, etc.), always add the hosting platform's rewrite/fallback rule up front** — this 404 issue will recur on any future Vercel/Netlify deployment of a router-based app unless it's a known checklist item.

5. **After any bug fix, immediately commit, push, and confirm the deployment finished** before testing on the live URL — don't assume local and deployed are in sync.

6. **When a component renders blank with no console error, check for a missing `return` before anything else.**

7. **Delete old code when replacing it — don't leave commented-out or duplicate versions nearby.** They cause real bugs, not just clutter.

8. **Test with curl/PowerShell (or Postman) before the frontend exists.** It isolates backend bugs from frontend bugs and is dramatically faster to iterate with.

9. **Distinguish "must succeed for the request to be valid" from "best-effort side effect"** in backend logic (e.g. database update vs. sending an email) — wrap the latter in try/catch so a third-party API hiccup never breaks a core action.

10. **A short demo recording of the finished feature is worth more to a reviewer than the code itself**, for a first impression — plan to capture one once each major feature is verified working end to end, rather than only at the very end.

---

## 5. Other Things Worth Documenting

- **Free-tier hosting quirks**: Render's free web services spin down after ~15 minutes of inactivity, causing a 30–60 second delay on the first request after idling. This is expected behavior, not a bug, but worth mentioning to anyone reviewing the live demo cold.
- **Resend's free tier** only delivers to the account owner's verified email until a custom domain is verified — fine for a portfolio demo, but a real launch would need domain verification to notify arbitrary customers.
- **Email confirmation on signup** was disabled during development to simplify testing, but should be re-enabled before treating this as a real public-facing product, since it's a genuine anti-abuse measure.
- **The project went from an empty folder to a live, multi-tenant, real-time SaaS product across six phases**: schema/security → API → customer frontend → owner dashboard/auth → email notifications → deployment/polish. That phase breakdown itself is a reusable template for scoping the next full-stack project.

---

## Final Note

The most valuable parts of this project weren't the individual technologies — React, Express, and Supabase are all well-documented and learnable from tutorials. The value came from the debugging loop repeated dozens of times: hit a real error, read it carefully, understand the actual cause (not just the symptom), fix it, and verify. That loop is the transferable skill, and it's the thing worth trusting to carry into the next project.
