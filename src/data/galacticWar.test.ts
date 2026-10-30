import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarize, type RawCampaign } from './galacticWar'

const planet = (name: string, owner: string, health: number, maxHealth: number, players: number, event: RawCampaign['planet']['event'] = null): RawCampaign => ({
  planet: { name, sector: 'S', health, maxHealth, currentOwner: owner, event, statistics: { playerCount: players } },
})

test('전황 요약: 방어전은 이벤트 종족 · 체력, 해방전은 행성 소유 종족 · 체력. 인원 많은 순, 모르는 종족은 뺀다', () => {
  const s = summarize(
    [
      planet('LUX', 'Terminids', 1141066, 2000000, 6971),
      planet('VAR', 'Humans', 1400000, 1400000, 10229, { faction: 'Automaton', health: 1266596, maxHealth: 1900000, endTime: '2026-10-31T12:20:15Z' }),
      planet('X', 'Humans', 1, 1, 50),
    ],
    [{ title: null, briefing: '  Hold the line.  ' }, { title: '', briefing: null }],
    '2026-10-30T09:17:00.000Z',
  )
  assert.deepEqual(s.fronts.map((f) => [f.name, f.race, f.defense, f.percent]), [['VAR', 'automaton', true, 33], ['LUX', 'terminid', false, 43]])
  assert.equal(s.total, 17200)
  assert.deepEqual(s.byRace.map((r) => [r.race, r.players, r.fronts]), [['terminid', 6971, 1], ['automaton', 10229, 1], ['illuminate', 0, 0]])
  assert.deepEqual(s.orders, ['Hold the line.'])
})
