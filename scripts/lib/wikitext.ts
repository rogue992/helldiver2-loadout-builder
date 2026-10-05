// Cargo 셀에 섞여 오는 wikitext · HTML 조각 정리.

/** `&nbsp;` `&bull;` 같은 엔티티와 태그를 제거하고 공백을 정리한다. */
export function stripMarkup(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&bull;|&#8226;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 텍스트에 특정 트레이트 단어가 있는지(대소문자 무시, 부분 문자열). */
export function hasWord(text: string, word: string): boolean {
  return stripMarkup(text).toLowerCase().includes(word.toLowerCase())
}

export interface WikiLink {
  /** 파이프 앞 원문 (앵커 포함) */
  target: string
  /** 앵커 제거 + `_`→공백 + U+2019→' + 공백 축약 */
  page: string
  anchor: string | null
  label: string | null
}

/** 첫 `[[…]]` 링크를 파싱한다. */
export function firstLink(s: string): WikiLink | null {
  const m = /\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/.exec(s)
  if (!m) return null
  const target = m[1].trim()
  const [rawPage, rawAnchor] = target.split('#', 2)
  return {
    target,
    page: normalizePageName(rawPage),
    anchor: rawAnchor?.trim() ?? null,
    label: m[2]?.trim() ?? null,
  }
}

/** 링크 타깃을 `_pageName`과 조인할 수 있는 형태로. 실측: 정규화 없이는 채권 링크 7건이 실패한다. */
export function normalizePageName(s: string): string {
  return s.replace(/_/g, ' ').replace(/’/g, "'").replace(/\s+/g, ' ').trim()
}

/** `#Page 2` · `#Page_2` · `<span … title="Page 2">` 에서 페이지 번호를 뽑는다. */
export function warbondPageOf(source: string): number | null {
  const a = /#Page[ _](\d+)/i.exec(source)
  if (a) return Number(a[1])
  const t = /title="Page (\d+)"/i.exec(source)
  if (t) return Number(t[1])
  return null
}

/** 사람이 읽는 문자열에서 em dash를 제거(외부 유래 값 전용). */
export function replaceEmDash(s: string): string {
  return s.replace(/—/g, '-')
}
