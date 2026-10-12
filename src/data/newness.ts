import type { Item } from './types'

/** 데이터에 처음 들어온 날부터 이 기간 동안 NEW로 보인다(보는 사람의 시계 기준이라 다시 배포하지 않아도 저절로 꺼진다) */
export const NEW_DAYS = 30
const DAY_MS = 86_400_000

export function isNewItem(item: Pick<Item, 'addedAt'>, now = Date.now()): boolean {
  if (!item.addedAt) return false
  const t = Date.parse(item.addedAt)
  return Number.isFinite(t) && now - t < NEW_DAYS * DAY_MS
}
