import Driver from '../models/Driver.js'
import Attendance from '../models/Attendance.js'

export const getDriversByRoute = async (req, res) => {
  const { routeId } = req.params
  const drivers = await Driver.find({ routeId }).sort('name')
  res.json(drivers)
}

export const getAvailableDriversByRoute = async (req, res) => {
  const { routeId } = req.params
  const drivers = await Driver.find({
    routeId,
    status: 'free',
    attendanceStatus: 'present'
  }).sort('name')
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

export const recordAttendance = async (req, res) => {
  const { routeId, driverId } = req.body
  if (!routeId || !driverId) {
    return res.status(400).json({ message: 'routeId and driverId are required' })
  }

  const driver = await Driver.findById(driverId)
  if (!driver) {
    return res.status(404).json({ message: 'Driver not found' })
  }

  driver.attendanceStatus = 'present'
  await driver.save()

  const date = new Date().toISOString().split('T')[0]
  await Attendance.create({ driverId, routeId, date, status: 'present' })

  res.json({ message: 'Attendance recorded', driver })
}

export const checkOutDriver = async (req, res) => {
  const { driverId } = req.body
  if (!driverId) {
    return res.status(400).json({ message: 'driverId is required' })
  }

  const driver = await Driver.findById(driverId)
  if (!driver) {
    return res.status(404).json({ message: 'Driver not found' })
  }

  driver.attendanceStatus = 'absent'
  await driver.save()

  res.json({ message: 'Driver checked out successfully', driver })
}
