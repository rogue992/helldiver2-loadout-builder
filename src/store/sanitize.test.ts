import { test } from 'node:test'
import assert from 'node:assert/strict'
import { copy } from '../copy/ko'
import { parseImport } from '../share/json'
import { DEFAULT_SETTINGS } from './types'
import { sanitizeDraft, sanitizeLoadout, sanitizeLoadouts, sanitizeSettings } from './sanitize'

const valid = { id: 'a', name: 'A', race: 'terminid', faction: 'predator', gear: { armor: 'x', primary: null, secondary: null, throwable: null }, pools: [['s1'], [], [], []], sizes: [1, 1, 1, 1], order: 0, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' }

test('식별할 수 없는 로드아웃(id · 4슬롯 pools 없음)은 버린다', () => {
  assert.equal(sanitizeLoadout(null), null)
  assert.equal(sanitizeLoadout({ ...valid, id: 3 }), null)
  assert.equal(sanitizeLoadout({ ...valid, pools: [[], [], []] }), null)
})

test('정상 값은 그대로 통과한다', () => {
  assert.deepEqual(sanitizeLoadout(valid), valid)
})

test('모르는 종족(CSS 주입 시도 포함)은 전체로, 그 종족에 없는 팩션은 기본으로', () => {
  const l = sanitizeLoadout({ ...valid, race: 'all) url(https://evil.example/b.png' })!
  assert.equal(l.race, 'all')
  assert.equal(l.faction, 'default')
  assert.equal(sanitizeLoadout({ ...valid, race: '__proto__' })!.race, 'all')
})

test('형식이 틀린 필드는 보정한다: 이름 · 장비 · 후보 · 칸 수 · 날짜', () => {
  const l = sanitizeLoadout({ ...valid, name: {}, gear: { armor: 5 }, pools: [null, ['a', 1, 'b'], 'x', []], sizes: [1e9, 1, 1, 1], createdAt: undefined, order: 'z' }, 7)!
  assert.equal(l.name, copy.untitledLoadout)
  assert.deepEqual(l.gear, { armor: null, primary: null, secondary: null, throwable: null })
  assert.deepEqual(l.pools, [[], ['a', 'b'], [], []])
  assert.equal(l.sizes, undefined)
  assert.ok(!Number.isNaN(Date.parse(l.createdAt)))
  assert.equal(l.order, 7)
})

test('칸 수보다 많은 후보는 잘라낸다', () => {
  assert.deepEqual(sanitizeLoadout({ ...valid, pools: [['a', 'b', 'c'], [], [], []], sizes: [2, 1, 1, 1] })!.pools[0], ['a', 'b'])
})

test('목록: 깨진 항목은 빼고 같은 id는 앞의 것만', () => {
  const ls = sanitizeLoadouts([valid, { id: 'bad' }, { ...valid, name: 'dup' }])
  assert.equal(ls.length, 1)
  assert.equal(ls[0].name, 'A')
  assert.deepEqual(sanitizeLoadouts('x'), [])
})

test('초안은 dirty를 지키고 칸 수를 채운다', () => {
  const d = sanitizeDraft({ ...valid, sizes: undefined, dirty: true })!
  assert.equal(d.dirty, true)
  assert.deepEqual(d.sizes, [1, 1, 1, 1])
})

test('설정: 필드마다 보정, 모르는 값은 기본값', () => {
  assert.deepEqual(sanitizeSettings('x'), DEFAULT_SETTINGS)
  const s = sanitizeSettings({ eagleThreshold: 9, theme: 'paper', unownedWarbonds: 5, nameDisplay: 'en', backpackWarn: false })
  assert.equal(s.eagleThreshold, DEFAULT_SETTINGS.eagleThreshold)
  assert.equal(s.theme, 'console')
  assert.deepEqual(s.unownedWarbonds, [])
  assert.equal(s.nameDisplay, 'en')
  assert.equal(s.backpackWarn, false)
})

test('가져오기: 형식이 아니거나 깨진 로드아웃이 하나라도 있으면 파일 전체를 거부', () => {
  const file = { format: 'hd2lb', version: 1, exportedAt: '2026-01-01T00:00:00.000Z', dataVersion: 'v', loadouts: [valid] }
  assert.equal(parseImport('{'), null)
  assert.equal(parseImport(JSON.stringify({ ...file, format: 'other' })), null)
  assert.equal(parseImport(JSON.stringify({ ...file, loadouts: [valid, { id: 'x' }] })), null)
  const ok = parseImport(JSON.stringify({ ...file, exportedAt: 1, settings: { theme: 'paper' } }))!
  assert.equal(ok.loadouts.length, 1)
  assert.equal(ok.exportedAt, '')
  assert.equal(ok.settings?.theme, 'console')
})
