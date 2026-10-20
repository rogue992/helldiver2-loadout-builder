// JSON 내보내기 · 가져오기 · 백업. 들어오는 파일은 sanitize를 거친 값만 돌려준다.
import { sanitizeLoadout, sanitizeSettings } from '../store/sanitize'
import { BACKUP_KEY, type ExportFile, type Favorites, type Loadout, type Settings } from '../store/types'

/** 가져온 파일. 설정에 즐겨찾기가 있었는지도 함께 든다(즐겨찾기 기능 이전에 내보낸 파일에는 없다) */
export interface ParsedImport extends ExportFile {
  hasFavorites: boolean
}

export function buildExport(loadouts: Loadout[], settings: Settings | undefined, dataVersion: string): ExportFile {
  return { format: 'hd2lb', version: 1, exportedAt: new Date().toISOString(), dataVersion, loadouts, ...(settings ? { settings } : {}) }
}

/** 파일명용 로컬 시각 yyyymmdd-hhmmss */
export function fileStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

/** 자기 사이트(Pages)라 <a download>가 동작한다. 브라우저가 차단해도 예외는 나지 않는다. */
export function triggerDownload(href: string, fileName: string): void {
  const a = document.createElement('a')
  a.href = href
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function downloadText(text: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  triggerDownload(url, fileName)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadJson(file: ExportFile, prefix = 'hd2lb'): void {
  downloadText(JSON.stringify(file, null, 2), `${prefix}-${fileStamp()}.json`)
}

/** 형식이 맞지 않거나 식별할 수 없는 로드아웃이 하나라도 있으면 파일 전체를 거부한다. */
export function parseImport(text: string): ParsedImport | null {
  let j: unknown
  try {
    j = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof j !== 'object' || j === null) return null
  const f = j as Record<string, unknown>
  if (f.format !== 'hd2lb' || f.version !== 1 || !Array.isArray(f.loadouts)) return null
  const loadouts = f.loadouts.map((l, i) => sanitizeLoadout(l, i))
  if (loadouts.some((l) => !l)) return null
  const hasSettings = typeof f.settings === 'object' && f.settings !== null
  return {
    format: 'hd2lb',
    version: 1,
    exportedAt: typeof f.exportedAt === 'string' ? f.exportedAt : '',
    dataVersion: typeof f.dataVersion === 'string' ? f.dataVersion : '',
    loadouts: loadouts as Loadout[],
    ...(hasSettings ? { settings: sanitizeSettings(f.settings) } : {}),
    hasFavorites: hasSettings && Object.hasOwn(f.settings as object, 'favorites'),
  }
}

const unionFavorites = (a: Favorites, b: Favorites): Favorites =>
  Object.fromEntries((Object.keys(a) as (keyof Favorites)[]).map((race) => [race, [...new Set([...a[race], ...b[race]])]])) as Favorites

/**
 * 가져온 파일의 설정을 이 기기에 반영할 값. 즐겨찾기는 직접 모은 기록이라 쉽게 잃지 않게 한다:
 * 파일에 없으면 지금 것을 그대로 두고, 병합이면 종족별로 합치고, 교체면 파일 것을 쓴다(교체는 직전 상태를 백업한다).
 */
export function importedSettings(file: ParsedImport, current: Settings, mode: 'merge' | 'replace'): Settings | undefined {
  if (!file.settings) return undefined
  if (!file.hasFavorites) return { ...file.settings, favorites: current.favorites }
  if (mode === 'merge') return { ...file.settings, favorites: unionFavorites(current.favorites, file.settings.favorites) }
  return file.settings
}

/** 교체 직전 1벌 보관(항상 성공, 덮어쓰기). 다운로드는 부가. */
export function saveBackup(file: ExportFile): void {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(file))
  } catch {
    /* 용량 초과 등: 다운로드 쪽에 맡긴다 */
  }
}

export function loadBackup(): ParsedImport | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY)
    return raw ? parseImport(raw) : null
  } catch {
    return null
  }
}

export function pickFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = async () => {
      const f = input.files?.[0]
      resolve(f ? await f.text() : null)
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}
