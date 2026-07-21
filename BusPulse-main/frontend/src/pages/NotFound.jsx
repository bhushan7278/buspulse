import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-24 text-center sm:px-6">
      <div className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-12 shadow-[0_35px_60px_-35px_rgba(15,23,42,0.6)]">
        <div className="mb-6 inline-flex items-center justify-center rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-700">Page not found</div>
        <h1 className="text-6xl font-semibold text-slate-950">404</h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-600">The page you are looking for does not exist or may have moved. Return to the dashboard to continue managing your routes.</p>
        <Link
          to="/"
          className="mt-10 inline-flex rounded-full bg-slate-950 px-8 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Back to Dashboard
        </Link>
      </div>
    </main>
  )
}
