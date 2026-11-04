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

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })

const app = express()
app.use(cors())
app.use(express.json())

app.use('/', authRoutes)
app.use('/', driverRoutes)
app.use('/', busRoutes)
app.use('/', tripRoutes)

async function runBusManagementSuite() {
  console.log('======================================================================')
  console.log('🚌 BUSPULSE TEST: DEPOT BUS MANAGEMENT SUBPAGE & API VERIFICATION')
  console.log('======================================================================')

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-bus-system'
  console.log(`Connecting to MongoDB at: ${mongoUri}`)
  await mongoose.connect(mongoUri)
  console.log('Connected to MongoDB successfully.\n')

  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://localhost:${port}`

  let testPassed = 0
  let testFailed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`)
      testPassed++
    } else {
      console.error(`  ❌ FAIL: ${message}`)
      testFailed++
    }
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_tests'
    const authToken = jwt.sign(
      { adminId: '660000000000000000000099', email: 'depotadmin@test.com' },
      jwtSecret,
      { expiresIn: '1h' }
    )
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    }

    // Clean up test buses
    await Bus.deleteMany({ number: { $in: ['TEST-B901', 'TEST-B902', 'TEST-B903', 'TEST-DUP'] } })
    await Trip.deleteMany({ busId: { $in: await Bus.find({ number: /^TEST-/ }).distinct('_id') } })

    // -------------------------------------------------------------------------
    // TEST 1: GET /buses returns structured fleet list & summary metrics
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing GET /buses List & Summary Statistics ---')
    const listRes = await fetch(`${baseUrl}/buses`, { headers })
    const listData = await listRes.json()

    assert(listRes.status === 200, 'GET /buses returns HTTP 200')
    assert(Array.isArray(listData.buses), 'Response contains buses array')
    assert(listData.summary !== undefined, 'Response contains summary object')
    assert(typeof listData.summary.total === 'number', 'Summary contains numeric total')
    assert(typeof listData.summary.available === 'number', 'Summary contains numeric available')
    assert(typeof listData.summary.busy === 'number', 'Summary contains numeric busy')
    console.log(`  ℹ️ Live summary: Total=${listData.summary.total}, Available=${listData.summary.available}, Busy=${listData.summary.busy}`)

    // -------------------------------------------------------------------------
    // TEST 2: POST /buses creates new depot bus with validation
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing POST /buses Registration & Validation ---')
    
    // Empty number
    const emptyRes = await fetch(`${baseUrl}/buses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ number: '' })
    })
    assert(emptyRes.status === 400, 'POST /buses with empty number returns 400 Bad Request')

    // Valid creation
    const createRes1 = await fetch(`${baseUrl}/buses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ number: 'test-b901', routeId: 'R1' })
    })
    const createData1 = await createRes1.json()
    assert(createRes1.status === 201, 'POST /buses registers new bus successfully (HTTP 201)')
    assert(createData1.bus.number === 'TEST-B901', 'Bus number is sanitized to uppercase TEST-B901')
    assert(createData1.bus.status === 'free', 'New bus status initialized to "free"')
    assert(createData1.bus.isActive === true, 'New bus isActive initialized to true')
    assert(createData1.bus.isDeleted === false, 'New bus isDeleted initialized to false')
    const bus1Id = createData1.bus._id

    // Duplicate creation (case-insensitive)
    const dupRes = await fetch(`${baseUrl}/buses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ number: 'TEST-B901' })
    })
    const dupData = await dupRes.json()
    assert(dupRes.status === 409, 'Duplicate bus registration rejected with HTTP 409 Conflict')
    assert(dupData.message.includes('already exists'), 'Duplicate error message informs admin')

    // Create a second test bus
    const createRes2 = await fetch(`${baseUrl}/buses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ number: 'TEST-B902', routeId: 'R2' })
    })
    const createData2 = await createRes2.json()
    const bus2Id = createData2.bus._id
    assert(createRes2.status === 201, 'Created second test bus TEST-B902')

    // -------------------------------------------------------------------------
    // TEST 3: GET /buses?search=... partial case-insensitive search
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing GET /buses?search=... Query Filtering ---')
    const searchRes = await fetch(`${baseUrl}/buses?search=b901`, { headers })
    const searchData = await searchRes.json()
    assert(searchRes.status === 200, 'Search query returns HTTP 200')
    assert(searchData.buses.some(b => b.number === 'TEST-B901'), 'Partial lowercase search "b901" matches "TEST-B901"')
    assert(!searchData.buses.some(b => b.number === 'TEST-B902'), 'Non-matching bus TEST-B902 excluded from search results')

    // -------------------------------------------------------------------------
    // TEST 4: Active Trip Correlation & Safe Deletion Prevention
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Active Trip Correlation & Safety Guard Against Deletion ---')
    
    // Create a mock active trip for TEST-B901
    const testDriver = await Driver.findOne({ isAvailable: true }) || await Driver.create({
      name: 'Test Driver For Bus Suite',
      phone: '+919999888877',
      routeId: 'R1',
      isAvailable: true
    })

    const activeTrip = await Trip.create({
      busId: bus1Id,
      driverId: testDriver._id,
      routeId: 'R1',
      status: 'active',
      startTime: new Date()
    })
    await Bus.findByIdAndUpdate(bus1Id, { status: 'busy' })

    // Check GET /buses returns activeTrip details
    const activeCheckRes = await fetch(`${baseUrl}/buses?search=B901`, { headers })
    const activeCheckData = await activeCheckRes.json()
    const activeBusItem = activeCheckData.buses.find(b => b._id === bus1Id)

    assert(activeBusItem.isOnActiveTrip === true, 'Bus on active trip has isOnActiveTrip=true')
    assert(activeBusItem.activeTrip !== null, 'Bus on active trip has activeTrip object populated')
    assert(activeBusItem.activeTrip.driverName !== undefined, 'activeTrip includes driver name')

    // Attempt to delete active bus TEST-B901
    const deleteActiveRes = await fetch(`${baseUrl}/buses/${bus1Id}`, {
      method: 'DELETE',
      headers
    })
    const deleteActiveData = await deleteActiveRes.json()
    assert(deleteActiveRes.status === 400, 'Deleting a bus on an active trip is rejected with HTTP 400')
    assert(deleteActiveData.message.includes('cannot be deleted because it is currently assigned to an active trip'), 'Rejection message clearly explains active trip conflict')

    // Clean up active trip
    await Trip.findByIdAndUpdate(activeTrip._id, { status: 'completed', endTime: new Date() })
    await Bus.findByIdAndUpdate(bus1Id, { status: 'free' })

    // -------------------------------------------------------------------------
    // TEST 5: Successful Soft-Deletion of Inactive Bus
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Soft Deletion & Trip History Preservation ---')
    
    const deleteRes = await fetch(`${baseUrl}/buses/${bus1Id}`, {
      method: 'DELETE',
      headers
    })
    const deleteData = await deleteRes.json()
    assert(deleteRes.status === 200, 'Deleting free bus returns HTTP 200')
    assert(deleteData.message.includes('removed from depot fleet'), 'Confirmation message returned')

    // Verify in database: soft deleted, not hard deleted
    const busInDb = await Bus.findById(bus1Id)
    assert(busInDb !== null, 'Bus document remains in MongoDB (soft delete)')
    assert(busInDb.isDeleted === true, 'bus.isDeleted is set to true')
    assert(busInDb.isActive === false, 'bus.isActive is set to false')

    // Verify historical trip can still populate bus
    const historicalTrip = await Trip.findById(activeTrip._id).populate('busId')
    assert(historicalTrip.busId !== null, 'Completed trip history preserves populate("busId") foreign key')
    assert(historicalTrip.busId.number === 'TEST-B901', 'Populated bus number remains accurate')

    // Verify deleted bus does not appear in GET /buses
    const listAfterDelete = await fetch(`${baseUrl}/buses?search=B901`, { headers })
    const listAfterData = await listAfterDelete.json()
    assert(!listAfterData.buses.some(b => b._id === bus1Id), 'Deleted bus is excluded from depot bus list')

    // Verify deleted bus does not appear in /buses/available
    const availRes = await fetch(`${baseUrl}/buses/available`, { headers })
    const availData = await availRes.json()
    assert(!availData.some(b => b._id === bus1Id), 'Deleted bus is excluded from /buses/available')

    // -------------------------------------------------------------------------
    // TEST 6: Dispatch Protection Against Deleted Buses
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing Trip Dispatch Rejection for Inactive/Deleted Buses ---')
    const startTripWithDeletedRes = await fetch(`${baseUrl}/start-trip`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        busId: bus1Id,
        driverId: testDriver._id.toString(),
        routeId: 'R1'
      })
    })
    assert(startTripWithDeletedRes.status === 400, 'Starting a trip with a deleted bus is rejected with HTTP 400')

    // Clean up TEST-B902 and test records
    await Bus.deleteMany({ number: { $in: ['TEST-B901', 'TEST-B902'] } })
    await Trip.deleteMany({ _id: activeTrip._id })
    await Driver.deleteOne({ _id: testDriver._id })

    console.log('\n======================================================================')
    console.log(`🏁 BUS MANAGEMENT SUITE SUMMARY: ${testPassed} PASSED, ${testFailed} FAILED`)
    console.log('======================================================================')

  } catch (err) {
    console.error('Test execution error:', err)
    testFailed++
  } finally {
    server.close()
    await mongoose.disconnect()
    if (testFailed > 0) {
      process.exit(1)
    } else {
      process.exit(0)
    }
  }
}

runBusManagementSuite()
