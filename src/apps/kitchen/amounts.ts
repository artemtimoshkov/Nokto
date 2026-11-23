/**
 * Scaling ingredient amounts when you change the number of servings.
 * Only the leading quantity is touched: "1 1/2 cups milk" × 2 → "3 cups milk".
 * Text without a leading number ("a pinch", "to taste") is left alone.
 */

const VULGAR: Record<string, number> = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 }
const V = Object.keys(VULGAR).join('')

// "1 1/2", "1½", "1/2", "½", "1.5", "1,5", "2"
const NUM = `(?:\\d+\\s+\\d+\\/\\d+|\\d+\\s*[${V}]|\\d+\\/\\d+|[${V}]|\\d+(?:[.,]\\d+)?)`
const LEAD = new RegExp(`^\\s*(${NUM})(?:\\s*(?:-|–|to)\\s*(${NUM}))?`)

export function parseNumber(s: string): number | null {
  s = s.trim()
  let m: RegExpMatchArray | null
  if ((m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/))) return +m[1] + +m[2] / +m[3]
  if ((m = s.match(new RegExp(`^(\\d+)\\s*([${V}])$`)))) return +m[1] + VULGAR[m[2]]
  if ((m = s.match(/^(\d+)\/(\d+)$/))) return +m[2] ? +m[1] / +m[2] : null
  if (VULGAR[s] !== undefined) return VULGAR[s]
  if (/^\d+(?:[.,]\d+)?$/.test(s)) return parseFloat(s.replace(',', '.'))
  return null
}

const FRACTIONS: [number, string][] = [[1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾']]

/** Kitchen-friendly number: ½ and ¾ for small amounts, round grams and millilitres. */
export function formatNumber(n: number, metric = false): string {
  if (n <= 0) return '0'
  if (metric || n >= 10) {
    const step = n >= 100 ? 5 : n >= 10 ? 1 : 0.1
    const r = Math.round(n / step) * step
    return String(+r.toFixed(1))
  }
  const whole = Math.floor(n)
  const frac = n - whole
  if (frac < 0.06) return String(whole || +n.toFixed(2))
  if (frac > 0.94) return String(whole + 1)
  const near = FRACTIONS.find(([v]) => Math.abs(v - frac) < 0.045)
  if (near) return whole ? `${whole}${near[1]}` : near[1]
  return String(+n.toFixed(1))
}

const METRIC = /^\s*(g|gr|grams?|kg|ml|millilit(re|er)s?|l|lit(re|er)s?|cl|dl)\b/i

export function scaleAmount(amount: string, factor: number): string {
  if (factor === 1) return amount
  const m = amount.match(LEAD)
  if (!m) return amount
  const a = parseNumber(m[1])
  if (a === null) return amount
  const rest = amount.slice(m[0].length)
  const metric = METRIC.test(rest)
  const b = m[2] ? parseNumber(m[2]) : null
  const lead = amount.match(/^\s*/)![0]
  const q = b !== null ? `${formatNumber(a * factor, metric)}–${formatNumber(b * factor, metric)}` : formatNumber(a * factor, metric)
  return lead + q + rest
}
