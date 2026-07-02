import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from './auth/AuthContext'
import { ThemeProvider } from './theme/ThemeProvider'
import App from './App'

describe('App', () => {
  it('renders the login page at /login', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MemoryRouter>
      </ThemeProvider>,
    )
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })
})
