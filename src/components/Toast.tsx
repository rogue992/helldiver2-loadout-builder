import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { copy, slogans } from '../copy/ko'
import styles from './Toast.module.css'

interface Toast {
  id: number
  message: string
  slogan: string
  serial: string
  action?: { label: string; onClick: () => void }
}

interface ToastApi {
  notify: (message: string, action?: Toast['action']) => void
}

const Ctx = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('ToastProvider 밖')
  return v
}

function serial(): string {
  const d = new Date()
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `SE-${ymd}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`
}

/** 수호부 통지문 형태의 토스트. 랜덤 선전 문구 1줄 포함. 되돌리기 같은 액션은 토스트가 떠 있는 동안만 누를 수 있다. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([])
  const seq = useRef(0)
  const notify = useCallback((message: string, action?: Toast['action']) => {
    const id = ++seq.current
    const t: Toast = { id, message, slogan: slogans[Math.floor(Math.random() * slogans.length)], serial: serial(), action }
    setList((l) => [...l, t])
    setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 5000)
  }, [])
  const api = useMemo(() => ({ notify }), [notify])
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className={styles.wrap} aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={styles.notice} data-part="notice">
            <div className={styles.hd}>
              <span>{copy.noticeTitle}</span>
              <span>No. {t.serial}</span>
            </div>
            <div className={styles.body}>{t.message}</div>
            <div className={styles.slogan}>{t.slogan}</div>
            {t.action && (
              <button
                className={styles.action}
                onClick={() => {
                  t.action!.onClick()
                  setList((l) => l.filter((x) => x.id !== t.id))
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
