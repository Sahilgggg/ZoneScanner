# Stock Scanner API

Express + MongoDB backend for the Demand & Supply zone scanner.

- **Prices:** NSE daily candles from Yahoo Finance's public chart endpoint (`SYMBOL.NS`). Unofficial, split-adjusted, delayed ~15 min.
- **Index lists:** official NIFTY 50 / 100 / 500 constituent CSVs from `archives.nseindia.com`, refreshed daily.
- **Zones:** the shared engine in `../shared/engine` (same code the frontend uses).
- **Cache:** MongoDB if reachable, otherwise in memory.

## Run

```bash
cd backend
npm install
cp .env.example .env    # first time only (Windows PowerShell: copy .env.example .env)
npm run dev             # http://localhost:5000, restarts on file changes
```

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Status, cache mode |
| GET | `/api/universes` | Available indexes |
| GET | `/api/universes/:id` | Constituents of `nifty50`, `nifty100` or `nifty500` |
| GET | `/api/stocks/search?q=usha` | Symbol / company search (NIFTY 500) |
| GET | `/api/stocks/:symbol/candles?timeframe=daily` | Candles + quote |
| GET | `/api/stocks/:symbol/quote` | Latest price |
| GET | `/api/stocks/:symbol/zones?timeframe=weekly` | Zones with status and strength |
| GET | `/api/stocks/:symbol/multi-timeframe` | Headline demand/supply zone per timeframe |
| GET | `/api/stocks/:symbol/summary` | Slim zones for all timeframes (used by the scanner) |

Timeframes: `daily`, `weekly`, `monthly`, `quarterly`, `halfyearly`, `yearly`.
