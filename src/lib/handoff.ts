/**
 * Magic-link handoff — makes the emailed link work for the iPhone home-screen app.
 *
 * On iOS an installed web app has its own storage, separate from Safari. When you
 * tap the email link it opens in Safari (or the Gmail in-app browser), which can't
 * finish the sign-in because the PKCE verifier lives in the app. So:
 *
 *  1. The app requests the email with `?handoff=<random secret>` in the redirect URL.
 *  2. The browser that opens the link can't redeem the code, so it files
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

export async function sendMagicLink(email: string) {
  const id = randomId()
  try { localStorage.setItem(PENDING, id) } catch {}
  const redirect = `${location.origin}/?handoff=${id}`
  return supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } })
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

  let id: string | null = null
  try { id = localStorage.getItem(PENDING) } catch {}
  if (!id) return false
  const { data, error } = await supabase.rpc('take_handoff', { p_id: id })
  const row = Array.isArray(data) ? data[0] : data
  if (error || !row?.code) return false
  const { error: e2 } = await supabase.auth.exchangeCodeForSession(row.code, row.flow_id ? { flowId: row.flow_id } : undefined)
  if (e2) { console.error(e2); return false }
  try { localStorage.removeItem(PENDING) } catch {}
  return true
}

export const hasPendingHandoff = () => { try { return !!localStorage.getItem(PENDING) } catch { return false } }
