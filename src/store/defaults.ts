// 수정 · 삭제할 수 없는 고정 기본 로드아웃(복제만 가능). 구성은 ses-csd의 기본 로드아웃과 같다(궤도 정밀 타격 · MG-43 · B-01 · AR-23 · P-2 · G-12).
import { copy } from '../copy/ko'
import type { Loadout } from './types'

export const DEFAULT_LOADOUT_ID = 'default'

/** 헬다이버즈 2 출시일. 허가서 일련번호(No. SE-240208)로 보인다 */
const DEFAULT_CREATED_AT = '2024-02-08T00:00:00.000Z'

export function defaultLoadout(): Loadout {
  return {
    id: DEFAULT_LOADOUT_ID,
    name: copy.defaultLoadoutName,
    race: 'all',
    faction: 'default',
    gear: { armor: 'ar-b-01-tactical', primary: 'pw-ar-23-liberator', secondary: 'sw-p-2-peacemaker', throwable: 'th-g-12-high-explosive' },
    pools: [['st-orbital-precision-strike'], ['st-mg-43-machine-gun'], [], []],
    sizes: [1, 1, 1, 1],
    order: 0,
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_CREATED_AT,
  }
}

export const isDefaultLoadout = (id: string | undefined | null): boolean => id === DEFAULT_LOADOUT_ID

/** 목록에 기본 로드아웃이 없으면 맨 앞에 끼우고, 있으면 순서만 남기고 지급 구성으로 되돌린다(첫 실행 · 가져오기 교체 · 다른 탭 반영 뒤). */
export function ensureDefault(loadouts: Loadout[]): Loadout[] {
  const cur = loadouts.find((l) => isDefaultLoadout(l.id))
  if (!cur) return [{ ...defaultLoadout(), order: -1 }, ...loadouts]
  return loadouts.map((l) => (isDefaultLoadout(l.id) ? { ...defaultLoadout(), order: l.order } : l))
}
