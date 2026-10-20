import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Warbond } from './types'
import { WARBOND_COLOR, warbondColor } from './warbondColors'

const warbonds = JSON.parse(readFileSync(new URL('../../public/data/warbonds.json', import.meta.url), 'utf8')) as Warbond[]

test('채권 색표: 데이터의 채권과 1:1, 값은 #rrggbb(새 채권은 색표에 넣는다)', () => {
  const ids = new Set(warbonds.map((w) => w.id))
  assert.deepEqual(warbonds.filter((w) => !Object.hasOwn(WARBOND_COLOR, w.id)).map((w) => w.id), [], '색표에 없는 채권')
  assert.deepEqual(Object.keys(WARBOND_COLOR).filter((id) => !ids.has(id)), [], '데이터에 없는 id(이름이 바뀌었으면 색표도 고친다)')
  for (const c of Object.values(WARBOND_COLOR)) assert.match(c, /^#[0-9a-f]{6}$/)
})

test('채권 색: 모르는 id는 강조색, 프로토타입 키에 속지 않는다', () => {
  assert.equal(warbondColor('nope'), 'var(--acc)')
  assert.equal(warbondColor('constructor'), 'var(--acc)')
})
