// 아이템 색인: 종류별 · 스트라타젬 종류별 목록과 id 조회. 화면 순서(스트라타젬은 나무위키 순서)도 여기서 정한다.
import type { Item, Kind, StratType } from './types'
import { STRAT_ORDER } from './stratOrder'

export interface ItemIndex {
  items: Item[]
  byId: Map<string, Item>
  byKind: Record<Kind, Item[]>
  stratByType: Map<StratType, Item[]>
}

const STRAT_RANK = new Map(STRAT_ORDER.map((id, i) => [id, i]))

export function buildIndex(items: Item[]): ItemIndex {
  const byKind: Record<Kind, Item[]> = { primary: [], secondary: [], throwable: [], armor: [], stratagem: [] }
  for (const it of items) byKind[it.kind].push(it)
  // 스트라타젬은 나무위키 순서. 순서표에 없는 것은 데이터 순서 그대로 뒤에 붙는다(정렬이 안정적이라)
  const rank = (it: Item) => STRAT_RANK.get(it.id) ?? STRAT_ORDER.length
  byKind.stratagem.sort((a, b) => rank(a) - rank(b))
  const stratByType = new Map<StratType, Item[]>()
  for (const it of byKind.stratagem) if (it.stratType) stratByType.set(it.stratType, [...(stratByType.get(it.stratType) ?? []), it])
  return {
    items,
    byId: new Map(items.map((i) => [i.id, i])),
    byKind,
    stratByType,
  }
}
