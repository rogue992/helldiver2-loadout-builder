// 사람이 관리하는 data/overrides/*.json의 형식과 읽기 헬퍼. build-data · seed-from-ses · fetch-icons가 공유한다.
import { existsSync, readFileSync } from 'node:fs'

export const KO_PATH = 'data/overrides/ko.json'

export interface KoOverrides {
  items: Record<string, { nameKo: string; weaponType?: string; warbondId?: string; warbondPage?: number }>
  passives: Record<string, string>
  /** 패시브 효과 번역. 영어 원문과 줄 수 · 줄마다 숫자가 같아야 쓴다(pickEffects) */
  passiveEffects?: Record<string, string[]>
  warbonds: Record<string, string>
}

export const readJson = <T,>(p: string, fallback: T): T => (existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as T) : fallback)

/** 구 id → 신 id. 여러 번 바뀌었으면 따라간다. 표의 자기 키만 본다("constructor" 같은 값이 프로토타입으로 새지 않게) */
export function resolveAliasId(aliases: Record<string, string>, id: string): string {
  let cur = id
  for (let i = 0; i < 5 && Object.hasOwn(aliases, cur) && typeof aliases[cur] === 'string'; i++) cur = aliases[cur]
  return cur
}

const numbersOf = (s: string) => (s.match(/\d+(?:\.\d+)?/g) ?? []).join(',')

/**
 * 패시브 효과 번역 고르기. 줄 수가 같고 줄마다 숫자가 같을 때만 번역을 쓰고, 아니면 영어 원문과 그 이유.
 * 밸런스 패치는 대개 숫자만 바꾸므로 줄 수만 보면 옛 수치 번역이 조용히 남는다
 */
export function pickEffects(tr: string[] | undefined, en: string[]): { lines: string[]; problem: 'missing' | 'lines' | 'numbers' | null } {
  if (!tr) return { lines: en, problem: 'missing' }
  if (tr.length !== en.length) return { lines: en, problem: 'lines' }
  if (tr.some((t, i) => numbersOf(t) !== numbersOf(en[i]))) return { lines: en, problem: 'numbers' }
  return { lines: tr, problem: null }
}
