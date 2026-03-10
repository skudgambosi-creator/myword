# My Word

A collaborative writing web application. 26 letters. 26 weeks.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Environment variables
Copy `.env.local.example` to `.env.local` and fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://yvifilhyyzxdrjmwrrpx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_kvY7Fove6epdQjRsMI-7Gw_diy1jW2x
SUPABASE_SERVICE_ROLE_KEY=sb_secret_vdj43a5r6L_mcAigwIwYCg_Npkm0-s_
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_APP_URL=https://myword.vercel.app
CRON_SECRET=generate_a_random_string_here
```

### 3. Set up Supabase database
- Go to your Supabase project → SQL Editor
- Run the contents of `supabase-schema.sql`
- Do this for BOTH production and staging projects

### 4. Create Supabase Storage buckets
In Supabase → Storage, create two public buckets:
- `avatars`
- `submission-images`

### 5. Run locally
```bash
npm run dev
```
Visit http://localhost:3000

## Deployment

See the deployment guide for Vercel setup instructions.
