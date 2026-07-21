import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../api'
import { routes } from '../routes'

export default function GoesOnRoute() {
  const location = useLocation()
  const isCameOnRoute = location.pathname === '/came-on-route'
  const [routeId, setRouteId] = useState('')
  const [drivers, setDrivers] = useState([])
  const [buses, setBuses] = useState([])
  const [driverId, setDriverId] = useState('')
  const [busId, setBusId] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [trackingUrl, setTrackingUrl] = useState(null)
  const [assignedDriverPhone, setAssignedDriverPhone] = useState('')

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
          api.get(`/buses/available/${routeId}`)
        ])
        setDrivers(driversRes.data)
        setBuses(busesRes.data)
      } catch (err) {
        setError('Unable to load available drivers or buses.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [routeId])

  const handleSendLink = async () => {
    setMessage(null)
    setError(null)
    setTrackingUrl(null)
    setAssignedDriverPhone('')

    try {
      const selectedDriver = drivers.find(d => d._id === driverId)
      const response = await api.post('/start-trip', {
        routeId,
        driverId,
        busId
      })
      
      let dynamicUrl = response.data.trackingUrl || `${window.location.origin}/track?tripId=${response.data.tripId}`
      
      // WhatsApp doesn't highlight local IPs or 'localhost' as clickable blue links.
      // We convert them to a valid domain using nip.io wildcard DNS.
      try {
        const urlObj = new URL(dynamicUrl)
        if (urlObj.hostname === 'localhost') {
          urlObj.hostname = '127.0.0.1.nip.io'
        } else if (/^\d+\.\d+\.\d+\.\d+$/.test(urlObj.hostname)) {
          urlObj.hostname = `${urlObj.hostname}.nip.io`
        }
        dynamicUrl = urlObj.toString()
      } catch (e) {
        console.error("URL parsing error", e)
      }

      setTrackingUrl(dynamicUrl)
      
      if (selectedDriver) {
        setAssignedDriverPhone(selectedDriver.phone)
        const phone = selectedDriver.phone.replace(/\D/g, '')
        const wLink = `https://wa.me/${phone}?text=${encodeURIComponent(dynamicUrl)}`
        window.open(wLink, '_blank')
      }
      
      setMessage('Trip started successfully. WhatsApp opened to send tracking link.')
      setDrivers(prev => prev.filter(driver => driver._id !== driverId))
      setBuses(prev => prev.filter(bus => bus._id !== busId))
      setDriverId('')
      setBusId('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to start trip.')
    }
  }

  const isReady = routeId && driverId && busId
  const formattedPhone = assignedDriverPhone ? assignedDriverPhone.replace(/\D/g, '') : ''
  const whatsappLink = trackingUrl ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(trackingUrl)}` : ''

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
      <div className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-10 shadow-[0_35px_60px_-35px_rgba(15,23,42,0.6)]">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">{isCameOnRoute ? 'Came On Route' : 'Goes On Route'}</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950">Assign route, driver, and bus</h2>
          </div>
          <p className="max-w-xl text-slate-600">Select a route, pick a free driver, and choose a free bus number to start the trip.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">Route configuration</h3>
            <p className="mt-2 text-sm text-slate-500">Pick a route first to load available resources.</p>
            <label className="mt-6 block text-sm font-medium text-slate-700">Route</label>
            <select
              value={routeId}
              onChange={e => setRouteId(e.target.value)}
              className="mt-3 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-sky-500"
            >
              <option value="">Select route</option>
              {routes.map(route => (
                <option key={route.id} value={route.id}>{route.label}</option>
              ))}
            </select>

            <div className="mt-6 space-y-3">
              {message && <div className="rounded-3xl bg-emerald-50 px-4 py-3 text-emerald-700 shadow-sm">{message}</div>}
              {error && <div className="rounded-3xl bg-rose-50 px-4 py-3 text-rose-700 shadow-sm">{error}</div>}
              {trackingUrl && (
                <div className="rounded-3xl bg-slate-50 px-4 py-3 text-slate-700 shadow-sm flex flex-col gap-3">
                  <p>Tracking Link: <a className="font-semibold text-slate-900 underline hover:text-sky-600" href={trackingUrl} target="_blank" rel="noreferrer">Open Link Locally</a></p>
                  <a className="inline-flex w-full items-center justify-center rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1ebd5c]" href={whatsappLink} target="_blank" rel="noreferrer">
                    Send Link on WhatsApp
                  </a>
                </div>
              )}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Available Drivers</h3>
                  <p className="mt-1 text-sm text-slate-500">Choose one driver for departure.</p>
                </div>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Driver pool</span>
              </div>
              {loading && <p className="mt-4 text-slate-500">Loading available drivers…</p>}
              {!loading && drivers.length === 0 && routeId && <p className="mt-4 text-slate-500">No available driver found. Ensure attendance is present and status is free.</p>}
              <div className="mt-4 space-y-4">
                {drivers.map(driver => (
                  <label key={driver._id} className="flex cursor-pointer items-center justify-between gap-4 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 text-slate-900 transition hover:border-slate-300">
                    <div>
                      <p className="font-semibold">{driver.name}</p>
                      <p className="text-sm text-slate-500">Phone: {driver.phone}</p>
                    </div>
                    <input
                      type="radio"
                      name="driver"
                      value={driver._id}
                      checked={driverId === driver._id}
                      onChange={() => setDriverId(driver._id)}
                      className="h-5 w-5 text-slate-900"
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Available Buses</h3>
                  <p className="mt-1 text-sm text-slate-500">Pick a bus that matches the route.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">Fleet</span>
              </div>
              {loading && <p className="mt-4 text-slate-500">Loading free buses…</p>}
              {!loading && buses.length === 0 && routeId && <p className="mt-4 text-slate-500">No free buses available for this route.</p>}
              <div className="mt-4 space-y-4">
                {buses.map(bus => (
                  <label key={bus._id} className="flex cursor-pointer items-center justify-between gap-4 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 text-slate-900 transition hover:border-slate-300">
                    <div>
                      <p className="font-semibold">{bus.number}</p>
                      <p className="text-sm text-slate-500">Route: {bus.routeId}</p>
                    </div>
                    <input
                      type="radio"
                      name="bus"
                      value={bus._id}
                      checked={busId === bus._id}
                      onChange={() => setBusId(bus._id)}
                      className="h-5 w-5 text-slate-900"
                    />
                  </label>
                ))}
              </div>
            </section>

            <button
              disabled={!isReady}
              onClick={handleSendLink}
              className="inline-flex w-full justify-center rounded-3xl bg-slate-950 px-6 py-4 text-sm font-semibold text-white transition duration-200 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Send Link
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
