import { useEffect, useState } from 'react'
import type { StampState } from '../rules/warnings'
import type { ThemeId } from '../store/types'
import { copy } from '../copy/ko'
import styles from './Stamp.module.css'

interface Props {
  state: StampState
  theme: ThemeId
  /** 값이 바뀌면 도장 찍는 애니메이션 */
  stampKey?: number
}

const LABEL: Record<Exclude<StampState, 'none'>, string> = { hold: copy.stampHold, treason: copy.stampTreason, approved: copy.stampApproved }

/** 테마 슬롯: console = 회전 도장, teletype = LED + 텍스트. 전부 비어 있으면(none) 찍지 않는다. */
export default function Stamp({ state, theme, stampKey = 0 }: Props) {
  const [slam, setSlam] = useState(false)
  useEffect(() => {
    if (!stampKey) return
    setSlam(true)
    const t = setTimeout(() => setSlam(false), 400)
    return () => clearTimeout(t)
  }, [stampKey])

  if (state === 'none') return null
  const cls = [styles.stamp, styles[state], styles[theme], slam && styles.slam].filter(Boolean).join(' ')
  if (theme === 'teletype') {
    return (
      <span className={cls} data-part="stamp" role="status">
        <i className={styles.led} aria-hidden />
        <b>{LABEL[state]}</b>
      </span>
    )
  }
  return (
    <span className={cls} data-part="stamp" role="status">
      {LABEL[state]}
    </span>
  )
}
