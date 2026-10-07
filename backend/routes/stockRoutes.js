import { Router } from 'express'
import * as stocks from '../controllers/stockController.js'

const router = Router()

router.get('/search', stocks.search)
router.get('/:symbol/candles', stocks.candles)
router.get('/:symbol/quote', stocks.quote)
router.get('/:symbol/zones', stocks.zones)
router.get('/:symbol/multi-timeframe', stocks.multiTimeframe)
router.get('/:symbol/summary', stocks.summary)

export default router
