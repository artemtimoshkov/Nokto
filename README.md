# Nokto

Your North Star goals and everyday to-dos in one minimal app. It installs on your phone from the web and syncs across every device through your account.

- **Today**: Todoist-style to-dos with priority, area of life, date, time and repeats (daily, weekdays, weekly, monthly, quarterly, or custom with an end date).
- **Bucket list**: life goals grouped by area of life. You start with 10 areas and can add, rename or delete them, and placeholder goals are pre-filled for you to edit.
- **Search**: a search bar on Today and Bucket list (press `/` on a laptop).
- **Mini apps**: fun side apps under their own tab. The first is **Circle**, a small friends CRM: birthdays, siblings, where they grew up, nationality, photo, type of friend (best, good, acquaintance), LinkedIn and Instagram, when you last talked, and dated notes on what you talked about.
  - **Kitchen** holds your recipes. Each one shows its ingredients and total time, scales amounts to the number of servings, and has two views of the method: numbered steps, or a recipe table (ingredients down the side, time across the top, what you do in each cell, in the style of Cooking for Engineers' tabular recipe notation). **Start cooking** opens a full-screen, step-by-step mode with timers that keeps the screen on. To add a recipe you can type it in, or paste one from a website and Kitchen splits it into ingredients and steps for you.
  - **Folio** is your library of the books you've read: a shelf of covers showing title, author, when you read it, your rating and whether you're reading or finished. Open a book for a short summary, three key lessons, your thoughts, favourite quotes, and who you'd recommend it to.
  - **Reps** is a workout log built around the exercises you know. Add the ones you like from a built-in catalog of about 900 (each with start and end photos, shown as a short animation, and step-by-step instructions) or create your own, grouped by muscle. Start a workout, pick an exercise and log sets as reps × kg, bodyweight reps, time, or cardio (minutes, km, km/h). Each set is pre-filled with what you did last time.

Each mini app lives in its own folder under `src/apps/` and is listed in `src/apps/registry.ts`. It's only downloaded when you first open it, has its own Supabase tables, and keeps its own copy of data in demo mode.

Stack: Vite + React + TypeScript, Supabase (auth + Postgres), and a PWA via `vite-plugin-pwa`, deployed on Vercel.

## 1. Supabase

1. In **SQL Editor**, paste and run [`supabase/schema.sql`](supabase/schema.sql). It creates the `goals` and `todos` tables, the mini-app tables (`friends`, `friend_notes`, `recipes`, `books`, `reps_exercises`, `reps_workouts`, `reps_sets`) with row-level security, a trigger that seeds placeholder goals for each new account, and the small sign-in handoff table described below. You can safely run it again after updates.
2. Turn on Google sign-in. See **Google sign-in** below. Keep **Email** enabled too, since it's the backup option.
3. In **Authentication → URL Configuration**, set:
   - **Site URL**: your Vercel URL, for example `https://nokto.vercel.app`.
   - **Redirect URLs**: add `https://nokto.vercel.app/**` and `http://localhost:5173/**`, using your own domain. Keep the `/**`: sign-in links carry extra parameters, and without it Supabase rejects them.
4. In **Project Settings → API**, copy the **Project URL** and the **anon public** key.

You don't need to edit any email templates.

### Google sign-in

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project, for example "Nokto".
2. Open **APIs & Services → OAuth consent screen** (also called **Google Auth Platform**):
   - App name **Nokto**, your email as the support email, audience **External**.
   - Under **Audience**, either click **Publish app**, or add your Gmail under **Test users**.
3. Open **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins**: your Vercel URL, for example `https://nokto.vercel.app`
   - **Authorized redirect URIs**: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`, using your Supabase Project URL followed by `/auth/v1/callback`
   - Click **Create**, then copy the **Client ID** and **Client secret**.
4. In Supabase, go to **Authentication → Sign In / Providers → Google**. Turn it on, paste the Client ID and Client secret, and click **Save**.

## 2. Vercel

1. **Add New → Project**, then import `artemtimoshkov/Nokto`. The Vite framework preset is detected automatically.
2. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: your Project URL
   - `VITE_SUPABASE_ANON_KEY`: the anon public key (it's designed to be public; security comes from row-level security)
3. Click Deploy. Every push to `main` redeploys automatically.

## 3. Install on your phone

- **iPhone**: open the Vercel URL in Safari, tap **Share**, then **Add to Home Screen**. Open Nokto from the home screen and tap **Continue with Google**. If Google opens in Safari instead, finish there, then switch back to Nokto and you'll be signed in.
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
- **Sign-in on iPhone**: a home-screen app keeps its own storage, separate from Safari, so a sign-in that finishes in Safari (Google or the email link) can't reach the app on its own. Nokto handles this: the app asks for the link with a random secret attached. Safari, which can't finish the sign-in, files the one-time code under that secret, and the app picks it up and redeems it. Redeeming the code needs a key that stays inside the app (PKCE), so the code is useless on its own. See `src/lib/handoff.ts`.
- **Missed**: swipe a task left on your phone (or use **Missed** in its window, or the × on hover on a laptop) to cross it out. A one-off task leaves the list but isn't deleted. A repeating task skips only today's occurrence and moves to the next date. Each done or missed occurrence is recorded in `todo_log`.
- **Offline**: the app itself is cached by the service worker, and your data is kept on the device, so Nokto opens and works with no connection. Every change goes into an outbox in local storage first and is sent to Supabase in order; offline, it waits and is sent once you're back online or open the app again. A small **Offline · N to sync** pill shows while changes are waiting. New rows get their ids on the device, so a change can be queued before the server has seen the row. See `src/lib/outbox.ts`.
- **Sync**: changes appear on screen straight away. Whenever the app comes back into focus or online, it sends anything queued, then refetches, so your phone and laptop stay in step. Changes made on two devices while both are offline are last-write-wins per field.

## Credits

Reps' exercise catalog, photos and instructions come from [free-exercise-db](https://github.com/yuhonas/free-exercise-db), released into the public domain. `node scripts/reps-catalog.mjs` rebuilds `src/apps/reps/catalog.json` from the latest version.
