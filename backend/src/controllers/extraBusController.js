import Driver from '../models/Driver.js'
import Bus from '../models/Bus.js'
import Trip from '../models/Trip.js'
import Location from '../models/Location.js'
import {
  ROUTES_CONFIG,
  calculateJourneyEtas
} from '../utils/routeConfig.js'
import { exec } from 'child_process'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import util from 'util'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const execPromise = util.promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))

export const evaluateExtraBus = async (req, res) => {
  const { routeId, manual_count } = req.body

  if (!routeId) {
    return res.status(400).json({ message: 'routeId is required' })
  }

  const routeConfig = ROUTES_CONFIG[routeId]
  if (!routeConfig) {
    return res.status(400).json({ message: `Invalid route ID: ${routeId}. Must be a valid Sangli outward route.` })
  }

  // 1. Determine Passenger Count: Manual count OR YOLOv8 from 4 images
  let passengerCount = null
  let countSource = 'yolo'

  if (manual_count !== undefined && manual_count !== null && manual_count !== '') {
    const parsedManual = Number(manual_count)
    if (!Number.isInteger(parsedManual) || parsedManual < 0) {
      return res.status(400).json({
        message: 'manual_count must be a valid non-negative integer'
      })
    }
    passengerCount = parsedManual
    countSource = 'manual'
  } else {
    // Requires exactly 4 images for YOLO
    if (!req.files || req.files.length !== 4) {
      return res.status(400).json({
        message: 'Exactly 4 camera images are required when manual count is not provided'
      })
    }

    const tempDir = path.join(os.tmpdir(), `yolo-${uuidv4()}`)
    const imagePaths = []

    try {
      await fs.mkdir(tempDir, { recursive: true })

      for (let i = 0; i < req.files.length; i++) {
        const ext = path.extname(req.files[i].originalname) || '.jpg'
        const tempPath = path.join(tempDir, `img${i + 1}${ext}`)
        await fs.writeFile(tempPath, req.files[i].buffer)
        imagePaths.push(tempPath)
      }

      const yoloScriptPath = path.join(__dirname, '..', '..', 'ml', 'yolo_stub.py')
      const command = `python "${yoloScriptPath}" ${imagePaths.map(p => `"${p}"`).join(' ')}`
      const { stdout } = await execPromise(command)

      if (stdout && !isNaN(parseInt(stdout.trim(), 10))) {
        passengerCount = parseInt(stdout.trim(), 10)
      } else {
        return res.status(422).json({
          message: 'YOLO passenger detection failed to produce a valid count. Please supply a manual count or retry.',
          inferenceError: true
        })
      }
    } catch (err) {
      console.error('YOLO inference failed:', err)
      return res.status(422).json({
        message: 'YOLO model inference failed: ' + (err.message || 'Detection script execution error'),
        inferenceError: true
      })
    } finally {
      try {
        for (const imgPath of imagePaths) {
          await fs.unlink(imgPath).catch(() => {})
        }
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
      } catch (cleanupErr) {
        console.error('Temp cleanup failed:', cleanupErr)
      }
    }
  }

  try {
    // 2. Fetch Available Depot Resources
    // Drivers assigned to route (or all free present drivers in depot pool)
    const freeDrivers = await Driver.find({
      $or: [{ routeId }, { routeId: { $exists: false } }, { routeId: null }],
      status: 'free',
      attendanceStatus: 'present'
    })

    // Global bus availability across Sangli Depot fleet
    const freeBuses = await Bus.find({
      status: 'free',
      isDeleted: { $ne: true },
      isActive: { $ne: false }
    })

    const driverAvailable = freeDrivers.length > 0
    const busAvailable = freeBuses.length > 0

    // 3. Determine Relevant Bus Outward Destination ETA
    // Section 11: Keep outward-destination ETA separate from Sangli return ETA.
    // For a new outward dispatch from Sangli, evaluate passenger demand and relevant bus arrival
    // in the context of that outward route.
    const activeTrips = await Trip.find({ routeId, status: 'active' }).populate('busId driverId')
    const activeBusesTelemetry = []

    for (const trip of activeTrips) {
      const latestLoc = await Location.findOne({ tripId: trip._id }).sort({ timestamp: -1 })
      const hasValidCoords = latestLoc && latestLoc.latitude != null && latestLoc.longitude != null
      const phase = trip.phase || 'OUTBOUND'

      const journeyEtas = calculateJourneyEtas({
        routeId,
        phase,
        currentLat: hasValidCoords ? latestLoc.latitude : null,
        currentLng: hasValidCoords ? latestLoc.longitude : null,
        locationTimestamp: hasValidCoords ? latestLoc.timestamp : null,
        destinationArrivalTime: trip.destinationArrivalTime,
        outboundDepartureTime: trip.outboundDepartureTime || trip.startTime
      })

      // Outward destination ETA is relevant when bus is in OUTBOUND phase
      const outwardEta = journeyEtas.outwardDestinationEta

      activeBusesTelemetry.push({
        tripId: trip._id,
        busNumber: trip.busId?.number || 'Unknown Bus',
        driverName: trip.driverId?.name || 'Driver',
        phase,
        latitude: hasValidCoords ? latestLoc.latitude : null,
        longitude: hasValidCoords ? latestLoc.longitude : null,
        etaAvailable: hasValidCoords && outwardEta.etaAvailable,
        etaMinutes: outwardEta.etaMinutes,
        arrivalClockTime: outwardEta.arrivalClockTime,
        remainingDistanceKm: journeyEtas.breakdown?.remOutwardDistanceKm,
        sangliReturnEtaMinutes: journeyEtas.sangliReturnEta?.etaMinutes,
        sangliArrivalClockTime: journeyEtas.sangliReturnEta?.arrivalClockTime
      })
    }

    let etaAvailable = false
    let etaMinutes = null
    let arrivalClockTime = null
    let destinationStand = routeConfig.destination.name
    let remainingDistanceKm = null
    let relevantBusNumber = null
    let etaReason = ''

    // Outbound buses with valid GPS
    const validOutboundBuses = activeBusesTelemetry.filter(b => b.etaAvailable && b.etaMinutes != null)

    if (activeTrips.length === 0) {
      etaAvailable = false
      etaReason = 'No active buses currently operating on this outward route.'
    } else if (validOutboundBuses.length === 0) {
      etaAvailable = false
      etaReason = 'Active buses are assigned to this route, but valid GPS coordinates are unavailable or bus has passed outward leg.'
    } else {
      // Sort by outward ETA ascending: pick next arriving bus at destination
      validOutboundBuses.sort((a, b) => a.etaMinutes - b.etaMinutes)
      const primaryBus = validOutboundBuses[0]

      etaAvailable = true
      etaMinutes = primaryBus.etaMinutes
      arrivalClockTime = primaryBus.arrivalClockTime
      remainingDistanceKm = primaryBus.remainingDistanceKm
      relevantBusNumber = primaryBus.busNumber
      etaReason = `Evaluated using next arriving outward bus (${primaryBus.busNumber}) with ${primaryBus.remainingDistanceKm} km remaining to ${destinationStand}.`
    }

    // 4. Decision Rule:
    // passengerCount >= 40 && etaMinutes > 25 && driverAvailable && busAvailable
    // Exactly 25 minutes does NOT satisfy the rule.
    const passengerThresholdMet = passengerCount >= 40
    const etaThresholdMet = etaAvailable && etaMinutes > 25
    const isApproved = passengerThresholdMet && etaThresholdMet && driverAvailable && busAvailable

    const allocationStatus = isApproved ? 'Extra Bus Approved' : 'Not Allocated'

    let recommendationReason = ''
    if (isApproved) {
      recommendationReason = `Deployment Approved: High passenger volume (${passengerCount} >= 40), next bus ETA to ${destinationStand} exceeds threshold (${etaMinutes} min > 25 min), and both driver & bus are ready at Sangli Depot.`
    } else {
      const reasons = []
      if (!passengerThresholdMet) {
        reasons.push(`Passenger count (${passengerCount}) is below the required 40 threshold`)
      }
      if (!etaAvailable) {
        reasons.push(`Arrival time (ETA) is unavailable (${etaReason})`)
      } else if (!etaThresholdMet) {
        reasons.push(`Next bus arrival time (${etaMinutes} min) is within the acceptable 25-minute limit`)
      }
      if (!driverAvailable) {
        reasons.push('No present, free driver is available for assignment')
      }
      if (!busAvailable) {
        reasons.push('No globally free bus is available in Sangli Depot fleet')
      }
      recommendationReason = `Deployment Not Recommended: ${reasons.join('; ')}.`
    }

    res.json({
      routeId,
      routeName: routeConfig.name,
      destinationStand,
      countSource,
      passengerCount,
      passengerThresholdMet,
      etaAvailable,
      etaMinutes,
      arrivalClockTime,
      remainingDistanceKm,
      relevantBusNumber,
      etaThresholdMet,
      driverAvailable,
      availableDriversCount: freeDrivers.length,
      busAvailable,
      availableBusesCount: freeBuses.length,
      isApproved,
      allocationStatus,
      recommendationReason,
      conditionsChecklist: {
        passengerCountMet: passengerThresholdMet,
        etaExceedsThreshold: etaThresholdMet,
        driverAvailable,
        busAvailable
      },
      allActiveBuses: activeBusesTelemetry
    })
  } catch (error) {
    res.status(500).json({ message: 'Error evaluating extra bus allocation', error: error.message })
  }
}
