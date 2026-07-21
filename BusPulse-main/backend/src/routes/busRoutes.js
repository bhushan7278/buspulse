import express from 'express'
import {
  getAvailableBusesByRoute,
  getBusyBusesByRoute
} from '../controllers/busController.js'

const router = express.Router()

router.get('/buses/available/:routeId', getAvailableBusesByRoute)
router.get('/buses/busy/:routeId', getBusyBusesByRoute)

export default router
