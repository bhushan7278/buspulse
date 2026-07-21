import express from 'express'
import {
  getTripById,
  startTrip,
  endTrip,
  freeResources
} from '../controllers/tripController.js'

const router = express.Router()

router.get('/trip/:id', getTripById)
router.post('/start-trip', startTrip)
router.post('/end-trip', endTrip)
router.post('/free-resources', freeResources)

export default router
