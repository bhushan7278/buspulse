import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle, Users, Bus, ArrowLeft, Clock, ShieldAlert, Check, X, AlertTriangle, Navigation } from 'lucide-react'

export default function ExtraBusResult() {
  const location = useLocation()
  const navigate = useNavigate()
  const { result } = location.state || {}

  if (!result) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center p-8 text-center text-[#FCEFED]">
        <h2 className="text-3xl font-bold text-[#FCEFED] mb-4">No Evaluation Data Found</h2>
        <p className="mb-8 text-[#FCEFED]/70">Please run an evaluation first from the Extra Bus panel to see dynamic deployment results.</p>
        <button onClick={() => navigate('/extra-bus')} className="rounded-2xl bg-[#F35E3E] px-8 py-3.5 font-bold text-[#FCEFED] shadow-lg transition-all hover:bg-[#E04D2E]">
          Go Back to Evaluation
        </button>
      </div>
    )
  }

  const isApproved = result.isApproved || result.allocationStatus === 'Extra Bus Approved'

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8 flex flex-col justify-center min-h-[85vh]">
      <button 
        onClick={() => navigate('/extra-bus')}
        className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#FCEFED]/80 transition-colors hover:text-[#F35E3E] self-start"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Evaluation Panel
      </button>

      {/* Main Banner: Shell Light Surface */}
      <div className={`overflow-hidden rounded-3xl border bg-[#FCEFED] p-8 sm:p-10 shadow-2xl animate-in slide-in-from-bottom-4 duration-500 flex flex-col md:flex-row items-center gap-8 ${
        isApproved
          ? 'border-[#F35E3E]' 
          : 'border-[#E7D3D0]'
      }`}>
        <div className="flex flex-col items-center text-center md:items-start md:text-left flex-1">
          <div className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold tracking-wider uppercase ${
            isApproved
              ? 'bg-[#F35E3E]/15 text-[#C93B1E] border border-[#F35E3E]/40'
              : 'bg-rose-50 text-rose-800 border border-rose-300'
          }`}>
            {isApproved ? 'Recommendation: Deploy Extra Bus' : 'Recommendation: Extra Bus Not Recommended'}
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-black text-[#3B2E40] tracking-tight mb-2">
            {result.allocationStatus}
          </h2>
          <p className="text-sm sm:text-base font-semibold text-[#6173F4] mb-2">
            Route: {result.routeName || result.routeId} &rarr; Destination: {result.destinationStand}
          </p>
          <p className="max-w-xl text-sm text-[#3B2E40]/75 leading-relaxed">
            {result.recommendationReason}
          </p>
        </div>

        <div className={`flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-3xl shadow-inner ${
          isApproved ? 'bg-[#F35E3E] text-[#FCEFED]' : 'bg-[#3B2E40] text-rose-300'
        }`}>
          {isApproved ? (
            <CheckCircle2 className="h-14 w-14" />
          ) : (
            <XCircle className="h-14 w-14" />
          )}
        </div>
      </div>

      {/* 4 Conditions Evaluation Breakdown */}
      <div className="mt-8">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#FCEFED]/80 mb-4">
          Four-Factor Evaluation Criteria
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Passenger Threshold */}
          <div className="rounded-2xl border border-[#E7D3D0] bg-[#FCEFED] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3B2E40] text-[#6173F4]">
                <Users className="h-5 w-5" />
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                result.passengerThresholdMet ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-800 border border-rose-300'
              }`}>
                {result.passengerThresholdMet ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                <span>{result.passengerThresholdMet ? 'Passed' : 'Failed'}</span>
              </span>
            </div>
            <p className="text-xs text-[#3B2E40]/70 font-semibold">Passenger Volume</p>
            <p className="text-2xl font-black text-[#3B2E40] mt-1">{result.passengerCount}</p>
            <p className="text-[11px] text-[#3B2E40]/60 mt-1">
              Required: &ge; 40 passengers ({result.countSource === 'manual' ? 'Manual' : 'YOLOv8'})
            </p>
          </div>

          {/* 2. Destination ETA Threshold */}
          <div className="rounded-2xl border border-[#E7D3D0] bg-[#FCEFED] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3B2E40] text-[#6173F4]">
                <Clock className="h-5 w-5" />
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                result.etaThresholdMet ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-800 border border-rose-300'
              }`}>
                {result.etaThresholdMet ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                <span>{result.etaThresholdMet ? 'Passed' : 'Failed'}</span>
              </span>
            </div>
            <p className="text-xs text-[#3B2E40]/70 font-semibold">Destination ETA</p>
            <p className="text-2xl font-black text-[#3B2E40] mt-1">
              {result.etaAvailable ? `${result.etaMinutes} min` : 'Unavailable'}
            </p>
            <p className="text-[11px] text-[#3B2E40]/60 mt-1">
              Required: &gt; 25 min to destination stand
            </p>
          </div>

          {/* 3. Driver Availability */}
          <div className="rounded-2xl border border-[#E7D3D0] bg-[#FCEFED] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3B2E40] text-[#6173F4]">
                <Users className="h-5 w-5" />
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                result.driverAvailable ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-800 border border-rose-300'
              }`}>
                {result.driverAvailable ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                <span>{result.driverAvailable ? 'Passed' : 'Failed'}</span>
              </span>
            </div>
            <p className="text-xs text-[#3B2E40]/70 font-semibold">Free Present Drivers</p>
            <p className="text-2xl font-black text-[#3B2E40] mt-1">{result.availableDriversCount}</p>
            <p className="text-[11px] text-[#3B2E40]/60 mt-1">
              Required: &ge; 1 present & free
            </p>
          </div>

          {/* 4. Bus Availability */}
          <div className="rounded-2xl border border-[#E7D3D0] bg-[#FCEFED] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3B2E40] text-[#6173F4]">
                <Bus className="h-5 w-5" />
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                result.busAvailable ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-800 border border-rose-300'
              }`}>
                {result.busAvailable ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                <span>{result.busAvailable ? 'Passed' : 'Failed'}</span>
              </span>
            </div>
            <p className="text-xs text-[#3B2E40]/70 font-semibold">Available Free Buses</p>
            <p className="text-2xl font-black text-[#3B2E40] mt-1">{result.availableBusesCount}</p>
            <p className="text-[11px] text-[#3B2E40]/60 mt-1">
              Required: &ge; 1 free bus for route
            </p>
          </div>
        </div>
      </div>

      {/* Action to dispatch approved extra bus */}
      {isApproved && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate(`/goes-on-route?routeId=${result.routeId}`)}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#F35E3E] px-8 py-4 text-sm font-bold text-[#FCEFED] shadow-xl transition-all hover:bg-[#E04D2E]"
          >
            <span>Proceed to Dispatch (Goes On Route)</span>
            <Navigation className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Active Fleet ETAs on Route */}
      {result.allActiveBuses && result.allActiveBuses.length > 0 && (
        <div className="mt-8 rounded-2xl border border-[#E7D3D0] bg-[#FCEFED] p-6 shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#3B2E40] mb-3">
            Active Fleet Telemetry on Route ({result.routeName || result.routeId})
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {result.allActiveBuses.map((bus, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl border border-[#E7D3D0] bg-white px-4 py-3 text-xs">
                <div>
                  <p className="font-bold text-[#3B2E40]">{bus.busNumber}</p>
                  <p className="text-[#3B2E40]/70">Driver: {bus.driverName}</p>
                </div>
                <div className="text-right">
                  {bus.etaAvailable ? (
                    <>
                      <p className="font-extrabold text-[#6173F4]">{bus.etaMinutes} min</p>
                      <p className="text-[10px] text-[#3B2E40]/60">{bus.remainingDistanceKm} km left</p>
                    </>
                  ) : (
                    <span className="text-amber-800 font-semibold">GPS Offline</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
