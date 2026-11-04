import { useEffect, useState } from 'react'
import { UserCheck, AlertCircle, CheckCircle2, Phone, ShieldAlert, Clock, RefreshCw } from 'lucide-react'
import api from '../api'

export default function CheckOut() {
  const [drivers, setDrivers] = useState([])
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchPresentDrivers = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/drivers/present')
      setDrivers(response.data || [])
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load present drivers roster.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPresentDrivers()
  }, [])

  const handleCheckOut = async (e) => {
    e.preventDefault()
    if (!selectedDriverId || submitting) return

    const driverToCheckout = drivers.find(d => d._id === selectedDriverId)
    if (!driverToCheckout || driverToCheckout.hasActiveTrip) {
      setError('Selected driver is currently on an active trip and cannot be checked out.')
      return
    }

    setMessage(null)
    setError(null)
    setSubmitting(true)

    try {
      const response = await api.post('/check-out', { driverId: selectedDriverId })
      setMessage(response.data?.message || `Driver ${driverToCheckout.name} checked out successfully.`)
      setSelectedDriverId('')
      // Refresh present drivers list from backend
      await fetchPresentDrivers()
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to check out driver. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedDriver = drivers.find(d => d._id === selectedDriverId)
  const isSelectedDriverEligible = selectedDriver && !selectedDriver.hasActiveTrip

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <div className="rounded-[2rem] border border-[#E7D3D0] bg-[#FCEFED] p-6 sm:p-10 shadow-2xl text-[#3B2E40]">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-[#E7D3D0] pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#6173F4]/40 bg-white px-3.5 py-1 text-xs font-bold uppercase tracking-[0.25em] text-[#6173F4] shadow-sm mb-3">
              <UserCheck className="h-3.5 w-3.5" />
              <span>Shift Management</span>
            </div>
            <h1 className="text-3xl font-extrabold text-[#3B2E40]">Driver Check Out</h1>
            <p className="mt-1.5 text-sm text-[#3B2E40]/75">
              Select a present driver to record their end-of-shift checkout.
            </p>
          </div>

          <button
            onClick={fetchPresentDrivers}
            disabled={loading || submitting}
            className="inline-flex items-center gap-2 self-start sm:self-auto rounded-2xl border border-[#E7D3D0] bg-white px-4 py-2.5 text-xs font-bold text-[#3B2E40] shadow-sm transition hover:bg-[#FCEFED] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#6173F4] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Roster</span>
          </button>
        </div>

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
            <p>{error}</p>
          </div>
        )}

        {/* Content Layout */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Present Drivers List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#3B2E40]">
                Currently Present Drivers ({drivers.length})
              </h2>
              <span className="text-xs text-[#3B2E40]/60">Depot Roster Active</span>
            </div>

            {loading && (
              <div className="rounded-3xl border border-[#E7D3D0] bg-white p-8 text-center text-sm text-[#3B2E40]/70">
                <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[#6173F4] border-t-transparent" />
                <p>Loading present drivers...</p>
              </div>
            )}

            {!loading && drivers.length === 0 && (
              <div className="rounded-3xl border border-[#E7D3D0] bg-white p-10 text-center shadow-sm">
                <UserCheck className="mx-auto mb-3 h-10 w-10 text-[#3B2E40]/30" />
                <h3 className="text-base font-bold text-[#3B2E40]">No Drivers Currently Present</h3>
                <p className="mt-1 text-xs text-[#3B2E40]/70 max-w-xs mx-auto">
                  All drivers have checked out or have not yet marked attendance for today.
                </p>
              </div>
            )}

            {!loading && drivers.length > 0 && (
              <div className="space-y-3">
                {drivers.map(driver => {
                  const isBusy = driver.hasActiveTrip
                  const isSelected = selectedDriverId === driver._id

                  return (
                    <div
                      key={driver._id}
                      onClick={() => {
                        if (!isBusy) {
                          setSelectedDriverId(isSelected ? '' : driver._id)
                          if (error) setError(null)
                        }
                      }}
                      className={`cursor-pointer rounded-2xl border p-4 transition shadow-sm ${
                        isBusy
                          ? 'border-[#E7D3D0] bg-white/70 opacity-80 cursor-not-allowed'
                          : isSelected
                          ? 'border-[#6173F4] bg-white ring-2 ring-[#6173F4]/20'
                          : 'border-[#E7D3D0] bg-white hover:border-[#6173F4]/50'
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-[#3B2E40]">{driver.name}</span>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                              Present
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-[#3B2E40]/70">
                            {driver.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5 text-[#6173F4]" />
                                <span>{driver.phone}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-[#3B2E40]/50" />
                              <span>Roster ID: {driver._id.slice(-6).toUpperCase()}</span>
                            </div>
                          </div>

                          {isBusy && (
                            <div className="flex items-center gap-1.5 pt-1 text-xs font-semibold text-amber-800">
                              <ShieldAlert className="h-4 w-4 flex-shrink-0 text-amber-600" />
                              <span>{driver.ineligibleReason || 'Assigned to active trip. Complete trip first.'}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center self-end sm:self-auto">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!isBusy) {
                                setSelectedDriverId(isSelected ? '' : driver._id)
                                if (error) setError(null)
                              }
                            }}
                            className={`rounded-2xl px-5 py-2 text-xs font-bold transition shadow-sm ${
                              isBusy
                                ? 'cursor-not-allowed bg-[#E7D3D0] text-[#3B2E40]/40'
                                : isSelected
                                ? 'bg-[#6173F4] text-[#FCEFED]'
                                : 'border border-[#6173F4] bg-white text-[#6173F4] hover:bg-[#6173F4] hover:text-[#FCEFED]'
                            }`}
                          >
                            {isBusy ? 'Trip Active' : isSelected ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Checkout Action Panel */}
          <div className="flex flex-col justify-between rounded-3xl border border-[#E7D3D0] bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#3B2E40] border-b border-[#E7D3D0] pb-3">
                Checkout Summary
              </h3>

              {selectedDriver ? (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#3B2E40]/70">Selected Driver:</span>
                    <span className="font-bold text-[#3B2E40]">{selectedDriver.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3B2E40]/70">Contact Phone:</span>
                    <span className="font-mono font-bold text-[#3B2E40]">{selectedDriver.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3B2E40]/70">Current Attendance:</span>
                    <span className="font-bold text-emerald-700 uppercase">Present</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3B2E40]/70">Eligibility:</span>
                    <span className={`font-bold ${isSelectedDriverEligible ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {isSelectedDriverEligible ? 'Eligible for Checkout' : 'Ineligible (Active Trip)'}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-[#E7D3D0] bg-[#FCEFED]/60 p-3 text-[11px] text-[#3B2E40]/75">
                    Clicking &quot;Check Out&quot; will record the current timestamp in MongoDB and update this driver&apos;s attendance status to absent.
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#3B2E40]/60">
                  <p>No driver selected.</p>
                  <p className="mt-1">Select an eligible present driver from the roster to perform checkout.</p>
                </div>
              )}
            </div>

            <div className="pt-6">
              <button
                type="button"
                disabled={!selectedDriverId || !isSelectedDriverEligible || submitting}
                onClick={handleCheckOut}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#F35E3E] px-6 py-3.5 text-sm font-bold text-[#FCEFED] shadow-lg transition hover:bg-[#E04D2E] focus:outline-none focus:ring-4 focus:ring-[#F35E3E]/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Recording Checkout...</span>
                  </>
                ) : (
                  <span>Check Out Driver</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
