# MovieSelector

Personal Letterboxd-style PWA for movies and TV — search via TMDB, track a watchlist, rate what you finish, and install it on your phone home screen.

## Features

- First-run welcome: **Already joined** (PIN) or **New here** (account wizard)
- Profile: name, photo, favourite genres & movies, auto or custom PIN
- Search movies & TV (TMDB posters, cast, descriptions)
- Watchlist with **Random** pick
- Multi-step rating wizard (score /10, feelings, notes, date)
- Watched archive with filters (highest/lowest rated, newest, title)
- TV episode tracking; per-episode /10; full wizard when the series is done
- IMDb + Rotten Tomatoes scores via OMDb (your rating sorts first)
- Per-user data in Neon Postgres + PWA for phone home screen

## Setup

### 1. API keys & database

1. **TMDB** — [Create an API key](https://www.themoviedb.org/settings/api)
2. **OMDb** — [Request a free key](https://www.omdbapi.com/apikey.aspx)
3. **Neon** — [Create a project](https://neon.tech) and copy the connection string

Copy env file and fill values:

```bash
cp .env.example .env.local
```

```env
DATABASE_URL=postgresql://...
AUTH_SECRET=a-long-random-string
TMDB_API_KEY=...
OMDB_API_KEY=...
```

### 2. Install & migrate

```bash
npm install
npm run db:push
```

If you already ran an older schema, also apply `drizzle/0001_users.sql` in the Neon SQL editor (or reset the DB and re-run `db:push`).

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **New here** to create your account, or **Already joined** with your PIN on another device.

## Deploy on Vercel

1. Push this repo to GitHub and import the project in Vercel
2. Add env vars: `DATABASE_URL`, `AUTH_SECRET`, `TMDB_API_KEY`, `OMDB_API_KEY`
3. Deploy
4. Run `npm run db:push` once against production `DATABASE_URL` (or paste `drizzle/0000_init.sql` in Neon)

### Add to phone home screen

- **iOS Safari:** Share → Add to Home Screen  
- **Android Chrome:** Menu → Install app / Add to Home screen  

Use the production HTTPS URL so the PWA installs cleanly. On your phone, choose **Already joined** and enter the same PIN.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run db:push` | Push Drizzle schema to Neon |
| `npm run db:studio` | Browse data in Drizzle Studio |
