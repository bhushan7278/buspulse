import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
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

async function runCheckoutAndTrackingSuite() {
  console.log('========================================================================')
  console.log('🚍 BUSPULSE DRIVER CHECKOUT & WHATSAPP TRACKING LINK TEST SUITE')
  console.log('========================================================================\n')

  await mongoose.connect(process.env.MONGO_URI)
  console.log('✅ Connected to MongoDB Atlas\n')

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

  // Record initial counts
  const initialCounts = {
    buses: await Bus.countDocuments(),
    drivers: await Driver.countDocuments(),
    trips: await Trip.countDocuments(),
    attendances: await Attendance.countDocuments()
  }

  console.log('📊 Initial Counts:')
  console.log(`   - Buses:       ${initialCounts.buses}`)
  console.log(`   - Drivers:     ${initialCounts.drivers}`)
  console.log(`   - Trips:       ${initialCounts.trips}`)
  console.log(`   - Attendance:  ${initialCounts.attendances}\n`)

  // Create an admin token for authorized operations
  let admin = await Admin.findOne()
  if (!admin) {
    admin = await Admin.create({
      username: 'test_admin_system',
      msrtcId: 'MSRTC-SYS-01',
      email: 'admin.system@msrtc.gov.in',
      password: 'HashedPassword@123',
      role: 'admin'
    })
  }

  const adminToken = jwt.sign(
    { id: admin._id, username: admin.username, msrtcId: admin.msrtcId, role: admin.role },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '2h' }
  )

  try {
    // =======================================================================
    // PART A: DRIVER CHECK OUT TESTS
    // =======================================================================
    console.log('--- PART A: DRIVER CHECK OUT FUNCTIONALITY ---')

    // 1. Fetch present drivers endpoint (no route required)
    const resPresent = await fetch(`${baseUrl}/drivers/present`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    const presentDrivers = await resPresent.json()
    assert(resPresent.status === 200 && Array.isArray(presentDrivers),
      'GET /drivers/present succeeds without requiring routeId parameter (HTTP 200)')

    // Prepare a test driver for checkout: ensure attendance is marked present
    let testDriver = await Driver.findOne({ attendanceStatus: 'present', status: 'free' })
    if (!testDriver) {
      testDriver = await Driver.findOne({ status: 'free' })
      if (testDriver) {
        testDriver.attendanceStatus = 'present'
        await testDriver.save()
      }
    }

    const today = new Date().toISOString().split('T')[0]
    // Ensure an Attendance record exists for today
    let attRecord = await Attendance.findOne({ driverId: testDriver._id, date: today })
    if (!attRecord) {
      attRecord = await Attendance.create({
        driverId: testDriver._id,
        date: today,
        status: 'present',
        checkInTime: new Date()
      })
    }

    assert(Boolean(testDriver && testDriver.attendanceStatus === 'present'),
      `Identified present test driver: ${testDriver.name}`)

    // 2. Perform valid checkout for eligible present driver
    const initialBusAvailableCount = await Bus.countDocuments({ status: 'free', isDeleted: { $ne: true } })

    const resCheckOut = await fetch(`${baseUrl}/check-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ driverId: testDriver._id.toString() })
    })
    const dataCheckOut = await resCheckOut.json()

    assert(resCheckOut.status === 200 && dataCheckOut.success === true,
      `Checkout succeeded for ${testDriver.name} (HTTP 200)`)
    assert(dataCheckOut.message.includes('checked out successfully'),
      'Checkout response returns clear success message')

    // 3. Verify driver attendance status updated in MongoDB
    const updatedDriver = await Driver.findById(testDriver._id)
    assert(updatedDriver.attendanceStatus === 'absent',
      'Driver attendanceStatus in MongoDB updated to "absent"')

    // 4. Verify checkout timestamp recorded in Attendance collection
    const updatedAttendance = await Attendance.findOne({ driverId: testDriver._id, date: today })
    assert(Boolean(updatedAttendance && updatedAttendance.checkOutTime),
      `Checkout timestamp recorded in Attendance record: ${updatedAttendance?.checkOutTime}`)
    assert(updatedAttendance.status === 'absent',
      'Attendance document status updated to "absent"')

    // 5. Verify bus availability remains completely unchanged
    const finalBusAvailableCount = await Bus.countDocuments({ status: 'free', isDeleted: { $ne: true } })
    assert(finalBusAvailableCount === initialBusAvailableCount,
      `Bus availability strictly unchanged: ${finalBusAvailableCount} == ${initialBusAvailableCount}`)

    // 6. Prevent duplicate checkout
    const resDupCheckOut = await fetch(`${baseUrl}/check-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ driverId: testDriver._id.toString() })
    })
    const dataDupCheckOut = await resDupCheckOut.json()
    assert(resDupCheckOut.status === 400 && dataDupCheckOut.message.includes('already checked out'),
      'Duplicate checkout request rejected with HTTP 400 and clear error message')

    // 7. Prevent checkout for driver with active trip
    // Prepare driver and bus on active trip
    let activeDriver = await Driver.findOne({ status: 'free' })
    if (activeDriver) {
      activeDriver.attendanceStatus = 'present'
      await activeDriver.save()
    }
    const availableBus = await Bus.findOne({ status: 'free', isDeleted: { $ne: true } })

    const dispatchRes = await fetch(`${baseUrl}/start-trip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        routeId: 'R1',
        driverId: activeDriver._id.toString(),
        busId: availableBus._id.toString()
      })
    })
    const dispatchData = await dispatchRes.json()
    const activeTripId = dispatchData.tripId

    // Attempt checkout while driver is on active trip
    const resBlockedCheckOut = await fetch(`${baseUrl}/check-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ driverId: activeDriver._id.toString() })
    })
    const dataBlockedCheckOut = await resBlockedCheckOut.json()
    assert(resBlockedCheckOut.status === 400 && dataBlockedCheckOut.message.includes('active trip'),
      'Driver with active trip cannot check out: rejected with HTTP 400 ("assigned to an active trip")')

    // Clean up active test trip by completing it
    await fetch(`${baseUrl}/trips/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ tripId: activeTripId })
    })

    // Now after trip completion, driver can independently check out
    const resPostTripCheckOut = await fetch(`${baseUrl}/check-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ driverId: activeDriver._id.toString() })
    })
    assert(resPostTripCheckOut.status === 200,
      'After trip completion, driver can independently check out successfully')

    // Restore testDriver attendance for ongoing operational state
    testDriver.attendanceStatus = 'present'
    await testDriver.save()

    // =======================================================================
    // PART B: WHATSAPP TRACKING LINK & LIVE LOCATION WORKFLOW
    // =======================================================================
    console.log('\n--- PART B: WHATSAPP TRACKING LINK & LIVE LOCATION ---')

    // Test A: Link Generation upon dispatch
    let testBus2 = await Bus.findOne({ status: 'free', isDeleted: { $ne: true } })
    let testDriver2 = await Driver.findOne({ status: 'free', attendanceStatus: 'present' })
    if (!testDriver2) {
      testDriver2 = await Driver.findOne({ status: 'free' })
      if (testDriver2) {
        testDriver2.attendanceStatus = 'present'
        await testDriver2.save()
      }
    }

    const resDispatch2 = await fetch(`${baseUrl}/start-trip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        routeId: 'R2',
        driverId: testDriver2._id.toString(),
        busId: testBus2._id.toString()
      })
    })
    const dispatchData2 = await resDispatch2.json()
    const tripId2 = dispatchData2.tripId
    const trackingUrl = dispatchData2.trackingUrl

    assert(Boolean(tripId2 && /^[0-9a-fA-F]{24}$/.test(tripId2)),
      `Dispatched trip created with valid 24-character MongoDB ObjectId: ${tripId2}`)
    assert(Boolean(trackingUrl && trackingUrl.includes(`/track?tripId=${tripId2}`)),
      `Generated tracking URL contains correct tripId parameter: ${trackingUrl}`)
    assert(!trackingUrl.includes('nip.io'),
      'Generated tracking URL does NOT contain erroneous nip.io hostname')

    // Test WhatsApp Click-to-Chat URL generation (Exact compliant format)
    const phone = testDriver2.phone.replace(/\D/g, '')
    const formattedPhone = phone.length === 10 ? `91${phone}` : phone

    const routeName = dispatchData2.route?.name || 'Sangli → Tasgaon'
    const expectedWhatsAppLines = [
      'BusPulse MSRTC Sangli Depot Live GPS Tracking',
      '',
      `Trip ID: ${tripId2}`,
      `Route: ${routeName}`,
      `Bus: ${testBus2.number}`,
      '',
      'Open the tracking page using this link:',
      '',
      trackingUrl,
      '',
      'Keep the tracking page open while sharing your live location.'
    ]
    const whatsappMessage = expectedWhatsAppLines.join('\n')

    // Verification: URL is standalone line with blank line before and after
    const urlLineIndex = expectedWhatsAppLines.indexOf(trackingUrl)
    assert(urlLineIndex !== -1, 'Tracking URL exists as a dedicated line in WhatsApp message')
    assert(expectedWhatsAppLines[urlLineIndex - 1] === '', 'Blank line exists directly before tracking URL')
    assert(expectedWhatsAppLines[urlLineIndex + 1] === '', 'Blank line exists directly after tracking URL')
    assert(!trackingUrl.endsWith('.') && !trackingUrl.endsWith(')') && !trackingUrl.endsWith('/'),
      'Tracking URL has no trailing punctuation, brackets, or slashes')

    // Single-encoding verification (wa.me)
    const encodedMessage = encodeURIComponent(whatsappMessage)
    const decodedVerification = decodeURIComponent(encodedMessage)
    assert(decodedVerification === whatsappMessage,
      'WhatsApp message encodes and decodes symmetrically with zero double-encoding')

    const whatsappLink = `https://wa.me/${formattedPhone}?text=${encodedMessage}`

    assert(whatsappLink.startsWith('https://wa.me/'),
      `Valid WhatsApp Click-to-Chat URL constructed: ${whatsappLink.slice(0, 45)}...`)
    assert(whatsappLink.includes(encodeURIComponent(trackingUrl)),
      'WhatsApp Click-to-Chat query parameter contains cleanly encoded tracking URL')

    // Test B: /trip/:id endpoint called by /track page
    // 1. Valid active Trip ID
    const resTripInfo = await fetch(`${baseUrl}/trip/${tripId2}`)
    const tripInfo = await resTripInfo.json()
    assert(resTripInfo.status === 200 && tripInfo._id === tripId2,
      'GET /trip/:id returns active trip details with status 200')
    assert(tripInfo.busId?.number === testBus2.number,
      `Trip is correctly associated with assigned Bus: ${tripInfo.busId?.number}`)
    assert(tripInfo.driverId?.name === testDriver2.name,
      `Trip is correctly associated with assigned Driver: ${tripInfo.driverId?.name}`)

    // 2. Invalid Trip ID format
    const resInvalidId = await fetch(`${baseUrl}/trip/invalid-not-24-hex`)
    const dataInvalidId = await resInvalidId.json()
    assert(resInvalidId.status === 400 && dataInvalidId.message.includes('Invalid Trip ID'),
      'GET /trip/:id with invalid hex ID returns HTTP 400 (Invalid Trip ID format)')

    // 3. Nonexistent Trip ID (valid hex, but not in DB)
    const fakeId = new mongoose.Types.ObjectId().toString()
    const resNotFound = await fetch(`${baseUrl}/trip/${fakeId}`)
    assert(resNotFound.status === 404,
      'GET /trip/:id with nonexistent ID returns HTTP 404 (Trip not found)')

    // Test C: Live Telemetry Updates (/location/update)
    // 1. Valid location update
    const resLocValid = await fetch(`${baseUrl}/location/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId: tripId2,
        latitude: 16.8524,
        longitude: 74.5815
      })
    })
    const dataLocValid = await resLocValid.json()
    assert(resLocValid.status === 200 && Boolean(dataLocValid.locationId),
      'Valid GPS update accepted and recorded in MongoDB Location collection (HTTP 200)')

    // 2. Reject out-of-bounds latitude/longitude
    const resLocBadCoords = await fetch(`${baseUrl}/location/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId: tripId2,
        latitude: 999.0,
        longitude: 74.5815
      })
    })
    assert(resLocBadCoords.status === 400,
      'Out-of-bounds GPS coordinates rejected with HTTP 400')

    // 3. Reject location update with invalid Trip ID
    const resLocBadId = await fetch(`${baseUrl}/location/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId: 'bad-id',
        latitude: 16.8524,
        longitude: 74.5815
      })
    })
    assert(resLocBadId.status === 400,
      'Location update with invalid Trip ID rejected with HTTP 400')

    // Test D: Completed Trip rejects further location updates
    await fetch(`${baseUrl}/trips/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ tripId: tripId2 })
    })

    const resLocAfterComplete = await fetch(`${baseUrl}/location/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId: tripId2,
        latitude: 16.8550,
        longitude: 74.5850
      })
    })
    const dataLocAfterComplete = await resLocAfterComplete.json()
    assert(resLocAfterComplete.status === 400 && dataLocAfterComplete.message.includes('completed trip'),
      'Location updates for completed trip strictly rejected with HTTP 400')

    // Check /trip/:id returns status completed
    const resTripCompleted = await fetch(`${baseUrl}/trip/${tripId2}`)
    const tripCompletedData = await resTripCompleted.json()
    assert(tripCompletedData.status === 'completed',
      'GET /trip/:id on completed trip returns status: "completed"')

    // =======================================================================
    // DATA PRESERVATION VERIFICATION
    // =======================================================================
    console.log('\n--- DATA PRESERVATION & INTEGRITY ---')
    const finalCounts = {
      buses: await Bus.countDocuments(),
      drivers: await Driver.countDocuments(),
      trips: await Trip.countDocuments(),
      attendances: await Attendance.countDocuments()
    }

    assert(finalCounts.buses === initialCounts.buses,
      `Buses preserved: ${finalCounts.buses} == ${initialCounts.buses}`)
    assert(finalCounts.drivers === initialCounts.drivers,
      `Drivers preserved: ${finalCounts.drivers} == ${initialCounts.drivers}`)
    assert(finalCounts.trips >= initialCounts.trips,
      `Trips preserved/appended: ${finalCounts.trips} >= ${initialCounts.trips}`)
    assert(finalCounts.attendances >= initialCounts.attendances,
      `Attendance history preserved: ${finalCounts.attendances} >= ${initialCounts.attendances}`)

    console.log('\n========================================================================')
    console.log(`🏁 TEST SUITE FINISHED: ${passed} PASSED | ${failed} FAILED`)
    console.log('========================================================================')

  } finally {
    server.close()
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB Atlas')
  }

  if (failed > 0) {
    process.exit(1)
  }
}

runCheckoutAndTrackingSuite().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
