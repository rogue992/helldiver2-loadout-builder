import { useEffect, useMemo, useRef, useState } from 'react'
import { loadGameData, type GameData } from './data/loadData'
import { GameDataProvider, useGameData } from './data/GameDataContext'
import { hadSavedState, useStore, subscribeCrossTab } from './store/useStore'
import { isDefaultLoadout, loadoutLabel } from './store/defaults'
import type { Loadout, Settings } from './store/types'
import type { LoadoutRace } from './data/factions'
import { displayStamp, evaluate, stampState } from './rules/warnings'
import { changedParts } from './rules/changes'
import { latestWarbond, noticeDecision, readSeenNotice, writeSeenNotice } from './data/notice'
import type { Warbond } from './data/types'
import { buildExport, downloadJson, fileStamp, importedSettings, loadBackup, parseImport, pickFile, saveBackup } from './share/json'
import { exportElementPng } from './export/image'
import { copy, setLang } from './copy'
import Loading from './components/Loading'
import TopBar from './components/TopBar'
import Broadcast from './components/Broadcast'
import SettingsPanel from './components/SettingsPanel'
import Sidebar from './components/Sidebar'
import Builder from './components/Builder'
import Permit from './components/Permit'
import BriefingView from './components/BriefingView'
import ReeducationDialog from './components/ReeducationDialog'
import UnsavedDialog from './components/UnsavedDialog'
import WarbondNotice from './components/WarbondNotice'
import Credits from './components/Credits'
import VersionTag from './components/VersionTag'
import { ToastProvider, useToast } from './components/Toast'
import { useModal } from './components/useModal'
import styles from './App.module.css'

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: GameData }

export default function App() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const theme = useStore((s) => s.settings.theme)
  const lang = useStore((s) => s.settings.nameDisplay)
  const applyAliases = useStore((s) => s.applyAliases)
  // 그리기 전에 화면 언어를 맞춘다. 아래의 모든 문구 · 라벨 · 이름이 그리는 순간 이 값을 읽는다
  setLang(lang)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = copy.appName
  }, [lang])
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
        {/* 언어가 바뀌면 화면 전체를 새 언어로 다시 그린다(문구를 기억해 둔 곳이 남지 않게) */}
        <Shell key={lang} />
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
  const assignRace = useStore((s) => s.assignRace)
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
  // 신규 채권 공고. 최신 채권을 이 브라우저에서 처음 볼 때 한 번(auto), 설정에서 다시 열 수 있다(replay)
  const [notice, setNotice] = useState<{ warbond: Warbond; mode: 'auto' | 'replay' } | null>(null)
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

  // 처음 보는 최신 채권이면 공고를 띄운다. 브리핑 뷰로 바로 열린 경우(세컨드 모니터 등)는 다음 방문으로 미룬다
  useEffect(() => {
    const latest = latestWarbond(data.warbonds)
    if (!latest || location.hash.startsWith('#/briefing')) return
    const decision = noticeDecision(latest.id, readSeenNotice(), hadSavedState)
    if (decision === 'show') setNotice({ warbond: latest, mode: 'auto' })
    else if (decision === 'mark') writeSeenNotice(latest.id)
  }, [data.warbonds])
  const showLatestNotice = () => {
    const latest = latestWarbond(data.warbonds)
    if (latest) setNotice({ warbond: latest, mode: 'replay' })
  }
  const closeNotice = () => {
    if (notice) writeSeenNotice(notice.warbond.id)
    setNotice(null)
  }

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

  /**
   * 저장 안 한 편집이 있으면 확인을 거친다. 전선 미지정 허가서는 아직 발급 전이라 묻지 않고 버린다.
   * 수정 표시가 있어도 저장본과 실제로 다른 곳이 없으면(고쳤다 되돌림 등) 묻지 않는다. 저장본이 없는 초안은 묻는다.
   */
  const guard = (p: Pending) => {
    const { draft: d, loadouts: list } = useStore.getState()
    const saved = d ? list.find((l) => l.id === d.id) : undefined
    const changed = !!d?.dirty && !d.needsRace && (!saved || changedParts(d, saved).length > 0)
    if (changed) setPending(p)
    else run(p)
  }
  const run = (p: Pending) => {
    setPending(null)
    if (p.kind === 'open') openLoadout(p.id)
    else if (p.kind === 'new') startNew()
    else if (p.kind === 'replace') {
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
  /** 확인 창의 저장 후 이동 · 발급: 저장 버튼과 같이 저장(통지 포함)한 뒤 이어서 간다 */
  const saveThenRun = (p: Pending) => {
    if (!saveDraft()) return
    notify(copy.noticeSaved)
    run(p)
  }
  /** 전선 미지정 허가서에 종족을 정하면 목록에 발급된다 */
  const onAssignRace = (race: LoadoutRace) => {
    if (assignRace(race)) notify(copy.noticeCreated)
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
      const { fontFallback } = await exportElementPng(exportRef.current, `loadout-${loadoutLabel(draft)}-${fileStamp()}.png`)
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
    setPending({ kind: 'replace', loadouts: b.loadouts, settings: importedSettings(b, useStore.getState().settings, 'replace') })
  }

  const openTarget = pending?.kind === 'open' ? loadouts.find((l) => l.id === pending.id) : undefined

  return (
    <>
      {/* 상단 고정 영역: 진리부 방송(콘솔 테마) → 상단 바. 실제 높이를 재서 --chrome-h로 넘긴다(위 effect) */}
      <div className={styles.chrome} ref={chromeRef}>
        {theme === 'console' && <Broadcast theme="console" exemplary={stamp === 'approved'} />}
        <TopBar onOpenCredits={() => setCredits(true)} />
      </div>
      {ui.settingsOpen && <SettingsPanel onExport={onExport} onImport={onImport} onRestoreBackup={onRestoreBackup} onShowNotice={showLatestNotice} />}
      <div className={[styles.app, !ui.sidebarOpen && styles.folded].filter(Boolean).join(' ')}>
        {/* 왼쪽 서랍: 상단 바의 ☰ · "저장된 로드아웃" 머리와 같은 기둥으로 이어진다 */}
        <Sidebar onOpen={(id) => guard(id ? { kind: 'open', id } : { kind: 'new' })} onDuplicate={onDuplicateInList} onDelete={onDelete} />
        {/* 이미지 내보내기는 슬롯과 허가서를 함께 찍는다(허가서 버튼 줄은 data-export="skip"으로 빠진다) */}
        <div className={styles.content} ref={exportRef}>
          <main className={styles.main}>
            <Builder warnings={warnings} onAssignRace={onAssignRace} />
          </main>
          <Permit warnings={warnings} stamp={stamp} stampKey={stampKey} onSave={onSave} onDuplicate={onDuplicate} onExportImage={onExportImage} onBriefing={onBriefing} onDelete={onDelete} />
        </div>
      </div>
      <VersionTag />
      {credits && <Credits onClose={() => setCredits(false)} />}
      {notice && <WarbondNotice warbond={notice.warbond} mode={notice.mode} onClose={closeNotice} />}
      {briefing && <BriefingView loadout={briefing} onClose={() => (location.hash = '')} />}
      {pending?.kind === 'replace' && <ReeducationDialog body={copy.reeducationBody(copy.reeducationReplace)} onCancel={() => setPending(null)} onConfirm={() => run(pending)} />}
      {pending && pending.kind !== 'replace' && draft && (
        <UnsavedDialog
          draftName={loadoutLabel(draft).trim() || copy.untitledLoadout}
          targetName={pending.kind === 'open' ? (openTarget ? loadoutLabel(openTarget) : copy.untitledLoadout) : null}
          changes={changedParts(draft, loadouts.find((l) => l.id === draft.id))}
          onSave={() => saveThenRun(pending)}
          onDiscard={() => run(pending)}
          onCancel={() => setPending(null)}
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
            const s = importSettings ? importedSettings(importFile, useStore.getState().settings, 'merge') : undefined
            if (s) setSettings(s)
            notify(copy.noticeImported(importFile.loadouts.length))
            setImportFile(null)
          }}
          onReplace={() => {
            const f = importFile
            setImportFile(null)
            setPending({ kind: 'replace', loadouts: f.loadouts, settings: importSettings ? importedSettings(f, useStore.getState().settings, 'replace') : undefined })
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
          {copy.importSummary(file.loadouts.length, file.dataVersion, file.exportedAt.slice(0, 10))}
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
