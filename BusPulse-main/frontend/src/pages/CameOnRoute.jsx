import { useEffect, useState } from 'react'
import api from '../api'
import { routes } from '../routes'

export default function CameOnRoute() {
  const [routeId, setRouteId] = useState('')
  const [drivers, setDrivers] = useState([])
  const [buses, setBuses] = useState([])
  const [driverId, setDriverId] = useState('')
  const [busId, setBusId] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

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
          api.get(`/drivers/busy/${routeId}`),
          api.get(`/buses/busy/${routeId}`)
        ])
        setDrivers(driversRes.data)
        setBuses(busesRes.data)
      } catch (err) {
        setError('Unable to load busy drivers or buses.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [routeId])

  const handleMarkFree = async () => {
    setMessage(null)
    setError(null)

    try {
      await api.post('/free-resources', {
        routeId,
        driverId,
        busId
      })
      setMessage('Driver and bus marked as free successfully.')
      setDrivers(prev => prev.filter(driver => driver._id !== driverId))
      setBuses(prev => prev.filter(bus => bus._id !== busId))
      setDriverId('')
      setBusId('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to mark as free.')
    }
  }

  const isReady = routeId && driverId && busId

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
      <div className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-10 shadow-[0_35px_60px_-35px_rgba(15,23,42,0.6)]">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Came On Route</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950">Mark driver and bus as free</h2>
          </div>
          <p className="max-w-xl text-slate-600">Select a route, pick a busy driver, and choose a busy bus to mark them as free.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">Route configuration</h3>
            <p className="mt-2 text-sm text-slate-500">Pick a route first to load busy resources.</p>
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
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Busy Drivers</h3>
                  <p className="mt-1 text-sm text-slate-500">Choose one driver to mark as free.</p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Busy</span>
              </div>
              {loading && <p className="mt-4 text-slate-500">Loading busy drivers…</p>}
              {!loading && drivers.length === 0 && routeId && <p className="mt-4 text-slate-500">No busy drivers found for this route.</p>}
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
                  <h3 className="text-xl font-semibold text-slate-900">Busy Buses</h3>
                  <p className="mt-1 text-sm text-slate-500">Pick a bus to mark as free.</p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Busy</span>
              </div>
              {loading && <p className="mt-4 text-slate-500">Loading busy buses…</p>}
              {!loading && buses.length === 0 && routeId && <p className="mt-4 text-slate-500">No busy buses available for this route.</p>}
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
              onClick={handleMarkFree}
              className="inline-flex w-full justify-center rounded-3xl bg-slate-950 px-6 py-4 text-sm font-semibold text-white transition duration-200 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Mark as Free
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}