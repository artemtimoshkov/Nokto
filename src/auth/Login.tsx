import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { sendMagicLink, pollHandoff, hasPendingHandoff } from '../lib/handoff'
import { Icon, I } from '../components/Icon'

const EMAIL_KEY = 'nokto-login-email'

export function Login({ onDemo, notice }: { onDemo(): void; notice?: string }) {
  const [email, setEmail] = useState(() => { try { return localStorage.getItem(EMAIL_KEY) ?? '' } catch { return '' } })
  const [stage, setStage] = useState<'email' | 'sent'>(() => (hasPendingHandoff() && email ? 'sent' : 'email'))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(notice ?? '')
  const [showCode, setShowCode] = useState(false)
  const [code, setCode] = useState('')

  // While waiting, keep checking whether the link was tapped (here or in Safari).
  useEffect(() => {
    if (stage !== 'sent') return
    let alive = true
    const tick = async () => { if (alive && document.visibilityState === 'visible') await pollHandoff() }
    const t = window.setInterval(tick, 2000)
    const onVis = () => { tick() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    tick()
    return () => { alive = false; clearInterval(t); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis) }
  }, [stage])

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const addr = email.trim()
    if (!supabase || !addr.includes('@')) return
    setBusy(true); setErr('')
    try { localStorage.setItem(EMAIL_KEY, addr) } catch {}
    const { error } = await sendMagicLink(addr)
    setBusy(false)
    if (error) setErr(error.message); else setStage('sent')
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || code.length < 6) return
    setBusy(true); setErr('')
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' })
    setBusy(false)
    if (error) setErr('That code didn’t work. Try again or resend.')
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
      ) : stage === 'email' ? (
        <form className="login-form" onSubmit={send}>
          <input className="text" type="email" inputMode="email" autoComplete="email" placeholder="you@email.com"
            value={email} onChange={e => setEmail(e.target.value)} autoFocus />
          <button className="btn primary wide" disabled={busy || !email.includes('@')}>{busy ? 'Sending…' : 'Continue with email'}</button>
          {err && <p className="error">{err}</p>}
          <p className="muted small center">We’ll email you a sign-in link. No password needed.</p>
        </form>
      ) : (
        <div className="login-form">
          <div className="waiting"><span /><span /><span /></div>
          <p className="center">Check your inbox.</p>
          <p className="muted small center">
            Tap the link we sent to <b>{email}</b>. It’s fine if it opens in Safari or another app.
            Come back here and you’ll be signed in automatically.
          </p>
          {err && <p className="error">{err}</p>}
          {showCode ? (
            <form className="login-form tight" onSubmit={verify}>
              <input className="text code" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" maxLength={8}
                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
              <button className="btn primary wide" disabled={busy || code.length < 6}>{busy ? 'Signing in…' : 'Sign in with code'}</button>
            </form>
          ) : null}
          <div className="row-btns">
            <button type="button" className="btn ghost" onClick={() => { setStage('email'); setErr('') }}>Different email</button>
            <button type="button" className="btn ghost" onClick={() => send()} disabled={busy}>Resend</button>
            {!showCode && <button type="button" className="btn ghost" onClick={() => setShowCode(true)}>Have a code?</button>}
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
