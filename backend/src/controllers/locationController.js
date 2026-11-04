import mongoose from 'mongoose'
import Location from '../models/Location.js'
import Trip from '../models/Trip.js'
import {
  ROUTES_CONFIG,
  calculateJourneyEtas,
  calculateHaversineDistanceKm
} from '../utils/routeConfig.js'

export const updateLocationByTrip = async (req, res) => {
  const { tripId, latitude, longitude } = req.body
  if (!tripId || latitude == null || longitude == null) {
    return res.status(400).json({ message: 'tripId, latitude, and longitude are required' })
  }

  if (!mongoose.Types.ObjectId.isValid(tripId)) {
    return res.status(400).json({ message: 'Invalid Trip ID format' })
  }

  const latNum = parseFloat(latitude)
  const lngNum = parseFloat(longitude)
  if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    return res.status(400).json({
      message: 'Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180'
    })
  }

  const trip = await Trip.findById(tripId)
  if (!trip) {
    return res.status(404).json({ message: 'Trip not found' })
  }

  if (trip.status !== 'active') {
    return res.status(400).json({
      message: `Cannot update location for ${trip.status} trip. Live tracking is closed.`
    })
  }

  // Record telemetry safely without mutating trip lifecycle or resource states
  const now = new Date()
  const location = await Location.create({
    tripId,
    latitude: latNum,
    longitude: lngNum,
    timestamp: now
  })

  res.json({ message: 'Location updated', locationId: location._id })
}

export const updateGeneralLocation = async (req, res) => {
  const data = req.body
  const { lat, lng, speed } = data

  if (lat == null || lng == null) {
    return res.status(400).json({ message: 'lat and lng are required' })
  }

  await Location.create({ 
    latitude: lat, 
    longitude: lng, 
    speed: speed || 40 
  })

  res.json({ message: 'Location updated' })
}

export const getLatestLocation = async (req, res) => {
  const latest = await Location.findOne().sort({ timestamp: -1 }).lean()
  if (!latest) {
    return res.json({
      lat: null,
      lng: null,
      speed: 0,
      hasLocation: false,
      message: 'No location telemetry recorded yet'
    })
  }
  res.json({
    lat: latest.latitude,
    lng: latest.longitude,
    speed: latest.speed || 40,
    hasLocation: true
  })
}

/**
 * Returns active bus locations with journey ETAs for Extra Bus and maps
 */
export const getActiveLocationsByRoute = async (req, res) => {
  const { routeId } = req.params
  try {
    const routeConfig = ROUTES_CONFIG[routeId]
    if (!routeConfig) {
      return res.status(404).json({ message: `Route '${routeId}' not found.` })
    }

    const activeTrips = await Trip.find({ routeId, status: 'active' }).populate('busId driverId')
    const tripLocations = []

    for (const trip of activeTrips) {
      const latestLocation = await Location.findOne({ tripId: trip._id }).sort({ timestamp: -1 })
      const hasValidCoords =
        latestLocation &&
        latestLocation.latitude != null &&
        latestLocation.longitude != null &&
        !isNaN(latestLocation.latitude) &&
        !isNaN(latestLocation.longitude)

      const phase = trip.phase || 'OUTBOUND'

      const journeyEtas = calculateJourneyEtas({
        routeId,
        phase,
        currentLat: hasValidCoords ? latestLocation.latitude : null,
        currentLng: hasValidCoords ? latestLocation.longitude : null,
        locationTimestamp: hasValidCoords ? latestLocation.timestamp : null,
        destinationArrivalTime: trip.destinationArrivalTime,
        outboundDepartureTime: trip.outboundDepartureTime || trip.startTime
      })

      tripLocations.push({
        tripId: trip._id,
        busId: trip.busId?._id,
        busNumber: trip.busId?.number || 'Unknown',
        driverName: trip.driverId?.name || 'Driver',
        phase,
        latitude: hasValidCoords ? latestLocation.latitude : null,
        longitude: hasValidCoords ? latestLocation.longitude : null,
        timestamp: hasValidCoords ? latestLocation.timestamp : null,
        hasLocation: Boolean(hasValidCoords),
        sangliReturnEta: journeyEtas.sangliReturnEta,
        outwardDestinationEta: journeyEtas.outwardDestinationEta,
        remainingStopMinutes: journeyEtas.remainingStopMinutes,
        eta: {
          etaAvailable: journeyEtas.etaAvailable,
          etaMinutes: journeyEtas.sangliReturnEta?.etaMinutes,
          arrivalClockTime: journeyEtas.sangliReturnEta?.arrivalClockTime,
          sangliReturnEta: journeyEtas.sangliReturnEta,
          outwardDestinationEta: journeyEtas.outwardDestinationEta,
          phase,
          destinationStand: phase === 'RETURNING' ? routeConfig.returnDestination.name : routeConfig.destination.name
        }
      })
    }
    
    res.json(tripLocations)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active locations', error: error.message })
  }
}

/**
 * Dedicated Track Bus telemetry endpoint
 * Returns all active trips for the selected route, current journey phase,
 * latest GPS coordinates, dynamic waypoints based on phase, and Sangli Return ETA.
 */
export const getTrackBusData = async (req, res) => {
  const { routeId } = req.params
  try {
    const routeConfig = ROUTES_CONFIG[routeId]
    if (!routeConfig) {
      return res.status(404).json({
        message: `Route '${routeId}' not found in configuration.`
      })
    }

    const activeTrips = await Trip.find({ routeId, status: 'active' }).populate('busId driverId')
    const buses = []

    for (const trip of activeTrips) {
      const latestLocation = await Location.findOne({ tripId: trip._id }).sort({ timestamp: -1 })
      const hasValidCoords =
        latestLocation &&
        latestLocation.latitude != null &&
        latestLocation.longitude != null &&
        !isNaN(latestLocation.latitude) &&
        !isNaN(latestLocation.longitude)

      const phase = trip.phase || 'OUTBOUND'

      const journeyEtas = calculateJourneyEtas({
        routeId,
        phase,
        currentLat: hasValidCoords ? latestLocation.latitude : null,
        currentLng: hasValidCoords ? latestLocation.longitude : null,
        locationTimestamp: hasValidCoords ? latestLocation.timestamp : null,
        destinationArrivalTime: trip.destinationArrivalTime,
        outboundDepartureTime: trip.outboundDepartureTime || trip.startTime
      })

      const targetDestinationStand = phase === 'RETURNING'
        ? routeConfig.returnDestination.name
        : routeConfig.destination.name

      buses.push({
        tripId: trip._id,
        busId: trip.busId?._id,
        busNumber: trip.busId?.number || 'Unknown Bus',
        driverName: trip.driverId?.name || 'Assigned Driver',
        driverPhone: trip.driverId?.phone || '',
        startTime: trip.startTime,
        outboundDepartureTime: trip.outboundDepartureTime || trip.startTime,
        destinationArrivalTime: trip.destinationArrivalTime,
        expectedReturnDepartureTime: trip.expectedReturnDepartureTime,
        returnDepartureTime: trip.returnDepartureTime,
        phase,
        targetDestinationStand,
        hasLocation: Boolean(hasValidCoords),
        latitude: hasValidCoords ? latestLocation.latitude : null,
        longitude: hasValidCoords ? latestLocation.longitude : null,
        lastUpdated: hasValidCoords ? latestLocation.timestamp : null,
        sangliReturnEta: journeyEtas.sangliReturnEta,
        outwardDestinationEta: journeyEtas.outwardDestinationEta,
        remainingStopMinutes: journeyEtas.remainingStopMinutes,
        eta: {
          etaAvailable: journeyEtas.etaAvailable,
          etaMinutes: journeyEtas.sangliReturnEta?.etaMinutes,
          arrivalClockTime: journeyEtas.sangliReturnEta?.arrivalClockTime,
          sangliReturnEta: journeyEtas.sangliReturnEta,
          outwardDestinationEta: journeyEtas.outwardDestinationEta,
          phase,
          destinationStand: targetDestinationStand
        }
      })
    }

    res.json({
      route: {
        id: routeConfig.id,
        code: routeConfig.code,
        name: routeConfig.name,
        origin: routeConfig.origin,
        destination: routeConfig.destination,
        returnDestination: routeConfig.returnDestination,
        waypoints: routeConfig.waypoints,
        returnWaypoints: routeConfig.returnWaypoints,
        totalDistanceKm: routeConfig.totalDistanceKm,
        returnDistanceKm: routeConfig.returnDistanceKm,
        stopDurationMinutes: routeConfig.stopDurationMinutes || 15,
        averageSpeedKmh: 45
      },
      buses,
      activeCount: buses.length
    })
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch tracking data',
      error: error.message
    })
  }
}
