/** A copy of the last known data on this device, so the app opens instantly and works offline. */
const P = 'nokto-cache:'

export function readCache<T>(key: string | undefined): T | null {
  if (!key) return null
  try { const s = localStorage.getItem(P + key); return s ? JSON.parse(s) as T : null } catch { return null }
}

export function writeCache(key: string | undefined, value: unknown) {
  if (!key) return
  try { localStorage.setItem(P + key, JSON.stringify(value)) } catch (e) { console.warn('cache', e) }
}
