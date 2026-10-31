import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isWarSummary, summarize, timeLeft, type RawCampaign } from './galacticWar'

const planet = (name: string, owner: string, health: number, maxHealth: number, players: number, event: RawCampaign['planet']['event'] = null): RawCampaign => ({
  planet: { name, sector: 'S', health, maxHealth, currentOwner: owner, event, statistics: { playerCount: players } },
})
const AT = '2026-10-30T09:17:00.000Z'

test('전황 요약: 방어전은 이벤트 종족 · 체력, 해방전은 행성 소유 종족 · 체력. 인원 많은 순, 모르는 종족은 뺀다', () => {
  const s = summarize(
    [
      planet('LUX', 'Terminids', 1141066, 2000000, 6971),
      planet('VAR', 'Humans', 1400000, 1400000, 10229, { faction: 'Automaton', health: 1266596, maxHealth: 1900000, endTime: '2026-10-31T12:20:15Z' }),
      planet('X', 'Humans', 1, 1, 50),
    ],
    [],
    AT,
  )
  assert.deepEqual(s.fronts.map((f) => [f.name, f.race, f.defense, f.percent]), [['VAR', 'automaton', true, 33], ['LUX', 'terminid', false, 43]])
  assert.equal(s.total, 17200)
  assert.deepEqual(s.byRace.map((r) => [r.race, r.players, r.fronts]), [['terminid', 6971, 1], ['automaton', 10229, 1], ['illuminate', 0, 0]])
  assert.ok(isWarSummary(s))
})

test('주요 명령: 지시문이 든 브리핑을 먼저, 없으면 제목. 둘 다 비면 뺀다', () => {
  const s = summarize([], [{ title: 'MAJOR ORDER', briefing: '  Hold the line.  ' }, { title: 'MAJOR ORDER', briefing: null }, { title: '', briefing: null }], AT)
  assert.deepEqual(s.orders, ['Hold the line.', 'MAJOR ORDER'])
})

test('전황 요약: 외부 응답의 모양이 어긋난 항목은 버리고, 프로토타입 이름은 종족으로 치지 않는다', () => {
  const bad = [
    planet('P', 'constructor', 1, 2, 5),
    { planet: { ...planet('Q', 'Terminids', 1, 2, 5).planet, name: { x: 1 } } },
    { planet: null },
    'nope',
    planet('OK', 'Illuminate', 1, 2, 5),
  ]
  const s = summarize(bad, { not: 'an array' }, AT)
  assert.deepEqual(s.fronts.map((f) => f.name), ['OK'])
  assert.deepEqual(s.orders, [])
})

test('남은 시간: 1시간 미만은 분, 지난 마감 · 마감 없음은 표시하지 않는다', () => {
  const now = Date.parse(AT)
  const at = (ms: number) => new Date(now + ms).toISOString()
  assert.deepEqual(timeLeft(at(27 * 3600000 + 59 * 60000), now), { hours: 27 })
  assert.deepEqual(timeLeft(at(25 * 60000), now), { minutes: 25 })
  assert.deepEqual(timeLeft(at(20000), now), { minutes: 1 })
  assert.equal(timeLeft(at(-60000), now), null)
  assert.equal(timeLeft(null, now), null)
})

test('캐시 모양 검사: 배열 · 종족 · 문자열이 어긋나면 믿지 않는다', () => {
  const ok = summarize([planet('A', 'Terminids', 1, 2, 3)], [], AT)
  assert.ok(isWarSummary(ok))
  assert.equal(isWarSummary({ at: AT }), false)
  assert.equal(isWarSummary({ ...ok, fronts: [{ ...ok.fronts[0], race: 'constructor' }] }), false)
  assert.equal(isWarSummary({ ...ok, orders: [1] }), false)
  assert.equal(isWarSummary(null), false)
})
