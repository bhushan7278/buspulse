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

async function runLifecycleTestSuite() {
  console.log('======================================================================')
  console.log('🚍 BUSPULSE COMPLETE LIFECYCLE & FLEET LOGIC VERIFICATION')
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

  const TEST_ADMIN_USER = 'test_lifecycle_admin_' + Date.now()
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

  const cleanupDriverIds = []
  const cleanupBusIds = []
  const cleanupTripIds = []

  try {
    // ===================================================================
    // SUITE 1: GLOBAL FLEET AVAILABILITY
    // ===================================================================
    console.log('\n--- SUITE 1: GLOBAL FLEET AVAILABILITY ---')

    // Create a bus with default route R1 and another bus with no routeId
    const busR1 = await Bus.create({
      number: 'BUS-FLEET-R1',
      routeId: 'R1',
      status: 'free'
    })
    cleanupBusIds.push(busR1._id)

    const busGlobal = await Bus.create({
      number: 'BUS-FLEET-GLOBAL',
      routeId: null,
      status: 'free'
    })
    cleanupBusIds.push(busGlobal._id)

    // 1. GET /buses/available returns both buses regardless of routeId
    {
      const res = await fetch(`${baseUrl}/buses/available`, { headers })
      const buses = await res.json()
      assert(res.status === 200, 'GET /buses/available returns 200')
      assert(buses.some(b => b.number === 'BUS-FLEET-R1'), 'Bus with default routeId R1 is available in global pool')
      assert(buses.some(b => b.number === 'BUS-FLEET-GLOBAL'), 'Bus with null routeId is available in global pool')
    }

    // 2. GET /buses/available/R2 also returns busR1 (not restricted to R1!)
    {
      const res = await fetch(`${baseUrl}/buses/available/R2`, { headers })
      const buses = await res.json()
      assert(buses.some(b => b.number === 'BUS-FLEET-R1'), 'Bus with default R1 is available when querying for R2 (global fleet availability)')
    }

    // ===================================================================
    // SUITE 2: GOES ON ROUTE — DISPATCH & CONCURRENCY
    // ===================================================================
    console.log('\n--- SUITE 2: GOES ON ROUTE DISPATCH & CONCURRENCY ---')

    // Create a present & free driver
    const driver1 = await Driver.create({
      name: 'Dispatch Test Driver Alpha',
      phone: '+919800000001',
      routeId: 'R2',
      status: 'free',
      attendanceStatus: 'present'
    })
    cleanupDriverIds.push(driver1._id)

    // Create an absent driver
    const absentDriver = await Driver.create({
      name: 'Absent Test Driver',
      phone: '+919800000002',
      routeId: 'R2',
      status: 'free',
      attendanceStatus: 'absent'
    })
    cleanupDriverIds.push(absentDriver._id)

    // 1. Absent driver cannot be dispatched
    {
      const res = await fetch(`${baseUrl}/start-trip`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          routeId: 'R2',
          driverId: absentDriver._id,
          busId: busR1._id
        })
      })
      assert(res.status === 400, 'Rejects dispatch for absent driver (400)')
    }

    // 2. Valid dispatch succeeds with bus from different route (busR1 dispatched on R2)
    let activeTrip1 = null
    {
      const res = await fetch(`${baseUrl}/start-trip`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          routeId: 'R2',
          driverId: driver1._id,
          busId: busR1._id // busR1 has default route R1, but dispatched on R2!
        })
      })
      const data = await res.json()
      assert(res.status === 200 || res.status === 201, 'Dispatch succeeds for present/free driver and globally available bus (200/201)')
      assert(data.tripId != null, 'Trip record created with tripId')
      assert(data.trackingUrl != null, 'Tracking URL generated for driver WhatsApp link')

      activeTrip1 = data.tripId
      cleanupTripIds.push(activeTrip1)

      const dbDriver = await Driver.findById(driver1._id)
      const dbBus = await Bus.findById(busR1._id)
      assert(dbDriver.status === 'busy', 'Driver marked busy after dispatch')
      assert(dbBus.status === 'busy', 'Bus marked busy after dispatch')
    }

    // 3. Busy driver cannot be dispatched again
    {
      const res = await fetch(`${baseUrl}/start-trip`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          routeId: 'R2',
          driverId: driver1._id,
          busId: busGlobal._id
        })
      })
      assert(res.status === 400 || res.status === 409, 'Rejects dispatch for already busy driver (400/409)')
    }

    // 4. Busy bus cannot be dispatched again
    {
      const driver2 = await Driver.create({
        name: 'Dispatch Test Driver Beta',
        phone: '+919800000003',
        routeId: 'R2',
        status: 'free',
        attendanceStatus: 'present'
      })
      cleanupDriverIds.push(driver2._id)

      const res = await fetch(`${baseUrl}/start-trip`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          routeId: 'R2',
          driverId: driver2._id,
          busId: busR1._id // busR1 is already busy on activeTrip1
        })
      })
      assert(res.status === 400 || res.status === 409, 'Rejects dispatch for already busy bus (400/409)')
    }

    // 5. Concurrency Race Condition Test: Two simultaneous requests claiming the same bus
    {
      const driverA = await Driver.create({
        name: 'Race Driver A',
        phone: '+919800000004',
        routeId: 'R1',
        status: 'free',
        attendanceStatus: 'present'
      })
      cleanupDriverIds.push(driverA._id)

      const driverB = await Driver.create({
        name: 'Race Driver B',
        phone: '+919800000005',
        routeId: 'R1',
        status: 'free',
        attendanceStatus: 'present'
      })
      cleanupDriverIds.push(driverB._id)

      // Both try to claim busGlobal at the exact same instant
      const [resA, resB] = await Promise.all([
        fetch(`${baseUrl}/start-trip`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ routeId: 'R1', driverId: driverA._id, busId: busGlobal._id })
        }),
        fetch(`${baseUrl}/start-trip`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ routeId: 'R1', driverId: driverB._id, busId: busGlobal._id })
        })
      ])

      const statusA = resA.status
      const statusB = resB.status

      const isSuccessA = statusA === 200 || statusA === 201
      const isSuccessB = statusB === 200 || statusB === 201

      const oneSucceeded = (isSuccessA && !isSuccessB) || (isSuccessB && !isSuccessA)
      assert(oneSucceeded, 'Concurrent race condition: exactly one dispatch succeeded, the other was rejected')

      const dataA = isSuccessA ? await resA.json() : null
      const dataB = isSuccessB ? await resB.json() : null
      const winningTripId = dataA?.tripId || dataB?.tripId
      if (winningTripId) cleanupTripIds.push(winningTripId)

      // Check that the losing driver was NOT left in a busy state (no orphaned busy status!)
      const losingDriverId = isSuccessA ? driverB._id : driverA._id
      const losingDriverDb = await Driver.findById(losingDriverId)
      assert(losingDriverDb.status === 'free', 'Losing driver rollback succeeded: driver remained free')
    }

    // ===================================================================
    // SUITE 3: COMPLETION OF TRIP — AUTHORITATIVE SINGLE-ACTION
    // ===================================================================
    console.log('\n--- SUITE 3: COMPLETION OF TRIP WORKFLOW ---')

    // 1. GET /trips/active returns active trips with driver and bus populated
    {
      const res = await fetch(`${baseUrl}/trips/active`, { headers })
      const activeTrips = await res.json()
      assert(res.status === 200, 'GET /trips/active returns 200')
      assert(Array.isArray(activeTrips), 'Returns array of active trips')

      const target = activeTrips.find(t => t._id === activeTrip1)
      assert(target != null, 'Active trip appears in GET /trips/active')
      assert(target.driver && target.driver.name === 'Dispatch Test Driver Alpha', 'Driver is correctly populated on active trip')
      assert(target.bus && target.bus.number === 'BUS-FLEET-R1', 'Bus is correctly populated on active trip')
      assert(target.dataIntegrityWarning == null, 'Healthy trip has no data integrity warning')
    }

    // 2. Complete Trip using single action: POST /trips/complete with { tripId }
    {
      const res = await fetch(`${baseUrl}/trips/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tripId: activeTrip1 })
      })
      const data = await res.json()
      assert(res.status === 200, 'POST /trips/complete succeeds (200)')
      assert(data.trip && data.trip.status === 'completed', 'Trip status updated to completed')
      assert(data.trip.endTime != null, 'Trip endTime recorded')

      // Verify associated driver and bus are atomically freed
      const dbDriver = await Driver.findById(driver1._id)
      const dbBus = await Bus.findById(busR1._id)
      assert(dbDriver.status === 'free', 'Associated driver atomically marked free')
      assert(dbDriver.attendanceStatus === 'present', 'Driver attendanceStatus preserved as present (not checked out!)')
      assert(dbBus.status === 'free', 'Associated bus atomically marked free')
    }

    // 3. Completed trip disappears from GET /trips/active immediately
    {
      const res = await fetch(`${baseUrl}/trips/active`, { headers })
      const activeTrips = await res.json()
      assert(!activeTrips.some(t => t._id === activeTrip1), 'Completed trip is no longer returned in GET /trips/active')
    }

    // 4. Completed trip remains in MongoDB history
    {
      const historicalTrip = await Trip.findById(activeTrip1)
      assert(historicalTrip != null, 'Completed trip is preserved in MongoDB history (never deleted)')
      assert(historicalTrip.status === 'completed', 'Historical trip status is completed')
    }

    // 5. Repeated completion request is rejected safely (cannot affect newer trips!)
    {
      const res = await fetch(`${baseUrl}/trips/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tripId: activeTrip1 })
      })
      assert(res.status === 400, 'Repeated completion of already completed trip returns 400')
    }

    // ===================================================================
    // SUITE 4: CHECK OUT WORKFLOW & ACTIVE TRIP RESTRICTION
    // ===================================================================
    console.log('\n--- SUITE 4: CHECK OUT WORKFLOW & TRIP RESTRICTIONS ---')

    // Create a driver, mark present, assign to trip
    const checkoutDriver = await Driver.create({
      name: 'Checkout Guard Driver',
      phone: '+919800000006',
      routeId: 'R1',
      status: 'free',
      attendanceStatus: 'present'
    })
    cleanupDriverIds.push(checkoutDriver._id)

    const checkoutBus = await Bus.create({
      number: 'BUS-CHECKOUT-TEST',
      routeId: 'R1',
      status: 'free'
    })
    cleanupBusIds.push(checkoutBus._id)

    // Dispatch the driver
    const dispatchRes = await fetch(`${baseUrl}/start-trip`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ routeId: 'R1', driverId: checkoutDriver._id, busId: checkoutBus._id })
    })
    const dispatchData = await dispatchRes.json()
    const tripToGuard = dispatchData.tripId
    cleanupTripIds.push(tripToGuard)

    // 1. Attempt to check out driver while on active trip -> MUST BE REJECTED
    {
      const res = await fetch(`${baseUrl}/check-out`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ driverId: checkoutDriver._id })
      })
      const data = await res.json()
      assert(res.status === 400, 'Rejects checkout for driver assigned to an active trip (400)')
      assert(data.message.includes('active trip'), 'Error explains active trip must be completed first')
    }

    // 2. Now complete the trip
    {
      const completeRes = await fetch(`${baseUrl}/trips/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tripId: tripToGuard })
      })
      assert(completeRes.status === 200, 'Trip completed successfully')
    }

    // 3. Now that driver is free, checkout succeeds
    {
      const res = await fetch(`${baseUrl}/check-out`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ driverId: checkoutDriver._id })
      })
      const data = await res.json()
      assert(res.status === 200, 'Checkout succeeds for free present driver (200)')

      const updated = await Driver.findById(checkoutDriver._id)
      assert(updated.attendanceStatus === 'absent', 'Driver attendanceStatus updated to absent')
      assert(updated.status === 'free', 'Driver status remains free')

      // Verify checkout does NOT affect bus
      const busDb = await Bus.findById(checkoutBus._id)
      assert(busDb.status === 'free', 'Bus remains free and globally available after driver checkout')
    }

    // ===================================================================
    // SUITE 5: RECONCILIATION HEALTH CHECK & REPAIR
    // ===================================================================
    console.log('\n--- SUITE 5: RECONCILIATION HEALTH CHECK & REPAIR ---')

    // Create an orphaned busy driver (marked busy with no active trip)
    const orphanDriver = await Driver.create({
      name: 'Orphaned Busy Driver',
      phone: '+919800000007',
      routeId: 'R1',
      status: 'busy',
      attendanceStatus: 'present'
    })
    cleanupDriverIds.push(orphanDriver._id)

    // 1. Reconciliation status check detects the orphan
    {
      const res = await fetch(`${baseUrl}/trips/reconcile-status`, { headers })
      const data = await res.json()
      assert(res.status === 200, 'GET /trips/reconcile-status returns 200')
      assert(data.orphanedBusyDrivers.some(d => d.id === orphanDriver._id.toString()), 'Accurately detects orphaned busy driver')
    }

    // 2. Reconciliation repair fixes the orphaned status safely
    {
      const res = await fetch(`${baseUrl}/trips/reconcile-repair`, {
        method: 'POST',
        headers
      })
      const data = await res.json()
      assert(res.status === 200, 'POST /trips/reconcile-repair returns 200')
      assert(data.freedDriversCount >= 1, 'Freed at least 1 orphaned driver')

      const repaired = await Driver.findById(orphanDriver._id)
      assert(repaired.status === 'free', 'Orphaned driver status safely reconciled to free')
    }

  } catch (err) {
    console.error('Fatal error during test suite:', err)
    testsFailed++
  } finally {
    console.log('\n🧹 Cleaning up test artifacts...')
    await Driver.deleteMany({ _id: { $in: cleanupDriverIds } })
    await Bus.deleteMany({ _id: { $in: cleanupBusIds } })
    await Trip.deleteMany({ _id: { $in: cleanupTripIds } })
    await Location.deleteMany({ tripId: { $in: cleanupTripIds } })
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

runLifecycleTestSuite()
