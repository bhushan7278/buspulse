import Bus from '../models/Bus.js'
import Trip from '../models/Trip.js'
import { ROUTES_CONFIG } from '../utils/routeConfig.js'

/**
 * Fleet-wide available buses query
 * Returns active, non-deleted buses with status 'free'
 */
export const getAllAvailableBuses = async (req, res) => {
  try {
    const buses = await Bus.find({
      status: 'free',
      isDeleted: { $ne: true },
      isActive: { $ne: false }
    }).sort('number')
    res.json(buses)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch available buses', error: error.message })
  }
}

/**
 * Route-parameterized query with global fallback
 * Returns all globally free non-deleted buses
 */
export const getAvailableBusesByRoute = async (req, res) => {
  try {
    const buses = await Bus.find({
      status: 'free',
      isDeleted: { $ne: true },
      isActive: { $ne: false }
    }).sort('number')
    res.json(buses)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch available buses', error: error.message })
  }
}

/**
 * Depot Bus Management List with Search and Summary Statistics
 * Accepts optional query: ?search=... (case-insensitive partial match on registration number)
 */
export const getAllBuses = async (req, res) => {
  try {
    const { search } = req.query
    let filter = { isDeleted: { $ne: true } }

    if (search && typeof search === 'string' && search.trim()) {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.number = { $regex: sanitized, $options: 'i' }
    }

    const buses = await Bus.find(filter).sort('number').lean()

    // Find all active trips to accurately correlate each bus with real-time assignment
    const activeTrips = await Trip.find({ status: 'active' })
      .populate('driverId', 'name phone')
      .lean()

    const activeTripByBusId = new Map()
    for (const trip of activeTrips) {
      if (trip.busId) {
        activeTripByBusId.set(trip.busId.toString(), trip)
      }
    }

    const enrichedBuses = buses.map(bus => {
      const activeTrip = activeTripByBusId.get(bus._id.toString())
      return {
        ...bus,
        isOnActiveTrip: Boolean(activeTrip),
        activeTrip: activeTrip ? {
          tripId: activeTrip._id,
          routeId: activeTrip.routeId,
          routeName: ROUTES_CONFIG[activeTrip.routeId]?.name || activeTrip.routeId,
          driverName: activeTrip.driverId?.name || 'Assigned Driver',
          driverPhone: activeTrip.driverId?.phone || '',
          startTime: activeTrip.startTime
        } : null
      }
    })

    // Compute live summary statistics across the active fleet
    const allFleetBuses = await Bus.find({ isDeleted: { $ne: true } }).lean()
    const totalCount = allFleetBuses.length
    const busyCount = activeTrips.length
    const availableCount = allFleetBuses.filter(
      b => b.status === 'free' && !activeTripByBusId.has(b._id.toString())
    ).length

    res.json({
      buses: enrichedBuses,
      summary: {
        total: totalCount,
        available: availableCount,
        busy: busyCount
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch fleet buses', error: error.message })
  }
}

/**
 * Register a new Bus into the depot fleet
 */
export const createBus = async (req, res) => {
  try {
    const { number, routeId } = req.body

    if (!number || typeof number !== 'string' || number.trim().length < 2) {
      return res.status(400).json({
        message: 'Bus registration number is required (minimum 2 characters)'
      })
    }

    const cleanedNumber = number.trim().toUpperCase()

    // Check for duplicate bus number (case-insensitive across non-deleted fleet)
    const existingBus = await Bus.findOne({
      number: { $regex: `^${cleanedNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      isDeleted: { $ne: true }
    })

    if (existingBus) {
      return res.status(409).json({
        message: `Bus with registration number ${cleanedNumber} already exists in the depot fleet.`
      })
    }

    // Initialize with safe default operational states: free, active, non-deleted
    const newBus = await Bus.create({
      number: cleanedNumber,
      routeId: routeId && typeof routeId === 'string' && routeId.trim() ? routeId.trim() : null,
      status: 'free',
      isActive: true,
      isDeleted: false
    })

    res.status(201).json({
      message: `Bus ${newBus.number} registered successfully into depot fleet`,
      bus: newBus
    })
  } catch (error) {
    res.status(500).json({
      message: 'Failed to register bus',
      error: error.message
    })
  }
}

/**
 * Safe Deletion / Deactivation of an existing bus
 * - Must reject deletion if the bus is currently on an active trip
 * - Soft-deletes to protect historical trips and foreign key references
 */
export const deleteBus = async (req, res) => {
  try {
    const { id } = req.params

    const bus = await Bus.findOne({ _id: id, isDeleted: { $ne: true } })
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found or already deleted' })
    }

    // Safety Rule 1: A bus assigned to an active trip must not be deletable
    const activeTrip = await Trip.findOne({ busId: id, status: 'active' })
    if (activeTrip || bus.status === 'busy') {
      return res.status(400).json({
        message: `Bus ${bus.number} cannot be deleted because it is currently assigned to an active trip (${activeTrip ? activeTrip._id : 'in progress'}). Complete the trip first.`
      })
    }

    // Safety Rule 2: Soft-delete to preserve historical trips and references
    bus.isDeleted = true
    bus.isActive = false
    bus.status = 'busy' // prevent any future dispatch
    await bus.save()

    res.json({
      message: `Bus ${bus.number} removed from depot fleet successfully`,
      bus
    })
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete bus',
      error: error.message
    })
  }
}

/**
 * Busy buses across fleet
 */
export const getAllBusyBuses = async (req, res) => {
  try {
    const buses = await Bus.find({ status: 'busy', isDeleted: { $ne: true } }).sort('number')
    res.json(buses)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch busy buses', error: error.message })
  }
}

export const getBusyBusesByRoute = async (req, res) => {
  try {
    const { routeId } = req.params
    const buses = await Bus.find({ routeId, status: 'busy', isDeleted: { $ne: true } }).sort('number')
    res.json(buses)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch busy buses for route', error: error.message })
  }
}
