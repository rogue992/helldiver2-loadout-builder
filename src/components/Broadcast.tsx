import { useEffect, useMemo, useState } from 'react'
import type { ThemeId } from '../store/types'
import { copy, slogans, SLOGAN_EXEMPLARY } from '../copy/ko'
import styles from './Broadcast.module.css'

interface Props {
  theme: ThemeId
  /** 승인 도장 상태면 "모범 헬다이버" 문구를 섞는다 */
  exemplary?: boolean
}

/** 테마 슬롯: console = 상단 줄무늬 띠(스크롤), teletype = 허가서 머리의 타이핑 한 줄. */
export default function Broadcast({ theme, exemplary = false }: Props) {
  const lines = useMemo(() => (exemplary ? [SLOGAN_EXEMPLARY, ...slogans] : slogans), [exemplary])
  const [i, setI] = useState(0)
  const [typed, setTyped] = useState('')
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  // 승인 상태가 바뀌면 문구 줄 수가 달라진다. 번호는 늘 줄 수로 나눈 나머지로 읽는다
  const line = lines[i % lines.length]

  useEffect(() => {
    if (theme === 'console') return
    if (reduce) {
      const t = setTimeout(() => setI((x) => (x + 1) % lines.length), 6000)
      return () => clearTimeout(t)
    }
    // teletype: 한 글자씩 치고, 다 치면 잠시 쉰 뒤 다음 줄. 쉬는 타이머도 정리해야 목록이 바뀔 때 문구가 끊기지 않는다
    let pos = 0
    let wait: ReturnType<typeof setTimeout> | undefined
    setTyped('')
    const iv = setInterval(() => {
      pos++
      setTyped(line.slice(0, pos))
      if (pos >= line.length) {
        clearInterval(iv)
        wait = setTimeout(() => setI((x) => (x + 1) % lines.length), 3500)
      }
    }, 45)
    return () => {
      clearInterval(iv)
      if (wait) clearTimeout(wait)
    }
  }, [theme, i, line, lines.length, reduce])

  if (theme === 'teletype') {
    return (
      <div className={styles.tty} data-part="broadcast" aria-live="polite">
        <div className={styles.ttyHead}>
          <span>
            {copy.broadcast} {copy.broadcastChannel}
          </span>
          <i aria-hidden />
        </div>
        <div className={styles.ttyMsg}>{reduce ? line : typed}</div>
      </div>
    )
  }
  return (
    <div className={styles.ticker} data-part="broadcast" aria-live="off">
      <span className={styles.lbl}>
        <i aria-hidden />
        {copy.broadcast}
      </span>
      <div className={styles.runWrap}>
        {/* 같은 문구 묶음을 두 번 이어 붙이고 절반만큼 이동시켜, 끝나고 비는 구간 없이 계속 이어진다 */}
        <div className={[styles.run, reduce && styles.runStill].filter(Boolean).join(' ')}>
          {[0, 1].map((copyIdx) =>
            lines.map((s, k) => (
              <span key={`${copyIdx}-${k}`} aria-hidden={copyIdx === 1 || undefined}>
                <em aria-hidden>◆</em>
                {s}
              </span>
            )),
          )}
        </div>
      </div>
    </div>
  )
}
