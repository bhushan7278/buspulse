import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/reporting', label: 'Reporting' },
  { to: '/goes-on-route', label: 'Goes On Route' },
  { to: '/extra-bus', label: 'Extra Bus' },
  { to: '/check-out', label: 'Check Out' }
]

export default function TopNav() {
  return (
    <header className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
      <nav className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-white/10 bg-slate-950/80 px-5 py-4 text-sm text-slate-100 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-sky-500/20 text-sky-200 ring-1 ring-sky-300/30">
            <span className="text-xl">🚌</span>
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight text-white">Smart Bus System</p>
            <p className="text-xs text-slate-400">Attendance, dispatch, tracking</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 transition duration-200 ${isActive ? 'bg-slate-100/10 text-sky-200 ring-1 ring-sky-300/20' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  )
}
