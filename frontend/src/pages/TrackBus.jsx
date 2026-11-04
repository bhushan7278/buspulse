import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Bus, MapPin, Navigation, Clock, AlertTriangle, RefreshCw, ChevronRight, Activity, Radio, PauseCircle, RotateCcw } from 'lucide-react'
import api from '../api'
import { routes } from '../routes'
import { ROUTES_CONFIG } from '../utils/routeConfig'

// Fix Leaflet default icon URLs in Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
})

// Custom Bus Icon (Flame Coral with Shell Border)
const busIcon = new L.DivIcon({
  className: 'custom-bus-leaflet-icon',
  html: `
    <div style="background-color: #F35E3E; border: 2px solid #FCEFED; border-radius: 9999px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(59,46,64,0.4);">
      <span style="font-size: 16px;">🚍</span>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -20]
})

// Origin Marker Icon (Sangli Depot - Midnight Plum with Periwinkle Border)
const originIcon = new L.DivIcon({
  className: 'custom-origin-leaflet-icon',
  html: `
    <div style="background-color: #3B2E40; border: 2px solid #6173F4; border-radius: 9999px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(59,46,64,0.4);">
      <div style="width: 8px; height: 8px; background-color: #FCEFED; border-radius: 9999px;"></div>
    </div>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -14]
})

// Destination Stand Marker Icon (Highlight Flag)
const destinationIcon = new L.DivIcon({
  className: 'custom-dest-leaflet-icon',
  html: `
    <div style="background-color: #F35E3E; border: 2px solid #FFFFFF; border-radius: 9999px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(243,94,62,0.5);">
      <span style="font-size: 14px;">🏁</span>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -16]
})

// Map Viewport Controller
function MapAutoFitter({ activeBuses, routeWaypoints }) {
  const map = useMap()

  useEffect(() => {
    const points = []

    if (activeBuses && activeBuses.length > 0) {
      activeBuses.forEach(b => {
        if (b.hasLocation && b.latitude != null && b.longitude != null) {
          points.push([b.latitude, b.longitude])
        }
      })
    }

    if (routeWaypoints && routeWaypoints.length > 0) {
      routeWaypoints.forEach(wp => points.push([wp.lat, wp.lng]))
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
    }
  }, [activeBuses, routeWaypoints, map])

  return null
}

export default function TrackBus() {
  const [selectedRoute, setSelectedRoute] = useState(routes[0]?.id || 'R1')
  const [telemetry, setTelemetry] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastRefreshed, setLastRefreshed] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const pollingRef = useRef(null)

  const fetchRouteTelemetry = async (routeId, isBackground = false) => {
    if (!routeId) return
    if (!isBackground) setLoading(true)
    setIsRefreshing(true)
    setError(null)

    try {
      const response = await api.get(`/track-bus/active/${routeId}`)
      setTelemetry(response.data)
      setLastRefreshed(new Date())
    } catch (err) {
      console.error('Failed to load active bus telemetry:', err)
      setError(err?.response?.data?.message || 'Unable to fetch real-time bus tracking data.')
    } finally {
      if (!isBackground) setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    if (!selectedRoute) {
      setTelemetry(null)
      return
    }

    fetchRouteTelemetry(selectedRoute, false)

    pollingRef.current = setInterval(() => {
      fetchRouteTelemetry(selectedRoute, true)
    }, 4000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [selectedRoute])

  const routeConfig = ROUTES_CONFIG[selectedRoute]
  const activeBuses = telemetry?.buses || []

  // Check if any bus is in RETURNING phase
  const hasReturningBus = activeBuses.some(b => b.phase === 'RETURNING')

  // Dynamic route waypoints based on dominant phase on map
  const polylineCoords = hasReturningBus
    ? (routeConfig?.returnWaypoints?.map(wp => [wp.lat, wp.lng]) || [])
    : (routeConfig?.waypoints?.map(wp => [wp.lat, wp.lng]) || [])

  const getPhaseBadge = (phase, outwardDestination) => {
    switch (phase) {
      case 'DESTINATION_STOP':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/50 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-900">
            <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
            Destination Stop (15m)
          </span>
        )
      case 'RETURNING':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-[#6173F4]/50 bg-[#6173F4]/15 px-2.5 py-0.5 text-xs font-bold text-[#4052D6]">
            <RotateCcw className="h-3.5 w-3.5 text-[#6173F4] animate-spin" />
            Returning to Sangli
          </span>
        )
      case 'OUTBOUND':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-[#F35E3E]/40 bg-[#F35E3E]/15 px-2.5 py-0.5 text-xs font-bold text-[#C93B1E]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F35E3E] animate-ping" />
            Outbound to {outwardDestination}
          </span>
        )
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Container: Shell Light Surface */}
      <div className="rounded-[2rem] border border-[#E7D3D0] bg-[#FCEFED] p-6 shadow-2xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3B2E40] text-[#6173F4] ring-1 ring-[#3B2E40]/20">
                <Navigation className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#6173F4]">
                Sangli Depot Live Tracking & Return ETA
              </p>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#3B2E40] sm:text-4xl">
              Track Bus Live Map & Sangli Return ETA
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#3B2E40]/75">
              Real-time GPS tracking across all journey phases. Displays estimated arrival back at Sangli Depot accounting for travel and the planned 15-minute destination stop.
            </p>
          </div>

          {/* Route Selector (Strictly 3 Outward Routes) */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[260px]">
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-[#E7D3D0] bg-white px-4 py-3 text-sm font-semibold text-[#3B2E40] shadow-sm outline-none transition focus:border-[#6173F4] focus:ring-2 focus:ring-[#6173F4]/20"
              >
                {routes.map(r => (
                  <option key={r.id} value={r.id} className="bg-white text-[#3B2E40]">
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => fetchRouteTelemetry(selectedRoute, false)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-[#6173F4]/40 bg-white px-4 py-3 text-xs font-semibold text-[#3B2E40] shadow-sm hover:border-[#6173F4] hover:bg-[#F5E0DE]"
              title="Manual Telemetry Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-[#6173F4]' : 'text-[#6173F4]'}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Route Details Banner */}
        {routeConfig && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E7D3D0] bg-white p-4 text-xs sm:text-sm text-[#3B2E40]/80 shadow-inner">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3B2E40]/60">Depot Origin:</span>{' '}
                <span className="font-semibold text-[#3B2E40]">{routeConfig.origin.name}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#6173F4] hidden sm:block" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6173F4]">Outward Destination:</span>{' '}
                <span className="font-bold text-[#3B2E40] underline decoration-[#F35E3E]">{routeConfig.destination.name}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#6173F4] hidden sm:block" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3B2E40]/60">Planned Stop:</span>{' '}
                <span className="font-semibold text-amber-800">15 min</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="rounded-full bg-[#FCEFED] border border-[#E7D3D0] px-3 py-1 font-semibold text-[#3B2E40]">
                Avg Speed: 45 km/h
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-[#F35E3E]">
                <Radio className="h-3.5 w-3.5 animate-pulse text-[#F35E3E]" />
                <span>{activeBuses.length} Active Journey{activeBuses.length !== 1 ? 's' : ''}</span>
              </span>
              {lastRefreshed && (
                <span className="text-[11px] text-[#3B2E40]/60 hidden md:inline">
                  Updated: {lastRefreshed.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-50 p-4 text-sm text-rose-900">
            <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Left Column: Active Bus Roster & Sangli Return ETAs */}
          <div className="flex flex-col gap-4 lg:col-span-5 order-2 lg:order-1">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold uppercase tracking-wider text-[#3B2E40]">
                Active Journeys on Route ({activeBuses.length})
              </h3>
            </div>

            {loading && (
              <div className="flex min-h-[300px] flex-col items-center justify-center space-y-3 rounded-3xl border border-[#E7D3D0] bg-white p-8 text-center">
                <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#F35E3E] border-t-transparent" />
                <p className="text-sm text-[#3B2E40]/70">Connecting to bus telemetry...</p>
              </div>
            )}

            {!loading && activeBuses.length === 0 && (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-[#E7D3D0] bg-white p-8 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#3B2E40] text-[#6173F4]">
                  <Bus className="h-7 w-7 text-[#6173F4]" />
                </div>
                <h4 className="text-lg font-bold text-[#3B2E40]">No Active Buses in Transit</h4>
                <p className="mt-1 text-sm text-[#3B2E40]/70 max-w-xs">
                  There are currently no active journeys dispatched on {routeConfig?.name || selectedRoute}.
                </p>
                <p className="mt-3 text-xs text-[#3B2E40]/60">
                  Journeys can be dispatched from the "Goes On Route" administrative panel.
                </p>
              </div>
            )}

            {!loading && activeBuses.length > 0 && (
              <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
                {activeBuses.map(bus => {
                  const hasLoc = bus.hasLocation
                  const sangliEta = bus.sangliReturnEta
                  const hasEta = sangliEta?.etaAvailable && sangliEta?.arrivalClockTime
                  const phase = bus.phase || 'OUTBOUND'

                  return (
                    <div
                      key={bus.tripId}
                      className="rounded-3xl border border-[#E7D3D0] bg-white p-5 shadow-sm transition hover:border-[#6173F4]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FCEFED] text-[#6173F4] ring-1 ring-[#E7D3D0]">
                            <Bus className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-[#3B2E40]">{bus.busNumber}</h4>
                            <p className="text-xs text-[#3B2E40]/70">Driver: {bus.driverName}</p>
                          </div>
                        </div>

                        {/* Current Phase Badge */}
                        {getPhaseBadge(phase, routeConfig.destination.name)}
                      </div>

                      {/* Primary Sangli Return Arrival Time Box */}
                      <div className="mt-4 rounded-2xl border border-[#E7D3D0] bg-[#FCEFED] p-4">
                        <div className="flex items-center justify-between text-xs text-[#3B2E40]/70">
                          <span className="font-semibold uppercase tracking-wider">Primary Destination:</span>
                          <span className="font-bold text-[#3B2E40]">Sangli Depot (Return Arrival)</span>
                        </div>

                        <div className="mt-3 flex items-baseline justify-between border-t border-[#E7D3D0] pt-3">
                          <div>
                            <p className="text-[11px] text-[#3B2E40]/70 uppercase tracking-wider">Estimated Sangli Arrival</p>
                            {hasEta ? (
                              <div className="flex items-baseline gap-2 mt-0.5">
                                <span className="text-2xl font-black text-[#3B2E40]">
                                  {sangliEta.arrivalClockTime}
                                </span>
                                {sangliEta.remainingMinutes != null && (
                                  <span className="text-xs font-semibold text-[#6173F4]">
                                    ({sangliEta.remainingMinutes} min)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm font-semibold text-amber-800">ETA unavailable</span>
                            )}
                          </div>

                          <div className="text-right">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                hasLoc
                                  ? 'border border-emerald-500/40 bg-emerald-50 text-emerald-800'
                                  : 'border border-amber-300 bg-amber-50 text-amber-900'
                              }`}
                            >
                              {hasLoc ? 'Live GPS' : 'GPS Offline'}
                            </span>
                          </div>
                        </div>

                        {phase === 'DESTINATION_STOP' && (
                          <div className="mt-2.5 border-t border-[#E7D3D0] pt-2 text-xs text-amber-900 font-medium">
                            Planned 15-minute stop in progress at {routeConfig.destination.name} (~{bus.remainingStopMinutes || 15}m left).
                          </div>
                        )}

                        {!hasLoc && (
                          <div className="mt-2 text-[11px] text-amber-800">
                            * Telemetry offline. Bus position and ETA will update once driver GPS is active.
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Column: Interactive Leaflet Map */}
          <div className="overflow-hidden rounded-3xl border border-[#E7D3D0] bg-white shadow-2xl h-[580px] lg:col-span-7 flex flex-col order-1 lg:order-2">
            <div className="flex items-center justify-between border-b border-[#5C4863] bg-[#3B2E40] px-6 py-3.5 text-xs text-[#FCEFED]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F35E3E] animate-ping" />
                <span className="font-bold uppercase tracking-wider text-[#FCEFED]">Interactive Route & Fleet Map</span>
              </div>
              <span className="text-[#FCEFED]/70">Sangli Depot Operations</span>
            </div>

            <div className="relative flex-1 w-full h-full">
              <MapContainer
                center={[routeConfig?.origin.latitude || 16.8524, routeConfig?.origin.longitude || 74.5815]}
                zoom={11}
                style={{ height: '100%', width: '100%', zIndex: 10 }}
              >
                <MapAutoFitter activeBuses={activeBuses} routeWaypoints={routeConfig?.waypoints} />

                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Route Path Polyline (Periwinkle Blue) */}
                {polylineCoords.length > 0 && (
                  <Polyline
                    positions={polylineCoords}
                    pathOptions={{ color: '#6173F4', weight: 4, opacity: 0.85, dashArray: '6, 6' }}
                  />
                )}

                {/* Departure Stand Marker (Sangli Depot) */}
                {routeConfig?.origin && (
                  <Marker
                    position={[routeConfig.origin.latitude, routeConfig.origin.longitude]}
                    icon={originIcon}
                  >
                    <Popup className="custom-popup">
                      <div className="p-1">
                        <p className="text-[11px] font-bold uppercase text-[#3B2E40]/60">Depot Hub & Return Endpoint</p>
                        <p className="font-bold text-[#3B2E40]">{routeConfig.origin.name}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Destination Stand Marker */}
                {routeConfig?.destination && (
                  <Marker
                    position={[routeConfig.destination.latitude, routeConfig.destination.longitude]}
                    icon={destinationIcon}
                  >
                    <Popup className="custom-popup">
                      <div className="p-1">
                        <p className="text-[11px] font-bold uppercase text-[#F35E3E]">Outward Destination (15m Stop)</p>
                        <p className="font-bold text-[#3B2E40]">{routeConfig.destination.name}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Active Bus Markers (Only placed when real GPS coordinates exist) */}
                {activeBuses.map((bus) => {
                  if (!bus.hasLocation || bus.latitude == null || bus.longitude == null) {
                    return null
                  }

                  const sangliEta = bus.sangliReturnEta

                  return (
                    <Marker
                      key={bus.tripId}
                      position={[bus.latitude, bus.longitude]}
                      icon={busIcon}
                    >
                      <Popup className="custom-popup">
                        <div className="p-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#F35E3E]">{bus.busNumber}</span>
                            <span className="text-[10px] rounded bg-[#6173F4]/15 px-1.5 text-[#4052D6] font-semibold uppercase">
                              {bus.phase || 'Active'}
                            </span>
                          </div>
                          <p className="text-xs text-[#3B2E40]/70 mt-1">Driver: {bus.driverName}</p>
                          <div className="mt-2 border-t border-[#E7D3D0] pt-1.5 text-xs">
                            <p className="font-semibold text-[#3B2E40]">
                              Estimated Arrival at Sangli Depot:
                            </p>
                            <p className="text-sm font-bold text-[#3B2E40]">
                              {sangliEta?.etaAvailable ? `${sangliEta.arrivalClockTime} (${sangliEta.remainingMinutes} min)` : 'ETA unavailable'}
                            </p>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
              </MapContainer>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
