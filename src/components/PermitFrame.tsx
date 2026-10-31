import type { ReactNode } from 'react'
import styles from './PermitFrame.module.css'

interface Props {
  children: ReactNode
  className?: string
}

/** 허가서 틀: 상단 위험 줄무늬 + 노란 라인 + 노치. */
export default function PermitFrame({ children, className }: Props) {
  return (
    <aside className={[styles.frame, className].filter(Boolean).join(' ')} data-part="permit-frame">
      <div className={styles.hazard} aria-hidden />
      {children}
    </aside>
  )
}
