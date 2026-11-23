import { useMemo, useState, type CSSProperties } from 'react'
import { buildTable } from './table'
import { scaleAmount } from './amounts'
import { clock, durationLabel, type Recipe } from './types'

/** Width of a step column: longer steps get wider, so the x-axis reads as time. */
const width = (min: number | null) => Math.round(Math.max(96, Math.min(220, 88 + (min ?? 0) * 2.4)))

/** Ingredients down the side, steps across in time order, what you do in each cell. Tap a column for the full step. */
export function RecipeTable({ recipe, factor }: { recipe: Recipe; factor: number }) {
  const t = useMemo(() => buildTable(recipe), [recipe])
  const [sel, setSel] = useState<number | null>(null)
  const byId = useMemo(() => new Map(recipe.ingredients.map(i => [i.id, i])), [recipe.ingredients])
  const kitchenRow = t.kitchen.length > 0
  const first = kitchenRow ? 3 : 2 // first ingredient grid row (1 = header)
  const total = t.columns.reduce((s, c) => s + (c.minutes ?? 0), 0)

  const grid: CSSProperties = {
    gridTemplateColumns: `var(--k-label) ${t.columns.map(c => `${width(c.minutes)}px`).join(' ')}`,
    gridTemplateRows: `auto ${kitchenRow ? 'auto ' : ''}repeat(${t.rows.length}, minmax(44px, auto))`,
  }
  const pick = (i: number) => setSel(s => s === i ? null : i)
  const step = sel !== null ? recipe.steps[sel] : null

  return (
    <div className="k-table-wrap">
      <div className="k-table-scroll">
        <div className="k-table" style={grid} role="table" aria-label="Recipe table">
          <div className="k-corner" style={{ gridRow: 1, gridColumn: 1 }}>
            <span>Time →</span>
            {total > 0 && <span className="muted">{durationLabel(total)} total</span>}
          </div>
          {t.columns.map((c, ci) => (
            <button key={ci} className={`k-th ${sel === c.stepIndex ? 'sel' : ''}`} style={{ gridRow: 1, gridColumn: ci + 2 }} onClick={() => pick(c.stepIndex)}>
              <span className="k-th-time">{clock(c.start)}</span>
              <span className="k-th-step">Step {c.stepIndex + 1}{c.minutes ? ` · ${durationLabel(c.minutes)}` : ''}</span>
            </button>
          ))}

          {kitchenRow && <div className="k-rh k-rh-kitchen" style={{ gridRow: 2, gridColumn: 1 }}>Kitchen</div>}
          {kitchenRow && t.columns.map((c, ci) => {
            const k = t.kitchen.find(x => x.stepIndex === c.stepIndex)
            return k
              ? <button key={ci} className={`k-td act kitchen ${sel === c.stepIndex ? 'sel' : ''}`} style={{ gridRow: 2, gridColumn: ci + 2 }} onClick={() => pick(c.stepIndex)}>{k.label}</button>
              : <div key={ci} className={`k-td ${sel === c.stepIndex ? 'sel' : ''}`} style={{ gridRow: 2, gridColumn: ci + 2 }} />
          })}

          {t.rows.map((iid, ri) => {
            const ing = byId.get(iid)!
            const amount = scaleAmount(ing.amount, factor)
            return (
              <div key={iid} className="k-rh" style={{ gridRow: first + ri, gridColumn: 1 }}>
                {amount && <span className="k-rh-amount">{amount}</span>}
                <span className="k-rh-name">{ing.name}</span>
              </div>
            )
          })}
          {t.columns.map((c, ci) => c.cells.map((cell, k) => {
            const style = { gridRow: `${first + cell.from} / span ${cell.to - cell.from + 1}`, gridColumn: ci + 2 }
            const cls = `k-td ${cell.kind} ${sel === c.stepIndex ? 'sel' : ''}`
            return cell.kind === 'act'
              ? <button key={`${ci}-${k}`} className={cls} style={style} onClick={() => pick(c.stepIndex)}>{c.label}</button>
              : <div key={`${ci}-${k}`} className={cls} style={style} aria-hidden="true" />
          }))}
        </div>
      </div>

      <div className="k-table-step" aria-live="polite">
        {step
          ? <><span className="k-num sm">{sel! + 1}</span><p>{step.text}</p></>
          : <p className="muted small">Tap a step to read it in full. Once ingredients are combined they share one cell.</p>}
      </div>
    </div>
  )
}
