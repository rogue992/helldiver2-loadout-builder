// 정적 데이터 계약(public/data/*.json). 데이터 빌드 스크립트도 이 타입을 그대로 쓴다.

export type Kind = 'primary' | 'secondary' | 'throwable' | 'armor' | 'stratagem'

export type Source = 'warbond' | 'default' | 'superstore' | 'campaign' | 'citizen' | 'unknown'

export type StratType =
  | 'orbital_strike'
  | 'orbital_barrage'
  | 'eagle'
  | 'support_weapon'
  | 'support_backpack'
  | 'disposable'
  | 'backpack'
  | 'sentry'
  | 'emplacement'
  | 'vehicle'

export type RuleTag = 'backpack' | 'support_weapon' | 'disposable' | 'eagle'

export type ArmorClass = 'light' | 'medium' | 'heavy'

export interface Passive {
  nameKo: string
  nameEn: string
  icon: string
}

export interface Item {
  id: string
  n: number
  kind: Kind
  nameKo: string
  nameEn: string
  wikiPage: string
  icon: string
  card: string
  thumb: string
  source: Source
  warbondId: string | null
  warbondPage: number | null
  stratType?: StratType
  tags?: RuleTag[]
  weaponType: string | null
  armorClass: ArmorClass | null
  passive: Passive | null
}

export type WarbondType = 'standard' | 'premium' | 'legendary'

export interface Warbond {
  id: string
  nameKo: string
  nameEn: string
  order: number
  releaseDate: string
  type: WarbondType
}

export interface Meta {
  version: string
  builtAt: string
  fetchedAt: string
  counts: Record<Kind, number>
  missingKo: string[]
  unknownSource: string[]
}

/** 구 id → 신 id. 아이템 id와 채권 id를 함께 담는다. */
export type Aliases = Record<string, string>
