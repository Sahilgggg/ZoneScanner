import { INDEXES } from '../../shared/universes.js'
import { getIndex } from '../services/indexService.js'

// GET /api/universes
export function list(req, res) {
  res.json(INDEXES)
}

// GET /api/universes/:id  (nifty50 | nifty100 | nifty500)
export async function get(req, res) {
  res.json(await getIndex(req.params.id))
}
