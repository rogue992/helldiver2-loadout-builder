import { useGameData } from '../data/GameDataContext'
import { sizesOf, type Loadout } from '../store/types'
import Tile from './Tile'
import { useEscape } from './useModal'
import styles from './BriefingView.module.css'

interface Props {
  loadout: Loadout
  onClose: () => void
}

/** 브리핑 뷰: 텍스트 없이 큰 타일만. 읽기 전용. Esc · 클릭으로 복귀. 칸 크기는 화면 높이에서 계산한다(비율로 커지지 않게). */
export default function BriefingView({ loadout, onClose }: Props) {
  const { index } = useGameData()
  useEscape(onClose)
  const sizes = sizesOf(loadout)
  const gear = [loadout.gear.armor, loadout.gear.primary, loadout.gear.secondary, loadout.gear.throwable]
  return (
    <div className={styles.wrap} onClick={onClose} role="presentation" data-part="briefing">
      <div className={styles.strats}>
        {loadout.pools.map((pool, i) => (
          <div key={i} className={[styles.box, sizes[i] > 1 && styles.multi].filter(Boolean).join(' ')}>
            {pool.map((id) => (
              <Tile key={id} item={index.byId.get(id) ?? null} missingId={id} shape="fixed" className={styles.cell} />
            ))}
          </div>
        ))}
      </div>
      <div className={styles.gear}>
        {gear.map((id, i) => (
          <div key={i} className={styles.box}>
            {id && <Tile item={index.byId.get(id) ?? null} missingId={id} shape={i === 0 ? 'torso' : 'fixed'} className={styles.cell} />}
          </div>
        ))}
      </div>
    </div>
  )
}
