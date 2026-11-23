import { useMemo } from 'react'
import type { MiniAppProps } from '../registry'
import { localKitchen, syncedKitchen } from './backend'
import { KitchenProvider } from './store'
import { RecipeList } from './RecipeList'
import { RecipeDetail } from './RecipeDetail'
import { CookMode } from './CookMode'
import './kitchen.css'

/**
 * Kitchen: your recipes, with a step-by-step cook mode and a recipe table.
 * Routes: `#/apps/kitchen`, `#/apps/kitchen/<id>`, `#/apps/kitchen/<id>/cook/<servings>`.
 */
export default function KitchenApp({ demo, user, path }: MiniAppProps) {
  const backend = useMemo(() => (demo ? localKitchen() : syncedKitchen(user)), [demo, user])
  const [id, sub, serves] = path
  return (
    <KitchenProvider backend={backend} cacheKey={demo ? undefined : `kitchen:${user}`}>
      {!id ? <RecipeList /> : sub === 'cook' ? <CookMode key={id} id={id} serves={Number(serves) || undefined} /> : <RecipeDetail key={id} id={id} />}
    </KitchenProvider>
  )
}
