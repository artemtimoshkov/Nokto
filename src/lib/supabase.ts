import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// PKCE flow: the emailed link carries a one-time code that only the device which
// requested it can redeem. The redirect is handled in lib/handoff.ts, so we can
// pass the code back to the iPhone home-screen app when the link opens in Safari.
export const supabase: SupabaseClient | null = url && key
  ? createClient(url, key, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'nokto-auth' },
    })
  : null

export interface SignedInUser { id: string; email?: string }

/** The user of the session saved on this device, without touching the network. */
export function storedUser(): SignedInUser | null {
  try {
    const s = JSON.parse(localStorage.getItem('nokto-auth') ?? 'null')
    return s?.user?.id ? { id: s.user.id, email: s.user.email } : null
  } catch { return null }
}
