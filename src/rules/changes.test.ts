import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Loadout, Pools } from '../store/types'
import { changedParts } from './changes'

const base: Loadout = {
  id: 'x', name: '테스트', race: 'terminid', faction: 'default', order: 0, createdAt: '', updatedAt: '',
  gear: { armor: 'a', primary: 'p', secondary: null, throwable: null },
  pools: [['s1'], ['s2', 's3'], [], []] as Pools, sizes: [1, 2, 1, 1],
}

test('바꾼 곳: 이름 · 종족 · 슬롯 · 장비를 순서대로, 종족이 바뀌면 팩션은 따로 세지 않는다', () => {
  const draft: Loadout = { ...base, name: '새 이름', race: 'automaton', faction: 'jet-brigade', pools: [['s1'], ['s3', 's2'], [], []] as Pools, gear: { ...base.gear, armor: 'b' } }
  assert.deepEqual(changedParts(draft, base), ['이름', '종족', '슬롯 2', '방어구'])
})

test('바꾼 곳: 칸 수만 바꿔도 그 슬롯, 저장본이 없으면 빈 목록', () => {
  assert.deepEqual(changedParts({ ...base, sizes: [1, 2, 3, 1] }, base), ['슬롯 3'])
  assert.deepEqual(changedParts({ ...base, faction: 'predator' }, base), ['팩션'])
  assert.deepEqual(changedParts(base, undefined), [])
})

test('바꾼 곳: 이름을 비우면 저장할 때 이전 이름으로 돌아가므로 이름은 바꾼 곳이 아니다', () => {
  assert.deepEqual(changedParts({ ...base, name: '  ' }, base), [])
})
