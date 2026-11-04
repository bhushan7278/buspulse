import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, User, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/reporting', label: 'Reporting' },
  { to: '/goes-on-route', label: 'Goes On Route' },
  { to: '/came-on-route', label: 'Completion of Trip' },
  { to: '/track-bus', label: 'Track Bus' },
  { to: '/extra-bus', label: 'Extra Bus' },
  { to: '/check-out', label: 'Check Out' }
]

export default function TopNav() {
  const { isAuthenticated, admin, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  // Determine if on public driver tracking page
  const isTrackingPage = location.pathname === '/track'
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'

  return (
    <header className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6">
      <nav className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-[#5C4863] bg-[#2A202E] px-5 py-4 text-sm text-[#FCEFED] shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-[#4A3A50] text-[#F35E3E] ring-1 ring-[#F35E3E]/40 shadow-inner">
            <span className="text-xl">🚌</span>
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight text-[#FCEFED]">BusPulse</p>
            <p className="text-xs text-[#FCEFED]/70">
              {isTrackingPage ? 'Driver Telemetry Portal' : 'Smart Bus & Fleet Management System'}
            </p>
          </div>
        </div>

        {isAuthenticated ? (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {links.map(link => {
              const isReportingActive =
                link.to === '/reporting' && location.pathname.startsWith('/reporting')

              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `rounded-full px-3.5 py-2 text-xs sm:text-sm transition duration-200 ${
                      isActive || isReportingActive
                        ? 'bg-[#F35E3E] text-[#FCEFED] ring-1 ring-[#FCEFED]/30 font-semibold shadow-sm'
                        : 'text-[#FCEFED]/80 hover:bg-[#4A3A50] hover:text-[#FCEFED]'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              )
            })}

            {/* Admin identity pill */}
            <div className="ml-2 hidden items-center gap-2 rounded-full border border-[#5C4863] bg-[#3B2E40] px-3.5 py-1.5 text-xs text-[#FCEFED] xl:flex">
              <User className="h-3.5 w-3.5 text-[#6173F4]" />
              <span className="font-semibold text-[#FCEFED]">{admin?.username}</span>
              {admin?.msrtcId && (
                <span className="rounded-full bg-[#6173F4]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#6173F4]">
                  {admin.msrtcId}
                </span>
              )}
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-[#6173F4]/40 bg-[#3B2E40] px-4 py-2 text-xs font-semibold text-[#FCEFED] transition duration-200 hover:bg-[#6173F4] hover:text-[#FCEFED] focus:outline-none focus:ring-2 focus:ring-[#6173F4]/30"
              title="Sign out of administrator session"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {!isAuthPage && (
              <NavLink
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#F35E3E] px-4 py-2 text-xs font-semibold text-[#FCEFED] ring-1 ring-[#FCEFED]/40 transition hover:bg-[#E04D2E]"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Admin Login</span>
              </NavLink>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}
