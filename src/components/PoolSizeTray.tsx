import type { PoolSize } from '../store/types'
import { copy } from '../copy/ko'
import styles from './PoolSizeTray.module.css'

const SIZES: PoolSize[] = [1, 2, 3, 4]

interface Props {
  slotIndex: number
  size: PoolSize
  disabled?: boolean
  onChange: (size: PoolSize) => void
  /** 선택 창 슬롯 줄용으로 조금 크게 */
  large?: boolean
  className?: string
}

/** 스트라타젬 슬롯의 후보 칸 수(1~4). 빌더 슬롯 캡션과 선택 창 슬롯 이름 옆에서 같이 쓴다. 누르기가 슬롯 선택으로 번지지 않게 막는다 */
export default function PoolSizeTray({ slotIndex, size, disabled = false, onChange, large = false, className }: Props) {
  return (
    <span
      className={[styles.tray, large && styles.large, className].filter(Boolean).join(' ')}
      role="radiogroup"
      aria-label={`${copy.pickerStrat(slotIndex + 1)} ${copy.poolSize}`}
      data-part="size-select"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {SIZES.map((n) => (
        <button key={n} type="button" role="radio" aria-checked={size === n} className={size === n ? styles.on : ''} disabled={disabled} onClick={() => onChange(n)} title={n === 1 ? copy.poolSize : copy.pickOf(n)}>
          {n}
        </button>
      ))}
    </span>
  )
}
