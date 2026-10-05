// 저장본 · override 키와 위키 조인을 받치는 규칙. 바뀌면 기존 데이터가 깨지므로 대표 입력을 고정한다.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { itemId, modelCodeKey, normKey, slugify, stripModelCode } from './slug.ts'
import { firstLink, normalizePageName, warbondPageOf } from './wikitext.ts'
import { resolveAliasId } from './overrides.ts'

test('아이템 id = 종류 접두 + 페이지명 슬러그', () => {
  assert.equal(itemId('stratagem', 'EAT-17 Expendable Anti-Tank'), 'st-eat-17-expendable-anti-tank')
  assert.equal(itemId('armor', 'B-01 Tactical'), 'ar-b-01-tactical')
  assert.equal(itemId('primary', 'AR-23 Liberator'), 'pw-ar-23-liberator')
  assert.equal(slugify("  Freedom's Flame  "), 'freedom-s-flame')
})

test('시드 조인 키와 아이콘 매칭 키', () => {
  assert.equal(modelCodeKey('B-01 전술'), 'B-1')
  assert.equal(modelCodeKey('Orbital Laser'), null)
  assert.equal(normKey('Guard Dog K-9'), 'guarddogk9')
  assert.equal(stripModelCode('AX/LAS-5 Rover'), 'Rover')
})

test('채권 링크 파싱과 페이지 번호', () => {
  const l = firstLink('[[Chemical_Agents’ Pack#Page_2|화학]] 외')!
  assert.equal(l.page, "Chemical Agents' Pack")
  assert.equal(l.anchor, 'Page_2')
  assert.equal(normalizePageName('A__B'), 'A B')
  assert.equal(warbondPageOf('[[X#Page 3]]'), 3)
  assert.equal(warbondPageOf('<span title="Page 4">'), 4)
  assert.equal(warbondPageOf('none'), null)
})

test('alias는 사슬을 따라가고 자기 키만 본다', () => {
  assert.equal(resolveAliasId({ a: 'b', b: 'c' }, 'a'), 'c')
  assert.equal(resolveAliasId({}, 'constructor'), 'constructor')
})
