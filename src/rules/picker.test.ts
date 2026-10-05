import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Pools, PoolSizes } from '../store/types'
import { cellTarget, nextGearTarget, nextPoolTarget, placeInPool, removeFromPool } from './picker'

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
