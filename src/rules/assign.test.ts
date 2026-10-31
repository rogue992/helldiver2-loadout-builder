import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assignView, inListView } from './assign'
import { DEFAULT_LOADOUT_ID } from '../store/defaults'

test('전선 지정: 같은 종족을 보고 있으면 팩션 필터를 이어받고 필터는 그대로', () => {
  assert.deepEqual(assignView('terminid', { race: 'terminid', faction: 'predator' }), { faction: 'predator', view: null })
  assert.deepEqual(assignView('terminid', { race: 'terminid', faction: 'all' }), { faction: 'default', view: null })
})

test('전선 지정: 다른 종족을 보고 있었으면 필터를 고른 종족(팩션 전체)으로 옮긴다', () => {
  assert.deepEqual(assignView('automaton', { race: 'terminid', faction: 'predator' }), { faction: 'default', view: { race: 'automaton', faction: 'all' } })
})

test('전선 지정: 전체를 보고 있거나 종족 무관을 고르면 필터를 건드리지 않는다', () => {
  assert.deepEqual(assignView('illuminate', { race: 'all', faction: 'all' }), { faction: 'default', view: null })
  assert.deepEqual(assignView('all', { race: 'terminid', faction: 'predator' }), { faction: 'default', view: null })
})

test('목록 필터: 종족 공통은 그 종족의 어느 팩션에서도, 지정 팩션은 그 팩션에서만, 기본 · 종족 무관은 늘 보인다', () => {
  const common = { id: 'a', race: 'terminid' as const, faction: 'default' }
  const predator = { id: 'b', race: 'terminid' as const, faction: 'predator' }
  const view = (race: 'all' | 'terminid' | 'automaton', faction: string) => ({ race, faction })
  assert.equal(inListView(common, view('terminid', 'rupture')), true)
  assert.equal(inListView(predator, view('terminid', 'rupture')), false)
  assert.equal(inListView(predator, view('terminid', 'predator')), true)
  assert.equal(inListView(predator, view('automaton', 'all')), false)
  assert.equal(inListView(predator, view('all', 'all')), true)
  assert.equal(inListView({ id: 'c', race: 'all', faction: 'default' }, view('automaton', 'jet-brigade')), true)
  assert.equal(inListView({ id: DEFAULT_LOADOUT_ID, race: 'all', faction: 'default' }, view('terminid', 'predator')), true)
})
