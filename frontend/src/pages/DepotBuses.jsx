import { useEffect, useState } from 'react'
import {
  Bus,
  PlusCircle,
  Search,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  RefreshCw,
  Route as RouteIcon,
  Radio,
  Clock,
  User,
  AlertTriangle
} from 'lucide-react'
import api from '../api'
import { routes } from '../routes'
import ReportingSubNav from '../components/ReportingSubNav'

export default function DepotBuses() {
  const [buses, setBuses] = useState([])
  const [summary, setSummary] = useState({ total: 0, available: 0, busy: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  // Add Bus Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [newBusNumber, setNewBusNumber] = useState('')
  const [newBusRoute, setNewBusRoute] = useState(routes[0]?.id || 'R1')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState(null)
  const [addSuccess, setAddSuccess] = useState(null)

  // Delete Confirmation Modal State
  const [busToDelete, setBusToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // Fetch depot fleet buses
  const fetchDepotBuses = async (query = '') => {
    setLoading(true)
    setError(null)
    try {
      const url = query ? `/buses?search=${encodeURIComponent(query)}` : '/buses'
      const response = await api.get(url)
      setBuses(response.data?.buses || [])
      if (response.data?.summary) {
        setSummary(response.data.summary)
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load depot bus fleet.')
    } finally {
      setLoading(false)
    }
  }

  // Load depot buses on mount
  useEffect(() => {
    fetchDepotBuses()
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDepotBuses(searchQuery.trim())
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Handle Add New Bus
  const handleAddBus = async (e) => {
    e.preventDefault()
    setAddError(null)
    setAddSuccess(null)

    const cleanedNumber = newBusNumber.trim().toUpperCase()
    if (!cleanedNumber || cleanedNumber.length < 2) {
      setAddError('Please enter a valid bus registration number (minimum 2 characters).')
      return
    }

    setAddLoading(true)
    try {
      const response = await api.post('/buses', {
        number: cleanedNumber,
        routeId: newBusRoute || null
      })

      setAddSuccess(response.data.message || `Bus ${cleanedNumber} added successfully.`)
      setNewBusNumber('')
      setNewBusRoute(routes[0]?.id || 'R1')

      // Refresh list
      await fetchDepotBuses(searchQuery.trim())

      setTimeout(() => {
        setShowAddModal(false)
        setAddSuccess(null)
      }, 1400)
    } catch (err) {
      setAddError(err?.response?.data?.message || 'Failed to register bus into fleet.')
    } finally {
      setAddLoading(false)
    }
  }

  // Handle Confirm Delete Bus
  const handleConfirmDelete = async () => {
    if (!busToDelete) return

    if (busToDelete.isOnActiveTrip || busToDelete.status === 'busy') {
      setDeleteError(
        `Bus ${busToDelete.number} is currently on an active trip. Complete the trip before deleting.`
      )
      return
    }

    setDeleteLoading(true)
    setDeleteError(null)
    try {
      const response = await api.delete(`/buses/${busToDelete._id}`)
      setMessage(response.data.message || `Bus ${busToDelete.number} deleted successfully.`)
      setBusToDelete(null)
      await fetchDepotBuses(searchQuery.trim())
    } catch (err) {
      setDeleteError(err?.response?.data?.message || 'Failed to delete bus.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Subpage Navigation */}
      <ReportingSubNav />

      {/* Main Container Card: Shell Light Surface */}
      <div className="rounded-[2rem] border border-[#E7D3D0] bg-[#FCEFED] p-8 shadow-2xl sm:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3B2E40] text-[#6173F4] ring-1 ring-[#3B2E40]/20">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#6173F4]">Depot Operations</p>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#3B2E40] sm:text-4xl">
              Depot Bus Management
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#3B2E40]/75 sm:text-base">
              Manage depot fleet inventory, track active route assignments, register new buses, and manage fleet availability across all city routes.
            </p>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => {
                setAddError(null)
                setAddSuccess(null)
                setShowAddModal(true)
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#F35E3E] px-5 py-3.5 text-sm font-bold text-[#FCEFED] shadow-lg transition-all hover:bg-[#E04D2E] focus:outline-none focus:ring-4 focus:ring-[#F35E3E]/30"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add New Bus</span>
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

        {/* 3 Fleet Summary Cards */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#E7D3D0] bg-white p-5 shadow-inner">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#3B2E40]/70">Total Depot Fleet</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3B2E40] text-[#6173F4]">
                <Bus className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#3B2E40]">{summary.total}</span>
              <span className="text-xs font-bold text-[#3B2E40]/70">Buses Registered</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E7D3D0] bg-white p-5 shadow-inner">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6173F4]">Available for Dispatch</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6173F4]/15 text-[#6173F4]">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#6173F4]">{summary.available}</span>
              <span className="text-xs font-bold text-[#3B2E40]/70">Ready at Depot</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E7D3D0] bg-white p-5 shadow-inner">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#F35E3E]">On Active Trip</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F35E3E]/15 text-[#F35E3E]">
                <Radio className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#F35E3E]">{summary.busy}</span>
              <span className="text-xs font-bold text-[#3B2E40]/70">Running Routes</span>
            </div>
          </div>
        </div>

        {/* Bus Search & Filter Bar */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6173F4]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bus by registration number (e.g. B101, MH12)..."
              className="w-full rounded-2xl border border-[#E7D3D0] bg-white pl-12 pr-10 py-3.5 text-sm text-[#3B2E40] placeholder-[#3B2E40]/45 outline-none transition-all focus:border-[#6173F4] focus:ring-2 focus:ring-[#6173F4]/20 uppercase"
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
            <span className="rounded-full bg-[#3B2E40] px-3 py-1 text-[#FCEFED]">
              {buses.length} Bus{buses.length !== 1 ? 'es' : ''}
            </span>
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

        {/* Bus Fleet Grid */}
        <div className="mt-8">
          {loading && (
            <div className="flex min-h-[220px] flex-col items-center justify-center space-y-3 rounded-3xl border border-[#E7D3D0] bg-white p-8 text-center">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#F35E3E] border-t-transparent" />
              <p className="text-sm font-medium text-[#3B2E40]/70">Loading depot bus fleet...</p>
            </div>
          )}

          {!loading && buses.length === 0 && (
            <div className="flex min-h-[220px] flex-col items-center justify-center space-y-3 rounded-3xl border border-dashed border-[#E7D3D0] bg-white p-8 text-center">
              <Bus className="h-10 w-10 text-[#6173F4]/60" />
              <p className="text-base font-semibold text-[#3B2E40]">No buses found</p>
              <p className="max-w-md text-xs text-[#3B2E40]/70">
                {searchQuery
                  ? `No depot buses match "${searchQuery}". Try clearing your search query.`
                  : 'No buses currently registered in the depot fleet. Click "Add New Bus" to register one.'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 rounded-xl bg-[#6173F4] px-4 py-2 text-xs font-bold text-[#FCEFED] hover:bg-[#4E60E6]"
                >
                  Clear Search Filter
                </button>
              )}
            </div>
          )}

          {!loading && buses.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {buses.map((bus) => {
                const isActive = bus.isOnActiveTrip || bus.status === 'busy'
                const tripInfo = bus.activeTrip

                return (
                  <div
                    key={bus._id}
                    className="group relative flex flex-col justify-between rounded-3xl border border-[#E7D3D0] bg-white p-5 shadow-sm transition-all duration-200 hover:border-[#6173F4] hover:shadow-md"
                  >
                    <div>
                      {/* Top Header: Bus ID & Status Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                              isActive
                                ? 'bg-[#F35E3E]/15 text-[#F35E3E] ring-1 ring-[#F35E3E]/40'
                                : 'bg-[#6173F4]/15 text-[#6173F4] ring-1 ring-[#6173F4]/30'
                            }`}
                          >
                            <Bus className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-black tracking-wide text-[#3B2E40]">
                              {bus.number}
                            </h3>
                            <p className="text-xs text-[#3B2E40]/70">
                              {bus.routeId ? `Default Route: ${bus.routeId}` : 'Depot Floating Fleet'}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex flex-col items-end">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F35E3E]/40 bg-[#F35E3E]/15 px-3 py-1 text-[11px] font-bold text-[#C93B1E]">
                              <span className="h-2 w-2 rounded-full bg-[#F35E3E] animate-pulse" />
                              On Active Trip
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" />
                              Free & Available
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Active Trip Details / Route Assignment */}
                      <div className="mt-4 rounded-2xl border border-[#E7D3D0] bg-[#FCEFED] p-3.5 text-xs text-[#3B2E40]/80 space-y-2">
                        {isActive && tripInfo ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#3B2E40] flex items-center gap-1.5">
                                <RouteIcon className="h-3.5 w-3.5 text-[#6173F4]" />
                                {tripInfo.routeName || tripInfo.routeId}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-[#F35E3E]">
                                En Route
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-[#3B2E40]/70">
                              <User className="h-3.5 w-3.5 text-[#6173F4]" />
                              <span>Driver: <strong className="text-[#3B2E40]">{tripInfo.driverName}</strong></span>
                            </div>
                            {tripInfo.startTime && (
                              <div className="flex items-center gap-1.5 text-[10px] text-[#3B2E40]/60">
                                <Clock className="h-3 w-3 text-[#6173F4]" />
                                <span>Started: {new Date(tripInfo.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5">
                              <RouteIcon className="h-3.5 w-3.5 text-[#6173F4]" />
                              <span>Dispatch Readiness:</span>
                            </span>
                            <span className="font-bold text-[#6173F4]">Ready (All Routes)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="mt-5 flex items-center justify-between border-t border-[#E7D3D0] pt-3">
                      <span className="text-[11px] text-[#3B2E40]/60">
                        ID: {bus._id.slice(-6).toUpperCase()}
                      </span>

                      <button
                        onClick={() => {
                          setDeleteError(null)
                          setBusToDelete(bus)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100"
                        title="Delete or deactivate bus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add New Bus Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3B2E40]/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-[#E7D3D0] bg-[#FCEFED] p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3B2E40] text-[#6173F4] ring-1 ring-[#3B2E40]/20">
                  <Bus className="h-4 w-4" />
                </span>
                <h2 className="text-xl font-bold text-[#3B2E40]">Add New Depot Bus</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-xl p-1 text-[#3B2E40]/60 hover:bg-[#E7D3D0] hover:text-[#3B2E40]"
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

            <form onSubmit={handleAddBus} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3B2E40]/80">
                  Bus Number / Registration ID <span className="text-[#F35E3E]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newBusNumber}
                  onChange={(e) => setNewBusNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. B105 or MH12 AB 1234"
                  className="mt-1.5 w-full rounded-2xl border border-[#E7D3D0] bg-white px-4 py-3 text-sm text-[#3B2E40] placeholder-[#3B2E40]/45 outline-none transition focus:border-[#6173F4] focus:ring-2 focus:ring-[#6173F4]/20 uppercase"
                />
                <p className="mt-1 text-[11px] text-[#3B2E40]/65">
                  Must be unique across the active depot fleet.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3B2E40]/80">
                  Default Route Assignment (Optional)
                </label>
                <select
                  value={newBusRoute}
                  onChange={(e) => setNewBusRoute(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-[#E7D3D0] bg-white px-4 py-3 text-sm text-[#3B2E40] outline-none transition focus:border-[#6173F4] focus:ring-2 focus:ring-[#6173F4]/20"
                >
                  <option value="" className="bg-white text-[#3B2E40]/70">
                    (None - Floating Depot Fleet)
                  </option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id} className="bg-white text-[#3B2E40]">
                      {r.id}: {r.label || r.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-[#3B2E40]/65">
                  Note: BusPulse allows any free bus to be dispatched on any route; this sets the default route tag.
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
                  {addLoading && (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  <span>Save Bus</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Bus Confirmation Modal */}
      {busToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3B2E40]/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-[#E7D3D0] bg-[#FCEFED] p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700 ring-1 ring-rose-300">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-bold text-[#3B2E40]">Delete Depot Bus</h2>
              </div>
              <button
                onClick={() => setBusToDelete(null)}
                className="rounded-xl p-1 text-[#3B2E40]/60 hover:bg-[#E7D3D0] hover:text-[#3B2E40]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {deleteError && (
              <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                {deleteError}
              </div>
            )}

            <div className="mt-4">
              {busToDelete.isOnActiveTrip || busToDelete.status === 'busy' ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 space-y-2">
                  <p className="font-bold text-amber-950">Deletion Blocked: Active Trip in Progress</p>
                  <p>
                    Bus <strong className="text-amber-950">{busToDelete.number}</strong> is currently assigned to an ongoing trip.
                  </p>
                  <p className="text-[11px] text-amber-800">
                    To maintain trip integrity, complete the trip in the &quot;Came On Route&quot; section before deleting this bus.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 text-xs text-[#3B2E40]/75">
                  <p className="text-sm text-[#3B2E40]">
                    Are you sure you want to delete bus <strong className="text-[#F35E3E] font-bold">{busToDelete.number}</strong>?
                  </p>
                  <p>
                    This will safely deactivate the bus from active depot operations and prevent it from appearing in dispatch rosters. Completed trip histories are preserved.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBusToDelete(null)}
                className="rounded-2xl border border-[#3B2E40]/30 bg-white px-5 py-2.5 text-xs font-semibold text-[#3B2E40] hover:bg-[#F5E0DE]"
              >
                Cancel
              </button>

              {!(busToDelete.isOnActiveTrip || busToDelete.status === 'busy') && (
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={handleConfirmDelete}
                  className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-rose-700 disabled:opacity-50"
                >
                  {deleteLoading && (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  <span>Confirm Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
