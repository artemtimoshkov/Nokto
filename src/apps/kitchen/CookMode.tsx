import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon, I } from '../../components/Icon'
import { go } from '../../lib/route'
import { useKitchen } from './store'
import { scaleAmount } from './amounts'
import { durationLabel, totalMinutes } from './types'
import { K } from './icons'

interface Timer { total: number; left: number; endsAt: number | null; rang: boolean }

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`
}

function ring() {
  try { navigator.vibrate?.([300, 150, 300, 150, 300]) } catch {}
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    ;[0, 0.35, 0.7].forEach(at => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination)
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at)
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + at + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.28)
      o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + 0.3)
    })
  } catch {}
}

/** Keep the screen on while cooking, where the browser allows it. */
function useWakeLock() {
  useEffect(() => {
    let lock: any = null
    const get = async () => { try { lock = await (navigator as any).wakeLock?.request('screen') } catch {} }
    get()
    const onVis = () => { if (document.visibilityState === 'visible') get() }
    document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); try { lock?.release() } catch {} }
  }, [])
}

/** Full-screen, one step at a time. Page 0 gathers the ingredients; the last page is "done". */
export function CookMode({ id, serves }: { id: string; serves?: number }) {
  const kitchen = useKitchen()
  const r = kitchen.recipe(id)
  const [page, setPage] = useState(0)
  const [timers, setTimers] = useState<Record<string, Timer>>({})
  const [have, setHave] = useState<Set<string>>(new Set())
  const [, tick] = useState(0)
  const touch = useRef<{ x: number; y: number } | null>(null)
  useWakeLock()

  const running = Object.values(timers).some(t => t.endsAt)
  useEffect(() => {
    if (!running) return
    const h = window.setInterval(() => {
      const now = Date.now()
      setTimers(ts => {
        let changed = false
        const next = { ...ts }
        for (const [k, t] of Object.entries(ts)) {
          if (t.endsAt && t.endsAt <= now && !t.rang) { next[k] = { ...t, left: 0, endsAt: null, rang: true }; changed = true; ring() }
        }
        return changed ? next : ts
      })
      tick(x => x + 1)
    }, 250)
    return () => window.clearInterval(h)
  }, [running])

  const steps = r?.steps ?? []
  const last = steps.length + 1
  const back = useCallback(() => go(`/apps/kitchen/${id}`), [id])
  const prev = useCallback(() => setPage(p => Math.max(0, p - 1)), [])
  const next = useCallback(() => setPage(p => Math.min(last, p + 1)), [last])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Escape') back()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [next, prev, back])

  if (!r) {
    if (!kitchen.loading) go('/apps/kitchen')
    return <main className="screen" />
  }

  const factor = (serves ?? r.servings) / (r.servings || 1)
  const amountOf = (iid: string) => { const i = r.ingredients.find(x => x.id === iid); return i ? scaleAmount(i.amount, factor) : '' }

  const startTimer = (sid: string, minutes: number) => setTimers(ts => {
    const t = ts[sid] ?? { total: minutes * 60_000, left: minutes * 60_000, endsAt: null, rang: false }
    if (t.endsAt) return { ...ts, [sid]: { ...t, left: t.endsAt - Date.now(), endsAt: null } } // pause
    if (t.left <= 0) return { ...ts, [sid]: { ...t, left: t.total, endsAt: Date.now() + t.total, rang: false } } // restart
    return { ...ts, [sid]: { ...t, endsAt: Date.now() + t.left } }
  })
  const resetTimer = (sid: string) => setTimers(ts => { const { [sid]: _, ...rest } = ts; return rest })
  const leftOf = (t: Timer) => t.endsAt ? t.endsAt - Date.now() : t.left

  const step = page >= 1 && page <= steps.length ? steps[page - 1] : null
  const active = Object.entries(timers).filter(([sid, t]) => sid !== step?.id && (t.endsAt || t.rang))

  const finish = () => { kitchen.cooked(r); back() }

  return createPortal(
    <div className="k-cook" role="dialog" aria-modal="true" aria-label={`Cooking ${r.title}`}
      onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
      onTouchEnd={e => {
        const s = touch.current; touch.current = null
        if (!s) return
        const dx = e.changedTouches[0].clientX - s.x, dy = e.changedTouches[0].clientY - s.y
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev)()
      }}>
      <div className="k-cook-top">
        <button className="icon-btn" aria-label="Close cook mode" onClick={back}><Icon d={I.x} size={20} /></button>
        <div className="k-cook-title ellipsis">{r.title}</div>
        <span className="k-cook-count">{step ? `${page} / ${steps.length}` : ''}</span>
      </div>
      <div className="k-cook-bar"><span style={{ width: `${(page / last) * 100}%` }} /></div>

      {active.length > 0 && (
        <div className="k-cook-timers">
          {active.map(([sid, t]) => {
            const i = steps.findIndex(s => s.id === sid)
            return (
              <button key={sid} className={`k-pill ${t.rang ? 'rang' : ''}`} onClick={() => setPage(i + 1)}>
                <Icon d={K.timer} size={14} />Step {i + 1} · {t.rang ? 'Done!' : mmss(leftOf(t))}
              </button>
            )
          })}
        </div>
      )}

      <div className="k-cook-body" key={page}>
        {page === 0 && (
          <>
            <div className="k-cook-kicker">Get ready · {durationLabel(totalMinutes(r))}{serves && serves !== r.servings ? ` · serves ${serves}` : ''}</div>
            <h2 className="k-cook-h">Gather your ingredients</h2>
            <ul className="k-ing-list big">
              {r.ingredients.map(i => (
                <li key={i.id} className={have.has(i.id) ? 'have' : ''}
                  onClick={() => setHave(s => { const x = new Set(s); x.has(i.id) ? x.delete(i.id) : x.add(i.id); return x })}>
                  <span className={`check ${have.has(i.id) ? 'on' : ''}`}><Icon d={I.check} size={13} /></span>
                  <span className="k-ing-amount">{scaleAmount(i.amount, factor)}</span>
                  <span className="k-ing-name">{i.name}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {step && (
          <>
            <div className="k-cook-kicker">Step {page}</div>
            <p className="k-cook-text">{step.text}</p>
            {step.uses.length > 0 && (
              <div className="k-cook-uses">
                {step.uses.map(iid => {
                  const i = r.ingredients.find(x => x.id === iid)
                  if (!i) return null
                  const a = amountOf(iid)
                  return <span key={iid} className="k-use">{a && <b>{a}</b>} {i.name}</span>
                })}
              </div>
            )}
            {step.minutes ? (() => {
              const t = timers[step.id]
              const left = t ? leftOf(t) : step.minutes * 60_000
              const on = !!t?.endsAt
              return (
                <div className={`k-timer ${t?.rang ? 'rang' : ''} ${on ? 'on' : ''}`}>
                  <span className="k-timer-time">{t?.rang ? 'Time!' : mmss(left)}</span>
                  <div className="k-timer-btns">
                    <button className="btn primary" onClick={() => startTimer(step.id, step.minutes!)}>
                      <Icon d={on ? K.pause : t?.rang ? K.reset : K.play} size={16} fill={!on && !t?.rang} />
                      {on ? 'Pause' : t?.rang ? 'Again' : t ? 'Resume' : `Start ${durationLabel(step.minutes)} timer`}
                    </button>
                    {t && <button className="btn ghost" onClick={() => resetTimer(step.id)}>Reset</button>}
                  </div>
                </div>
              )
            })() : null}
          </>
        )}

        {page === last && (
          <div className="k-cook-done">
            <span className="k-emoji xl">{r.emoji || '🍽️'}</span>
            <h2 className="k-cook-h">Enjoy your {r.title.toLowerCase()}!</h2>
            {r.notes.trim() && <p className="muted">{r.notes}</p>}
            <button className="btn primary" onClick={finish}><Icon d={K.done} size={18} />I cooked it</button>
          </div>
        )}
      </div>

      <div className="k-cook-nav">
        <button className="btn ghost" onClick={prev} disabled={page === 0}><Icon d={I.back} size={18} />Back</button>
        {page < last && <button className="btn primary k-next" onClick={next}>{page === 0 ? 'Start' : page === steps.length ? 'Finish' : 'Next'}<Icon d={I.chevron} size={18} /></button>}
      </div>
    </div>,
    document.body,
  )
}
