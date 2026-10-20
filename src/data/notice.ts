// 신규 채권 공고: 가장 최근 채권을 이 브라우저에서 아직 보지 않았으면 한 번 띄운다.
// 본 채권 id는 저장 목록과 따로 둔다(내보내기 · 가져오기 대상이 아니다).
import type { Item, Kind, Warbond } from './types'

const SEEN_KEY = 'hd2lb.notice'

export function latestWarbond(warbonds: Warbond[]): Warbond | null {
  return warbonds.reduce<Warbond | null>((a, w) => (!a || w.order > a.order ? w : a), null)
}

/**
 * show = 띄운다. mark = 띄우지 않고 본 것으로만 기록한다(저장 기록이 없는 첫 방문: 앱을 처음 보는 사람에게 업데이트 공고는 맞지 않다).
 * none = 이미 봤다.
 */
export function noticeDecision(latestId: string, seenId: string | null, hadSavedState: boolean): 'show' | 'mark' | 'none' {
  if (seenId === latestId) return 'none'
  return hadSavedState ? 'show' : 'mark'
}

const KIND_ORDER: Kind[] = ['primary', 'secondary', 'throwable', 'armor', 'stratagem']
const byKind = (a: Item, b: Item) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.n - b.n

/** 공고에 실을 아이템: 그 채권의 구성품, 그리고 구성품과 같은 날 데이터에 들어온 다른 아이템(슈퍼 스토어 · 캠페인 등) */
export function noticeItems(items: Item[], warbondId: string): { bond: Item[]; extras: Item[] } {
  const bond = items.filter((i) => i.warbondId === warbondId).sort(byKind)
  const day = bond.reduce<string | undefined>((d, i) => (i.addedAt && (!d || i.addedAt > d) ? i.addedAt : d), undefined)
  const extras = day ? items.filter((i) => i.addedAt === day && i.warbondId !== warbondId).sort(byKind) : []
  return { bond, extras }
}

/** 저장소를 쓸 수 없으면(사생활 보호 모드 등) 본 기록이 없는 것으로 친다 */
export function readSeenNotice(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

export function writeSeenNotice(id: string): void {
  try {
    localStorage.setItem(SEEN_KEY, id)
  } catch {
    /* 기록하지 못하면 다음 방문에 한 번 더 뜰 뿐이다 */
  }
}
