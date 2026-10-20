import type { Aliases, Item, Meta, Warbond } from './types'
import { buildIndex, type ItemIndex } from './itemIndex'

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
