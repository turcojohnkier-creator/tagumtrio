import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'

export default function RoleDashboard() {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  if (user.role === 'employee') return <Navigate to="/app/portal" replace />
  if (user.role === 'leadman') return <Navigate to="/app/leadman" replace />
  if (user.role === 'hr') return <Navigate to="/app/hr/employees" replace />
  if (user.role === 'gm') return <Navigate to="/app/gm" replace />
  if (user.role === 'production_incharge') return <Navigate to="/app/production" replace />

  return <Navigate to="/app/dashboard" replace />
}
