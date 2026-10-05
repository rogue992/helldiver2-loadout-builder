// 종족 · 팩션 상수. 표기는 게임 한글판을 따른다. 종족 색은 테마 토큰(--race-*)이 정한다.

export type Race = 'terminid' | 'automaton' | 'illuminate'
/** 로드아웃에 붙는 종족. 'all' = 종족 무관(전체), 어느 종족 필터에서도 보인다 */
export type LoadoutRace = Race | 'all'

export interface Faction {
  id: string
  nameKo: string
}

export interface RaceInfo {
  id: LoadoutRace
  nameKo: string
  factions: Faction[]
}

/** 종족 무관 로드아웃. 팩션 구분이 없으므로 팩션 표기도 "전체" */
export const RACE_ALL: RaceInfo = {
  id: 'all',
  nameKo: '전체',
  factions: [{ id: 'default', nameKo: '전체' }],
}

export const RACES: RaceInfo[] = [
  {
    id: 'terminid',
    nameKo: '테르미니드',
    factions: [
      { id: 'default', nameKo: '기본' },
      { id: 'predator', nameKo: '프레데터 변종' },
      { id: 'spore-burst', nameKo: '스포어 버스트 변종' },
      { id: 'rupture', nameKo: '럽처 변종' },
    ],
  },
  {
    id: 'automaton',
    nameKo: '오토마톤',
    factions: [
      { id: 'default', nameKo: '기본' },
      { id: 'jet-brigade', nameKo: '제트 여단' },
      { id: 'incineration-corps', nameKo: '소각대' },
      { id: 'cyborg-legion', nameKo: '사이보그' },
    ],
  },
  {
    id: 'illuminate',
    nameKo: '일루미닛',
    factions: [
      { id: 'default', nameKo: '기본' },
      { id: 'appropriators', nameKo: '적임자' },
      { id: 'vote-snatchers', nameKo: '보트 스내처' },
      { id: 'mindless-masses', nameKo: '무분별한 대중' },
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

export function factionName(race: LoadoutRace, factionId: string): string {
  return raceInfo(race).factions.find((f) => f.id === factionId)?.nameKo ?? factionId
}
