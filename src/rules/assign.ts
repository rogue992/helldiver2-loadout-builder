// 목록 필터 규칙: 무엇이 목록에 보이는지, 전선 미지정 허가서에 종족을 정할 때 새 카드가 필터에 걸려 숨지 않게 하는 것.
import { NO_FACTION, type LoadoutRace } from '../data/factions'
import { isDefaultLoadout } from '../store/defaults'
import type { Loadout } from '../store/types'

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
  if (race === 'all' || current.race === 'all') return { faction: NO_FACTION, view: null }
  if (current.race === race) return { faction: current.faction === 'all' ? NO_FACTION : current.faction, view: null }
  return { faction: NO_FACTION, view: { race, faction: 'all' } }
}

/**
 * 목록에 보이는가. 기본 로드아웃과 종족 무관('all')은 늘 보이고, 팩션을 정하지 않은 종족 공통은 그 종족의 어느 팩션 필터에서도 보인다
 */
export function inListView(l: Pick<Loadout, 'id' | 'race' | 'faction'>, view: ListView): boolean {
  if (isDefaultLoadout(l.id) || l.race === 'all') return true
  if (view.race !== 'all' && l.race !== view.race) return false
  return view.faction === 'all' || l.faction === view.faction || l.faction === NO_FACTION
}
