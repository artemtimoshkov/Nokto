import { useEffect, useMemo, useState } from 'react'
import { storedUser, supabase, type SignedInUser } from './lib/supabase'
import { localBackend, syncedBackend } from './lib/backend'
import { onDrop } from './lib/outbox'
import { useStore } from './lib/store'
import { SyncBadge } from './components/SyncBadge'
import { StoreProvider } from './lib/store'
import { useRoute } from './lib/route'
import { Login, HandedOff } from './auth/Login'
import { handleAuthRedirect } from './lib/handoff'
import { Today } from './screens/Today'
import { Goals } from './screens/Goals'
import { AreaGoals } from './screens/AreaGoals'
import { Achieved } from './screens/Achieved'
import { MiniApps } from './screens/MiniApps'
import { TabBar } from './components/TabBar'
import { Sidebar } from './components/Sidebar'
import { Toast } from './components/Toast'
import { Sheet } from './components/Sheet'
import type { AreaId } from './lib/types'

const DEMO_KEY = 'nokto-demo'

export default function App() {
  // Signed in = a session saved on this device. Offline, Supabase can't refresh an
  // expired token, but the saved session is still ours, so the app opens anyway
  // and syncs once it's back online.
  const [user, setUser] = useState<SignedInUser | null | undefined>(() => supabase ? storedUser() ?? undefined : null)
  const [demo, setDemo] = useState(() => { try { return !supabase && localStorage.getItem(DEMO_KEY) === '1' } catch { return false } })

  const [handedOff, setHandedOff] = useState(false)
  const [notice, setNotice] = useState<string>()

  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    const pick = (u: SignedInUser | null | undefined) => setUser(u ? { id: u.id, email: u.email } : storedUser())
    const { data } = sb.auth.onAuthStateChange((_e, s) => pick(s?.user))
    // Finish a sign-in from the email link (if any) before deciding what to show.
    handleAuthRedirect().then(async r => {
      if (r.result === 'handed-off') setHandedOff(true)
      if (r.result === 'error') setNotice(r.message)
      const { data: s } = await sb.auth.getSession()
      pick(s.session?.user)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userKey = user?.id ?? (demo ? 'demo' : null)
  const backend = useMemo(() => userKey === 'demo' ? localBackend() : userKey ? syncedBackend(userKey) : null, [userKey])

  if (user === undefined) return <div className="splash" />
  if (handedOff && !user) return <HandedOff />
  if (!backend) return <Login notice={notice} onDemo={() => { try { localStorage.setItem(DEMO_KEY, '1') } catch {} setDemo(true) }} />

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
    try { localStorage.removeItem(DEMO_KEY) } catch {}
    setDemo(false)
  }

  return (
    <StoreProvider key={userKey} backend={backend} cacheKey={userKey === 'demo' ? undefined : userKey!}>
      <Shell email={user?.email ?? 'Demo'} userKey={userKey!} demo={userKey === 'demo'} onSignOut={signOut} />
    </StoreProvider>
  )
}

function Shell({ email, userKey, demo, onSignOut }: { email: string; userKey: string; demo: boolean; onSignOut(): void }) {
  const route = useRoute()
  const { notify } = useStore()
  const [account, setAccount] = useState(false)
  useEffect(() => onDrop(() => notify("A change couldn't be saved")), [notify])
  const openAccount = () => setAccount(true)
  return (
    <div className="app">
      <Sidebar route={route} email={email} onAccount={openAccount} />
      <div className="main">
        {route.tab === 'today' && <Today onAccount={openAccount} />}
        {route.tab === 'goals' && !route.area && <Goals onAccount={openAccount} />}
        {route.tab === 'goals' && route.area === 'achieved' && <Achieved />}
        {route.tab === 'goals' && route.area && route.area !== 'achieved' && <AreaGoals key={route.area} areaId={route.area as AreaId} />}
        {route.tab === 'apps' && <MiniApps path={route.path} demo={demo} user={userKey} onAccount={openAccount} />}
      </div>
      <TabBar tab={route.tab} />
      <Toast />
      <SyncBadge />
      <Sheet open={account} onClose={() => setAccount(false)}>
        <p className="account-email">{email}</p>
        <div className="sheet-actions">
          <button className="btn ghost danger-text wide" onClick={() => { setAccount(false); onSignOut() }}>Sign out</button>
        </div>
      </Sheet>
    </div>
  )
}
