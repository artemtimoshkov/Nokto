import { useMemo, useState } from 'react'
import { Icon, I } from '../../components/Icon'
import { SearchBar, matches } from '../../components/SearchBar'
import { go } from '../../lib/route'
import { useKitchen } from './store'
import { RecipeSheet } from './RecipeSheet'
import { durationLabel, totalMinutes, type Recipe } from './types'
import { K } from './icons'

const searchable = (r: Recipe) => [r.title, r.notes, r.source, ...r.ingredients.map(i => i.name)]

export function RecipeList() {
  const { recipes, loading, notSetUp, addSamples } = useKitchen()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)

  const sorted = useMemo(() => [...recipes].sort((a, b) => a.title.localeCompare(b.title)), [recipes])
  const shown = useMemo(() => sorted.filter(r => (!q.trim() || searchable(r).some(t => matches(t, q)))), [sorted, q])
  const filtering = !!q.trim()
  const favs = shown.filter(r => r.favourite)

  return (
    <main className="screen wide">
      <button className="back" onClick={() => go('/apps')}><Icon d={I.back} size={18} />Mini apps</button>
      <header className="head">
        <div>
          <h1>Raw</h1>
          {!loading && recipes.length > 0 && <p className="sub">{recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}</p>}
        </div>
        {!notSetUp && <button className="avatar desktop-only" aria-label="Add recipe" onClick={() => setAdding(true)}><Icon d={I.plus} size={18} /></button>}
      </header>

      {notSetUp ? (
        <div className="empty">
          <div className="empty-mark"><Icon d={K.spatula} size={34} /></div>
          <p>Raw isn't set up yet.</p>
          <p className="muted small">Run <code>supabase/schema.sql</code> again in the Supabase SQL Editor, then reopen this page.</p>
        </div>
      ) : (
        <>
          {recipes.length > 0 && <SearchBar value={q} onChange={setQ} placeholder="Search recipes and ingredients" />}

          {!filtering && favs.length > 0 && (
            <section className="group">
              <h2>Favourites</h2>
              <Cards list={favs} />
            </section>
          )}
          {shown.length > 0 && (
            <section className="group">
              {!filtering && favs.length > 0 && <h2>All recipes</h2>}
              <Cards list={shown} />
            </section>
          )}
          {filtering && shown.length === 0 && <p className="muted quiet">No recipes match.</p>}

          {!loading && recipes.length === 0 && (
            <div className="empty">
              <div className="empty-mark"><Icon d={K.spatula} size={34} /></div>
              <p>Your cookbook is empty.</p>
              <p className="muted small">Add your favourite recipes.</p>
              <div className="row-btns" style={{ marginTop: 18 }}>
                <button className="btn primary" onClick={() => setAdding(true)}>Add a recipe</button>
                <button className="btn ghost" onClick={addSamples}>Try 3 samples</button>
              </div>
            </div>
          )}
        </>
      )}

      {!notSetUp && <button className="fab mobile-only" aria-label="Add recipe" onClick={() => setAdding(true)}><Icon d={I.plus} size={26} /></button>}
      <RecipeSheet open={adding} recipe={null} onClose={() => setAdding(false)} />
    </main>
  )
}

function Cards({ list }: { list: Recipe[] }) {
  return (
    <ul className="k-cards">
      {list.map(r => {
        const t = totalMinutes(r)
        return (
          <li key={r.id}>
            <button className="k-card" onClick={() => go(`/apps/kitchen/${r.id}`)}>
              <span className="k-emoji">{r.emoji || r.title.trim().charAt(0).toUpperCase() || '🍽️'}</span>
              <span className="k-card-body">
                <span className="k-card-title">{r.title}</span>
                <span className="k-card-meta">
                  {t > 0 && <span><Icon d={K.clock} size={13} />{durationLabel(t)}</span>}
                  <span>{r.ingredients.length} {r.ingredients.length === 1 ? 'ingredient' : 'ingredients'}</span>
                </span>
              </span>
              {r.favourite && <Icon d={K.heart} size={15} className="k-fav" fill />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
