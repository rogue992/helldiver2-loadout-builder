import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NEW_DAYS, isNewItem } from './newness'

const day = 86_400_000
const added = Date.parse('2026-10-12')

test('첫 수집분(addedAt 없음)은 NEW가 아니다', () => {
  assert.equal(isNewItem({}, added), false)
})

test('들어온 날부터 기간 안에서만 NEW', () => {
  assert.equal(isNewItem({ addedAt: '2026-10-12' }, added), true)
  assert.equal(isNewItem({ addedAt: '2026-10-12' }, added + (NEW_DAYS - 1) * day), true)
  assert.equal(isNewItem({ addedAt: '2026-10-12' }, added + NEW_DAYS * day), false)
})

test('날짜가 깨져 있으면 NEW로 보지 않는다', () => {
  assert.equal(isNewItem({ addedAt: 'soon' }, added), false)
})
