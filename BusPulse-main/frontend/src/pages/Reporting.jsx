import { useEffect, useState } from 'react'
import api from '../api'
import { routes } from '../routes'

export default function Reporting() {
  const [routeId, setRouteId] = useState('')
  const [drivers, setDrivers] = useState([])
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!routeId) {
      setDrivers([])
      return
    }

    const fetchDrivers = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await api.get(`/drivers/${routeId}`)
        setDrivers(response.data)
      } catch (err) {
        setError('Unable to load drivers for this route.')
      } finally {
        setLoading(false)
      }
    }

    fetchDrivers()
  }, [routeId])

  const handleMarkPresent = async driverId => {
    setMessage(null)
    setError(null)

    try {
      await api.post('/attendance', { routeId, driverId })
      setMessage('Attendance saved successfully.')
      setDrivers(prev => prev.map(driver => driver._id === driverId ? { ...driver, attendanceStatus: 'present' } : driver))
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save attendance.')
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
      <div className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-10 shadow-[0_35px_60px_-35px_rgba(15,23,42,0.6)]">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Driver Attendance</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950">Mark attendance with confidence</h2>
          </div>
          <p className="max-w-xl text-slate-600">Choose a route, pick a driver, and update attendance quickly with clear status and feedback messages.</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Route selector</h3>
                <p className="mt-1 text-sm text-slate-500">Select a route to review available drivers.</p>
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Live</span>
            </div>

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

          <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Drivers</h3>
                <p className="mt-1 text-sm text-slate-500">Review driver attendance and update status.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">Roster</span>
            </div>

            {loading && <p className="text-slate-500">Loading drivers…</p>}
            {!loading && drivers.length === 0 && routeId && <p className="text-slate-500">No drivers are assigned to this route.</p>}

            <div className="mt-4 space-y-4">
              {drivers.map(driver => (
                <div key={driver._id} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{driver.name}</p>
                      <p className="mt-1 text-sm text-slate-500">Phone: {driver.phone}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Attendance:
                        <span className="ml-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">{driver.attendanceStatus || 'Absent'}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleMarkPresent(driver._id)}
                      disabled={driver.attendanceStatus === 'present'}
                      className="inline-flex min-w-[150px] justify-center rounded-3xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition duration-200 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {driver.attendanceStatus === 'present' ? 'Present' : 'Mark Present'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
