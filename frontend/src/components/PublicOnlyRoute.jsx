import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#F35E3E] border-t-transparent" />
        <p className="text-sm font-medium tracking-wide text-[#FCEFED]">Loading...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}
