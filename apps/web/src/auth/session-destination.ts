import type { SessionResponse } from './AuthContext'

// Depois de login/registro, decide pra onde navegar com base no que a sessão
// já resolveu: empresa ativa -> painel; múltiplos vínculos -> escolher; nenhum
// vínculo -> criar empresa (o criador vira Admin dela automaticamente).
export function sessionDestination(session: SessionResponse): string {
  if (session.companyId) {
    return '/'
  }
  if (session.memberships.length > 1) {
    return '/select-company'
  }
  return '/onboarding/create-company'
}
