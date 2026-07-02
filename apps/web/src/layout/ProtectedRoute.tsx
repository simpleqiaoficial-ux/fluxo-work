import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../auth/AuthContext'

export function ProtectedRoute() {
  const { status, companyId, memberships } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Carregando...</p>
      </div>
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
