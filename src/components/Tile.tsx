import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { assetUrl } from '../data/loadData'
import type { Item } from '../data/types'
import { useItemName } from '../data/useItemName'
import { copy } from '../copy'
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

export function wikiUrl(item: Item): string {
  return `https://helldivers.wiki.gg/wiki/${encodeURIComponent(item.wikiPage.replace(/ /g, '_'))}`
}

/** 아이템 타일. 마우스 우클릭으로 wiki를 연다. 터치의 길게 누르기(안드로이드는 contextmenu가 온다)로는 열지 않는다. */
export default function Tile({ item, missingId, shape = 'square', size = 'icon', mark = 'none', onClick, className }: Props) {
  const name = useItemName()
  // 실패한 이미지 주소. 같은 칸에서 다른 아이템으로 바뀌면 새 주소라 다시 시도한다
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null)
  const pressType = useRef('')

  const onContextMenu = (e: MouseEvent) => {
    if (!item) return
    e.preventDefault()
    if (pressType.current === 'touch' || pressType.current === 'pen') return
    window.open(wikiUrl(item), '_blank', 'noopener')
  }
  const onPointerDown = (e: PointerEvent) => {
    pressType.current = e.pointerType
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
    onClick,
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
