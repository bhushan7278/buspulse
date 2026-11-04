import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ExternalLink,
  Copy,
  Check,
  Globe,
  AlertTriangle,
  Send,
  Bus,
  User,
  MapPin,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import api from '../api'
import { routes } from '../routes'
import {
  buildWhatsAppTrackingMessage,
  buildWhatsAppClickToChatUrl
} from '../utils/whatsapp'

/**
 * Checks whether a URL or host is a loopback address
 */
const isLoopbackAddress = (urlOrHost) => {
  if (!urlOrHost || typeof urlOrHost !== 'string') return true
  const lower = urlOrHost.toLowerCase().trim()
  return (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('0.0.0.0') ||
    lower.includes('nip.io') ||
    lower.includes('::1')
  )
}

export default function GoesOnRoute() {
  const [searchParams] = useSearchParams()
  const initialRoute = searchParams.get('routeId') || ''
  const [routeId, setRouteId] = useState(initialRoute)
  const [drivers, setDrivers] = useState([])
  const [buses, setBuses] = useState([])
  const [driverId, setDriverId] = useState('')
  const [busId, setBusId] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [trackingUrl, setTrackingUrl] = useState(null)
  const [assignedDriverPhone, setAssignedDriverPhone] = useState('')
  const [dispatchedTrip, setDispatchedTrip] = useState(null)
  const [copied, setCopied] = useState(false)

  // Configurable public tracking base URL
  const initialPublicUrl =
    import.meta.env.VITE_PUBLIC_TRACKING_URL ||
    localStorage.getItem('buspulse_public_tracking_url') ||
    ''
  const [customPublicUrl, setCustomPublicUrl] = useState(initialPublicUrl)
  const [showUrlConfig, setShowUrlConfig] = useState(false)

  useEffect(() => {
    if (!routeId) {
      setDrivers([])
      setBuses([])
      setDriverId('')
      setBusId('')
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [driversRes, busesRes] = await Promise.all([
          api.get(`/drivers/available/${routeId}`),
          api.get('/buses/available')
        ])
        setDrivers(driversRes.data)
        setBuses(busesRes.data)
      } catch {
        setError('Unable to load available drivers or fleet buses.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [routeId])

  const handleSavePublicUrl = (e) => {
    e.preventDefault()
    const trimmed = customPublicUrl.trim().replace(/\/+$/, '')
    if (trimmed && isLoopbackAddress(trimmed)) {
      setError("Cannot use a loopback address (localhost / 127.0.0.1) as the public mobile tracking URL. Please use your computer's LAN IP (e.g. http://10.179.53.225:5173) or an HTTPS tunnel URL.")
      return
    }
    localStorage.setItem('buspulse_public_tracking_url', trimmed)
    setCustomPublicUrl(trimmed)
    setShowUrlConfig(false)
    setMessage('Public mobile tracking URL saved successfully.')
  }

  const handleCopyLink = () => {
    if (!trackingUrl) return
    navigator.clipboard.writeText(trackingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleSendLink = async () => {
    setMessage(null)
    setError(null)
    setTrackingUrl(null)
    setAssignedDriverPhone('')
    setCopied(false)

    try {
      const selectedDriver = drivers.find(d => d._id === driverId)
      const selectedBus = buses.find(b => b._id === busId)
      const selectedRoute = routes.find(r => r.id === routeId)

      const response = await api.post('/start-trip', {
        routeId,
        driverId,
        busId
      })

      const tripId = response.data.tripId

      // Determine mobile-accessible tracking base URL
      let resolvedBase = customPublicUrl.trim().replace(/\/+$/, '')

      if (!resolvedBase || isLoopbackAddress(resolvedBase)) {
        // Fallback to response.data.trackingUrl if non-loopback
        const backendTracking = response.data.trackingUrl
        if (backendTracking && !isLoopbackAddress(backendTracking)) {
          try {
            const parsed = new URL(backendTracking)
            resolvedBase = parsed.origin
          } catch {
            // ignore parsing error
          }
        }
      }

      if (!resolvedBase || isLoopbackAddress(resolvedBase)) {
        // Fallback to window.location.origin if non-loopback
        if (!isLoopbackAddress(window.location.origin)) {
          resolvedBase = window.location.origin
        }
      }

      // Check if we are still on loopback
      if (!resolvedBase || isLoopbackAddress(resolvedBase)) {
        setError(
          "Mobile Access Warning: Cannot generate a mobile WhatsApp tracking link using 'localhost' or '127.0.0.1'. When tapped on a phone, localhost points to the phone itself (causing ERR_CONNECTION_REFUSED). Please set your computer's LAN IP (e.g. http://10.179.53.225:5173) or public HTTPS tunnel URL below."
        )
        setShowUrlConfig(true)
        return
      }

      // Complete URL format without double encoding: http://10.179.53.225:5173/track?tripId=ACTUAL_TRIP_ID
      const generatedTrackingUrl = `${resolvedBase}/track?tripId=${tripId}`
      setTrackingUrl(generatedTrackingUrl)

      const routeName = selectedRoute?.label || selectedRoute?.name || routeId
      const busNumber = selectedBus?.number || 'BUS-101'
      const driverPhone = selectedDriver?.phone || ''

      const tripPayload = {
        tripId,
        routeName,
        busNumber,
        driverPhone,
        trackingUrl: generatedTrackingUrl
      }
      setDispatchedTrip(tripPayload)

      if (selectedDriver) {
        setAssignedDriverPhone(driverPhone)

        // Generate the standardized standalone plain WhatsApp tracking message
        const messageText = buildWhatsAppTrackingMessage({
          tripId,
          routeName,
          busNumber,
          trackingUrl: generatedTrackingUrl
        })

        // Verification: ensure decoded message matches original text exactly (no double encoding)
        const encodedText = encodeURIComponent(messageText)
        const decodedCheck = decodeURIComponent(encodedText)
        if (decodedCheck !== messageText) {
          console.warn('WhatsApp message encoding mismatch detected!')
        }

        const wLink = buildWhatsAppClickToChatUrl({
          phone: driverPhone,
          messageText
        })

        console.log('[BusPulse WhatsApp Dispatch] Decoded Message:\n' + messageText)
        console.log('[BusPulse WhatsApp Dispatch] Generated wa.me Link:\n' + wLink)

        window.open(wLink, '_blank')
      }

      setMessage('Trip dispatched successfully. WhatsApp opened with clickable mobile driver tracking link.')
      setDrivers(prev => prev.filter(driver => driver._id !== driverId))
      setBuses(prev => prev.filter(bus => bus._id !== busId))
      setDriverId('')
      setBusId('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to dispatch trip. Please verify connection.')
    }
  }

  const isReady = routeId && driverId && busId
  const formattedPhone = assignedDriverPhone ? assignedDriverPhone.replace(/\D/g, '') : ''
  const fullPhone = formattedPhone.length === 10 ? `91${formattedPhone}` : formattedPhone

  const resendWhatsAppLink = useMemo(() => {
    if (!dispatchedTrip) return ''
    const messageText = buildWhatsAppTrackingMessage({
      tripId: dispatchedTrip.tripId,
      routeName: dispatchedTrip.routeName,
      busNumber: dispatchedTrip.busNumber,
      trackingUrl: dispatchedTrip.trackingUrl
    })
    return buildWhatsAppClickToChatUrl({
      phone: dispatchedTrip.driverPhone,
      messageText
    })
  }, [dispatchedTrip])

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="rounded-[2rem] border border-[#E7D3D0] bg-[#FCEFED] p-6 sm:p-10 shadow-2xl text-[#3B2E40]">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[#E7D3D0] pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#6173F4]/40 bg-white px-3.5 py-1 text-xs font-bold uppercase tracking-[0.25em] text-[#6173F4] shadow-sm mb-3">
              <Bus className="h-3.5 w-3.5" />
              <span>Fleet Dispatch</span>
            </div>
            <h1 className="text-3xl font-extrabold text-[#3B2E40]">Goes On Route</h1>
            <p className="mt-1 text-sm text-[#3B2E40]/75">
              Assign a route, select a present & free driver, and allocate an available fleet bus to dispatch a coherent trip.
            </p>
          </div>

          {/* Public Tracking Base URL configuration button */}
          <button
            type="button"
            onClick={() => setShowUrlConfig(!showUrlConfig)}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-[#E7D3D0] bg-white px-4 py-2 text-xs font-bold text-[#3B2E40] shadow-sm transition hover:bg-[#FCEFED]"
          >
            <Globe className="h-3.5 w-3.5 text-[#6173F4]" />
            <span>Mobile URL Config</span>
          </button>
        </div>

        {/* Public URL Config Drawer */}
        {showUrlConfig && (
          <form onSubmit={handleSavePublicUrl} className="mb-6 rounded-2xl border border-[#6173F4]/30 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#6173F4]">
                <Globe className="h-4 w-4" />
                <span>Mobile Public Tracking Base URL</span>
              </div>
              <span className="text-[11px] text-[#3B2E40]/60">Must be reachable from mobile phones</span>
            </div>

            <p className="text-xs text-[#3B2E40]/80 leading-relaxed">
              When a driver opens WhatsApp on their phone, loopback addresses (<code className="font-mono bg-[#FCEFED] px-1 py-0.5 rounded text-rose-700">localhost</code> / <code className="font-mono bg-[#FCEFED] px-1 py-0.5 rounded text-rose-700">127.0.0.1</code>) fail with <code className="font-mono font-bold text-rose-700">ERR_CONNECTION_REFUSED</code>.
              For local Wi-Fi testing, enter your computer&apos;s LAN IP (e.g. <span className="font-mono font-semibold text-[#6173F4]">http://10.179.53.225:5173</span>). For production, enter your HTTPS tunnel or public domain.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customPublicUrl}
                onChange={(e) => setCustomPublicUrl(e.target.value)}
                placeholder="e.g. http://10.179.53.225:5173 or https://your-tunnel.ngrok-free.app"
                className="flex-1 rounded-xl border border-[#E7D3D0] bg-[#FCEFED] px-3.5 py-2.5 text-xs font-mono text-[#3B2E40] outline-none transition focus:border-[#6173F4] focus:ring-2 focus:ring-[#6173F4]/20"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#6173F4] px-5 py-2.5 text-xs font-bold text-[#FCEFED] shadow-sm transition hover:bg-[#4E60E2]"
              >
                Save Mobile Base URL
              </button>
            </div>
          </form>
        )}

        {/* Status Alerts */}
        {message && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 shadow-sm">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600 mt-0.5" />
            <p>{message}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-50 p-4 text-sm font-semibold text-rose-900 shadow-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Route Selection and Action Panel */}
          <section className="space-y-6">
            <div className="rounded-3xl border border-[#E7D3D0] bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-[#3B2E40] border-b border-[#E7D3D0] pb-2">
                1. Select Route
              </h3>
              <p className="mt-1 text-xs text-[#3B2E40]/70">Pick a route to load available drivers and buses.</p>

              <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-[#3B2E40]/80">Route</label>
              <select
                value={routeId}
                onChange={e => setRouteId(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-[#E7D3D0] bg-[#FCEFED] px-4 py-3 text-sm text-[#3B2E40] shadow-sm outline-none transition focus:border-[#6173F4] focus:ring-2 focus:ring-[#6173F4]/20"
              >
                <option value="">Select outward route</option>
                {routes.map(route => (
                  <option key={route.id} value={route.id} className="bg-white text-[#3B2E40]">
                    {route.label || route.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Generated Tracking Link Panel */}
            {trackingUrl && (
              <div className="rounded-3xl border border-[#E7D3D0] bg-white p-5 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#E7D3D0] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6173F4]">
                    Mobile Tracking Link Generated
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Active
                  </span>
                </div>

                <div className="rounded-xl border border-[#E7D3D0] bg-[#FCEFED] p-2.5 font-mono text-[11px] text-[#3B2E40] break-all select-all">
                  {trackingUrl}
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex gap-2">
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#6173F4] bg-white px-3 py-2 text-xs font-bold text-[#6173F4] shadow-sm transition hover:bg-[#6173F4] hover:text-[#FCEFED]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open Link</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E7D3D0] bg-white px-3 py-2 text-xs font-bold text-[#3B2E40] shadow-sm transition hover:bg-[#FCEFED]"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-[#6173F4]" />}
                      <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                  </div>

                  <a
                    href={resendWhatsAppLink || `https://wa.me/${fullPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#1ebd5c]"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Resend on WhatsApp</span>
                  </a>
                </div>
              </div>
            )}
          </section>

          {/* Driver & Bus Allocation Lists */}
          <div className="space-y-6">
            {/* Drivers List */}
            <section className="rounded-3xl border border-[#E7D3D0] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E7D3D0] pb-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#3B2E40]">2. Available Drivers</h3>
                  <p className="mt-0.5 text-xs text-[#3B2E40]/70">Present & free drivers eligible for dispatch.</p>
                </div>
                <span className="rounded-full bg-[#6173F4]/15 px-3 py-1 text-xs font-bold text-[#6173F4]">
                  {drivers.length} Available
                </span>
              </div>

              {loading && <p className="text-xs text-[#3B2E40]/70">Loading available drivers…</p>}
              {!loading && drivers.length === 0 && routeId && (
                <p className="text-xs text-[#3B2E40]/70">No available drivers found for this route. Ensure drivers are marked present.</p>
              )}

              <div className="space-y-2.5">
                {drivers.map(driver => (
                  <label
                    key={driver._id}
                    className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition shadow-sm ${
                      driverId === driver._id
                        ? 'border-[#6173F4] bg-[#6173F4]/10 text-[#3B2E40]'
                        : 'border-[#E7D3D0] bg-[#FCEFED] text-[#3B2E40] hover:border-[#6173F4]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm text-[#6173F4]">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#3B2E40]">{driver.name}</p>
                        <p className="text-xs text-[#3B2E40]/70">Phone: {driver.phone}</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="driver"
                      value={driver._id}
                      checked={driverId === driver._id}
                      onChange={() => setDriverId(driver._id)}
                      className="h-4 w-4 accent-[#F35E3E]"
                    />
                  </label>
                ))}
              </div>
            </section>

            {/* Buses List */}
            <section className="rounded-3xl border border-[#E7D3D0] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E7D3D0] pb-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#3B2E40]">3. Available Fleet Buses</h3>
                  <p className="mt-0.5 text-xs text-[#3B2E40]/70">Free buses available globally across Sangli Depot.</p>
                </div>
                <span className="rounded-full bg-[#6173F4]/15 px-3 py-1 text-xs font-bold text-[#6173F4]">
                  {buses.length} Available
                </span>
              </div>

              {loading && <p className="text-xs text-[#3B2E40]/70">Loading fleet buses…</p>}
              {!loading && buses.length === 0 && routeId && (
                <p className="text-xs text-[#3B2E40]/70">No free buses currently available in the fleet.</p>
              )}

              <div className="space-y-2.5">
                {buses.map(bus => (
                  <label
                    key={bus._id}
                    className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition shadow-sm ${
                      busId === bus._id
                        ? 'border-[#6173F4] bg-[#6173F4]/10 text-[#3B2E40]'
                        : 'border-[#E7D3D0] bg-[#FCEFED] text-[#3B2E40] hover:border-[#6173F4]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm text-[#6173F4]">
                        <Bus className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#3B2E40]">{bus.number}</p>
                        <p className="text-xs text-[#3B2E40]/70">Fleet Status: Available</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="bus"
                      value={bus._id}
                      checked={busId === bus._id}
                      onChange={() => setBusId(bus._id)}
                      className="h-4 w-4 accent-[#F35E3E]"
                    />
                  </label>
                ))}
              </div>
            </section>

            {/* Submit Action */}
            <button
              type="button"
              disabled={!isReady}
              onClick={handleSendLink}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#F35E3E] px-6 py-4 text-sm font-bold text-[#FCEFED] shadow-lg transition duration-200 hover:bg-[#E04D2E] disabled:cursor-not-allowed disabled:bg-[#E7D3D0] disabled:text-[#3B2E40]/40"
            >
              <Send className="h-4 w-4" />
              <span>Dispatch Trip & Send WhatsApp Link</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
