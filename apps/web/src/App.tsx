import { Route, Routes } from 'react-router'
import { AuthCallbackPage } from './auth/AuthCallbackPage'
import { CreateCompanyPage } from './auth/CreateCompanyPage'
import { LoginPage } from './auth/LoginPage'
import { SelectCompanyPage } from './auth/SelectCompanyPage'
import { AppLayout } from './layout/AppLayout'
import { DashboardPage } from './layout/DashboardPage'
import { ProtectedRoute } from './layout/ProtectedRoute'
import { ProviderCreatePage } from './providers/ProviderCreatePage'
import { ProviderDetailPage } from './providers/ProviderDetailPage'
import { ProvidersListPage } from './providers/ProvidersListPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/select-company" element={<SelectCompanyPage />} />
      <Route path="/onboarding/create-company" element={<CreateCompanyPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
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
