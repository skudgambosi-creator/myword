# My Word — Project Notes

## What this is
A Next.js 14 app (App Router) for a writing group called The Alphabet Project.
26 weeks, 26 letters, one submission per week. Members submit anonymously or signed.
Deployed at: https://myword-psi.vercel.app / https://www.my-word.co.uk

## Tech stack
- Next.js 14 (App Router)
- Supabase (auth + database + storage)
- Resend (transactional email)
- Vercel (hosting + cron jobs)
- TipTap (rich text editor)

## Key environment variables (set in Vercel)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `RESEND_API_KEY` — Resend API key (must be a live key, not test)
- `CRON_SECRET` — Secret used to protect /api/reveal and /api/reminders (currently: mywordsecret123)
- `NEXT_PUBLIC_APP_URL` — https://myword-psi.vercel.app
- `RESEND_TEST_EMAIL` — Set to evoelemoyne@gmail.com during testing, REMOVE for production

## The Alphabet Project group ID
`00000000-0000-0000-0000-000000000001`

## How to make changes
1. Open this folder in VS Code (C:\Users\skudg\Downloads\myword)
2. Start a Claude Code session
3. Describe what you want changed
4. Claude edits the files
5. Deploy: push to GitHub (Vercel auto-deploys) OR go to Vercel → Deployments → Redeploy

## How to deploy manually
Vercel → your project → Deployments → click the three dots on the latest → Redeploy

## How to test emails (during development)
1. Add `RESEND_TEST_EMAIL = evoelemoyne@gmail.com` in Vercel env vars, redeploy
2. All emails will route to that address with `[TEST → real@address.com]` prefix
3. Remove `RESEND_TEST_EMAIL` when going live

## Testing the reveal email manually (PowerShell)
First set a past closes_at in Supabase (see SQL below), then:
```
Invoke-WebRequest -Uri "https://myword-psi.vercel.app/api/reveal" -Method POST -Headers @{ Authorization = "Bearer mywordsecret123" }
```
After testing, reset revealed_at to NULL and closes_at to the real date (see SQL below).

## Testing the welcome email (PowerShell)
```
Invoke-WebRequest -Uri "https://myword-psi.vercel.app/api/welcome" -Method POST -ContentType "application/json" -Body '{"email":"evoelemoyne@gmail.com"}'
```

## Sending broadcast email to all members (PowerShell)
```
Invoke-WebRequest -Uri "https://myword-psi.vercel.app/api/broadcast" -Method POST -Headers @{ Authorization = "Bearer mywordsecret123" }
```

## Cron jobs (automatic, no action needed)
- `/api/reveal` — runs every Wednesday at 00:05 UTC. Reveals the week, writes scores, emails everyone.
- `/api/reminders` — runs daily at 08:00 UTC. Sends reminders on Thursday, Sunday, Tuesday only.
Check status: Vercel → Settings → Crons

## Key SQL commands (run in Supabase SQL editor)

**Fix a week gap (e.g. if week N closed but week N+1 hasn't opened yet):**
```sql
UPDATE weeks
SET opens_at = now(), closes_at = now() + interval '7 days'
WHERE group_id = '00000000-0000-0000-0000-000000000001' AND week_num = <N+1>;
```
Note: as of the March 2026 fix, the reveal cron now does this automatically — when it reveals week N it immediately opens week N+1 if it hasn't started yet. You should only need this SQL if the cron fails or you're fixing a one-off.

**Immediate fix for week C (March 2026 incident):**
```sql
UPDATE weeks
SET opens_at = now(), closes_at = now() + interval '7 days'
WHERE group_id = '00000000-0000-0000-0000-000000000001' AND week_num = 3;
```

Set week A close date:
```sql
UPDATE weeks SET closes_at = '2026-03-18T23:59:00Z'
WHERE group_id = '00000000-0000-0000-0000-000000000001' AND week_num = 1;
```

Reset week for reveal testing (temporarily close it):
```sql
UPDATE weeks SET revealed_at = NULL, closes_at = '2026-03-14T00:00:00Z'
WHERE group_id = '00000000-0000-0000-0000-000000000001' AND week_num = 1;
```

Reset week back to real date after testing:
```sql
UPDATE weeks SET revealed_at = NULL, closes_at = '2026-03-18T23:59:00Z'
WHERE group_id = '00000000-0000-0000-0000-000000000001' AND week_num = 1;
```

## Key decisions / things to remember
- Registration closes when the last week (week_num = 26) closes — anyone with the link can join until the very end
- Anonymous submissions show as Member #N, signed show their signed_name
- Old columns (identity_mode, noname_number, display_name) were removed — do not reference them
- The `@supabase/ssr` package must stay at v0.9.0 or higher — v0.3.0 broke auth
- Login page uses useRef (not useState) for inputs — browser autofill doesn't trigger onChange
- All emails go through lib/email.ts — the RESEND_TEST_EMAIL override lives there
- Reveal email shuffles submission order randomly each time

## Email routes
- `POST /api/welcome` — sends welcome email to a single address (body: `{"email":"..."}`)
- `POST /api/reveal` — reveals current week + emails all members (needs CRON_SECRET header)
- `POST /api/reminders` — sends reminders to non-submitters (needs CRON_SECRET header)
- `POST /api/broadcast` — sends a message to all members (needs CRON_SECRET header)
- `POST /api/invite` — sends invitation email (body: `{"groupId","email","groupName"}`)
