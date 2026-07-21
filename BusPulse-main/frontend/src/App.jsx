import { BrowserRouter, Route, Routes } from 'react-router-dom'
import TopNav from './components/TopNav'
import Dashboard from './pages/Dashboard'
import Reporting from './pages/Reporting'
import GoesOnRoute from './pages/GoesOnRoute'
import CheckOut from './pages/CheckOut'
import Tracking from './pages/Tracking'
import NotFound from './pages/NotFound'
import CameOnRoute from './pages/CameOnRoute'
import ExtraBus from './pages/ExtraBus'
import ExtraBusResult from './pages/ExtraBusResult'

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.24),_transparent_40%)]" />
        <div className="pointer-events-none absolute right-0 top-1/4 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute left-0 top-1/2 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="relative">
          <BrowserRouter>
            <TopNav />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/reporting" element={<Reporting />} />
              <Route path="/goes-on-route" element={<GoesOnRoute />} />
              <Route path="/came-on-route" element={<CameOnRoute />} />
              <Route path="/check-out" element={<CheckOut />} />
              <Route path="/extra-bus" element={<ExtraBus />} />
              <Route path="/extra-bus-result" element={<ExtraBusResult />} />
              <Route path="/track" element={<Tracking />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </div>
      </div>
    </div>
  )
}

export default App
