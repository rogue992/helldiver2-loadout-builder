import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useGameData } from '../data/GameDataContext'
import { ARMOR_CLASS_LABEL, KIND_LABEL, STRAT_TYPE_LABEL, STRAT_TYPE_ORDER, acquireLabel, gearCaption, weaponTypeLabel } from '../data/labels'
import { assetUrl } from '../data/loadData'
import type { Item, StratType } from '../data/types'
import { useItemName } from '../data/useItemName'
import { isNewItem } from '../data/newness'
import { raceInfo, raceLabel } from '../data/factions'
import { useStore } from '../store/useStore'
import { sizesOf, type GearSlot, type PoolSize, type PoolSizes } from '../store/types'
import { GEAR_ORDER, cellTarget, favoritesFirst, firstEmptyCell, nextGearTarget, nextPoolTarget, placeInPool, removeFromPool, showFavoriteGroup, targetAfterResize } from '../rules/picker'
import { copy } from '../copy'
import Icon from './Icon'
import NewBadge from './NewBadge'
import PoolSizeTray from './PoolSizeTray'
import btn from './Buttons.module.css'
import Tile from './Tile'
import { useModal } from './useModal'
import styles from './PickerModal.module.css'

/** pool.cell = 슬롯 안의 칸 번호(0~size-1). 찬 칸이면 교체, 빈 칸이면 채움 */
export type PickerTarget = { kind: 'gear'; slot: GearSlot } | { kind: 'pool'; slotIndex: number; cell: number }

interface Props {
  target: PickerTarget
  onTarget: (t: PickerTarget) => void
  onClose: () => void
}

/** 별 + 즐겨찾기 개수(탭 · 묶음 제목). 0이면 그리지 않는다. 자리 차이는 쓰는 쪽 셀렉터가 정한다 */
function FavCount({ n, label }: { n: number; label: string }) {
  if (!n) return null
  return (
    <span className={styles.favCount} aria-label={label}>
      <Icon name="star" stroke={1.5} />
      {n}
    </span>
  )
}

/** 창 안의 해제 ✕. 누르기 · Enter가 슬롯 선택으로 번지지 않게 전파를 막는다 */
function ClearX({ label, small = false, onClear }: { label: string; small?: boolean; onClear: () => void }) {
  return (
    <button
      type="button"
      className={[btn.clearX, styles.clearBtn, small && styles.clearBtnSmall].filter(Boolean).join(' ')}
      onClick={(e) => {
        e.stopPropagation()
        onClear()
      }}
      onKeyDown={(e) => e.stopPropagation()}
      aria-label={`${label} ${copy.clear}`}
      title={copy.clear}
      data-part="picker-clear"
    >
      <Icon name="x" stroke={2.4} />
    </button>
  )
}

/**
 * 선택 창(SES 방식). 스트라타젬 창과 개인 장비 창은 따로지만 구조는 같다:
 * 위에 대상 슬롯 줄(현재 대상 강조, 눌러서 전환) → 종류 탭 → 검색 → 카드 격자.
 * 대상은 "칸" 단위: 찬 칸을 누르고 고르면 교체, 빈 칸이면 채움. 고른 뒤에는 다음 빈 칸으로 자동 이동하고, 빈 칸이 없어도 창은 그대로(닫기는 사용자가).
 * 타일 · 칸의 ✕로 창 안에서 해제할 수 있다.
 * 보유 채권 필터는 숨기지 않고 순서 · 농도로: 미보유 채권 · (설정에서 뺀) 슈퍼 스토어는 각 묶음 뒤쪽에 흐리게.
 * 즐겨찾기는 허가서 종족 기준: 카드 오른쪽 아래 별로 넣고 빼며, 전체 탭 맨 위에 따로 모이고 각 묶음 안에서도 맨 앞(종족색 띠)에 온다.
 * 스트라타젬 창의 슬롯 이름 옆 트레이로 칸 수(1~4)를 바꾼다. 빌더 캡션의 트레이와 같은 값이다.
 */
export default function PickerModal({ target, onTarget, onClose }: Props) {
  const { index, warbondById } = useGameData()
  const settings = useStore((s) => s.settings)
  const draft = useStore((s) => s.draft)
  const setPool = useStore((s) => s.setPool)
  const setPoolSize = useStore((s) => s.setPoolSize)
  const setGear = useStore((s) => s.setGear)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const name = useItemName()
  const backdrop = useModal(onClose)
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<string>('all')

  // 장비 슬롯이 바뀌면 소분류 탭과 검색어를 비운다(주무기 검색어가 보조무기 목록을 비워 버리지 않게).
  // 스트라타젬은 슬롯이 바뀌어도 종류 탭 · 검색어를 유지한다(같은 목록에서 이어 고르는 경우가 많다)
  const gearSlot = target.kind === 'gear' ? target.slot : null
  useEffect(() => {
    setTab('all')
    if (gearSlot) setQ('')
  }, [target.kind, gearSlot])

  const kind = target.kind === 'gear' ? target.slot : 'stratagem'
  const base = index.byKind[kind]
  const unowned = useMemo(() => new Set(settings.unownedWarbonds), [settings.unownedWarbonds])
  const inPools = useMemo(() => new Set(draft?.pools.flat() ?? []), [draft])
  const sizes: PoolSizes = draft ? sizesOf(draft) : [1, 1, 1, 1]

  const unownedReason = (it: Item): string | null => {
    if (it.source === 'warbond') return it.warbondId && unowned.has(it.warbondId) ? copy.pickerUnowned : null
    if (it.source === 'superstore') return settings.includeSuperstore ? null : copy.pickerStoreOff
    return null
  }
  const ownedFirst = (items: Item[]) => [...items.filter((i) => !unownedReason(i)), ...items.filter((i) => unownedReason(i))]
  // 즐겨찾기: 허가서 종족의 목록. 각 묶음 안에서는 즐겨찾기 → 보유 → 미보유 순
  const race = raceInfo(draft?.race ?? 'all')
  const raceName = raceLabel(race)
  const favSet = useMemo(() => new Set(settings.favorites[race.id]), [settings.favorites, race.id])
  // 별을 누르면 그 카드가 즐겨찾기 자리로 옮겨 가고 위 묶음 높이도 바뀐다. 누른 카드가 화면에서 같은 높이에 남도록
  // 바뀐 직후 그만큼 목록을 스크롤하고, 옮겨 간 카드를 잠깐 깜빡여 눈이 따라가게 한다.
  // 즐겨찾기 묶음에서 별을 꺼 그 카드가 사라졌으면 맞추지 않는다(다음 즐겨찾기가 그 자리로 당겨진다)
  const bodyRef = useRef<HTMLDivElement>(null)
  const anchor = useRef<{ key: string; top: number } | null>(null)
  useLayoutEffect(() => {
    const a = anchor.current
    const body = bodyRef.current
    anchor.current = null
    if (!a || !body) return
    const el = body.querySelector<HTMLElement>(`[data-anchor="${CSS.escape(a.key)}"]`)
    if (!el) return
    body.scrollTop += el.getBoundingClientRect().top - a.top
    el.classList.remove(styles.moved)
    void el.offsetWidth
    el.classList.add(styles.moved)
  }, [favSet])
  const favs = base.filter((i) => favSet.has(i.id))
  const countFav = (items: Item[]) => items.filter((i) => favSet.has(i.id)).length
  const arrange = (items: Item[]) => favoritesFirst(ownedFirst(items), favSet)
  // 새로 들어온 아이템: 카드에 NEW, 그 아이템이 든 탭(전체 포함)에 점
  const fresh = useMemo(() => new Set(base.filter((i) => isNewItem(i)).map((i) => i.id)), [base])
  const tabOf = (it: Item) => (kind === 'stratagem' ? it.stratType : kind === 'armor' ? it.armorClass : it.weaponType)
  const freshTabs = new Set(base.filter((i) => fresh.has(i.id)).flatMap((i) => ['all', tabOf(i)]))

  const tabs: { id: string; label: string }[] =
    kind === 'stratagem'
      ? [{ id: 'all', label: copy.all }, ...STRAT_TYPE_ORDER.filter((t) => index.stratByType.has(t)).map((t) => ({ id: t, label: STRAT_TYPE_LABEL[t] }))]
      : kind === 'armor'
        ? [{ id: 'all', label: copy.all }, ...(['light', 'medium', 'heavy'] as const).map((c) => ({ id: c, label: ARMOR_CLASS_LABEL[c] }))]
        : [{ id: 'all', label: copy.all }, ...[...new Set(base.map((i) => i.weaponType).filter(Boolean))].map((w) => ({ id: w!, label: weaponTypeLabel(w!) }))]

  const list = base.filter((it) => {
    if (tab !== 'all') {
      if (kind === 'stratagem' && it.stratType !== (tab as StratType)) return false
      if (kind === 'armor' && it.armorClass !== tab) return false
      if (kind !== 'stratagem' && kind !== 'armor' && it.weaponType !== tab) return false
    }
    if (q) {
      const s = q.toLowerCase()
      if (!it.nameKo.toLowerCase().includes(s) && !it.nameEn.toLowerCase().includes(s)) return false
    }
    return true
  })
  // 전체 탭 맨 위의 즐겨찾기 묶음. 아직 없으면 별 안내를 보이고, 검색 중에 맞는 즐겨찾기가 없으면 숨긴다
  const favList = ownedFirst(list.filter((i) => favSet.has(i.id)))
  const showFav = showFavoriteGroup(tab, favList.length, favs.length, !!q)
  const groups: { key: string; label: string | null; items: Item[] }[] =
    kind === 'stratagem' && tab === 'all'
      ? STRAT_TYPE_ORDER.map((t) => ({ key: t, label: STRAT_TYPE_LABEL[t], items: arrange(list.filter((i) => i.stratType === t)) })).filter((g) => g.items.length)
      : [{ key: 'flat', label: showFav ? KIND_LABEL[kind] : null, items: arrange(list) }]

  /** 고르기: 대상 칸을 채우거나 교체하고 다음 빈 칸으로. 빈 칸이 없으면 그 자리에 머문다(창은 닫지 않음) */
  const pick = (item: Item) => {
    if (!draft) return
    if (target.kind === 'pool') {
      const i = target.slotIndex
      setPool(i, placeInPool(draft.pools[i], target.cell, item.id))
      const d = useStore.getState().draft!
      const next = nextPoolTarget(d.pools, sizesOf(d), i)
      if (next) onTarget({ kind: 'pool', ...next })
    } else {
      setGear(target.slot, item.id)
      const next = nextGearTarget(useStore.getState().draft!.gear, target.slot)
      if (next) onTarget({ kind: 'gear', slot: next })
    }
  }

  /** 칸 수 바꾸기: 늘리면 그 슬롯의 첫 빈 칸이 바로 대상, 줄이면 대상 칸을 남은 범위로 */
  const resize = (i: number, size: PoolSize) => {
    if (!draft || target.kind !== 'pool') return
    const grew = size > sizes[i]
    setPoolSize(i, size)
    const d = useStore.getState().draft!
    onTarget({ kind: 'pool', ...targetAfterResize(d.pools, sizesOf(d), i, { slotIndex: target.slotIndex, cell: target.cell }, grew) })
  }

  /** 해제(창 안 ✕): 후보를 빼면 뒤 칸이 앞으로 당겨지므로 대상은 첫 빈 칸으로 */
  const clearPoolCell = (i: number, k: number) => {
    if (!draft) return
    const { pool, cell } = removeFromPool(draft.pools[i], k)
    setPool(i, pool)
    onTarget({ kind: 'pool', slotIndex: i, cell })
  }
  const clearGear = (s: GearSlot) => {
    setGear(s, null)
    onTarget({ kind: 'gear', slot: s })
  }

  const shape = kind === 'armor' ? 'torso' : kind === 'stratagem' || kind === 'throwable' ? 'square' : 'wide'
  const currentGear = target.kind === 'gear' ? draft?.gear[target.slot] ?? null : null
  const title = target.kind === 'pool' ? copy.pickerStratTitle : copy.pickerGearTitle

  /** group = 이 카드가 든 묶음 키. 같은 아이템이 즐겨찾기 묶음과 원래 묶음에 함께 보이므로 별 위치 맞춤에서 둘을 가른다 */
  const card = (it: Item, sub: string, group: string) => {
    // 다른 칸에 이미 있으면 비활성. 대상 칸에 든 것은 "현재"
    const inTargetCell = target.kind === 'pool' && draft?.pools[target.slotIndex][target.cell] === it.id
    const dup = target.kind === 'pool' && inPools.has(it.id) && !inTargetCell
    const current = inTargetCell || (target.kind === 'gear' && currentGear === it.id)
    const reason = unownedReason(it)
    const fav = favSet.has(it.id)
    return (
      <div key={it.id} className={styles.cardWrap} data-anchor={`${group}:${it.id}`}>
        <button
          type="button"
          className={[styles.card, dup && styles.cardDup, current && styles.cardCurrent, reason && styles.cardUnowned, fav && styles.cardFav].filter(Boolean).join(' ')}
          disabled={dup || current}
          onClick={() => pick(it)}
          data-part="card"
          data-unowned={reason ? '' : undefined}
        >
          {fresh.has(it.id) && <NewBadge className={styles.cardNew} />}
          {reason && <span className={styles.cardTag}>{reason}</span>}
          {current && <span className={[styles.cardTag, styles.cardTagCurrent].join(' ')}>{copy.pickerCurrent}</span>}
          <Tile item={it} size="card" shape={shape} />
          <span className={styles.cardName}>{name(it)}</span>
          <small className={styles.cardSub}>{sub}</small>
        </button>
        {/* 별은 카드 밖 형제 버튼: 고를 수 없는 카드(현재 · 다른 칸)에서도 넣고 뺄 수 있다 */}
        <button
          type="button"
          className={[styles.star, fav && styles.starOn].filter(Boolean).join(' ')}
          aria-pressed={fav}
          aria-label={fav ? copy.favRemove(raceName) : copy.favAdd(raceName)}
          title={fav ? copy.favRemove(raceName) : copy.favAdd(raceName)}
          onClick={(e) => {
            const wrap = e.currentTarget.closest<HTMLElement>('[data-anchor]')
            if (wrap) anchor.current = { key: wrap.dataset.anchor!, top: wrap.getBoundingClientRect().top }
            toggleFavorite(race.id, it.id)
          }}
          data-part="fav-star"
        >
          <Icon name="star" stroke={1.5} />
        </button>
      </div>
    )
  }
  // 즐겨찾기 묶음의 카드 아래: 종류가 섞이므로 스트라타젬 종류 · 장비 분류를 적는다
  const favSub = (it: Item) => (it.stratType ? STRAT_TYPE_LABEL[it.stratType] : gearCaption(it))

  return (
    <div className={styles.backdrop} {...backdrop}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={title} data-part="modal" style={{ '--rc': `var(--race-${race.id})` } as React.CSSProperties}>
        <header className={styles.hd}>
          <h2>{title}</h2>
          <input className={styles.search} value={q} onChange={(e) => setQ(e.target.value)} placeholder={copy.searchPlaceholder} autoFocus />
          <span className={styles.favChip} title={copy.favCount(raceName, favs.length)} aria-label={copy.favCount(raceName, favs.length)} data-part="fav-chip">
            <Icon name="star" stroke={1.5} />
            <span className={styles.favChipLabel}>
              {raceName} {copy.favorites}
            </span>
            <b>{favs.length}</b>
          </span>
          <button className={styles.close} onClick={onClose} aria-label={copy.close}>
            <Icon name="x" stroke={2} />
          </button>
        </header>

        {/* 대상 슬롯 줄(SES처럼): 가운데 모은 정사각 큰 타일 4개 + 아래 이름 · 부제. 현재 대상은 노란 테두리와 점 */}
        {target.kind === 'pool' && draft && (
          <div className={styles.slots} role="tablist" aria-label={copy.pickerStratTitle} data-part="picker-slots">
            {draft.pools.map((pool, i) => {
              const on = target.slotIndex === i
              const size = sizes[i]
              const cells = Array.from({ length: size }, (_, k) => pool[k] ?? null)
              const first = pool[0] ? index.byId.get(pool[0]) ?? null : null
              const slotTitle = pool.length === 0 ? copy.emptyCell : pool.length === 1 ? (first ? name(first) : copy.deletedItem) : copy.pickOf(pool.length)
              // 슬롯 자체를 누르면 첫 빈 칸(없으면 첫 칸)이 대상
              const defaultCell = firstEmptyCell(pool, size) ?? 0
              const targetCell = (c: number) => onTarget({ kind: 'pool', slotIndex: i, cell: cellTarget(pool, c) })
              return (
                <div key={i} role="tab" tabIndex={0} aria-selected={on} className={[styles.slot, on && styles.slotOn].filter(Boolean).join(' ')} onClick={() => targetCell(defaultCell)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && targetCell(defaultCell)}>
                  <span className={styles.slotTop}>
                    <span className={styles.slotLbl}>{copy.slotN(i + 1)}</span>
                    <PoolSizeTray large slotIndex={i} size={size} onChange={(n) => resize(i, n)} className={styles.slotTray} />
                  </span>
                  <span className={[styles.sq, size > 1 && styles.sqGrid, pool.length === 0 && styles.sqEmpty].filter(Boolean).join(' ')}>
                    {size === 1 ? (
                      pool[0] ? (
                        <>
                          {first ? <img src={assetUrl(first.card)} alt="" /> : <span className={styles.sqHint}>{copy.deletedItem}</span>}
                          <ClearX label={first ? name(first) : copy.deletedItem} onClear={() => clearPoolCell(i, 0)} />
                        </>
                      ) : (
                        <span className={styles.sqHint}>{copy.emptyCell}</span>
                      )
                    ) : (
                      cells.map((id, k) => {
                        const it = id ? index.byId.get(id) ?? null : null
                        const label = it ? name(it) : id ? copy.deletedItem : ''
                        const cellOn = on && target.cell === k
                        return (
                          <span key={k} className={styles.cellWrap}>
                            <button
                              type="button"
                              className={[styles.cell, !id && styles.cellEmpty, id && !it && styles.cellMissing, cellOn && styles.cellOn].filter(Boolean).join(' ')}
                              onClick={(e) => {
                                e.stopPropagation()
                                targetCell(k)
                              }}
                              aria-label={`${copy.slotN(i + 1)} ${k + 1}${label ? ` ${label}` : ''}`}
                              title={id && !it ? copy.deletedItem : undefined}
                              data-part="picker-cell"
                            >
                              {it ? <img src={assetUrl(it.card)} alt="" /> : id ? <span className={styles.cellMissingMark}>?</span> : null}
                            </button>
                            {id && <ClearX small label={label} onClear={() => clearPoolCell(i, k)} />}
                          </span>
                        )
                      })
                    )}
                  </span>
                  <b className={styles.slotName}>{slotTitle}</b>
                  <small className={styles.slotSub}>
                    {pool.length}/{size}
                    {on && pool[target.cell] ? ` · ${copy.pickerReplace}` : ''}
                  </small>
                  {on && <i className={styles.slotDot} aria-hidden />}
                </div>
              )
            })}
          </div>
        )}
        {target.kind === 'gear' && draft && (
          <div className={styles.slots} role="tablist" aria-label={copy.pickerGearTitle} data-part="picker-slots">
            {GEAR_ORDER.map((s) => {
              const on = target.slot === s
              const id = draft.gear[s]
              const it = id ? index.byId.get(id) ?? null : null
              const sub = it ? gearCaption(it) : ''
              const go = () => onTarget({ kind: 'gear', slot: s })
              return (
                <div key={s} role="tab" tabIndex={0} aria-selected={on} className={[styles.slot, on && styles.slotOn].filter(Boolean).join(' ')} onClick={go} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && go()}>
                  <span className={styles.slotLbl}>{KIND_LABEL[s]}</span>
                  <span className={[styles.sq, s === 'armor' && it && styles.sqArmor, !id && styles.sqEmpty].filter(Boolean).join(' ')}>
                    {id ? (
                      <>
                        {it ? <img src={assetUrl(it.card)} alt="" /> : <span className={styles.sqHint}>{copy.deletedItem}</span>}
                        <ClearX label={KIND_LABEL[s]} onClear={() => clearGear(s)} />
                      </>
                    ) : (
                      <span className={styles.sqHint}>{copy.emptyCell}</span>
                    )}
                  </span>
                  <b className={styles.slotName}>{it ? name(it) : id ? copy.deletedItem : copy.emptyCell}</b>
                  <small className={styles.slotSub}>{on && id ? `${sub ? `${sub} · ` : ''}${copy.pickerReplace}` : sub}</small>
                  {on && <i className={styles.slotDot} aria-hidden />}
                </div>
              )
            })}
          </div>
        )}

        <div className={styles.tabs} role="tablist">
          {tabs.map((t) => {
            const nFav = t.id === 'all' ? 0 : countFav(base.filter((i) => tabOf(i) === t.id))
            return (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={[styles.tab, tab === t.id && styles.tabOn].filter(Boolean).join(' ')} onClick={() => setTab(t.id)}>
                {t.label}
                {freshTabs.has(t.id) && <span className={styles.tabNew} role="img" aria-label={copy.pickerNewHint} title={copy.pickerNewHint} />}
                <FavCount n={nFav} label={copy.favCount(raceName, nFav)} />
              </button>
            )
          })}
        </div>

        <div className={styles.body} ref={bodyRef}>
          {showFav && (
            <section className={styles.group} data-part="picker-fav">
              <h3 className={[styles.groupTitle, styles.favTitle].join(' ')} data-part="picker-group">
                <span className={styles.favStar}>
                  <Icon name="star" stroke={1.5} />
                </span>
                {copy.favorites}
                <span className={styles.raceChip}>
                  <i aria-hidden />
                  {raceName}
                </span>
                <small>{favList.length}</small>
              </h3>
              <div className={styles.grid}>
                {favList.length ? (
                  favList.map((it) => card(it, favSub(it), 'fav'))
                ) : (
                  <p className={styles.favHint}>
                    <Icon name="star" stroke={1.5} />
                    {copy.favHint(raceName)}
                  </p>
                )}
              </div>
            </section>
          )}
          {groups.map((g) => {
            const nFav = countFav(g.items)
            return (
              <section key={g.key} className={styles.group}>
                {g.label && (
                  <h3 className={styles.groupTitle} data-part="picker-group">
                    {g.label} <small>{g.items.length}</small>
                    <FavCount n={nFav} label={copy.favCount(raceName, nFav)} />
                  </h3>
                )}
                <div className={styles.grid}>{g.items.map((it) => card(it, acquireLabel(it, warbondById), g.key))}</div>
              </section>
            )
          })}
          {list.length === 0 && <p className={styles.none}>{copy.pickerNone}</p>}
        </div>
      </div>
    </div>
  )
}
