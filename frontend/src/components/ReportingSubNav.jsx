import { NavLink } from 'react-router-dom'
import { Users, Bus } from 'lucide-react'

export default function ReportingSubNav() {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2.5 sm:gap-3">
      <NavLink
        to="/reporting"
        end
        className={({ isActive }) =>
          `inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-bold transition duration-200 ${
            isActive
              ? 'bg-[#6173F4] text-[#FCEFED] ring-1 ring-[#6173F4]/50 shadow-md'
              : 'border border-[#5C4863] bg-[#2A202E] text-[#FCEFED]/80 hover:border-[#6173F4] hover:bg-[#3B2E40] hover:text-[#FCEFED]'
          }`
        }
      >
        <Users className="h-4 w-4" />
        <span>Depot Driver Attendance & Roster</span>
      </NavLink>

      <NavLink
        to="/reporting/buses"
        className={({ isActive }) =>
          `inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-bold transition duration-200 ${
            isActive
              ? 'bg-[#6173F4] text-[#FCEFED] ring-1 ring-[#6173F4]/50 shadow-md'
              : 'border border-[#5C4863] bg-[#2A202E] text-[#FCEFED]/80 hover:border-[#6173F4] hover:bg-[#3B2E40] hover:text-[#FCEFED]'
          }`
        }
      >
        <Bus className="h-4 w-4" />
        <span>Depot Bus Management</span>
      </NavLink>
    </div>
  )
}
