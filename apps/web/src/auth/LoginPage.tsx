import { useAuth } from './AuthContext'

export function LoginPage() {
  const { login } = useAuth()

  return (
    <main>
      <h1>FluxoWork</h1>
      <p>Entre com sua conta Google para continuar.</p>
      <button type="button" onClick={login}>
        Entrar com Google
      </button>
    </main>
  )
}
