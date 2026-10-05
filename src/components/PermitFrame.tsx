import type { ReactNode } from 'react'
import type { ThemeId } from '../store/types'
import styles from './PermitFrame.module.css'

interface Props {
  theme: ThemeId
  children: ReactNode
  className?: string
}

/** 테마 슬롯: console = 상단 위험 줄무늬 + 노란 라인 + 노치, teletype = 단말 패널. */
export default function PermitFrame({ theme, children, className }: Props) {
  return (
    <aside className={[styles.frame, styles[theme], className].filter(Boolean).join(' ')} data-part="permit-frame">
      {theme === 'console' && <div className={styles.hazard} aria-hidden />}
      {children}
    </aside>
  )
}
