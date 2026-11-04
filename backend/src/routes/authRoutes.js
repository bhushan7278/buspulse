import express from 'express'
import {
  requestRegistrationOtp,
  verifyRegistrationOtp,
  login,
  getMe,
  logout,
  getRegistrationStatus
} from '../controllers/authController.js'
import { verifyToken, optionalAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

// Admin registration routes
router.get('/auth/admin/status', getRegistrationStatus)
router.post('/auth/admin/register/request-otp', optionalAuth, requestRegistrationOtp)
router.post('/auth/admin/register/verify-otp', verifyRegistrationOtp)

// Admin login & session routes
router.post('/auth/admin/login', login)
router.get('/auth/admin/me', verifyToken, getMe)
router.post('/auth/admin/logout', logout)

export default router
