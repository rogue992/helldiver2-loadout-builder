import { copy } from '../copy/ko'
import styles from './Loading.module.css'

interface Props {
  error?: string | null
  onRetry?: () => void
}

/** 데이터 수신 중 화면. 실패하면 원인과 재시도 버튼(영구 대기 금지). */
export default function Loading({ error, onRetry }: Props) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite" data-part="loading">
      <div className={styles.seal}>SE</div>
      {error ? (
        <>
          <p className={styles.title}>{copy.loadError}</p>
          <p className={styles.err}>{error}</p>
          <button className={styles.retry} onClick={onRetry}>
            {copy.retry}
          </button>
        </>
      ) : (
        <>
          <p className={styles.title}>{copy.loading}</p>
          <div className={styles.bar} aria-hidden />
        </>
      )}
    </div>
  )
}
