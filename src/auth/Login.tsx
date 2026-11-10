import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Icon, I } from '../components/Icon'

export function Login({ onDemo }: { onDemo(): void }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [stage, setStage] = useState<'email' | 'sent'>('email')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!supabase || !email.includes('@')) return
    setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: location.origin } })
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
          <p className="muted small center">We’ll email you a sign-in link and code. No password needed.</p>
        </form>
      ) : (
        <form className="login-form" onSubmit={verify}>
          <p className="center">Check your inbox.</p>
          <p className="muted small center">Tap the link in the email from <b>{email}</b>, or enter the 6-digit code here. On an iPhone home-screen app, use the code.</p>
          <input className="text code" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" maxLength={8}
            value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
          <button className="btn primary wide" disabled={busy || code.length < 6}>{busy ? 'Signing in…' : 'Sign in'}</button>
          {err && <p className="error">{err}</p>}
          <div className="row-btns">
            <button type="button" className="btn ghost" onClick={() => { setStage('email'); setCode('') }}>Different email</button>
            <button type="button" className="btn ghost" onClick={() => send()}>Resend</button>
          </div>
        </form>
      )}
    </main>
  )
}
