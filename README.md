# Switchback

Find hiking partners. Match with people near you (or where you're traveling) who want to do the same hikes at the same difficulty, then chat, plan, and share a safety plan before you go.

Built with Next.js, Supabase (database, login, live chat, photos) and Twilio (safety texts). Installs on a phone from the browser ("Add to Home Screen").

## What's in v1

- **Email sign-in** (no passwords), adults only (18+, enforced in the database)
- **Profiles**: photo, bio, difficulty levels, availability, top 3 hikes, home area, private emergency contact
- **Discover**: one hiker at a time, filter by difficulty, Pass / Hike together. A match happens only when both people tap Hike together.
- **Travel mode**: add an upcoming trip; you see hikers who live there and they see you're visiting
- **Trips**: post a group hike, others ask to join, the host accepts or declines
- **Chat**: live messaging between matches
- **Safety plan**: share trail, partner and back-by time. If you don't tap "I'm back safe", your emergency contact gets a text.
- **Report, block, unmatch**, delete profile

## Setup (about 20 minutes)

### 1. Supabase (database + login)
1. Create a free project at supabase.com.
2. SQL Editor → paste all of `supabase/migrations/20261120000000_init.sql` → Run.
3. Authentication → URL Configuration → set **Site URL** to your app URL (use `http://localhost:3000` while testing; add the Vercel URL later under Redirect URLs).
4. Authentication → Email Templates → Magic Link: add `Your code: {{ .Token }}` to the template so people who installed the app can type the code instead of opening a link.
5. Project Settings → API: copy the URL, `anon` key, and `service_role` key.

### 2. Run it on your computer (optional)
```bash
cp .env.example .env.local   # fill in the Supabase values
npm install
npm run dev
```
Open http://localhost:3000.

### 3. Put it online with Vercel
1. vercel.com → Add New Project → import this GitHub repo.
2. Add the environment variables from `.env.example`.
3. Deploy. Add the Vercel URL to Supabase's Site URL / Redirect URLs.

### 4. Safety texts
1. Create a Twilio account, buy a number, and complete US A2P 10DLC registration (required for texting US numbers).
2. Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` in Vercel and redeploy.
3. Supabase → Database → Extensions: enable `pg_cron` and `pg_net`.
4. Edit the placeholders in `supabase/cron.sql` and run it in the SQL editor. It calls `/api/check-ins` every 5 minutes.

Until Twilio is set up, overdue alerts are written to the Vercel logs instead of texted. **Don't tell users alerts work until you've tested one end to end.**

## Before a public launch
- Terms of service, privacy policy, and an assumption-of-risk / liability waiver (have a lawyer review).
- Custom email sender (Supabase's built-in email is heavily rate-limited): Authentication → SMTP, e.g. Resend.
- A way to review the `reports` table and remove accounts.
- More areas: add rows to `public.areas`.

## Ideas for v2
Group chat for trip members, push notifications, ID verification (Stripe Identity), trail search from OpenStreetMap, App Store / Play Store builds.
