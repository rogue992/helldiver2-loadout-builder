// 저장본과 초안의 차이를 사람이 읽는 이름으로. 저장 안 한 변경 확인 창의 "바꾼 곳"에 쓴다.
import { copy } from '../copy'
import { KIND_LABEL } from '../data/labels'
import { sizesOf, type Loadout } from '../store/types'
import { GEAR_ORDER } from './picker'

/** 이름 → 종족 → 팩션 → 슬롯 1~4 → 장비 순. 저장본이 없으면(목록에 없는 초안) 빈 목록 */
export function changedParts(draft: Loadout, saved: Loadout | undefined): string[] {
  if (!saved) return []
  const out: string[] = []
  // 이름을 비우고 저장하면 이전 이름으로 돌아가므로(saveDraft) 빈 이름은 바꾼 것이 아니다
  if (draft.name.trim() && draft.name !== saved.name) out.push(copy.changeName)
  if (draft.race !== saved.race) out.push(copy.race)
  else if (draft.faction !== saved.faction) out.push(copy.faction)
  const ds = sizesOf(draft)
  const ss = sizesOf(saved)
  draft.pools.forEach((pool, i) => {
    const before = saved.pools[i]
    if (ds[i] !== ss[i] || pool.length !== before.length || pool.some((id, k) => id !== before[k])) out.push(copy.slotN(i + 1))
  })
  for (const slot of GEAR_ORDER) if (draft.gear[slot] !== saved.gear[slot]) out.push(KIND_LABEL[slot])
  return out
}
