import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Item, RuleTag } from '../data/types'
import type { ItemIndex } from '../data/loadData'
import { DEFAULT_SETTINGS, type Gear, type Loadout, type Pools, type Settings } from '../store/types'
import { displayStamp, evaluate, stampState } from './warnings'

const item = (id: string, tags: RuleTag[]): Item => ({
  id, n: 0, kind: 'stratagem', nameKo: id, nameEn: id, wikiPage: id, icon: '', card: '', thumb: '',
  source: 'default', warbondId: null, warbondPage: null, tags, weaponType: null, armorClass: null, passive: null,
})
const ITEMS = [
  item('eat', ['support_weapon', 'disposable']),
  item('rr', ['backpack', 'support_weapon']),
  item('mg', ['support_weapon']),
  item('rg', ['support_weapon']),
  item('e1', ['eagle']), item('e2', ['eagle']), item('e3', ['eagle']), item('e4', ['eagle']),
  item('orb', []), item('orb2', []),
]
const index = { items: ITEMS, byId: new Map(ITEMS.map((i) => [i.id, i])) } as unknown as ItemIndex
const GEAR: Gear = { armor: 'a', primary: 'p', secondary: 's', throwable: 't' }
const loadout = (pools: string[][], gear: Gear = GEAR): Loadout => ({ id: 'x', name: 'x', race: 'all', faction: 'default', gear, pools: pools as Pools, order: 0, createdAt: '', updatedAt: '' })
const find = (pools: string[][], code: string, s: Settings = DEFAULT_SETTINGS) => evaluate(loadout(pools), index, s).find((w) => w.code === code)

test('일회용과 일반 지원무기를 한 슬롯에 섞으면 위반이 아니라 주의(일회용을 고르면 겹치지 않는다)', () => {
  assert.equal(find([['eat', 'rr'], ['mg'], ['orb'], ['orb2']], 'support_weapon')?.level, 'soft')
})

test('지원무기만 있는 슬롯이 둘이면 위반', () => {
  const w = find([['mg'], ['rg'], ['orb'], ['orb2']], 'support_weapon')
  assert.equal(w?.level, 'hard')
  assert.deepEqual(w?.slots, [1, 2])
})

test('일회용만 있는 슬롯은 지원무기로 세지 않는다. 설정을 끄면 센다', () => {
  assert.equal(find([['eat'], ['mg'], ['orb'], ['orb2']], 'support_weapon'), undefined)
  assert.equal(find([['eat'], ['mg'], ['orb'], ['orb2']], 'support_weapon', { ...DEFAULT_SETTINGS, excludeDisposable: false })?.level, 'hard')
})

test('이글 위반의 개수는 표시되는 슬롯 수와 같다. 주의는 최대 겹칠 수', () => {
  const hard = find([['e1'], ['e2'], ['e3'], ['orb', 'e4']], 'eagle')
  assert.equal(hard?.level, 'hard')
  assert.deepEqual(hard?.slots, [1, 2, 3])
  assert.equal(hard?.count, 3)
  const soft = find([['e1'], ['e2'], ['orb', 'e3'], ['orb2']], 'eagle')
  assert.equal(soft?.level, 'soft')
  assert.equal(soft?.count, 3)
})

test('도장: 전부 비면 없음 → 위반이면 반역 → 빈 칸이면 보류 → 아니면 승인', () => {
  const empty = { armor: null, primary: null, secondary: null, throwable: null }
  assert.equal(stampState(evaluate(loadout([[], [], [], []], empty), index, DEFAULT_SETTINGS)), 'none')
  assert.equal(stampState(evaluate(loadout([['mg'], ['rg'], ['orb'], ['orb2']]), index, DEFAULT_SETTINGS)), 'treason')
  assert.equal(stampState(evaluate(loadout([['mg'], [], ['orb'], ['orb2']]), index, DEFAULT_SETTINGS)), 'hold')
  assert.equal(stampState(evaluate(loadout([['mg'], ['e1'], ['orb'], ['orb2']]), index, DEFAULT_SETTINGS)), 'approved')
})

test('표시 도장: 저장 전 승인은 보류, 고정 로드아웃은 항상 승인', () => {
  assert.equal(displayStamp('approved', { locked: false, dirty: true }), 'hold')
  assert.equal(displayStamp('treason', { locked: false, dirty: true }), 'treason')
  assert.equal(displayStamp('hold', { locked: true, dirty: false }), 'approved')
})
