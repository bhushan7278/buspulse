import express from 'express'
import {
  getAllAvailableBuses,
  getAvailableBusesByRoute,
  getAllBuses,
  createBus,
  deleteBus,
  getAllBusyBuses,
  getBusyBusesByRoute
} from '../controllers/busController.js'
import { verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

// Fleet-wide bus availability (Global Fleet)
router.get('/buses/available', verifyToken, getAllAvailableBuses)
router.get('/buses/available/:routeId', verifyToken, getAvailableBusesByRoute)

// Depot Bus Management APIs (Admin Protected)
router.get('/buses', verifyToken, getAllBuses)
router.post('/buses', verifyToken, createBus)
router.delete('/buses/:id', verifyToken, deleteBus)

// Busy buses
router.get('/buses/busy', verifyToken, getAllBusyBuses)
router.get('/buses/busy/:routeId', verifyToken, getBusyBusesByRoute)

export default router
