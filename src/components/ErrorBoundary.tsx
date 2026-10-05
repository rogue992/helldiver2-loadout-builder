import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useStore } from '../store/useStore'
import { sanitizeLoadouts, sanitizeSettings } from '../store/sanitize'
import { STORAGE_KEY } from '../store/types'
import { buildExport, downloadJson, downloadText, fileStamp } from '../share/json'
import { copy } from '../copy/ko'
import styles from './Loading.module.css'

interface State {
  error: Error | null
}

/**
 * 렌더 예외의 마지막 방어선. 화면 전체가 비는 대신 복구 수단 두 가지를 보인다:
 * 편집 중인 초안을 버리고 다시 열기, 저장 기록을 가져오기 형식 파일로 내려받기.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  private discardDraft = () => {
    useStore.setState({ draft: null })
    location.reload()
  }

  private downloadRecords = () => {
    const raw = localStorage.getItem(STORAGE_KEY) ?? ''
    try {
      const st = (JSON.parse(raw) as { state?: Record<string, unknown> }).state ?? {}
      downloadJson(buildExport(sanitizeLoadouts(st.loadouts), sanitizeSettings(st.settings), ''), 'hd2lb-rescue')
    } catch {
      downloadText(raw, `hd2lb-rescue-raw-${fileStamp()}.json`)
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className={styles.wrap} role="alert" data-part="crash">
        <div className={styles.seal}>SE</div>
        <p className={styles.title}>{copy.crashTitle}</p>
        <p className={styles.err}>{copy.crashBody}</p>
        <button className={styles.retry} onClick={this.discardDraft}>
          {copy.crashDiscard}
        </button>
        <button className={styles.retry} onClick={this.downloadRecords}>
          {copy.crashBackup}
        </button>
      </div>
    )
  }
}
