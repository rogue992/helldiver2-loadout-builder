// 사람이 관리하는 data/overrides/*.json의 형식과 읽기 헬퍼. build-data · seed-from-ses · fetch-icons가 공유한다.
import { existsSync, readFileSync } from 'node:fs'

export const KO_PATH = 'data/overrides/ko.json'

export interface KoOverrides {
  items: Record<string, { nameKo: string; weaponType?: string; warbondId?: string; warbondPage?: number }>
  passives: Record<string, string>
  warbonds: Record<string, string>
}

export const readJson = <T,>(p: string, fallback: T): T => (existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as T) : fallback)

/** 구 id → 신 id. 여러 번 바뀌었으면 따라간다. 표의 자기 키만 본다("constructor" 같은 값이 프로토타입으로 새지 않게) */
export function resolveAliasId(aliases: Record<string, string>, id: string): string {
  let cur = id
  for (let i = 0; i < 5 && Object.hasOwn(aliases, cur) && typeof aliases[cur] === 'string'; i++) cur = aliases[cur]
  return cur
}
