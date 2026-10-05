// raw + overrides + registry → public/data/{items,warbonds,meta,aliases}.json
// 사용: npm run data:build [-- --dry-run] [-- --assign-n] [-- --label <ver>]
import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from 'node:fs'
// 산출물 형식은 앱이 읽는 계약(src/data/types.ts)을 그대로 쓴다. 계약이 바뀌면 여기서 컴파일 오류가 난다
import type { Item, Kind, Meta, RuleTag, Source, StratType, Warbond } from '../src/data/types.ts'
import { loadRaw, targetArmor, targetStratagems, targetWeapons, WEAPON_CATEGORY_TO_KIND } from './lib/raw.ts'
import { itemId, slugify } from './lib/slug.ts'
import { firstLink, hasWord, replaceEmDash, stripMarkup, warbondPageOf } from './lib/wikitext.ts'
import { KO_PATH, readJson, resolveAliasId, type KoOverrides } from './lib/overrides.ts'
import type { CargoRow } from './lib/cargo.ts'

interface Manual { [id: string]: { stratType?: StratType; exclude?: boolean } }
interface Registry { next: number; ids: Record<string, number> }

const OUT = 'public/data'
const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const assignN = args.has('--assign-n')
const labelIdx = process.argv.indexOf('--label')
const label = labelIdx > 0 ? process.argv[labelIdx + 1] : undefined

const EM = '—'
const errors: string[] = []
const warnings: string[] = []

// ── 획득처 매핑(wiki Cargo `source` 문구 기준) ─────────────────────
const SHIP_MODULES = ['Patriotic Administration Center', 'Engineering Bay', 'Hangar', 'Robotics Workshop', 'Bridge', 'Orbital Cannons', 'Starter Equipment']
const CAMPAIGN_MARKERS = ['Liberty Day', 'Anniversary Gift', 'Pre-Order Bonus', 'Campaigns', 'Downloadable Content', 'Escalation of Freedom']

function classifySource(source: string, warbondPages: Map<string, string>): { source: Source; warbondId: string | null; warbondPage: number | null } {
  const link = firstLink(source)
  if (link && warbondPages.has(link.page)) {
    return { source: 'warbond', warbondId: warbondPages.get(link.page)!, warbondPage: warbondPageOf(source) }
  }
  // 링크 타깃(`[[Campaigns#…|라벨]]`)은 라벨만 남기면 사라지므로 원문과 정리본을 둘 다 본다.
  const text = source + ' ' + stripMarkup(source)
  if (/superstore/i.test(text)) return { source: 'superstore', warbondId: null, warbondPage: null }
  if (SHIP_MODULES.some((m) => text.includes(m))) return { source: 'default', warbondId: null, warbondPage: null }
  if (CAMPAIGN_MARKERS.some((m) => text.includes(m))) return { source: 'campaign', warbondId: null, warbondPage: null }
  if (/Super Citizen/i.test(text)) return { source: 'citizen', warbondId: null, warbondPage: null }
  return { source: 'unknown', warbondId: null, warbondPage: null }
}

// ── 스트라타젬 분류 ─────────────────────────────────────────
function classifyStrat(row: CargoRow): StratType {
  const t = row.stratagem_type
  const traits = row.traits ?? ''
  switch (t) {
    case 'Orbital': return /Barrage/i.test(row._pageName) ? 'orbital_barrage' : 'orbital_strike'
    case 'Eagle': return 'eagle'
    case 'Support Weapon':
      if (hasWord(traits, 'Expendable')) return 'disposable'
      if (hasWord(traits, 'Backpack')) return 'support_backpack'
      return 'support_weapon'
    case 'Backpack': return 'backpack'
    case 'Sentry': return 'sentry'
    case 'Emplacement': return 'emplacement'
    case 'Vehicle': return 'vehicle'
    default:
      errors.push(`stratagem_type 매핑표에 없는 값 "${t}" (${row._pageName}): 매핑표를 먼저 확장할 것`)
      return 'support_weapon'
  }
}

function tagsOf(st: StratType): RuleTag[] {
  const tags: RuleTag[] = []
  if (st === 'backpack' || st === 'support_backpack') tags.push('backpack')
  if (st === 'support_weapon' || st === 'support_backpack' || st === 'disposable') tags.push('support_weapon')
  if (st === 'disposable') tags.push('disposable')
  if (st === 'eagle') tags.push('eagle')
  return tags
}

function main() {
  const raw = loadRaw()
  const ko = readJson<KoOverrides>(KO_PATH, { items: {}, passives: {}, warbonds: {} })
  const manual = readJson<Manual>('data/overrides/manual.json', {})
  const aliases = readJson<Record<string, string>>('data/overrides/aliases.json', {})
  const registry = readJson<Registry>('data/registry.json', { next: 1, ids: {} })
  const prevMeta = readJson<Partial<Meta> | null>(`${OUT}/meta.json`, null)
  const prevItems = readJson<Item[]>(`${OUT}/items.json`, [])

  // alias 적용: 구 id의 registry n · ko · manual 항목을 신 id로 이동(아이템 id와 채권 id를 함께 담는다).
  // 아이템에 고정된 채권 id(ko.items[*].warbondId)는 base()에서 alias를 따라간다
  for (const [oldId, newId] of Object.entries(aliases)) {
    if (registry.ids[oldId] !== undefined && registry.ids[newId] === undefined) registry.ids[newId] = registry.ids[oldId]
    if (ko.items[oldId] && !ko.items[newId]) ko.items[newId] = ko.items[oldId]
    if (ko.warbonds[oldId] && !ko.warbonds[newId]) ko.warbonds[newId] = ko.warbonds[oldId]
    if (manual[oldId] && !manual[newId]) manual[newId] = manual[oldId]
  }

  const missingKo: string[] = []
  const unknownSource: string[] = []

  // ── 채권 ──
  const warbondPages = new Map<string, string>() // _pageName → id
  const warbonds: Warbond[] = [...raw.tables.Warbonds]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w, i) => {
      const id = slugify(w._pageName)
      warbondPages.set(w._pageName, id)
      const nameKo = ko.warbonds[id]
      if (!nameKo) missingKo.push(`warbond:${id}`)
      return { id, nameKo: nameKo ?? w.title, nameEn: w.title, order: i, releaseDate: w.date, type: w.type.toLowerCase() as Warbond['type'] }
    })

  // ── 패시브 ──
  const passiveIcon = new Map(raw.tables.Armor_Passive.map((p) => [p._pageName, `icons/passive/${slugify(p._pageName)}.webp`]))

  // ── 아이템 ──
  const items: Item[] = []
  const unassigned: string[] = []
  const nOf = (id: string): number => {
    if (registry.ids[id] !== undefined) return registry.ids[id]
    if (assignN) {
      registry.ids[id] = registry.next++
      return registry.ids[id]
    }
    unassigned.push(id)
    return -1
  }
  const base = (kind: Kind, row: CargoRow) => {
    const id = itemId(kind, row._pageName)
    const k = ko.items[id]
    const nameEn = replaceEmDash(row._pageName)
    if (!k?.nameKo) missingKo.push(id)
    const src = classifySource(row.source ?? '', warbondPages)
    if (k?.warbondId) { src.source = 'warbond'; src.warbondId = resolveAliasId(aliases, k.warbondId) }
    if (k?.warbondPage !== undefined) src.warbondPage = k.warbondPage
    if (src.source === 'unknown') unknownSource.push(id)
    // wikiPage는 위키 페이지 키(아이콘 조인 · wiki 링크)라 원문 그대로 둔다. 화면에 보이는 nameEn만 em dash를 치환한다
    return { id, n: nOf(id), kind, nameKo: k?.nameKo ?? nameEn, nameEn, wikiPage: row._pageName, ...src, weaponType: k?.weaponType ?? null, armorClass: null as Item['armorClass'], passive: null as Item['passive'] }
  }
  for (const row of targetWeapons(raw)) {
    const kind = WEAPON_CATEGORY_TO_KIND[row.weapon_category]
    const b = base(kind, row)
    items.push({ ...b, icon: `icons/gear/${b.id}.webp`, card: `icons/gear-card/${b.id}.webp`, thumb: `icons/gear-thumb/${b.id}.webp` })
  }
  for (const row of targetArmor(raw)) {
    const b = base('armor', row)
    const passiveEn = row.passive || null
    let passive: Item['passive'] = null
    if (passiveEn) {
      const nameKo = ko.passives[passiveEn]
      if (!nameKo) missingKo.push(`passive:${passiveEn}`)
      passive = { nameKo: nameKo ?? passiveEn, nameEn: passiveEn, icon: passiveIcon.get(passiveEn) ?? '' }
      if (!passiveIcon.has(passiveEn)) warnings.push(`패시브 아이콘 없음: ${passiveEn} (${b.id})`)
    }
    const cls = row.type?.toLowerCase()
    items.push({
      ...b, armorClass: cls === 'light' || cls === 'medium' || cls === 'heavy' ? cls : null, passive,
      icon: `icons/armor/${b.id}.webp`, card: `icons/armor-card/${b.id}.webp`, thumb: `icons/armor-thumb/${b.id}.webp`,
    })
  }
  for (const row of targetStratagems(raw)) {
    // 제외 항목은 공통 처리(n 배정 · 누락 기록) 전에 건너뛴다. 뒤에서 거르면 append-only 장부에 번호가 남는다
    if (manual[itemId('stratagem', row._pageName)]?.exclude) continue
    const b = base('stratagem', row)
    const st = manual[b.id]?.stratType ?? classifyStrat(row)
    const icon = `icons/strat/${b.id}.svg`
    items.push({ ...b, stratType: st, tags: tagsOf(st), icon, card: icon, thumb: icon })
  }

  // ── 검증 ──
  const ids = new Set<string>()
  const ns = new Set<number>()
  for (const it of items) {
    if (ids.has(it.id)) errors.push(`id 중복: ${it.id}`)
    ids.add(it.id)
    if (it.n >= 0) { if (ns.has(it.n)) errors.push(`n 중복: ${it.n} (${it.id})`); ns.add(it.n) }
    if (it.warbondId && !warbonds.some((w) => w.id === it.warbondId)) errors.push(`warbondId 없음: ${it.warbondId} (${it.id})`)
    if ((it.kind === 'stratagem') !== (it.stratType !== undefined)) errors.push(`stratType 불일치: ${it.id}`)
    for (const v of [it.nameKo, it.weaponType ?? '', it.passive?.nameKo ?? '']) if (v.includes(EM)) errors.push(`em dash: ${it.id} "${v}"`)
    if (!dryRun && !existsSync(`public/${it.icon}`)) warnings.push(`아이콘 파일 없음: ${it.icon}`)
  }
  for (const w of warbonds) if (w.nameKo.includes(EM)) errors.push(`em dash: warbond ${w.id}`)
  if (!dryRun && unassigned.length) errors.push(`n 미배정 ${unassigned.length}건: --assign-n 으로 실행할 것`)

  const counts: Record<Kind, number> = { primary: 0, secondary: 0, throwable: 0, armor: 0, stratagem: 0 }
  for (const it of items) counts[it.kind]++

  // ── 보고 ── 개수는 직전 빌드(meta.json)와 비교한다. 신규 패치만큼 늘고 줄어든 것이 있으면 확인 대상
  const prevCounts = prevMeta?.counts
  const delta = (Object.keys(counts) as Kind[]).map((k) => {
    const d = prevCounts ? counts[k] - (prevCounts[k] ?? 0) : 0
    return `${k} ${counts[k]}${d ? ` (${d > 0 ? '+' : ''}${d})` : ''}`
  })
  console.log(`counts: ${delta.join(' · ')}${prevCounts ? '  (괄호 = 직전 빌드 대비)' : ''}`)
  console.log(`warbonds: ${warbonds.length}`)
  console.log(`missingKo (${missingKo.length}): ${missingKo.join(', ') || '없음'}`)
  console.log(`unknownSource (${unknownSource.length}): ${unknownSource.join(', ') || '없음'}`)
  console.log(`n 미배정 (${unassigned.length}): ${unassigned.slice(0, 10).join(', ')}${unassigned.length > 10 ? ' …' : ''}`)
  const prevIds = new Set(prevItems.map((i) => i.id))
  const added = items.filter((i) => !prevIds.has(i.id))
  const removed = prevItems.filter((i) => !ids.has(i.id))
  console.log(`변경: 추가 ${added.length} · 삭제 ${removed.length}`)
  for (const w of warnings) console.warn('경고: ' + w)
  if (errors.length) {
    for (const e of errors) console.error('오류: ' + e)
    console.error(`\ndata:build 실패: 오류 ${errors.length}건. 어느 파일도 쓰지 않았습니다.`)
    process.exit(1)
  }
  if (dryRun) {
    console.log('\n(dry-run) 파일을 쓰지 않았습니다.')
    return
  }

  // ── 기록 (임시 파일 → rename) ──
  mkdirSync(OUT, { recursive: true })
  const version = label ?? prevMeta?.version ?? 'unversioned'
  const meta = { version, builtAt: new Date().toISOString(), fetchedAt: raw.fetchedAt, counts, missingKo, unknownSource } satisfies Meta
  const files: [string, unknown][] = [
    [`${OUT}/items.json`, items],
    [`${OUT}/warbonds.json`, warbonds],
    [`${OUT}/meta.json`, meta],
    [`${OUT}/aliases.json`, aliases],
    ['data/registry.json', registry],
  ]
  for (const [p, data] of files) {
    writeFileSync(p + '.tmp', JSON.stringify(data, null, p.endsWith('items.json') ? 0 : 2) + '\n')
  }
  for (const [p] of files) renameSync(p + '.tmp', p)

  if (added.length || removed.length) {
    const changelog = 'data/CHANGELOG.md'
    const prev = existsSync(changelog) ? readFileSync(changelog, 'utf8').replace(/^# .*\n\n?/, '') : ''
    const lines = [
      `## ${version} (${new Date().toISOString().slice(0, 10)})`,
      '',
      ...(added.length ? ['추가:', ...added.map((i) => `- ${i.nameKo} (${i.nameEn})`), ''] : []),
      ...(removed.length ? ['삭제:', ...removed.map((i) => `- ${i.nameKo} (${i.nameEn})`), ''] : []),
    ]
    writeFileSync(changelog, `# 데이터 변경 기록\n\n${lines.join('\n')}\n${prev}`)
  }
  console.log(`\nsaved ${OUT}/*.json · data/registry.json (version ${version})`)
}

main()
