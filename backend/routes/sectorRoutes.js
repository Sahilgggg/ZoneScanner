import { Router } from 'express'
import * as sectors from '../controllers/sectorController.js'

const router = Router()

router.get('/', sectors.list)
router.get('/:slug', sectors.get)
router.get('/:slug/candles', sectors.candles)

export default router
