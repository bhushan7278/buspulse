import { useEffect, useState } from 'react'
import api from '../api'
import { routes } from '../routes'

export default function CheckOut() {
  const [routeId, setRouteId] = useState('')
  const [drivers, setDrivers] = useState([])
  const [driverId, setDriverId] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!routeId) {
      setDrivers([])
      setDriverId('')
      return
    }

    const fetchDrivers = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await api.get(`/drivers/present/${routeId}`)
        setDrivers(response.data)
      } catch (err) {
        setError('Unable to load present drivers for this route.')
      } finally {
        setLoading(false)
      }
    }

    fetchDrivers()
  }, [routeId])

  const handleCheckOut = async () => {
    setMessage(null)
    setError(null)

    try {
      const response = await api.post('/check-out', { driverId })
      setMessage('Driver checked out successfully.')
      setDrivers(prev => prev.filter(driver => driver._id !== driverId))
      setDriverId('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to check out driver.')
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6">
      <div className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-10 shadow-[0_35px_60px_-35px_rgba(15,23,42,0.6)]">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex rounded-full bg-rose-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-rose-700">Check Out</p>
            <h2 className="mt-4 text-3xl font-semibold text-slate-950">Driver Check Out</h2>
            <p className="mt-2 text-slate-600">Select a route and mark drivers as off-duty after their shift.</p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-[280px_1fr]">
          <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <label className="block text-sm font-medium text-slate-700">Route</label>
            <select
              value={routeId}
              onChange={e => setRouteId(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-slate-500"
            >
              <option value="">Select route</option>
              {routes.map(route => (
                <option key={route.id} value={route.id}>{route.label}</option>
              ))}
            </select>

            {message && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-700">{message}</div>}
            {error && <div className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">{error}</div>}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-xl font-semibold text-slate-900">Present Drivers</h3>
            {loading && <p className="mt-4 text-slate-500">Loading present drivers…</p>}
            {!loading && drivers.length === 0 && routeId && (
              <p className="mt-4 text-slate-500">No present drivers found for this route.</p>
            )}

            <div className="mt-5 space-y-4">
              {drivers.map(driver => (
                <div key={driver._id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{driver.name}</p>
                      <p className="text-sm text-slate-500">Phone: {driver.phone}</p>
                      <p className="mt-1 text-sm text-slate-500">Status: {driver.status}</p>
                    </div>
                    <button
                      onClick={() => setDriverId(driver._id)}
                      className={`inline-flex rounded-3xl px-5 py-2 text-sm font-semibold transition ${
                        driverId === driver._id
                          ? 'bg-rose-600 text-white'
                          : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      {driverId === driver._id ? 'Selected' : 'Select'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {driverId && (
              <button
                onClick={handleCheckOut}
                className="mt-6 inline-flex w-full justify-center rounded-3xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                Check Out Driver
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
