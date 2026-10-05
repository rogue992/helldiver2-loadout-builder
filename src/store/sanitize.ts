// 브라우저 밖에서 들어오는 값(가져오기 파일 · 저장소 복원 · 다른 탭)의 형태 검증.
// 화면은 여기를 통과한 값만 믿고 쓴다: 문자열 · 배열 · 범위가 어긋난 필드는 보정하고, 식별할 수 없는 항목은 버린다.
import { LOADOUT_RACES, type LoadoutRace } from '../data/factions'
import { copy } from '../copy/ko'
import { DEFAULT_SETTINGS, THEME_IDS, sizesOf, type Draft, type Gear, type Loadout, type NameDisplay, type PoolSize, type PoolSizes, type Pools, type Settings } from './types'

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isDate = (v: unknown): v is string => isStr(v) && !Number.isNaN(Date.parse(v))

const GEAR_SLOTS = ['armor', 'primary', 'secondary', 'throwable'] as const
const NAME_DISPLAYS: NameDisplay[] = ['ko', 'both', 'en']
const RACE_IDS = new Set<string>(LOADOUT_RACES.map((r) => r.id))

function sanitizeSizes(v: unknown): PoolSizes | undefined {
  if (!Array.isArray(v) || v.length !== 4) return undefined
  return v.every((n) => Number.isInteger(n) && n >= 1 && n <= 4) ? (v as PoolSize[] as PoolSizes) : undefined
}

/** 로드아웃 한 건. id와 4슬롯 pools가 없으면 무엇인지 알 수 없으므로 null. */
export function sanitizeLoadout(raw: unknown, fallbackOrder = 0): Loadout | null {
  if (!isObj(raw) || !isStr(raw.id) || !raw.id) return null
  if (!Array.isArray(raw.pools) || raw.pools.length !== 4) return null

  const race: LoadoutRace = isStr(raw.race) && RACE_IDS.has(raw.race) ? (raw.race as LoadoutRace) : 'all'
  const factions = LOADOUT_RACES.find((r) => r.id === race)!.factions
  const faction = isStr(raw.faction) && factions.some((f) => f.id === raw.faction) ? raw.faction : 'default'
  const g = isObj(raw.gear) ? raw.gear : {}
  const gear = {} as Gear
  for (const s of GEAR_SLOTS) gear[s] = isStr(g[s]) && g[s] ? (g[s] as string) : null
  const sizes = sanitizeSizes(raw.sizes)
  const pools = raw.pools.map((p, i) => (Array.isArray(p) ? p.filter(isStr) : []).slice(0, sizes ? sizes[i] : 4)) as Pools
  const createdAt = isDate(raw.createdAt) ? raw.createdAt : new Date().toISOString()

  return {
    id: raw.id,
    name: isStr(raw.name) && raw.name.trim() ? raw.name : copy.untitledLoadout,
    race,
    faction,
    gear,
    pools,
    ...(sizes ? { sizes } : {}),
    order: typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : fallbackOrder,
    createdAt,
    updatedAt: isDate(raw.updatedAt) ? raw.updatedAt : createdAt,
  }
}

/** 목록 전체. 깨진 항목은 빼고, 같은 id가 겹치면 앞의 것을 남긴다. */
export function sanitizeLoadouts(raw: unknown): Loadout[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: Loadout[] = []
  raw.forEach((r, i) => {
    const l = sanitizeLoadout(r, i)
    if (l && !seen.has(l.id)) {
      seen.add(l.id)
      out.push(l)
    }
  })
  return out
}

export function sanitizeDraft(raw: unknown): Draft | null {
  const l = sanitizeLoadout(raw)
  if (!l) return null
  return { ...l, sizes: sizesOf(l), dirty: isObj(raw) && raw.dirty === true }
}

/** 설정은 필드마다 보정한다. 모르는 값은 기본값으로. */
export function sanitizeSettings(raw: unknown): Settings {
  const s = isObj(raw) ? raw : {}
  const d = DEFAULT_SETTINGS
  const bool = (k: keyof Settings, def: boolean) => (typeof s[k] === 'boolean' ? (s[k] as boolean) : def)
  return {
    eagleThreshold: s.eagleThreshold === 2 || s.eagleThreshold === 3 ? s.eagleThreshold : d.eagleThreshold,
    backpackWarn: bool('backpackWarn', d.backpackWarn),
    excludeDisposable: bool('excludeDisposable', d.excludeDisposable),
    nameDisplay: NAME_DISPLAYS.includes(s.nameDisplay as NameDisplay) ? (s.nameDisplay as NameDisplay) : d.nameDisplay,
    theme: THEME_IDS.includes(s.theme as Settings['theme']) ? (s.theme as Settings['theme']) : d.theme,
    unownedWarbonds: Array.isArray(s.unownedWarbonds) ? [...new Set(s.unownedWarbonds.filter(isStr))] : [],
    includeSuperstore: bool('includeSuperstore', d.includeSuperstore),
  }
}
