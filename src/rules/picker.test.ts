import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Pools, PoolSizes } from '../store/types'
import { cellTarget, favoritesFirst, nextGearTarget, nextPoolTarget, placeInPool, removeFromPool, showFavoriteGroup, targetAfterResize } from './picker'

test('앞쪽 후보를 빼고 고르면 빈 칸에 들어간다(다른 후보를 덮어쓰지 않는다)', () => {
  const { pool, cell } = removeFromPool(['A', 'B', 'C'], 0)
  assert.deepEqual(pool, ['B', 'C'])
  assert.equal(cell, 2)
  assert.deepEqual(placeInPool(pool, cell, 'D'), ['B', 'C', 'D'])
})

test('찬 칸은 교체, 빈 칸은 어느 것을 눌러도 첫 빈 칸', () => {
  assert.deepEqual(placeInPool(['A', 'B'], 0, 'X'), ['X', 'B'])
  assert.equal(cellTarget(['A', 'B'], 1), 1)
  assert.equal(cellTarget(['A'], 3), 1)
})

test('다음 빈 칸은 지금 슬롯부터 한 바퀴 돌며 찾고, 다 찼으면 없다', () => {
  const sizes: PoolSizes = [1, 1, 1, 1]
  assert.deepEqual(nextPoolTarget([['a'], ['b'], [], ['d']] as Pools, sizes, 3), { slotIndex: 2, cell: 0 })
  assert.deepEqual(nextPoolTarget([['a', 'x'], ['b'], ['c'], ['d']] as Pools, [3, 1, 1, 1], 0), { slotIndex: 0, cell: 2 })
  assert.equal(nextPoolTarget([['a'], ['b'], ['c'], ['d']] as Pools, sizes, 1), null)
})

test('다음 장비는 방금 채운 칸을 빼고 찾는다', () => {
  assert.equal(nextGearTarget({ armor: 'a', primary: 'p', secondary: 's', throwable: null }, 'armor'), 'throwable')
  assert.equal(nextGearTarget({ armor: null, primary: 'p', secondary: 's', throwable: 't' }, 'throwable'), 'armor')
  assert.equal(nextGearTarget({ armor: 'a', primary: 'p', secondary: 's', throwable: 't' }, 'primary'), null)
})

test('칸 수를 바꾼 뒤: 늘리면 그 슬롯 첫 빈 칸, 줄이면 대상 칸을 남은 범위로 당긴다', () => {
  const pools = [['a'], ['b', 'c'], [], []] as Pools
  // 슬롯 1을 1 → 3칸: 다른 슬롯이 대상이어도 그 슬롯의 첫 빈 칸으로
  assert.deepEqual(targetAfterResize(pools, [3, 2, 1, 1], 0, { slotIndex: 2, cell: 0 }, true), { slotIndex: 0, cell: 1 })
  // 슬롯 2를 3 → 2칸(후보 2개로 꽉 참): 빈 칸이던 대상은 마지막 칸으로
  assert.deepEqual(targetAfterResize(pools, [1, 2, 1, 1], 1, { slotIndex: 1, cell: 2 }, false), { slotIndex: 1, cell: 1 })
  // 다른 슬롯을 줄이면 대상은 그대로
  assert.deepEqual(targetAfterResize(pools, [1, 2, 1, 1], 1, { slotIndex: 2, cell: 0 }, false), { slotIndex: 2, cell: 0 })
})

test('즐겨찾기 먼저: 즐겨찾기끼리 · 나머지끼리 원래 순서를 지킨다', () => {
  const items = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }))
  assert.deepEqual(favoritesFirst(items, new Set(['d', 'b'])).map((i) => i.id), ['b', 'd', 'a', 'c', 'e'])
})

test('맨 위 즐겨찾기 묶음: 맞는 즐겨찾기가 있으면, 하나도 없으면 검색 중이 아닐 때만(안내), 전체 탭에서만', () => {
  assert.equal(showFavoriteGroup('all', 2, 5, false), true)
  assert.equal(showFavoriteGroup('all', 0, 0, false), true)
  assert.equal(showFavoriteGroup('all', 0, 0, true), false)
  assert.equal(showFavoriteGroup('all', 0, 5, true), false)
  assert.equal(showFavoriteGroup('eagle', 2, 5, false), false)
})
