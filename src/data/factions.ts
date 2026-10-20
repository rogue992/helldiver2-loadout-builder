// 종족 · 팩션 상수. 표기는 게임 한글판 · 영문판을 따른다(화면 언어에 맞춰 raceLabel · factionLabel로 읽는다). 종족 색은 테마 토큰(--race-*)이 정한다.
import { pick } from '../copy/lang'

export type Race = 'terminid' | 'automaton' | 'illuminate'
/** 로드아웃에 붙는 종족. 'all' = 종족 무관(전체), 어느 종족 필터에서도 보인다 */
export type LoadoutRace = Race | 'all'

export interface Faction {
  id: string
  nameKo: string
  nameEn: string
}

export interface RaceInfo {
  id: LoadoutRace
  nameKo: string
  nameEn: string
  factions: Faction[]
}

/** 종족 무관 로드아웃. 팩션 구분이 없으므로 팩션 표기도 "전체" */
export const RACE_ALL: RaceInfo = {
  id: 'all',
  nameKo: '전체',
  nameEn: 'All',
  factions: [{ id: 'default', nameKo: '전체', nameEn: 'All' }],
}

export const RACES: RaceInfo[] = [
  {
    id: 'terminid',
    nameKo: '테르미니드',
    nameEn: 'Terminids',
    factions: [
      { id: 'default', nameKo: '기본', nameEn: 'Standard' },
      { id: 'predator', nameKo: '프레데터 변종', nameEn: 'Predator Strain' },
      { id: 'spore-burst', nameKo: '스포어 버스트 변종', nameEn: 'Spore Burst Strain' },
      { id: 'rupture', nameKo: '럽처 변종', nameEn: 'Rupture Strain' },
    ],
  },
  {
    id: 'automaton',
    nameKo: '오토마톤',
    nameEn: 'Automatons',
    factions: [
      { id: 'default', nameKo: '기본', nameEn: 'Standard' },
      { id: 'jet-brigade', nameKo: '제트 여단', nameEn: 'Jet Brigade' },
      { id: 'incineration-corps', nameKo: '소각대', nameEn: 'Incineration Corps' },
      { id: 'cyborg-legion', nameKo: '사이보그', nameEn: 'Cyborg Legion' },
    ],
  },
  {
    id: 'illuminate',
    nameKo: '일루미닛',
    nameEn: 'Illuminate',
    factions: [
      { id: 'default', nameKo: '기본', nameEn: 'Standard' },
      { id: 'mindless-masses', nameKo: '무분별한 대중', nameEn: 'Mindless Masses' },
      { id: 'appropriators', nameKo: '적임자', nameEn: 'Appropriators' },
      { id: 'vote-snatchers', nameKo: '보트 스내처', nameEn: 'Vote Snatchers' },
    ],
  },
]

/** 허가서 종족 셀렉트 순서: 전체 → 종족 3 */
export const LOADOUT_RACES: RaceInfo[] = [RACE_ALL, ...RACES]

export const RACE_BY_ID: Record<LoadoutRace, RaceInfo> = Object.fromEntries(
  LOADOUT_RACES.map((r) => [r.id, r]),
) as Record<LoadoutRace, RaceInfo>

/** 모르는 값(구 저장본 등)은 전체로. 자기 키만 본다 */
export function raceInfo(race: LoadoutRace): RaceInfo {
  return Object.hasOwn(RACE_BY_ID, race) ? RACE_BY_ID[race] : RACE_ALL
}

export const raceLabel = (r: Pick<RaceInfo, 'nameKo' | 'nameEn'>): string => pick(r.nameKo, r.nameEn)
export const factionLabel = (f: Pick<Faction, 'nameKo' | 'nameEn'>): string => pick(f.nameKo, f.nameEn)

export function factionName(race: LoadoutRace, factionId: string): string {
  const f = raceInfo(race).factions.find((x) => x.id === factionId)
  return f ? factionLabel(f) : factionId
}
