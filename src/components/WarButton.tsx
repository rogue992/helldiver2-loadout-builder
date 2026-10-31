import { useEffect, useRef, useState } from 'react'
import { loadWar, timeLeft, type Front, type WarSummary } from '../data/galacticWar'
import { RACE_BY_ID, raceLabel, type Race } from '../data/factions'
import { useStore } from '../store/useStore'
import { copy } from '../copy'
import { useEscape } from './useModal'
import styles from './WarButton.module.css'

const fmt = (n: number) => n.toLocaleString('en-US')
const hhmm = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const dot = (race: Race) => ({ '--dot': `var(--race-${race})` }) as React.CSSProperties
/** 상위 전선 몇 곳까지 펼침판에 보일지 */
const TOP = 5

/** 상단 바 "전황 N" 버튼 + 펼침판. 페이지를 열 때 한 번 받고(잠깐 캐시해 둔다), 실패하면 버튼째 숨는다 */
export default function WarButton() {
  const [war, setWar] = useState<WarSummary | null>(null)
  const [open, setOpen] = useState(false)
  const setUi = useStore((s) => s.setUi)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    void loadWar().then((s) => alive && setWar(s))
    return () => {
      alive = false
    }
  }, [])
  // 펼칠 때 캐시가 지났으면 새로 받는다(시계를 돌리지 않고 볼 때만 묻는다)
  const toggle = () => {
    if (!open) void loadWar().then((s) => s && setWar(s))
    setOpen((o) => !o)
  }
  // 바깥을 누르면 닫는다
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !wrapRef.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [open])

  if (!war || war.fronts.length === 0) return null
  const goFront = (f: Front) => {
    setUi({ race: f.race, faction: 'all' })
    setOpen(false)
  }
  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button type="button" className={[styles.btn, open && styles.btnOn].filter(Boolean).join(' ')} aria-expanded={open} onClick={toggle} title={copy.warButtonTitle(war.fronts.length)} data-part="war-button">
        {copy.warButton}
        <b>{war.fronts.length}</b>
      </button>
      {open && <WarPanel war={war} onFront={goFront} onClose={() => setOpen(false)} />}
    </div>
  )
}

function WarPanel({ war, onFront, onClose }: { war: WarSummary; onFront: (f: Front) => void; onClose: () => void }) {
  useEscape(onClose)
  const now = Date.now()
  return (
    <div className={styles.panel} role="dialog" aria-label={copy.warTitle} data-part="war-panel">
      <div className={styles.hd}>
        <b>{copy.warTitle}</b>
        <small>{copy.warAsOf(hhmm(war.at))}</small>
      </div>
      <div className={styles.sec}>
        <small className={styles.k}>{copy.warOrders}</small>
        {war.orders.length ? war.orders.map((o, i) => <p key={i}>{o}</p>) : <p className={styles.muted}>{copy.warNoOrder}</p>}
      </div>
      <div className={styles.sec}>
        <small className={styles.k}>{copy.warPlayers(fmt(war.total))}</small>
        <div className={styles.stack} aria-hidden>
          {war.byRace.map((r) => (r.players ? <i key={r.race} style={{ ...dot(r.race), flexGrow: r.players }} /> : null))}
        </div>
        <div className={styles.legend}>
          {war.byRace.map((r) => (
            <span key={r.race} style={dot(r.race)}>
              {raceLabel(RACE_BY_ID[r.race])} <b>{copy.warRaceLine(fmt(r.players), r.fronts)}</b>
            </span>
          ))}
        </div>
      </div>
      <div className={styles.fronts}>
        {war.fronts.slice(0, TOP).map((f) => {
          const left = timeLeft(f.endsAt, now)
          return (
            <button key={f.name} type="button" className={styles.front} style={dot(f.race)} onClick={() => onFront(f)} data-part="war-front">
              <span className={styles.nm}>
                <b>{f.name}</b>
                <small>
                  <span className={styles.rdot}>{raceLabel(RACE_BY_ID[f.race])}</span>
                  {f.sector}
                  <span className={[styles.kind, f.defense ? styles.def : styles.lib].join(' ')}>{f.defense ? copy.warDefense : copy.warLiberate}</span>
                  {left && <span>{'hours' in left ? copy.warHoursLeft(left.hours) : copy.warMinutesLeft(left.minutes)}</span>}
                </small>
              </span>
              <span className={styles.lv}>
                {f.percent}%
                <span className={styles.bar}>
                  <i style={{ width: `${Math.max(f.percent, 2)}%` }} />
                </span>
              </span>
              <span className={styles.pl}>{copy.warPlayersShort(fmt(f.players))}</span>
            </button>
          )
        })}
      </div>
      <p className={styles.ft}>{copy.warFooter}</p>
    </div>
  )
}
