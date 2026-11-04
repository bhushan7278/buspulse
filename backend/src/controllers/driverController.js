import Driver from '../models/Driver.js'
import Attendance from '../models/Attendance.js'
import Trip from '../models/Trip.js'

/**
 * Depot-wide driver listing with case-insensitive search
 */
export const getAllDrivers = async (req, res) => {
  try {
    const { search } = req.query
    let filter = {}

    if (search && typeof search === 'string' && search.trim()) {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.name = { $regex: sanitized, $options: 'i' }
    }

    const drivers = await Driver.find(filter).sort('name')
    res.json(drivers)
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch depot drivers',
      error: error.message
    })
  }
}

/**
 * Create a new driver with validation and duplicate prevention
 */
export const createDriver = async (req, res) => {
  try {
    const { name, phone, routeId } = req.body

    // 1. Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        message: 'Driver name is required (minimum 2 characters)'
      })
    }

    if (!phone || typeof phone !== 'string' || phone.trim().length < 7) {
      return res.status(400).json({
        message: 'Valid driver contact number is required'
      })
    }

    if (!routeId || typeof routeId !== 'string') {
      return res.status(400).json({
        message: 'Default assigned route is required'
      })
    }

    const cleanedPhone = phone.trim()

    // 2. Duplicate checking by contact phone
    const existingDriver = await Driver.findOne({ phone: cleanedPhone })
    if (existingDriver) {
      return res.status(409).json({
        message: `Driver with contact number ${cleanedPhone} already exists (${existingDriver.name})`
      })
    }

    // 3. Initialize with safe default operational states
    // Never create as already present or busy
    const newDriver = await Driver.create({
      name: name.trim(),
      phone: cleanedPhone,
      routeId: routeId.trim(),
      status: 'free',
      attendanceStatus: 'absent'
    })

    res.status(201).json({
      message: 'Driver registered successfully',
      driver: newDriver
    })
  } catch (error) {
    res.status(500).json({
      message: 'Failed to register new driver',
      error: error.message
    })
  }
}

/**
 * Route-filtered driver listings (legacy & dispatch compatibility)
 */
export const getDriversByRoute = async (req, res) => {
  const { routeId } = req.params
  const drivers = await Driver.find({ routeId }).sort('name')
  res.json(drivers)
}

export const getAvailableDriversByRoute = async (req, res) => {
  const { routeId } = req.params
  let drivers = await Driver.find({
    routeId,
    status: 'free',
    attendanceStatus: 'present'
  }).sort('name')

  // If no drivers explicitly tagged with this specific route, provide any present & free Sangli Depot drivers
  if (drivers.length === 0) {
    drivers = await Driver.find({
      status: 'free',
      attendanceStatus: 'present'
    }).sort('name')
  }

  res.json(drivers)
}

export const getBusyDriversByRoute = async (req, res) => {
  const { routeId } = req.params
  const drivers = await Driver.find({ routeId, status: 'busy' }).sort('name')
  res.json(drivers)
}

export const getPresentDriversByRoute = async (req, res) => {
  const { routeId } = req.params
  const drivers = await Driver.find({ routeId, attendanceStatus: 'present' }).sort('name')
  res.json(drivers)
}

/**
 * Depot-wide Attendance Recording
 * Independent of route selection; enforces one attendance record per driver per date.
 */
export const recordAttendance = async (req, res) => {
  try {
    const { driverId, routeId } = req.body

    if (!driverId) {
      return res.status(400).json({ message: 'driverId is required' })
    }

    const driver = await Driver.findById(driverId)
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' })
    }

    const today = new Date().toISOString().split('T')[0]

    // Check if attendance is already recorded for this driver today
    const existingAttendance = await Attendance.findOne({ driverId, date: today })
    if (existingAttendance) {
      // Ensure driver record reflects present
      if (driver.attendanceStatus !== 'present') {
        driver.attendanceStatus = 'present'
        await driver.save()
      }
      return res.status(409).json({
        message: `Attendance already recorded for ${driver.name} today (${today})`,
        driver,
        alreadyMarked: true
      })
    }

    // Atomic / duplicate-safe creation
    try {
      await Attendance.create({
        driverId,
        routeId: routeId || driver.routeId || null,
        date: today,
        status: 'present'
      })
    } catch (err) {
      if (err.code === 11000) {
        // Handled race condition: duplicate key index
        driver.attendanceStatus = 'present'
        await driver.save()
        return res.status(409).json({
          message: `Attendance already recorded for ${driver.name} today (${today})`,
          driver,
          alreadyMarked: true
        })
      }
      throw err
    }

    // Update driver attendance status
    driver.attendanceStatus = 'present'
    await driver.save()

    res.json({
      message: `Attendance marked present for ${driver.name}`,
      driver
    })
  } catch (error) {
    res.status(500).json({
      message: 'Failed to record attendance',
      error: error.message
    })
  }
}

/**
 * Depot-wide Present Driver Listing for Check Out
 * Returns all currently present drivers with active trip status annotation, independent of routes.
 */
export const getAllPresentDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find({ attendanceStatus: 'present' }).sort('name').lean()
    const activeTrips = await Trip.find({ status: 'active' }).lean()
    const activeDriverIds = new Set(activeTrips.map(t => t.driverId?.toString()))

    const enriched = drivers.map(d => {
      const hasActiveTrip = activeDriverIds.has(d._id.toString()) || d.status === 'busy'
      return {
        ...d,
        hasActiveTrip,
        checkoutEligibility: !hasActiveTrip,
        ineligibleReason: hasActiveTrip ? 'Assigned to active trip. Complete trip first.' : null
      }
    })

    res.json(enriched)
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch present drivers',
      error: error.message
    })
  }
}

/**
 * Driver checkout (returns driver to absent status and records checkout timestamp)
 */
export const checkOutDriver = async (req, res) => {
  try {
    const { driverId } = req.body
    if (!driverId) {
      return res.status(400).json({ message: 'driverId is required' })
    }

    const driver = await Driver.findById(driverId)
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' })
    }

    // A driver can only be checked out if present and NOT assigned to an active trip
    const activeTrip = await Trip.findOne({ driverId, status: 'active' })
    if (activeTrip || driver.status === 'busy') {
      return res.status(400).json({
        message: `Driver ${driver.name} is currently assigned to an active trip. Complete the trip first before checking out.`
      })
    }

    if (driver.attendanceStatus !== 'present') {
      return res.status(400).json({
        message: `Driver ${driver.name} is already checked out (attendance status is absent).`
      })
    }

    // Record checkout timestamp in Attendance collection
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    let attendance = await Attendance.findOneAndUpdate(
      { driverId, date: today },
      { status: 'absent', checkOutTime: now },
      { new: true }
    )

    if (!attendance) {
      attendance = await Attendance.findOneAndUpdate(
        { driverId },
        { status: 'absent', checkOutTime: now },
        { sort: { createdAt: -1 }, new: true }
      )
    }

    // Update driver attendance status
    driver.attendanceStatus = 'absent'
    await driver.save()

    return res.status(200).json({
      success: true,
      message: `Driver ${driver.name} checked out successfully.`,
      driver,
      checkOutTime: now,
      attendanceId: attendance?._id
    })
  } catch (error) {
    res.status(500).json({
      message: 'Failed to check out driver',
      error: error.message
    })
  }
}
