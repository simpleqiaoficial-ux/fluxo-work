const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown) {
    super(`Erro da API (${status})`)
    this.status = status
    this.body = body
  }
}

interface ApiFetchOptions {
  method?: string
  body?: unknown
  accessToken?: string | null
}

// credentials: 'include' é o que manda o cookie httpOnly de refresh em chamadas
// cross-site (web e api são domínios *.run.app diferentes em produção).
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const contentType = res.headers.get('content-type') ?? ''
  const data = contentType.includes('application/json') ? await res.json() : undefined

  if (!res.ok) {
    throw new ApiError(res.status, data)
  }

  return data as T
}
