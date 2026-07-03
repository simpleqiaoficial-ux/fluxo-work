import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { apiFetch } from '../lib/api'

export interface Membership {
  companyId: string
  companyName: string
  role: string
}

export interface SessionResponse {
  userId?: string
  companyId?: string
  role?: string
  memberships: Membership[]
}

interface TokenResponse {
  accessToken: string
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface CreateCompanyInput {
  legalName: string
  tradeName?: string
  cnpj: string
}

export interface AuthContextValue {
  status: AuthStatus
  accessToken: string | null
  userId: string | null
  companyId: string | null
  role: string | null
  memberships: Membership[]
  login: (email: string, password: string) => Promise<SessionResponse>
  register: (name: string, email: string, password: string) => Promise<SessionResponse>
  logout: () => Promise<void>
  selectCompany: (companyId: string) => Promise<void>
  createCompany: (input: CreateCompanyInput) => Promise<void>
}

// Exportado (não só via useAuth) pra permitir injetar um valor de teste direto
// via <AuthContext.Provider value={...}> sem precisar mockar a rede inteira.
export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [memberships, setMemberships] = useState<Membership[]>([])

  const applySession = useCallback((token: string, session: SessionResponse) => {
    setAccessToken(token)
    setUserId(session.userId ?? null)
    setCompanyId(session.companyId ?? null)
    setRole(session.role ?? null)
    setMemberships(session.memberships)
    setStatus('authenticated')
  }, [])

  const loadSessionFor = useCallback(
    async (token: string) => {
      const session = await apiFetch<SessionResponse>('/auth/session', { accessToken: token })
      applySession(token, session)
      return session
    },
    [applySession],
  )

  useEffect(() => {
    apiFetch<TokenResponse>('/auth/refresh', { method: 'POST' })
      .then((tokens) => loadSessionFor(tokens.accessToken))
      .catch(() => setStatus('unauthenticated'))
  }, [loadSessionFor])

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await apiFetch<TokenResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      return loadSessionFor(tokens.accessToken)
    },
    [loadSessionFor],
  )

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const tokens = await apiFetch<TokenResponse>('/auth/register', {
        method: 'POST',
        body: { name, email, password },
      })
      return loadSessionFor(tokens.accessToken)
    },
    [loadSessionFor],
  )

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined)
    setAccessToken(null)
    setUserId(null)
    setCompanyId(null)
    setRole(null)
    setMemberships([])
    setStatus('unauthenticated')
  }, [])

  const selectCompany = useCallback(
    async (targetCompanyId: string) => {
      const tokens = await apiFetch<TokenResponse>(`/auth/select-company/${targetCompanyId}`, {
        method: 'POST',
        accessToken,
      })
      await loadSessionFor(tokens.accessToken)
    },
    [accessToken, loadSessionFor],
  )

  const createCompany = useCallback(
    async (input: CreateCompanyInput) => {
      const result = await apiFetch<TokenResponse>('/companies', {
        method: 'POST',
        accessToken,
        body: input,
      })
      await loadSessionFor(result.accessToken)
    },
    [accessToken, loadSessionFor],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      accessToken,
      userId,
      companyId,
      role,
      memberships,
      login,
      register,
      logout,
      selectCompany,
      createCompany,
    }),
    [
      status,
      accessToken,
      userId,
      companyId,
      role,
      memberships,
      login,
      register,
      logout,
      selectCompany,
      createCompany,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de um AuthProvider')
  }
  return context
}
