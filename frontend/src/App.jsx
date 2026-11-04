import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import TopNav from './components/TopNav'
import Dashboard from './pages/Dashboard'
import Reporting from './pages/Reporting'
import DepotBuses from './pages/DepotBuses'
import GoesOnRoute from './pages/GoesOnRoute'
import CheckOut from './pages/CheckOut'
import Tracking from './pages/Tracking'
import NotFound from './pages/NotFound'
import CameOnRoute from './pages/CameOnRoute'
import TrackBus from './pages/TrackBus'
import ExtraBus from './pages/ExtraBus'
import ExtraBusResult from './pages/ExtraBusResult'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  return (
    <div className="min-h-screen bg-[#3B2E40] text-[#FCEFED]">
      <AuthProvider>
        <BrowserRouter>
          <TopNav />
          <Routes>
                {/* Public Authentication Pages */}
                <Route
                  path="/login"
                  element={
                    <PublicOnlyRoute>
                      <Login />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicOnlyRoute>
                      <Register />
                    </PublicOnlyRoute>
                  }
                />

                {/* Driver WhatsApp Telemetry Page (Public for Driver Access) */}
                <Route path="/track" element={<Tracking />} />
                <Route path="/track/:tripId" element={<Tracking />} />

                {/* Protected Administrative Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reporting"
                  element={
                    <ProtectedRoute>
                      <Reporting />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reporting/buses"
                  element={
                    <ProtectedRoute>
                      <DepotBuses />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/goes-on-route"
                  element={
                    <ProtectedRoute>
                      <GoesOnRoute />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/came-on-route"
                  element={
                    <ProtectedRoute>
                      <CameOnRoute />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/completion-of-trip"
                  element={
                    <ProtectedRoute>
                      <CameOnRoute />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/track-bus"
                  element={
                    <ProtectedRoute>
                      <TrackBus />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/check-out"
                  element={
                    <ProtectedRoute>
                      <CheckOut />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/extra-bus"
                  element={
                    <ProtectedRoute>
                      <ExtraBus />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/extra-bus-result"
                  element={
                    <ProtectedRoute>
                      <ExtraBusResult />
                    </ProtectedRoute>
                  }
                />

                {/* Not Found Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
    </div>
  )
}

export default App
