# Demand & Supply Zone Scanner

A web app that finds **demand and supply zones** on NSE stocks using clearly defined price-action rules, tracks each zone through its lifecycle, and scans whole indices (NIFTY 50 / 100 / 500 or your own list) to show which stocks are approaching, inside, or reacting from a zone on any timeframe.

> This is our own rule-based price-action system. It is not a copy of any proprietary methodology, and it is a **scanning tool, not investment advice**. Market data is delayed and comes from an unofficial source; always confirm on your broker's chart.

---

## Features

**Single-stock analyzer**
- Interactive candlestick chart (Lightweight Charts): volume, zoom, pan, crosshair, OHLC readout, current-price line
- Demand (teal) and supply (red) zones drawn as rectangles; broken zones shown dashed grey
- Click a zone (on the chart or in the zone table) to see its full details and score breakdown
- Timeframe switch in the chart header: **1D · 1W · 1M · 3M · 6M · 1Y**
- Multi-timeframe overview: nearest demand and supply zone + status for every timeframe
- Search by NSE symbol or company name

**Multi-stock scanner**
- Universes: NIFTY 50, NIFTY 100, NIFTY 500 (official NSE lists), or a custom list
- 12 categories per timeframe:

  | Demand | Supply |
  |---|---|
  | New Demand Zones | New Supply Zones |
  | Approaching Demand | Approaching Supply |
  | In Demand Zone | In Supply Zone |
  | Reacting From Demand | Reacting From Supply |
  | Weakening Demand | Weakening Supply |
  | Demand Broken | Supply Broken |

- "All timeframes" matrix: stock counts for every category × timeframe; click a cell to jump there
- Sortable results (price, distance, strength, touches…), symbol filter, minimum-strength filter
- Click a stock to open its chart in a side drawer; step through results with ← / →, switch timeframe with 1–6, or open the full analyzer

---

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React 19, Vite, React Router, Axios, Lightweight Charts 5 |
| Backend | Node.js 22, Express 5, Mongoose 9 |
| Database | MongoDB (Atlas or local) — used as a cache |
| Prices | Yahoo Finance public chart endpoint (`SYMBOL.NS`) |
| Index lists | NSE published CSVs (`archives.nseindia.com`) |
| Hosting | Vercel (frontend), Render (backend) |

---

## Project structure

```
stock-scanner/
├── frontend/                 React app (deploys to Vercel)
│   ├── src/
│   │   ├── pages/            ScannerPage, StockAnalyzer
│   │   ├── components/       StockChart, ChartPreview, CategoryBoard, TimeframeMatrix,
│   │   │                     ScanResultsTable, ZoneInfo, ZoneTable, MultiTimeframe,
│   │   │                     StockSearch, TimeframeSelector
│   │   ├── chart/            zonesPrimitive.js – draws zone rectangles + click hit-testing
│   │   ├── services/         api.js, marketData.js, scanner.js
│   │   ├── data/             universes.js, demoMarket.js (synthetic demo data)
│   │   └── utils/            constants.js, format.js
│   └── vercel.json
├── backend/                  Express API (deploys to Render)
│   ├── config/               env.js, db.js
│   ├── models/               PriceHistory, IndexList
│   ├── services/             marketDataService (Yahoo), candleService (cache),
│   │                         zoneService, indexService (NSE lists)
│   ├── controllers/, routes/, utils/
│   └── app.js, server.js
├── shared/                   Used by BOTH frontend and backend
│   ├── engine/               config, candles, zoneDetector, zoneStatus, zoneScore,
│   │                         analyzeStock, summary
│   └── universes.js, timeframes.js
└── render.yaml               Render Blueprint
```

The zone engine lives in `shared/` so the browser and the server always produce identical results.

---

## How zones are detected

All thresholds and weights are in [`shared/engine/config.js`](shared/engine/config.js). "ATR" means multiples of the Average True Range of the timeframe being analysed, so the same rules work on daily and yearly candles.

### 1. Candle classification
- **Base candle:** body ≤ 50% of its range (indecision)
- **Explosive candle:** body ≥ 55% of its range, range ≥ 1 × ATR, in the zone's direction

### 2. Zone = base + strong departure
1–4 consecutive base candles followed by an explosive leg-out candle, with a total departure of at least **1.5 × ATR** within 3 candles. Zones wider than 2.5 × ATR are rejected.

| | Proximal line | Distal line |
|---|---|---|
| **Demand** | highest body top of the base | lowest low of base + leg-out |
| **Supply** | lowest body bottom of the base | highest high of base + leg-out |

### 3. Pattern (from the leg-in)
| Demand | Supply |
|---|---|
| **RBR** Rally-Base-Rally | **DBD** Drop-Base-Drop |
| **DBR** Drop-Base-Rally | **RBD** Rally-Base-Drop |

Confluence tags: **Strong reversal** (big leg-in + big departure on DBR/RBD), **Breakout/Breakdown origin** (departure breaks the last 20-candle swing = break of structure), **FVG** (fair-value gap in the departure), **Volume** (leg-out volume ≥ 1.3 × prior average).

### 4. Lifecycle status
Evaluated on every candle after the zone formed:

| Status | Meaning |
|---|---|
| **New** (FORMED) | Formed in the last 5 candles, untested |
| **Fresh** | Never tested, price still far away |
| **Approaching** | Price within 1.5 × ATR of the proximal line |
| **In Zone** | Latest close is inside the zone |
| **Reacting** | Touched within the last 5 candles **and** rejected (wick ≥ 40% or close back outside) **and** a confirmation candle closed back outside the zone in the zone's direction — a simple touch is not a reaction |
| **Tested** | Tested 1–2 times, price far away again |
| **Weakening** | Price is near, but the zone has been tested ≥ 3 times or penetrated ≥ 75% |
| **Broken** | A candle closed beyond the distal line (shown for 5 candles) |

### 5. Strength score (0–100)

| Factor | Weight |
|---|---|
| Departure strength | 25 |
| Base quality (fewer, tighter candles) | 15 |
| Break of structure | 15 |
| Freshness (fewer touches) | 15 |
| Volume confirmation | 10 |
| Risk / reward (move away before first test) | 10 |
| Imbalance (FVG) | 5 |
| Pattern (reversal > DBR/RBD > continuation) | 5 |

**80–100** Strong · **60–79** Good · **40–59** Medium · **< 40** Weak

The weights are initial assumptions, kept in one config object and returned as a per-factor breakdown so they can be tuned by backtesting later.

---

## Running locally

**Requirements:** Node.js 20+ and (optionally) MongoDB. Without MongoDB the backend still runs with an in-memory cache.

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env          # Windows PowerShell: copy .env.example .env
# edit .env → set MONGODB_URI (local or Atlas)
npm run dev                   # http://localhost:5000

# 2. Frontend (second terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

In development the frontend proxies `/api` to `localhost:5000`, so no CORS setup is needed.

**Demo mode (no backend):** create `frontend/.env` with `VITE_DATA_SOURCE=demo` to use synthetic, clearly labelled prices generated in the browser.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Port (Render sets this automatically) |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/stock-scanner` | MongoDB / Atlas connection string |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origins, comma-separated; `*` wildcard allowed (e.g. `https://app.vercel.app,https://app-*.vercel.app`) |
| `CACHE_TTL_MINUTES` | `30` | Re-download a stock's latest candles after this long |
| `INDEX_TTL_HOURS` | `24` | Re-download NSE index lists after this long |
| `YAHOO_CONCURRENCY` | `4` | Max parallel requests to Yahoo Finance |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_DATA_SOURCE` | `api` | `api` = real data from the backend, `demo` = synthetic data |
| `VITE_API_BASE_URL` | `/api` | Backend URL; set to `https://<render-service>.onrender.com/api` in production |

Never commit real `.env` files — they are ignored by `.gitignore`; only the `.env.example` templates are tracked.

---

## API

Base URL: `/api`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Status and cache mode (`mongodb` / `memory-only`) |
| GET | `/universes` | Available indices |
| GET | `/universes/:id` | Constituents of `nifty50`, `nifty100`, `nifty500` |
| GET | `/stocks/search?q=usha` | Search symbols and company names |
| GET | `/stocks/:symbol/candles?timeframe=daily` | Candles + quote |
| GET | `/stocks/:symbol/quote` | Latest price and change |
| GET | `/stocks/:symbol/zones?timeframe=weekly` | Zones with status, strength and details |
| GET | `/stocks/:symbol/multi-timeframe` | Headline demand/supply zone per timeframe |
| GET | `/stocks/:symbol/summary` | Compact zones for all timeframes (used by the scanner) |

Timeframes: `daily`, `weekly`, `monthly`, `quarterly`, `halfyearly`, `yearly`.
Errors return JSON `{ "message": "…" }` with status 400 (bad input), 404 (unknown symbol) or 502 (data provider unreachable).

---

## Deployment

### 1. MongoDB Atlas
1. Create a free cluster and a database user.
2. **Network Access** → add `0.0.0.0/0` (Render's free tier has no fixed IP; the database user/password still protects access).
3. Copy the connection string and add a database name, e.g. `…mongodb.net/stock-scanner?retryWrites=true&w=majority`.

### 2. Backend → Render
1. Render dashboard → **New → Blueprint** → select this repository (uses [`render.yaml`](render.yaml)).
2. Set the secret variables when prompted:
   - `MONGODB_URI` = your Atlas connection string
   - `CORS_ORIGIN` = your Vercel URL (you can update it after step 3)
3. Deploy, then open `https://<service>.onrender.com/api/health` — it should show `"database": "mongodb"`.

### 3. Frontend → Vercel
1. Vercel → **Add New → Project** → import this repository.
2. **Root Directory:** `frontend` (Vite is detected automatically).
3. Environment variable: `VITE_API_BASE_URL` = `https://<service>.onrender.com/api`
4. Deploy, then put the Vercel URL into Render's `CORS_ORIGIN` (add `https://<project>-*.vercel.app` too if you want preview deployments to work).

### Notes
- **Render free tier sleeps** after ~15 minutes idle; the first request afterwards takes up to a minute. The frontend shows a "waking up, try again" message.
- **First scan of NIFTY 500** downloads every stock's history (~45 s locally); after that it is served from MongoDB.
- **Yahoo Finance** is unofficial and may rate-limit cloud IPs. If scans fail on Render, lower `YAHOO_CONCURRENCY` or switch to a licensed data provider (only `backend/services/marketDataService.js` needs to change).

---

## Roadmap

- Backtesting harness to tune the weights in `shared/engine/config.js` against historical reactions
- Server-side scheduled scans and alerts (new zone / price entering a zone)
- Licensed real-time data provider option
- Watchlists and saved custom universes per user

---

## Disclaimer

For educational and research purposes only. Zone detection is a mechanical, rule-based interpretation of price action and can be wrong. Nothing here is a recommendation to buy or sell any security. Data may be delayed, incomplete, or inaccurate.
