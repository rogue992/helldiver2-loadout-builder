import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { assetUrl } from '../data/loadData'
import type { Item } from '../data/types'
import { useItemName } from '../data/useItemName'
import { copy } from '../copy/ko'
import styles from './Tile.module.css'

/** torso = 방어구 상체 확대(SES 방식: 같은 렌더를 cover로 크롭) */
type Shape = 'square' | 'wide' | 'tall' | 'fixed' | 'torso'
type Mark = 'none' | 'warn' | 'bad'

interface Props {
  item: Item | null
  /** 삭제된 아이템 id(데이터에서 사라진 경우) */
  missingId?: string
  shape?: Shape
  size?: 'icon' | 'card'
  mark?: Mark
  /** 있으면 <button>, 없으면 <span>(다른 버튼 안에 들어가는 경우) */
  onClick?: () => void
  className?: string
}

const LONG_PRESS_MS = 500

export function wikiUrl(item: Item): string {
  return `https://helldivers.wiki.gg/wiki/${encodeURIComponent(item.wikiPage.replace(/ /g, '_'))}`
}

/**
 * 아이템 타일. wiki 열기: 마우스는 우클릭, 터치 · 펜은 길게 누른 뒤 손을 뗄 때.
 * 터치에서 손을 떼는 순간이 브라우저가 새 창을 허용하는 사용자 동작이라, 타이머가 아니라 그때 연다.
 * 길게 누른 뒤 따라오는 click은 삼켜 부모 버튼(선택 창 열기 등)이 함께 눌리지 않게 한다.
 */
export default function Tile({ item, missingId, shape = 'square', size = 'icon', mark = 'none', onClick, className }: Props) {
  const name = useItemName()
  // 실패한 이미지 주소. 같은 칸에서 다른 아이템으로 바뀌면 새 주소라 다시 시도한다
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressType = useRef('')
  const longPressed = useRef(false)
  const swallowClick = useRef(false)

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  useEffect(() => clearTimer, [])

  const open = () => item && window.open(wikiUrl(item), '_blank', 'noopener')

  const onContextMenu = (e: MouseEvent) => {
    if (!item) return
    e.preventDefault()
    // 터치 길게 누르기에서도 contextmenu가 온다(안드로이드). 그쪽은 손을 뗄 때 연다
    if (pressType.current === 'touch' || pressType.current === 'pen') return
    open()
  }
  const onPointerDown = (e: PointerEvent) => {
    pressType.current = e.pointerType
    longPressed.current = false
    swallowClick.current = false
    clearTimer()
    if (!item || e.pointerType === 'mouse' || e.button !== 0) return
    timer.current = setTimeout(() => {
      longPressed.current = true
      timer.current = null
    }, LONG_PRESS_MS)
  }
  const onPointerUp = () => {
    clearTimer()
    if (longPressed.current) {
      longPressed.current = false
      swallowClick.current = true
      open()
    }
  }
  const cancelPress = () => {
    clearTimer()
    longPressed.current = false
  }
  const onTileClick = (e: MouseEvent) => {
    if (swallowClick.current) {
      swallowClick.current = false
      e.preventDefault()
      e.stopPropagation()
      return
    }
    onClick?.()
  }

  const label = item ? name(item) : missingId ? copy.deletedItem : ''
  const src = item ? assetUrl(size === 'card' ? item.card : item.icon) : null
  const broken = src !== null && brokenSrc === src
  const cls = [styles.tile, styles[shape], mark !== 'none' && styles[mark], !item && styles.missing, className].filter(Boolean).join(' ')
  const inner = (
    <>
      {item && src && !broken ? <img src={src} alt="" loading="lazy" onError={() => setBrokenSrc(src)} /> : <span className={styles.fallback}>{label}</span>}
      {mark !== 'none' && <i className={styles.dot} aria-hidden />}
    </>
  )
  const common = {
    className: cls,
    'data-part': 'tile',
    title: item ? `${label} · ${copy.wikiOpenHint}` : label,
    'aria-label': label,
    onContextMenu,
    onPointerDown,
    onPointerUp,
    onPointerLeave: cancelPress,
    onPointerCancel: cancelPress,
    onClick: onTileClick,
  }

  if (!onClick) {
    return (
      <span role="img" {...common}>
        {inner}
      </span>
    )
  }
  return (
    <button type="button" {...common}>
      {inner}
    </button>
  )
}
