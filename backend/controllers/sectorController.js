import { isValidTimeframe, TIMEFRAME_KEYS } from '../../shared/timeframes.js'
import { getSector, getSectorCandles, listSectors } from '../services/sectorService.js'
import { badRequest } from '../utils/httpError.js'

// GET /api/sectors
export async function list(req, res) {
  res.json(await listSectors())
}

// GET /api/sectors/:slug
export async function get(req, res) {
  res.json(await getSector(req.params.slug))
}

// GET /api/sectors/:slug/candles?timeframe=weekly
export async function candles(req, res) {
  const timeframe = req.query.timeframe ?? 'daily'
  if (!isValidTimeframe(timeframe)) {
    throw badRequest(`Invalid timeframe "${timeframe}". Use one of: ${TIMEFRAME_KEYS.join(', ')}.`)
  }
  res.json(await getSectorCandles(req.params.slug, timeframe))
}
