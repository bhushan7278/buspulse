import express from 'express'
import { getRoutesList, seedDatabase } from '../controllers/routeController.js'
import { verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/routes', getRoutesList)
router.get('/seed', verifyToken, seedDatabase)

export default router
