import { useMemo } from 'react'
import { assetUrl } from '../data/loadData'
import type { ArmorStats, Item } from '../data/types'
import { ARMOR_CLASS_LABEL, KIND_LABEL, passiveName } from '../data/labels'
import { pick } from '../copy/lang'
import { useItemName } from '../data/useItemName'
import { copy } from '../copy'
import styles from './ArmorDetail.module.css'

const STATS: (keyof ArmorStats)[] = ['armor', 'speed', 'stamina']

interface Props {
  item: Item | null
  /** 막대 눈금의 기준(방어구 전체의 최소 · 최대) */
  all: Item[]
}

/** 방어구 선택 창 오른쪽 패널: 큰 그림 · 수치 막대 · 패시브 효과. 마우스를 올린 카드(없으면 지금 고른 방어구)를 보여 준다 */
export default function ArmorDetail({ item, all }: Props) {
  const name = useItemName()
  // 막대는 가장 낮은 값도 조금 보이게 바닥을 두고, 나머지를 전체 범위에 비례시킨다
  const range = useMemo(() => {
    const r = {} as Record<keyof ArmorStats, [number, number]>
    for (const k of STATS) {
      const vs = all.flatMap((i) => (i.armorStats ? [i.armorStats[k]] : []))
      r[k] = [Math.min(...vs), Math.max(...vs)]
    }
    return r
  }, [all])
  const label = { armor: copy.statArmor, speed: copy.statSpeed, stamina: copy.statStamina }

  if (!item) {
    return (
      <aside className={styles.panel} data-part="armor-detail">
        <p className={styles.hint}>{copy.armorDetailHint}</p>
      </aside>
    )
  }
  const s = item.armorStats
  const p = item.passive
  return (
    <aside className={styles.panel} data-part="armor-detail" aria-live="polite">
      <div className={styles.head}>
        <div className={styles.pic}>
          <img src={assetUrl(item.card)} alt="" />
        </div>
        <div className={styles.titles}>
          <h4>{name(item)}</h4>
          <small>
            {KIND_LABEL.armor}
            {item.armorClass && ` · ${ARMOR_CLASS_LABEL[item.armorClass]}`}
          </small>
        </div>
      </div>
      {s && (
        <dl className={styles.stats}>
          {STATS.map((k) => {
            const [lo, hi] = range[k]
            const w = hi > lo ? 15 + (85 * (s[k] - lo)) / (hi - lo) : 100
            return (
              <div key={k} className={styles.stat}>
                <dt>{label[k]}</dt>
                <dd>
                  <span className={styles.bar}>
                    <i style={{ width: `${Math.max(0, Math.min(100, w))}%` }} />
                  </span>
                  <b>{s[k]}</b>
                </dd>
              </div>
            )
          })}
        </dl>
      )}
      {p && (
        <div className={styles.passive}>
          <div className={styles.pTitle}>
            {p.icon && <img src={assetUrl(p.icon)} alt="" />}
            {passiveName(p)}
          </div>
          <ul>
            {pick(p.effectsKo, p.effectsEn).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
