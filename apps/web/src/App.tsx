import { Route, Routes } from 'react-router'
import { CreateCompanyPage } from './auth/CreateCompanyPage'
import { LoginPage } from './auth/LoginPage'
import { RegisterPage } from './auth/RegisterPage'
import { SelectCompanyPage } from './auth/SelectCompanyPage'
import { AppShell } from './components/layout/AppShell'
import { DashboardPage } from './layout/DashboardPage'
import { ProtectedRoute } from './layout/ProtectedRoute'
import { ProviderCreatePage } from './providers/ProviderCreatePage'
import { ProviderDetailPage } from './providers/ProviderDetailPage'
import { ProvidersListPage } from './providers/ProvidersListPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/select-company" element={<SelectCompanyPage />} />
      <Route path="/onboarding/create-company" element={<CreateCompanyPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/providers" element={<ProvidersListPage />} />
          <Route path="/providers/new" element={<ProviderCreatePage />} />
          <Route path="/providers/:id" element={<ProviderDetailPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
