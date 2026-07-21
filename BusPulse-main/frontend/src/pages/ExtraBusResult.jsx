import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Users, Bus, ArrowLeft } from 'lucide-react'

export default function ExtraBusResult() {
  const location = useLocation()
  const navigate = useNavigate()
  const { result } = location.state || {}

  if (!result) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center p-8 text-center text-slate-300">
        <h2 className="text-3xl font-bold text-white mb-4">No Evaluation Data found</h2>
        <p className="mb-8 text-slate-400">Please run an evaluation first from the Extra Bus panel to see the intelligence results.</p>
        <button onClick={() => navigate('/extra-bus')} className="rounded-xl bg-indigo-600 px-8 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-indigo-500 hover:shadow-indigo-500/25">
          Go Back to Evaluation
        </button>
      </div>
    )
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col justify-center min-h-[85vh]">
      <button 
        onClick={() => navigate('/extra-bus')}
        className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition-colors hover:text-white self-start"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Evaluation Panel
      </button>

      <div className={`overflow-hidden rounded-3xl border bg-slate-900/80 p-10 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-500 flex flex-col md:flex-row items-center gap-12 ${
        result.allocationStatus === 'Extra Bus Approved' 
          ? 'border-emerald-500/30 shadow-[0_0_80px_-20px_rgba(16,185,129,0.2)] bg-emerald-500/5' 
          : 'border-rose-500/30 shadow-[0_0_80px_-20px_rgba(244,63,94,0.2)] bg-rose-500/5'
      }`}>
        <div className="flex flex-col items-center text-center md:items-start md:text-left flex-1">
          <div className={`mb-4 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold tracking-wider uppercase ${
            result.allocationStatus === 'Extra Bus Approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          }`}>
            {result.allocationStatus === 'Extra Bus Approved' ? 'Deployment Approved' : 'Deployment Declined'}
          </div>
          
          <h3 className="text-4xl font-black text-white tracking-tight mb-3">
            {result.allocationStatus}
          </h3>
          <p className="max-w-md text-base text-slate-400">
            Based on the live YOLO model detection, resource availability validations, and real-time operational constraints.
          </p>
        </div>

        <div className={`flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-full shadow-inner ${
          result.allocationStatus === 'Extra Bus Approved' ? 'bg-emerald-500/20 text-emerald-400 shadow-emerald-500/20' : 'bg-rose-500/20 text-rose-400 shadow-rose-500/20'
        }`}>
          {result.allocationStatus === 'Extra Bus Approved' ? (
            <CheckCircle className="h-16 w-16" />
          ) : (
            <XCircle className="h-16 w-16" />
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Passengers */}
        <div className="group rounded-3xl border border-white/10 bg-slate-800/60 p-8 transition-colors hover:bg-slate-800 flex flex-col items-center text-center shadow-lg">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 mb-4">
            <Users className="h-7 w-7" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Detected Count</span>
          <p className="text-4xl font-black text-white">{result.passengerCount}</p>
        </div>
        
        {/* Free Drivers */}
        <div className="group rounded-3xl border border-white/10 bg-slate-800/60 p-8 transition-colors hover:bg-slate-800 flex flex-col items-center text-center shadow-lg">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400 mb-4">
            <Users className="h-7 w-7" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Available Drivers</span>
          <div className="flex items-center gap-3">
            <p className="text-4xl font-black text-white">{result.availableDriversCount}</p>
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-lg ${
              result.driverAvailable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {result.driverAvailable ? '✓' : '✗'}
            </span>
          </div>
        </div>
        
        {/* Free Buses */}
        <div className="group rounded-3xl border border-white/10 bg-slate-800/60 p-8 transition-colors hover:bg-slate-800 flex flex-col items-center text-center shadow-lg">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400 mb-4">
            <Bus className="h-7 w-7" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Available Buses</span>
          <div className="flex items-center gap-3">
            <p className="text-4xl font-black text-white">{result.availableBusesCount}</p>
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-lg ${
              result.busAvailable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {result.busAvailable ? '✓' : '✗'}
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
