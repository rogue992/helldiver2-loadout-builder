import { useEffect, useRef, useState } from 'react'
import { useGameData } from '../data/GameDataContext'
import { KIND_LABEL, SOURCE_LABEL, STRAT_TYPE_LABEL, WARBOND_TYPE_LABEL, gearCaption } from '../data/labels'
import { assetUrl } from '../data/loadData'
import { NEW_DAYS, isNewItem } from '../data/newness'
import { noticeItems } from '../data/notice'
import type { Item, Warbond } from '../data/types'
import { useItemName } from '../data/useItemName'
import { warbondColor } from '../data/warbondColors'
import { useStore } from '../store/useStore'
import { copy } from '../copy/ko'
import Icon from './Icon'
import NewBadge from './NewBadge'
import { useModal } from './useModal'
import styles from './WarbondNotice.module.css'

interface Props {
  warbond: Warbond
  /** auto = 처음 보는 최신 채권이라 저절로 뜬 것(닫으면 다음 채권 전까지 안 뜬다는 안내), replay = 설정에서 다시 연 것 */
  mode: 'auto' | 'replay'
  onClose: () => void
}

/** 닫힘 애니메이션 길이. CSS의 .closing과 맞춘다 */
const CLOSE_MS = 280

/**
 * 수호부 보급 공고: 표지 · 신규 발행 도장 · 채권 구성품 · 같은 날 들어온 다른 아이템 · 이 채권 보유 스위치.
 * 어떻게 닫아도(수령 확인 · ✕ · Esc · 바깥) 본 것으로 친다. 보유 스위치는 설정의 보유 채권 칩과 같은 값이다.
 */
export default function WarbondNotice({ warbond, mode, onClose }: Props) {
  const { index, warbondById } = useGameData()
  const name = useItemName()
  const owned = useStore((s) => !s.settings.unownedWarbonds.includes(warbond.id))
  const toggleUnowned = useStore((s) => s.toggleUnownedWarbond)
  const [closing, setClosing] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])
  const close = () => {
    if (closing) return
    setClosing(true)
    timer.current = setTimeout(onClose, CLOSE_MS)
  }
  const backdrop = useModal(close)

  const { bond, extras } = noticeItems(index.items, warbond.id)
  const fresh = bond.some((i) => isNewItem(i))
  const date = warbond.releaseDate.slice(0, 10).replaceAll('-', '.')

  const sub = (it: Item) => {
    const caption = it.kind === 'stratagem' ? (it.stratType ? STRAT_TYPE_LABEL[it.stratType] : '') : gearCaption(it)
    return caption ? `${KIND_LABEL[it.kind]} · ${caption}` : KIND_LABEL[it.kind]
  }
  // 함께 들어온 항목의 출처: 다른 채권이면 그 이름, 아니면 슈퍼 스토어 · 캠페인 등
  const source = (it: Item) => (it.source === 'warbond' && it.warbondId ? warbondById.get(it.warbondId)?.nameKo ?? '' : SOURCE_LABEL[it.source])
  const card = (it: Item, i: number, tag?: string) => (
    <li key={it.id} className={styles.card} style={{ '--i': i } as React.CSSProperties}>
      <div className={[styles.pic, it.kind === 'stratagem' && styles.picStrat].filter(Boolean).join(' ')}>
        {tag && <span className={styles.tag}>{tag}</span>}
        <img src={assetUrl(it.card)} alt="" loading="lazy" />
      </div>
      <b>{name(it)}</b>
      <small>{sub(it)}</small>
      {it.passive && (
        <span className={styles.passive}>
          <img src={assetUrl(it.passive.icon)} alt="" />
          {it.passive.nameKo}
        </span>
      )}
    </li>
  )

  return (
    <div className={[styles.backdrop, closing ? styles.closing : styles.run].join(' ')} {...backdrop}>
      <div className={styles.shell} role="dialog" aria-modal="true" aria-labelledby="warbond-notice-title" style={{ '--wb': warbondColor(warbond.id) } as React.CSSProperties} data-part="notice">
        <div className={styles.core}>
          <div className={styles.hazard} aria-hidden />

          <figure className={styles.art}>
            <img src={assetUrl(warbond.cover)} alt={copy.noticeCover(warbond.nameKo)} />
            <div className={styles.artTop}>
              <span className={[styles.eyebrow, styles.glass].join(' ')}>
                <i className={styles.beacon} aria-hidden />
                {copy.noticeEyebrow}
              </span>
              <button type="button" className={[styles.close, styles.glass].join(' ')} onClick={close} aria-label={copy.close}>
                <Icon name="x" stroke={1.8} />
              </button>
            </div>
            <figcaption className={styles.artTitle}>
              <h2 id="warbond-notice-title">{warbond.nameKo}</h2>
              <p>
                {warbond.nameEn} <span className={styles.type}>{WARBOND_TYPE_LABEL[warbond.type]}</span>
              </p>
            </figcaption>
            {/* 수호부 도장. 텔레타이프는 LED + 글자(theme/teletype.css) */}
            <div className={styles.stamp} aria-hidden data-part="notice-stamp">
              <i className={styles.led} />
              <b>{copy.noticeStamp}</b>
              <small>{copy.noticeStampSub(date)}</small>
            </div>
          </figure>

          <div className={styles.body}>
            <section className={[styles.shelf, !owned && styles.unowned].filter(Boolean).join(' ')}>
              <div className={styles.shelfHd}>
                <h3>{copy.noticeBond}</h3>
                <span className={styles.count}>{bond.length}</span>
                {fresh && (
                  <span className={styles.note}>
                    <NewBadge />
                    {copy.noticeNewNote(NEW_DAYS)}
                  </span>
                )}
              </div>
              <ul className={styles.cards}>{bond.map((it, i) => card(it, i))}</ul>
            </section>

            <div className={styles.row2}>
              {extras.length > 0 && (
                <section className={[styles.shelf, styles.extra].join(' ')}>
                  <div className={styles.shelfHd}>
                    <h3>{copy.noticeExtra}</h3>
                    <span className={styles.count}>{extras.length}</span>
                  </div>
                  <ul className={styles.cards}>{extras.map((it, i) => card(it, bond.length + i, source(it)))}</ul>
                </section>
              )}
              <div className={[styles.act, extras.length === 0 && styles.actWide].filter(Boolean).join(' ')}>
                <div className={styles.tray}>
                  <button type="button" className={styles.own} role="switch" aria-checked={owned} onClick={() => toggleUnowned(warbond.id)}>
                    <span className={styles.switch} aria-hidden />
                    <span className={styles.ownTxt}>
                      <b>{copy.noticeOwn}</b>
                      <small>{owned ? copy.noticeOwnOn : copy.noticeOwnOff}</small>
                    </span>
                  </button>
                  <button type="button" className={styles.cta} onClick={close} autoFocus>
                    {copy.noticeConfirm}
                    <span className={styles.ctaIc} aria-hidden>
                      <Icon name="arrow" stroke={1.8} />
                    </span>
                  </button>
                </div>
                {mode === 'auto' && <p className={styles.once}>{copy.noticeOnce}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
