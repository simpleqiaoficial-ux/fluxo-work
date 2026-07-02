import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../auth/AuthContext'

export function ProtectedRoute() {
  const { status, companyId, memberships } = useAuth()

  if (status === 'loading') {
    return (
      <main>
        <p>Carregando...</p>
      </main>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  if (!companyId) {
    return (
      <Navigate to={memberships.length > 1 ? '/select-company' : '/onboarding/create-company'} replace />
    )
  }

  return <Outlet />
}
