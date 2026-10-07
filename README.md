# Demand & Supply Zone Scanner

Price-action demand/supply zone detection for NSE stocks, with a multi-stock
scanner (NIFTY 50 / 100 / 500 / custom) and an interactive chart analyzer.

| Folder | What it is | Deploys to |
|---|---|---|
| `frontend/` | React + Vite + Lightweight Charts | Vercel |
| `backend/` | Node + Express + MongoDB API | Render |
| `shared/` | Zone engine used by both | (bundled into each) |

Prices come from Yahoo Finance's public endpoint (delayed, unofficial); index
lists from NSE's published CSVs. This is a scanning tool, not investment advice.

## Run locally

```bash
cd backend && npm install && cp .env.example .env && npm run dev   # http://localhost:5000
cd frontend && npm install && npm run dev                           # http://localhost:5173
```

## Deploy

- **Backend (Render):** New → Blueprint → this repo (uses `render.yaml`).
  Set `MONGODB_URI` and `CORS_ORIGIN` (your Vercel URL) in the dashboard.
- **Frontend (Vercel):** Import the repo, Root Directory `frontend`.
  Set `VITE_API_BASE_URL` to `https://<your-render-service>.onrender.com/api`.
