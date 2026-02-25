# Deploy Frontend to Vercel + Backend to Railway

## 1) Railway (Backend)
- Create a new Railway project from this repo.
- Set root directory to repository root.
- Railway will use [railway.json](/D:/GameSS/GameHub/vercel/railway.json).
- Required commands:
  - Build: `npm run build`
  - Start: `npm run start`
- After deploy, copy your Railway public URL (example: `https://your-app.up.railway.app`).

## 2) Vercel (Frontend)
- Create a Vercel project from the same repo.
- Vercel will use [vercel.json](/D:/GameSS/GameHub/vercel/vercel.json).
- Set this environment variable in Vercel:
  - `VITE_API_BASE_URL=https://your-app.up.railway.app`
- Optional (recommended for WebSocket reliability):
  - `VITE_WS_URL=wss://your-app.up.railway.app/ws`
- Redeploy after adding env vars.

## 3) Why this works
- Frontend static files are hosted on Vercel.
- All frontend requests to `/api`, `/uploads`, `/songs` are automatically routed to `VITE_API_BASE_URL` at runtime.
- WebSocket connects to `VITE_WS_URL` (or falls back to `VITE_API_BASE_URL` + `/ws`).

## 4) Local development (unchanged)
- Keep `VITE_API_BASE_URL` empty locally.
- `npm run dev` still uses same-origin local backend.
