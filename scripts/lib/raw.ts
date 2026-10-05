// data/raw/wiki.json 읽기와 로드아웃 대상 필터. build-data · seed-from-ses · fetch-icons가 공유한다.
import { readFileSync } from 'node:fs'
import type { CargoRow } from './cargo.ts'

export const RAW_PATH = 'data/raw/wiki.json'

export interface RawSnapshot {
  fetchedAt: string
  tables: Record<string, CargoRow[]>
}

export function loadRaw(): RawSnapshot {
  return JSON.parse(readFileSync(RAW_PATH, 'utf8'))
}

export const EXCLUDED_STRAT_TYPES = new Set(['Objective', 'Ship', 'Other', ''])

export type WeaponKind = 'primary' | 'secondary' | 'throwable'
export const WEAPON_CATEGORY_TO_KIND: Record<string, WeaponKind> = {
  'Primary Weapons': 'primary',
  'Secondary Weapons': 'secondary',
  Throwables: 'throwable',
}

function dedupe(rows: CargoRow[]): CargoRow[] {
  const seen = new Set<string>()
  return rows.filter((r) => (seen.has(r._pageName) ? false : (seen.add(r._pageName), true)))
}

/** 로드아웃 대상 스트라타젬. 같은 페이지명 중복 행은 첫 행만. */
export function targetStratagems(raw: RawSnapshot): CargoRow[] {
  return dedupe(raw.tables.Stratagems.filter((r) => !EXCLUDED_STRAT_TYPES.has(r.stratagem_type ?? '')))
}

/** 주 · 보조 · 투척 무기. Support Weapons는 스트라타젬 쪽에서만 취급. */
export function targetWeapons(raw: RawSnapshot): CargoRow[] {
  return dedupe(raw.tables.Weapons.filter((r) => r.weapon_category in WEAPON_CATEGORY_TO_KIND))
}

/** 본체 방어구. 헬멧은 본체와 페이지명을 공유하므로 반드시 먼저 걸러낸다. */
export function targetArmor(raw: RawSnapshot): CargoRow[] {
  return dedupe(raw.tables.Armor.filter((r) => r.type !== 'Helmet'))
}
