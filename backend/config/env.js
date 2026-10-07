import dotenv from 'dotenv'

dotenv.config({ quiet: true })

function number(name, fallback) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export const env = {
  port: number('PORT', 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stock-scanner',
  // Comma-separated list of allowed frontend origins. "*" works as a wildcard,
  // e.g. "https://my-app.vercel.app,https://my-app-*.vercel.app".
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  // Re-download a stock's latest candles when the cached copy is older than this.
  cacheTtlMinutes: number('CACHE_TTL_MINUTES', 30),
  // Index constituent lists change rarely.
  indexTtlHours: number('INDEX_TTL_HOURS', 24),
  // Max simultaneous requests to Yahoo Finance.
  yahooConcurrency: number('YAHOO_CONCURRENCY', 4),
  // How many stock histories to keep in RAM (the rest are read from MongoDB).
  // Each is ~0.5 MB; keep this low on small instances such as Render's free tier.
  memoryCacheSymbols: number('MEMORY_CACHE_SYMBOLS', 150),
  // Rebuild the equal-weighted sector indices after this many hours.
  sectorTtlHours: number('SECTOR_TTL_HOURS', 12),
}
