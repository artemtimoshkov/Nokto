/**
 * Sign-in handoff — makes Google / email sign-in work for the iPhone home-screen app.
 *
 * On iOS an installed web app has its own storage, separate from Safari. When you
 * a sign-in finishes in Safari (or the Gmail in-app browser) instead, that browser can't
 * finish the sign-in because the PKCE verifier lives in the app. So:
 *
 *  1. The app starts sign-in with `?handoff=<random secret>` in the redirect URL.
 *  2. A browser that lands there but can't redeem the code files
 *     `{code, flowId}` under that secret via the `put_handoff` RPC.
 *  3. The app polls `take_handoff`, gets the code and redeems it with its own verifier.
 *
 * The code alone is useless without the verifier, which never leaves the app.
 */
import { supabase } from './supabase'

const PENDING = 'nokto-handoff'

function randomId(): string {
  const b = new Uint8Array(24)
  crypto.getRandomValues(b)
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('')
}

const MAX_AGE = 15 * 60 * 1000

/** Starts a pending handoff and returns the URL the sign-in should come back to. */
function newRedirect(): string {
  const id = randomId()
  try { localStorage.setItem(PENDING, JSON.stringify({ id, at: Date.now() })) } catch {}
  return `${location.origin}/?handoff=${id}`
}

function pendingId(): string | null {
  try {
    const raw = localStorage.getItem(PENDING)
    if (!raw) return null
    const { id, at } = JSON.parse(raw)
    if (Date.now() - at > MAX_AGE) { localStorage.removeItem(PENDING); return null }
    return id
  } catch { return null }
}

export async function signInWithGoogle() {
  return supabase!.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: newRedirect(), queryParams: { prompt: 'select_account' } },
  })
}

export async function sendMagicLink(email: string) {
  return supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: newRedirect() } })
}

export type RedirectResult = 'none' | 'signed-in' | 'handed-off' | 'error'

/** Run once at startup: finishes a sign-in if this page was opened from the email link. */
export async function handleAuthRedirect(): Promise<{ result: RedirectResult; message?: string }> {
  if (!supabase) return { result: 'none' }
  const url = new URL(location.href)
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
  const code = url.searchParams.get('code')
  const flowId = url.searchParams.get('sb_flow_id') ?? undefined
  const handoff = url.searchParams.get('handoff')
  const errorDesc = url.searchParams.get('error_description') ?? hash.get('error_description')

  if (!code && !errorDesc) return { result: 'none' }
  history.replaceState(null, '', '/')
  if (errorDesc) return { result: 'error', message: errorDesc.replace(/\+/g, ' ') }

  // Same browser that asked for the link (e.g. laptop): sign in right here.
  const { error } = await supabase.auth.exchangeCodeForSession(code!, flowId ? { flowId } : undefined)
  if (!error) { try { localStorage.removeItem(PENDING) } catch {} return { result: 'signed-in' } }

  // A different browser (Safari / Gmail viewer): pass the code to the app that asked.
  if (handoff) {
    const { error: e2 } = await supabase.rpc('put_handoff', { p_id: handoff, p_code: code, p_flow_id: flowId ?? null })
    if (!e2) return { result: 'handed-off' }
    return { result: 'error', message: e2.message }
  }
  return { result: 'error', message: 'This link was opened in a different browser. Open Nokto and request a new link.' }
}

/** Called repeatedly by the app while waiting for the link to be tapped. Returns true once signed in. */
export async function pollHandoff(): Promise<boolean> {
  if (!supabase) return false
  // Laptop case: another tab of this browser may already have signed in.
  const { data: s } = await supabase.auth.getSession()
  if (s.session) return true

  const id = pendingId()
  if (!id) return false
  const { data, error } = await supabase.rpc('take_handoff', { p_id: id })
  const row = Array.isArray(data) ? data[0] : data
  if (error || !row?.code) return false
  const { error: e2 } = await supabase.auth.exchangeCodeForSession(row.code, row.flow_id ? { flowId: row.flow_id } : undefined)
  if (e2) { console.error(e2); return false }
  try { localStorage.removeItem(PENDING) } catch {}
  return true
}

export const hasPendingHandoff = () => !!pendingId()
