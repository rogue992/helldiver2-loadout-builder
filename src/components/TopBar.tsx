import { useEffect, useRef } from 'react'
import { LOADOUT_RACES, raceInfo, type LoadoutRace } from '../data/factions'
import { useStore } from '../store/useStore'
import type { ThemeId } from '../store/types'
import { APP_NAME, copy } from '../copy/ko'
import Icon from './Icon'
import styles from './TopBar.module.css'

interface Props {
  onOpenCredits: () => void
}

const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'console', label: copy.themeConsole },
  { id: 'teletype', label: copy.themeTeletype },
]

/**
 * 상단 바 1줄: [서랍 머리 ☰ + 저장된 로드아웃] · 브랜드 · 종족 세그먼트 · 팩션 칩 · 테마 · 크레딧/설정.
 * 서랍 머리는 아래 목록 패널과 같은 폭(--drawer-w) · 배경 · 오른쪽 경계선을 써서 한 기둥으로 이어진다. 접히면 ☰만 남는다.
 * 넓은 화면은 한 줄: 폭이 모자라면 팩션 칩 줄만 줄어들어 가로로 밀어 보고(마우스 휠도 가로로), 넘친 쪽 끝은 흐리게 보인다.
 * 한 줄이 안 들어가는 폭에서는 2단(종족 탭 · 팩션 칩이 아랫단), 폰 폭에서는 감긴다. 기준 폭은 TopBar.module.css.
 */
export default function TopBar({ onOpenCredits }: Props) {
  const ui = useStore((s) => s.ui)
  const setUi = useStore((s) => s.setUi)
  const count = useStore((s) => s.loadouts.length)
  const theme = useStore((s) => s.settings.theme)
  const setSetting = useStore((s) => s.setSetting)
  const race = ui.race === 'all' ? null : raceInfo(ui.race)
  const chipsRef = useRef<HTMLDivElement>(null)

  // 팩션 칩 줄: 넘칠 때만 오른쪽 끝을 흐리고(끝까지 밀면 걷힌다), 세로 휠을 가로 스크롤로 옮긴다.
  // 종족이 바뀌면 같은 줄이 재사용되므로 맨 앞(선택된 전체 칩)으로 되돌린다.
  useEffect(() => {
    const el = chipsRef.current
    if (!el) return
    el.scrollLeft = 0
    const update = () => el.toggleAttribute('data-more', el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return
      // 끝에 닿은 쪽으로 더 굴리면 페이지가 스크롤되게 둔다
      const atStart = el.scrollLeft <= 0
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
      if ((e.deltaY < 0 && atStart) || (e.deltaY > 0 && atEnd)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    el.addEventListener('scroll', update, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: false })
    void document.fonts?.ready.then(update)
    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', update)
      el.removeEventListener('wheel', onWheel)
    }
  }, [ui.race])

  const pickRace = (id: LoadoutRace) => {
    setUi({ race: id, faction: 'all' })
    if (id !== 'all') {
      document.documentElement.style.setProperty('--flash', `var(--race-${id})`)
      document.body.classList.remove(styles.flash)
      // 강제 리플로우로 애니메이션 재시작
      void document.body.offsetWidth
      document.body.classList.add(styles.flash)
    }
  }

  return (
    <header className={[styles.bar, race && styles.withFactions].filter(Boolean).join(' ')} data-part="top-bar">
      <div className={[styles.drawerHead, ui.sidebarOpen && styles.drawerOpen].filter(Boolean).join(' ')} data-part="drawer-head">
        <button
          className={styles.menuBtn}
          onClick={() => setUi({ sidebarOpen: !ui.sidebarOpen })}
          aria-pressed={ui.sidebarOpen}
          aria-label={ui.sidebarOpen ? copy.fold : copy.unfold}
          title={ui.sidebarOpen ? copy.fold : copy.unfold}
          data-part="sidebar-toggle"
        >
          <Icon name="menu" />
        </button>
        {ui.sidebarOpen && (
          <span className={styles.drawerTitle}>
            {copy.savedLoadouts} <b>{count}</b>
          </span>
        )}
      </div>

      <div className={styles.brand}>
        <span className={styles.seal} aria-hidden>
          SE
        </span>
        <h1>{APP_NAME}</h1>
      </div>

      <div className={styles.races} role="tablist" aria-label={copy.race} data-part="race-tabs">
        {LOADOUT_RACES.map((r) => (
          <button
            key={r.id}
            role="tab"
            aria-selected={ui.race === r.id}
            className={ui.race === r.id ? styles.on : ''}
            style={{ '--dot': `var(--race-${r.id})` } as React.CSSProperties}
            onClick={() => pickRace(r.id)}
          >
            <i /> {r.nameKo}
          </button>
        ))}
      </div>

      {race && (
        <>
          <span className={styles.sep} aria-hidden />
          <span className={styles.k}>{copy.faction}</span>
          <div ref={chipsRef} className={styles.chips} role="tablist" aria-label={copy.faction}>
            <button role="tab" aria-selected={ui.faction === 'all'} className={[styles.chip, ui.faction === 'all' && styles.chipOn].filter(Boolean).join(' ')} onClick={() => setUi({ faction: 'all' })}>
              {copy.all}
            </button>
            {race.factions.map((f) => (
              <button key={f.id} role="tab" aria-selected={ui.faction === f.id} className={[styles.chip, ui.faction === f.id && styles.chipOn].filter(Boolean).join(' ')} onClick={() => setUi({ faction: f.id })}>
                {f.nameKo}
              </button>
            ))}
          </div>
        </>
      )}

      <div className={styles.right}>
        {/* 테마: 각 테마 화면의 축소판(상단 바 · 목록 · 본문). 텍스트 버튼(크레딧 · 설정)과 구분 */}
        <span className={styles.themes} role="radiogroup" aria-label={copy.settingsTheme} data-part="theme-select">
          {THEMES.map((t) => (
            <button key={t.id} role="radio" aria-checked={theme === t.id} className={[styles.scr, styles[`scr_${t.id}`], theme === t.id && styles.scrOn].filter(Boolean).join(' ')} onClick={() => setSetting('theme', t.id)} title={t.label} aria-label={t.label}>
              <i className={styles.scrTop} aria-hidden />
              <i className={styles.scrSide} aria-hidden />
              <i className={styles.scrMain} aria-hidden />
            </button>
          ))}
        </span>
        <span className={styles.sep} aria-hidden />
        <button className={styles.btn} onClick={onOpenCredits}>
          {copy.credits}
        </button>
        <button className={[styles.btn, ui.settingsOpen && styles.btnOn].filter(Boolean).join(' ')} aria-expanded={ui.settingsOpen} onClick={() => setUi({ settingsOpen: !ui.settingsOpen })}>
          {copy.settings} {ui.settingsOpen ? '▴' : '▾'}
        </button>
      </div>
    </header>
  )
}
