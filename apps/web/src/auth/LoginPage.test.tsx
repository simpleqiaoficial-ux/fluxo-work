import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from './AuthContext'
import type { AuthContextValue } from './AuthContext'
import { LoginPage } from './LoginPage'

const noop = () => {
  throw new Error('not used in this test')
}

function renderLoginPage(overrides: Partial<AuthContextValue> = {}) {
  const value: AuthContextValue = {
    status: 'unauthenticated',
    accessToken: null,
    userId: null,
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
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={value}>
        <LoginPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('shows field-level validation errors on empty submit instead of calling login', async () => {
    const login = vi.fn()
    const user = userEvent.setup()
    renderLoginPage({ login })

    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Informe um e-mail válido')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('calls login with the entered credentials on valid submit', async () => {
    const login = vi.fn().mockResolvedValue({ memberships: [], companyId: 'company_1' })
    const user = userEvent.setup()
    renderLoginPage({ login })

    await user.type(screen.getByLabelText('E-mail'), 'ana@fluxowork.test')
    await user.type(screen.getByLabelText('Senha'), 'senhaSuperSegura123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(login).toHaveBeenCalledWith('ana@fluxowork.test', 'senhaSuperSegura123')
  })
})
