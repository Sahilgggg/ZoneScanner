import { Router } from 'express'
import * as universes from '../controllers/universeController.js'

const router = Router()

router.get('/', universes.list)
router.get('/:id', universes.get)

export default router
