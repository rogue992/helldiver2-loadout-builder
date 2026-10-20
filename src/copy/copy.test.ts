import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Item } from '../data/types'
import { copyEn } from './en'
import { copy, setLang } from './index'
import { ARMOR_CLASS_LABEL, KIND_LABEL, SOURCE_LABEL, STRAT_TYPE_LABEL, WARBOND_TYPE_LABEL, weaponTypeLabel } from '../data/labels'
import { LOADOUT_RACES, factionLabel, raceLabel } from '../data/factions'

const HANGUL = /[가-힣]/
const EM = '\u2014'

/** 사전의 모든 문구(함수는 대표 인자로 불러 본 결과) */
function* strings(v: unknown, path: string): Generator<[string, string]> {
  if (typeof v === 'string') yield [path, v]
  else if (typeof v === 'function') yield [path, String(v(3, 'X', 'Y'))]
  else if (Array.isArray(v)) for (const [i, x] of v.entries()) yield* strings(x, `${path}[${i}]`)
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) yield* strings(x, `${path}.${k}`)
}

test('영어 사전: 한글이 남은 문구가 없다(언어 고르기의 "한국어"만 예외), em dash도 없다', () => {
  const all = [...strings(copyEn, 'copy')]
  assert.deepEqual(all.filter(([p, s]) => p !== 'copy.langKo' && HANGUL.test(s)), [])
  assert.deepEqual(all.filter(([, s]) => s.includes(EM)), [])
})

test('영어 화면: 라벨 · 종족 · 팩션 · 무기 종류가 영어로 바뀌고, 한국어로 돌아온다', () => {
  const items = JSON.parse(readFileSync(new URL('../../public/data/items.json', import.meta.url), 'utf8')) as Item[]
  const weaponTypes = [...new Set(items.map((i) => i.weaponType).filter((t): t is string => !!t))]
  setLang('en')
  try {
    assert.equal(copy.appName, 'Loadout Builder')
    const shown = [
      ...[KIND_LABEL, STRAT_TYPE_LABEL, SOURCE_LABEL, WARBOND_TYPE_LABEL, ARMOR_CLASS_LABEL].flatMap((t) => Object.values(t)),
      ...weaponTypes.map(weaponTypeLabel),
      ...LOADOUT_RACES.flatMap((r) => [raceLabel(r), ...r.factions.map(factionLabel)]),
    ]
    assert.deepEqual(shown.filter((s) => HANGUL.test(s)), [])
  } finally {
    setLang('ko')
  }
  assert.equal(copy.appName, '로드아웃 빌더')
  assert.equal(KIND_LABEL.primary, '주무기')
})
