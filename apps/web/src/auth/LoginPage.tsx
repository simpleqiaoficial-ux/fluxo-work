import { Button } from '../components/Button'
import { CenteredPage } from '../components/CenteredPage'
import { useAuth } from './AuthContext'

export function LoginPage() {
  const { login } = useAuth()

  return (
    <CenteredPage>
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">FluxoWork</h1>
        <p className="mt-2 text-sm text-slate-600">Entre com sua conta Google para continuar.</p>
        <Button type="button" onClick={login} className="mt-6 w-full">
          Entrar com Google
        </Button>
      </div>
    </CenteredPage>
  )
}
