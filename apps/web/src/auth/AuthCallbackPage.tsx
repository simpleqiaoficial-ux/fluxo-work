import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router'
import { Alert } from '../components/Alert'
import { CenteredPage } from '../components/CenteredPage'
import { useAuth } from './AuthContext'

export function AuthCallbackPage() {
  const { setAccessTokenFromCallback } = useAuth()
  const [destination, setDestination] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const token = params.get('accessToken')

    if (!token) {
      setError(true)
      return
    }

    setAccessTokenFromCallback(token)
      .then((session) => {
        if (session.companyId) {
          setDestination('/')
        } else if (session.memberships.length > 1) {
          setDestination('/select-company')
        } else {
          setDestination('/onboarding/create-company')
        }
      })
      .catch(() => setError(true))
  }, [setAccessTokenFromCallback])

  if (error) {
    return (
      <CenteredPage>
        <Alert>Não foi possível concluir o login. Tente novamente.</Alert>
      </CenteredPage>
    )
  }

  if (destination) {
    return <Navigate to={destination} replace />
  }

  return (
    <CenteredPage>
      <p className="text-center text-sm text-slate-600">Entrando...</p>
    </CenteredPage>
  )
}
