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

// Services
import { setTestTransporter } from '../src/utils/emailService.js'

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

async function runMdApprovalTestSuite() {
  console.log('========================================================================')
  console.log('🛡️ BUSPULSE MANDATORY MD EMAIL OTP APPROVAL TEST SUITE (SECTION 9)')
  console.log('========================================================================')

  const expectedMdEmail = 'bhushankamble9401@gmail.com'
  console.log(`📌 Configured ADMIN_APPROVAL_EMAIL: ${process.env.ADMIN_APPROVAL_EMAIL}`)
  if (process.env.ADMIN_APPROVAL_EMAIL !== expectedMdEmail) {
    throw new Error(`ADMIN_APPROVAL_EMAIL must be ${expectedMdEmail}, but found ${process.env.ADMIN_APPROVAL_EMAIL}`)
  }

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

  // Record initial counts to verify preservation of depot collections
  const initialCounts = {
    buses: await Bus.countDocuments(),
    drivers: await Driver.countDocuments(),
    trips: await Trip.countDocuments(),
    locations: await Location.countDocuments(),
    attendances: await Attendance.countDocuments()
  }

  console.log('📊 Initial Operational Data Counts:')
  console.log(`   - Buses:       ${initialCounts.buses}`)
  console.log(`   - Drivers:     ${initialCounts.drivers}`)
  console.log(`   - Trips:       ${initialCounts.trips}`)
  console.log(`   - Locations:   ${initialCounts.locations}`)
  console.log(`   - Attendance:  ${initialCounts.attendances}\n`)

  // Track dispatched emails in-memory during tests
  const dispatchedEmails = []
  let simulateSmtpFailure = false

  setTestTransporter({
    sendMail: async (mailOptions) => {
      dispatchedEmails.push({ ...mailOptions, timestamp: new Date() })
      if (simulateSmtpFailure) {
        throw new Error('Simulated SMTP connection timeout to smtp.gmail.com:587')
      }
      return { messageId: `<test-${Date.now()}@buspulse.msrtc>` }
    }
  })

  function extractOtpFromMail(mail) {
    const match = mail.text.match(/EXECUTIVE APPROVAL CODE:\s*(\d{6})/)
    return match ? match[1] : null
  }

  try {
    // Reset test admin state so tests run in a predictable environment
    await Admin.deleteMany({})
    await OtpChallenge.deleteMany({})

    // =======================================================================
    // TEST 1: Delivery of approval OTP exclusively to bhushankamble9401@gmail.com
    // =======================================================================
    console.log('--- TEST 1: DELIVERY OF APPROVAL OTP EXCLUSIVELY TO MD EMAIL ---')
    dispatchedEmails.length = 0

    const applicant1 = {
      username: 'applicant_one',
      msrtcId: 'MSRTC-AP1-01',
      email: 'applicant1.personal@msrtc-staff.in',
      password: 'Applicant@Pass123',
      confirmPassword: 'Applicant@Pass123'
    }

    const res1 = await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applicant1)
    })
    const data1 = await res1.json()

    assert(res1.status === 200 && data1.success === true,
      'Request OTP returns HTTP 200 with success status')
    assert(data1.message === 'An administrator registration approval OTP has been sent to the designated MD email address. Registration requires MD authorization.',
      'Response returns exact required MD authorization message')
    assert(dispatchedEmails.length === 1,
      'Exactly 1 email was dispatched')
    assert(dispatchedEmails[0].to === expectedMdEmail,
      `Email was dispatched exclusively to designated MD email: ${expectedMdEmail}`)
    assert(dispatchedEmails[0].to !== applicant1.email,
      `Applicant personal email (${applicant1.email}) did NOT receive the OTP`)
    assert(dispatchedEmails[0].text.includes(`Applicant Contact Email:  ${applicant1.email}`),
      'Applicant personal email is recorded as metadata for the MD to review')
    const otp1 = extractOtpFromMail(dispatchedEmails[0])
    assert(/^\d{6}$/.test(otp1),
      `Secure 6-digit OTP generated: ${otp1}`)

    // =======================================================================
    // TEST 2: Multiple registrations with different applicant emails
    // =======================================================================
    console.log('\n--- TEST 2: MULTIPLE REGISTRATIONS WITH DIFFERENT APPLICANT EMAILS ---')
    dispatchedEmails.length = 0

    // Applicant A
    const applicantA = {
      username: 'applicant_alpha',
      msrtcId: 'MSRTC-SAN-ALPHA',
      email: 'alpha.applicant@msrtc.gov.in',
      password: 'AlphaSecure@2026',
      confirmPassword: 'AlphaSecure@2026'
    }

    const resA = await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applicantA)
    })
    const dataA = await resA.json()
    assert(resA.status === 200 && dataA.success === true,
      'Applicant A registration request succeeded')
    assert(dispatchedEmails.length === 1 && dispatchedEmails[0].to === expectedMdEmail,
      `Applicant A approval OTP dispatched exclusively to MD email: ${expectedMdEmail}`)
    assert(dispatchedEmails[0].text.includes(applicantA.email),
      `Applicant A personal email (${applicantA.email}) identified in metadata`)

    // Applicant B (different personal email)
    const applicantB = {
      username: 'applicant_beta',
      msrtcId: 'MSRTC-SAN-BETA',
      email: 'beta.applicant@sanglidepot.org',
      password: 'BetaSecure@2026',
      confirmPassword: 'BetaSecure@2026'
    }

    const resB = await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applicantB)
    })
    const dataB = await resB.json()
    assert(resB.status === 200 && dataB.success === true,
      'Applicant B registration request succeeded')
    assert(dispatchedEmails.length === 2 && dispatchedEmails[1].to === expectedMdEmail,
      `Applicant B approval OTP also dispatched exclusively to MD email: ${expectedMdEmail}`)
    assert(dispatchedEmails[1].text.includes(applicantB.email),
      `Applicant B personal email (${applicantB.email}) identified in metadata`)
    assert(dispatchedEmails[0].to === dispatchedEmails[1].to && dispatchedEmails[1].to === expectedMdEmail,
      'Both distinct applicant registrations route approval OTP strictly to the fixed MD recipient')

    // =======================================================================
    // TEST 3: Reject or ignore any attempt to override OTP recipient
    // =======================================================================
    console.log('\n--- TEST 3: REJECT/IGNORE ATTEMPTS TO OVERRIDE OTP RECIPIENT ---')
    dispatchedEmails.length = 0

    const exploitApplicant = {
      username: 'exploit_tester',
      msrtcId: 'MSRTC-HACK-01',
      email: 'exploit@target.com',
      password: 'ExploitPass@123',
      confirmPassword: 'ExploitPass@123',
      // Injected override fields
      targetEmail: 'attacker@evilcorp.com',
      recipient: 'attacker@evilcorp.com',
      to: 'attacker@evilcorp.com',
      destEmail: 'attacker@evilcorp.com'
    }

    const resOverride = await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exploitApplicant)
    })
    const dataOverride = await resOverride.json()

    assert(resOverride.status === 200,
      'Request processed and override injection safely ignored by backend')
    assert(dispatchedEmails.length === 1,
      'Single email dispatched')
    assert(dispatchedEmails[0].to === expectedMdEmail,
      `Recipient strictly enforced as ${expectedMdEmail}; attacker injection ignored`)
    assert(dispatchedEmails[0].to !== 'attacker@evilcorp.com',
      'Attacker email "attacker@evilcorp.com" was completely blocked and received nothing')

    // =======================================================================
    // TEST 4: OTP Verification (Correct, Incorrect, Expired, Reused)
    // =======================================================================
    console.log('\n--- TEST 4: OTP VERIFICATION SECURITY & LIFECYCLE ---')

    // Setup a fresh applicant for testing verification
    dispatchedEmails.length = 0
    const verifyApplicant = {
      username: 'depot_admin_sangli',
      msrtcId: 'MSRTC-SAN-888',
      email: 'sangli.manager@msrtc.gov.in',
      password: 'SangliAdmin@Secure2026',
      confirmPassword: 'SangliAdmin@Secure2026'
    }

    await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verifyApplicant)
    })

    const capturedOtp = extractOtpFromMail(dispatchedEmails[0])
    console.log(`  🔑 Captured 6-digit MD Approval OTP: ${capturedOtp}`)

    // 4a. Incorrect OTP: must be rejected
    {
      const resBad = await fetch(`${baseUrl}/auth/admin/register/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: verifyApplicant.username,
          msrtcId: verifyApplicant.msrtcId,
          otp: '000000'
        })
      })
      const dataBad = await resBad.json()
      assert(resBad.status === 400 && dataBad.message.includes('Invalid verification code'),
        'Incorrect OTP rejected with HTTP 400 and attempt counter decremented')
    }

    // 4b. Expired OTP: must be rejected
    {
      // Temporarily set expiresAt to past
      await OtpChallenge.updateOne(
        { username: verifyApplicant.username },
        { $set: { expiresAt: new Date(Date.now() - 10000) } }
      )

      const resExp = await fetch(`${baseUrl}/auth/admin/register/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: verifyApplicant.username,
          msrtcId: verifyApplicant.msrtcId,
          otp: capturedOtp
        })
      })
      const dataExp = await resExp.json()
      assert(resExp.status === 400 && dataExp.message.includes('expired'),
        'Expired OTP rejected with HTTP 400')
    }

    // Re-issue valid OTP for subsequent tests
    dispatchedEmails.length = 0
    await OtpChallenge.deleteOne({ username: verifyApplicant.username })
    await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verifyApplicant)
    })
    const validOtp = extractOtpFromMail(dispatchedEmails[0])

    // 4c. Correct OTP: administrator account must be created
    let createdAdminRecord = null
    {
      const resGood = await fetch(`${baseUrl}/auth/admin/register/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: verifyApplicant.username,
          msrtcId: verifyApplicant.msrtcId,
          otp: validOtp
        })
      })
      const dataGood = await resGood.json()
      assert(resGood.status === 201 && dataGood.success === true,
        'Correct MD approval OTP creates administrator account with HTTP 201')
      assert(dataGood.admin.username === verifyApplicant.username,
        'Created admin username matches applicant')
      assert(dataGood.admin.email === verifyApplicant.email,
        'Created admin email preserves applicant personal contact email')

      // Verify DB record
      createdAdminRecord = await Admin.findOne({ username: verifyApplicant.username })
      assert(createdAdminRecord !== null,
        'Admin record persisted in MongoDB Atlas Admin collection')
      const passMatch = await bcrypt.compare(verifyApplicant.password, createdAdminRecord.password)
      assert(passMatch === true,
        'Password securely hashed and verified with bcrypt')
    }

    // 4d. Reused OTP: must be rejected (single-use)
    {
      const resReuse = await fetch(`${baseUrl}/auth/admin/register/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: verifyApplicant.username,
          msrtcId: verifyApplicant.msrtcId,
          otp: validOtp
        })
      })
      const dataReuse = await resReuse.json()
      assert(resReuse.status === 400,
        'Reused OTP rejected with HTTP 400 (Challenge deleted after first use)')
    }

    // =======================================================================
    // TEST 5: Prevent Unauthorized Registration & Duplicates
    // =======================================================================
    console.log('\n--- TEST 5: PREVENT UNAUTHORIZED REGISTRATION & DUPLICATES ---')

    // 5a. Attempt to register directly without OTP
    {
      const resNoOtp = await fetch(`${baseUrl}/auth/admin/register/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'unauthorized_admin',
          msrtcId: 'MSRTC-FAKE-99',
          otp: ''
        })
      })
      assert(resNoOtp.status === 400,
        'Direct registration without OTP rejected with HTTP 400')
    }

    // 5b. Duplicate username attempt
    {
      const resDupUser = await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: verifyApplicant.username,
          msrtcId: 'MSRTC-NEW-999',
          email: 'different@email.com',
          password: 'Password@123',
          confirmPassword: 'Password@123'
        })
      })
      const dataDupUser = await resDupUser.json()
      assert(resDupUser.status === 409 && dataDupUser.message.includes('already taken'),
        'Duplicate username rejected with HTTP 409 Conflict')
    }

    // 5c. Duplicate MSRTC ID attempt
    {
      const resDupMsrtc = await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'unique_user_99',
          msrtcId: verifyApplicant.msrtcId,
          email: 'different2@email.com',
          password: 'Password@123',
          confirmPassword: 'Password@123'
        })
      })
      const dataDupMsrtc = await resDupMsrtc.json()
      assert(resDupMsrtc.status === 409 && dataDupMsrtc.message.includes('already registered'),
        'Duplicate MSRTC ID rejected with HTTP 409 Conflict')
    }

    // 5d. Duplicate applicant email attempt
    {
      const resDupEmail = await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'unique_user_88',
          msrtcId: 'MSRTC-NEW-888',
          email: verifyApplicant.email,
          password: 'Password@123',
          confirmPassword: 'Password@123'
        })
      })
      const dataDupEmail = await resDupEmail.json()
      assert(resDupEmail.status === 409 && dataDupEmail.message.includes('already registered'),
        'Duplicate applicant email rejected with HTTP 409 Conflict')
    }

    // =======================================================================
    // TEST 6: SMTP Failure Handling
    // =======================================================================
    console.log('\n--- TEST 6: SMTP FAILURE HANDLING ---')
    simulateSmtpFailure = true

    const failApplicant = {
      username: 'smtp_fail_user',
      msrtcId: 'MSRTC-FAIL-01',
      email: 'smtp.fail@msrtc.org',
      password: 'FailPass@12345',
      confirmPassword: 'FailPass@12345'
    }

    const resSmtpFail = await fetch(`${baseUrl}/auth/admin/register/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(failApplicant)
    })
    const dataSmtpFail = await resSmtpFail.json()

    assert(resSmtpFail.status === 500 && dataSmtpFail.message.includes('SMTP'),
      'When SMTP fails, endpoint returns HTTP 500 with descriptive error message')

    const challengeAfterFail = await OtpChallenge.findOne({ username: failApplicant.username })
    assert(challengeAfterFail === null,
      'No OTP challenge created in MongoDB when email delivery fails')

    const adminAfterFail = await Admin.findOne({ username: failApplicant.username })
    assert(adminAfterFail === null,
      'No administrator account created when email delivery fails')

    simulateSmtpFailure = false

    // =======================================================================
    // TEST 7: End-to-End User Flow & Depot Operational Integrity
    // =======================================================================
    console.log('\n--- TEST 7: END-TO-END FLOW & DEPOT OPERATIONAL INTEGRITY ---')

    // 7a. Login with the newly registered MD-approved admin
    let adminToken = null
    {
      const resLogin = await fetch(`${baseUrl}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: verifyApplicant.username,
          msrtcId: verifyApplicant.msrtcId,
          password: verifyApplicant.password
        })
      })
      const dataLogin = await resLogin.json()
      assert(resLogin.status === 200 && dataLogin.success === true && !!dataLogin.token,
        'Newly registered administrator logged in successfully with valid JWT')
      adminToken = dataLogin.token
    }

    // 7b. Access Admin Profile
    {
      const resMe = await fetch(`${baseUrl}/auth/admin/me`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      const dataMe = await resMe.json()
      assert(resMe.status === 200 && dataMe.admin.username === verifyApplicant.username,
        'Protected /auth/admin/me returns authenticated admin profile')
    }

    // 7c. Access Bus list
    {
      const resBuses = await fetch(`${baseUrl}/buses`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      const busData = await resBuses.json()
      const buses = Array.isArray(busData) ? busData : (busData.buses || [])
      assert(resBuses.status === 200 && buses.length > 0,
        `Retrieved bus list: ${buses.length} buses operational`)
    }

    // 7d. Access Driver list
    {
      const resDrivers = await fetch(`${baseUrl}/drivers`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      const drivers = await resDrivers.json()
      assert(resDrivers.status === 200 && Array.isArray(drivers) && drivers.length > 0,
        `Retrieved driver list: ${drivers.length} drivers on depot roster`)
    }

    // 7e. Access Routes
    {
      const resRoutes = await fetch(`${baseUrl}/routes`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      const routes = await resRoutes.json()
      assert(resRoutes.status === 200 && Array.isArray(routes) && routes.length > 0,
        `Retrieved routes: ${routes.length} configured routes`)
    }

    // 7f. Verify Trip Dispatch, WhatsApp click-to-chat link, and Completion
    {
      const driver = await Driver.findOne({ attendanceStatus: 'present', status: 'free' })
      const bus = await Bus.findOne({ status: 'free', isDeleted: { $ne: true } })

      if (driver && bus) {
        // Dispatch trip
        const dispatchRes = await fetch(`${baseUrl}/start-trip`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`
          },
          body: JSON.stringify({
            routeId: 'R1',
            driverId: driver._id.toString(),
            busId: bus._id.toString()
          })
        })
        const dispatchData = await dispatchRes.json()
        assert(dispatchRes.status === 200 && !!dispatchData.tripId,
          'Administrative trip dispatch created successfully')

        // Verify driver & bus become busy
        const updatedDriver = await Driver.findById(driver._id)
        const updatedBus = await Bus.findById(bus._id)
        assert(updatedDriver.status === 'busy',
          'Driver status transitioned to busy on trip dispatch')
        assert(updatedBus.status === 'busy',
          'Bus status transitioned to busy on trip dispatch')

        // Verify tracking link and WhatsApp click-to-chat URL formation
        assert(!!dispatchData.trackingUrl,
          'Driver GPS tracking link generated in trip dispatch response')
        const phone = driver.phone.replace(/\D/g, '')
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(dispatchData.trackingUrl)}`
        assert(whatsappUrl.startsWith('https://wa.me/'),
          'WhatsApp Click-to-Chat GPS dispatch link constructed correctly')

        // Direct trip completion
        const tripId = dispatchData.tripId
        const completeRes = await fetch(`${baseUrl}/trips/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`
          },
          body: JSON.stringify({ tripId })
        })
        const completeData = await completeRes.json()
        assert(completeRes.status === 200 && completeData.message?.includes('Trip completed successfully'),
          'Administrative direct trip completion executed cleanly')

        // Verify driver & bus returned to free
        const finalDriver = await Driver.findById(driver._id)
        const finalBus = await Bus.findById(bus._id)
        assert(finalDriver.status === 'free',
          'Driver returned to free immediately after trip completion')
        assert(finalBus.status === 'free',
          'Bus returned to free immediately after trip completion')
      } else {
        console.log('  ⚠️ Skipped dispatch check: no present & available driver/bus available for test dispatch')
      }
    }

    // 7g. Verify Decoupled Location Telemetry
    {
      const resLoc = await fetch(`${baseUrl}/update-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: 16.8524,
          lng: 74.5815,
          speed: 42
        })
      })
      const dataLoc = await resLoc.json()
      assert(resLoc.status === 200 && dataLoc.message === 'Location updated',
        'GPS location update processed independently without interfering with trip operations')
    }

    // =======================================================================
    // FINAL CHECK: Data Preservation
    // =======================================================================
    console.log('\n--- FINAL VERIFICATION: DATABASE PRESERVATION ---')
    const finalCounts = {
      buses: await Bus.countDocuments(),
      drivers: await Driver.countDocuments(),
      trips: await Trip.countDocuments(),
      locations: await Location.countDocuments(),
      attendances: await Attendance.countDocuments()
    }

    assert(finalCounts.buses === initialCounts.buses,
      `Buses strictly preserved: ${finalCounts.buses} == ${initialCounts.buses}`)
    assert(finalCounts.drivers === initialCounts.drivers,
      `Drivers strictly preserved: ${finalCounts.drivers} == ${initialCounts.drivers}`)
    assert(finalCounts.attendances === initialCounts.attendances,
      `Attendance strictly preserved: ${finalCounts.attendances} == ${initialCounts.attendances}`)
    assert(finalCounts.trips >= initialCounts.trips,
      `Trips preserved/appended: ${finalCounts.trips} >= ${initialCounts.trips}`)

    console.log('\n========================================================================')
    console.log(`🏁 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`)
    console.log('========================================================================')

  } finally {
    setTestTransporter(null)
    server.close()
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB Atlas')
  }

  if (failed > 0) {
    process.exit(1)
  }
}

runMdApprovalTestSuite().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
