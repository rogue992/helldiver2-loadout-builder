import type { Aliases, Item, Kind, Meta, StratType, Warbond } from './types'

export interface ItemIndex {
  items: Item[]
  byId: Map<string, Item>
  byKind: Record<Kind, Item[]>
  stratByType: Map<StratType, Item[]>
}

export interface GameData {
  index: ItemIndex
  warbonds: Warbond[]
  warbondById: Map<string, Warbond>
  meta: Meta
  aliases: Aliases
}

const BASE = import.meta.env.BASE_URL

export function assetUrl(path: string): string {
  return BASE + path
}

async function fetchJson<T>(name: string): Promise<T> {
  const res = await fetch(`${BASE}data/${name}?v=${__BUILD_ID__}`)
  if (!res.ok) throw new Error(`${name} 로드 실패 (${res.status})`)
  return res.json() as Promise<T>
}

export function buildIndex(items: Item[]): ItemIndex {
  const byKind: Record<Kind, Item[]> = { primary: [], secondary: [], throwable: [], armor: [], stratagem: [] }
  const stratByType = new Map<StratType, Item[]>()
  for (const it of items) {
    byKind[it.kind].push(it)
    if (it.stratType) stratByType.set(it.stratType, [...(stratByType.get(it.stratType) ?? []), it])
  }
  return {
    items,
    byId: new Map(items.map((i) => [i.id, i])),
    byKind,
    stratByType,
  }
}

export async function loadGameData(): Promise<GameData> {
  const [items, warbonds, meta, aliases] = await Promise.all([
    fetchJson<Item[]>('items.json'),
    fetchJson<Warbond[]>('warbonds.json'),
    fetchJson<Meta>('meta.json'),
    fetchJson<Aliases>('aliases.json'),
  ])
  return {
    index: buildIndex(items),
    warbonds,
    warbondById: new Map(warbonds.map((w) => [w.id, w])),
    meta,
    aliases,
  }
}

/** 구 id를 신 id로. 표에 없으면 그대로. 표의 자기 키만 본다("constructor" 같은 id가 프로토타입 값으로 바뀌지 않게). */
export function resolveAlias(aliases: Aliases, id: string): string {
  let cur = id
  for (let i = 0; i < 5 && Object.hasOwn(aliases, cur) && typeof aliases[cur] === 'string'; i++) cur = aliases[cur]
  return cur
}
