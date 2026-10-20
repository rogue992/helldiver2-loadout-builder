import { copy } from '../copy'
import Icon from './Icon'
import btn from './Buttons.module.css'
import { useModal } from './useModal'
import styles from './UnsavedDialog.module.css'

/** 바꾼 곳은 이만큼까지 이름을 적고 나머지는 "외 N" */
const MAX_PARTS = 4

interface Props {
  /** 편집 중인 허가서 이름 */
  draftName: string
  /** 열려는 허가서 이름. 없으면 신규 배정 */
  targetName: string | null
  /** 저장본과 달라진 곳(이름 · 종족 · 슬롯 N · 장비) */
  changes: string[]
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

/**
 * 저장하지 않은 변경 확인: 저장 후 이동(기본, Enter) · 계속 작성(Esc) · 버리고 이동.
 * 기본 동작이 저장이라 재교육 동의서(빨강)가 아니라 노란 창이다. 신규 배정이면 "이동" 대신 "발급".
 */
export default function UnsavedDialog({ draftName, targetName, changes, onSave, onDiscard, onCancel }: Props) {
  const backdrop = useModal(onCancel)
  const isNew = targetName === null
  const shown = changes.slice(0, MAX_PARTS).join(' · ')
  const more = changes.length - MAX_PARTS
  return (
    <div className={styles.backdrop} {...backdrop}>
      <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-label={copy.dirtyTitle} data-part="dialog">
        <header className={styles.hd}>
          <h2>{copy.dirtyTitle}</h2>
          <button className={styles.close} onClick={onCancel} aria-label={copy.close}>
            <Icon name="x" stroke={2} />
          </button>
        </header>
        <p className={styles.body}>
          {/* 이름 앞 · 뒤 조각은 언어마다 다르다(한국어는 이름이 먼저, 영어는 "Save before opening <이름>?") */}
          {copy.dirtyLead[0]}
          <b>{draftName}</b>
          {copy.dirtyLead[1]}{' '}
          {isNew ? (
            copy.dirtyAskNew
          ) : (
            <>
              {copy.dirtyAskOpen[0]}
              <b>{targetName}</b>
              {copy.dirtyAskOpen[1]}
            </>
          )}
          {changes.length > 0 && <small>{copy.dirtyChanges(more > 0 ? `${shown} ${copy.dirtyMore(more)}` : shown)}</small>}
        </p>
        <div className={styles.btns}>
          <button className={styles.discard} onClick={onDiscard}>
            {isNew ? copy.discardAndNew : copy.discardAndOpen}
          </button>
          <span className={styles.gap} />
          <button className={styles.keep} onClick={onCancel}>
            {copy.keepEditing}
          </button>
          <button className={[btn.pill, styles.save].join(' ')} onClick={onSave} autoFocus>
            {isNew ? copy.saveAndNew : copy.saveAndOpen}
            <span className={[btn.pillIc, styles.ic].join(' ')}>
              <Icon name="arrow" stroke={1.8} />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
