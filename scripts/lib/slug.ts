/** wiki 페이지명 → 슬러그. 소문자 → 비영숫자를 `-`로 → 연속 `-` 축약 → 양끝 제거. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

import type { Kind } from '../../src/data/types.ts'

const KIND_PREFIX: Record<Kind, string> = {
  primary: 'pw',
  secondary: 'sw',
  throwable: 'th',
  armor: 'ar',
  stratagem: 'st',
}

/** 아이템 id = 종류 접두 + wiki 페이지명 슬러그. 저장본·override의 키라 규칙을 바꾸지 않는다. */
export function itemId(kind: Kind, pageName: string): string {
  return `${KIND_PREFIX[kind]}-${slugify(pageName)}`
}

/**
 * 모델 코드 토큰 정규화: 시드 `B-01`과 wiki `B-1`을 같은 키로. 대문자화 · 따옴표 제거 · 하이픈 뒤 숫자의 앞 0 제거.
 * 코드가 아닌 첫 토큰(`Orbital`, `Eagle`, `궤도`, `이글`)은 null.
 */
export function modelCodeKey(name: string): string | null {
  const first = name.trim().split(/\s+/)[0]?.replace(/['"‘’]/g, '') ?? ''
  if (!/[0-9]/.test(first) && !first.includes('/') && !first.includes('-')) return null
  return first.toUpperCase().replace(/-0+(\d)/g, '-$1')
}

/** 아이콘 매칭용 정규화 키. 소문자 + 영숫자만 남긴다. */
export function normKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/** 모델 코드 접두(첫 토큰) 제거. `AX/LAS-5 Rover` → `Rover`, `EAT-17 Expendable Anti-Tank` → `Expendable Anti-Tank`. */
export function stripModelCode(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  return parts.slice(1).join(' ')
}
