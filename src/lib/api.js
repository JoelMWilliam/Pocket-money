const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

async function request(path, options = {}) {
  const token = localStorage.getItem('pm-cloud-token')
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(data?.error || `Request failed: ${res.status}`)
    }
    return data
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      throw new Error('Cannot reach cloud server. Is it running?')
    }
    throw err
  }
}

export const cloudAuth = {
  register: (username, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  login: (username, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })
}

export const cloudSync = {
  get: () => request('/sync'),
  put: (data, version, deviceId) =>
    request('/sync', {
      method: 'POST',
      body: JSON.stringify({ data, version, deviceId })
    }),
  delete: () => request('/sync', { method: 'DELETE' })
}

export function getCloudToken() {
  return localStorage.getItem('pm-cloud-token')
}

export function setCloudToken(token) {
  if (token) localStorage.setItem('pm-cloud-token', token)
  else localStorage.removeItem('pm-cloud-token')
}

export function getCloudUser() {
  return localStorage.getItem('pm-cloud-user')
}

export function setCloudUser(user) {
  if (user) localStorage.setItem('pm-cloud-user', user)
  else localStorage.removeItem('pm-cloud-user')
}
