// public/data/items.json을 읽어 없는 아이콘만 내려받는다.
// 스트라타젬: nvigneux SVG(정규화 매칭 + 수동표), 없으면 wiki SVG 임시 폴백(icon-fallbacks.json에 기록해 매 실행 재시도).
// 무기 · 방어구: wiki 렌더 → 투명 여백 제거(무기) / 상체 정사각 크롭(방어구, SES 프레이밍) → webp(원본 · card 200 · thumb 64). 패시브: wiki SVG → webp 64.
// 아이템 하나가 실패해도 나머지는 계속 만들고 끝에 실패 목록을 보고한다. 위키 429만 즉시 중단한다.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { Item as DataItem } from '../src/data/types.ts'
import { download, imageInfos, USER_AGENT } from './lib/cargo.ts'
import { readJson } from './lib/overrides.ts'
import { normKey, stripModelCode } from './lib/slug.ts'
import { loadRaw } from './lib/raw.ts'
import { NVIGNEUX_MANUAL } from './lib/strat-map.ts'
import { svgIssues } from './lib/svg.ts'
import { toWebp, torsoCrop, trimAlpha } from './lib/webp.ts'

type Item = Pick<DataItem, 'id' | 'kind' | 'nameEn' | 'wikiPage' | 'icon' | 'card' | 'thumb' | 'passive'>

// nvigneux는 커밋 SHA로 고정한다(받는 내용이 모르게 바뀌지 않게). 올릴 때는 그 사이 변경을 확인하고 이 값만 바꾼다
const NVIG_REF = 'ea2aa2b483a5354e14975cfb44e0349e89467b76'
const NVIG_TREE = `https://api.github.com/repos/nvigneux/Helldivers-2-Stratagems-icons-svg/git/trees/${NVIG_REF}?recursive=1`
const NVIG_RAW = `https://raw.githubusercontent.com/nvigneux/Helldivers-2-Stratagems-icons-svg/${NVIG_REF}/`
const MAP_PATH = 'data/strat-icon-map.json'
const FALLBACK_PATH = 'data/icon-fallbacks.json'

const failures: string[] = []

/** 위키가 계속 429를 주면 규칙상 중단한다. 그 밖의 예외는 아이템 단위 실패로 모은다 */
const isRateLimit = (e: unknown) => e instanceof Error && /\b429\b/.test(e.message)
async function attempt(label: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn()
    return true
  } catch (e) {
    if (isRateLimit(e)) throw e
    failures.push(`${label}: ${e instanceof Error ? e.message : String(e)}`)
    return false
  }
}

async function ghTree(): Promise<string[]> {
  const res = await fetch(NVIG_TREE, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/vnd.github+json' } })
  if (!res.ok) throw new Error(`GitHub tree ${res.status}`)
  const json = (await res.json()) as { tree: { path: string; type: string }[]; truncated: boolean }
  if (json.truncated) throw new Error('GitHub tree truncated')
  return json.tree.filter((t) => t.type === 'blob' && t.path.endsWith('.svg')).map((t) => t.path)
}

/** 루트 <svg>에 fill이 없으면 흰색 기본값을 넣는다(일부 파일이 검게 렌더되는 것 방지). 안전 검사는 svgIssues가 따로 한다 */
function ensureFill(svg: string): string {
  return svg.replace(/<svg\b([^>]*)>/, (m, attrs: string) => (/\sfill=/.test(attrs) ? m : `<svg${attrs} fill="#fff">`))
}

function save(path: string, data: Buffer | string) {
  mkdirSync(path.slice(0, path.lastIndexOf('/')), { recursive: true })
  writeFileSync(path, data)
}

/** 검사를 통과한 SVG만 저장한다. 위반이 있으면 저장하지 않고 이유를 던진다 */
function saveSvg(path: string, svg: string) {
  const issues = svgIssues(svg)
  if (issues.length) throw new Error(`SVG 거부(${issues.join(', ')})`)
  save(path, svg)
}

async function stratagems(items: Item[]) {
  const targets = items.filter((i) => i.kind === 'stratagem')
  const targetIds = new Set(targets.map((t) => t.id))
  const paths = await ghTree()
  const byKey = new Map<string, string[]>()
  for (const p of paths) {
    const file = p.slice(p.lastIndexOf('/') + 1, -4)
    const k = normKey(file)
    byKey.set(k, [...(byKey.get(k) ?? []), p])
  }
  const map: Record<string, string> = {}
  // 지금 대상이 아닌 id(개명 · 제외 · 삭제된 폴백)는 처음부터 뺀다. 남겨 두면 매칭 수가 맞지 않아 매번 실패한다
  const fallbacks = new Set(readJson<string[]>(FALLBACK_PATH, []).filter((id) => targetIds.has(id)))
  const unmatched: Item[] = []
  for (const it of targets) {
    let path: string | undefined
    const manual = NVIGNEUX_MANUAL[it.wikiPage]
    const candidates = manual ? [normKey(manual)] : [normKey(stripModelCode(it.wikiPage)), normKey(it.wikiPage)]
    for (const c of candidates) {
      const hits = byKey.get(c)
      if (!hits) continue
      if (hits.length > 1) {
        failures.push(`nvigneux 키 충돌: ${it.wikiPage} → ${hits.join(' | ')}`)
        break
      }
      path = hits[0]
      break
    }
    if (!path) {
      unmatched.push(it)
      continue
    }
    // 폴백(wiki SVG)으로 받아 둔 것은 nvigneux에 생기면 다시 받아 교체한다
    const wasFallback = fallbacks.has(it.id)
    const ok = await attempt(it.wikiPage, async () => {
      if (!existsSync(`public/${it.icon}`) || wasFallback) {
        const svg = (await download(NVIG_RAW + path.split('/').map(encodeURIComponent).join('/'))).toString('utf8')
        saveSvg(`public/${it.icon}`, ensureFill(svg))
      }
    })
    if (ok) {
      map[it.id] = path
      fallbacks.delete(it.id)
    }
  }

  // nvigneux에 없음 → wiki SVG 임시 폴백
  if (unmatched.length) {
    const raw = loadRaw()
    const fileOf = new Map(unmatched.map((it) => [it.id, raw.tables.Stratagems.find((r) => r._pageName === it.wikiPage)?.image ?? '']))
    const infos = await imageInfos([...fileOf.values()])
    for (const it of unmatched) {
      const info = infos.get(fileOf.get(it.id)!)
      if (!info) {
        failures.push(`스트라타젬 아이콘 없음: ${it.wikiPage}`)
        continue
      }
      const ok = await attempt(it.wikiPage, async () => {
        if (!existsSync(`public/${it.icon}`)) saveSvg(`public/${it.icon}`, (await download(info.url)).toString('utf8'))
      })
      if (ok) {
        fallbacks.add(it.id)
        console.warn(`폴백(wiki SVG): ${it.wikiPage}`)
      }
    }
  }

  const matched = Object.keys(map).length
  if (matched + fallbacks.size !== targets.length) {
    const missing = targets.filter((t) => !map[t.id] && !fallbacks.has(t.id)).map((t) => t.wikiPage)
    failures.push(`스트라타젬 매칭 수 불일치: nvigneux ${matched} + 폴백 ${fallbacks.size} ≠ 대상 ${targets.length} (빠진 것: ${missing.join(', ')})`)
  }
  save(MAP_PATH, JSON.stringify(map, null, 2) + '\n')
  save(FALLBACK_PATH, JSON.stringify([...fallbacks].sort(), null, 2) + '\n')
  console.log(`스트라타젬: nvigneux ${matched} · 폴백 ${fallbacks.size} / ${targets.length}`)
}

async function gearAndArmor(items: Item[]) {
  const raw = loadRaw()
  const imageOf = new Map<string, string>()
  for (const r of raw.tables.Weapons) imageOf.set(r._pageName, r.image)
  for (const r of raw.tables.Armor) if (r.type !== 'Helmet') imageOf.set(r._pageName, r.image)
  const todo = items.filter((i) => i.kind !== 'stratagem' && [i.icon, i.card, i.thumb].some((p) => !existsSync(`public/${p}`)))
  // 방어구 원본은 1024 정사각(상체 크롭 후 절반 남짓), 무기 원본은 매우 넓어 여백 제거 후 폭 1200이면 충분하다
  const fileOf = (it: Item) => imageOf.get(it.wikiPage) ?? ''
  const armorInfo = await imageInfos(todo.filter((i) => i.kind === 'armor').map(fileOf), 1024)
  const weaponInfo = await imageInfos(todo.filter((i) => i.kind !== 'armor').map(fileOf), 1200)
  let done = 0
  for (const it of todo) {
    const isArmor = it.kind === 'armor'
    const info = (isArmor ? armorInfo : weaponInfo).get(fileOf(it))
    if (!info) {
      failures.push(`렌더 없음: ${it.wikiPage}`)
      continue
    }
    const ok = await attempt(it.wikiPage, async () => {
      const fetched = await download(info.thumbUrl ?? info.url)
      const src = isArmor ? await torsoCrop(fetched) : await trimAlpha(fetched)
      const isPrimary = it.kind === 'primary'
      save(`public/${it.icon}`, await toWebp(src, isArmor ? { width: 480, height: 480, quality: 82 } : { width: isPrimary ? 800 : 400, quality: 82 }))
      save(`public/${it.card}`, await toWebp(src, { width: 200, height: 200, quality: 80 }))
      save(`public/${it.thumb}`, await toWebp(src, { width: 64, height: 64, quality: 80 }))
    })
    if (ok) done++
  }
  console.log(`무기·방어구 렌더: ${done}건 새로 생성`)
}

async function passives(items: Item[]) {
  const raw = loadRaw()
  const todo = new Map<string, NonNullable<Item['passive']>>()
  for (const it of items) {
    const p = it.passive
    if (p?.icon && !todo.has(p.icon) && !existsSync(`public/${p.icon}`)) todo.set(p.icon, p)
  }
  const fileOf = (p: NonNullable<Item['passive']>) => raw.tables.Armor_Passive.find((r) => r._pageName === p.nameEn)?.image ?? ''
  const infos = await imageInfos([...todo.values()].map(fileOf))
  let done = 0
  for (const p of todo.values()) {
    const info = infos.get(fileOf(p))
    if (!info) {
      failures.push(`패시브 아이콘 없음: ${p.nameEn}`)
      continue
    }
    const ok = await attempt(`패시브 ${p.nameEn}`, async () => {
      save(`public/${p.icon}`, await toWebp(await download(info.url), { width: 64, height: 64, quality: 80 }))
    })
    if (ok) done++
  }
  console.log(`패시브 아이콘: ${done}건 새로 생성`)
}

async function main() {
  const items = JSON.parse(readFileSync('public/data/items.json', 'utf8')) as Item[]
  await stratagems(items)
  await gearAndArmor(items)
  await passives(items)
  if (failures.length) {
    console.error(`\nicons:fetch 실패 목록 ${failures.length}건:`)
    for (const f of failures) console.error('  ' + f)
    process.exit(1)
  }
  console.log('icons:fetch OK')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
