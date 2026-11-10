import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { sendMagicLink, signInWithGoogle, pollHandoff, hasPendingHandoff } from '../lib/handoff'
import { Icon, I } from '../components/Icon'

const EMAIL_KEY = 'nokto-login-email'

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

export function Login({ onDemo, notice }: { onDemo(): void; notice?: string }) {
  const [mode, setMode] = useState<'start' | 'email' | 'sent'>('start')
  const [email, setEmail] = useState(() => { try { return localStorage.getItem(EMAIL_KEY) ?? '' } catch { return '' } })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(notice ?? '')
  const [waiting, setWaiting] = useState(hasPendingHandoff)

  // If a sign-in was started and finished in another browser (e.g. Safari),
  // keep checking so this app picks it up.
  useEffect(() => {
    if (!waiting && mode !== 'sent') return
    let alive = true
    const tick = async () => {
      if (!alive || document.visibilityState !== 'visible') return
      await pollHandoff()
      if (!hasPendingHandoff()) setWaiting(false)
    }
    const t = window.setInterval(tick, 2000)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    tick()
    return () => { alive = false; clearInterval(t); document.removeEventListener('visibilitychange', tick); window.removeEventListener('focus', tick) }
  }, [waiting, mode])

  const google = async () => {
    setBusy(true); setErr('')
    const { error } = await signInWithGoogle() // navigates away to Google
    if (error) { setBusy(false); setErr(error.message) }
  }

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const addr = email.trim()
    if (!addr.includes('@')) return
    setBusy(true); setErr('')
    try { localStorage.setItem(EMAIL_KEY, addr) } catch {}
    const { error } = await sendMagicLink(addr)
    setBusy(false)
    if (error) setErr(error.message); else setMode('sent')
  }

  return (
    <main className="login">
      <div className="login-mark"><Icon d={I.star} size={34} fill /></div>
      <h1>Nokto</h1>
      <p className="sub">Your North Star, every day.</p>

      {!supabase ? (
        <div className="login-form">
          <p className="muted small center">Supabase isn’t configured yet. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable accounts.</p>
          <button className="btn primary wide" onClick={onDemo}>Try the demo</button>
        </div>
      ) : mode === 'start' ? (
        <div className="login-form">
          <button className="btn google wide" onClick={google} disabled={busy}>
            <GoogleLogo />{busy ? 'Opening Google…' : 'Continue with Google'}
          </button>
          {err && <p className="error">{err}</p>}
          {waiting && <p className="muted small center">Finishing sign-in… If you signed in in Safari, it’ll appear here in a moment.</p>}
          <button className="btn ghost small-btn" onClick={() => { setMode('email'); setErr('') }}>Use email instead</button>
        </div>
      ) : mode === 'email' ? (
        <form className="login-form" onSubmit={send}>
          <input className="text" type="email" inputMode="email" autoComplete="email" placeholder="you@email.com"
            value={email} onChange={e => setEmail(e.target.value)} autoFocus />
          <button className="btn primary wide" disabled={busy || !email.includes('@')}>{busy ? 'Sending…' : 'Email me a sign-in link'}</button>
          {err && <p className="error">{err}</p>}
          <button type="button" className="btn ghost small-btn" onClick={() => setMode('start')}>Back</button>
        </form>
      ) : (
        <div className="login-form">
          <div className="waiting"><span /><span /><span /></div>
          <p className="center">Check your inbox.</p>
          <p className="muted small center">
            Tap the link we sent to <b>{email}</b>. It’s fine if it opens in Safari. Come back here and you’ll be signed in automatically.
          </p>
          {err && <p className="error">{err}</p>}
          <div className="row-btns">
            <button type="button" className="btn ghost" onClick={() => setMode('start')}>Back</button>
            <button type="button" className="btn ghost" onClick={() => send()} disabled={busy}>Resend</button>
          </div>
        </div>
      )}
    </main>
  )
}

/** Shown in Safari after it passed the sign-in to the home-screen app. */
export function HandedOff() {
  return (
    <main className="login">
      <div className="login-mark"><Icon d={I.check} size={40} /></div>
      <h1>You’re in.</h1>
      <p className="sub">Go back to the Nokto app. It’s signing you in now.</p>
      <p className="muted small center" style={{ marginTop: 28, maxWidth: 300 }}>You can close this tab.</p>
    </main>
  )
}
