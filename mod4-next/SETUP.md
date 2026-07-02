# Setup — Supabase + local env

## 1. Environment variables

Copy the example file and fill in your Supabase project's values (Project Settings → API):

```
cp .env.local.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the `anon` `public` key (not the service role key)

## 2. Create the first admin login

The login form only asks for a username, but Supabase Auth is email-based under the hood.
This app resolves `username` → `username@mod4.internal` automatically (see
`app/api/auth/login/route.ts`), so you create the user in Supabase using that exact email
shape.

In the Supabase dashboard:

1. Go to **Authentication → Users**.
2. Click **Add user** → **Create new user**.
3. Email: `admin@mod4.internal` (or `<whatever-username>@mod4.internal` — the part before
   `@` is what you'll type into the "Username" field on the login page).
4. Set a password.
5. **Check "Auto Confirm User"** before saving. This is required — `mod4.internal` isn't a
   real domain, so there's no inbox to click a confirmation link from. If you skip this,
   the account will exist but sign-in will fail with an "email not confirmed" error.

Repeat for any additional admin usernames you want.

## 3. Run it

```
npm install
npm run dev
```

Visit `http://localhost:3000/admin/login` and sign in with the username portion only
(e.g. `admin`), not the full email.
