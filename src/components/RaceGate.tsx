import { RACES, RACE_ALL, type LoadoutRace } from '../data/factions'
import { useStore } from '../store/useStore'
import { copy } from '../copy/ko'
import styles from './RaceGate.module.css'

interface Props {
  onAssign: (race: LoadoutRace) => void
}

/**
 * 전선 미지정 허가서의 관문: 빌더 위를 덮고 종족부터 고르게 한다. 고르는 순간 목록에 발급되고 슬롯이 열린다.
 * 상단 바가 보고 있는 종족은 "지금 보는 종족", 나머지는 그 종족 저장 수를 단다.
 */
export default function RaceGate({ onAssign }: Props) {
  const loadouts = useStore((s) => s.loadouts)
  const viewing = useStore((s) => s.ui.race)
  return (
    <div className={styles.gate} data-part="race-gate">
      <div className={styles.card} role="group" aria-label={copy.raceUnset}>
        <span className={styles.k}>
          <i aria-hidden />
          {copy.raceUnset}
        </span>
        <h3>{copy.gateTitle}</h3>
        <p>{copy.gateBody}</p>
        <div className={styles.races}>
          {RACES.map((r) => (
            <button key={r.id} type="button" style={{ '--rc': `var(--race-${r.id})` } as React.CSSProperties} onClick={() => onAssign(r.id)}>
              <i aria-hidden />
              {r.nameKo}
              <small>{viewing === r.id ? copy.gateCurrent : copy.gateSaved(loadouts.filter((l) => l.race === r.id).length)}</small>
            </button>
          ))}
        </div>
        <button type="button" className={styles.any} onClick={() => onAssign(RACE_ALL.id)}>
          {copy.gateAny}
        </button>
      </div>
    </div>
  )
}
