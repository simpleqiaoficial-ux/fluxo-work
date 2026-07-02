import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from './auth/AuthContext'
import App from './App'

describe('App', () => {
  it('renders the login page at /login', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Entrar com Google' })).toBeInTheDocument()
  })
})
