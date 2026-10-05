// localStorage `hd2lb.v1` 저장 계약. 필드를 바꾸면 들어오는 값 보정(sanitize.ts)도 함께 맞춘다.
import type { LoadoutRace } from '../data/factions'

export interface Gear {
  armor: string | null
  primary: string | null
  secondary: string | null
  throwable: string | null
}

export type GearSlot = keyof Gear

export type Pools = [string[], string[], string[], string[]]

/** 슬롯별 후보 칸 수(1~4). 후보가 이보다 적으면 빈 칸으로 보인다. */
export type PoolSize = 1 | 2 | 3 | 4
export type PoolSizes = [PoolSize, PoolSize, PoolSize, PoolSize]

export interface Loadout {
  id: string
  name: string
  /** 'all' = 종족 무관. 어느 종족 필터에서도 보인다 */
  race: LoadoutRace
  faction: string
  gear: Gear
  pools: Pools
  /** 없으면(구 저장본) 후보 수로 대신한다 */
  sizes?: PoolSizes
  order: number
  createdAt: string
  updatedAt: string
}

export interface Draft extends Loadout {
  dirty: boolean
}

export type NameDisplay = 'ko' | 'both' | 'en'
export type ThemeId = 'console' | 'teletype'
export const THEME_IDS: ThemeId[] = ['console', 'teletype']

export interface Settings {
  eagleThreshold: 2 | 3
  backpackWarn: boolean
  excludeDisposable: boolean
  nameDisplay: NameDisplay
  theme: ThemeId
  /** 미보유 채권 id. 비어 있으면 전부 보유. 새 채권은 자동으로 보유. */
  unownedWarbonds: string[]
  includeSuperstore: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  eagleThreshold: 3,
  backpackWarn: true,
  excludeDisposable: true,
  nameDisplay: 'ko',
  theme: 'console',
  unownedWarbonds: [],
  includeSuperstore: true,
}

export interface PersistedState {
  loadouts: Loadout[]
  draft: Draft | null
  settings: Settings
}

export interface ExportFile {
  format: 'hd2lb'
  version: 1
  exportedAt: string
  dataVersion: string
  loadouts: Loadout[]
  settings?: Settings
}

export const STORAGE_KEY = 'hd2lb.v1'
export const BACKUP_KEY = 'hd2lb.backup'

export const EMPTY_GEAR: Gear = { armor: null, primary: null, secondary: null, throwable: null }
export const emptyPools = (): Pools => [[], [], [], []]
export const defaultSizes = (): PoolSizes => [1, 1, 1, 1]

/** 저장본의 슬롯 칸 수. 구 저장본은 후보 수(최소 1). */
export function sizesOf(l: Pick<Loadout, 'pools' | 'sizes'>): PoolSizes {
  return l.sizes ?? (l.pools.map((p) => Math.min(4, Math.max(1, p.length)) as PoolSize) as PoolSizes)
}

export function newId(): string {
  const c = globalThis.crypto as Crypto | undefined
  if (c?.randomUUID) return c.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
