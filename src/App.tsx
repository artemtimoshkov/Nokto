import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { localBackend, supabaseBackend } from './lib/backend'
import { StoreProvider } from './lib/store'
import { useRoute } from './lib/route'
import { Login, HandedOff } from './auth/Login'
import { handleAuthRedirect } from './lib/handoff'
import { Today } from './screens/Today'
import { Goals } from './screens/Goals'
import { AreaGoals } from './screens/AreaGoals'
import { TabBar } from './components/TabBar'
import { Sidebar } from './components/Sidebar'
import { Toast } from './components/Toast'
import { Sheet } from './components/Sheet'
import type { AreaId } from './lib/types'

const DEMO_KEY = 'nokto-demo'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)
  const [demo, setDemo] = useState(() => { try { return !supabase && localStorage.getItem(DEMO_KEY) === '1' } catch { return false } })

  const [handedOff, setHandedOff] = useState(false)
  const [notice, setNotice] = useState<string>()

  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    // Finish a sign-in from the email link (if any) before deciding what to show.
    handleAuthRedirect().then(async r => {
      if (r.result === 'handed-off') setHandedOff(true)
      if (r.result === 'error') setNotice(r.message)
      const { data: s } = await sb.auth.getSession()
      setSession(s.session)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userKey = session?.user.id ?? (demo ? 'demo' : null)
  const backend = useMemo(() => userKey === 'demo' ? localBackend() : userKey ? supabaseBackend() : null, [userKey])

  if (session === undefined) return <div className="splash" />
  if (handedOff && !session) return <HandedOff />
  if (!backend) return <Login notice={notice} onDemo={() => { try { localStorage.setItem(DEMO_KEY, '1') } catch {} setDemo(true) }} />

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
    try { localStorage.removeItem(DEMO_KEY) } catch {}
    setDemo(false)
  }

  return (
    <StoreProvider key={userKey} backend={backend}>
      <Shell email={session?.user.email ?? 'Demo'} onSignOut={signOut} />
    </StoreProvider>
  )
}

function Shell({ email, onSignOut }: { email: string; onSignOut(): void }) {
  const route = useRoute()
  const [account, setAccount] = useState(false)
  const openAccount = () => setAccount(true)
  return (
    <div className="app">
      <Sidebar route={route} email={email} onAccount={openAccount} />
      <div className="main">
        {route.tab === 'today' && <Today onAccount={openAccount} />}
        {route.tab === 'goals' && !route.area && <Goals onAccount={openAccount} />}
        {route.tab === 'goals' && route.area && <AreaGoals key={route.area} areaId={route.area as AreaId} />}
      </div>
      <TabBar tab={route.tab} />
      <Toast />
      <Sheet open={account} onClose={() => setAccount(false)}>
        <p className="account-email">{email}</p>
        <div className="sheet-actions">
          <button className="btn ghost danger-text wide" onClick={() => { setAccount(false); onSignOut() }}>Sign out</button>
        </div>
      </Sheet>
    </div>
  )
}
