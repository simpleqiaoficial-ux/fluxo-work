import { Route, Routes } from 'react-router'
import { CreateCompanyPage } from './auth/CreateCompanyPage'
import { LoginPage } from './auth/LoginPage'
import { RegisterPage } from './auth/RegisterPage'
import { SelectCompanyPage } from './auth/SelectCompanyPage'
import { AppShell } from './components/layout/AppShell'
import { FinancialEntryCreatePage } from './financial-entries/FinancialEntryCreatePage'
import { FinancialEntryDetailPage } from './financial-entries/FinancialEntryDetailPage'
import { FinancialEntriesListPage } from './financial-entries/FinancialEntriesListPage'
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
          <Route path="/financial-entries" element={<FinancialEntriesListPage />} />
          <Route path="/financial-entries/new" element={<FinancialEntryCreatePage />} />
          <Route path="/financial-entries/:id" element={<FinancialEntryDetailPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
