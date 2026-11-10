# Nokto

Your North Star goals and everyday to-dos in one minimal app. It installs on your phone from the web and syncs across every device through your account.

- **Today**: Todoist-style to-dos with priority, area of life, date, time and repeats (daily, weekdays, weekly, monthly, quarterly, or custom with an end date).
- **Goals**: a bucket list across 10 areas of life, pre-filled with placeholder North Star goals you can edit.

Stack: Vite + React + TypeScript, Supabase (auth + Postgres), and a PWA via `vite-plugin-pwa`, deployed on Vercel.

## 1. Supabase

1. In **SQL Editor**, paste and run [`supabase/schema.sql`](supabase/schema.sql). It creates the `goals` and `todos` tables with row-level security, and a trigger that seeds placeholder goals for each new account. Accounts that already exist get seeded too.
2. In **Authentication → Sign In / Providers**, make sure **Email** is enabled.
3. In **Authentication → URL Configuration**, set:
   - **Site URL**: your Vercel URL, for example `https://nokto.vercel.app`.
   - **Redirect URLs**: add your Vercel URL and `http://localhost:5173`.
4. In **Authentication → Emails → Magic Link**, add the 6-digit code to the template so it sits alongside the link:
   ```html
   <h2>Sign in to Nokto</h2>
   <p><a href="{{ .ConfirmationURL }}">Tap here to sign in</a></p>
   <p>Or enter this code in the app: <b>{{ .Token }}</b></p>
   ```
   You need the code on iPhone. A home-screen app doesn't share sign-in with Safari, so tapping the link signs Safari in, not the app. Type the code into the installed app instead.
5. In **Project Settings → API**, copy the **Project URL** and the **anon public** key.

## 2. Vercel

1. **Add New → Project**, then import `artemtimoshkov/Nokto`. The Vite framework preset is detected automatically.
2. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: your Project URL
   - `VITE_SUPABASE_ANON_KEY`: the anon public key (it's designed to be public; security comes from row-level security)
3. Click Deploy. Every push to `main` redeploys automatically.

## 3. Install on your phone

- **iPhone**: open the Vercel URL in Safari, tap **Share**, then **Add to Home Screen**. Open Nokto from the home screen and sign in with the emailed code.
- **Android**: open the URL in Chrome, tap **⋮**, then **Install app**.
- **Laptop**: in Chrome or Edge, click the install icon in the address bar, or just use it in a browser tab.

## Local development

Create `.env.local` from `.env.example`, then run:

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

Without env vars, the login screen offers a **demo mode** that stores data only in that browser.

## How things work

- **Sorting**: to-dos are grouped into Overdue, Today, upcoming days, and No date. Within each group they're sorted by priority (P1 → P3), then date, then time. A to-do saved without a priority gets P3.
- **Repeats**: ticking off a repeating to-do moves it to the next occurrence after today, and you can undo that. A series with an end date completes for good after its last occurrence. The rules live in `src/lib/recurrence.ts`, with tests alongside.
- **Sync**: changes save to Supabase right away and appear on screen before the server confirms. The app refetches whenever it comes back into focus, so your phone and laptop stay in step.
