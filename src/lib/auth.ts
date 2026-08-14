export type User = {
  id: string
  email: string
  username: string
  created_at: string
  updated_at: string
}

export type AuthResponse = {
  token: string
  user: User
}

export type EndpointRow = {
  id: string
  name: string
  method: string
  openai_path: string
  cursor_path?: string | null
  group: string
  status: string
  latency_ms?: number | null
  last_checked_at?: string | null
  last_error?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type EndpointInput = {
  name: string
  method: string
  openai_path: string
  cursor_path?: string | null
  group: string
}

export type APIKeyRow = {
  id: string
  name: string
  key_prefix: string
  created_at: string
  revoked_at?: string | null
  last_used_at?: string | null
}

export type CreatedAPIKey = APIKeyRow & {
  key: string
}

const TOKEN_KEY = 'cursor-token'
const USER_KEY = 'cursor-user'

export const API_BASE = (() => {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (raw === undefined || raw === '') return ''
  return raw.replace(/\/$/, '')
})()

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function setSession(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

async function apiFetch<T>(path: string, options: RequestInit = {}, auth = false): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (auth) {
    const token = getToken()
    if (!token) throw new Error('Not authenticated')
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const data = (await response.json()) as { error?: string }
      if (data.error) message = data.error
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export function login(body: { username: string; password: string }): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function fetchEndpoints(): Promise<EndpointRow[]> {
  return apiFetch<EndpointRow[]>('/api/v1/endpoints', {}, true)
}

export function fetchEndpoint(id: string): Promise<EndpointRow> {
  return apiFetch<EndpointRow>(`/api/v1/endpoints/${id}`, {}, true)
}

export function createEndpoint(body: EndpointInput): Promise<EndpointRow> {
  return apiFetch<EndpointRow>(
    '/api/v1/endpoints',
    { method: 'POST', body: JSON.stringify(body) },
    true,
  )
}

export function updateEndpoint(id: string, body: EndpointInput): Promise<EndpointRow> {
  return apiFetch<EndpointRow>(
    `/api/v1/endpoints/${id}`,
    { method: 'PUT', body: JSON.stringify(body) },
    true,
  )
}

export function deleteEndpoint(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/endpoints/${id}`, { method: 'DELETE' }, true)
}

export function fetchAPIKeys(): Promise<APIKeyRow[]> {
  return apiFetch<APIKeyRow[]>('/api/v1/api-keys', {}, true)
}

export function createAPIKey(name: string): Promise<CreatedAPIKey> {
  return apiFetch<CreatedAPIKey>(
    '/api/v1/api-keys',
    { method: 'POST', body: JSON.stringify({ name }) },
    true,
  )
}

export function revokeAPIKey(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/api-keys/${id}`, { method: 'DELETE' }, true)
}
