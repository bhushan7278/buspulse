import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-24 text-center sm:px-6">
      <div className="rounded-[2rem] border border-[#E7D3D0] bg-[#FCEFED] p-12 shadow-2xl text-[#3B2E40]">
        <div className="mb-6 inline-flex items-center justify-center rounded-full border border-[#6173F4]/40 bg-white px-5 py-2 text-xs font-bold uppercase tracking-[0.3em] text-[#6173F4]">
          Page not found
        </div>
        <h1 className="text-6xl font-black text-[#3B2E40]">404</h1>
        <p className="mx-auto mt-4 max-w-xl text-[#3B2E40]/75 text-sm sm:text-base">
          The page you are looking for does not exist or may have moved. Return to the dashboard to continue managing your routes.
        </p>
        <Link
          to="/"
          className="mt-10 inline-flex rounded-2xl bg-[#F35E3E] px-8 py-3 text-sm font-bold text-[#FCEFED] shadow-lg transition hover:bg-[#E04D2E]"
        >
          Back to Dashboard
        </Link>
      </div>
    </main>
  )
}
