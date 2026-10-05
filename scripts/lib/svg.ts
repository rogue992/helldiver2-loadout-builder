// 외부에서 받은 SVG 검사. 아이콘은 public/에 그대로 배포되고, 링크로 직접 열면 사이트 출처의 문서로 실행된다.
// 그래서 스크립트가 될 수 있는 요소 · 속성 · 외부 참조가 하나라도 있으면 저장하지 않는다.
// 고쳐서 쓰지 않고 거부한다: 스트라타젬 아이콘에 이런 것이 들어 있을 이유가 없고, 정화 규칙이 틀리면 그대로 배포되기 때문이다.

/** 접두 없는 요소는 이 목록만 허용(도형 · 그룹 · 정의 · 설명) */
const ALLOWED_TAGS = new Set([
  'svg', 'g', 'path', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon',
  'defs', 'clippath', 'mask', 'lineargradient', 'radialgradient', 'stop', 'symbol', 'use',
  'title', 'desc', 'metadata',
])
/** 편집기 메타데이터처럼 접두가 붙은 요소라도 로컬 이름이 이것이면 거부 */
const DANGEROUS_LOCAL = new Set(['script', 'foreignobject', 'iframe', 'embed', 'object', 'style', 'link', 'a', 'image', 'img', 'animate', 'set', 'handler', 'listener', 'base', 'meta', 'form'])
const XHTML_NS = 'http://www.w3.org/1999/xhtml'

/** 문제 목록. 비어 있으면 저장해도 된다 */
export function svgIssues(svg: string): string[] {
  const issues = new Set<string>()
  if (/<!DOCTYPE|<!ENTITY/i.test(svg)) issues.add('DOCTYPE/ENTITY')
  if (/<\?xml-stylesheet/i.test(svg)) issues.add('xml-stylesheet')
  if (svg.includes(XHTML_NS)) issues.add('XHTML 네임스페이스')
  for (const m of svg.matchAll(/<([A-Za-z][\w.-]*)(?::([\w.-]+))?/g)) {
    const [, a, b] = m
    const local = (b ?? a).toLowerCase()
    if (b ? DANGEROUS_LOCAL.has(local) : !ALLOWED_TAGS.has(local)) issues.add(`<${b ? `${a}:${b}` : a}>`)
  }
  if (/\son[a-z]+\s*=/i.test(svg)) issues.add('on* 이벤트 속성')
  for (const m of svg.matchAll(/\s(?:xlink:)?href\s*=\s*["']\s*([^"']*)/gi)) if (!m[1].startsWith('#')) issues.add(`외부 href "${m[1].slice(0, 40)}"`)
  for (const m of svg.matchAll(/url\(\s*['"]?\s*([^)'"]*)/gi)) if (!m[1].startsWith('#')) issues.add(`외부 url() "${m[1].slice(0, 40)}"`)
  if (/javascript:/i.test(svg)) issues.add('javascript:')
  if (/@import/i.test(svg)) issues.add('@import')
  return [...issues]
}
