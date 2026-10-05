// wiki.gg Cargo 5테이블을 받아 data/raw/wiki.json에 저장하고, 이전 스냅샷과의 행 단위 diff를 출력한다.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { cargoQuery, type CargoRow } from './lib/cargo.ts'
import { RAW_PATH, type RawSnapshot } from './lib/raw.ts'

const TABLES: Record<string, string[]> = {
  Stratagems: ['_pageName', 'image', 'stratagem_type', 'permit_type', 'traits', 'base_cooldown', 'source'],
  Weapons: ['_pageName', 'image', 'weapon_category', 'weapon_type', 'source', 'cost'],
  Armor: ['_pageName', 'image', 'type', 'passive', 'source', 'cost'],
  Armor_Passive: ['_pageName', 'image'],
  Warbonds: ['_pageName', 'title', 'image', 'date', 'type'],
}

/**
 * diff용 행 키. Armor는 본체와 헬멧이 같은 페이지 이름을 쓰므로 둘을 구분해야 본체 변경(패시브 · 획득처 등)이 보인다.
 * 본체의 경량 · 일반 · 중량은 바뀔 수 있는 값이라 키에 넣지 않는다.
 */
function keyOf(table: string, row: CargoRow): string {
  const k = row._pageName ?? row.title ?? JSON.stringify(row)
  return table === 'Armor' ? `${k} [${row.type === 'Helmet' ? 'helmet' : 'body'}]` : k
}

function diffTable(name: string, before: CargoRow[] | undefined, after: CargoRow[]) {
  const b = new Map((before ?? []).map((r) => [keyOf(name, r), r]))
  const a = new Map(after.map((r) => [keyOf(name, r), r]))
  const added = [...a.keys()].filter((k) => !b.has(k))
  const removed = [...b.keys()].filter((k) => !a.has(k))
  const changed = [...a.keys()].filter((k) => b.has(k) && JSON.stringify(b.get(k)) !== JSON.stringify(a.get(k)))
  console.log(`\n[${name}] ${after.length}행 (이전 ${before?.length ?? 0}) · 추가 ${added.length} · 삭제 ${removed.length} · 변경 ${changed.length}`)
  for (const k of added) console.log(`  + ${k}`)
  for (const k of removed) console.log(`  - ${k}`)
  for (const k of changed) console.log(`  ~ ${k}`)
  if (added.length && removed.length) {
    console.log('  rename 후보(삭제 + 추가 쌍, 확인 후 data/overrides/aliases.json에 기록):')
    for (const r of removed) for (const ad of added) console.log(`    ${r}  →?  ${ad}`)
  }
}

async function main() {
  const before: RawSnapshot | null = existsSync(RAW_PATH) ? JSON.parse(readFileSync(RAW_PATH, 'utf8')) : null
  const tables: Record<string, CargoRow[]> = {}
  for (const [name, fields] of Object.entries(TABLES)) {
    process.stdout.write(`fetch ${name} … `)
    // Cargo는 결과 키의 `_`를 공백으로 바꿔 준다(`stratagem type`). 필드명 그대로 쓰기 위해 되돌린다.
    tables[name] = (await cargoQuery(name, fields)).map((row) =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [k.replace(/ /g, '_'), v])),
    )
    console.log(`${tables[name].length}행`)
  }
  for (const name of Object.keys(TABLES)) diffTable(name, before?.tables[name], tables[name])
  const snapshot: RawSnapshot = { fetchedAt: new Date().toISOString(), tables }
  mkdirSync('data/raw', { recursive: true })
  writeFileSync(RAW_PATH, JSON.stringify(snapshot, null, 1) + '\n')
  console.log(`\nsaved ${RAW_PATH} (${snapshot.fetchedAt})`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
