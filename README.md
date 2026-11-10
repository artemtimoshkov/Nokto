# Nokto

Your North Star goals and everyday to-dos in one minimal app. It installs on your phone from the web and syncs across every device through your account.

- **Today**: Todoist-style to-dos with priority, area of life, date, time and repeats (daily, weekdays, weekly, monthly, quarterly, or custom with an end date).
- **Goals**: a bucket list across 10 areas of life, pre-filled with placeholder North Star goals you can edit.

Stack: Vite + React + TypeScript, Supabase (auth + Postgres), and a PWA via `vite-plugin-pwa`, deployed on Vercel.

## 1. Supabase

1. In **SQL Editor**, paste and run [`supabase/schema.sql`](supabase/schema.sql). It creates the `goals` and `todos` tables with row-level security, a trigger that seeds placeholder goals for each new account, and the small sign-in handoff table described below. You can safely run it again after updates.
2. In **Authentication → Sign In / Providers**, make sure **Email** is enabled.
3. In **Authentication → URL Configuration**, set:
   - **Site URL**: your Vercel URL, for example `https://nokto.vercel.app`.
   - **Redirect URLs**: add `https://nokto.vercel.app/**` and `http://localhost:5173/**`, using your own domain. Keep the `/**`: sign-in links carry extra parameters, and without it Supabase rejects them.
4. In **Project Settings → API**, copy the **Project URL** and the **anon public** key.

You don't need to edit any email templates.

## 2. Vercel

1. **Add New → Project**, then import `artemtimoshkov/Nokto`. The Vite framework preset is detected automatically.
2. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: your Project URL
   - `VITE_SUPABASE_ANON_KEY`: the anon public key (it's designed to be public; security comes from row-level security)
3. Click Deploy. Every push to `main` redeploys automatically.

## 3. Install on your phone

- **iPhone**: open the Vercel URL in Safari, tap **Share**, then **Add to Home Screen**. Open Nokto from the home screen, enter your email, and tap the link in the email. It opens in Safari; switch back to Nokto and you're signed in.
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
- **Sign-in on iPhone**: a home-screen app keeps its own storage, separate from Safari, so the emailed link opens in the wrong place. Nokto handles this: the app asks for the link with a random secret attached. Safari, which can't finish the sign-in, files the one-time code under that secret, and the app picks it up and redeems it. Redeeming the code needs a key that stays inside the app (PKCE), so the code is useless on its own. See `src/lib/handoff.ts`.
- **Sync**: changes save to Supabase right away and appear on screen before the server confirms. The app refetches whenever it comes back into focus, so your phone and laptop stay in step.
