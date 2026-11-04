import mongoose from 'mongoose'
import Trip from '../models/Trip.js'
import Driver from '../models/Driver.js'
import Bus from '../models/Bus.js'
import Location from '../models/Location.js'
import { FRONTEND_URL, getPublicTrackingBaseUrl } from '../utils/network.js'
import {
  ROUTES_CONFIG,
  SANGLI_ALLOWED_ROUTES,
  calculateJourneyEtas,
  getBusEtaDetails
} from '../utils/routeConfig.js'

/**
 * Fetch a single trip by ID with populated driver, bus, and journey state
 */
export const getTripById = async (req, res) => {
  try {
    const { id } = req.params

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Trip ID format' })
    }

    const trip = await Trip.findById(id)
      .populate('driverId', 'name phone routeId status attendanceStatus')
      .populate('busId', 'number status routeId')
      .lean()

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' })
    }

    const latestLocation = await Location.findOne({ tripId: trip._id })
      .sort({ timestamp: -1 })
      .lean()

    const routeConfig = ROUTES_CONFIG[trip.routeId]

    const journeyEtas = calculateJourneyEtas({
      routeId: trip.routeId,
      phase: trip.phase || 'OUTBOUND',
      currentLat: latestLocation?.latitude,
      currentLng: latestLocation?.longitude,
      locationTimestamp: latestLocation?.timestamp,
      destinationArrivalTime: trip.destinationArrivalTime,
      outboundDepartureTime: trip.outboundDepartureTime || trip.startTime
    })

    res.json({
      ...trip,
      phase: trip.phase || 'OUTBOUND',
      routeName: routeConfig?.name || trip.routeId,
      destinationStand: routeConfig?.destination?.name || 'Destination',
      sangliReturnEta: journeyEtas.sangliReturnEta,
      outwardDestinationEta: journeyEtas.outwardDestinationEta,
      latestLocation: latestLocation ? {
        latitude: latestLocation.latitude,
        longitude: latestLocation.longitude,
        timestamp: latestLocation.timestamp
      } : null
    })
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving trip', error: error.message })
  }
}

/**
 * Dispatch Workflow: Create one coherent Sangli Depot Journey
 * Rules:
 * - Depot: Sangli Depot only
 * - Route must be one of the allowed outward routes: Sangli → Kolhapur, Sangli → Tasgaon, Sangli → Miraj
 * - Driver must be present and free
 * - Bus must be globally free across the Sangli fleet
 * - Neither resource may have an active trip
 * - Atomic conditional claiming prevents race conditions
 * - Initial state: OUTBOUND phase
 */
export const startTrip = async (req, res) => {
  const { routeId, driverId, busId } = req.body

  if (!routeId || !driverId || !busId) {
    return res.status(400).json({ message: 'routeId, driverId, and busId are required' })
  }

  // Verify route is defined and allowed for Sangli Depot
  const routeConfig = ROUTES_CONFIG[routeId]
  if (!routeConfig) {
    return res.status(400).json({
      message: `Invalid route ID: ${routeId}. Allowed outward routes: Sangli → Kolhapur (R1), Sangli → Tasgaon (R2), Sangli → Miraj (R3).`
    })
  }

  // 1. Initial Existence Checks
  const driver = await Driver.findById(driverId)
  const bus = await Bus.findById(busId)

  if (!driver) {
    return res.status(404).json({ message: 'Driver not found' })
  }
  if (!bus) {
    return res.status(404).json({ message: 'Bus not found' })
  }

  if (bus.isDeleted || bus.isActive === false) {
    return res.status(400).json({
      message: `Bus ${bus.number} is inactive or removed from fleet.`
    })
  }

  // 2. Validate Operational States
  if (driver.attendanceStatus !== 'present') {
    return res.status(400).json({
      message: `Driver ${driver.name} is marked as absent. Attendance must be marked present before dispatch.`
    })
  }

  if (driver.status !== 'free') {
    return res.status(400).json({
      message: `Driver ${driver.name} is currently busy.`
    })
  }

  if (bus.status !== 'free') {
    return res.status(400).json({
      message: `Bus ${bus.number} is currently busy.`
    })
  }

  // 3. Confirm Neither Resource Has an Active Trip in Progress
  const activeDriverTrip = await Trip.findOne({ driverId, status: 'active' })
  if (activeDriverTrip) {
    return res.status(409).json({
      message: `Driver ${driver.name} is already assigned to active Trip ${activeDriverTrip._id}.`
    })
  }

  const activeBusTrip = await Trip.findOne({ busId, status: 'active' })
  if (activeBusTrip) {
    return res.status(409).json({
      message: `Bus ${bus.number} is already assigned to active Trip ${activeBusTrip._id}.`
    })
  }

  // 4. Atomic Concurrency Claim
  const claimedDriver = await Driver.findOneAndUpdate(
    { _id: driverId, status: 'free', attendanceStatus: 'present' },
    { status: 'busy' },
    { new: true }
  )

  if (!claimedDriver) {
    return res.status(409).json({
      message: `Driver ${driver.name} could not be claimed (already busy or absent).`
    })
  }

  const claimedBus = await Bus.findOneAndUpdate(
    { _id: busId, status: 'free', isDeleted: { $ne: true }, isActive: { $ne: false } },
    { status: 'busy' },
    { new: true }
  )

  if (!claimedBus) {
    await Driver.updateOne({ _id: driverId }, { status: 'free' })
    return res.status(409).json({
      message: `Bus ${bus.number} could not be claimed (already assigned by another dispatch).`
    })
  }

  // 5. Create Authoritative Journey Record with Initial OUTBOUND Phase
  const now = new Date()
  let trip
  try {
    trip = await Trip.create({
      routeId,
      driverId,
      busId,
      status: 'active',
      phase: 'OUTBOUND',
      outboundDepartureTime: now,
      startTime: now
    })
  } catch (err) {
    await Driver.updateOne({ _id: driverId }, { status: 'free' })
    await Bus.updateOne({ _id: busId }, { status: 'free' })
    return res.status(500).json({ message: 'Failed to create journey assignment', error: err.message })
  }

  const baseUrl = getPublicTrackingBaseUrl()
  const trackingUrl = `${baseUrl}/track?tripId=${trip._id.toString()}`
  console.log(`Dispatched Journey ${trip._id}: Bus ${claimedBus.number} + Driver ${claimedDriver.name} on ${routeConfig.name} (OUTBOUND). Mobile Tracking: ${trackingUrl}`)

  res.status(200).json({
    message: 'Trip started successfully',
    tripId: trip._id,
    phase: 'OUTBOUND',
    trackingUrl,
    driver: claimedDriver,
    bus: claimedBus,
    route: routeConfig
  })
}

/**
 * Authorized Transition: Record Destination Arrival & Enter DESTINATION_STOP phase
 * - Planned stop duration: 15 minutes
 * - Resources (driver and bus) REMAIN BUSY!
 */
export const recordDestinationArrival = async (req, res) => {
  try {
    const { tripId } = req.body
    if (!tripId) {
      return res.status(400).json({ message: 'tripId is required' })
    }

    const trip = await Trip.findById(tripId)
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' })
    }

    if (trip.status === 'completed') {
      return res.status(400).json({ message: 'Trip is already completed' })
    }

    if (trip.phase === 'DESTINATION_STOP') {
      return res.json({
        message: 'Trip is already at destination stop',
        trip
      })
    }

    const now = new Date()
    const expectedReturnDeparture = new Date(now.getTime() + 15 * 60 * 1000)

    trip.phase = 'DESTINATION_STOP'
    trip.destinationArrivalTime = now
    trip.expectedReturnDepartureTime = expectedReturnDeparture
    await trip.save()

    const routeConfig = ROUTES_CONFIG[trip.routeId]
    console.log(`Trip ${tripId} recorded destination arrival at ${routeConfig?.destination?.name || 'destination'}. Entering planned 15-min stop.`)

    res.json({
      message: `Bus arrived at ${routeConfig?.destination?.name || 'destination'}. Planned 15-minute stop recorded.`,
      trip
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to record destination arrival', error: error.message })
  }
}

/**
 * Authorized Transition: Start Return Journey back to Sangli Depot
 * - Destination becomes Sangli Central Bus Stand
 * - Phase changes to RETURNING
 * - Resources REMAIN BUSY!
 */
export const startReturnJourney = async (req, res) => {
  try {
    const { tripId } = req.body
    if (!tripId) {
      return res.status(400).json({ message: 'tripId is required' })
    }

    const trip = await Trip.findById(tripId)
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' })
    }

    if (trip.status === 'completed') {
      return res.status(400).json({ message: 'Trip is already completed' })
    }

    const now = new Date()
    trip.phase = 'RETURNING'
    trip.returnDepartureTime = now
    await trip.save()

    console.log(`Trip ${tripId} commenced return journey to Sangli Depot. Phase: RETURNING.`)

    res.json({
      message: 'Return journey to Sangli Depot commenced successfully.',
      trip
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to commence return journey', error: error.message })
  }
}

/**
 * Fetch All Active Trips with Coherent Driver, Bus, and Sangli Return ETA details
 */
export const getActiveTrips = async (req, res) => {
  try {
    const activeTrips = await Trip.find({ status: 'active' })
      .populate('driverId', 'name phone routeId status attendanceStatus')
      .populate('busId', 'number status routeId')
      .sort({ startTime: -1 })
      .lean()

    const enrichedTrips = await Promise.all(
      activeTrips.map(async (trip) => {
        const latestLocation = await Location.findOne({ tripId: trip._id })
          .sort({ timestamp: -1 })
          .lean()

        const hasDriver = Boolean(trip.driverId)
        const hasBus = Boolean(trip.busId)

        const routeConfig = ROUTES_CONFIG[trip.routeId]
        const phase = trip.phase || 'OUTBOUND'

        const journeyEtas = calculateJourneyEtas({
          routeId: trip.routeId,
          phase,
          currentLat: latestLocation?.latitude,
          currentLng: latestLocation?.longitude,
          locationTimestamp: latestLocation?.timestamp,
          destinationArrivalTime: trip.destinationArrivalTime,
          outboundDepartureTime: trip.outboundDepartureTime || trip.startTime
        })

        // Target display stand name depends on journey phase
        const currentDestinationStand = phase === 'RETURNING'
          ? (routeConfig?.returnDestination?.name || 'Sangli Central Bus Stand')
          : (routeConfig?.destination?.name || 'Destination')

        return {
          _id: trip._id,
          routeId: trip.routeId,
          routeName: routeConfig?.name || trip.routeId,
          destinationStand: currentDestinationStand,
          outwardDestinationStand: routeConfig?.destination?.name || 'Destination',
          phase,
          startTime: trip.startTime,
          outboundDepartureTime: trip.outboundDepartureTime || trip.startTime,
          destinationArrivalTime: trip.destinationArrivalTime,
          stopDurationMinutes: trip.stopDurationMinutes || 15,
          expectedReturnDepartureTime: trip.expectedReturnDepartureTime,
          returnDepartureTime: trip.returnDepartureTime,
          status: trip.status,
          driver: hasDriver ? trip.driverId : null,
          bus: hasBus ? trip.busId : null,
          dataIntegrityWarning: !hasDriver || !hasBus
            ? 'Data integrity warning: Missing assigned driver or bus document in database'
            : null,
          latestLocation: latestLocation ? {
            latitude: latestLocation.latitude,
            longitude: latestLocation.longitude,
            timestamp: latestLocation.timestamp
          } : null,
          sangliReturnEta: journeyEtas.sangliReturnEta,
          outwardDestinationEta: journeyEtas.outwardDestinationEta,
          eta: {
            etaAvailable: journeyEtas.etaAvailable,
            etaMinutes: journeyEtas.sangliReturnEta?.etaMinutes,
            arrivalClockTime: journeyEtas.sangliReturnEta?.arrivalClockTime,
            destinationStand: currentDestinationStand,
            remainingDistanceKm: phase === 'RETURNING'
              ? journeyEtas.breakdown?.remReturnDistanceKm
              : journeyEtas.breakdown?.remOutwardDistanceKm,
            averageSpeedKmh: 45,
            sangliReturnEta: journeyEtas.sangliReturnEta,
            outwardDestinationEta: journeyEtas.outwardDestinationEta,
            phase
          },
          remainingStopMinutes: journeyEtas.remainingStopMinutes,
          trackingUrl: `${getPublicTrackingBaseUrl()}/track?tripId=${encodeURIComponent(trip._id.toString())}`
        }
      })
    )

    res.json(enrichedTrips)
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve active trips', error: error.message })
  }
}

/**
 * Direct Administrative Trip Completion (Authorized Action)
 * - Finds exact trip by Trip ID
 * - Verifies trip is active
 * - Marks trip COMPLETED with actual completion timestamp
 * - Identifies assigned driver and bus
 * - Checks if driver has another active assignment
 * - Checks if bus has another active assignment
 * - Releases driver only if no other active assignment exists (preserves attendanceStatus!)
 * - Releases bus only if no other active assignment exists
 * - Preserves completed trip in database history
 */
export const completeTrip = async (req, res) => {
  try {
    const { tripId } = req.body

    if (!tripId) {
      return res.status(400).json({ message: 'tripId is required to complete trip' })
    }

    // 1. Find exact trip
    const trip = await Trip.findById(tripId)
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' })
    }

    // 2. Verify trip is currently active
    if (trip.status === 'completed') {
      return res.status(400).json({ message: 'Trip is already completed' })
    }

    const now = new Date()
    // 3. Mark trip as COMPLETED with completion timestamp
    trip.status = 'completed'
    trip.phase = 'COMPLETED'
    trip.actualSangliArrivalTime = now
    trip.endTime = now
    await trip.save()

    // 4. Safely release driver ONLY if no other active assignment exists
    let freedDriver = null
    if (trip.driverId) {
      const otherDriverTrip = await Trip.findOne({
        _id: { $ne: trip._id },
        driverId: trip.driverId,
        status: 'active'
      })

      if (!otherDriverTrip) {
        freedDriver = await Driver.findByIdAndUpdate(
          trip.driverId,
          { status: 'free' },
          { new: true }
        )
      } else {
        freedDriver = await Driver.findById(trip.driverId)
      }
    }

    // 5. Safely release bus ONLY if no other active assignment exists
    let freedBus = null
    if (trip.busId) {
      const otherBusTrip = await Trip.findOne({
        _id: { $ne: trip._id },
        busId: trip.busId,
        status: 'active'
      })

      if (!otherBusTrip) {
        freedBus = await Bus.findByIdAndUpdate(
          trip.busId,
          { status: 'free' },
          { new: true }
        )
      } else {
        freedBus = await Bus.findById(trip.busId)
      }
    }

    console.log(`Trip ${tripId} completed: Bus ${freedBus?.number || trip.busId} and Driver ${freedDriver?.name || trip.driverId} updated. Driver status: ${freedDriver?.status}, Bus status: ${freedBus?.status}. Attendance preserved: ${freedDriver?.attendanceStatus}.`)

    res.json({
      message: 'Trip completed successfully. Bus and Driver are now available.',
      trip,
      driver: freedDriver,
      bus: freedBus
    })
  } catch (error) {
    res.status(500).json({ message: 'Error completing trip', error: error.message })
  }
}

/**
 * Driver telemetry / public tracking journey completion endpoint (alias of completeTrip)
 */
export const endTrip = async (req, res) => {
  return completeTrip(req, res)
}

/**
 * Dashboard Live Summary & KPIs
 * Strict 4 KPI cards: Total Buses, Available Buses, Active Trips, Drivers Present.
 * Strict 3 Active Trips table columns: Bus Number, Driver Name, Estimated Arrival at Sangli Depot.
 */
export const getDashboardSummary = async (req, res) => {
  try {
    // 1. Total Buses in Sangli Depot
    const totalBuses = await Bus.countDocuments({ isDeleted: { $ne: true } })

    // 2. Active Trips
    const activeTrips = await Trip.find({ status: 'active' })
      .populate('driverId', 'name phone routeId')
      .populate('busId', 'number routeId')
      .sort({ startTime: -1 })
      .lean()

    const activeBusIds = new Set(activeTrips.map(t => t.busId?._id?.toString()).filter(Boolean))

    // 3. Available Buses (free, non-deleted, active, not currently on active trip)
    const availableBuses = await Bus.countDocuments({
      status: 'free',
      isDeleted: { $ne: true },
      isActive: { $ne: false },
      _id: { $nin: Array.from(activeBusIds) }
    })

    // 4. Drivers Present
    const driversPresent = await Driver.countDocuments({ attendanceStatus: 'present' })

    // Active trips formatted specifically for the 3-column table
    const tableRows = await Promise.all(
      activeTrips.map(async (trip) => {
        const latestLocation = await Location.findOne({ tripId: trip._id }).sort({ timestamp: -1 }).lean()
        const routeConfig = ROUTES_CONFIG[trip.routeId]
        const phase = trip.phase || 'OUTBOUND'

        const journeyEtas = calculateJourneyEtas({
          routeId: trip.routeId,
          phase,
          currentLat: latestLocation?.latitude,
          currentLng: latestLocation?.longitude,
          locationTimestamp: latestLocation?.timestamp,
          destinationArrivalTime: trip.destinationArrivalTime,
          outboundDepartureTime: trip.outboundDepartureTime || trip.startTime
        })

        return {
          _id: trip._id,
          busNumber: trip.busId?.number || 'Unknown Bus',
          driverName: trip.driverId?.name || 'Assigned Driver',
          phase,
          routeName: routeConfig?.name || trip.routeId,
          outwardDestination: routeConfig?.destination?.name || 'Destination',
          sangliReturnEta: journeyEtas.sangliReturnEta,
          startTime: trip.startTime
        }
      })
    )

    res.json({
      kpis: {
        totalBuses,
        availableBuses,
        activeTrips: activeTrips.length,
        driversPresent
      },
      activeTrips: tableRows
    })
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve dashboard summary', error: err.message })
  }
}

/**
 * Resource Reconciliation: Health Check
 */
export const reconcileStatus = async (req, res) => {
  try {
    const activeTrips = await Trip.find({ status: 'active' }).lean()
    const activeDriverIds = new Set(activeTrips.map(t => t.driverId?.toString()).filter(Boolean))
    const activeBusIds = new Set(activeTrips.map(t => t.busId?.toString()).filter(Boolean))

    const allBusyDrivers = await Driver.find({ status: 'busy' }).lean()
    const allBusyBuses = await Bus.find({ status: 'busy' }).lean()

    const orphanedBusyDrivers = allBusyDrivers.filter(d => !activeDriverIds.has(d._id.toString()))
    const orphanedBusyBuses = allBusyBuses.filter(b => !activeBusIds.has(b._id.toString()))
    const brokenActiveTrips = activeTrips.filter(t => !t.driverId || !t.busId)

    res.json({
      activeTripsCount: activeTrips.length,
      busyDriversCount: allBusyDrivers.length,
      busyBusesCount: allBusyBuses.length,
      orphanedBusyDrivers: orphanedBusyDrivers.map(d => ({ id: d._id, name: d.name, routeId: d.routeId })),
      orphanedBusyBuses: orphanedBusyBuses.map(b => ({ id: b._id, number: b.number, routeId: b.routeId })),
      brokenActiveTrips: brokenActiveTrips.map(t => ({ id: t._id, routeId: t.routeId }))
    })
  } catch (error) {
    res.status(500).json({ message: 'Error running reconciliation check', error: error.message })
  }
}

/**
 * Resource Reconciliation: Repair orphaned statuses safely
 */
export const repairOrphanedResources = async (req, res) => {
  try {
    const activeTrips = await Trip.find({ status: 'active' }).lean()
    const activeDriverIds = new Set(activeTrips.map(t => t.driverId?.toString()).filter(Boolean))
    const activeBusIds = new Set(activeTrips.map(t => t.busId?.toString()).filter(Boolean))

    const allBusyDrivers = await Driver.find({ status: 'busy' }).lean()
    const allBusyBuses = await Bus.find({ status: 'busy' }).lean()

    const orphanedDriverIds = allBusyDrivers
      .filter(d => !activeDriverIds.has(d._id.toString()))
      .map(d => d._id)

    const orphanedBusIds = allBusyBuses
      .filter(b => !activeBusIds.has(b._id.toString()))
      .map(b => b._id)

    if (orphanedDriverIds.length > 0) {
      await Driver.updateMany({ _id: { $in: orphanedDriverIds } }, { status: 'free' })
    }

    if (orphanedBusIds.length > 0) {
      await Bus.updateMany({ _id: { $in: orphanedBusIds } }, { status: 'free' })
    }

    res.json({
      message: 'Orphaned resources reconciled successfully',
      freedDriversCount: orphanedDriverIds.length,
      freedBusesCount: orphanedBusIds.length
    })
  } catch (error) {
    res.status(500).json({ message: 'Error repairing orphaned resources', error: error.message })
  }
}

/**
 * Legacy Free Resources endpoint (safely backwards-compatible)
 */
export const freeResources = async (req, res) => {
  const { routeId, driverId, busId } = req.body
  if (!driverId && !busId) {
    return res.status(400).json({ message: 'driverId or busId is required' })
  }

  const activeTrip = await Trip.findOne({
    $or: [
      { driverId: driverId || null },
      { busId: busId || null }
    ],
    status: 'active'
  })

  if (activeTrip) {
    activeTrip.status = 'completed'
    activeTrip.phase = 'COMPLETED'
    activeTrip.endTime = new Date()
    activeTrip.actualSangliArrivalTime = new Date()
    await activeTrip.save()
  }

  if (driverId) {
    await Driver.findByIdAndUpdate(driverId, { status: 'free' })
  }
  if (busId) {
    await Bus.findByIdAndUpdate(busId, { status: 'free' })
  }

  res.json({
    message: 'Resources marked free and connected active journey completed if present',
    tripId: activeTrip?._id || null
  })
}
