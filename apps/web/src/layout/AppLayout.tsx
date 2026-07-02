import { Link, Outlet } from 'react-router'
import { useAuth } from '../auth/AuthContext'

export function AppLayout() {
  const { memberships, companyId, role, logout } = useAuth()
  const currentCompany = memberships.find((m) => m.companyId === companyId)

  return (
    <div>
      <header>
        <nav>
          <Link to="/">FluxoWork</Link>
          <Link to="/providers">Prestadores</Link>
        </nav>
        <div>
          <span>
            {currentCompany?.companyName} ({role})
          </span>
          <button type="button" onClick={() => void logout()}>
            Sair
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
