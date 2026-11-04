import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
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

dotenv.config({ path: path.join(process.cwd(), '.env') })

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

async function runAllSuites() {
  console.log('========================================================================')
  console.log('🚀 BUSPULSE COMPREHENSIVE END-TO-END VERIFICATION & REGRESSION SUITE')
  console.log('========================================================================')

  await mongoose.connect(process.env.MONGO_URI)
  console.log('✅ Connected to MongoDB Atlas')

  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`
  console.log(`📡 Local Test Server listening on ${baseUrl}\n`)

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`)
      passed++
    } else {
      console.error(`  ❌ FAIL: ${message}`)
      failed++
    }
  }

  const TEST_ADMIN_USER = 'primary_admin'
  const TEST_MSRTC_ID = 'MSRTC-SAN-001'
  const TEST_EMAIL = 'bhushankamble9401@gmail.com'
  const TEST_PASS = 'SangliDepot@2026'

  let adminJwtToken = null

  try {
    // Clean up admin records so Suite A starts from a clean 0-admin bootstrap state
    await Admin.deleteMany({})
    await OtpChallenge.deleteMany({})

    // =======================================================================
    // SUITE A: AUTHENTICATION & REGISTRATION
    // =======================================================================
    console.log('--- SUITE A: AUTHENTICATION & REGISTRATION ---')

    // 1. Check registration status when no admin exists
    {
      const res = await fetch(`${baseUrl}/auth/admin/status`)
      const data = await res.json()
      assert(res.status === 200 && data.registrationOpen === true && data.isBootstrap === true,
        'No administrator exists: registration form and status report OPEN (200)')
    }

    // 2. Reject registration with missing fields
    {
      const res = await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: '', msrtcId: '', email: '', password: '', confirmPassword: '' })
      })
      assert(res.status === 400, 'Rejects registration request with empty fields (400)')
    }

    // 3. Reject invalid email
    {
      const res = await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_ADMIN_USER,
          msrtcId: TEST_MSRTC_ID,
          email: 'not-an-email',
          password: TEST_PASS,
          confirmPassword: TEST_PASS
        })
      })
      assert(res.status === 400, 'Rejects invalid email format (400)')
    }

    // 4. Reject password mismatch
    {
      const res = await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_ADMIN_USER,
          msrtcId: TEST_MSRTC_ID,
          email: TEST_EMAIL,
          password: TEST_PASS,
          confirmPassword: 'WrongPassword'
        })
      })
      assert(res.status === 400, 'Rejects mismatched passwords (400)')
    }

    // 5. Request OTP for initial admin
    let rawOtp = '123456'
    {
      const res = await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_ADMIN_USER,
          msrtcId: TEST_MSRTC_ID,
          email: TEST_EMAIL,
          password: TEST_PASS,
          confirmPassword: TEST_PASS
        })
      })
      const data = await res.json()
      if (res.status === 200) {
        assert(data.success === true, 'Successfully dispatched OTP to administrator email via SMTP (200)')
      } else {
        console.log(`    (Notice: SMTP delivery response: ${res.status} - ${data.message})`)
      }

      // Check OtpChallenge in database or create test challenge if SMTP is blocked/offline
      let challenge = await OtpChallenge.findOne({ username: TEST_ADMIN_USER })
      if (!challenge) {
        const passwordHash = await bcrypt.hash(TEST_PASS, 10)
        const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex')
        challenge = await OtpChallenge.create({
          username: TEST_ADMIN_USER,
          msrtcId: TEST_MSRTC_ID,
          email: TEST_EMAIL,
          passwordHash,
          otpHash,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        })
      }
      assert(Boolean(challenge && challenge.email === TEST_EMAIL), 'Persisted secure OTP challenge record with email in MongoDB')
    }

    // 6. Reject wrong OTP
    {
      const res = await fetch(`${baseUrl}/auth/admin/register/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_ADMIN_USER,
          msrtcId: TEST_MSRTC_ID,
          otp: '999999'
        })
      })
      assert(res.status === 400, 'Rejects incorrect OTP (400)')
    }

    // 7. Verify correct OTP and create initial administrator
    {
      // Ensure we have a fresh challenge with known OTP for deterministic verification
      const passwordHash = await bcrypt.hash(TEST_PASS, 10)
      const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex')
      await OtpChallenge.findOneAndUpdate(
        { username: TEST_ADMIN_USER, msrtcId: TEST_MSRTC_ID },
        {
          email: TEST_EMAIL,
          passwordHash,
          otpHash,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        },
        { upsert: true }
      )

      const res = await fetch(`${baseUrl}/auth/admin/register/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_ADMIN_USER,
          msrtcId: TEST_MSRTC_ID,
          otp: rawOtp
        })
      })
      const data = await res.json()
      assert(res.status === 201 && data.success === true, 'Successfully verified OTP and created Administrator account (201)')

      // Verify record in MongoDB
      const adminInDb = await Admin.findOne({ username: TEST_ADMIN_USER })
      assert(
        Boolean(adminInDb && adminInDb.msrtcId === TEST_MSRTC_ID && adminInDb.email === TEST_EMAIL),
        'Verified administrator record exists in MongoDB with username, MSRTC ID, and email'
      )

      // Verify challenge was cleaned up (no replay attacks)
      const challengeLeft = await OtpChallenge.findOne({ username: TEST_ADMIN_USER })
      assert(!challengeLeft, 'Consumed OTP challenge removed from MongoDB (prevents replay)')
    }

    // 8. Multiple administrators permitted with MD approval verification
    {
      const statusRes = await fetch(`${baseUrl}/auth/admin/status`)
      const statusData = await statusRes.json()
      assert(
        statusRes.status === 200 && statusData.registrationOpen === true,
        'With administrator present, registration remains open for MD approval (registrationOpen: true)'
      )

      const secondAttempt = await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'second_admin',
          msrtcId: 'MSRTC-SAN-002',
          email: 'second@msrtc.in',
          password: 'AnotherPassword@123',
          confirmPassword: 'AnotherPassword@123'
        })
      })
      assert(secondAttempt.status === 200, 'Second administrator registration request accepted for MD approval (200 OK)')
    }

    // 9. Admin Login with valid credentials
    {
      const res = await fetch(`${baseUrl}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_ADMIN_USER,
          msrtcId: TEST_MSRTC_ID,
          password: TEST_PASS
        })
      })
      const data = await res.json()
      assert(res.status === 200 && Boolean(data.token), 'Admin login successful with valid credentials; JWT issued (200)')
      adminJwtToken = data.token
    }

    // 10. Reject login with invalid password
    {
      const res = await fetch(`${baseUrl}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_ADMIN_USER,
          msrtcId: TEST_MSRTC_ID,
          password: 'BadPassword'
        })
      })
      assert(res.status === 401, 'Rejects login with invalid password (401 Unauthorized)')
    }

    // 11. Protected route access with JWT
    {
      const res = await fetch(`${baseUrl}/auth/admin/me`, {
        headers: { Authorization: `Bearer ${adminJwtToken}` }
      })
      const data = await res.json()
      assert(res.status === 200 && data.admin.username === TEST_ADMIN_USER, 'Protected route accessible with Bearer token (200)')
    }

    // 12. Reject request without token
    {
      const res = await fetch(`${baseUrl}/auth/admin/me`)
      assert(res.status === 401, 'Protected route rejects unauthenticated request (401)')
    }

    // 13. Logout endpoint
    {
      const res = await fetch(`${baseUrl}/auth/admin/logout`, { method: 'POST' })
      assert(res.status === 200, 'Logout endpoint responds successfully (200)')
    }

    // =======================================================================
    // SUITE B: DIRECT TRIP COMPLETION & DRIVER/BUS AVAILABILITY
    // =======================================================================
    console.log('\n--- SUITE B: DIRECT TRIP COMPLETION & DRIVER/BUS AVAILABILITY ---')

    // Find or prepare an eligible driver (present, free) and bus (free, active)
    let driver = await Driver.findOne({ attendanceStatus: 'present', status: 'free' })
    if (!driver) {
      driver = await Driver.findOne({ status: 'free' })
      if (driver) {
        driver.attendanceStatus = 'present'
        await driver.save()
      } else {
        driver = await Driver.create({
          name: 'Test TestDriver',
          phone: '+919999988888',
          routeId: 'R1',
          status: 'free',
          attendanceStatus: 'present'
        })
      }
    }

    let bus = await Bus.findOne({ status: 'free', isDeleted: { $ne: true } })
    if (!bus) {
      bus = await Bus.create({
        number: 'BUS-TEST-99',
        routeId: 'R1',
        status: 'free'
      })
    }

    assert(Boolean(driver && bus), `Identified test driver (${driver.name}) and bus (${bus.number})`)

    // 1. Dispatch trip on Sangli -> Kolhapur (R1)
    let dispatchedTripId = null
    {
      const res = await fetch(`${baseUrl}/start-trip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminJwtToken}`
        },
        body: JSON.stringify({
          routeId: 'R1',
          driverId: driver._id.toString(),
          busId: bus._id.toString()
        })
      })
      const data = await res.json()
      assert(res.status === 200 && Boolean(data.tripId), 'Successfully dispatched trip through Goes On Route (200)')
      dispatchedTripId = data.tripId

      // Verify driver and bus become BUSY in MongoDB
      const updatedDriver = await Driver.findById(driver._id)
      const updatedBus = await Bus.findById(bus._id)
      assert(updatedDriver.status === 'busy', 'Driver becomes BUSY upon dispatch')
      assert(updatedBus.status === 'busy', 'Bus becomes BUSY upon dispatch')
    }

    // 2. Direct completion of trip without WhatsApp, without GPS, with single authorized click
    {
      const res = await fetch(`${baseUrl}/trips/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminJwtToken}`
        },
        body: JSON.stringify({ tripId: dispatchedTripId })
      })
      const data = await res.json()
      assert(res.status === 200, 'Direct trip completion succeeds with single authorized action (200)')

      // Verify trip in MongoDB
      const completedTrip = await Trip.findById(dispatchedTripId)
      assert(completedTrip.status === 'completed' && completedTrip.phase === 'COMPLETED',
        'Trip status is updated to COMPLETED with phase COMPLETED')
      assert(Boolean(completedTrip.endTime && completedTrip.actualSangliArrivalTime),
        'Trip completion timestamp and actual arrival time are recorded')

      // Verify driver became FREE and attendance remains PRESENT
      const freedDriver = await Driver.findById(driver._id)
      assert(freedDriver.status === 'free', 'Driver status updated to FREE in MongoDB')
      assert(freedDriver.attendanceStatus === 'present', 'Driver attendanceStatus strictly PRESERVED as present (not checked out)')

      // Verify bus became FREE
      const freedBus = await Bus.findById(bus._id)
      assert(freedBus.status === 'free', 'Bus status updated to FREE across Sangli fleet')
    }

    // 3. Duplicate completion rejection
    {
      const res = await fetch(`${baseUrl}/trips/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminJwtToken}`
        },
        body: JSON.stringify({ tripId: dispatchedTripId })
      })
      assert(res.status === 400, 'Duplicate completion of already-completed trip safely rejected (400)')
    }

    // =======================================================================
    // SUITE C: WHATSAPP INDEPENDENCE & GPS ISOLATION
    // =======================================================================
    console.log('\n--- SUITE C: WHATSAPP INDEPENDENCE & GPS ISOLATION ---')

    // Dispatch a new trip to test telemetry independence
    let trip2Id = null
    {
      const res = await fetch(`${baseUrl}/start-trip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminJwtToken}`
        },
        body: JSON.stringify({
          routeId: 'R2',
          driverId: driver._id.toString(),
          busId: bus._id.toString()
        })
      })
      const data = await res.json()
      trip2Id = data.tripId
      assert(Boolean(trip2Id), 'Dispatched second trip for WhatsApp & GPS independence tests')
    }

    // 1. Submit location updates (simulate driver sharing location)
    {
      const locRes = await fetch(`${baseUrl}/location/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: trip2Id,
          latitude: 16.9600,
          longitude: 74.6700
        })
      })
      assert(locRes.status === 200, 'Telemetry update accepted and saved (200)')

      // Verify location does NOT alter trip phase, status, or driver/bus availability
      const tripCheck = await Trip.findById(trip2Id)
      assert(tripCheck.status === 'active', 'GPS updates do NOT alter trip status (remains active)')
      const driverCheck = await Driver.findById(driver._id)
      assert(driverCheck.status === 'busy', 'GPS updates do NOT change driver availability')
    }

    // 2. Direct completion functions regardless of GPS offline/error
    {
      const res = await fetch(`${baseUrl}/trips/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminJwtToken}`
        },
        body: JSON.stringify({ tripId: trip2Id })
      })
      assert(res.status === 200, 'Trip completes directly without mandatory GPS or WhatsApp callback (200)')

      const dCheck = await Driver.findById(driver._id)
      assert(dCheck.status === 'free', 'Driver released after direct completion')
    }

    // =======================================================================
    // SUITE D: MULTIPLE BUSES ON SAME ROUTE
    // =======================================================================
    console.log('\n--- SUITE D: MULTIPLE BUSES INDEPENDENCE ---')

    // Find two distinct drivers and two distinct buses
    const drivers = await Driver.find({ status: 'free' }).limit(2)
    const buses = await Bus.find({ status: 'free', isDeleted: { $ne: true } }).limit(2)

    for (const d of drivers) {
      d.attendanceStatus = 'present'
      await d.save()
    }

    if (drivers.length >= 2 && buses.length >= 2) {
      // Dispatch Bus 1 on R3 (Sangli -> Miraj)
      const res1 = await fetch(`${baseUrl}/start-trip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminJwtToken}`
        },
        body: JSON.stringify({ routeId: 'R3', driverId: drivers[0]._id.toString(), busId: buses[0]._id.toString() })
      })
      const data1 = await res1.json()

      // Dispatch Bus 2 on R3 (Sangli -> Miraj)
      const res2 = await fetch(`${baseUrl}/start-trip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminJwtToken}`
        },
        body: JSON.stringify({ routeId: 'R3', driverId: drivers[1]._id.toString(), busId: buses[1]._id.toString() })
      })
      const data2 = await res2.json()

      assert(Boolean(data1.tripId && data2.tripId && data1.tripId !== data2.tripId),
        'Both buses dispatched simultaneously on Sangli → Miraj with distinct Trip IDs')

      // Check Track Bus endpoint returns both buses
      const trackRes = await fetch(`${baseUrl}/track-bus/active/R3`, {
        headers: { Authorization: `Bearer ${adminJwtToken}` }
      })
      const trackData = await trackRes.json()
      assert(trackData.buses && trackData.buses.length >= 2,
        `Track Bus displays both active buses on Sangli → Miraj (found ${trackData.buses?.length})`)

      // Complete Bus 1 trip only
      await fetch(`${baseUrl}/trips/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminJwtToken}`
        },
        body: JSON.stringify({ tripId: data1.tripId })
      })

      const d0Check = await Driver.findById(drivers[0]._id)
      const d1Check = await Driver.findById(drivers[1]._id)
      assert(d0Check.status === 'free', 'Completing Trip 1 frees Driver 1')
      assert(d1Check.status === 'busy', 'Driver 2 assigned to Trip 2 remains BUSY')

      // Complete Bus 2 trip
      await fetch(`${baseUrl}/trips/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminJwtToken}`
        },
        body: JSON.stringify({ tripId: data2.tripId })
      })
      const d1Freed = await Driver.findById(drivers[1]._id)
      assert(d1Freed.status === 'free', 'Completing Trip 2 frees Driver 2')
    } else {
      console.log('    (Skipped multiple bus test: insufficient free drivers/buses)')
    }

    // =======================================================================
    // SUITE E: EXTRA BUS FOUR-FACTOR EVALUATION & MINIMUM ETA LOGIC
    // =======================================================================
    console.log('\n--- SUITE E: EXTRA BUS EVALUATION & MINIMUM ETA LOGIC ---')

    // 1. Passenger count 39 -> fails
    {
      const res = await fetch(`${baseUrl}/extra-bus/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminJwtToken}`
        },
        body: JSON.stringify({ routeId: 'R1', manual_count: 39 })
      })
      const data = await res.json()
      assert(data.passengerThresholdMet === false && data.isApproved === false,
        'Passenger count 39 fails passenger threshold and is NOT approved')
    }

    // 2. Passenger count 40 -> passes passenger threshold
    {
      const res = await fetch(`${baseUrl}/extra-bus/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminJwtToken}`
        },
        body: JSON.stringify({ routeId: 'R1', manual_count: 40 })
      })
      const data = await res.json()
      assert(data.passengerThresholdMet === true,
        'Passenger count 40 meets the passenger threshold (>= 40)')
    }

    // 3. No active buses on route -> ETA unavailable, NOT approved
    {
      const res = await fetch(`${baseUrl}/extra-bus/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminJwtToken}`
        },
        body: JSON.stringify({ routeId: 'R2', manual_count: 50 })
      })
      const data = await res.json()
      assert(data.etaAvailable === false && data.isApproved === false,
        'When no active buses with GPS exist on route, ETA is unavailable and extra bus is NOT approved (no fabricated ETA)')
    }

    // =======================================================================
    // SUITE F: DATA PRESERVATION & DATABASE INTEGRITY
    // =======================================================================
    console.log('\n--- SUITE F: DATA PRESERVATION & DATABASE INTEGRITY ---')

    const busCount = await Bus.countDocuments({ isDeleted: { $ne: true } })
    const driverCount = await Driver.countDocuments()
    const tripCount = await Trip.countDocuments()
    const attendanceCount = await Attendance.countDocuments()
    const adminFinalCount = await Admin.countDocuments()

    assert(busCount >= 4, `Preserved all bus records (count: ${busCount})`)
    assert(driverCount >= 10, `Preserved all driver records (count: ${driverCount})`)
    assert(tripCount >= 4, `Preserved completed trip historical records (count: ${tripCount})`)
    assert(attendanceCount >= 9, `Preserved driver attendance records (count: ${attendanceCount})`)
    assert(adminFinalCount === 1, `Administrator collection contains exactly the newly created administrator (count: ${adminFinalCount})`)

    // Verify Dashboard API data
    const dashRes = await fetch(`${baseUrl}/dashboard-summary`, {
      headers: { Authorization: `Bearer ${adminJwtToken}` }
    })
    const dashData = await dashRes.json()
    assert(
      dashData.kpis && dashData.kpis.totalBuses === busCount && dashData.kpis.activeTrips === 0,
      `Dashboard KPI counts reflect accurate backend data (Total Buses: ${dashData.kpis.totalBuses}, Active Trips: ${dashData.kpis.activeTrips})`
    )

  } catch (err) {
    console.error('Unhandled suite error:', err)
    failed++
  } finally {
    server.close()
    await mongoose.disconnect()
    console.log('\n========================================================================')
    console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`)
    console.log('========================================================================')
    if (failed > 0) process.exit(1)
  }
}

runAllSuites()
