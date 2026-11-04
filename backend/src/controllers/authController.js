import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import Admin from '../models/Admin.js'
import OtpChallenge from '../models/OtpChallenge.js'
import { sendRegistrationOtpEmail } from '../utils/emailService.js'

/**
 * Returns the configured Managing Director approval email address
 */
const getMdApprovalEmail = () => {
  return (process.env.ADMIN_APPROVAL_EMAIL || 'bhushankamble9401@gmail.com').trim().toLowerCase()
}

/**
 * Utility to partially mask an email address for safe display
 */
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return 'configured email'
  const [local, domain] = email.split('@')
  if (local.length <= 3) return `${local[0]}***@${domain}`
  return `${local.slice(0, 3)}***${local.slice(-1)}@${domain}`
}

/**
 * Request OTP for Admin Registration
 * Mandatory Rule: The approval OTP is sent EXCLUSIVELY to the Managing Director email (ADMIN_APPROVAL_EMAIL).
 * The applicant's personal email is stored for contact details only and never receives the OTP.
 */
export const requestRegistrationOtp = async (req, res) => {
  try {
    const { username, msrtcId, email, password, confirmPassword } = req.body

    // 1. Validation of required fields
    if (!username || !msrtcId || !email || !password || !confirmPassword) {
      return res.status(400).json({
        message: 'Username, MSRTC ID, Email, Password, and Confirm Password are all required.'
      })
    }

    const trimmedUsername = username.trim().toLowerCase()
    const trimmedMsrtcId = msrtcId.trim().toUpperCase()
    const trimmedEmail = email.trim().toLowerCase()

    // 2. Email format validation (applicant personal contact email)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        message: 'Please provide a valid personal contact email address.'
      })
    }

    // 3. Format and length policy
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      return res.status(400).json({
        message: 'Username must be between 3 and 30 characters long.'
      })
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      return res.status(400).json({
        message: 'Username may only contain letters, numbers, and underscores.'
      })
    }

    if (trimmedMsrtcId.length < 3 || trimmedMsrtcId.length > 30) {
      return res.status(400).json({
        message: 'MSRTC ID must be between 3 and 30 characters long.'
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long.'
      })
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: 'Passwords do not match.'
      })
    }

    // 4. Check for duplicate username, MSRTC ID, or email in Admin collection
    const existingUser = await Admin.findOne({ username: trimmedUsername })
    if (existingUser) {
      return res.status(409).json({
        message: `Username '${trimmedUsername}' is already taken.`
      })
    }

    const existingMsrtc = await Admin.findOne({ msrtcId: trimmedMsrtcId })
    if (existingMsrtc) {
      return res.status(409).json({
        message: `MSRTC ID '${trimmedMsrtcId}' is already registered.`
      })
    }

    const existingEmail = await Admin.findOne({ email: trimmedEmail })
    if (existingEmail) {
      return res.status(409).json({
        message: `Email '${trimmedEmail}' is already registered.`
      })
    }

    // 5. Check resend cooldown (60 seconds)
    const existingChallenge = await OtpChallenge.findOne({
      $or: [{ username: trimmedUsername }, { msrtcId: trimmedMsrtcId }, { email: trimmedEmail }]
    })

    if (existingChallenge && existingChallenge.lastSentAt) {
      const elapsedMs = Date.now() - new Date(existingChallenge.lastSentAt).getTime()
      if (elapsedMs < 60000) {
        const remainingSeconds = Math.ceil((60000 - elapsedMs) / 1000)
        return res.status(429).json({
          message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
          cooldownSeconds: remainingSeconds
        })
      }
    }

    // 6. Generate cryptographically secure 6-digit OTP and hashes
    const rawOtp = crypto.randomInt(100000, 1000000).toString()
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex')
    const passwordHash = await bcrypt.hash(password, 10)

    // 7. Designated MD Approval Recipient: strictly enforced by backend environment
    const mdApprovalEmail = getMdApprovalEmail()

    // 8. Send OTP EXCLUSIVELY to the Managing Director email address
    const emailResult = await sendRegistrationOtpEmail({
      to: mdApprovalEmail,
      otp: rawOtp,
      username: trimmedUsername,
      msrtcId: trimmedMsrtcId,
      applicantEmail: trimmedEmail,
      expiryMinutes: 5
    })

    if (!emailResult.success) {
      return res.status(500).json({
        message: emailResult.error || 'Failed to dispatch approval email to Managing Director.'
      })
    }

    // 9. Persist challenge with 5-minute expiry only after email successfully dispatched
    await OtpChallenge.findOneAndUpdate(
      { username: trimmedUsername, msrtcId: trimmedMsrtcId },
      {
        email: trimmedEmail,
        passwordHash,
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        attempts: 0,
        lastSentAt: new Date()
      },
      { upsert: true, new: true }
    )

    return res.status(200).json({
      success: true,
      message: 'An administrator registration approval OTP has been sent to the designated MD email address. Registration requires MD authorization.',
      targetEmail: maskEmail(mdApprovalEmail),
      applicantEmail: trimmedEmail,
      cooldownSeconds: 60
    })
  } catch (error) {
    console.error('Registration OTP request error:', error)
    return res.status(500).json({
      message: 'Internal server error while processing registration request.'
    })
  }
}

/**
 * Verify OTP and Create Admin Account
 * Verification enforces that the single-use OTP sent to the MD email is correctly entered.
 */
export const verifyRegistrationOtp = async (req, res) => {
  try {
    const { username, msrtcId, otp } = req.body

    if (!username || !msrtcId || !otp) {
      return res.status(400).json({
        message: 'Username, MSRTC ID, and 6-digit OTP are required.'
      })
    }

    const trimmedUsername = username.trim().toLowerCase()
    const trimmedMsrtcId = msrtcId.trim().toUpperCase()
    const trimmedOtp = otp.toString().trim()

    // 1. Find pending challenge for this account
    const challenge = await OtpChallenge.findOne({
      username: trimmedUsername,
      msrtcId: trimmedMsrtcId
    })

    if (!challenge) {
      return res.status(400).json({
        message: 'No pending registration request found for this account. Please request a new OTP.'
      })
    }

    // 2. Check expiration (5 minutes validity)
    if (new Date() > new Date(challenge.expiresAt)) {
      await OtpChallenge.deleteOne({ _id: challenge._id })
      return res.status(400).json({
        message: 'The verification code has expired. Please request a new OTP.'
      })
    }

    // 3. Check attempt limit (max 5)
    if (challenge.attempts >= 5) {
      await OtpChallenge.deleteOne({ _id: challenge._id })
      return res.status(400).json({
        message: 'Maximum verification attempts exceeded. Please request a new OTP.'
      })
    }

    // 4. Verify OTP hash
    const submittedHash = crypto.createHash('sha256').update(trimmedOtp).digest('hex')
    if (submittedHash !== challenge.otpHash) {
      challenge.attempts += 1
      await challenge.save()
      const remaining = 5 - challenge.attempts
      return res.status(400).json({
        message: `Invalid verification code. ${remaining} attempt(s) remaining.`
      })
    }

    // 5. Final duplicate check before creation (concurrency safety)
    const duplicate = await Admin.findOne({
      $or: [
        { username: trimmedUsername },
        { msrtcId: trimmedMsrtcId },
        { email: challenge.email }
      ]
    })

    if (duplicate) {
      await OtpChallenge.deleteOne({ _id: challenge._id })
      return res.status(409).json({
        message: 'An administrator with this Username, MSRTC ID, or Email has already been registered.'
      })
    }

    // 6. Create Admin account securely in MongoDB
    const createdAdmin = await Admin.create({
      username: challenge.username,
      msrtcId: challenge.msrtcId,
      email: challenge.email,
      password: challenge.passwordHash,
      role: 'admin'
    })

    // 7. Invalidate and remove challenge to prevent OTP replay
    await OtpChallenge.deleteOne({ _id: challenge._id })

    return res.status(201).json({
      success: true,
      message: 'Admin account created successfully! You may now log in with your credentials.',
      admin: {
        id: createdAdmin._id,
        username: createdAdmin.username,
        msrtcId: createdAdmin.msrtcId,
        email: createdAdmin.email,
        role: createdAdmin.role
      }
    })
  } catch (error) {
    console.error('OTP verification error:', error)
    return res.status(500).json({
      message: 'Internal server error while verifying registration.'
    })
  }
}

/**
 * Admin Login
 */
export const login = async (req, res) => {
  try {
    const { username, msrtcId, password } = req.body

    // 1. Validation of inputs
    if (!username || !msrtcId || !password) {
      return res.status(400).json({
        message: 'Username, MSRTC ID, and Password are all required.'
      })
    }

    const trimmedUsername = username.trim().toLowerCase()
    const trimmedMsrtcId = msrtcId.trim().toUpperCase()

    // 2. Find admin account matching BOTH username and msrtcId
    const admin = await Admin.findOne({
      username: trimmedUsername,
      msrtcId: trimmedMsrtcId
    })

    if (!admin) {
      return res.status(401).json({
        message: 'Invalid credentials. The specified Username, MSRTC ID, or Password is incorrect.'
      })
    }

    // 3. Verify password hash
    const isPasswordMatch = await bcrypt.compare(password, admin.password)
    if (!isPasswordMatch) {
      return res.status(401).json({
        message: 'Invalid credentials. The specified Username, MSRTC ID, or Password is incorrect.'
      })
    }

    // 4. Verify JWT secret is configured
    const secret = process.env.JWT_SECRET
    if (!secret) {
      console.error('JWT_SECRET is missing from environment.')
      return res.status(500).json({
        message: 'Internal configuration error: JWT_SECRET is not configured.'
      })
    }

    // 5. Sign JWT token
    const token = jwt.sign(
      {
        id: admin._id,
        username: admin.username,
        msrtcId: admin.msrtcId,
        email: admin.email,
        role: admin.role
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    )

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        msrtcId: admin.msrtcId,
        email: admin.email,
        role: admin.role
      }
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return res.status(500).json({
      message: 'Internal server error during authentication.'
    })
  }
}

/**
 * Get current authenticated admin profile
 */
export const getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select('-password').lean()
    if (!admin) {
      return res.status(404).json({ message: 'Administrator account not found.' })
    }
    return res.status(200).json({
      success: true,
      admin
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return res.status(500).json({ message: 'Error retrieving administrator profile.' })
  }
}

/**
 * Logout admin (stateless client session clearing)
 */
export const logout = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  })
}

/**
 * Public registration policy status check
 * Supports multiple administrators under mandatory Managing Director approval.
 */
export const getRegistrationStatus = async (req, res) => {
  try {
    const totalAdminCount = await Admin.countDocuments()
    const mdApprovalEmail = getMdApprovalEmail()

    return res.status(200).json({
      registrationOpen: true,
      isBootstrap: totalAdminCount === 0,
      adminCount: totalAdminCount,
      targetEmail: maskEmail(mdApprovalEmail),
      message: 'Administrator registration requires Managing Director approval OTP verification.'
    })
  } catch (error) {
    console.error('Registration status check error:', error)
    return res.status(500).json({ message: 'Error checking registration status.' })
  }
}
