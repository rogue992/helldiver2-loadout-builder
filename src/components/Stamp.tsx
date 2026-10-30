import { useEffect, useState } from 'react'
import type { StampState } from '../rules/warnings'
import { copy } from '../copy'
import styles from './Stamp.module.css'

interface Props {
  state: StampState
  /** 값이 바뀌면 도장 찍는 애니메이션 */
  stampKey?: number
}

/** 문구는 그리는 순간 읽는다(화면 언어를 따라가게) */
const label = (state: Exclude<StampState, 'none'>) => ({ hold: copy.stampHold, treason: copy.stampTreason, approved: copy.stampApproved })[state]

/** 회전 도장. 전부 비어 있으면(none) 찍지 않는다. */
export default function Stamp({ state, stampKey = 0 }: Props) {
  const [slam, setSlam] = useState(false)
  useEffect(() => {
    if (!stampKey) return
    setSlam(true)
    const t = setTimeout(() => setSlam(false), 400)
    return () => clearTimeout(t)
  }, [stampKey])

  if (state === 'none') return null
  const cls = [styles.stamp, styles[state], slam && styles.slam].filter(Boolean).join(' ')
  return (
    <span className={cls} data-part="stamp" role="status">
      {label(state)}
    </span>
  )
}
