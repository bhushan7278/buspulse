import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapPin, Navigation, Compass, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react'
import api from '../api'

export default function Tracking() {
  const [searchParams] = useSearchParams()
  const tripId = searchParams.get('tripId')
  const [trip, setTrip] = useState(null)
  const [position, setPosition] = useState(null)
  const [statusMessage, setStatusMessage] = useState(null)
  const [error, setError] = useState(null)
  const [ending, setEnding] = useState(false)
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const simulationRef = useRef(null)

  const canTrack = useMemo(() => trip && trip.status === 'active', [trip])

  useEffect(() => {
    if (!tripId) {
      setError('Missing tripId in the tracking link.')
      return
    }

    const loadTrip = async () => {
      setError(null)
      try {
        const response = await api.get(`/trip/${tripId}`)
        setTrip(response.data)
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load trip.')
      }
    }

    loadTrip()
  }, [tripId])

  useEffect(() => {
    if (!canTrack || !isTrackingEnabled) {
      return
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.')
      return
    }

    const id = navigator.geolocation.watchPosition(
      async pos => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatusMessage('Syncing with central system...')

        try {
          await api.post('/location/update', {
            tripId,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          })
          setStatusMessage('Live location sharing active')
        } catch (err) {
          setStatusMessage('Failed to sync location.')
          setError(err?.response?.data?.message || 'Location update error.')
        }
      },
      geoError => {
        setError(geoError.message || 'Please enable GPS/Location permission.')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }
    )

    return () => {
      if (id != null) {
        navigator.geolocation.clearWatch(id)
      }
    }
  }, [canTrack, tripId])

  // Simulation mode
  useEffect(() => {
    if (!isSimulating || !canTrack) return;

    let lat = position?.lat || 16.6961;
    let lng = position?.lng || 74.2435;

    setStatusMessage('Simulator Active: Moving bus...');

    const runSimulation = async () => {
      lat += (Math.random() - 0.5) * 0.005;
      lng += (Math.random() - 0.5) * 0.005;
      
      setPosition({ lat, lng });

      try {
        await api.post('/location/update', {
          tripId,
          latitude: lat,
          longitude: lng
        });
      } catch (err) {
        console.error("Simulation update failed", err);
      }
    };

    runSimulation();
    simulationRef.current = setInterval(runSimulation, 5000);

    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current);
    }
  }, [isSimulating, canTrack, tripId]);

  const handleEndTrip = async () => {
    if (!window.confirm("Are you sure you want to end this trip? Real-time tracking will stop immediately.")) return;
    
    setError(null)
    setEnding(true)
    try {
      await api.post('/end-trip', { tripId })
      setTrip(prev => prev ? { ...prev, status: 'completed', endTime: new Date().toISOString() } : prev)
      setStatusMessage('Trip ended successfully. Tracking stopped.')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to end trip.')
    } finally {
      setEnding(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 w-full flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-lg mb-8 text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/10 mb-4 shadow-[0_0_30px_-5px_rgba(99,102,241,0.2)]">
          <Navigation className="h-7 w-7 text-indigo-400" />
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-indigo-400">Driver Portal</p>
        <h2 className="text-3xl font-black text-white tracking-tight">Trip Telemetry</h2>
      </div>

      <div className="w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl sm:p-10 relative">
        {!tripId && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
            <p className="text-lg font-semibold text-rose-400">Invalid Tracking Link</p>
            <p className="text-slate-400 mt-2 text-sm">Trip ID is missing from the URL.</p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl bg-rose-500/10 p-5 text-sm text-rose-400 border border-rose-500/20 flex gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {trip && (
          <div className="space-y-6 relative z-10">
            {/* Trip Status Indicator */}
            <div className="flex items-center justify-between pb-6 border-b border-white/5">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Status</p>
                <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold shadow-inner ${
                  trip.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                }`}>
                  {trip.status === 'active' && <span className="relative flex h-2 w-2 mr-1">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>}
                  {trip.status.toUpperCase()}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Bus Number</p>
                <p className="text-lg font-black text-white">{trip.busId?.number || 'Unknown'}</p>
              </div>
            </div>

            {/* Radar / Position Card */}
            <div className="relative overflow-hidden rounded-[2rem] bg-slate-800/50 p-6 border border-white/5 shadow-inner flex flex-col items-center group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-50" />
              
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 relative z-10">GPS Telemetry</p>
              
              {isTrackingEnabled ? (
                position ? (
                  <div className="relative flex items-center justify-center w-full z-10">
                    <div className="flex flex-col items-center justify-center h-40 w-40 rounded-full border border-indigo-500/30 bg-slate-900/50 shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)] relative">
                      {/* Radar Sweep Animation */}
                      {trip.status === 'active' && (
                        <div className="absolute inset-0 rounded-full border-t border-indigo-400/50 animate-[spin_3s_linear_infinite]" />
                      )}
                      <MapPin className="h-8 w-8 text-indigo-400 mb-2" />
                      <p className="font-mono text-xl font-bold text-white leading-none mb-1">{position.lat.toFixed(4)}</p>
                      <p className="font-mono text-xl font-bold text-white leading-none">{position.lng.toFixed(4)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 w-40 rounded-full border border-slate-700/50 bg-slate-800/30 z-10">
                    <Compass className={`h-8 w-8 text-slate-500 mb-2 ${canTrack && !error ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
                    <p className="text-xs text-slate-400 text-center max-w-[120px]">
                      {canTrack && !error ? 'Acquiring satellites...' : 'Location inactive'}
                    </p>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-40 w-40 rounded-full border border-slate-700/50 bg-slate-800/30 z-10">
                  <Navigation className="h-8 w-8 text-slate-500 mb-2" />
                  <p className="text-xs text-slate-400 text-center max-w-[120px]">
                    Waiting for manual activation...
                  </p>
                </div>
              )}
              
              <div className="mt-6 flex items-center gap-2 text-sm text-slate-400 relative z-10">
                {statusMessage && (isTrackingEnabled || position) && (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>{statusMessage}</span>
                  </>
                )}
              </div>
            </div>

            {!isTrackingEnabled ? (
              <div className="space-y-4">
                <button
                  disabled={!canTrack}
                  onClick={() => setIsTrackingEnabled(true)}
                  className="group relative w-full overflow-hidden rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-bold tracking-wide text-white shadow-lg transition-all hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="relative flex items-center justify-center gap-2">
                    <Navigation className="h-5 w-5" />
                    START REAL TRACKING
                  </span>
                </button>
                
                <button
                  disabled={!canTrack}
                  onClick={() => {
                    setIsTrackingEnabled(true);
                    setIsSimulating(true);
                  }}
                  className="group relative w-full overflow-hidden rounded-2xl border border-indigo-500/50 bg-slate-800/80 px-6 py-4 text-sm font-bold tracking-wide text-indigo-300 shadow-lg transition-all hover:bg-indigo-500/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="relative flex items-center justify-center gap-2">
                    <Compass className="h-5 w-5" />
                    START SIMULATOR (DEV TESTING)
                  </span>
                </button>
              </div>
            ) : (
              <button
                disabled={!canTrack || ending}
                onClick={handleEndTrip}
                className="group relative w-full overflow-hidden rounded-2xl bg-rose-600 px-6 py-4 text-sm font-bold tracking-wide text-white shadow-lg transition-all hover:bg-rose-500 hover:shadow-rose-500/30 focus:outline-none focus:ring-4 focus:ring-rose-500/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-rose-600"
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-in-out group-hover:translate-x-full" />
                <span className="relative flex items-center justify-center gap-2">
                  {ending ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    'END TRIP / STOP TRACKING'
                  )}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
