import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'

export default function RoleDashboard() {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  if (user.role === 'employee') return <Navigate to="/app/portal" replace />
  if (user.role === 'finance') return <Navigate to="/app/payroll" replace />
  if (user.role === 'leadman') return <Navigate to="/app/leadman" replace />

  return <Navigate to="/app/dashboard" replace />
}
