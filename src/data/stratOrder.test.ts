import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Item } from './types'
import { STRAT_ORDER } from './stratOrder'
import { buildIndex } from './itemIndex'

const items = JSON.parse(readFileSync(new URL('../../public/data/items.json', import.meta.url), 'utf8')) as Item[]
const strat = items.filter((i) => i.kind === 'stratagem')

test('순서표: 중복 없이, 데이터의 스트라타젬과 1:1로 맞는다(새 스트라타젬은 순서표에 넣는다)', () => {
  assert.equal(new Set(STRAT_ORDER).size, STRAT_ORDER.length)
  const ids = new Set(strat.map((i) => i.id))
  assert.deepEqual(STRAT_ORDER.filter((id) => !ids.has(id)), [], '데이터에 없는 id(이름이 바뀌었으면 순서표도 고친다)')
  assert.deepEqual(strat.filter((i) => !STRAT_ORDER.includes(i.id)).map((i) => i.id), [], '순서표에 없는 스트라타젬')
})

test('색인: 스트라타젬은 순서표 순, 순서표에 없는 것은 같은 종류 맨 뒤', () => {
  const extra = { ...strat[0], id: 'st-new-thing', stratType: strat[0].stratType }
  const index = buildIndex([extra, ...[...items].reverse()])
  const sameType = index.stratByType.get(extra.stratType!)!.map((i) => i.id)
  assert.equal(sameType.at(-1), 'st-new-thing')
  assert.deepEqual(index.byKind.stratagem.filter((i) => i.id !== 'st-new-thing').map((i) => i.id), STRAT_ORDER)
})
