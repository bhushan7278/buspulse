import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// Models
import Admin from '../src/models/Admin.js'
import OtpChallenge from '../src/models/OtpChallenge.js'
import Driver from '../src/models/Driver.js'
import Bus from '../src/models/Bus.js'
import Trip from '../src/models/Trip.js'
import Location from '../src/models/Location.js'
import Attendance from '../src/models/Attendance.js'

// Routes
import authRoutes from '../src/routes/authRoutes.js'
import driverRoutes from '../src/routes/driverRoutes.js'
import busRoutes from '../src/routes/busRoutes.js'
import tripRoutes from '../src/routes/tripRoutes.js'
import locationRoutes from '../src/routes/locationRoutes.js'
import extraBusRoutes from '../src/routes/extraBusRoutes.js'
import routeRoutes from '../src/routes/routeRoutes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })

// Create Express app
const app = express()
app.use(cors())
app.use(express.json())

app.use('/', authRoutes)
app.use('/', driverRoutes)
app.use('/', busRoutes)
app.use('/', tripRoutes)
app.use('/', locationRoutes)
app.use('/', extraBusRoutes)
app.use('/', routeRoutes)

async function runTestSuite() {
  console.log('====================================================')
  console.log('🚀 BUSPULSE AUTHENTICATION & REGRESSION TEST SUITE')
  console.log('====================================================')

  await mongoose.connect(process.env.MONGO_URI)
  console.log('✅ Connected to MongoDB')

  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`
  console.log(`📡 Ephemeral Test Server listening on ${baseUrl}`)

  let testsPassed = 0
  let testsFailed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`)
      testsPassed++
    } else {
      console.error(`  ❌ FAIL: ${message}`)
      testsFailed++
    }
  }

  const TEST_USER_1 = 'test_admin_alpha'
  const TEST_MSRTC_1 = 'MSRTC-TEST-001'
  const TEST_PASS_1 = 'SecurePass@123'

  const TEST_USER_2 = 'test_admin_beta'
  const TEST_MSRTC_2 = 'MSRTC-TEST-002'
  const TEST_PASS_2 = 'AnotherPass@456'

  try {
    // Clean up test data if present
    await Admin.deleteMany({ username: { $in: [TEST_USER_1, TEST_USER_2] } })
    await OtpChallenge.deleteMany({ username: { $in: [TEST_USER_1, TEST_USER_2] } })

    console.log('\n--- SUITE 1: REGISTRATION INPUT VALIDATION ---')

    // 1. Missing fields
    {
      const res = await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: '', msrtcId: '', password: '', confirmPassword: '' })
      })
      const data = await res.json()
      assert(res.status === 400, 'Rejects registration request with empty fields (400)')
    }

    // 2. Password mismatch
    {
      const res = await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_USER_1,
          msrtcId: TEST_MSRTC_1,
          password: TEST_PASS_1,
          confirmPassword: 'WrongPassword'
        })
      })
      const data = await res.json()
      assert(res.status === 400 && data.message.includes('do not match'), 'Rejects mismatched passwords (400)')
    }

    // 3. Weak password (< 6 chars)
    {
      const res = await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_USER_1,
          msrtcId: TEST_MSRTC_1,
          password: '123',
          confirmPassword: '123'
        })
      })
      assert(res.status === 400, 'Rejects passwords under 6 characters (400)')
    }

    console.log('\n--- SUITE 2: EMAIL OTP DISPATCH & CONFIGURATION HANDLING ---')
    // 4. Test OTP dispatch behavior with current SMTP configuration
    {
      const res = await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_USER_1,
          msrtcId: TEST_MSRTC_1,
          password: TEST_PASS_1,
          confirmPassword: TEST_PASS_1
        })
      })
      const data = await res.json()

      if (process.env.SMTP_PASS === 'YOUR_GMAIL_APP_PASSWORD' || !process.env.SMTP_PASS) {
        // SMTP is unconfigured (safe expected behavior)
        assert(
          res.status === 500 && (data.message.includes('SMTP') || data.message.includes('credentials')),
          'Fails gracefully and honestly when SMTP credentials are not configured (does not fake success)'
        )
      } else {
        // Real SMTP is configured
        assert(res.status === 200 && data.success === true, 'Successfully sends OTP via real SMTP')
      }
    }

    console.log('\n--- SUITE 3: OTP VERIFICATION, ATTEMPTS, EXPIRY & CREATION ---')
    // Simulate setting up an OTP challenge directly in database to test verification logic thoroughly
    const rawOtp = '654321'
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex')
    const passwordHash = await bcrypt.hash(TEST_PASS_1, 10)

    await OtpChallenge.create({
      username: TEST_USER_1,
      msrtcId: TEST_MSRTC_1,
      passwordHash,
      otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
      attempts: 0,
      lastSentAt: new Date()
    })

    // 5. Reject wrong OTP
    {
      const res = await fetch(`${baseUrl}/auth/admin/register/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_USER_1,
          msrtcId: TEST_MSRTC_1,
          otp: '000000'
        })
      })
      const data = await res.json()
      assert(res.status === 400 && data.message.includes('Invalid verification code'), 'Rejects wrong OTP (400)')

      const challenge = await OtpChallenge.findOne({ username: TEST_USER_1 })
      assert(challenge && challenge.attempts === 1, 'Increments failed attempt counter on wrong OTP')
    }

    // 6. Max attempts exceeded invalidates challenge
    {
      await OtpChallenge.updateOne({ username: TEST_USER_1 }, { $set: { attempts: 5 } })
      const res = await fetch(`${baseUrl}/auth/admin/register/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_USER_1,
          msrtcId: TEST_MSRTC_1,
          otp: rawOtp
        })
      })
      assert(res.status === 400, 'Rejects verification when max attempts exceeded (400)')
      const challenge = await OtpChallenge.findOne({ username: TEST_USER_1 })
      assert(!challenge, 'Deletes challenge after exceeding max attempts')
    }

    // 7. Expired OTP is rejected
    {
      await OtpChallenge.create({
        username: TEST_USER_1,
        msrtcId: TEST_MSRTC_1,
        passwordHash,
        otpHash,
        expiresAt: new Date(Date.now() - 1000), // expired 1s ago
        attempts: 0,
        lastSentAt: new Date()
      })
      const res = await fetch(`${baseUrl}/auth/admin/register/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_USER_1,
          msrtcId: TEST_MSRTC_1,
          otp: rawOtp
        })
      })
      assert(res.status === 400, 'Rejects expired OTP (400)')
      await OtpChallenge.deleteMany({ username: TEST_USER_1 })
    }

    // 8. Valid OTP creates account with bcrypt hash
    {
      await OtpChallenge.create({
        username: TEST_USER_1,
        msrtcId: TEST_MSRTC_1,
        passwordHash,
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        attempts: 0,
        lastSentAt: new Date()
      })

      const res = await fetch(`${baseUrl}/auth/admin/register/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_USER_1,
          msrtcId: TEST_MSRTC_1,
          otp: rawOtp
        })
      })
      const data = await res.json()
      assert(res.status === 201 && data.success === true, 'Successfully verifies OTP and creates Admin account (201)')

      const createdAdmin = await Admin.findOne({ username: TEST_USER_1 })
      assert(createdAdmin !== null, 'Admin document exists in MongoDB')
      assert(createdAdmin.password.startsWith('$2'), 'Password stored as bcrypt hash, never plain text')
      assert(createdAdmin.msrtcId === TEST_MSRTC_1, 'MSRTC ID matches exactly')
      assert(createdAdmin.role === 'admin', 'Admin role assigned correctly')

      const challengePost = await OtpChallenge.findOne({ username: TEST_USER_1 })
      assert(challengePost === null, 'OTP challenge consumed and deleted to prevent replay attacks')
    }

    // 9. Replay attack rejection (reusing the same OTP)
    {
      const res = await fetch(`${baseUrl}/auth/admin/register/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_USER_1,
          msrtcId: TEST_MSRTC_1,
          otp: rawOtp
        })
      })
      assert(res.status === 400, 'Prevents OTP replay attack (challenge already consumed)')
    }

    // Create second admin account for mismatch tests
    const passHash2 = await bcrypt.hash(TEST_PASS_2, 10)
    await Admin.create({
      username: TEST_USER_2,
      msrtcId: TEST_MSRTC_2,
      password: passHash2,
      role: 'admin'
    })

    console.log('\n--- SUITE 4: DUPLICATE ADMIN REJECTION ---')
    // 10. Duplicate username rejection
    {
      const res = await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_USER_1,
          msrtcId: 'MSRTC-NEW-999',
          password: TEST_PASS_1,
          confirmPassword: TEST_PASS_1
        })
      })
      assert(res.status === 409, 'Rejects registration with duplicate username (409)')
    }

    // 11. Duplicate MSRTC ID rejection
    {
      const res = await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'brand_new_admin_unique',
          msrtcId: TEST_MSRTC_1,
          password: TEST_PASS_1,
          confirmPassword: TEST_PASS_1
        })
      })
      assert(res.status === 409, 'Rejects registration with duplicate MSRTC ID (409)')
    }

    console.log('\n--- SUITE 5: LOGIN AUTHENTICATION & CREDENTIAL VERIFICATION ---')
    // 12. Missing login fields
    {
      const res = await fetch(`${baseUrl}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: '', msrtcId: '', password: '' })
      })
      assert(res.status === 400, 'Rejects login with missing fields (400)')
    }

    // 13. Wrong password
    {
      const res = await fetch(`${baseUrl}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_USER_1,
          msrtcId: TEST_MSRTC_1,
          password: 'IncorrectPassword'
        })
      })
      assert(res.status === 401, 'Rejects incorrect password (401)')
    }

    // 14. Wrong MSRTC ID
    {
      const res = await fetch(`${baseUrl}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_USER_1,
          msrtcId: 'MSRTC-NONEXISTENT',
          password: TEST_PASS_1
        })
      })
      assert(res.status === 401, 'Rejects nonexistent MSRTC ID (401)')
    }

    // 15. Cross-account mismatch: Username from Account 1, MSRTC ID from Account 2
    {
      const res = await fetch(`${baseUrl}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_USER_1,
          msrtcId: TEST_MSRTC_2,
          password: TEST_PASS_1
        })
      })
      assert(res.status === 401, 'Rejects cross-account mismatch (username from user 1 + msrtcId from user 2) (401)')
    }

    // 16. Valid login issues valid JWT
    let adminToken = null
    {
      const res = await fetch(`${baseUrl}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_USER_1,
          msrtcId: TEST_MSRTC_1,
          password: TEST_PASS_1
        })
      })
      const data = await res.json()
      assert(res.status === 200 && data.success === true, 'Authenticates valid credentials successfully (200)')
      assert(data.token && typeof data.token === 'string', 'Returns signed JWT token')
      assert(data.admin && data.admin.username === TEST_USER_1, 'Returns authenticated admin profile')
      assert(!data.admin.password, 'Password hash is excluded from response')

      adminToken = data.token

      // Verify JWT payload
      const decoded = jwt.verify(adminToken, process.env.JWT_SECRET)
      assert(decoded.username === TEST_USER_1, 'JWT payload contains correct username')
      assert(decoded.msrtcId === TEST_MSRTC_1, 'JWT payload contains correct msrtcId')
      assert(decoded.role === 'admin', 'JWT payload contains correct admin role')
    }

    // 17. GET /auth/admin/me returns current session
    {
      const res = await fetch(`${baseUrl}/auth/admin/me`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      const data = await res.json()
      assert(res.status === 200 && data.admin.username === TEST_USER_1, 'GET /auth/admin/me returns current admin (200)')
    }

    // 18. Invalid and expired JWT rejection
    {
      const res = await fetch(`${baseUrl}/auth/admin/me`, {
        headers: { Authorization: 'Bearer invalid.bogus.token' }
      })
      assert(res.status === 401, 'Rejects invalid or forged JWT (401)')

      const expiredToken = jwt.sign(
        { id: '123', username: 'exp', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      )
      const expRes = await fetch(`${baseUrl}/auth/admin/me`, {
        headers: { Authorization: `Bearer ${expiredToken}` }
      })
      const expData = await expRes.json()
      assert(expRes.status === 401 && expData.expired === true, 'Rejects expired JWT (401)')
    }

    console.log('\n--- SUITE 6: ROUTE AUTHORIZATION CHECKS ---')
    // 19. Administrative routes reject unauthenticated access
    {
      const resDrivers = await fetch(`${baseUrl}/drivers/R1`)
      assert(resDrivers.status === 401, 'GET /drivers/:routeId rejects unauthenticated access (401)')

      const resBuses = await fetch(`${baseUrl}/buses/available/R1`)
      assert(resBuses.status === 401, 'GET /buses/available/:routeId rejects unauthenticated access (401)')

      const resAttendance = await fetch(`${baseUrl}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId: 'R1', driverId: 'dummy' })
      })
      assert(resAttendance.status === 401, 'POST /attendance rejects unauthenticated access (401)')

      const resStartTrip = await fetch(`${baseUrl}/start-trip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId: 'R1', driverId: 'dummy', busId: 'dummy' })
      })
      assert(resStartTrip.status === 401, 'POST /start-trip rejects unauthenticated access (401)')

      const resActiveLocs = await fetch(`${baseUrl}/locations/active/R1`)
      assert(resActiveLocs.status === 401, 'GET /locations/active/:routeId rejects unauthenticated access (401)')
    }

    // 20. Administrative routes succeed with valid Bearer token
    {
      const resDrivers = await fetch(`${baseUrl}/drivers/R1`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert(resDrivers.status === 200, 'GET /drivers/:routeId succeeds with valid admin token (200)')

      const resBuses = await fetch(`${baseUrl}/buses/available/R1`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert(resBuses.status === 200, 'GET /buses/available/:routeId succeeds with valid admin token (200)')
    }

    // 21. Driver tracking public access remains working as intended
    {
      const resLoc = await fetch(`${baseUrl}/get-location`)
      assert(resLoc.status === 200, 'GET /get-location remains accessible for live tracking workflow (200)')
    }

    console.log('\n--- SUITE 7: FULL REGRESSION TEST OF EXISTING APPLICATION WORKFLOWS ---')

    // Find driver and bus for R1
    const driver = await Driver.findOne({ routeId: 'R1' })
    const bus = await Bus.findOne({ routeId: 'R1' })
    assert(driver !== null && bus !== null, 'Existing Driver and Bus records found for R1')

    // Reset status to known state
    driver.status = 'free'
    driver.attendanceStatus = 'absent'
    await driver.save()

    bus.status = 'free'
    await bus.save()

    // Clean up test driver's existing attendance for today to test attendance flow
    await Attendance.deleteMany({ driverId: driver._id })

    // 22. Record Attendance
    {
      const res = await fetch(`${baseUrl}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ routeId: 'R1', driverId: driver._id })
      })
      assert(res.status === 200, 'Admin successfully marks driver present via POST /attendance')

      const updatedDriver = await Driver.findById(driver._id)
      assert(updatedDriver.attendanceStatus === 'present', 'Driver attendanceStatus updated to present in database')
    }

    // 23. Query Available Drivers & Buses
    {
      const resD = await fetch(`${baseUrl}/drivers/available/R1`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      const drivers = await resD.json()
      assert(drivers.some(d => d._id.toString() === driver._id.toString()), 'Driver appears in available pool')

      const resB = await fetch(`${baseUrl}/buses/available/R1`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      const buses = await resB.json()
      assert(buses.some(b => b._id.toString() === bus._id.toString()), 'Bus appears in available pool')
    }

    // 24. Start Trip (Goes On Route / Bus Dispatch)
    let tripId = null
    {
      const res = await fetch(`${baseUrl}/start-trip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          routeId: 'R1',
          driverId: driver._id,
          busId: bus._id
        })
      })
      const data = await res.json()
      assert(res.status === 200 && data.tripId, 'Successfully starts trip and dispatches bus')
      assert(data.trackingUrl && data.trackingUrl.includes('tripId='), 'Generates tracking URL with tripId')

      tripId = data.tripId

      const busyDriver = await Driver.findById(driver._id)
      const busyBus = await Bus.findById(bus._id)
      assert(busyDriver.status === 'busy', 'Driver marked as busy')
      assert(busyBus.status === 'busy', 'Bus marked as busy')
    }

    // 25. Public Driver Telemetry Access: GET /trip/:id
    {
      const res = await fetch(`${baseUrl}/trip/${tripId}`)
      const tripData = await res.json()
      assert(res.status === 200 && tripData._id.toString() === tripId.toString(), 'Driver telemetry portal fetches trip without admin login (200)')
      assert(tripData.status === 'active', 'Trip status is active')
    }

    // 26. Driver GPS update: POST /location/update
    {
      const res = await fetch(`${baseUrl}/location/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          latitude: 16.7050,
          longitude: 74.2400
        })
      })
      assert(res.status === 200, 'Driver phone updates live GPS coordinates via POST /location/update (200)')

      const savedLoc = await Location.findOne({ tripId }).sort({ timestamp: -1 })
      assert(savedLoc && savedLoc.latitude === 16.7050, 'Location coordinate persisted in MongoDB')
    }

    // 27. Fleet tracking map poll: GET /locations/active/:routeId
    {
      const res = await fetch(`${baseUrl}/locations/active/R1`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      const activeLocs = await res.json()
      assert(res.status === 200, 'Admin fetches active locations for route map (200)')
      assert(activeLocs.some(loc => loc.tripId.toString() === tripId.toString()), 'Active trip location visible on admin live map')
    }

    // 28. End Trip / Telemetry completion
    {
      const res = await fetch(`${baseUrl}/end-trip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId })
      })
      assert(res.status === 200, 'Trip ended successfully via POST /end-trip (200)')

      const completedTrip = await Trip.findById(tripId)
      assert(completedTrip.status === 'completed', 'Trip status updated to completed')

      const freedDriver = await Driver.findById(driver._id)
      const freedBus = await Bus.findById(bus._id)
      assert(freedDriver.status === 'free', 'Driver status returned to free')
      assert(freedBus.status === 'free', 'Bus status returned to free')
    }

    // 29. Check Out Driver
    {
      const res = await fetch(`${baseUrl}/check-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ driverId: driver._id })
      })
      assert(res.status === 200, 'Admin checks out driver via POST /check-out (200)')

      const checkedOutDriver = await Driver.findById(driver._id)
      assert(checkedOutDriver.attendanceStatus === 'absent', 'Driver attendanceStatus reset to absent')
    }

    // Clean up test data
    await Admin.deleteMany({ username: { $in: [TEST_USER_1, TEST_USER_2] } })
    await OtpChallenge.deleteMany({ username: { $in: [TEST_USER_1, TEST_USER_2] } })
    if (tripId) {
      await Location.deleteMany({ tripId })
      await Trip.deleteOne({ _id: tripId })
    }

  } catch (err) {
    console.error('Fatal test error:', err)
    testsFailed++
  } finally {
    server.close()
    await mongoose.disconnect()
  }

  console.log('\n====================================================')
  console.log(`📊 TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`)
  console.log('====================================================')

  if (testsFailed > 0) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}

runTestSuite()
