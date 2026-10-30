// 오늘의 은하 전쟁: 커뮤니티 API(api.helldivers2.dev)의 전선 · 주요 명령을 요약한다. 실패하면 조용히 null(버튼이 숨는다)
import type { Race } from './factions'

const API = 'https://api.helldivers2.dev/api/v1'
// API가 요구하는 식별 헤더. 연락처는 레포 주소(개인 연락처를 보내지 않는다)
const HEADERS = { 'X-Super-Client': 'hd2-loadout-builder', 'X-Super-Contact': 'github.com/rogue992/helldiver2-loadout-builder' }
const CACHE_KEY = 'hd2lb.war'
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

const RACE_OF: Record<string, Race> = { Terminids: 'terminid', Automaton: 'automaton', Illuminate: 'illuminate' }

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

const pct = (health: number, max: number) => (max > 0 ? Math.round(Math.max(0, Math.min(100, 100 - (health / max) * 100))) : 0)

/** 응답 → 요약. 적 종족을 알 수 없는 전선(사람끼리 등)은 뺀다 */
export function summarize(campaigns: RawCampaign[], assignments: RawAssignment[], at: string): WarSummary {
  const fronts: Front[] = []
  for (const { planet: p } of campaigns) {
    const race = RACE_OF[p.event?.faction ?? p.currentOwner]
    if (!race) continue
    fronts.push({
      name: p.name,
      sector: p.sector,
      race,
      defense: !!p.event,
      percent: p.event ? pct(p.event.health, p.event.maxHealth) : pct(p.health, p.maxHealth),
      players: p.statistics?.playerCount ?? 0,
      endsAt: p.event?.endTime ?? null,
    })
  }
  fronts.sort((a, b) => b.players - a.players)
  const byRace = (['terminid', 'automaton', 'illuminate'] as Race[]).map((race) => {
    const fs = fronts.filter((f) => f.race === race)
    return { race, players: fs.reduce((n, f) => n + f.players, 0), fronts: fs.length }
  })
  const orders = assignments.map((a) => (a.title || a.briefing || '').trim()).filter(Boolean)
  return { at, fronts, total: byRace.reduce((n, r) => n + r.players, 0), byRace, orders }
}

function readCache(): WarSummary | null {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as WarSummary | null
    return c && Date.now() - Date.parse(c.at) < WAR_CACHE_MS ? c : null
  } catch {
    return null
  }
}

/** 캐시가 살아 있으면 그것을, 아니면 두 번 물어 요약한다. 어느 쪽이든 실패하면 null */
export async function loadWar(): Promise<WarSummary | null> {
  const cached = readCache()
  if (cached) return cached
  try {
    const get = async <T,>(path: string): Promise<T> => {
      const res = await fetch(`${API}/${path}`, { headers: HEADERS })
      if (!res.ok) throw new Error(`${path} ${res.status}`)
      return (await res.json()) as T
    }
    const [campaigns, assignments] = await Promise.all([get<RawCampaign[]>('campaigns'), get<RawAssignment[]>('assignments')])
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
