import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Bus, UploadCloud, Users, MapPin, CheckCircle, XCircle, ChevronDown, Activity, Zap, Clock, AlertCircle } from 'lucide-react'
import L from 'leaflet'
import api from '../api'
import { ROUTES_CONFIG } from '../utils/routeConfig'

// Fix default icon issue with Leaflet in React
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
})

const busIcon = new L.DivIcon({
  className: 'custom-bus-leaflet-icon',
  html: `
    <div style="background-color: #F35E3E; border: 2px solid #FCEFED; border-radius: 9999px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(59,46,64,0.4);">
      <span style="font-size: 15px;">🚍</span>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18]
})

const destinationIcon = new L.DivIcon({
  className: 'custom-dest-leaflet-icon',
  html: `
    <div style="background-color: #F35E3E; border: 2px solid #FFFFFF; border-radius: 9999px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(243,94,62,0.5);">
      <span style="font-size: 13px;">🏁</span>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16]
})

function MapUpdater({ activeLocations, waypoints }) {
  const map = useMap()
  useEffect(() => {
    const points = []
    if (activeLocations && activeLocations.length > 0) {
      activeLocations.forEach(loc => {
        if (loc.latitude != null && loc.longitude != null) {
          points.push([loc.latitude, loc.longitude])
        }
      })
    }
    if (waypoints && waypoints.length > 0) {
      waypoints.forEach(wp => points.push([wp.lat, wp.lng]))
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }
  }, [activeLocations, waypoints, map])
  return null
}

export default function ExtraBus() {
  const [routes, setRoutes] = useState([])
  const [selectedRoute, setSelectedRoute] = useState('')
  const [images, setImages] = useState([])
  const [manualCount, setManualCount] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeLocations, setActiveLocations] = useState([])
  const [evalError, setEvalError] = useState(null)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await api.get('/routes')
        setRoutes(response.data)
      } catch (err) {
        console.error('Failed to load routes:', err)
      }
    }
    fetchRoutes()
  }, [])

  useEffect(() => {
    if (!selectedRoute) {
      setActiveLocations([])
      return
    }

    const fetchLocations = async () => {
      try {
        const response = await api.get(`/locations/active/${selectedRoute}`)
        setActiveLocations(response.data)
      } catch (err) {
        console.error('Failed to load active locations:', err)
      }
    }

    fetchLocations()
    const interval = setInterval(fetchLocations, 3500)
    return () => clearInterval(interval)
  }, [selectedRoute])

  const handleImageChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setImages((prev) => {
        const combined = [...prev, ...newFiles]
        return combined.slice(0, 4)
      })
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const handleEvaluate = async () => {
    setEvalError(null)

    if (!selectedRoute) {
      setEvalError('Please select a route first.')
      return
    }

    const hasManual = manualCount !== '' && manualCount !== null
    if (hasManual) {
      const parsed = Number(manualCount)
      if (!Number.isInteger(parsed) || parsed < 0) {
        setEvalError('Manual passenger count must be a non-negative integer.')
        return
      }
    } else {
      if (images.length !== 4) {
        setEvalError('Please upload exactly 4 CCTV images for YOLO detection, or enter a manual passenger count.')
        return
      }
    }

    setLoading(true)

    const formData = new FormData()
    formData.append('routeId', selectedRoute)
    if (hasManual) {
      formData.append('manual_count', manualCount.trim())
    }
    images.forEach((img) => formData.append('images', img))

    try {
      const response = await api.post('/extra-bus/evaluate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      navigate('/extra-bus-result', { state: { result: response.data } })
    } catch (err) {
      console.error('Evaluation failed:', err)
      setEvalError(err?.response?.data?.message || 'Evaluation failed. Make sure backend and ML services are running.')
    } finally {
      setLoading(false)
    }
  }

  const routeConfig = ROUTES_CONFIG[selectedRoute]
  const polylineCoords = routeConfig?.waypoints?.map(wp => [wp.lat, wp.lng]) || []

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2A202E] ring-1 ring-[#6173F4]/40">
              <Zap className="h-3.5 w-3.5 text-[#6173F4]" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#6173F4]">AI Analytics & Dynamic Allocation</p>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#FCEFED] sm:text-4xl">
            Extra Bus Intelligence & Deployment
          </h1>
          <p className="mt-2 text-[#FCEFED]/75 max-w-2xl text-sm sm:text-base">
            Optimize fleet allocation using YOLOv8 passenger analytics and destination-based arrival times. An extra bus is recommended when passenger count &ge; 40, destination ETA &gt; 25 min, and depot resources are free.
          </p>
        </div>
      </div>

      {evalError && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm font-semibold text-rose-300">
          <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
          <span>{evalError}</span>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Controls & Inputs on Shell Light Surface */}
        <div className="flex flex-col gap-6 lg:col-span-5 relative z-10">
          <div className="overflow-hidden rounded-3xl border border-[#E7D3D0] bg-[#FCEFED] p-6 shadow-2xl sm:p-8">
            <h3 className="mb-6 flex items-center gap-3 text-xl font-bold text-[#3B2E40]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F35E3E] text-[#FCEFED] shadow-inner">
                <Activity className="h-5 w-5" />
              </span>
              Evaluation Parameters
            </h3>

            <div className="space-y-6">
              {/* Route Selection */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#3B2E40]/80">
                  Select Route
                </label>
                <div className="relative">
                  <select
                    value={selectedRoute}
                    onChange={(e) => setSelectedRoute(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-[#E7D3D0] bg-white px-5 py-3.5 text-sm font-semibold text-[#3B2E40] shadow-sm outline-none transition focus:border-[#6173F4] focus:ring-2 focus:ring-[#6173F4]/20"
                  >
                    <option value="" className="bg-white text-[#3B2E40]/70">-- Choose a Route --</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id} className="bg-white text-[#3B2E40]">
                        {r.id}: {r.name || r.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6173F4]" />
                </div>
              </div>

              {/* Destination Stand & Live ETA Banner */}
              {routeConfig && (
                <div className="rounded-2xl border border-[#E7D3D0] bg-white p-4 text-xs text-[#3B2E40]">
                  <div className="flex items-center justify-between text-[#3B2E40]/80">
                    <span className="font-semibold uppercase tracking-wider">Destination Stand:</span>
                    <span className="font-bold text-[#3B2E40]">{routeConfig.destination.name}</span>
                  </div>

                  <div className="mt-3 border-t border-[#E7D3D0] pt-3">
                    <p className="font-semibold text-[#3B2E40]/70">Active Buses & ETAs to Destination:</p>
                    {activeLocations.length === 0 ? (
                      <p className="mt-1 text-amber-800 italic">No active buses currently on route.</p>
                    ) : (
                      <div className="mt-2 space-y-1.5">
                        {activeLocations.map((loc, i) => (
                          <div key={i} className="flex items-center justify-between rounded-xl bg-[#FCEFED] px-3 py-1.5 border border-[#E7D3D0]">
                            <span className="font-bold text-[#3B2E40]">{loc.busNumber}</span>
                            {loc.hasLocation && loc.eta?.etaAvailable ? (
                              <span className="font-bold text-[#6173F4]">
                                ETA: {loc.eta.etaMinutes} min ({loc.eta.remainingDistanceKm} km)
                              </span>
                            ) : (
                              <span className="text-amber-800">GPS Telemetry Offline</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Manual Passenger Count (Optional Override) */}
              <div>
                <label className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#3B2E40]/80">
                  <span>Manual Passenger Count</span>
                  <span className="text-[11px] font-normal normal-case text-[#3B2E40]/60">(Optional override)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter manual count if not using YOLO..."
                    value={manualCount}
                    onChange={(e) => setManualCount(e.target.value)}
                    className="w-full rounded-2xl border border-[#E7D3D0] bg-white px-5 py-3 text-sm text-[#3B2E40] placeholder-[#3B2E40]/45 outline-none transition focus:border-[#6173F4] focus:ring-2 focus:ring-[#6173F4]/20"
                  />
                  <Users className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6173F4]" />
                </div>
                <p className="mt-1 text-[11px] text-[#3B2E40]/65">
                  When specified, evaluation uses this count directly without running YOLOv8.
                </p>
              </div>

              {/* Upload Section */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#3B2E40]/80">
                  Bus CCTV Feed (Upload 4 Frames for YOLO)
                </label>
                <div 
                  className="relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#6173F4]/40 bg-white py-8 transition-all hover:border-[#F35E3E] hover:bg-[#F5E0DE]/40"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center">
                    <div className="mb-3 rounded-full bg-[#FCEFED] p-3 text-[#6173F4] ring-1 ring-[#E7D3D0]">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-bold text-[#3B2E40]">Click to select 4 CCTV images</p>
                    <p className="mt-1 text-[11px] text-[#3B2E40]/70">{images.length}/4 frames attached</p>
                  </div>
                  
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageChange}
                  />
                </div>

                {images.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {images.map((img, idx) => (
                      <div key={idx} className="group/img relative h-16 w-16 overflow-hidden rounded-xl border border-[#E7D3D0]">
                        <img 
                          src={URL.createObjectURL(img)} 
                          alt={`Upload ${idx}`} 
                          className="h-full w-full object-cover" 
                        />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute inset-0 bg-[#3B2E40]/70 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-rose-300 transition"
                          title="Remove image"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Evaluate Button */}
              <button
                onClick={handleEvaluate}
                disabled={loading}
                className="group relative mt-2 w-full overflow-hidden rounded-2xl bg-[#F35E3E] px-6 py-4 text-sm font-bold tracking-wide text-[#FCEFED] shadow-lg transition-all hover:bg-[#E04D2E] focus:outline-none focus:ring-4 focus:ring-[#F35E3E]/30 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Evaluating Decision Criteria...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      Evaluate Extra Bus Requirement
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Map */}
        <div className="flex h-[520px] flex-col overflow-hidden rounded-3xl border border-[#E7D3D0] bg-white shadow-2xl lg:col-span-7">
          <div className="flex items-center justify-between border-b border-[#5C4863] bg-[#3B2E40] px-6 py-4 text-[#FCEFED]">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F35E3E] opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#F35E3E]"></span>
              </span>
              <h3 className="font-bold text-sm text-[#FCEFED]">Live Fleet Tracking on Route</h3>
            </div>
            {selectedRoute && (
              <div className="rounded-full border border-[#6173F4]/50 bg-[#6173F4]/20 px-3 py-1 text-xs font-semibold text-[#FCEFED]">
                {activeLocations.length} Active Bus{activeLocations.length !== 1 ? 'es' : ''}
              </div>
            )}
          </div>
          
          <div className="relative flex-1 bg-[#FCEFED] z-10 w-full h-full">
            {!selectedRoute ? (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <div className="max-w-sm rounded-3xl border border-[#E7D3D0] bg-white p-8 shadow-xl">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FCEFED] text-[#6173F4]">
                    <MapPin className="h-7 w-7 text-[#6173F4]" />
                  </div>
                  <h4 className="text-base font-bold text-[#3B2E40]">No Route Selected</h4>
                  <p className="mt-2 text-xs text-[#3B2E40]/70">Select a route from the parameters panel to view active bus positions and path.</p>
                </div>
              </div>
            ) : (
              <MapContainer 
                center={[routeConfig?.origin.latitude || 16.6961, routeConfig?.origin.longitude || 74.2435]}
                zoom={11} 
                style={{ height: '100%', width: '100%', zIndex: 10 }}
              >
                <MapUpdater activeLocations={activeLocations} waypoints={routeConfig?.waypoints} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {polylineCoords.length > 0 && (
                  <Polyline
                    positions={polylineCoords}
                    pathOptions={{ color: '#6173F4', weight: 4, opacity: 0.85, dashArray: '6, 6' }}
                  />
                )}

                {routeConfig?.destination && (
                  <Marker
                    position={[routeConfig.destination.latitude, routeConfig.destination.longitude]}
                    icon={destinationIcon}
                  >
                    <Popup className="custom-popup">
                      <div className="font-bold text-[#3B2E40]">Destination: {routeConfig.destination.name}</div>
                    </Popup>
                  </Marker>
                )}

                {activeLocations.map((loc, i) => {
                  if (loc.latitude == null || loc.longitude == null) return null
                  return (
                    <Marker key={i} position={[loc.latitude, loc.longitude]} icon={busIcon}>
                      <Popup className="custom-popup">
                        <div className="font-semibold text-[#3B2E40]">Bus: <span className="text-[#F35E3E]">{loc.busNumber}</span></div>
                        <div className="text-xs text-[#3B2E40]/60">Trip ID: {loc.tripId}</div>
                        {loc.eta?.etaAvailable && (
                          <div className="mt-1 text-xs font-bold text-[#6173F4]">
                            ETA to {routeConfig.destination.name}: {loc.eta.etaMinutes} min
                          </div>
                        )}
                      </Popup>
                    </Marker>
                  )
                })}
              </MapContainer>
            )}
          </div>
        </div>

      </div>
    </main>
  )
}
