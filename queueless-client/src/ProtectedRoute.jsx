import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) return <p>Loading...</p>
  if (!session) return <Navigate to="/login" replace />

  return children
}

export default ProtectedRoute