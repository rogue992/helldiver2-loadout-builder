import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { svgIssues } from './svg.ts'

const STRAT_DIR = new URL('../../public/icons/strat/', import.meta.url)

test('커밋된 스트라타젬 아이콘은 모두 통과한다', () => {
  for (const f of readdirSync(STRAT_DIR)) assert.deepEqual(svgIssues(readFileSync(new URL(f, STRAT_DIR), 'utf8')), [], f)
})

test('스크립트가 될 수 있는 요소 · 속성 · 외부 참조는 거부한다', () => {
  const bad = [
    '<svg><script>alert(1)</script></svg>',
    '<svg onload="x()"><path/></svg>',
    '<svg><foreignObject/></svg>',
    '<svg><a href="https://x">a</a></svg>',
    '<svg><use xlink:href="data:image/svg+xml,x"/></svg>',
    '<svg xmlns:h="http://www.w3.org/1999/xhtml"><h:script/></svg>',
    '<svg><path style="fill:url(https://evil/x)"/></svg>',
    '<!DOCTYPE svg [<!ENTITY x "y">]><svg/>',
  ]
  for (const s of bad) assert.notDeepEqual(svgIssues(s), [], s)
})

test('내부 참조(#id)와 편집기 메타데이터는 허용한다', () => {
  assert.deepEqual(svgIssues('<svg><defs><clipPath id="a"/></defs><g clip-path="url(#a)"><use href="#b"/></g><sodipodi:namedview/></svg>'), [])
})
