import { Link } from 'react-router-dom'

export default function Dashboard() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
      <div className="rounded-[2rem] border border-slate-200/60 bg-white/95 p-10 shadow-[0_35px_60px_-35px_rgba(15,23,42,0.5)]">
        <div className="mb-10 text-center">
          <p className="inline-flex rounded-full bg-sky-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">Smart Bus Management</p>
          <h1 className="mt-6 text-4xl font-semibold text-slate-950 sm:text-5xl">Driver Attendance & Route Tracking</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">Navigate dispatch, attendance and live route supervision with a modern dashboard made for fast decision making.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <Link
            to="/reporting"
            className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-900 px-8 py-10 text-center text-white shadow-2xl shadow-slate-900/20 transition duration-300 hover:-translate-y-1 hover:bg-slate-800"
          >
            <p className="text-lg font-semibold">Reporting</p>
            <p className="mt-3 text-slate-300">Record driver attendance for each route and keep your logs accurate.</p>
          </Link>

          <Link
            to="/goes-on-route"
            className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white px-8 py-10 text-center text-slate-950 shadow-2xl shadow-slate-200/70 transition duration-300 hover:-translate-y-1 hover:border-slate-300"
          >
            <p className="text-lg font-semibold">Goes On Route</p>
            <p className="mt-3 text-slate-500">Select route, choose a free driver, and assign a free bus number.</p>
          </Link>

          <Link
            to="/came-on-route"
            className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white px-8 py-10 text-center text-slate-950 shadow-2xl shadow-slate-200/70 transition duration-300 hover:-translate-y-1 hover:border-slate-300"
          >
            <p className="text-lg font-semibold">Came On Route</p>
            <p className="mt-3 text-slate-500">Select route, choose driver and bus, then mark as free.</p>
          </Link>

          <Link
            to="/check-out"
            className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-rose-600 to-rose-700 px-8 py-10 text-center text-white shadow-2xl shadow-rose-600/20 transition duration-300 hover:-translate-y-1 hover:bg-rose-800"
          >
            <p className="text-lg font-semibold">Check Out</p>
            <p className="mt-3 text-rose-100">Mark drivers as off-duty after completing their shift.</p>
          </Link>
        </div>
      </div>
    </main>
  )
}
