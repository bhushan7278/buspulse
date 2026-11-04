import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import {
  MapPin,
  Navigation,
  Compass,
  AlertCircle,
  CheckCircle2,
  Clock,
  Bus,
  User,
  ShieldAlert,
  Radio,
  StopCircle
} from 'lucide-react'
import api from '../api'

export default function Tracking() {
  const [searchParams] = useSearchParams()
  const { tripId: paramTripId } = useParams()
  const tripId = searchParams.get('tripId') || paramTripId

  const [trip, setTrip] = useState(null)
  const [position, setPosition] = useState(null)
  const [statusMessage, setStatusMessage] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(false)
  const [lastUpdateAt, setLastUpdateAt] = useState(null)
  const [ending, setEnding] = useState(false)

  const isTripIdValid = useMemo(() => {
    return Boolean(tripId && /^[0-9a-fA-F]{24}$/.test(tripId))
  }, [tripId])

  const canTrack = useMemo(() => {
    return trip && trip.status === 'active'
  }, [trip])

  // Fetch Trip details
  useEffect(() => {
    if (!tripId) {
      setError('Missing tripId in the tracking link. Please open the link sent to your WhatsApp.')
      setLoading(false)
      return
    }

    if (!/^[0-9a-fA-F]{24}$/.test(tripId)) {
      setError(`Invalid Trip ID format: "${tripId}". A valid 24-character hexadecimal ID is required.`)
      setLoading(false)
      return
    }

    const loadTrip = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await api.get(`/trip/${tripId}`)
        setTrip(response.data)
      } catch (err) {
        const msg = err?.response?.data?.message || 'Unable to load trip. Please check connection.'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }

    loadTrip()
  }, [tripId])

  // Watch Position when Live Tracking is active
  useEffect(() => {
    if (!canTrack || !isTrackingEnabled) {
      return
    }

    if (!navigator.geolocation) {
      setError('Browser Geolocation is not supported on this device.')
      setIsTrackingEnabled(false)
      return
    }

    setStatusMessage('Acquiring device GPS coordinates...')

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setPosition({ lat, lng })
        setStatusMessage('Syncing GPS coordinates with central depot...')

        try {
          await api.post('/location/update', {
            tripId,
            latitude: lat,
            longitude: lng
          })
          const now = new Date()
          setLastUpdateAt(now)
          setStatusMessage(`Live location sharing active (${now.toLocaleTimeString()})`)
          setError(null)
        } catch (err) {
          console.error('Location sync error:', err)
          setStatusMessage('Location update failed')
          setError(err?.response?.data?.message || 'Failed to transmit coordinates to server.')
        }
      },
      (geoError) => {
        console.warn('Geolocation error:', geoError)
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            setError('Location permission denied. Please allow location access in your mobile browser settings to share live GPS.')
            setStatusMessage('Permission Denied')
            break
          case geoError.POSITION_UNAVAILABLE:
            setError('GPS position unavailable. Please ensure Device Location/GPS is turned ON.')
            setStatusMessage('GPS Unavailable')
            break
          case geoError.TIMEOUT:
            setError('Location acquisition timed out. Retrying GPS lock...')
            setStatusMessage('GPS Timeout')
            break
          default:
            setError(geoError.message || 'Error acquiring GPS location.')
            setStatusMessage('GPS Error')
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 12000
      }
    )

    return () => {
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [canTrack, tripId, isTrackingEnabled])

  const handleEndTrip = async () => {
    if (!window.confirm('Are you sure you want to complete this trip? Live tracking will stop immediately.')) {
      return
    }

    setError(null)
    setEnding(true)
    try {
      await api.post('/end-trip', { tripId })
      setTrip(prev => (prev ? { ...prev, status: 'completed', endTime: new Date().toISOString() } : prev))
      setIsTrackingEnabled(false)
      setStatusMessage('Trip completed. Live tracking closed.')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to end trip.')
    } finally {
      setEnding(false)
    }
  }

  const isSecureContextAvailable = typeof window !== 'undefined' && (
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )

  return (
    <main className="min-h-screen bg-[#3B2E40] px-4 py-8 sm:px-6 w-full flex flex-col items-center justify-center font-sans text-[#FCEFED]">
      {/* Branding Header */}
      <div className="w-full max-w-lg mb-6 text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2A202E] mb-3 shadow-lg ring-1 ring-[#6173F4]/40">
          <Navigation className="h-7 w-7 text-[#6173F4]" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#6173F4]">MSRTC Driver Telemetry</p>
        <h1 className="text-3xl font-extrabold text-[#FCEFED] tracking-tight">Live Location Sharing</h1>
      </div>

      <div className="w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-[#E7D3D0] bg-[#FCEFED] p-6 shadow-2xl sm:p-10 relative text-[#3B2E40]">
        {/* Loading Spinner */}
        {loading && (
          <div className="py-12 text-center space-y-3">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-[#6173F4] border-t-transparent" />
            <p className="text-sm font-semibold text-[#3B2E40]/75">Loading trip details...</p>
          </div>
        )}

        {/* Invalid or Missing Trip ID Error */}
        {!loading && !isTripIdValid && (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-rose-900">Invalid Tracking Link</h2>
            <p className="text-xs text-[#3B2E40]/70 max-w-sm mx-auto leading-relaxed">
              {error || 'The tracking link is missing a valid Trip ID. Please verify the WhatsApp link received from the depot dispatcher.'}
            </p>
          </div>
        )}

        {/* General Error Notice */}
        {!loading && error && isTripIdValid && (
          <div className="mb-6 rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-900 border border-rose-300 flex items-start gap-3 shadow-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {/* Insecure Context Warning on Mobile over Plain HTTP */}
        {!isSecureContextAvailable && (
          <div className="mb-6 rounded-2xl bg-amber-50 p-4 text-xs font-semibold text-amber-900 border border-amber-300 flex items-start gap-3 shadow-sm">
            <ShieldAlert className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Notice:</strong> Mobile browsers restrict device GPS over unencrypted HTTP. For public remote driver access, deploy with HTTPS or an SSL reverse proxy.
            </p>
          </div>
        )}

        {/* Loaded Trip Details Card */}
        {!loading && trip && (
          <div className="space-y-6">
            {/* Header: Status and Bus */}
            <div className="flex items-center justify-between pb-5 border-b border-[#E7D3D0]">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#3B2E40]/70 font-bold mb-1">Trip Status</p>
                <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
                  trip.status === 'active'
                    ? 'bg-[#F35E3E]/15 text-[#C93B1E] border border-[#F35E3E]/40'
                    : 'bg-white text-[#3B2E40]/70 border border-[#E7D3D0]'
                }`}>
                  {trip.status === 'active' && (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F35E3E] opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F35E3E]" />
                    </span>
                  )}
                  <span>{trip.status.toUpperCase()}</span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider text-[#3B2E40]/70 font-bold mb-1">Assigned Bus</p>
                <div className="flex items-center justify-end gap-1.5">
                  <Bus className="h-4 w-4 text-[#6173F4]" />
                  <span className="text-lg font-black text-[#3B2E40]">{trip.busId?.number || 'Bus N/A'}</span>
                </div>
              </div>
            </div>

            {/* Trip Specs */}
            <div className="rounded-2xl border border-[#E7D3D0] bg-white p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#3B2E40]/70">Route:</span>
                <span className="font-bold text-[#3B2E40]">{trip.routeName || trip.routeId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#3B2E40]/70">Driver:</span>
                <span className="font-bold text-[#3B2E40]">{trip.driverId?.name || 'Assigned Driver'}</span>
              </div>
              {trip.driverId?.phone && (
                <div className="flex justify-between">
                  <span className="text-[#3B2E40]/70">Contact:</span>
                  <span className="font-mono text-[#3B2E40]">{trip.driverId.phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#3B2E40]/70">Journey Phase:</span>
                <span className="font-semibold text-[#6173F4]">{trip.phase || 'OUTBOUND'}</span>
              </div>
            </div>

            {/* Completed Notice */}
            {trip.status === 'completed' && (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-50 p-4 text-center text-xs font-semibold text-emerald-900">
                <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-600" />
                <p className="font-bold">This trip has been completed.</p>
                <p className="mt-0.5 text-emerald-800/80">Live location sharing is closed for this journey.</p>
              </div>
            )}

            {/* GPS Telemetry Visualizer */}
            {trip.status === 'active' && (
              <div className="relative overflow-hidden rounded-[2rem] bg-white p-6 border border-[#E7D3D0] shadow-inner flex flex-col items-center">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#3B2E40]/70 mb-4">
                  <Radio className={`h-4 w-4 ${isTrackingEnabled ? 'text-[#F35E3E] animate-pulse' : 'text-[#3B2E40]/40'}`} />
                  <span>GPS Telemetry Status</span>
                </div>

                {isTrackingEnabled ? (
                  position ? (
                    <div className="relative flex items-center justify-center w-full my-2">
                      <div className="flex flex-col items-center justify-center h-40 w-40 rounded-full border-2 border-[#6173F4] bg-[#FCEFED] shadow-xl relative">
                        <div className="absolute inset-0 rounded-full border-t-2 border-[#F35E3E] animate-[spin_3s_linear_infinite]" />
                        <MapPin className="h-8 w-8 text-[#F35E3E] mb-1" />
                        <p className="font-mono text-base font-bold text-[#3B2E40]">{position.lat.toFixed(5)}° N</p>
                        <p className="font-mono text-base font-bold text-[#3B2E40]">{position.lng.toFixed(5)}° E</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-36 w-36 rounded-full border border-[#E7D3D0] bg-[#FCEFED]/60 my-2">
                      <Compass className="h-8 w-8 text-[#6173F4] mb-2 animate-[spin_3s_linear_infinite]" />
                      <p className="text-[11px] text-[#3B2E40]/70 text-center max-w-[110px]">
                        Acquiring GPS fix...
                      </p>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-36 w-36 rounded-full border border-[#E7D3D0] bg-[#FCEFED]/60 my-2">
                    <Navigation className="h-8 w-8 text-[#3B2E40]/40 mb-2" />
                    <p className="text-[11px] text-[#3B2E40]/60 text-center max-w-[120px]">
                      Location sharing idle. Click below to start.
                    </p>
                  </div>
                )}

                {statusMessage && (
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-[#3B2E40] font-semibold text-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>{statusMessage}</span>
                  </div>
                )}

                {lastUpdateAt && (
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-[#3B2E40]/60">
                    <Clock className="h-3 w-3" />
                    <span>Last packet synced at {lastUpdateAt.toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {trip.status === 'active' && (
              <div className="space-y-3 pt-2">
                {!isTrackingEnabled ? (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null)
                      setIsTrackingEnabled(true)
                    }}
                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#F35E3E] px-6 py-4 text-sm font-bold tracking-wide text-[#FCEFED] shadow-lg transition-all hover:bg-[#E04D2E] focus:outline-none focus:ring-4 focus:ring-[#F35E3E]/30"
                  >
                    <Navigation className="h-5 w-5" />
                    <span>START LIVE GPS TRACKING</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsTrackingEnabled(false)
                        setStatusMessage('Live location sharing paused.')
                      }}
                      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border border-[#3B2E40] bg-white px-6 py-3.5 text-sm font-bold text-[#3B2E40] shadow-sm transition hover:bg-[#FCEFED]"
                    >
                      <StopCircle className="h-4 w-4 text-rose-600" />
                      <span>Pause Location Sharing</span>
                    </button>

                    <button
                      type="button"
                      disabled={ending}
                      onClick={handleEndTrip}
                      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#3B2E40] px-6 py-3.5 text-sm font-bold text-[#FCEFED] shadow-lg transition hover:bg-rose-700 disabled:opacity-50"
                    >
                      {ending ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <span>Complete Trip & Stop All Tracking</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
