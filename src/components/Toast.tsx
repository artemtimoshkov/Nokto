import { useStore } from '../lib/store'

export function Toast() {
  const { toast, dismissToast } = useStore()
  if (!toast) return null
  return (
    <div className="toast" key={toast.id} role="status">
      <span>{toast.text}</span>
      {toast.undo && <button onClick={() => { toast.undo!(); dismissToast() }}>Undo</button>}
    </div>
  )
}
