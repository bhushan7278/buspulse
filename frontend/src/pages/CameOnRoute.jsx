import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Clock,
  MapPin,
  Bus,
  User,
  Phone,
  AlertCircle,
  RefreshCw,
  Radio,
  Check,
  X,
  Navigation
} from 'lucide-react'
import api from '../api'

export default function CompletionOfTrip() {
  const [activeTrips, setActiveTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  // Confirmation Modal state
  const [tripToComplete, setTripToComplete] = useState(null)

  const fetchActiveTrips = async (isBackground = false) => {
    if (!isBackground) setLoading(true)
    setError(null)
    try {
      const response = await api.get('/trips/active')
      setActiveTrips(response.data)
    } catch (err) {
      console.error('Failed to load active trips:', err)
      setError(err?.response?.data?.message || 'Unable to load active trips from central dispatch.')
    } finally {
      if (!isBackground) setLoading(false)
    }
  }

  useEffect(() => {
    fetchActiveTrips()

    const interval = setInterval(() => {
      fetchActiveTrips(true)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Direct Administrative Trip Completion Action
  const handleConfirmCompletion = async () => {
    if (!tripToComplete) return
    const tripId = tripToComplete._id
    const busNum = tripToComplete.bus?.number || 'Bus'
    const driverName = tripToComplete.driver?.name || 'Driver'

    setMessage(null)
    setError(null)
    setActionLoadingId(tripId)

    try {
      const res = await api.post('/trips/complete', { tripId })
      setMessage(res.data.message || `Trip completed successfully. ${busNum} and ${driverName} are now available.`)
      setActiveTrips(prev => prev.filter(t => t._id !== tripId))
      setTripToComplete(null)
      // Background sync with database source of truth
      fetchActiveTrips(true)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to complete trip.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const formatStartTime = (dateString) => {
    if (!dateString) return 'Just now'
    try {
      const d = new Date(dateString)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    } catch {
      return 'Just now'
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="rounded-[2rem] border border-[#E7D3D0] bg-[#FCEFED] p-8 sm:p-10 shadow-2xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3B2E40] text-[#F35E3E] ring-1 ring-[#3B2E40]/20">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
              </span>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#6173F4]">Sangli Depot Operations</p>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#3B2E40] sm:text-4xl">
              Completion of Trip
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#3B2E40]/75">
              Direct administrative journey completion. Complete any operational trip with one authorized action to safely release the assigned bus and driver for subsequent fleet dispatch.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-[#E7D3D0] bg-white px-4 py-2 text-xs font-semibold text-[#3B2E40]/80">
              Active Trips: <span className="font-bold text-[#3B2E40]">{activeTrips.length}</span>
            </span>
            <button
              onClick={() => fetchActiveTrips(false)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#6173F4]/40 bg-white px-4 py-2 text-xs font-semibold text-[#3B2E40] transition hover:border-[#6173F4] hover:bg-[#F5E0DE]"
              title="Refresh active trips"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#6173F4]" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {message && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <span>{message}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-xs text-emerald-700 hover:text-emerald-950 font-bold">Dismiss</button>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-rose-500/40 bg-rose-50 p-4 text-sm font-semibold text-rose-900 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-xs text-rose-700 hover:text-rose-950 font-bold">Dismiss</button>
          </div>
        )}

        {/* Loading State */}
        {loading && activeTrips.length === 0 && (
          <div className="flex min-h-[260px] flex-col items-center justify-center space-y-3 rounded-3xl border border-[#E7D3D0] bg-white p-8 text-center">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#F35E3E] border-t-transparent" />
            <p className="text-sm font-medium text-[#3B2E40]/70">Loading active journeys…</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && activeTrips.length === 0 && (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-[#E7D3D0] bg-white p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#3B2E40] text-[#FCEFED] mb-4 shadow-sm">
              <Bus className="h-7 w-7 text-[#6173F4]" />
            </div>
            <h3 className="text-xl font-bold text-[#3B2E40]">No Active Trips in Transit</h3>
            <p className="mt-1 max-w-md text-xs text-[#3B2E40]/70 leading-relaxed">
              All Sangli Depot buses and drivers are currently available in the depot. Dispatch new buses through the Goes On Route panel.
            </p>
          </div>
        )}

        {/* Active Trips Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {activeTrips.map((trip) => {
            const busNumber = trip.bus?.number || 'Bus Unassigned'
            const driverName = trip.driver?.name || 'Driver Unassigned'
            const driverPhone = trip.driver?.phone || 'Contact not provided'
            const routeName = trip.routeName || trip.routeId || 'Sangli Route'
            const startTimeFormatted = formatStartTime(trip.startTime)
            const isGpsActive = Boolean(trip.latestLocation && trip.latestLocation.latitude != null)

            return (
              <div
                key={trip._id}
                className="overflow-hidden rounded-[1.75rem] border border-[#E7D3D0] bg-white p-6 shadow-sm transition hover:shadow-md hover:border-[#6173F4]/50 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Bus & Status Badges */}
                  <div className="flex items-center justify-between pb-4 border-b border-[#E7D3D0]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#3B2E40] text-[#6173F4] shadow-sm">
                        <Bus className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider font-bold text-[#3B2E40]/70">Bus Number</p>
                        <h2 className="text-xl font-black text-[#3B2E40] tracking-tight">{busNumber}</h2>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-300 px-3 py-1 text-xs font-bold text-emerald-800">
                        <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                        ACTIVE
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                        isGpsActive ? 'text-[#6173F4]' : 'text-amber-800'
                      }`}>
                        <Radio className="h-3 w-3" />
                        {isGpsActive ? 'GPS Active' : 'GPS Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Trip Details Grid */}
                  <div className="py-5 space-y-3.5 text-xs text-[#3B2E40]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#3B2E40]/70 font-medium flex items-center gap-1.5">
                        <User className="h-4 w-4 text-[#6173F4]" /> Driver Name:
                      </span>
                      <span className="font-bold text-sm text-[#3B2E40]">{driverName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#3B2E40]/70 font-medium flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-[#6173F4]" /> Driver Contact:
                      </span>
                      <span className="font-mono font-semibold text-[#3B2E40]">{driverPhone}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#3B2E40]/70 font-medium flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-[#F35E3E]" /> Selected Route:
                      </span>
                      <span className="font-bold text-[#3B2E40]">{routeName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#3B2E40]/70 font-medium flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-[#6173F4]" /> Trip Started:
                      </span>
                      <span className="font-mono font-semibold text-[#3B2E40]">{startTimeFormatted}</span>
                    </div>
                  </div>
                </div>

                {/* Direct Trip Completion Action Button */}
                <div className="pt-4 border-t border-[#E7D3D0]">
                  <button
                    type="button"
                    onClick={() => setTripToComplete(trip)}
                    disabled={actionLoadingId === trip._id}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F35E3E] px-5 py-3.5 text-sm font-bold text-[#FCEFED] shadow-md transition duration-200 hover:bg-[#E04D2E] focus:outline-none focus:ring-4 focus:ring-[#F35E3E]/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoadingId === trip._id ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Completing Trip...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Complete Trip</span>
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-center text-[11px] text-[#3B2E40]/60">
                    GPS status is informational only and does not restrict completion.
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirmation Dialog Modal */}
      {tripToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-[#E7D3D0] bg-[#FCEFED] p-6 sm:p-8 text-[#3B2E40] shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E7D3D0]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3B2E40] text-[#F35E3E]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-extrabold text-[#3B2E40]">Confirm Trip Completion</h3>
              </div>
              <button
                onClick={() => setTripToComplete(null)}
                className="rounded-full p-1 text-[#3B2E40]/60 hover:bg-[#E7D3D0] hover:text-[#3B2E40]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-5 space-y-3 text-xs leading-relaxed">
              <p className="text-sm font-semibold text-[#3B2E40]">
                Are you sure you want to complete this journey?
              </p>
              <div className="rounded-2xl border border-[#E7D3D0] bg-white p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#3B2E40]/70 font-medium">Bus:</span>
                  <span className="font-bold text-[#3B2E40]">{tripToComplete.bus?.number || 'Bus'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#3B2E40]/70 font-medium">Driver:</span>
                  <span className="font-bold text-[#3B2E40]">{tripToComplete.driver?.name || 'Driver'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#3B2E40]/70 font-medium">Route:</span>
                  <span className="font-bold text-[#3B2E40]">{tripToComplete.routeName || tripToComplete.routeId}</span>
                </div>
              </div>
              <p className="text-[11px] text-[#3B2E40]/70">
                This action will mark the trip COMPLETED, release the driver and bus for subsequent dispatch, and preserve completed records in history.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTripToComplete(null)}
                className="flex-1 rounded-xl border border-[#E7D3D0] bg-white py-3 text-xs font-bold text-[#3B2E40] transition hover:bg-[#F5E0DE]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCompletion}
                disabled={Boolean(actionLoadingId)}
                className="flex-1 rounded-xl bg-[#F35E3E] py-3 text-xs font-bold text-[#FCEFED] shadow-md transition hover:bg-[#E04D2E] disabled:opacity-60"
              >
                {actionLoadingId ? 'Completing...' : 'Yes, Complete Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
