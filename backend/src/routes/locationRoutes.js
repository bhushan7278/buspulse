import express from 'express'
import {
  updateLocationByTrip,
  updateGeneralLocation,
  getLatestLocation,
  getActiveLocationsByRoute,
  getTrackBusData
} from '../controllers/locationController.js'
import { verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

// Driver and simulator location updates (used by tracking link on mobile)
router.post('/location/update', updateLocationByTrip)
router.post('/update-location', updateGeneralLocation)
router.get('/get-location', getLatestLocation)

// Fleet active locations monitoring on Extra Bus admin screen
router.get('/locations/active/:routeId', verifyToken, getActiveLocationsByRoute)

// Dedicated Track Bus page telemetry API (Admin Protected)
router.get('/track-bus/active/:routeId', verifyToken, getTrackBusData)

export default router
