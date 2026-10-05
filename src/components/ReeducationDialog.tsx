import { copy } from '../copy/ko'
import { useModal } from './useModal'
import styles from './ReeducationDialog.module.css'

interface Props {
  /** 다이얼로그 제목. 기본은 재교육 동의서 */
  title?: string
  body: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * 되돌리기 어려운 동작의 확인창: 허가서 초기화, 가져오기 교체 · 백업 복원(전체 교체), 편집 중인 초안 버리기.
 * 삭제는 확인 없이 바로 하고 토스트의 되돌리기가 안전장치라 여기를 거치지 않는다. 기본 버튼은 "동의합니다" 하나 + 닫기.
 */
export default function ReeducationDialog({ title = copy.reeducationTitle, body, confirmLabel = copy.agree, cancelLabel, onConfirm, onCancel }: Props) {
  const backdrop = useModal(onCancel)
  return (
    <div className={styles.backdrop} {...backdrop}>
      <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-label={title} data-part="dialog">
        <header className={styles.hd}>
          <h2>{title}</h2>
          <button className={styles.close} onClick={onCancel} aria-label={copy.close}>
            ✕
          </button>
        </header>
        <p className={styles.body}>{body}</p>
        <div className={styles.btns}>
          {cancelLabel && (
            <button className={styles.cancel} onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
          <button className={styles.confirm} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
