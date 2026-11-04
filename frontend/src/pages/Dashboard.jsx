import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bus, Users, Radio, CheckCircle2, RefreshCw, Clock, ArrowRight, Shield, AlertCircle } from 'lucide-react'
import api from '../api'

export default function Dashboard() {
  const [data, setData] = useState({
    kpis: {
      totalBuses: 0,
      availableBuses: 0,
      activeTrips: 0,
      driversPresent: 0
    },
    activeTrips: []
  })
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const fetchDashboardData = async (isBackground = false) => {
    if (!isBackground) setLoading(true)
    setIsRefreshing(true)
    setError(null)
    try {
      const response = await api.get('/dashboard-summary')
      setData(response.data)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Unable to fetch live depot telemetry from backend server.')
    } finally {
      if (!isBackground) setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData(false)

    // Auto-refresh live dashboard data every 5 seconds
    const interval = setInterval(() => {
      fetchDashboardData(true)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const { kpis, activeTrips } = data

  const getPhaseBadge = (phase, outwardDestination) => {
    switch (phase) {
      case 'DESTINATION_STOP':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-600/40 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
            Stop at {outwardDestination} (15m)
          </span>
        )
      case 'RETURNING':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-[#6173F4]/50 bg-[#6173F4]/15 px-2 py-0.5 text-[11px] font-semibold text-[#4052D6]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6173F4] animate-pulse" />
            Returning to Sangli
          </span>
        )
      case 'OUTBOUND':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-[#F35E3E]/40 bg-[#F35E3E]/15 px-2 py-0.5 text-[11px] font-semibold text-[#C93B1E]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F35E3E]" />
            Outbound to {outwardDestination}
          </span>
        )
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Depot Identification Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2A202E] text-[#6173F4] ring-1 ring-[#6173F4]/40">
              <Shield className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#6173F4]">
              Sangli MSRTC Depot Supervision
            </p>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#FCEFED] sm:text-4xl">
            Depot Operations Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#FCEFED]/70">
            Central command for Sangli Depot bus dispatch, driver attendance, and real-time return arrival times.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDashboardData(false)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#6173F4]/40 bg-[#2A202E] px-4 py-2 text-xs font-semibold text-[#FCEFED] shadow-sm transition hover:border-[#6173F4] hover:bg-[#3B2E40] disabled:opacity-50"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#6173F4] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm font-semibold text-rose-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs text-rose-300 hover:text-white">Dismiss</button>
        </div>
      )}

      {/* Requirement 6: Exactly Four KPI Cards (Shell surface with Midnight Plum text) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* KPI 1: Total Buses */}
        <div className="rounded-[1.75rem] border border-[#E7D3D0] bg-[#FCEFED] p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3B2E40]/70">Total Buses</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3B2E40] text-[#6173F4] ring-1 ring-[#3B2E40]/20">
              <Bus className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-black text-[#3B2E40]">
            {loading ? '-' : kpis.totalBuses}
          </p>
          <p className="mt-1 text-xs text-[#3B2E40]/70">Sangli Depot Fleet</p>
        </div>

        {/* KPI 2: Available Buses */}
        <div className="rounded-[1.75rem] border border-[#E7D3D0] bg-[#FCEFED] p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3B2E40]/70">Available Buses</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3B2E40] text-[#6173F4] ring-1 ring-[#3B2E40]/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-black text-[#3B2E40]">
            {loading ? '-' : kpis.availableBuses}
          </p>
          <p className="mt-1 text-xs text-[#3B2E40]/70">Free for Dispatch</p>
        </div>

        {/* KPI 3: Active Trips */}
        <div className="rounded-[1.75rem] border border-[#E7D3D0] bg-[#FCEFED] p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3B2E40]/70">Active Trips</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3B2E40] text-[#F35E3E] ring-1 ring-[#3B2E40]/20">
              <Radio className="h-5 w-5 animate-pulse text-[#F35E3E]" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-black text-[#3B2E40]">
            {loading ? '-' : kpis.activeTrips}
          </p>
          <p className="mt-1 text-xs text-[#3B2E40]/70">Journeys in Transit</p>
        </div>

        {/* KPI 4: Drivers Present */}
        <div className="rounded-[1.75rem] border border-[#E7D3D0] bg-[#FCEFED] p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3B2E40]/70">Drivers Present</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3B2E40] text-[#6173F4] ring-1 ring-[#3B2E40]/20">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-black text-[#3B2E40]">
            {loading ? '-' : kpis.driversPresent}
          </p>
          <p className="mt-1 text-xs text-[#3B2E40]/70">On-Duty at Depot</p>
        </div>
      </div>

      {/* Requirement 6: Active Trips Table (Three Primary Columns Only) */}
      <div className="mt-8 overflow-hidden rounded-[2rem] border border-[#E7D3D0] bg-[#FCEFED] shadow-2xl">
        <div className="border-b border-[#E7D3D0] px-6 py-5 sm:px-8 flex items-center justify-between bg-[#FCEFED]">
          <div>
            <h2 className="text-xl font-bold text-[#3B2E40]">Active Trips in Transit</h2>
            <p className="mt-0.5 text-xs text-[#3B2E40]/70">
              Real-time monitoring prioritizing expected return arrival time at Sangli Depot.
            </p>
          </div>
          <span className="rounded-full border border-[#F35E3E]/40 bg-[#F35E3E]/10 px-3.5 py-1 text-xs font-bold text-[#C93B1E]">
            {activeTrips.length} In Progress
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#3B2E40]">
            <thead className="border-b border-[#5C4863] bg-[#3B2E40] text-xs font-bold uppercase tracking-wider text-[#FCEFED]">
              <tr>
                <th scope="col" className="px-6 py-4 sm:px-8 w-1/4">
                  1. Bus Number
                </th>
                <th scope="col" className="px-6 py-4 sm:px-8 w-1/4">
                  2. Driver Name
                </th>
                <th scope="col" className="px-6 py-4 sm:px-8 w-1/2">
                  3. Estimated Arrival at Sangli Depot
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7D3D0]">
              {loading && activeTrips.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-[#3B2E40]/70">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#F35E3E] border-t-transparent" />
                      <p className="text-xs">Loading active journeys…</p>
                    </div>
                  </td>
                </tr>
              ) : activeTrips.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-[#3B2E40]/70">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#3B2E40] text-[#FCEFED] mb-2">
                      <Bus className="h-6 w-6" />
                    </div>
                    <p className="font-semibold text-[#3B2E40]">No Active Trips</p>
                    <p className="text-xs text-[#3B2E40]/70 mt-1">
                      All dispatched trips have returned or none are active. Dispatch a bus from{' '}
                      <Link to="/goes-on-route" className="text-[#6173F4] underline font-medium hover:text-[#F35E3E]">
                        Goes On Route
                      </Link>.
                    </p>
                  </td>
                </tr>
              ) : (
                activeTrips.map((trip) => {
                  const hasEta = trip.sangliReturnEta?.etaAvailable && trip.sangliReturnEta?.arrivalClockTime
                  const clockTime = hasEta ? trip.sangliReturnEta.arrivalClockTime : 'ETA unavailable'
                  const remMinutes = hasEta ? trip.sangliReturnEta.remainingMinutes : null

                  return (
                    <tr
                      key={trip._id}
                      className="transition-colors hover:bg-[#F5E0DE]/60"
                    >
                      {/* Column 1: Bus Number */}
                      <td className="px-6 py-4 sm:px-8 font-mono font-bold text-base text-[#3B2E40] whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3B2E40] text-[#6173F4] border border-[#3B2E40]/20 shadow-sm">
                            <Bus className="h-4 w-4" />
                          </span>
                          <span>{trip.busNumber}</span>
                        </div>
                      </td>

                      {/* Column 2: Driver Name */}
                      <td className="px-6 py-4 sm:px-8 font-semibold text-[#3B2E40] whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-[#6173F4]" />
                          <span>{trip.driverName}</span>
                        </div>
                      </td>

                      {/* Column 3: Estimated Arrival at Sangli Depot */}
                      <td className="px-6 py-4 sm:px-8">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            {hasEta ? (
                              <div className="flex items-baseline gap-2">
                                <span className="font-mono text-lg font-extrabold text-[#3B2E40]">
                                  {clockTime}
                                </span>
                                {remMinutes != null && (
                                  <span className="text-xs font-semibold text-[#6173F4]">
                                    ({remMinutes} min remaining)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-800 text-xs">
                                <Clock className="h-3.5 w-3.5 text-amber-700" />
                                ETA unavailable
                              </span>
                            )}
                          </div>

                          {/* Secondary badge for outward destination / phase */}
                          <div className="self-start sm:self-auto">
                            {getPhaseBadge(trip.phase, trip.outwardDestination)}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Navigation Quick Links */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/reporting"
          className="group rounded-2xl border border-[#E7D3D0] bg-[#FCEFED] p-5 shadow-lg transition duration-200 hover:-translate-y-0.5 hover:border-[#6173F4] hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <p className="font-bold text-[#3B2E40]">Reporting & Fleet</p>
            <ArrowRight className="h-4 w-4 text-[#6173F4] transition-transform group-hover:translate-x-1 group-hover:text-[#F35E3E]" />
          </div>
          <p className="mt-2 text-xs text-[#3B2E40]/75">Record driver attendance and manage depot fleet buses.</p>
        </Link>

        <Link
          to="/goes-on-route"
          className="group rounded-2xl border border-[#E7D3D0] bg-[#FCEFED] p-5 shadow-lg transition duration-200 hover:-translate-y-0.5 hover:border-[#6173F4] hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <p className="font-bold text-[#3B2E40]">Goes On Route</p>
            <ArrowRight className="h-4 w-4 text-[#6173F4] transition-transform group-hover:translate-x-1 group-hover:text-[#F35E3E]" />
          </div>
          <p className="mt-2 text-xs text-[#3B2E40]/75">Dispatch buses on outward routes with WhatsApp driver links.</p>
        </Link>

        <Link
          to="/came-on-route"
          className="group rounded-2xl border border-[#E7D3D0] bg-[#FCEFED] p-5 shadow-lg transition duration-200 hover:-translate-y-0.5 hover:border-[#6173F4] hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <p className="font-bold text-[#3B2E40]">Completion of Trip</p>
            <ArrowRight className="h-4 w-4 text-[#6173F4] transition-transform group-hover:translate-x-1 group-hover:text-[#F35E3E]" />
          </div>
          <p className="mt-2 text-xs text-[#3B2E40]/75">Manage destination stops and complete returned journeys.</p>
        </Link>

        <Link
          to="/track-bus"
          className="group rounded-2xl border border-[#E7D3D0] bg-[#FCEFED] p-5 shadow-lg transition duration-200 hover:-translate-y-0.5 hover:border-[#6173F4] hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <p className="font-bold text-[#3B2E40]">Track Bus Live Map</p>
            <ArrowRight className="h-4 w-4 text-[#6173F4] transition-transform group-hover:translate-x-1 group-hover:text-[#F35E3E]" />
          </div>
          <p className="mt-2 text-xs text-[#3B2E40]/75">View live GPS positions and dynamic route polylines.</p>
        </Link>
      </div>
    </main>
  )
}
