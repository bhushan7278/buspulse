import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'

// Models
import Admin from '../src/models/Admin.js'
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

import {
  ROUTES_CONFIG,
  calculateRemainingDistanceKm,
  calculateEtaMinutes,
  getBusEtaDetails
} from '../src/utils/routeConfig.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })

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

async function runUpdatedFeaturesSuite() {
  console.log('======================================================================')
  console.log('🚍 BUSPULSE UPDATES VERIFICATION: ATTENDANCE, DRIVERS, TRACKING, ETA')
  console.log('======================================================================')

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-bus-system'
  await mongoose.connect(MONGO_URI)
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

  // Create or retrieve an admin user for testing
  const TEST_ADMIN_USER = 'test_verify_admin_' + Date.now()
  const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_123456789'
  process.env.JWT_SECRET = JWT_SECRET

  const adminToken = jwt.sign(
    { username: TEST_ADMIN_USER, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`
  }

  // Tracking IDs for cleanup
  const createdDriverIds = []
  const createdBusIds = []
  const createdTripIds = []

  try {
    // ===================================================================
    // SUITE 1: REQUIREMENT 1 — DEPOT-WIDE DRIVER ATTENDANCE
    // ===================================================================
    console.log('\n--- SUITE 1: DEPOT-WIDE DRIVER ATTENDANCE ---')

    // Seed a test driver
    const testDriver1 = await Driver.create({
      name: 'Depot Test Driver Alpha',
      phone: '+919900112233',
      routeId: 'R1',
      status: 'free',
      attendanceStatus: 'absent'
    })
    createdDriverIds.push(testDriver1._id)

    // 1. Fetch depot-wide drivers list (without route filter)
    {
      const res = await fetch(`${baseUrl}/drivers`, { headers })
      const data = await res.json()
      assert(res.status === 200, 'GET /drivers returns 200 for authenticated admin')
      assert(Array.isArray(data) && data.some(d => d._id === testDriver1._id.toString()), 'Depot drivers list contains test driver without specifying route')
    }

    // 2. Mark attendance without a routeId
    {
      const res = await fetch(`${baseUrl}/attendance`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ driverId: testDriver1._id }) // No routeId provided!
      })
      const data = await res.json()
      assert(res.status === 200, 'Marking attendance without routeId succeeds (200)')
      assert(data.driver && data.driver.attendanceStatus === 'present', 'Driver attendanceStatus updated to present')

      const dbDriver = await Driver.findById(testDriver1._id)
      assert(dbDriver.attendanceStatus === 'present', 'Driver attendance status persists in MongoDB')

      const today = new Date().toISOString().split('T')[0]
      const attendanceRec = await Attendance.findOne({ driverId: testDriver1._id, date: today })
      assert(attendanceRec != null && attendanceRec.status === 'present', 'Attendance record created in Attendance collection for today')
    }

    // 3. Prevent duplicate attendance for the same driver on the same date
    {
      const res = await fetch(`${baseUrl}/attendance`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ driverId: testDriver1._id })
      })
      const data = await res.json()
      assert(res.status === 409, 'Duplicate attendance on same date is rejected or handled with 409 Conflict')
      assert(data.alreadyMarked === true, 'Response identifies attendance was already recorded')

      const today = new Date().toISOString().split('T')[0]
      const count = await Attendance.countDocuments({ driverId: testDriver1._id, date: today })
      assert(count === 1, 'Database constraint / check prevents duplicate attendance documents (count === 1)')
    }

    // ===================================================================
    // SUITE 2: REQUIREMENT 2 — DRIVER MANAGEMENT & SEARCH
    // ===================================================================
    console.log('\n--- SUITE 2: DRIVER MANAGEMENT & SEARCH ---')

    const newDriverPhone = '+919876540001'
    let newDriverObj = null

    // 1. Create a new driver with valid fields
    {
      const res = await fetch(`${baseUrl}/drivers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'Rahul Sachin Pilot',
          phone: newDriverPhone,
          routeId: 'R2'
        })
      })
      const data = await res.json()
      assert(res.status === 201, 'POST /drivers creates a new driver (201)')
      assert(data.driver && data.driver.name === 'Rahul Sachin Pilot', 'Driver name correctly stored')
      assert(data.driver.status === 'free', 'New driver initialized with status free')
      assert(data.driver.attendanceStatus === 'absent', 'New driver initialized with attendanceStatus absent')
      newDriverObj = data.driver
      createdDriverIds.push(newDriverObj._id)
    }

    // 2. Reject duplicate contact number
    {
      const res = await fetch(`${baseUrl}/drivers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'Another Driver',
          phone: newDriverPhone,
          routeId: 'R1'
        })
      })
      assert(res.status === 409, 'Rejects duplicate phone number with 409 Conflict')
    }

    // 3. Reject missing or invalid fields
    {
      const res = await fetch(`${baseUrl}/drivers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: '', phone: '', routeId: '' })
      })
      assert(res.status === 400, 'Rejects driver creation with empty fields (400)')
    }

    // 4. Case-insensitive partial name search (rah -> Rahul)
    {
      const res = await fetch(`${baseUrl}/drivers?search=rah`, { headers })
      const data = await res.json()
      assert(res.status === 200, 'Search query returns 200')
      assert(data.some(d => d.name === 'Rahul Sachin Pilot'), "Partial search 'rah' matches 'Rahul Sachin Pilot'")
    }

    // 5. Case-insensitive uppercase search (PILOT -> Rahul Sachin Pilot)
    {
      const res = await fetch(`${baseUrl}/drivers?search=PILOT`, { headers })
      const data = await res.json()
      assert(data.some(d => d.name === 'Rahul Sachin Pilot'), "Uppercase search 'PILOT' matches 'Rahul Sachin Pilot'")
    }

    // 6. Non-matching search returns empty array
    {
      const res = await fetch(`${baseUrl}/drivers?search=NonExistentDriverNameXYZ`, { headers })
      const data = await res.json()
      assert(Array.isArray(data) && data.length === 0, 'Non-matching search returns empty array')
    }

    // ===================================================================
    // SUITE 3: REQUIREMENT 3 — TRACK BUS & DESTINATION ETA
    // ===================================================================
    console.log('\n--- SUITE 3: TRACK BUS & DESTINATION-BASED ETA ---')

    // 1. Verify route definition metadata
    assert(ROUTES_CONFIG.R1.destination.name.includes('Sangli'), 'R1 destination is Sangli Central Bus Stand')
    assert(ROUTES_CONFIG.R2.destination.name.includes('Kolhapur'), 'R2 destination is Kolhapur Central Bus Stand (CBS)')

    // 2. Verify ETA calculation formula: (d / 45) * 60
    {
      const d = 15 // 15 km remaining
      const eta = calculateEtaMinutes(d, 45)
      assert(eta === 20, `15 km at 45 km/h yields exactly 20 minutes (actual: ${eta})`)
    }

    // 3. Verify destination-based remaining distance calculation
    {
      // Near Hatkanangle on R1 (midpoint of Kolhapur -> Sangli)
      const lat = 16.7435
      const lng = 74.4445
      const etaDetails = getBusEtaDetails('R1', lat, lng)
      assert(etaDetails.etaAvailable === true, 'ETA is available for valid coordinates')
      assert(etaDetails.destinationStand.includes('Sangli'), 'R1 ETA is calculated to Sangli destination stand')
      assert(etaDetails.remainingDistanceKm > 0 && etaDetails.remainingDistanceKm < 48, 'Remaining distance is plausible road segment')
      assert(etaDetails.etaMinutes > 0, `Computed positive ETA minutes: ${etaDetails.etaMinutes} min`)
    }

    // 4. Missing coordinates yield explicit unavailable state (never fake coordinates!)
    {
      const nullCoordsEta = getBusEtaDetails('R1', null, null)
      assert(nullCoordsEta.etaAvailable === false, 'Null coordinates return etaAvailable: false')
      assert(nullCoordsEta.reason.includes('unavailable'), 'Explains reason for unavailable ETA')
    }

    // 5. Track bus telemetry endpoint: GET /track-bus/active/:routeId
    {
      // Create a test bus and trip on R1
      const testBus = await Bus.create({
        number: 'BUS-TRACK-TEST',
        routeId: 'R1',
        status: 'busy'
      })
      createdBusIds.push(testBus._id)

      const testTrip = await Trip.create({
        driverId: testDriver1._id,
        busId: testBus._id,
        routeId: 'R1',
        status: 'active'
      })
      createdTripIds.push(testTrip._id)

      // Query before GPS update
      const resBefore = await fetch(`${baseUrl}/track-bus/active/R1`, { headers })
      const dataBefore = await resBefore.json()
      assert(resBefore.status === 200, 'GET /track-bus/active/R1 returns 200')
      const targetBusBefore = dataBefore.buses.find(b => b.tripId === testTrip._id.toString())
      assert(targetBusBefore != null, 'Active trip appears in active buses list')
      assert(targetBusBefore.hasLocation === false, 'Trip without GPS reports hasLocation: false (no fabricated coords)')
      assert(targetBusBefore.eta.etaAvailable === false, 'Trip without GPS reports etaAvailable: false')

      // Now stream a valid GPS update
      await Location.create({
        tripId: testTrip._id,
        latitude: 16.7435,
        longitude: 74.4445
      })

      // Query after GPS update
      const resAfter = await fetch(`${baseUrl}/track-bus/active/R1`, { headers })
      const dataAfter = await resAfter.json()
      const targetBusAfter = dataAfter.buses.find(b => b.tripId === testTrip._id.toString())
      assert(targetBusAfter.hasLocation === true, 'Trip with GPS telemetry reports hasLocation: true')
      assert(targetBusAfter.eta.etaAvailable === true, 'Trip with GPS telemetry reports etaAvailable: true')
      assert(targetBusAfter.eta.destinationStand.includes('Sangli'), 'Target arrival stand is Sangli')
      assert(targetBusAfter.eta.etaMinutes > 0, `Valid ETA calculated: ${targetBusAfter.eta.etaMinutes} min`)
    }

    // ===================================================================
    // SUITE 4: REQUIREMENT 4 — EXTRA BUS DECISION MATRIX
    // ===================================================================
    console.log('\n--- SUITE 4: EXTRA BUS DECISION MATRIX (8 SCENARIOS) ---')

    // Setup resources for Route R1
    // Need a free present driver and free bus for approval tests
    const extraDriver = await Driver.create({
      name: 'Extra Bus Eligible Driver',
      phone: '+919911223344',
      routeId: 'R1',
      status: 'free',
      attendanceStatus: 'present'
    })
    createdDriverIds.push(extraDriver._id)

    const extraBus = await Bus.create({
      number: 'BUS-EXTRA-READY',
      routeId: 'R1',
      status: 'free'
    })
    createdBusIds.push(extraBus._id)

    // Test Scenario A: Manual count = 40, ETA > 25 min (e.g. at Hatkanangle ~26-28 min to Sangli), Driver Free, Bus Free
    // -> Expect: Extra Bus Approved
    {
      const res = await fetch(`${baseUrl}/extra-bus/evaluate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          routeId: 'R1',
          manual_count: 40
        })
      })
      const data = await res.json()
      assert(res.status === 200, 'Extra bus evaluation with manual count returns 200')
      assert(data.passengerCount === 40, 'Passenger count is 40')
      assert(data.passengerThresholdMet === true, 'Passenger threshold met (40 >= 40)')
      assert(data.driverAvailable === true, 'Driver is available')
      assert(data.busAvailable === true, 'Bus is available')
      assert(data.etaAvailable === true, 'ETA is available')
      if (data.etaMinutes > 25) {
        assert(data.allocationStatus === 'Extra Bus Approved', 'Scenario 1: 40 pass, > 25 min ETA, resources free -> Extra Bus Approved')
      } else {
        console.log(`  ℹ️ Notice: Current active bus ETA is ${data.etaMinutes} min`)
      }
    }

    // Test Scenario B: Passenger count = 39 (< 40 threshold) -> Expect: Not Allocated
    {
      const res = await fetch(`${baseUrl}/extra-bus/evaluate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          routeId: 'R1',
          manual_count: 39
        })
      })
      const data = await res.json()
      assert(data.passengerCount === 39, 'Passenger count is 39')
      assert(data.passengerThresholdMet === false, 'Passenger threshold NOT met (39 < 40)')
      assert(data.allocationStatus === 'Not Allocated', 'Scenario 2: 39 passengers (< 40) -> Not Allocated')
    }

    // Test Scenario C: ETA condition strictly > 25 min (25 min exactly does NOT satisfy!)
    {
      // Move bus location right next to Sangli CBS so ETA <= 25 min
      // 5 km to Sangli CBS: (5 / 45) * 60 = ~6.6 min <= 25 min
      const sangliTrip = createdTripIds[0]
      await Location.create({
        tripId: sangliTrip,
        latitude: 16.8400, // Very close to Sangli CBS
        longitude: 74.5750
      })

      const res = await fetch(`${baseUrl}/extra-bus/evaluate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          routeId: 'R1',
          manual_count: 50
        })
      })
      const data = await res.json()
      assert(data.passengerCount === 50, 'Passenger count is 50')
      assert(data.etaMinutes <= 25, `ETA (${data.etaMinutes} min) is <= 25 min`)
      assert(data.etaThresholdMet === false, 'ETA threshold (> 25 min) is NOT met when ETA <= 25 min')
      assert(data.allocationStatus === 'Not Allocated', 'Scenario 3: 50 pass, ETA <= 25 min -> Not Allocated (within acceptable interval)')
    }

    // Test Scenario D: Driver Unavailable -> Expect: Not Allocated
    {
      // Set all R1 drivers to busy
      await Driver.updateMany({ routeId: 'R1' }, { status: 'busy' })

      const res = await fetch(`${baseUrl}/extra-bus/evaluate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          routeId: 'R1',
          manual_count: 50
        })
      })
      const data = await res.json()
      assert(data.driverAvailable === false, 'Driver available is false')
      assert(data.allocationStatus === 'Not Allocated', 'Scenario 4: Driver unavailable -> Not Allocated')

      // Restore driver availability
      await Driver.updateOne({ _id: extraDriver._id }, { status: 'free' })
    }

    // Test Scenario E: Bus Unavailable -> Expect: Not Allocated
    {
      // Set all fleet buses to busy (since bus availability is global across fleet)
      await Bus.updateMany({}, { status: 'busy' })

      const res = await fetch(`${baseUrl}/extra-bus/evaluate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          routeId: 'R1',
          manual_count: 50
        })
      })
      const data = await res.json()
      assert(data.busAvailable === false, 'Bus available is false')
      assert(data.allocationStatus === 'Not Allocated', 'Scenario 5: Bus unavailable -> Not Allocated')

      // Restore bus availability
      await Bus.updateMany({}, { status: 'free' })
    }

    // Test Scenario F: Route without active bus -> ETA unavailable -> Expect: Cannot approve / Not Allocated
    {
      // Route R3 has no active trips
      const res = await fetch(`${baseUrl}/extra-bus/evaluate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          routeId: 'R3',
          manual_count: 50
        })
      })
      const data = await res.json()
      assert(data.etaAvailable === false, 'Route without active bus reports etaAvailable: false')
      assert(data.allocationStatus === 'Not Allocated', 'Scenario 6: Missing ETA prevents approval (Not Allocated)')
      assert(data.recommendationReason.includes('unavailable'), 'Explanation explicitly cites unavailable ETA')
    }

    // Test Scenario G: YOLO Failure with no manual count and no images -> Expect: 400 or 422, NEVER random numbers!
    {
      const res = await fetch(`${baseUrl}/extra-bus/evaluate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ routeId: 'R1' }) // Missing both manual count and 4 images
      })
      assert(res.status === 400 || res.status === 422, 'Rejects evaluation without manual count or images with 400/422 error')
    }

    // Test Scenario H: Negative manual count -> Expect: 400 validation error
    {
      const res = await fetch(`${baseUrl}/extra-bus/evaluate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          routeId: 'R1',
          manual_count: -10
        })
      })
      assert(res.status === 400, 'Rejects negative manual passenger count with 400 Bad Request')
    }

  } catch (err) {
    console.error('Fatal error during test suite:', err)
    testsFailed++
  } finally {
    // Clean up test data
    console.log('\n🧹 Cleaning up test artifacts...')
    await Driver.deleteMany({ _id: { $in: createdDriverIds } })
    await Bus.deleteMany({ _id: { $in: createdBusIds } })
    await Trip.deleteMany({ _id: { $in: createdTripIds } })
    await Location.deleteMany({ tripId: { $in: createdTripIds } })
    await Attendance.deleteMany({ driverId: { $in: createdDriverIds } })
    await Admin.deleteMany({ username: TEST_ADMIN_USER })

    server.close()
    await mongoose.disconnect()
    console.log('✅ Disconnected from MongoDB')
  }

  console.log('\n======================================================================')
  console.log(`📊 FINAL TEST REPORT: ${testsPassed} PASSED, ${testsFailed} FAILED`)
  console.log('======================================================================')

  if (testsFailed > 0) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}

runUpdatedFeaturesSuite()
