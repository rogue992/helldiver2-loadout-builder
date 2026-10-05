import { useMemo, useState } from 'react'
import { useGameData } from '../data/GameDataContext'
import { KIND_LABEL, STRAT_TYPE_LABEL, acquireLabel, gearCaption } from '../data/labels'
import { assetUrl } from '../data/loadData'
import type { Item } from '../data/types'
import { useItemName } from '../data/useItemName'
import { useStore } from '../store/useStore'
import { isDefaultLoadout } from '../store/defaults'
import { sizesOf, type GearSlot as GearSlotKey, type PoolSize } from '../store/types'
import type { Warning } from '../rules/warnings'
import { cellTarget } from '../rules/picker'
import { copy } from '../copy/ko'
import Icon from './Icon'
import btn from './Buttons.module.css'
import Tile from './Tile'
import PickerModal, { type PickerTarget } from './PickerModal'
import styles from './Builder.module.css'

interface Props {
  warnings: Warning[]
}

const SIZES: PoolSize[] = [1, 2, 3, 4]

/**
 * 스트라타젬 4슬롯(슬롯마다 후보 칸 1~4) + 개인 장비 4(단일 선택). 모든 편집은 draft에만.
 * 칸이나 타일을 누르면 그 슬롯을 대상으로 선택 창이 열리고(SES 방식), 해제는 타일 · 캡션의 작은 ×.
 */
export default function Builder({ warnings }: Props) {
  const draft = useStore((s) => s.draft)
  const setPool = useStore((s) => s.setPool)
  const setPoolSize = useStore((s) => s.setPoolSize)
  const setGear = useStore((s) => s.setGear)
  const { index, warbondById } = useGameData()
  const name = useItemName()
  const [picker, setPicker] = useState<PickerTarget | null>(null)

  const markOf = useMemo(() => {
    const m = new Map<string, 'warn' | 'bad'>()
    for (const w of warnings) {
      if (w.level === 'info') continue
      for (const id of w.itemIds) if (w.level === 'hard' || !m.has(id)) m.set(id, w.level === 'hard' ? 'bad' : 'warn')
    }
    return m
  }, [warnings])
  const slotLevel = (slot: number): 'bad' | 'warn' | null => {
    const hard = warnings.some((w) => w.level === 'hard' && w.slots.includes(slot))
    if (hard) return 'bad'
    return warnings.some((w) => w.level === 'soft' && w.slots.includes(slot)) ? 'warn' : null
  }

  if (!draft) return null
  const sizes = sizesOf(draft)
  // 기본 로드아웃(수호부 지급)은 고정: 후보 · 칸 수 · 장비 어느 것도 바꾸지 못한다
  const locked = isDefaultLoadout(draft.id)

  const poolTypeLabel = (ids: string[]) => {
    const types = new Set(ids.map((id) => index.byId.get(id)?.stratType).filter(Boolean))
    return [...types].map((t) => STRAT_TYPE_LABEL[t!]).join(' · ')
  }

  const gearItem = (slot: GearSlotKey): Item | null => (draft.gear[slot] ? index.byId.get(draft.gear[slot]!) ?? null : null)
  // 칸 단위로 연다: 찬 타일을 누르면 그 칸이 교체 대상, 빈 칸은 어느 것을 눌러도 첫 빈 칸이 채울 대상
  const openPool = (i: number, cell: number) => !locked && setPicker({ kind: 'pool', slotIndex: i, cell: cellTarget(draft.pools[i], cell) })
  const openGear = (slot: GearSlotKey) => !locked && setPicker({ kind: 'gear', slot })

  const gearBox = (slot: GearSlotKey, boxCls: string | false, renderCls: string | false, tileShape: 'torso' | 'wide' | 'square', withSub: boolean) => {
    const item = gearItem(slot)
    return (
      <div key={slot} className={[styles.box, boxCls].filter(Boolean).join(' ')} data-part="box">
        <div className={styles.cap}>
          <b>{KIND_LABEL[slot]}</b>
          <span className={styles.types}>{item ? gearCaption(item) : ''}</span>
          {item && !locked && (
            <button type="button" className={[btn.clearX, styles.clear].join(' ')} onClick={() => setGear(slot, null)} aria-label={`${KIND_LABEL[slot]} ${copy.clear}`} title={copy.clear}>
              <Icon name="x" stroke={2.4} />
            </button>
          )}
        </div>
        <button type="button" className={[styles.render, renderCls].filter(Boolean).join(' ')} disabled={locked} onClick={() => openGear(slot)} data-part="render">
          {item ? <Tile key={item.id} item={item} shape={tileShape} className={styles.renderTile} /> : <span className={styles.empty}>{locked ? copy.lockedCell : copy.emptyCell}</span>}
          {item && (
            <span className={styles.nm}>
              {name(item)}
              {withSub && <small>{slot === 'armor' ? item.passive?.nameKo ?? '' : acquireLabel(item, warbondById)}</small>}
            </span>
          )}
          {slot === 'armor' && item?.passive?.icon && <img className={styles.pass} src={assetUrl(item.passive.icon)} alt={item.passive.nameKo} title={item.passive.nameKo} />}
        </button>
      </div>
    )
  }

  return (
    <div className={[styles.builder, locked && styles.locked].filter(Boolean).join(' ')}>
      <section className={styles.sec}>
        <h2 data-part="section-title">{copy.stratagems}</h2>
        <div className={styles.strats}>
          {draft.pools.map((pool, i) => {
            const level = slotLevel(i + 1)
            const size = sizes[i]
            const cells = Array.from({ length: size }, (_, k) => pool[k] ?? null)
            return (
              <div key={i} className={[styles.box, level && styles[level]].filter(Boolean).join(' ')} data-part="box">
                {level && <span className={styles.flag}>{level === 'bad' ? copy.levelHard : copy.levelSoft}</span>}
                <div className={styles.cap}>
                  <b>{i + 1}</b>
                  <span className={styles.types}>{poolTypeLabel(pool)}</span>
                  <span className={styles.sizeSel} role="radiogroup" aria-label={`${copy.pickerStrat(i + 1)} ${copy.poolSize}`} data-part="size-select">
                    {SIZES.map((n) => (
                      <button key={n} type="button" role="radio" aria-checked={size === n} className={size === n ? styles.sizeOn : ''} disabled={locked} onClick={() => setPoolSize(i, n)} title={n === 1 ? copy.poolSize : copy.pickOf(n)}>
                        {n}
                      </button>
                    ))}
                  </span>
                </div>
                <div className={size === 1 ? styles.one : styles.grid2}>
                  {cells.map((id, k) =>
                    id ? (
                      <span key={id} className={styles.cell}>
                        <Tile item={index.byId.get(id) ?? null} missingId={id} shape={size === 1 ? 'fixed' : 'square'} mark={markOf.get(id) ?? 'none'} onClick={locked ? undefined : () => openPool(i, k)} />
                        {!locked && (
                          <button type="button" className={[btn.clearX, styles.x].join(' ')} onClick={() => setPool(i, pool.filter((x) => x !== id))} aria-label={`${index.byId.get(id) ? name(index.byId.get(id)!) : id} ${copy.clear}`} title={copy.clear} data-part="clear-candidate">
                            <Icon name="x" stroke={2.4} />
                          </button>
                        )}
                      </span>
                    ) : (
                      <button key={`e${k}`} type="button" className={[styles.emptyCell, size === 1 && styles.emptyOne].filter(Boolean).join(' ')} disabled={locked} onClick={() => openPool(i, k)} aria-label={`${copy.pickerStrat(i + 1)} ${locked ? copy.lockedCell : copy.emptyCell}`} data-part="empty-cell">
                        {!locked && (
                          <span className={styles.emptyIc}>
                            <Icon name="plus" stroke={1.8} />
                          </span>
                        )}
                        <span>{locked ? copy.lockedCell : copy.emptyCell}</span>
                      </button>
                    ),
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className={styles.sec}>
        <h2 data-part="section-title">{copy.gear}</h2>
        <div className={styles.gear}>
          {gearBox('armor', styles.armorBox, styles.renderArmor, 'torso', true)}
          {gearBox('primary', styles.primaryBox, false, 'wide', true)}
          <div className={styles.stack}>
            {gearBox('secondary', false, styles.renderSmall, 'square', false)}
            {gearBox('throwable', false, styles.renderSmall, 'square', false)}
          </div>
        </div>
      </section>

      {picker && <PickerModal target={picker} onTarget={setPicker} onClose={() => setPicker(null)} />}
    </div>
  )
}
