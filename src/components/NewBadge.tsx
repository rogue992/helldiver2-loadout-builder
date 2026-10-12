import { copy } from '../copy/ko'
import styles from './NewBadge.module.css'

/** 새로 들어온 아이템 · 채권 표시. 자리(겹쳐 띄울지, 글자 옆에 둘지)는 쓰는 쪽 className이 정한다 */
export default function NewBadge({ className }: { className?: string }) {
  return <span className={[styles.badge, className].filter(Boolean).join(' ')}>{copy.newBadge}</span>
}
