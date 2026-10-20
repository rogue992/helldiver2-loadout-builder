import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Item, Warbond } from './types'
import { latestWarbond, noticeDecision, noticeItems } from './notice'

const wb = (id: string, order: number) => ({ id, order }) as Warbond
const item = (id: string, kind: Item['kind'], n: number, warbondId: string | null, addedAt?: string) =>
  ({ id, kind, n, warbondId, ...(addedAt ? { addedAt } : {}) }) as Item

test('최근 채권은 order가 가장 큰 것', () => {
  assert.equal(latestWarbond([wb('a', 3), wb('b', 9), wb('c', 1)])?.id, 'b')
  assert.equal(latestWarbond([]), null)
})

test('공고 판단: 본 채권이면 없음, 아니면 저장 기록이 있을 때만 띄우고 첫 방문은 기록만', () => {
  assert.equal(noticeDecision('new', 'new', true), 'none')
  assert.equal(noticeDecision('new', 'old', true), 'show')
  assert.equal(noticeDecision('new', null, true), 'show')
  assert.equal(noticeDecision('new', null, false), 'mark')
})

test('공고 아이템: 구성품은 무기 → 투척 → 방어구 → 스트라타젬, 같은 날 들어온 다른 아이템은 함께 들어온 항목', () => {
  const items = [
    item('ar1', 'armor', 5, 'w', '2026-10-12'),
    item('pw1', 'primary', 9, 'w', '2026-10-12'),
    item('pw0', 'primary', 2, 'w', '2026-10-12'),
    item('store', 'primary', 7, null, '2026-10-12'),
    item('old', 'primary', 1, null, '2026-01-01'),
    item('st', 'stratagem', 3, null),
  ]
  const { bond, extras } = noticeItems(items, 'w')
  assert.deepEqual(bond.map((i) => i.id), ['pw0', 'pw1', 'ar1'])
  assert.deepEqual(extras.map((i) => i.id), ['store'])
  // 첫 수집분처럼 들어온 날이 없는 채권은 함께 들어온 항목이 없다
  assert.deepEqual(noticeItems([item('x', 'primary', 1, 'v')], 'v').extras, [])
})
