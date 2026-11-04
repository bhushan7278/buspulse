import express from 'express'
import {
  getAllDrivers,
  getAllPresentDrivers,
  createDriver,
  getDriversByRoute,
  getAvailableDriversByRoute,
  getBusyDriversByRoute,
  getPresentDriversByRoute,
  recordAttendance,
  checkOutDriver
} from '../controllers/driverController.js'
import { verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

// Depot-wide Driver Management & Attendance (Admin Protected)
router.get('/drivers', verifyToken, getAllDrivers)
router.get('/drivers/present', verifyToken, getAllPresentDrivers)
router.post('/drivers', verifyToken, createDriver)
router.post('/attendance', verifyToken, recordAttendance)
router.post('/check-out', verifyToken, checkOutDriver)

// Route-specific queries (for dispatch and available resources)
router.get('/drivers/:routeId', verifyToken, getDriversByRoute)
router.get('/drivers/available/:routeId', verifyToken, getAvailableDriversByRoute)
router.get('/drivers/busy/:routeId', verifyToken, getBusyDriversByRoute)
router.get('/drivers/present/:routeId', verifyToken, getPresentDriversByRoute)

export default router
