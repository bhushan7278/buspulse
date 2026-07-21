import express from 'express'
import {
  getDriversByRoute,
  getAvailableDriversByRoute,
  getBusyDriversByRoute,
  getPresentDriversByRoute,
  recordAttendance,
  checkOutDriver
} from '../controllers/driverController.js'

const router = express.Router()

router.get('/drivers/:routeId', getDriversByRoute)
router.get('/drivers/available/:routeId', getAvailableDriversByRoute)
router.get('/drivers/busy/:routeId', getBusyDriversByRoute)
router.get('/drivers/present/:routeId', getPresentDriversByRoute)
router.post('/attendance', recordAttendance)
router.post('/check-out', checkOutDriver)

export default router
