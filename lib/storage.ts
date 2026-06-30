const SHARED_KEYS = [
  'pautas', 'liPosts', 'liRefs', 'linkedinConfig', 'ytCache', 'channelIds', 'ytRefs',
]

export function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const val = localStorage.getItem(key)
    return val !== null ? (JSON.parse(val) as T) : defaultValue
  } catch {
    return defaultValue
  }
}

export function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
  // Sync shared keys to server (fire and forget)
  if (SHARED_KEYS.includes(key)) {
    fetch('/api/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    }).catch(() => {})
  }
}
