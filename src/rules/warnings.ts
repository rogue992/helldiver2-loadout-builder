// 경고 규칙과 도장 상태. React 의존 없는 순수 함수. 입력: 로드아웃 + 아이템 인덱스 + 설정.
import type { ItemIndex } from '../data/loadData'
import type { Item, RuleTag } from '../data/types'
import type { Loadout, Settings } from '../store/types'

export type WarningLevel = 'hard' | 'soft' | 'info'
export type WarningCode = 'backpack' | 'support_weapon' | 'eagle' | 'empty'

export interface Warning {
  level: WarningLevel
  code: WarningCode
  /** 관련 스트라타젬 슬롯 번호(1~4) */
  slots: number[]
  /** 주의 점을 찍을 후보 id */
  itemIds: string[]
  /** 이글: 위반이면 반드시 겹치는 슬롯 수, 주의면 최대 겹칠 수 있는 슬롯 수 · empty: 비어 있는 슬롯 수(스트라타젬 + 장비) */
  count?: number
}

/** none = 전부 비어 있음(도장 없음), treason = 위반 있음, hold = 빈 슬롯 있음, approved = 완전 배정 + 위반 없음 */
export type StampState = 'none' | 'hold' | 'treason' | 'approved'

export const TOTAL_SLOTS = 8

function poolItems(pool: string[], index: ItemIndex): Item[] {
  return pool.map((id) => index.byId.get(id)).filter((i): i is Item => !!i)
}

function has(item: Item, tag: RuleTag): boolean {
  return item.tags?.includes(tag) ?? false
}

/**
 * 태그 하나에 대한 두 단계 판정.
 * - 후보 전부가 해당 태그인 슬롯 수(all) ≥ threshold → hard (어떻게 골라도 겹침)
 * - all + 일부만 해당인 슬롯(some) ≥ threshold → soft (고르기에 따라 겹침)
 * exclude에 걸리는 후보(일회용 등)는 태그로 세지 않지만 "겹치지 않는 선택지"로는 남는다.
 */
function evaluateTag(
  pools: Item[][],
  tag: RuleTag,
  threshold: number,
  exclude?: (i: Item) => boolean,
): { level: 'hard' | 'soft' | null; slots: number[]; itemIds: string[]; max: number } {
  const all: number[] = []
  const some: number[] = []
  const itemIds: string[] = []
  pools.forEach((pool, idx) => {
    const tagged = pool.filter((i) => has(i, tag) && !exclude?.(i))
    if (!tagged.length) return
    itemIds.push(...tagged.map((i) => i.id))
    if (tagged.length === pool.length) all.push(idx + 1)
    else some.push(idx + 1)
  })
  const max = all.length + some.length
  if (all.length >= threshold) return { level: 'hard', slots: all, itemIds, max }
  if (max >= threshold && some.length > 0) return { level: 'soft', slots: [...all, ...some].sort((a, b) => a - b), itemIds, max }
  return { level: null, slots: [], itemIds: [], max }
}

export function emptyCount(loadout: Loadout): number {
  const emptyPools = loadout.pools.filter((p) => p.length === 0).length
  const emptyGear = Object.values(loadout.gear).filter((g) => !g).length
  return emptyPools + emptyGear
}

export function evaluate(loadout: Loadout, index: ItemIndex, settings: Settings): Warning[] {
  const pools = loadout.pools.map((p) => poolItems(p, index))
  const out: Warning[] = []

  if (settings.backpackWarn) {
    const bp = evaluateTag(pools, 'backpack', 2)
    if (bp.level) out.push({ level: bp.level, code: 'backpack', slots: bp.slots, itemIds: bp.itemIds })
    const sw = evaluateTag(pools, 'support_weapon', 2, settings.excludeDisposable ? (i) => has(i, 'disposable') : undefined)
    if (sw.level) out.push({ level: sw.level, code: 'support_weapon', slots: sw.slots, itemIds: sw.itemIds })
  }

  const eagle = evaluateTag(pools, 'eagle', settings.eagleThreshold)
  // 위반은 반드시 겹치는 슬롯 수(표시되는 슬롯 칩과 같다), 주의는 최대 겹칠 수 있는 수
  if (eagle.level) out.push({ level: eagle.level, code: 'eagle', slots: eagle.slots, itemIds: eagle.itemIds, count: eagle.level === 'hard' ? eagle.slots.length : eagle.max })

  const empty = emptyCount(loadout)
  if (empty > 0) out.push({ level: 'info', code: 'empty', slots: [], itemIds: [], count: empty })

  return out
}

/** 전부 비면 도장 없음 → 위반 있으면 반역 적발 → 빈 슬롯 있으면 승인 보류 → 그 외 진리부 승인. */
export function stampState(warnings: Warning[]): StampState {
  const empty = warnings.find((w) => w.code === 'empty')?.count ?? 0
  if (empty >= TOTAL_SLOTS) return 'none'
  if (warnings.some((w) => w.level === 'hard')) return 'treason'
  if (empty > 0) return 'hold'
  return 'approved'
}

/**
 * 화면에 찍는 도장. 진리부 승인은 저장된 뒤에만 보이고(저장 전에는 승인 보류),
 * 고정 로드아웃(수호부 지급 기본)은 항상 진리부 승인이다.
 */
export function displayStamp(raw: StampState, opts: { locked: boolean; dirty: boolean }): StampState {
  if (opts.locked) return 'approved'
  if (opts.dirty && raw === 'approved') return 'hold'
  return raw
}
