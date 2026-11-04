/**
 * Sangli MSRTC Depot Route Configuration & Journey Lifecycle ETA Engine (Frontend)
 * Synchronized with BusPulse backend.
 * 
 * Rules:
 * - Depot: Sangli Depot only.
 * - Outward routes:
 *   1. Sangli → Kolhapur (R1)
 *   2. Sangli → Tasgaon (R2)
 *   3. Sangli → Miraj (R3)
 * - Planned destination stop: 15 minutes.
 * - Primary Sangli Return ETA:
 *   - During OUTBOUND: Current Time + Remaining Outward + Remaining Stop (15m) + Return Travel Time
 *   - During DESTINATION_STOP: Current Time + Remaining Stop (15m - elapsed) + Return Travel Time
 *   - During RETURNING: Current Time + Remaining Return Travel Time
 * - Speed fallback: 45 km/h.
 */

export const AVERAGE_SPEED_KMH = 45
export const DEFAULT_STOP_DURATION_MINUTES = 15

export const ROUTES_CONFIG = {
  R1: {
    id: 'R1',
    code: 'SAN_KOP',
    name: 'Sangli → Kolhapur',
    label: 'Sangli → Kolhapur',
    origin: {
      name: 'Sangli Central Bus Stand',
      depot: 'Sangli Depot',
      latitude: 16.8524,
      longitude: 74.5815
    },
    destination: {
      name: 'Kolhapur Central Bus Stand (CBS)',
      latitude: 16.6961,
      longitude: 74.2435
    },
    returnDestination: {
      name: 'Sangli Central Bus Stand',
      depot: 'Sangli Depot',
      latitude: 16.8524,
      longitude: 74.5815
    },
    waypoints: [
      { name: 'Sangli CBS', lat: 16.8524, lng: 74.5815 },
      { name: 'Jaysingpur', lat: 16.7905, lng: 74.5570 },
      { name: 'Hatkanangle', lat: 16.7435, lng: 74.4445 },
      { name: 'Shiroli Naka', lat: 16.7410, lng: 74.2790 },
      { name: 'Kolhapur CBS', lat: 16.6961, lng: 74.2435 }
    ],
    returnWaypoints: [
      { name: 'Kolhapur CBS', lat: 16.6961, lng: 74.2435 },
      { name: 'Shiroli Naka', lat: 16.7410, lng: 74.2790 },
      { name: 'Hatkanangle', lat: 16.7435, lng: 74.4445 },
      { name: 'Jaysingpur', lat: 16.7905, lng: 74.5570 },
      { name: 'Sangli CBS', lat: 16.8524, lng: 74.5815 }
    ],
    totalDistanceKm: 48.0,
    returnDistanceKm: 48.0,
    stopDurationMinutes: 15
  },
  R2: {
    id: 'R2',
    code: 'SAN_TAS',
    name: 'Sangli → Tasgaon',
    label: 'Sangli → Tasgaon',
    origin: {
      name: 'Sangli Central Bus Stand',
      depot: 'Sangli Depot',
      latitude: 16.8524,
      longitude: 74.5815
    },
    destination: {
      name: 'Tasgaon Central Bus Stand',
      latitude: 17.0345,
      longitude: 74.6015
    },
    returnDestination: {
      name: 'Sangli Central Bus Stand',
      depot: 'Sangli Depot',
      latitude: 16.8524,
      longitude: 74.5815
    },
    waypoints: [
      { name: 'Sangli CBS', lat: 16.8524, lng: 74.5815 },
      { name: 'Madhavnagar', lat: 16.8830, lng: 74.6050 },
      { name: 'Budhgaon', lat: 16.9120, lng: 74.6300 },
      { name: 'Kavathe Mahankal Phata', lat: 16.9600, lng: 74.6700 },
      { name: 'Tasgaon CBS', lat: 17.0345, lng: 74.6015 }
    ],
    returnWaypoints: [
      { name: 'Tasgaon CBS', lat: 17.0345, lng: 74.6015 },
      { name: 'Kavathe Mahankal Phata', lat: 16.9600, lng: 74.6700 },
      { name: 'Budhgaon', lat: 16.9120, lng: 74.6300 },
      { name: 'Madhavnagar', lat: 16.8830, lng: 74.6050 },
      { name: 'Sangli CBS', lat: 16.8524, lng: 74.5815 }
    ],
    totalDistanceKm: 24.0,
    returnDistanceKm: 24.0,
    stopDurationMinutes: 15
  },
  R3: {
    id: 'R3',
    code: 'SAN_MIR',
    name: 'Sangli → Miraj',
    label: 'Sangli → Miraj',
    origin: {
      name: 'Sangli Central Bus Stand',
      depot: 'Sangli Depot',
      latitude: 16.8524,
      longitude: 74.5815
    },
    destination: {
      name: 'Miraj Bus Stand',
      latitude: 16.8220,
      longitude: 74.6435
    },
    returnDestination: {
      name: 'Sangli Central Bus Stand',
      depot: 'Sangli Depot',
      latitude: 16.8524,
      longitude: 74.5815
    },
    waypoints: [
      { name: 'Sangli CBS', lat: 16.8524, lng: 74.5815 },
      { name: 'Vishrambag', lat: 16.8450, lng: 74.6050 },
      { name: 'Wanless Hospital', lat: 16.8320, lng: 74.6280 },
      { name: 'Miraj Mission Hospital', lat: 16.8280, lng: 74.6380 },
      { name: 'Miraj Bus Stand', lat: 16.8220, lng: 74.6435 }
    ],
    returnWaypoints: [
      { name: 'Miraj Bus Stand', lat: 16.8220, lng: 74.6435 },
      { name: 'Miraj Mission Hospital', lat: 16.8280, lng: 74.6380 },
      { name: 'Wanless Hospital', lat: 16.8320, lng: 74.6280 },
      { name: 'Vishrambag', lat: 16.8450, lng: 74.6050 },
      { name: 'Sangli CBS', lat: 16.8524, lng: 74.5815 }
    ],
    totalDistanceKm: 10.0,
    returnDistanceKm: 10.0,
    stopDurationMinutes: 15
  }
}

// Aliases for consistent resolution across code and database
ROUTES_CONFIG.SAN_KOP = ROUTES_CONFIG.R1
ROUTES_CONFIG.SAN_TAS = ROUTES_CONFIG.R2
ROUTES_CONFIG.SAN_MIR = ROUTES_CONFIG.R3

/**
 * Exactly the 3 allowed outward routes originating from Sangli Depot
 */
export const SANGLI_ALLOWED_ROUTES = [
  ROUTES_CONFIG.R1,
  ROUTES_CONFIG.R2,
  ROUTES_CONFIG.R3
]

export function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return null
  }
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function calculateRemainingDistanceKm(routeId, currentLat, currentLng, phase = 'OUTBOUND') {
  const route = ROUTES_CONFIG[routeId]
  if (!route || currentLat == null || currentLng == null) {
    return null
  }

  const isReturning = phase === 'RETURNING'
  const waypoints = isReturning ? (route.returnWaypoints || route.waypoints) : route.waypoints
  const destination = isReturning ? route.returnDestination : route.destination

  if (!waypoints || waypoints.length === 0) {
    const directKm = calculateHaversineDistanceKm(
      currentLat,
      currentLng,
      destination.latitude,
      destination.longitude
    )
    return directKm != null ? Math.round(directKm * 1.2 * 10) / 10 : null
  }

  let closestIndex = 0
  let minDistance = Infinity

  for (let i = 0; i < waypoints.length; i++) {
    const dist = calculateHaversineDistanceKm(
      currentLat,
      currentLng,
      waypoints[i].lat,
      waypoints[i].lng
    )
    if (dist < minDistance) {
      minDistance = dist
      closestIndex = i
    }
  }

  if (closestIndex === waypoints.length - 1) {
    const finalDist = calculateHaversineDistanceKm(
      currentLat,
      currentLng,
      destination.latitude,
      destination.longitude
    )
    return Math.max(0, Math.round(finalDist * 1.15 * 10) / 10)
  }

  let upcomingIndex = closestIndex
  const distToNext = closestIndex < waypoints.length - 1
    ? calculateHaversineDistanceKm(currentLat, currentLng, waypoints[closestIndex + 1].lat, waypoints[closestIndex + 1].lng)
    : minDistance

  const waypointSegmentDist = closestIndex < waypoints.length - 1
    ? calculateHaversineDistanceKm(waypoints[closestIndex].lat, waypoints[closestIndex].lng, waypoints[closestIndex + 1].lat, waypoints[closestIndex + 1].lng)
    : 0

  if (closestIndex < waypoints.length - 1 && distToNext < waypointSegmentDist) {
    upcomingIndex = closestIndex + 1
  }

  let remainingKm = calculateHaversineDistanceKm(
    currentLat,
    currentLng,
    waypoints[upcomingIndex].lat,
    waypoints[upcomingIndex].lng
  )

  for (let i = upcomingIndex; i < waypoints.length - 1; i++) {
    remainingKm += calculateHaversineDistanceKm(
      waypoints[i].lat,
      waypoints[i].lng,
      waypoints[i + 1].lat,
      waypoints[i + 1].lng
    )
  }

  const estimatedRoadKm = Math.round(remainingKm * 1.18 * 10) / 10
  return Math.max(0.5, estimatedRoadKm)
}

export function calculateEtaMinutes(remainingDistanceKm, speedKmh = AVERAGE_SPEED_KMH) {
  if (remainingDistanceKm == null || isNaN(remainingDistanceKm) || remainingDistanceKm < 0) {
    return null
  }
  const minutes = (remainingDistanceKm / speedKmh) * 60
  return Math.round(minutes)
}

export function calculateArrivalClockTime(minutesFromNow) {
  if (minutesFromNow == null || isNaN(minutesFromNow)) return null
  const arrivalDate = new Date(Date.now() + minutesFromNow * 60 * 1000)
  return arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function calculateJourneyEtas({
  routeId,
  phase = 'OUTBOUND',
  currentLat,
  currentLng,
  locationTimestamp = null,
  destinationArrivalTime = null
}) {
  const route = ROUTES_CONFIG[routeId]
  if (!route) {
    return {
      etaAvailable: false,
      reason: `Route '${routeId}' is not configured in Sangli Depot route definitions.`,
      sangliReturnEta: { etaAvailable: false, etaMinutes: null, arrivalClockTime: null, display: 'ETA unavailable' },
      outwardDestinationEta: { etaAvailable: false, etaMinutes: null, arrivalClockTime: null }
    }
  }

  const hasGps = currentLat != null && currentLng != null && !isNaN(currentLat) && !isNaN(currentLng)

  let isStale = false
  if (locationTimestamp) {
    const ageMinutes = (Date.now() - new Date(locationTimestamp).getTime()) / 60000
    if (ageMinutes > 20) {
      isStale = true
    }
  }

  if (phase === 'COMPLETED') {
    return {
      etaAvailable: false,
      isCompleted: true,
      phase: 'COMPLETED',
      sangliReturnEta: { etaAvailable: false, etaMinutes: 0, arrivalClockTime: 'Completed', display: 'Completed' },
      outwardDestinationEta: { etaAvailable: false, etaMinutes: 0, arrivalClockTime: 'Completed' },
      remainingStopMinutes: 0,
      totalStopMinutes: 15
    }
  }

  if (!hasGps && phase !== 'DESTINATION_STOP') {
    return {
      etaAvailable: false,
      hasLocation: false,
      isStale,
      phase,
      reason: 'GPS telemetry unavailable for this journey',
      sangliReturnEta: {
        etaAvailable: false,
        etaMinutes: null,
        arrivalClockTime: null,
        display: 'ETA unavailable',
        reason: 'GPS telemetry unavailable'
      },
      outwardDestinationEta: {
        etaAvailable: false,
        etaMinutes: null,
        arrivalClockTime: null,
        destinationStand: route.destination.name
      },
      remainingStopMinutes: phase === 'OUTBOUND' ? 15 : 0,
      totalStopMinutes: 15
    }
  }

  let remOutwardMinutes = 0
  let remOutwardDistanceKm = 0
  if (phase === 'OUTBOUND') {
    remOutwardDistanceKm = calculateRemainingDistanceKm(routeId, currentLat, currentLng, 'OUTBOUND') || 0
    remOutwardMinutes = calculateEtaMinutes(remOutwardDistanceKm, AVERAGE_SPEED_KMH) || 0
  }

  let remStopMinutes = 0
  if (phase === 'OUTBOUND') {
    remStopMinutes = route.stopDurationMinutes || DEFAULT_STOP_DURATION_MINUTES
  } else if (phase === 'DESTINATION_STOP') {
    const arrTime = destinationArrivalTime ? new Date(destinationArrivalTime).getTime() : Date.now()
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - arrTime) / 60000))
    remStopMinutes = Math.max(0, (route.stopDurationMinutes || DEFAULT_STOP_DURATION_MINUTES) - elapsedMinutes)
  } else {
    remStopMinutes = 0
  }

  let remReturnMinutes = 0
  let remReturnDistanceKm = 0
  if (phase === 'OUTBOUND' || phase === 'DESTINATION_STOP') {
    remReturnDistanceKm = route.returnDistanceKm || route.totalDistanceKm
    remReturnMinutes = calculateEtaMinutes(remReturnDistanceKm, AVERAGE_SPEED_KMH) || 0
  } else if (phase === 'RETURNING') {
    remReturnDistanceKm = calculateRemainingDistanceKm(routeId, currentLat, currentLng, 'RETURNING') || 0
    remReturnMinutes = calculateEtaMinutes(remReturnDistanceKm, AVERAGE_SPEED_KMH) || 0
  }

  const totalSangliReturnMinutes = remOutwardMinutes + remStopMinutes + remReturnMinutes
  const sangliArrivalClockTime = calculateArrivalClockTime(totalSangliReturnMinutes)

  let outwardEtaMinutes = null
  let outwardArrivalClockTime = null
  if (phase === 'OUTBOUND') {
    outwardEtaMinutes = remOutwardMinutes
    outwardArrivalClockTime = calculateArrivalClockTime(outwardEtaMinutes)
  }

  return {
    etaAvailable: true,
    hasLocation: hasGps,
    isStale,
    phase,
    routeId,
    routeName: route.name,
    targetDestinationName: phase === 'RETURNING' ? route.returnDestination.name : route.destination.name,
    sangliReturnEta: {
      etaAvailable: true,
      etaMinutes: totalSangliReturnMinutes,
      arrivalClockTime: sangliArrivalClockTime,
      remainingMinutes: totalSangliReturnMinutes,
      isEstimated: isStale || phase === 'OUTBOUND' || phase === 'DESTINATION_STOP',
      display: sangliArrivalClockTime
    },
    outwardDestinationEta: {
      etaAvailable: phase === 'OUTBOUND',
      etaMinutes: outwardEtaMinutes,
      arrivalClockTime: outwardArrivalClockTime,
      destinationStand: route.destination.name
    },
    breakdown: {
      remOutwardMinutes,
      remOutwardDistanceKm,
      remStopMinutes,
      remReturnMinutes,
      remReturnDistanceKm
    },
    remainingStopMinutes: remStopMinutes,
    totalStopMinutes: route.stopDurationMinutes || DEFAULT_STOP_DURATION_MINUTES,
    averageSpeedKmh: AVERAGE_SPEED_KMH
  }
}

export function getBusEtaDetails(routeId, currentLat, currentLng, options = {}) {
  const result = calculateJourneyEtas({
    routeId,
    phase: options.phase || 'OUTBOUND',
    currentLat,
    currentLng,
    locationTimestamp: options.timestamp || options.locationTimestamp,
    destinationArrivalTime: options.destinationArrivalTime,
    outboundDepartureTime: options.outboundDepartureTime
  })

  if (!result.etaAvailable) {
    return {
      etaAvailable: false,
      reason: result.reason || 'GPS telemetry unavailable for this bus.',
      sangliReturnEta: result.sangliReturnEta,
      outwardDestinationEta: result.outwardDestinationEta
    }
  }

  return {
    etaAvailable: true,
    routeId: result.routeId,
    routeName: result.routeName,
    destinationStand: result.targetDestinationName,
    etaMinutes: result.sangliReturnEta.etaMinutes,
    arrivalClockTime: result.sangliReturnEta.arrivalClockTime,
    sangliReturnEta: result.sangliReturnEta,
    outwardDestinationEta: result.outwardDestinationEta,
    remainingDistanceKm: result.phase === 'RETURNING'
      ? result.breakdown.remReturnDistanceKm
      : result.breakdown.remOutwardDistanceKm,
    phase: result.phase,
    isStale: result.isStale,
    remainingStopMinutes: result.remainingStopMinutes,
    averageSpeedKmh: AVERAGE_SPEED_KMH
  }
}
