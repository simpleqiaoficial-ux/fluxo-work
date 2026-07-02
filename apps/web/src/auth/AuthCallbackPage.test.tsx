import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { AuthContext } from './AuthContext'
import type { AuthContextValue, SessionResponse } from './AuthContext'
import { AuthCallbackPage } from './AuthCallbackPage'

const noop = () => {
  throw new Error('not used in this test')
}

function renderCallback(setAccessTokenFromCallback: AuthContextValue['setAccessTokenFromCallback']) {
  const value: AuthContextValue = {
    status: 'loading',
    accessToken: null,
    companyId: null,
    role: null,
    memberships: [],
    login: () => undefined,
    logout: noop,
    selectCompany: noop,
    createCompany: noop,
    setAccessTokenFromCallback,
  }

  return render(
    <MemoryRouter initialEntries={['/auth/callback']}>
      <AuthContext.Provider value={value}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/" element={<div>painel</div>} />
          <Route path="/select-company" element={<div>tela de seleção de empresa</div>} />
          <Route path="/onboarding/create-company" element={<div>tela de criar empresa</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('AuthCallbackPage', () => {
  afterEach(() => {
    window.location.hash = ''
  })

  it('goes straight to the dashboard when the session already has a company', async () => {
    window.location.hash = '#accessToken=abc123'
    const session: SessionResponse = { companyId: 'company_1', role: 'ADMIN', memberships: [] }
    renderCallback(() => Promise.resolve(session))

    expect(await screen.findByText('painel')).toBeInTheDocument()
  })

  it('goes to company selection when there are multiple memberships and no company yet', async () => {
    window.location.hash = '#accessToken=abc123'
    const session: SessionResponse = {
      memberships: [
        { companyId: 'a', companyName: 'A', role: 'ADMIN' },
        { companyId: 'b', companyName: 'B', role: 'PRESTADOR' },
      ],
    }
    renderCallback(() => Promise.resolve(session))

    expect(await screen.findByText('tela de seleção de empresa')).toBeInTheDocument()
  })

  it('goes to company creation when there are no memberships at all', async () => {
    window.location.hash = '#accessToken=abc123'
    const session: SessionResponse = { memberships: [] }
    renderCallback(() => Promise.resolve(session))

    expect(await screen.findByText('tela de criar empresa')).toBeInTheDocument()
  })

  it('shows an error when the URL has no access token', async () => {
    window.location.hash = ''
    renderCallback(() => Promise.reject(new Error('should not be called')))

    expect(
      await screen.findByText('Não foi possível concluir o login. Tente novamente.'),
    ).toBeInTheDocument()
  })
})
