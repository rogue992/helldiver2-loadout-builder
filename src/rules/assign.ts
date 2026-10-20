// 전선 미지정 허가서에 종족을 정할 때의 팩션과 목록 필터. 새 카드가 필터에 걸려 목록에서 숨지 않게 한다.
import type { LoadoutRace } from '../data/factions'

/** 상단 바가 보고 있는 목록 필터 */
export interface ListView {
  race: LoadoutRace
  faction: string
}

/**
 * 같은 종족을 보고 있으면 팩션 필터를 이어받는다. 다른 종족을 보고 있었으면 필터를 고른 종족(팩션 전체)으로 옮긴다.
 * 종족 무관('all')은 어느 필터에서도 보이므로 그대로 둔다. view가 null이면 필터를 바꾸지 않는다.
 */
export function assignView(race: LoadoutRace, current: ListView): { faction: string; view: ListView | null } {
  if (race === 'all' || current.race === 'all') return { faction: 'default', view: null }
  if (current.race === race) return { faction: current.faction === 'all' ? 'default' : current.faction, view: null }
  return { faction: 'default', view: { race, faction: 'all' } }
}
