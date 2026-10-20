import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_SETTINGS, type Settings } from '../store/types'
import { importedSettings, parseImport } from './json'

const file = (settings: unknown) => parseImport(JSON.stringify({ format: 'hd2lb', version: 1, exportedAt: '', dataVersion: '', loadouts: [], settings }))!
const current: Settings = { ...DEFAULT_SETTINGS, favorites: { all: [], terminid: ['a', 'b'], automaton: [], illuminate: [] } }

test('가져오기 설정: 즐겨찾기가 없는 파일(기능 이전)은 지금 즐겨찾기를 그대로 둔다', () => {
  const f = file({ eagleThreshold: 2 })
  assert.equal(f.hasFavorites, false)
  for (const mode of ['merge', 'replace'] as const) {
    const s = importedSettings(f, current, mode)!
    assert.equal(s.eagleThreshold, 2)
    assert.deepEqual(s.favorites, current.favorites)
  }
})

test('가져오기 설정: 병합은 종족별로 합치고, 교체는 파일 것을 쓴다', () => {
  const f = file({ favorites: { terminid: ['b', 'c'], automaton: ['x'] } })
  assert.equal(f.hasFavorites, true)
  assert.deepEqual(importedSettings(f, current, 'merge')!.favorites, { all: [], terminid: ['a', 'b', 'c'], automaton: ['x'], illuminate: [] })
  assert.deepEqual(importedSettings(f, current, 'replace')!.favorites, { all: [], terminid: ['b', 'c'], automaton: ['x'], illuminate: [] })
})

test('가져오기 설정: 파일에 설정이 없으면 반영할 것이 없다', () => {
  const f = parseImport(JSON.stringify({ format: 'hd2lb', version: 1, loadouts: [] }))!
  assert.equal(importedSettings(f, current, 'merge'), undefined)
})
