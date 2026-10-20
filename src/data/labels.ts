import type { Item, Kind, Source, StratType, Warbond, WarbondType } from './types'

export const KIND_LABEL: Record<Kind, string> = {
  primary: '주무기',
  secondary: '보조무기',
  throwable: '투척무기',
  armor: '방어구',
  stratagem: '스트라타젬',
}

export const STRAT_TYPE_LABEL: Record<StratType, string> = {
  orbital_strike: '궤도 타격',
  orbital_barrage: '궤도 폭격',
  eagle: '이글',
  support_weapon: '지원무기',
  support_backpack: '지원무기(배낭)',
  disposable: '일회용 지원무기',
  backpack: '배낭',
  sentry: '센트리',
  emplacement: '배치형',
  vehicle: '탑승물',
}

/** 선택 창의 종류 탭 · 묶음 순서. 나무위키 스트라타젬 문서의 장 순서(공격 → 방어 → 보급). 묶음 안 순서는 stratOrder.ts */
export const STRAT_TYPE_ORDER: StratType[] = [
  'orbital_strike',
  'orbital_barrage',
  'eagle',
  'sentry',
  'emplacement',
  'support_weapon',
  'support_backpack',
  'disposable',
  'backpack',
  'vehicle',
]

export const SOURCE_LABEL: Record<Source, string> = {
  warbond: '채권',
  default: '기본 지급',
  superstore: '슈퍼 스토어',
  campaign: '캠페인 · 이벤트',
  citizen: '슈퍼시민권',
  unknown: '출처 미확인',
}

export const WARBOND_TYPE_LABEL: Record<WarbondType, string> = {
  standard: '기본 채권',
  premium: '프리미엄 채권',
  legendary: '레전더리 채권',
}

export const ARMOR_CLASS_LABEL = {
  light: '경량',
  medium: '일반',
  heavy: '중량',
} as const

/** 획득처 한 줄: 채권 이름(몇 페이지인지는 보이지 않는다), 슈퍼 스토어는 그 이름. 기본 지급 등은 빈 문자열 */
export function acquireLabel(item: Item, warbondById: Map<string, Warbond>): string {
  if (item.source === 'warbond' && item.warbondId) return warbondById.get(item.warbondId)?.nameKo ?? ''
  return item.source === 'superstore' ? SOURCE_LABEL.superstore : ''
}

/** 장비 부제: 방어구는 경량 · 일반 · 중량, 무기는 무기 종류 */
export function gearCaption(item: Item): string {
  if (item.kind === 'armor') return item.armorClass ? ARMOR_CLASS_LABEL[item.armorClass] : ''
  return item.weaponType ?? ''
}
