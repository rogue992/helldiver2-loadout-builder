// 선택 창의 칸 이동 규칙. React 의존 없는 순수 함수.
// 슬롯의 후보는 항상 앞에서부터 채워진다(중간 빈 칸 없음). 그래서 빈 칸 대상은 언제나 "첫 빈 칸" 하나다.
import type { Gear, GearSlot, Pools, PoolSizes } from '../store/types'

export const GEAR_ORDER: GearSlot[] = ['armor', 'primary', 'secondary', 'throwable']

export interface PoolTarget {
  slotIndex: number
  cell: number
}

/** 슬롯의 첫 빈 칸. 칸이 다 찼으면 null */
export const firstEmptyCell = (pool: string[], size: number): number | null => (pool.length < size ? pool.length : null)

/** 칸을 눌렀을 때의 대상: 찬 칸은 그 칸(교체), 빈 칸은 어느 것을 눌러도 첫 빈 칸 */
export const cellTarget = (pool: string[], cell: number): number => Math.min(cell, pool.length)

/** 대상 칸에 넣는다: 찬 칸이면 교체, 빈 칸이면 뒤에 붙인다 */
export function placeInPool(pool: string[], cell: number, id: string): string[] {
  const next = [...pool]
  if (cell < next.length) next[cell] = id
  else next.push(id)
  return next
}

/** 후보 하나를 뺀다. 뒤 칸이 앞으로 당겨지므로 다음 대상은 그 슬롯의 첫 빈 칸 */
export function removeFromPool(pool: string[], cell: number): { pool: string[]; cell: number } {
  const next = pool.filter((_, i) => i !== cell)
  return { pool: next, cell: next.length }
}

/** from 슬롯부터 한 바퀴 돌며 첫 빈 칸. 전부 찼으면 null */
export function nextPoolTarget(pools: Pools, sizes: PoolSizes, from: number): PoolTarget | null {
  for (let step = 0; step < 4; step++) {
    const j = (from + step) % 4
    const cell = firstEmptyCell(pools[j], sizes[j])
    if (cell !== null) return { slotIndex: j, cell }
  }
  return null
}

/**
 * 칸 수를 바꾼 뒤의 대상(pools · sizes는 바꾼 뒤 값). 늘렸으면 그 슬롯의 첫 빈 칸이 바로 대상,
 * 줄였으면 대상이 그 슬롯일 때만 남은 칸 안으로 당긴다(다른 슬롯이 대상이면 그대로).
 */
export function targetAfterResize(pools: Pools, sizes: PoolSizes, slotIndex: number, target: PoolTarget, grew: boolean): PoolTarget {
  const size = sizes[slotIndex]
  const empty = firstEmptyCell(pools[slotIndex], size)
  if (grew) return { slotIndex, cell: empty ?? size - 1 }
  if (target.slotIndex !== slotIndex) return target
  return { slotIndex, cell: Math.min(target.cell, empty ?? size - 1) }
}

/** 즐겨찾기를 앞으로. 즐겨찾기끼리 · 나머지끼리는 원래 순서를 지킨다 */
export function favoritesFirst<T extends { id: string }>(items: T[], fav: Set<string>): T[] {
  return [...items.filter((i) => fav.has(i.id)), ...items.filter((i) => !fav.has(i.id))]
}

/**
 * 전체 탭 맨 위 즐겨찾기 묶음을 보일지. 보이는 목록에 즐겨찾기가 있으면 보이고,
 * 즐겨찾기가 하나도 없으면 별 안내로 보이되 검색 중에는 숨긴다(검색에 맞는 즐겨찾기가 없을 때도 숨긴다).
 */
export function showFavoriteGroup(tab: string, matched: number, total: number, searching: boolean): boolean {
  return tab === 'all' && (matched > 0 || (total === 0 && !searching))
}

/** from 다음 장비부터 한 바퀴 돌며 빈 장비. 전부 찼으면 null(방금 채운 from 자신은 보지 않는다) */
export function nextGearTarget(gear: Gear, from: GearSlot): GearSlot | null {
  const at = GEAR_ORDER.indexOf(from)
  for (let step = 1; step < 4; step++) {
    const s = GEAR_ORDER[(at + step) % 4]
    if (!gear[s]) return s
  }
  return null
}
