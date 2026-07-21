import express from 'express'
import { getRoutesList, seedDatabase } from '../controllers/routeController.js'

const router = express.Router()

router.get('/routes', getRoutesList)
router.get('/seed', seedDatabase)

export default router
