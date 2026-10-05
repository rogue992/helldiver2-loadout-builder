// 툴 텍스트에 em dash(U+2014)가 들어가면 실패. 대상: src/**, README.md, public/data/*.json의 사람이 쓰는 필드.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const EM = '—'
const failures: string[] = []

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p, exts))
    else if (exts.some((e) => p.endsWith(e))) out.push(p)
  }
  return out
}

function checkText(path: string) {
  const lines = readFileSync(path, 'utf8').split('\n')
  lines.forEach((l, i) => {
    if (l.includes(EM)) failures.push(`${path}:${i + 1}: ${l.trim()}`)
  })
}

for (const f of walk('src', ['.ts', '.tsx', '.css'])) checkText(f)
if (existsSync('README.md')) checkText('README.md')

// 데이터: 사람이 쓰는 필드만 본다. nameEn은 빌드에서 치환되고, wikiPage는 화면에 보이지 않는 위키 페이지 키라 원문 그대로 둔다.
const HUMAN_FIELDS = ['nameKo', 'weaponType']
if (existsSync('public/data/items.json')) {
  const items = JSON.parse(readFileSync('public/data/items.json', 'utf8')) as Record<string, unknown>[]
  for (const it of items) {
    for (const f of HUMAN_FIELDS) {
      const v = it[f]
      if (typeof v === 'string' && v.includes(EM)) failures.push(`items.json ${it.id} ${f}: ${v}`)
    }
    const p = it.passive as { nameKo?: string } | null
    if (p?.nameKo?.includes(EM)) failures.push(`items.json ${it.id} passive.nameKo: ${p.nameKo}`)
  }
}
if (existsSync('public/data/warbonds.json')) {
  const wbs = JSON.parse(readFileSync('public/data/warbonds.json', 'utf8')) as { id: string; nameKo: string }[]
  for (const w of wbs) if (w.nameKo.includes(EM)) failures.push(`warbonds.json ${w.id} nameKo: ${w.nameKo}`)
}

if (failures.length) {
  console.error(`lint:copy 실패: em dash ${failures.length}건`)
  for (const f of failures) console.error('  ' + f)
  process.exit(1)
}
console.log('lint:copy OK')
