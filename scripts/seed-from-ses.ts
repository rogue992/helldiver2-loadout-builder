// 1회성: ses-csd 시드(한글명 · 소분류 · 채권 · 패시브)를 wiki 페이지명과 조인해 data/overrides/ko.json을 만든다.
// 사용: npm run data:seed -- <ses data.json 경로> [--force]
// ko.json은 시드 뒤로 사람이 관리하는 파일이다. 이미 있으면 --force 없이는 덮어쓰지 않는다(손으로 넣은 한글명 · 채권 보정이 사라지므로).
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { KO_PATH, type KoOverrides } from './lib/overrides.ts'
import { loadRaw, targetArmor, targetStratagems, targetWeapons, WEAPON_CATEGORY_TO_KIND } from './lib/raw.ts'
import { itemId, modelCodeKey, slugify } from './lib/slug.ts'
import { firstLink } from './lib/wikitext.ts'
import { ORBITAL_EAGLE_KO_TO_EN } from './lib/strat-map.ts'

interface SeedItem {
  id: string
  type: string
  name_ko: string
  subType: string
  weaponType: string
  passive: string
  wbrequirement: string
  unlock: string | number
}

/** 시드 wbrequirement 중 채권이 아닌 값. 이들은 wiki source 매핑에 맡긴다. */
const NON_WARBOND = new Set(['기본', '슈퍼 스토어', '캠페인 보상', '슈퍼시민권 업그레이드'])

function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const seedPath = args.find((a) => !a.startsWith('--'))
  if (!seedPath || !existsSync(seedPath)) {
    console.error('사용법: npm run data:seed -- <ses-csd data.json 경로> [--force]')
    process.exit(2)
  }
  if (existsSync(KO_PATH) && !force) {
    console.error(`${KO_PATH}가 이미 있습니다. 시드로 통째로 덮으려면 --force를 붙이세요(손으로 추가한 항목이 사라집니다).`)
    process.exit(2)
  }
  const seed = JSON.parse(readFileSync(seedPath, 'utf8')) as { items: SeedItem[] }
  const raw = loadRaw()
  const warbondByPage = new Map(raw.tables.Warbonds.map((w) => [w._pageName, w]))

  // wiki 쪽 인덱스: 코드 키 → (kind, row)
  const byCode = new Map<string, { kind: Parameters<typeof itemId>[0]; page: string; row: Record<string, string> }>()
  const collide: string[] = []
  const put = (kind: Parameters<typeof itemId>[0], row: Record<string, string>) => {
    const key = modelCodeKey(row._pageName)
    if (!key) return
    const k = `${kind}:${key}`
    if (byCode.has(k)) collide.push(k)
    byCode.set(k, { kind, page: row._pageName, row })
  }
  for (const r of targetWeapons(raw)) put(WEAPON_CATEGORY_TO_KIND[r.weapon_category], r)
  for (const r of targetArmor(raw)) put('armor', r)
  for (const r of targetStratagems(raw)) put('stratagem', r)
  if (collide.length) {
    console.error('wiki 쪽 코드 키 충돌:', collide)
    process.exit(1)
  }
  const stratByPage = new Map(targetStratagems(raw).map((r) => [r._pageName, r]))

  const out: KoOverrides = { items: {}, passives: {}, warbonds: {} }
  const unmatched: string[] = []
  const seedKind = (t: string) =>
    t === '주무기' ? 'primary' : t === '보조무기' ? 'secondary' : t === '투척무기' ? 'throwable' : t === 'armor' ? 'armor' : 'stratagem'

  for (const s of seed.items) {
    const kind = seedKind(s.type)
    let hit: { page: string; row: Record<string, string> } | undefined
    if (kind === 'stratagem' && ORBITAL_EAGLE_KO_TO_EN[s.name_ko]) {
      const page = ORBITAL_EAGLE_KO_TO_EN[s.name_ko]
      const row = stratByPage.get(page)
      if (row) hit = { page, row }
    } else {
      const key = modelCodeKey(s.name_ko)
      if (key) hit = byCode.get(`${kind}:${key}`)
    }
    if (!hit) {
      unmatched.push(`${s.type} ${s.id} ${s.name_ko}`)
      continue
    }
    const id = itemId(kind, hit.page)
    const entry: KoOverrides['items'][string] = { nameKo: s.name_ko }
    if (s.weaponType) entry.weaponType = s.weaponType

    // 채권: wiki source 링크 타깃 → Warbonds._pageName 슬러그. 한글 채권명은 시드 wbrequirement.
    const link = firstLink(hit.row.source ?? '')
    if (link && warbondByPage.has(link.page)) {
      const wbId = slugify(link.page)
      entry.warbondId = wbId
      if (typeof s.unlock === 'number' || /^\d+$/.test(String(s.unlock))) entry.warbondPage = Number(s.unlock)
      if (s.wbrequirement && !NON_WARBOND.has(s.wbrequirement)) out.warbonds[wbId] ??= s.wbrequirement
    }
    // 패시브: wiki Armor.passive(영문) ↔ 시드 passive(한글)
    if (kind === 'armor' && hit.row.passive && s.passive) out.passives[hit.row.passive] ??= s.passive
    out.items[id] = entry
  }

  writeFileSync(KO_PATH, JSON.stringify(out, null, 2) + '\n')
  console.log(`ko.json: items ${Object.keys(out.items).length} · passives ${Object.keys(out.passives).length} · warbonds ${Object.keys(out.warbonds).length}`)
  if (unmatched.length) {
    console.error(`\n시드 → wiki 미매칭 ${unmatched.length}건:`)
    for (const u of unmatched) console.error('  ' + u)
    process.exit(1)
  }
}

main()
