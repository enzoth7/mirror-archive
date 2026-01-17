import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '../lib/auth'

export default function RequireAuth() {
  const { session, loading } = useSession()
  const location = useLocation()

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">Loading...</div>
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
