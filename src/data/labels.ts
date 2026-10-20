import { byLang, pick } from '../copy/lang'
import type { Item, Kind, Passive, Source, StratType, Warbond, WarbondType } from './types'

// 표는 한국어 · 영어 두 벌(byLang): 읽는 순간 화면 언어 쪽을 본다
export const KIND_LABEL: Record<Kind, string> = byLang(
  { primary: '주무기', secondary: '보조무기', throwable: '투척무기', armor: '방어구', stratagem: '스트라타젬' },
  { primary: 'Primary', secondary: 'Secondary', throwable: 'Throwable', armor: 'Armor', stratagem: 'Stratagem' },
)

export const STRAT_TYPE_LABEL: Record<StratType, string> = byLang(
  {
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
  },
  {
    orbital_strike: 'Orbital Strike',
    orbital_barrage: 'Orbital Barrage',
    eagle: 'Eagle',
    support_weapon: 'Support Weapon',
    support_backpack: 'Support (Backpack)',
    disposable: 'Disposable',
    backpack: 'Backpack',
    sentry: 'Sentry',
    emplacement: 'Emplacement',
    vehicle: 'Vehicle',
  },
)

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

export const SOURCE_LABEL: Record<Source, string> = byLang(
  { warbond: '채권', default: '기본 지급', superstore: '슈퍼 스토어', campaign: '캠페인 · 이벤트', citizen: '슈퍼시민권', unknown: '출처 미확인' },
  { warbond: 'Warbond', default: 'Standard Issue', superstore: 'Superstore', campaign: 'Campaign · Event', citizen: 'Super Citizen', unknown: 'Unknown Source' },
)

export const WARBOND_TYPE_LABEL: Record<WarbondType, string> = byLang(
  { standard: '기본 채권', premium: '프리미엄 채권', legendary: '레전더리 채권' },
  { standard: 'Standard Warbond', premium: 'Premium Warbond', legendary: 'Legendary Warbond' },
)

export const ARMOR_CLASS_LABEL: Record<'light' | 'medium' | 'heavy', string> = byLang(
  { light: '경량', medium: '일반', heavy: '중량' },
  { light: 'Light', medium: 'Medium', heavy: 'Heavy' },
)

/** 무기 종류는 데이터에 한글로 들어 있다(선택 창 탭 id로도 쓴다). 영어 화면에서는 wiki 분류 이름으로 */
const WEAPON_TYPE_EN: Record<string, string> = {
  돌격소총: 'Assault Rifle',
  지정사수소총: 'Marksman Rifle',
  기관단총: 'SMG',
  산탄총: 'Shotgun',
  폭발: 'Explosive',
  에너지: 'Energy-Based',
  특수: 'Special',
  '보조-권총': 'Pistol',
  '보조-근접': 'Melee',
  '보조-특수': 'Special',
  수류탄: 'Standard',
  '특수 수류탄': 'Special',
}

export const weaponTypeLabel = (type: string): string => pick(type, Object.hasOwn(WEAPON_TYPE_EN, type) ? WEAPON_TYPE_EN[type] : type)
export const passiveName = (p: Passive): string => pick(p.nameKo, p.nameEn)
export const warbondName = (w: Warbond): string => pick(w.nameKo, w.nameEn)

/** 획득처 한 줄: 채권 이름(몇 페이지인지는 보이지 않는다), 슈퍼 스토어는 그 이름. 기본 지급 등은 빈 문자열 */
export function acquireLabel(item: Item, warbondById: Map<string, Warbond>): string {
  if (item.source === 'warbond' && item.warbondId) {
    const wb = warbondById.get(item.warbondId)
    return wb ? warbondName(wb) : ''
  }
  return item.source === 'superstore' ? SOURCE_LABEL.superstore : ''
}

/** 장비 부제: 방어구는 경량 · 일반 · 중량, 무기는 무기 종류 */
export function gearCaption(item: Item): string {
  if (item.kind === 'armor') return item.armorClass ? ARMOR_CLASS_LABEL[item.armorClass] : ''
  return item.weaponType ? weaponTypeLabel(item.weaponType) : ''
}
