import express from 'express'
import {
  getTripById,
  startTrip,
  endTrip,
  getActiveTrips,
  recordDestinationArrival,
  startReturnJourney,
  completeTrip,
  getDashboardSummary,
  reconcileStatus,
  repairOrphanedResources,
  freeResources
} from '../controllers/tripController.js'
import { verifyToken, optionalAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

// Driver telemetry / public tracking workflow
router.get('/trip/:id', optionalAuth, getTripById)
router.post('/end-trip', optionalAuth, endTrip)

// Administrative Journey Lifecycle & Fleet Management
router.post('/start-trip', verifyToken, startTrip)
router.get('/trips/active', verifyToken, getActiveTrips)
router.post('/trips/record-destination-arrival', verifyToken, recordDestinationArrival)
router.post('/trips/start-return', verifyToken, startReturnJourney)
router.post('/trips/complete', verifyToken, completeTrip)

// Dashboard KPI and Active Trips endpoint
router.get('/dashboard-summary', verifyToken, getDashboardSummary)

// Reconciliation & Legacy compatibility
router.get('/trips/reconcile-status', verifyToken, reconcileStatus)
router.post('/trips/reconcile-repair', verifyToken, repairOrphanedResources)
router.post('/free-resources', verifyToken, freeResources)

export default router
