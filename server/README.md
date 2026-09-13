# Avant API server

Holds the Gemini API key server-side so it never ships in the frontend bundle.

## Setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env` and set `GEMINI_API_KEY` to your **new** key (rotate the old
one in Google AI Studio / Google Cloud console — it was previously exposed in
the frontend and must be treated as compromised).

## Run

```bash
npm run dev
```

Runs on `http://localhost:4001` by default. The frontend's Vite dev server
proxies `/api/*` to it (see `vite.config.ts`), so no CORS setup is needed
locally.

## Endpoints

- `POST /api/chat` — `{ history, message, systemInstruction, model? }` →
  `{ text }`. Proxies one turn of the text/voice-note chat.
- `POST /api/live-token` — `{}` → `{ token }`. Mints a short-lived token the
  browser uses to open a Live API session directly with Gemini (this call
  needs a real WebSocket from the browser for latency, so it can't be fully
  proxied — the token limits the blast radius instead of exposing the
  permanent key).

## Deploying

### Render (one click via Blueprint)

There's a `render.yaml` at the repo root. In the Render dashboard: **New >
Blueprint**, point it at this repo. It creates a web service rooted at
`server/` with `npm install` / `npm start`. Render will prompt you for
`GEMINI_API_KEY` and `CORS_ORIGIN` during setup (kept out of the repo on
purpose — set `CORS_ORIGIN` to your Vercel frontend URL). Render assigns
`PORT` itself; the server already reads `process.env.PORT`.

### Anywhere else

Deploy this folder as its own Node service (Railway, Fly.io, a VM, etc). Set
`GEMINI_API_KEY` and `CORS_ORIGIN` (your deployed frontend's origin) as
environment variables on that host.

### After the backend is live

Set `VITE_API_BASE_URL` in the frontend's Vercel project (or `.env` for a
local build) to this service's URL, then rebuild/redeploy the frontend.
