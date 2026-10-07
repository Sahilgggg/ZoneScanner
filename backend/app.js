import compression from 'compression'
import cors from 'cors'
import express from 'express'
import { isDbConnected } from './config/db.js'
import { env } from './config/env.js'
import stockRoutes from './routes/stockRoutes.js'
import universeRoutes from './routes/universeRoutes.js'
import { cacheStats } from './services/candleService.js'

const app = express()

const allowedOrigins = env.corsOrigins.map(
  (origin) => new RegExp(`^${origin.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[a-z0-9-]+')}$`, 'i'),
)

app.set('trust proxy', 1) // Render sits behind a proxy
app.use(
  cors({
    // Requests without an Origin header (curl, health checks) are always allowed.
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.some((re) => re.test(origin))),
  }),
)
app.use(compression()) // daily histories are large JSON; gzip shrinks them ~5×
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: isDbConnected() ? 'mongodb' : 'memory-only',
    dataSource: 'Yahoo Finance (NSE, delayed)',
    ...cacheStats(),
  })
})

app.use('/api/stocks', stockRoutes)
app.use('/api/universes', universeRoutes)

app.use('/api', (req, res) => {
  res.status(404).json({ message: `No API route for ${req.method} ${req.originalUrl}` })
})

// Express 5 forwards errors from async handlers here.
app.use((error, req, res, _next) => {
  const status = error.status ?? 500
  if (status >= 500) console.error(`${req.method} ${req.originalUrl} →`, error.message)
  res.status(status).json({ message: status >= 500 && !error.status ? 'Internal server error' : error.message })
})

export default app
