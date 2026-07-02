import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import type { AuthContextValue, Membership } from '../auth/AuthContext'
import { ProtectedRoute } from './ProtectedRoute'

function renderWithAuth(value: AuthContextValue) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthContext.Provider value={value}>
        <Routes>
          <Route path="/login" element={<div>tela de login</div>} />
          <Route path="/select-company" element={<div>tela de seleção de empresa</div>} />
          <Route path="/onboarding/create-company" element={<div>tela de criar empresa</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>área protegida</div>} />
          </Route>
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

const noop = () => {
  throw new Error('not used in this test')
}

function baseAuthValue(overrides: Partial<AuthContextValue>): AuthContextValue {
  return {
    status: 'loading',
    accessToken: null,
    companyId: null,
    role: null,
    memberships: [],
    login: noop,
    register: noop,
    logout: noop,
    selectCompany: noop,
    createCompany: noop,
    ...overrides,
  }
}

describe('ProtectedRoute', () => {
  it('shows a loading state while the session is still resolving', () => {
    renderWithAuth(baseAuthValue({ status: 'loading' }))
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('redirects to /login when unauthenticated', () => {
    renderWithAuth(baseAuthValue({ status: 'unauthenticated' }))
    expect(screen.getByText('tela de login')).toBeInTheDocument()
  })

  it('redirects to /select-company when authenticated with multiple memberships and no company', () => {
    const memberships: Membership[] = [
      { companyId: 'a', companyName: 'A', role: 'ADMIN' },
      { companyId: 'b', companyName: 'B', role: 'PRESTADOR' },
    ]
    renderWithAuth(baseAuthValue({ status: 'authenticated', companyId: null, memberships }))
    expect(screen.getByText('tela de seleção de empresa')).toBeInTheDocument()
  })

  it('redirects to onboarding when authenticated with zero memberships and no company', () => {
    renderWithAuth(baseAuthValue({ status: 'authenticated', companyId: null, memberships: [] }))
    expect(screen.getByText('tela de criar empresa')).toBeInTheDocument()
  })

  it('renders the protected content when authenticated with a company', () => {
    renderWithAuth(baseAuthValue({ status: 'authenticated', companyId: 'a' }))
    expect(screen.getByText('área protegida')).toBeInTheDocument()
  })
})
