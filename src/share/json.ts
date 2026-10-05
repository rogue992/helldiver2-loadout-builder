// JSON 내보내기 · 가져오기 · 백업. 들어오는 파일은 sanitize를 거친 값만 돌려준다.
import { sanitizeLoadout, sanitizeSettings } from '../store/sanitize'
import { BACKUP_KEY, type ExportFile, type Loadout, type Settings } from '../store/types'

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
export function parseImport(text: string): ExportFile | null {
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
  }
}

/** 교체 직전 1벌 보관(항상 성공, 덮어쓰기). 다운로드는 부가. */
export function saveBackup(file: ExportFile): void {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(file))
  } catch {
    /* 용량 초과 등: 다운로드 쪽에 맡긴다 */
  }
}

export function loadBackup(): ExportFile | null {
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
