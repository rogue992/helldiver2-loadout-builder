// 오늘의 은하 전쟁: 커뮤니티 API(api.helldivers2.dev)의 전선 · 주요 명령을 요약한다. 실패하면 조용히 null(버튼이 숨는다)
import type { Race } from './factions'

const API = 'https://api.helldivers2.dev/api/v1'
// API가 요구하는 식별 헤더. 연락처는 레포 주소(개인 연락처를 보내지 않는다)
const HEADERS = { 'X-Super-Client': 'hd2-loadout-builder', 'X-Super-Contact': 'github.com/rogue992/helldiver2-loadout-builder' }
// 요약 모양을 바꾸면 키 끝 번호를 올린다. 옛 모양 캐시를 새 화면이 읽지 않게
const CACHE_KEY = 'hd2lb.war.v1'
// API 요청 한도가 낮아(분당 몇 번) 새로 고침을 반복해도 다시 묻지 않게 한다
export const WAR_CACHE_MS = 10 * 60 * 1000

export interface Front {
  name: string
  sector: string
  race: Race
  /** 방어전(적이 공격 중인 우리 행성) */
  defense: boolean
  /** 해방 · 방어 진행률(0~100) */
  percent: number
  players: number
  /** 방어전 마감 시각(ISO) */
  endsAt: string | null
}

export interface WarSummary {
  /** 응답을 받은 시각(ISO) */
  at: string
  /** 인원 많은 순 */
  fronts: Front[]
  total: number
  byRace: { race: Race; players: number; fronts: number }[]
  orders: string[]
}

export const RACES_AT_WAR: Race[] = ['terminid', 'automaton', 'illuminate']
const RACE_OF: Record<string, Race> = { Terminids: 'terminid', Automaton: 'automaton', Illuminate: 'illuminate' }
// 자기 키만 본다: 외부 응답의 "constructor" 같은 값이 프로토타입 멤버로 새어 종족처럼 통과하지 않게
const raceOf = (v: unknown): Race | null => (typeof v === 'string' && Object.hasOwn(RACE_OF, v) ? RACE_OF[v] : null)

export interface RawCampaign {
  planet: {
    name: string
    sector: string
    health: number
    maxHealth: number
    currentOwner: string
    event: { faction: string; health: number; maxHealth: number; endTime: string } | null
    statistics: { playerCount: number }
  }
}
export interface RawAssignment {
  title: string | null
  briefing: string | null
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const pct = (health: number, max: number) => (max > 0 ? Math.round(Math.max(0, Math.min(100, 100 - (health / max) * 100))) : 0)

/** 전선 한 줄. 모양이 어긋난 항목(외부 응답이라 믿지 않는다)과 적 종족을 알 수 없는 전선은 null */
function frontOf(c: unknown): Front | null {
  const p = isObj(c) && isObj(c.planet) ? c.planet : null
  if (!p) return null
  const ev = isObj(p.event) ? p.event : null
  const name = str(p.name)
  const race = raceOf(ev ? ev.faction : p.currentOwner)
  const health = num(ev ? ev.health : p.health)
  const max = num(ev ? ev.maxHealth : p.maxHealth)
  if (!name || !race || health === null || max === null) return null
  const endsAt = ev ? str(ev.endTime) : null
  return {
    name,
    sector: str(p.sector) ?? '',
    race,
    defense: !!ev,
    percent: pct(health, max),
    players: (isObj(p.statistics) ? num(p.statistics.playerCount) : null) ?? 0,
    endsAt: endsAt && !Number.isNaN(Date.parse(endsAt)) ? endsAt : null,
  }
}

/** 주요 명령 문구. 제목은 게임의 고정 머리말("MAJOR ORDER" 등)이라 지시문이 든 브리핑을 먼저 쓴다 */
function orderOf(a: unknown): string {
  if (!isObj(a)) return ''
  return (str(a.briefing) || str(a.title) || '').trim()
}

/** 응답 → 요약 */
export function summarize(campaigns: unknown, assignments: unknown, at: string): WarSummary {
  const fronts = (Array.isArray(campaigns) ? campaigns : []).map(frontOf).filter((f): f is Front => f !== null)
  fronts.sort((a, b) => b.players - a.players)
  const byRace = RACES_AT_WAR.map((race) => {
    const fs = fronts.filter((f) => f.race === race)
    return { race, players: fs.reduce((n, f) => n + f.players, 0), fronts: fs.length }
  })
  const orders = (Array.isArray(assignments) ? assignments : []).map(orderOf).filter(Boolean)
  return { at, fronts, total: byRace.reduce((n, r) => n + r.players, 0), byRace, orders }
}

/** 방어전 남은 시간. 1시간 미만은 분으로, 이미 끝났으면 null(표시하지 않는다) */
export function timeLeft(endsAt: string | null, now: number): { hours: number } | { minutes: number } | null {
  if (!endsAt) return null
  const ms = Date.parse(endsAt) - now
  if (!(ms > 0)) return null
  return ms < 3600000 ? { minutes: Math.max(1, Math.floor(ms / 60000)) } : { hours: Math.floor(ms / 3600000) }
}

/** 캐시도 모양을 확인한 것만 믿는다(직접 고친 값 · 옛 모양이 화면을 깨뜨리지 않게) */
export function isWarSummary(v: unknown): v is WarSummary {
  if (!isObj(v) || typeof v.at !== 'string' || typeof v.total !== 'number') return false
  if (!Array.isArray(v.fronts) || !Array.isArray(v.byRace) || !Array.isArray(v.orders)) return false
  const frontOk = (f: unknown) =>
    isObj(f) && typeof f.name === 'string' && typeof f.sector === 'string' && RACES_AT_WAR.includes(f.race as Race) && typeof f.percent === 'number' && typeof f.players === 'number' && (f.endsAt === null || typeof f.endsAt === 'string')
  const raceOk = (r: unknown) => isObj(r) && RACES_AT_WAR.includes(r.race as Race) && typeof r.players === 'number' && typeof r.fronts === 'number'
  return v.fronts.every(frontOk) && v.byRace.every(raceOk) && v.orders.every((o) => typeof o === 'string')
}

function readCache(): WarSummary | null {
  try {
    const c: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null')
    return isWarSummary(c) && Date.now() - Date.parse(c.at) < WAR_CACHE_MS ? c : null
  } catch {
    return null
  }
}

/** 캐시가 살아 있으면 그것을, 아니면 두 번 물어 요약한다. 어느 쪽이든 실패하면 null */
export async function loadWar(): Promise<WarSummary | null> {
  const cached = readCache()
  if (cached) return cached
  try {
    const get = async (path: string): Promise<unknown> => {
      const res = await fetch(`${API}/${path}`, { headers: HEADERS })
      if (!res.ok) throw new Error(`${path} ${res.status}`)
      return res.json()
    }
    const [campaigns, assignments] = await Promise.all([get('campaigns'), get('assignments')])
    const s = summarize(campaigns, assignments, new Date().toISOString())
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(s))
    } catch {
      // 저장 공간이 막혀도 이번 화면에는 보인다
    }
    return s
  } catch {
    return null
  }
}
