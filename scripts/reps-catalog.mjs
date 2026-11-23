// Builds src/apps/reps/catalog.json from free-exercise-db (public domain):
// https://github.com/yuhonas/free-exercise-db
//
//   node scripts/reps-catalog.mjs            fetch the latest list from GitHub
//   node scripts/reps-catalog.mjs file.json  use a downloaded exercises.json
//
// Only the fields Reps shows are kept. Photos are not copied: the app loads
// them from the dataset's GitHub repo and caches them once seen.
import { readFile, writeFile } from 'node:fs/promises'

const SRC = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const OUT = new URL('../src/apps/reps/catalog.json', import.meta.url)

const raw = process.argv[2]
  ? JSON.parse(await readFile(process.argv[2], 'utf8'))
  : await (await fetch(SRC)).json()

const rows = raw.map(x => ({
  id: x.id,
  name: x.name.trim(),
  primary: x.primaryMuscles,
  secondary: x.secondaryMuscles,
  equipment: x.equipment ?? '',
  category: x.category,
  level: x.level,
  force: x.force ?? '',
  steps: x.instructions.map(s => s.trim()).filter(Boolean),
  photos: x.images.length,
})).sort((a, b) => a.name.localeCompare(b.name))

await writeFile(OUT, JSON.stringify(rows))
console.log(`Wrote ${rows.length} exercises to ${OUT.pathname}`)
