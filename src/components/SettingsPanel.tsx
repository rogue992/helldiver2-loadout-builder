import { useGameData } from '../data/GameDataContext'
import { useStore } from '../store/useStore'
import type { NameDisplay } from '../store/types'
import { copy } from '../copy/ko'
import styles from './SettingsPanel.module.css'

interface Props {
  onExport: () => void
  onImport: () => void
  onRestoreBackup: () => void
}

/** 상단 설정 패널: 경고 3 · 이름 표기 · 보유 채권 + JSON 입출력 · 백업 복원. 테마는 상단 바에서. */
export default function SettingsPanel({ onExport, onImport, onRestoreBackup }: Props) {
  const settings = useStore((s) => s.settings)
  const setSetting = useStore((s) => s.setSetting)
  const toggleUnowned = useStore((s) => s.toggleUnownedWarbond)
  const setUnowned = useStore((s) => s.setUnownedWarbonds)
  const { warbonds, meta } = useGameData()
  const unowned = new Set(settings.unownedWarbonds)
  // 현재 데이터의 채권 기준으로 센다(가져온 설정에 지금은 없는 채권 id가 섞여 있어도 어긋나지 않게)
  const owned = warbonds.filter((w) => !unowned.has(w.id)).length

  const seg = <T extends string>(value: T, options: [T, string][], onPick: (v: T) => void) => (
    <span className={styles.seg} role="radiogroup">
      {options.map(([v, label]) => (
        <button key={v} role="radio" aria-checked={value === v} className={value === v ? styles.on : ''} onClick={() => onPick(v)}>
          {label}
        </button>
      ))}
    </span>
  )
  const toggle = (value: boolean, onPick: (v: boolean) => void, label: string) => (
    <button role="switch" aria-checked={value} aria-label={label} className={[styles.toggle, value && styles.toggleOn].filter(Boolean).join(' ')} onClick={() => onPick(!value)} />
  )

  return (
    <section className={styles.panel} data-part="settings" aria-label={copy.settings}>
      <div className={styles.row}>
        <span>{copy.settingsEagle}</span>
        {seg(String(settings.eagleThreshold), [['3', copy.settingsEagleN(3)], ['2', copy.settingsEagleN(2)]], (v) => setSetting('eagleThreshold', Number(v) as 2 | 3))}
      </div>
      <div className={styles.row}>
        <span>{copy.settingsBackpack}</span>
        {toggle(settings.backpackWarn, (v) => setSetting('backpackWarn', v), copy.settingsBackpack)}
      </div>
      <div className={styles.row}>
        <span>{copy.settingsDisposable}</span>
        {toggle(settings.excludeDisposable, (v) => setSetting('excludeDisposable', v), copy.settingsDisposable)}
      </div>
      <div className={styles.row}>
        <span>{copy.settingsName}</span>
        {seg<NameDisplay>(settings.nameDisplay, [['ko', copy.nameKo], ['both', copy.nameBoth], ['en', copy.nameEn]], (v) => setSetting('nameDisplay', v))}
      </div>
      <div className={styles.row}>
        <span>{copy.settingsData}</span>
        <span className={styles.meta}>
          {meta.version} · {meta.fetchedAt.slice(0, 10)}
        </span>
      </div>
      <div className={styles.wide}>
        <div className={styles.wideHead}>
          <span className={styles.wideTitle}>
            {copy.settingsWarbonds} {owned} / {warbonds.length}
          </span>
          <span className={styles.wideBtns}>
            <button onClick={() => setUnowned([])}>{copy.warbondsAll}</button>
            {/* 초기화 = 기본 지급 채권(standard)만 보유 */}
            <button onClick={() => setUnowned(warbonds.filter((w) => w.type !== 'standard').map((w) => w.id))} title={copy.warbondsResetHint}>
              {copy.warbondsReset}
            </button>
          </span>
        </div>
        <div className={styles.chips}>
          {warbonds.map((w) => {
            const has = !unowned.has(w.id)
            return (
              <button key={w.id} role="checkbox" aria-checked={has} className={[styles.chip, !has && styles.chipOff].filter(Boolean).join(' ')} onClick={() => toggleUnowned(w.id)}>
                {w.nameKo}
              </button>
            )
          })}
          <button role="checkbox" aria-checked={settings.includeSuperstore} className={[styles.chip, !settings.includeSuperstore && styles.chipOff].filter(Boolean).join(' ')} onClick={() => setSetting('includeSuperstore', !settings.includeSuperstore)}>
            {copy.settingsSuperstore}
          </button>
        </div>
      </div>
      <div className={styles.actions}>
        <button onClick={onExport}>{copy.exportJson}</button>
        <button onClick={onImport}>{copy.importJson}</button>
        <button onClick={onRestoreBackup}>{copy.restoreBackup}</button>
      </div>
    </section>
  )
}
