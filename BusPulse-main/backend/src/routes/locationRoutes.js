import express from 'express'
import {
  updateLocationByTrip,
  updateGeneralLocation,
  getLatestLocation,
  getActiveLocationsByRoute
} from '../controllers/locationController.js'

const router = express.Router()

router.post('/location/update', updateLocationByTrip)
router.post('/update-location', updateGeneralLocation)
router.get('/get-location', getLatestLocation)
router.get('/locations/active/:routeId', getActiveLocationsByRoute)

export default router
