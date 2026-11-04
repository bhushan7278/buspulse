import Driver from '../models/Driver.js'
import Bus from '../models/Bus.js'
import Trip from '../models/Trip.js'
import { SANGLI_ALLOWED_ROUTES } from './routeConfig.js'

export const routes = SANGLI_ALLOWED_ROUTES.map(r => ({
  id: r.id,
  code: r.code,
  name: r.name,
  label: r.name,
  origin: r.origin,
  destination: r.destination,
  returnDestination: r.returnDestination,
  waypoints: r.waypoints,
  returnWaypoints: r.returnWaypoints,
  totalDistanceKm: r.totalDistanceKm,
  returnDistanceKm: r.returnDistanceKm
}))

export const buildSeedData = async () => {
  // Safe backward-compatible migration for existing trips:
  // Ensure every trip has a valid journey phase
  try {
    await Trip.updateMany(
      { status: 'completed', phase: { $exists: false } },
      { $set: { phase: 'COMPLETED' } }
    )
    await Trip.updateMany(
      { status: 'active', phase: { $exists: false } },
      { $set: { phase: 'OUTBOUND' } }
    )
  } catch (err) {
    console.error('Safe trip migration notice:', err.message)
  }

  // Safe reconciliation on startup:
  // Reconcile any drivers or buses marked 'busy' if they do not have an active trip assignment
  try {
    const activeTrips = await Trip.find({ status: 'active' }).lean()
    const activeDriverIds = activeTrips.map(t => t.driverId?.toString()).filter(Boolean)
    const activeBusIds = activeTrips.map(t => t.busId?.toString()).filter(Boolean)

    const orphanedDrivers = await Driver.find({
      status: 'busy',
      _id: { $nin: activeDriverIds }
    })
    if (orphanedDrivers.length > 0) {
      await Driver.updateMany(
        { _id: { $in: orphanedDrivers.map(d => d._id) } },
        { status: 'free' }
      )
      console.log(`Reconciled ${orphanedDrivers.length} orphaned busy driver(s) to free on startup.`)
    }

    const orphanedBuses = await Bus.find({
      status: 'busy',
      _id: { $nin: activeBusIds },
      isDeleted: { $ne: true }
    })
    if (orphanedBuses.length > 0) {
      await Bus.updateMany(
        { _id: { $in: orphanedBuses.map(b => b._id) } },
        { status: 'free' }
      )
      console.log(`Reconciled ${orphanedBuses.length} orphaned busy bus(es) to free on startup.`)
    }
  } catch (reconcileErr) {
    console.error('Startup reconciliation notice:', reconcileErr.message)
  }

  const driverCount = await Driver.countDocuments()
  const busCount = await Bus.countDocuments()

  if (driverCount === 0) {
    await Driver.create([
      { name: 'Prasad Bharmal', phone: '+918237917634', routeId: 'R1' },
      { name: 'Vishal Asabe', phone: '+918767059963', routeId: 'R1' },
      { name: 'Pranav Yadav', phone: '+919284572736', routeId: 'R1' },
      { name: 'Pranav Chougule', phone: '+917796487321', routeId: 'R1' },
      { name: 'Sai Kothwal', phone: '+919325897517', routeId: 'R2' },
      { name: 'Pranav Kamble', phone: '+917498302067', routeId: 'R2' },
      { name: 'Vivek Gudalkar', phone: '+918624862135', routeId: 'R2' },
      { name: 'Harshad Gurav', phone: '+919373166257', routeId: 'R3' },
      { name: 'Vedant Telsinge', phone: '+918177843484', routeId: 'R3' },
      { name: 'Devraj Vagare', phone: '+917498074387', routeId: 'R3' }
    ])
  }

  if (busCount === 0) {
    await Bus.create([
      { number: 'BUS-101', routeId: 'R1' },
      { number: 'BUS-102', routeId: 'R1' },
      { number: 'BUS-201', routeId: 'R2' },
      { number: 'BUS-301', routeId: 'R3' }
    ])
  }
}
