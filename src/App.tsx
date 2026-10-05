import { useEffect, useMemo, useRef, useState } from 'react'
import { loadGameData, type GameData } from './data/loadData'
import { GameDataProvider, useGameData } from './data/GameDataContext'
import { useStore, subscribeCrossTab } from './store/useStore'
import { isDefaultLoadout } from './store/defaults'
import type { Loadout, Settings } from './store/types'
import { displayStamp, evaluate, stampState } from './rules/warnings'
import { buildExport, downloadJson, fileStamp, loadBackup, parseImport, pickFile, saveBackup } from './share/json'
import { exportElementPng } from './export/image'
import { copy } from './copy/ko'
import Loading from './components/Loading'
import TopBar from './components/TopBar'
import Broadcast from './components/Broadcast'
import SettingsPanel from './components/SettingsPanel'
import Sidebar from './components/Sidebar'
import Builder from './components/Builder'
import Permit from './components/Permit'
import BriefingView from './components/BriefingView'
import ReeducationDialog from './components/ReeducationDialog'
import Credits from './components/Credits'
import { ToastProvider, useToast } from './components/Toast'
import { useModal } from './components/useModal'
import styles from './App.module.css'

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: GameData }

export default function App() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const theme = useStore((s) => s.settings.theme)
  const applyAliases = useStore((s) => s.applyAliases)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  useEffect(() => subscribeCrossTab(), [])
  useEffect(() => {
    let alive = true
    setState({ status: 'loading' })
    loadGameData()
      .then((data) => {
        if (!alive) return
        applyAliases(data.aliases, new Set(data.warbonds.map((w) => w.id)))
        setState({ status: 'ready', data })
      })
      .catch((e: unknown) => alive && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }))
    return () => {
      alive = false
    }
  }, [attempt, applyAliases])

  if (state.status !== 'ready') return <Loading error={state.status === 'error' ? state.message : null} onRetry={() => setAttempt((a) => a + 1)} />
  return (
    <GameDataProvider value={state.data}>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </GameDataProvider>
  )
}

type Pending = { kind: 'open'; id: string } | { kind: 'new' } | { kind: 'replace'; loadouts: Loadout[]; settings?: Settings }

function Shell() {
  const data = useGameData()
  const settings = useStore((s) => s.settings)
  const theme = settings.theme
  const draft = useStore((s) => s.draft)
  const loadouts = useStore((s) => s.loadouts)
  const ui = useStore((s) => s.ui)
  const startNew = useStore((s) => s.startNew)
  const createLoadout = useStore((s) => s.createLoadout)
  const openLoadout = useStore((s) => s.openLoadout)
  const saveDraft = useStore((s) => s.saveDraft)
  const duplicateLoadout = useStore((s) => s.duplicateLoadout)
  const removeLoadout = useStore((s) => s.removeLoadout)
  const restoreLoadout = useStore((s) => s.restoreLoadout)
  const replaceAll = useStore((s) => s.replaceAll)
  const mergeLoadouts = useStore((s) => s.mergeLoadouts)
  const setSettings = useStore((s) => s.setSettings)
  const { notify } = useToast()
  const [stampKey, setStampKey] = useState(0)
  const [credits, setCredits] = useState(false)
  const [briefing, setBriefing] = useState<Loadout | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [importFile, setImportFile] = useState<ReturnType<typeof parseImport>>(null)
  const [importSettings, setImportSettings] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const chromeRef = useRef<HTMLDivElement>(null)

  // 상단 고정 영역(방송 띠 + 상단 바)의 실제 높이를 --chrome-h로. 테마 · 줄바꿈에 따라 달라져도 서랍 · 허가서 sticky 위치가 맞는다.
  useEffect(() => {
    const el = chromeRef.current
    if (!el) return
    const apply = () => document.documentElement.style.setProperty('--chrome-h', `${el.offsetHeight}px`)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const warnings = useMemo(() => (draft ? evaluate(draft, data.index, settings) : []), [draft, data.index, settings])
  const stamp = displayStamp(stampState(warnings), { locked: !!draft && isDefaultLoadout(draft.id), dirty: !!draft?.dirty })

  // 열린 허가서가 없으면: 목록 첫 항목을 열고, 목록도 비었으면 빈 허가서(목록 밖)로 시작.
  useEffect(() => {
    if (draft) return
    const first = [...loadouts].sort((a, b) => a.order - b.order)[0]
    if (first) openLoadout(first.id)
    else startNew()
  }, [draft, loadouts, openLoadout, startNew])

  // 해시 라우팅: #/briefing/{id|draft}
  useEffect(() => {
    const onHash = () => {
      const m = /^#\/briefing\/(.+)$/.exec(location.hash)
      if (m) {
        const target = m[1] === 'draft' ? useStore.getState().draft : useStore.getState().loadouts.find((l) => l.id === m[1])
        if (target) setBriefing(target)
        else history.replaceState(null, '', location.pathname)
      } else setBriefing(null)
    }
    window.addEventListener('hashchange', onHash)
    onHash()
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  /** dirty draft를 버리는 동작은 확인을 거친다. */
  const guard = (p: Pending) => {
    if (useStore.getState().draft?.dirty) setPending(p)
    else run(p)
  }
  const run = (p: Pending) => {
    setPending(null)
    if (p.kind === 'open') openLoadout(p.id)
    else if (p.kind === 'new') {
      createLoadout()
      notify(copy.noticeCreated)
    } else if (p.kind === 'replace') {
      const backup = buildExport(useStore.getState().loadouts, useStore.getState().settings, data.meta.version)
      saveBackup(backup)
      downloadJson(backup, 'hd2lb-backup')
      replaceAll(p.loadouts, p.settings)
      notify(copy.noticeImported(p.loadouts.length))
    }
  }

  const onSave = () => {
    const saved = saveDraft()
    if (!saved) return
    setStampKey((k) => k + 1)
    notify(copy.noticeSaved)
  }
  const onDuplicate = () => {
    // 기본 로드아웃은 저장할 것이 없으니(고정) 그대로 복제
    const cur = useStore.getState().draft
    if (!cur) return
    const saved = isDefaultLoadout(cur.id) ? cur : saveDraft()
    const dup = saved && duplicateLoadout(saved.id)
    if (dup) {
      openLoadout(dup.id)
      notify(copy.noticeDuplicated)
    }
  }
  /** 확인 없이 바로 지운다. 되돌리기는 목록 자리와, 열려 있었다면 저장 안 한 편집까지 그대로 돌려놓는다 */
  const onDelete = (id: string) => {
    const removed = removeLoadout(id)
    if (removed)
      notify(copy.noticeDeleted, {
        label: copy.undo,
        onClick: () => {
          restoreLoadout(removed)
          notify(copy.noticeRestored)
        },
      })
  }
  /** 목록 카드 메뉴의 복제: 열지 않고 바로 뒤에 복제본만 만든다(열린 초안은 그대로) */
  const onDuplicateInList = (id: string) => {
    if (duplicateLoadout(id)) notify(copy.noticeDuplicated)
  }
  const onExportImage = async () => {
    if (!exportRef.current || !draft) return
    try {
      const { fontFallback } = await exportElementPng(exportRef.current, `loadout-${draft.name}-${fileStamp()}.png`)
      notify(fontFallback ? copy.noticeFontFallback : copy.noticeImageSaved)
    } catch (e) {
      console.error(e)
      notify(copy.noticeImageFailed)
    }
  }
  const onBriefing = () => {
    if (draft) location.hash = '#/briefing/draft'
  }
  const onExport = () => downloadJson(buildExport(loadouts, settings, data.meta.version))
  const onImport = async () => {
    const text = await pickFile()
    if (text === null) return
    const file = parseImport(text)
    if (!file) {
      notify(copy.importInvalid)
      return
    }
    // "설정도 가져오기"는 파일마다 새로 고른다(지난번 체크가 남아 설정을 덮지 않게)
    setImportSettings(false)
    setImportFile(file)
  }
  const onRestoreBackup = () => {
    const b = loadBackup()
    if (!b) {
      notify(copy.noBackup)
      return
    }
    // 전체 교체라 초안 상태와 무관하게 항상 재교육 동의서를 거친다
    setPending({ kind: 'replace', loadouts: b.loadouts, settings: b.settings })
  }

  const pendingBody = pending?.kind === 'replace' ? copy.reeducationBody(copy.reeducationReplace) : copy.dirtyBody

  return (
    <>
      {/* 상단 고정 영역: 진리부 방송(콘솔 테마) → 상단 바. 실제 높이를 재서 --chrome-h로 넘긴다(위 effect) */}
      <div className={styles.chrome} ref={chromeRef}>
        {theme === 'console' && <Broadcast theme="console" exemplary={stamp === 'approved'} />}
        <TopBar onOpenCredits={() => setCredits(true)} />
      </div>
      {ui.settingsOpen && <SettingsPanel onExport={onExport} onImport={onImport} onRestoreBackup={onRestoreBackup} />}
      <div className={[styles.app, !ui.sidebarOpen && styles.folded].filter(Boolean).join(' ')}>
        {/* 왼쪽 서랍: 상단 바의 ☰ · "저장된 로드아웃" 머리와 같은 기둥으로 이어진다 */}
        <Sidebar onOpen={(id) => guard(id ? { kind: 'open', id } : { kind: 'new' })} onDuplicate={onDuplicateInList} onDelete={onDelete} />
        {/* 이미지 내보내기는 슬롯과 허가서를 함께 찍는다(허가서 버튼 줄은 data-export="skip"으로 빠진다) */}
        <div className={styles.content} ref={exportRef}>
          <main className={styles.main}>
            <Builder warnings={warnings} />
          </main>
          <Permit warnings={warnings} stamp={stamp} stampKey={stampKey} onSave={onSave} onDuplicate={onDuplicate} onExportImage={onExportImage} onBriefing={onBriefing} onDelete={onDelete} />
        </div>
      </div>
      {credits && <Credits onClose={() => setCredits(false)} />}
      {briefing && <BriefingView loadout={briefing} onClose={() => (location.hash = '')} />}
      {pending && (
        <ReeducationDialog
          title={pending.kind === 'replace' ? copy.reeducationTitle : copy.dirtyTitle}
          body={pendingBody}
          confirmLabel={pending.kind === 'replace' ? copy.agree : copy.discardAndContinue}
          cancelLabel={pending.kind === 'replace' ? undefined : copy.keepEditing}
          onCancel={() => setPending(null)}
          onConfirm={() => run(pending)}
        />
      )}
      {importFile && (
        <ImportDialog
          file={importFile}
          importSettings={importSettings}
          onImportSettings={setImportSettings}
          onClose={() => setImportFile(null)}
          onMerge={() => {
            // 병합은 열린 초안을 건드리지 않는다. 설정은 설정만 바꾼다
            mergeLoadouts(importFile.loadouts)
            if (importSettings && importFile.settings) setSettings(importFile.settings)
            notify(copy.noticeImported(importFile.loadouts.length))
            setImportFile(null)
          }}
          onReplace={() => {
            const f = importFile
            setImportFile(null)
            setPending({ kind: 'replace', loadouts: f.loadouts, settings: importSettings ? f.settings : undefined })
          }}
        />
      )}
    </>
  )
}

interface ImportDialogProps {
  file: NonNullable<ReturnType<typeof parseImport>>
  importSettings: boolean
  onImportSettings: (v: boolean) => void
  onClose: () => void
  onMerge: () => void
  onReplace: () => void
}

function ImportDialog({ file, importSettings, onImportSettings, onClose, onMerge, onReplace }: ImportDialogProps) {
  const backdrop = useModal(onClose)
  return (
    <div className={styles.importBackdrop} {...backdrop}>
      <div className={styles.importBox} role="dialog" aria-modal="true" aria-label={copy.importJson}>
        <h2>{copy.importJson}</h2>
        <p>
          {file.loadouts.length}건 · 데이터 {file.dataVersion} · {file.exportedAt.slice(0, 10)}
        </p>
        {file.settings && (
          <label className={styles.check}>
            <input type="checkbox" checked={importSettings} onChange={(e) => onImportSettings(e.target.checked)} /> {copy.importSettingsToo}
          </label>
        )}
        <div className={styles.importBtns}>
          <button onClick={onMerge}>{copy.importMerge}</button>
          <button onClick={onReplace}>{copy.importReplace}</button>
        </div>
      </div>
    </div>
  )
}
