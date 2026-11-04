import { useEffect, useState, useMemo } from 'react'
import { Search, UserPlus, CheckCircle2, AlertCircle, X, Phone, MapPin, ShieldCheck, RefreshCw } from 'lucide-react'
import api from '../api'
import { routes } from '../routes'
import ReportingSubNav from '../components/ReportingSubNav'

export default function Reporting() {
  const [drivers, setDrivers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  // Add Driver Form State
  const [showAddModal, setShowAddModal] = useState(false)
  const [newDriverName, setNewDriverName] = useState('')
  const [newDriverPhone, setNewDriverPhone] = useState('')
  const [newDriverRoute, setNewDriverRoute] = useState(routes[0]?.id || 'R1')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState(null)
  const [addSuccess, setAddSuccess] = useState(null)

  // Fetch depot-wide drivers
  const fetchDepotDrivers = async (query = '') => {
    setLoading(true)
    setError(null)
    try {
      const url = query ? `/drivers?search=${encodeURIComponent(query)}` : '/drivers'
      const response = await api.get(url)
      setDrivers(response.data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load depot drivers.')
    } finally {
      setLoading(false)
    }
  }

  // Load all depot drivers on mount
  useEffect(() => {
    fetchDepotDrivers()
  }, [])

  // Handle Search Input with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDepotDrivers(searchQuery.trim())
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Mark Driver Present (Route-Independent Depot Attendance)
  const handleMarkPresent = async (driverId) => {
    setMessage(null)
    setError(null)
    setActionLoadingId(driverId)

    try {
      const response = await api.post('/attendance', { driverId })
      setMessage(response.data.message || 'Attendance saved successfully.')
      // Immediately update local state without full reload
      setDrivers(prev =>
        prev.map(driver =>
          driver._id === driverId
            ? { ...driver, attendanceStatus: 'present' }
            : driver
        )
      )
    } catch (err) {
      if (err?.response?.status === 409) {
        // Attendance already recorded for today
        setMessage(err.response.data.message || 'Attendance already marked for today.')
        setDrivers(prev =>
          prev.map(driver =>
            driver._id === driverId
              ? { ...driver, attendanceStatus: 'present' }
              : driver
          )
        )
      } else {
        setError(err?.response?.data?.message || 'Unable to save attendance.')
      }
    } finally {
      setActionLoadingId(null)
    }
  }

  // Handle Add Driver Form Submission
  const handleAddDriver = async (e) => {
    e.preventDefault()
    setAddError(null)
    setAddSuccess(null)

    if (!newDriverName.trim() || newDriverName.trim().length < 2) {
      setAddError('Driver name is required (at least 2 characters).')
      return
    }

    if (!newDriverPhone.trim() || newDriverPhone.trim().length < 7) {
      setAddError('Please enter a valid contact phone number.')
      return
    }

    setAddLoading(true)
    try {
      const response = await api.post('/drivers', {
        name: newDriverName.trim(),
        phone: newDriverPhone.trim(),
        routeId: newDriverRoute
      })

      setAddSuccess(response.data.message || 'Driver registered successfully.')
      setNewDriverName('')
      setNewDriverPhone('')
      setNewDriverRoute(routes[0]?.id || 'R1')

      // Refresh list
      await fetchDepotDrivers(searchQuery.trim())

      setTimeout(() => {
        setShowAddModal(false)
        setAddSuccess(null)
      }, 1200)
    } catch (err) {
      setAddError(err?.response?.data?.message || 'Failed to register new driver.')
    } finally {
      setAddLoading(false)
    }
  }

  const presentCount = useMemo(() => {
    return drivers.filter(d => d.attendanceStatus === 'present').length
  }, [drivers])

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Subpage Navigation Component */}
      <ReportingSubNav />

      {/* Main Container Card: Shell Light Surface */}
      <div className="rounded-[2.5rem] border border-[#E7D3D0] bg-[#FCEFED] p-6 sm:p-10 shadow-2xl">
        {/* Header Section */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3B2E40] text-[#6173F4] ring-1 ring-[#3B2E40]/20">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#6173F4]">Depot Operations</p>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#3B2E40] sm:text-4xl">
              Depot Driver Attendance & Roster
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#3B2E40]/75 sm:text-base">
              Mark reporting attendance depot-wide for all drivers as they report for duty. Attendance is recorded at the depot level and is independent of individual routes.
            </p>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-2xl border border-[#E7D3D0] bg-white px-5 py-3 shadow-inner">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#3B2E40]/70">Depot Drivers</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#3B2E40]">{drivers.length}</span>
                <span className="text-xs font-bold text-[#6173F4]">({presentCount} Present)</span>
              </div>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#F35E3E] px-5 py-3.5 text-sm font-bold text-[#FCEFED] shadow-lg transition-all hover:bg-[#E04D2E] focus:outline-none focus:ring-4 focus:ring-[#F35E3E]/30"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add New Driver</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {message && (
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-50 px-5 py-3.5 text-sm font-semibold text-emerald-900 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <span>{message}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-emerald-700 hover:text-emerald-950">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-rose-500/40 bg-rose-50 px-5 py-3.5 text-sm font-semibold text-rose-900 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-950">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Driver Search & Filter Bar */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6173F4]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search driver by name (e.g. Prasad, Rahul)..."
              className="w-full rounded-2xl border border-[#E7D3D0] bg-white pl-12 pr-10 py-3.5 text-sm text-[#3B2E40] placeholder-[#3B2E40]/45 outline-none transition-all focus:border-[#6173F4] focus:ring-2 focus:ring-[#6173F4]/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3B2E40]/60 hover:text-[#3B2E40]"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#3B2E40]/70">
            <span>Showing:</span>
            <span className="rounded-full bg-[#3B2E40] px-3 py-1 text-[#FCEFED]">{drivers.length} Driver{drivers.length !== 1 ? 's' : ''}</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="ml-2 text-[#6173F4] hover:underline"
              >
                Reset Search
              </button>
            )}
          </div>
        </div>

        {/* Driver Roster Grid */}
        <div className="mt-8">
          {loading && (
            <div className="flex min-h-[220px] flex-col items-center justify-center space-y-3 rounded-3xl border border-[#E7D3D0] bg-white p-8 text-center">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#F35E3E] border-t-transparent" />
              <p className="text-sm font-medium text-[#3B2E40]/70">Loading depot driver roster...</p>
            </div>
          )}

          {!loading && drivers.length === 0 && (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-[#E7D3D0] bg-white p-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#3B2E40] text-[#6173F4]">
                <Search className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-[#3B2E40]">
                {searchQuery ? `No drivers match "${searchQuery}"` : 'No depot drivers registered yet'}
              </h3>
              <p className="mt-1 max-w-md text-sm text-[#3B2E40]/70">
                {searchQuery
                  ? 'Try searching with a different spelling or clear the filter to view the entire depot roster.'
                  : 'Click "Add New Driver" above to register drivers into the depot system.'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 rounded-xl bg-[#6173F4] px-4 py-2 text-xs font-semibold text-[#FCEFED] hover:bg-[#4E60E6]"
                >
                  Clear Search Filter
                </button>
              )}
            </div>
          )}

          {!loading && drivers.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {drivers.map(driver => {
                const isPresent = driver.attendanceStatus === 'present'
                const isActionLoading = actionLoadingId === driver._id

                return (
                  <div
                    key={driver._id}
                    className="flex flex-col justify-between rounded-3xl border border-[#E7D3D0] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6173F4] hover:shadow-md sm:p-6"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-[#3B2E40]">{driver.name}</h3>
                          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-[#3B2E40]/70">
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5 text-[#6173F4]" />
                              <span>{driver.phone}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#FCEFED] px-2 py-0.5 text-[11px] font-semibold text-[#3B2E40] ring-1 ring-[#E7D3D0]">
                              <MapPin className="h-3 w-3 text-[#6173F4]" />
                              <span>Assigned: {driver.routeId || 'Depot'}</span>
                            </span>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-col items-end gap-1.5">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                              isPresent
                                ? 'border border-emerald-500/40 bg-emerald-50 text-emerald-800'
                                : 'border border-rose-500/30 bg-rose-50 text-rose-800'
                            }`}
                          >
                            {isPresent ? 'Present' : 'Not Reported'}
                          </span>
                          <span className="text-[10px] uppercase tracking-widest text-[#3B2E40]/60">
                            Duty: {driver.status === 'busy' ? 'On Trip' : 'Available'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-[#E7D3D0] pt-4">
                      <span className="text-xs text-[#3B2E40]/70">
                        {isPresent ? 'Reported on duty for today' : 'Awaiting reporting check-in'}
                      </span>

                      <button
                        onClick={() => handleMarkPresent(driver._id)}
                        disabled={isPresent || isActionLoading}
                        className={`inline-flex min-w-[130px] items-center justify-center rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm ${
                          isPresent
                            ? 'cursor-not-allowed bg-[#E7D3D0]/60 text-[#3B2E40]/50 ring-1 ring-[#E7D3D0]'
                            : 'bg-[#F35E3E] text-[#FCEFED] hover:bg-[#E04D2E] focus:outline-none focus:ring-2 focus:ring-[#F35E3E]/40'
                        }`}
                      >
                        {isActionLoading ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>Saving...</span>
                          </div>
                        ) : isPresent ? (
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Marked Present</span>
                          </span>
                        ) : (
                          <span>Mark Present</span>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add New Driver Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3B2E40]/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#E7D3D0] bg-[#FCEFED] p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-[#E7D3D0] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F35E3E] text-[#FCEFED] shadow-inner">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#3B2E40]">Register New Driver</h3>
                  <p className="text-xs text-[#3B2E40]/70">Add a driver to the depot roster</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setAddError(null)
                  setAddSuccess(null)
                }}
                className="rounded-lg p-1.5 text-[#3B2E40]/60 hover:bg-[#E7D3D0] hover:text-[#3B2E40]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {addError && (
              <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                {addError}
              </div>
            )}

            {addSuccess && (
              <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                {addSuccess}
              </div>
            )}

            <form onSubmit={handleAddDriver} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3B2E40]/80">
                  Full Name <span className="text-[#F35E3E]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  placeholder="e.g. Ramesh Patil"
                  className="mt-1.5 w-full rounded-2xl border border-[#E7D3D0] bg-white px-4 py-3 text-sm text-[#3B2E40] outline-none transition focus:border-[#6173F4] focus:ring-2 focus:ring-[#6173F4]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3B2E40]/80">
                  Contact Phone Number <span className="text-[#F35E3E]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={newDriverPhone}
                  onChange={(e) => setNewDriverPhone(e.target.value)}
                  placeholder="e.g. +919876543210"
                  className="mt-1.5 w-full rounded-2xl border border-[#E7D3D0] bg-white px-4 py-3 text-sm text-[#3B2E40] outline-none transition focus:border-[#6173F4] focus:ring-2 focus:ring-[#6173F4]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3B2E40]/80">
                  Default Assigned Route <span className="text-[#F35E3E]">*</span>
                </label>
                <select
                  value={newDriverRoute}
                  onChange={(e) => setNewDriverRoute(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-[#E7D3D0] bg-white px-4 py-3 text-sm text-[#3B2E40] outline-none transition focus:border-[#6173F4] focus:ring-2 focus:ring-[#6173F4]/20"
                >
                  {routes.map(r => (
                    <option key={r.id} value={r.id} className="bg-white text-[#3B2E40]">
                      {r.id}: {r.label || r.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-[#3B2E40]/65">
                  Note: Driver attendance remains depot-wide; this route assignment serves as the default dispatch route.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-2xl border border-[#3B2E40]/30 bg-white px-5 py-2.5 text-xs font-semibold text-[#3B2E40] hover:bg-[#F5E0DE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#F35E3E] px-6 py-2.5 text-xs font-bold text-[#FCEFED] shadow-md hover:bg-[#E04D2E] disabled:opacity-50"
                >
                  {addLoading && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  <span>Save Driver</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
