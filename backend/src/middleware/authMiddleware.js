import jwt from 'jsonwebtoken'

/**
 * Middleware to verify JWT authentication token from Authorization header
 */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Access denied. Authentication token is missing or malformed.',
      unauthorized: true
    })
  }

  const token = authHeader.split(' ')[1]
  const secret = process.env.JWT_SECRET

  if (!secret) {
    console.error('FATAL: JWT_SECRET environment variable is not defined.')
    return res.status(500).json({
      message: 'Internal server authentication error: JWT_SECRET is not configured.'
    })
  }

  try {
    const decoded = jwt.verify(token, secret)
    req.user = decoded
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Your session has expired. Please log in again.',
        expired: true
      })
    }
    return res.status(401).json({
      message: 'Invalid or corrupted authentication token.',
      invalid: true
    })
  }
}

/**
 * Middleware to ensure authenticated user has the 'admin' role
 */
export const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Access forbidden. Administrator privileges required.'
    })
  }
  next()
}

/**
 * Optional authentication middleware for endpoints that support both authenticated and unauthenticated workflows
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next()
  }

  const token = authHeader.split(' ')[1]
  const secret = process.env.JWT_SECRET
  if (!secret) return next()

  try {
    const decoded = jwt.verify(token, secret)
    req.user = decoded
  } catch (err) {
    // ignore token errors for optional auth
  }
  next()
}
