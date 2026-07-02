import { Link, Outlet } from 'react-router'
import { useAuth } from '../auth/AuthContext'

export function AppLayout() {
  const { memberships, companyId, role, logout } = useAuth()
  const currentCompany = memberships.find((m) => m.companyId === companyId)

  return (
    <div className="min-h-svh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <nav className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold tracking-tight text-slate-900">
              FluxoWork
            </Link>
            <Link to="/providers" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Prestadores
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              {currentCompany?.companyName}
              {role ? <span className="ml-1 text-slate-400">({role})</span> : null}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
