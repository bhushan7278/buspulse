import Trip from '../models/Trip.js'
import Driver from '../models/Driver.js'
import Bus from '../models/Bus.js'
import { FRONTEND_URL } from '../utils/network.js'

export const getTripById = async (req, res) => {
  const trip = await Trip.findById(req.params.id)
    .populate('driverId busId')
    .lean()

  if (!trip) {
    return res.status(404).json({ message: 'Trip not found' })
  }

  res.json(trip)
}

export const startTrip = async (req, res) => {
  const { routeId, driverId, busId } = req.body
  if (!routeId || !driverId || !busId) {
    return res.status(400).json({ message: 'routeId, driverId, and busId are required' })
  }

  const driver = await Driver.findById(driverId)
  const bus = await Bus.findById(busId)

  if (!driver || !bus) {
    return res.status(404).json({ message: 'Driver or bus not found' })
  }

  if (driver.routeId !== routeId || bus.routeId !== routeId) {
    return res.status(400).json({ message: 'Driver and bus must belong to the selected route' })
  }

  if (driver.status !== 'free' || driver.attendanceStatus !== 'present') {
    return res.status(400).json({ message: 'Driver must be present and free' })
  }

  if (bus.status !== 'free') {
    return res.status(400).json({ message: 'Bus must be free' })
  }

  const trip = await Trip.create({ routeId, driverId, busId })

  driver.status = 'busy'
  await driver.save()

  bus.status = 'busy'
  await bus.save()

  const trackingUrl = `${FRONTEND_URL}/track?tripId=${trip._id}`
  console.log(`SMS to ${driver.phone}: ${trackingUrl}`)

  res.json({
    message: 'Trip started',
    tripId: trip._id,
    trackingUrl,
    driver,
    bus
  })
}

export const endTrip = async (req, res) => {
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

  const driver = await Driver.findById(trip.driverId)
  const bus = await Bus.findById(trip.busId)

  trip.status = 'completed'
  trip.endTime = new Date()
  await trip.save()

  if (driver) {
    driver.status = 'free'
    await driver.save()
  }

  if (bus) {
    bus.status = 'free'
    await bus.save()
  }

  res.json({ message: 'Trip ended', trip })
}

export const freeResources = async (req, res) => {
  const { routeId, driverId, busId } = req.body
  if (!routeId || !driverId || !busId) {
    return res.status(400).json({ message: 'routeId, driverId, and busId are required' })
  }

  const driver = await Driver.findById(driverId)
  const bus = await Bus.findById(busId)

  if (!driver || !bus) {
    return res.status(404).json({ message: 'Driver or bus not found' })
  }

  if (driver.routeId !== routeId || bus.routeId !== routeId) {
    return res.status(400).json({ message: 'Driver and bus must belong to the selected route' })
  }

  driver.status = 'free'
  await driver.save()

  bus.status = 'free'
  await bus.save()

  res.json({ message: 'Driver and bus marked as free', driver, bus })
}
