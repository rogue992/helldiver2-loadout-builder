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
  /** 효과 한 줄씩. 한국어는 번역 표(data/overrides/ko.json)에 없으면 영어 원문으로 채운다 */
  effectsKo: string[]
  effectsEn: string[]
}

/** 방어구 수치(위키 표 그대로). 방어 · 속도 · 스태미나 회복 */
export interface ArmorStats {
  armor: number
  speed: number
  stamina: number
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
  /** 방어구만. 위키 표에 수치가 없으면 빠진다 */
  armorStats?: ArmorStats
  /** 데이터에 처음 들어온 날(YYYY-MM-DD). 첫 수집분에는 없다. NEW 표시의 기준 */
  addedAt?: string
}

export type WarbondType = 'standard' | 'premium' | 'legendary'

export interface Warbond {
  id: string
  nameKo: string
  nameEn: string
  order: number
  releaseDate: string
  type: WarbondType
  /** 채권 표지(wiki 표지 이미지 → webp). 신규 채권 공고에 쓴다 */
  cover: string
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
