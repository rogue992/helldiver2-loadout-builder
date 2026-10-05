import { useEffect, useMemo, useRef, useState } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useGameData } from '../data/GameDataContext'
import { factionName, raceInfo } from '../data/factions'
import { assetUrl } from '../data/loadData'
import { useStore } from '../store/useStore'
import { isDefaultLoadout } from '../store/defaults'
import type { Loadout, Settings } from '../store/types'
import { displayStamp, evaluate, stampState, type StampState } from '../rules/warnings'
import { copy } from '../copy/ko'
import Icon from './Icon'
import btn from './Buttons.module.css'
import styles from './Sidebar.module.css'

interface Props {
  onOpen: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

/**
 * 저장 목록: 종족·팩션 필터, 드래그 정렬, 클릭 → 열기(draft dirty면 확인은 상위에서).
 * 접기/펼치기는 상단 바의 ☰가 담당한다(접히면 이 컴포넌트는 렌더되지 않음).
 * 카드의 ⋯ 메뉴에 복제 · 삭제(확인 없이 바로, 되돌리기 토스트가 안전장치). 열기는 카드 자체를 누른다.
 */
export default function Sidebar({ onOpen, onDuplicate, onDelete }: Props) {
  const loadouts = useStore((s) => s.loadouts)
  const draft = useStore((s) => s.draft)
  const ui = useStore((s) => s.ui)
  const reorder = useStore((s) => s.reorder)
  const settings = useStore((s) => s.settings)
  const { index } = useGameData()
  // 열린 ⋯ 메뉴는 목록 전체에서 하나. 바깥을 누르거나 Esc면 닫힌다(메뉴 · ⋯ 안의 pointerdown은 전파를 막아 여기 오지 않음).
  const [menuFor, setMenuFor] = useState<string | null>(null)
  useEffect(() => {
    if (!menuFor) return
    const close = () => setMenuFor(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuFor(null)
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuFor])

  const list = useMemo(
    () =>
      [...loadouts]
        // 종족 무관('all') 로드아웃과 기본 로드아웃은 필터와 무관하게 항상 보인다
        .filter((l) => isDefaultLoadout(l.id) || l.race === 'all' || ((ui.race === 'all' || l.race === ui.race) && (ui.faction === 'all' || l.faction === ui.faction)))
        .sort((a, b) => a.order - b.order),
    [loadouts, ui.race, ui.faction],
  )
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const ids = list.map((l) => l.id)
    reorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }

  if (!ui.sidebarOpen) return null

  return (
    <aside className={styles.side} data-part="sidebar" aria-label={copy.savedLoadouts}>
      <div className={styles.list}>
        {list.length === 0 && <p className={styles.empty}>{copy.emptyList}</p>}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={list.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            {list.map((l) => (
              <Row
                key={l.id}
                loadout={l}
                active={draft?.id === l.id}
                settings={settings}
                index={index}
                menuOpen={menuFor === l.id}
                onToggleMenu={() => setMenuFor((m) => (m === l.id ? null : l.id))}
                onOpen={() => onOpen(l.id)}
                onDuplicate={() => {
                  setMenuFor(null)
                  onDuplicate(l.id)
                }}
                onDelete={() => {
                  setMenuFor(null)
                  onDelete(l.id)
                }}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      <button className={[btn.pill, styles.new].join(' ')} onClick={() => onOpen('')}>
        {copy.newLoadout}
        <span className={[btn.pillIc, styles.newIc].join(' ')}>
          <Icon name="plus" stroke={1.9} />
        </span>
      </button>
    </aside>
  )
}

interface RowProps {
  loadout: Loadout
  active: boolean
  settings: Settings
  index: ReturnType<typeof useGameData>['index']
  menuOpen: boolean
  onToggleMenu: () => void
  onOpen: () => void
  onDuplicate: () => void
  onDelete: () => void
}

/** 복무 카드: 왼쪽 종족색 띠 · 이름 · 도장 뱃지 · 팩션 · 스트라타젬 4슬롯 첫 후보 · ⋯ 메뉴(복제 · 삭제). */
const MENU_W = 110
const BADGE: Partial<Record<StampState, { cls: string; label: string }>> = {
  treason: { cls: styles.badgeTreason, label: copy.stampTreasonShort },
  hold: { cls: styles.badgeHold, label: copy.stampHoldShort },
  approved: { cls: styles.badgeOk, label: copy.stampApprovedShort },
}
const MENU_H = 76

function Row({ loadout: l, active, settings, index, menuOpen: menu, onToggleMenu, onOpen, onDuplicate, onDelete }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: l.id })
  // 저장본이라 dirty는 없다. 기본 로드아웃은 항상 승인
  const stamp = useMemo(() => displayStamp(stampState(evaluate(l, index, settings)), { locked: isDefaultLoadout(l.id), dirty: false }), [l, index, settings])
  const thumbs = l.pools.map((p) => p[0] ?? null)
  const badge = BADGE[stamp]
  const moreRef = useRef<HTMLButtonElement>(null)
  // 메뉴는 viewport 기준 고정 위치로 띄운다: 목록 스크롤 영역을 늘리지 않고, 아래 공간이 없으면 위로 펼친다.
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const openMenu = () => {
    const r = moreRef.current?.getBoundingClientRect()
    if (r) {
      const below = r.bottom + 4 + MENU_H <= window.innerHeight
      setPos({ top: below ? r.bottom + 4 : r.top - 4 - MENU_H, left: Math.max(4, r.right - MENU_W) })
    }
    onToggleMenu()
  }

  return (
    <div
      ref={setNodeRef}
      // 종족색 토큰 이름은 알려진 종족 id로만 만든다(raceInfo가 모르는 값은 전체로 돌린다)
      style={{ transform: CSS.Transform.toString(transform), transition, '--c': `var(--race-${raceInfo(l.race).id})` } as React.CSSProperties}
      className={[styles.item, active && styles.on, isDragging && styles.dragging, menu && styles.menuOpen].filter(Boolean).join(' ')}
      data-part="loadout-item"
    >
      <button className={styles.grip} {...attributes} {...listeners} aria-label={copy.dragHint}>
        <i aria-hidden />
      </button>
      {/* 이미 열린 카드를 다시 눌러도 아무 일 없다(편집 중이면 "버리고 계속" 확인이 뜨던 것을 막는다) */}
      <button className={styles.body} onClick={active ? undefined : onOpen} aria-current={active || undefined}>
        <span className={styles.t}>
          <span className={styles.nm}>{l.name}</span>
          {badge && <small className={[styles.badge, badge.cls].join(' ')}>{badge.label}</small>}
          <span className={styles.fac}>
            <i /> {factionName(l.race, l.faction)}
          </span>
        </span>
        <span className={styles.icons}>
          {thumbs.map((id, i) => {
            const it = id ? index.byId.get(id) : null
            return (
              <span key={i} className={[styles.thumb, !it && styles.thumbEmpty].filter(Boolean).join(' ')}>
                {it ? <img src={assetUrl(it.thumb)} alt="" loading="lazy" /> : null}
              </span>
            )
          })}
        </span>
      </button>
      <button ref={moreRef} className={styles.more} onClick={openMenu} onPointerDown={(e) => e.stopPropagation()} aria-haspopup="menu" aria-expanded={menu} aria-label={`${l.name} ${copy.menu}`}>
        ⋯
      </button>
      {menu && (
        <div className={styles.menu} role="menu" style={{ top: pos.top, left: pos.left, width: MENU_W }} onPointerDown={(e) => e.stopPropagation()} data-part="loadout-menu">
          <button role="menuitem" onClick={onDuplicate}>
            {copy.duplicate}
          </button>
          {!isDefaultLoadout(l.id) && (
            <button role="menuitem" className={styles.menuDanger} onClick={onDelete}>
              {copy.menuDelete}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
