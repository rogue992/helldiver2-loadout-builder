import { useState } from 'react'
import { LOADOUT_RACES, factionName, raceInfo, type LoadoutRace } from '../data/factions'
import { useStore } from '../store/useStore'
import { isDefaultLoadout } from '../store/defaults'
import type { Warning, StampState } from '../rules/warnings'
import { copy } from '../copy/ko'
import PermitFrame from './PermitFrame'
import Stamp from './Stamp'
import Broadcast from './Broadcast'
import ReeducationDialog from './ReeducationDialog'
import styles from './Permit.module.css'

interface Props {
  warnings: Warning[]
  stamp: StampState
  stampKey: number
  onSave: () => void
  onDuplicate: () => void
  onExportImage: () => void
  onBriefing: () => void
  /** 열린 로드아웃을 목록에서 바로 삭제(되돌리기 토스트는 상위에서) */
  onDelete: (id: string) => void
}

/** 위반 한 줄 = 등급 · 제목 · 슬롯 · 판정. 줄글 대신 표처럼. */
function describe(w: Warning): { title: string; verdict: string } {
  const hard = w.level === 'hard'
  switch (w.code) {
    case 'backpack':
      return { title: copy.warnTitle.backpack, verdict: hard ? copy.warnVerdict.backpackHard : copy.warnVerdict.backpackSoft }
    case 'support_weapon':
      return { title: copy.warnTitle.support_weapon, verdict: hard ? copy.warnVerdict.supportHard : copy.warnVerdict.supportSoft }
    case 'eagle':
      return { title: hard ? copy.warnTitle.eagle(w.count ?? 0) : copy.warnTitle.eagleSoft(w.count ?? 0), verdict: hard ? copy.warnVerdict.eagleHard : copy.warnVerdict.eagleSoft }
    case 'empty':
      return { title: copy.warnTitle.empty(w.count ?? 0), verdict: copy.warnVerdict.empty }
  }
}

const LEVEL_LABEL = { hard: copy.levelHard, soft: copy.levelSoft, info: copy.levelInfo } as const

/**
 * 발급일. 저장은 UTC ISO라 그대로 자르면 한국 시간 오전에는 하루 전 날짜가 되므로 로컬 날짜로 읽는다.
 * fixed(기본 로드아웃의 출시일 고정값)는 시간대와 무관하게 적힌 날짜 그대로.
 */
function issuedOn(iso: string, fixed: boolean): { y: string; m: string; d: string } {
  if (fixed) {
    const [y, m, d] = iso.slice(0, 10).split('-')
    return { y, m, d }
  }
  const t = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return { y: String(t.getFullYear()), m: p(t.getMonth() + 1), d: p(t.getDate()) }
}

/** 수호부 출격 허가서: 이름 · 종족/팩션 · 도장 · 위반 사항 · 버튼. 저장은 draft → loadouts. */
export default function Permit({ warnings, stamp, stampKey, onSave, onDuplicate, onExportImage, onBriefing, onDelete }: Props) {
  const draft = useStore((s) => s.draft)
  const editDraft = useStore((s) => s.editDraft)
  const clearDraft = useStore((s) => s.clearDraft)
  const theme = useStore((s) => s.settings.theme)
  const saved = useStore((s) => (s.draft ? s.loadouts.some((l) => l.id === s.draft!.id) : false))
  const [confirmReset, setConfirmReset] = useState(false)

  if (!draft) return null
  const race = raceInfo(draft.race)
  const hard = warnings.filter((w) => w.level === 'hard').length
  // 기본 로드아웃(수호부 지급)은 어떤 것도 바꿀 수 없다. 복제만 열어 둔다. 빈 슬롯도 지급 구성의 일부라 안내하지 않는다
  const lockedAll = isDefaultLoadout(draft.id)
  const day = issuedOn(draft.createdAt, lockedAll)
  const serial = `No. SE-${day.y.slice(2)}${day.m}${day.d}`
  const shown = lockedAll ? warnings.filter((w) => w.code !== 'empty') : warnings

  return (
    <PermitFrame theme={theme} className={styles.permit}>
      {theme === 'teletype' && <Broadcast theme="teletype" exemplary={stamp === 'approved'} />}
      <div className={styles.ph} data-part="permit-head">
        <div className={styles.titles}>
          <h2>{copy.permitTitle}</h2>
          <input className={styles.name} value={draft.name} readOnly={lockedAll} onChange={(e) => editDraft({ name: e.target.value })} aria-label={copy.loadoutName} title={lockedAll ? copy.defaultLocked : undefined} />
        </div>
        <div className={styles.no}>
          {serial}
          <br />
          {lockedAll ? <b className={styles.lockedTag}>{copy.permitLocked}</b> : draft.dirty ? <b>{copy.permitUnsaved}</b> : `${day.y}.${day.m}.${day.d}`}
        </div>
      </div>

      <div className={styles.kv} data-part="permit-kv">
        <span>{copy.race}</span>
        <select value={draft.race} disabled={lockedAll} onChange={(e) => editDraft({ race: e.target.value as LoadoutRace, faction: 'default' })}>
          {LOADOUT_RACES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nameKo}
            </option>
          ))}
        </select>
        <span>{copy.faction}</span>
        <select value={draft.faction} disabled={lockedAll} onChange={(e) => editDraft({ faction: e.target.value })}>
          {race.factions.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nameKo}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.status} data-part="permit-status">
        <Stamp state={stamp} theme={theme} stampKey={stampKey} />
        <small>{draft.race === 'all' ? race.nameKo : `${race.nameKo} · ${factionName(draft.race, draft.faction)}`}</small>
      </div>

      <div className={styles.viol} data-part="permit-violations">
        <h3>
          {copy.violations} {hard > 0 && <b>{hard}</b>}
        </h3>
        {shown.length === 0 && (
          <div className={[styles.alert, styles.ok].join(' ')} data-part="alert">
            <span className={styles.k}>{copy.levelInfo}</span>
            <span className={styles.title}>{copy.okAll}</span>
            <span className={styles.verdict}>{copy.okVerdict}</span>
          </div>
        )}
        {shown.map((w, i) => {
          const d = describe(w)
          return (
            <div key={i} className={[styles.alert, styles[w.level]].join(' ')} data-part="alert">
              <span className={styles.k}>{LEVEL_LABEL[w.level]}</span>
              <span className={styles.title}>{d.title}</span>
              {w.slots.length > 0 && (
                <span className={styles.slots} aria-label={`${copy.slotLabel} ${w.slots.join(', ')}`}>
                  {w.slots.map((n) => (
                    <i key={n}>{n}</i>
                  ))}
                </span>
              )}
              <span className={styles.verdict}>{d.verdict}</span>
            </div>
          )
        })}
      </div>

      <div className={styles.btns} data-part="permit-buttons" data-export="skip">
        <button className={styles.primary} onClick={onSave} disabled={lockedAll} title={lockedAll ? copy.defaultLocked : undefined}>
          {copy.save}
        </button>
        <div className={styles.row}>
          <button onClick={onDuplicate}>{copy.duplicate}</button>
          <button onClick={onExportImage}>{copy.image}</button>
          <button onClick={onBriefing}>{copy.briefing}</button>
        </div>
        <button className={styles.reset} onClick={() => setConfirmReset(true)} disabled={lockedAll} title={lockedAll ? copy.defaultLocked : undefined}>
          {copy.reset}
        </button>
        {/* 확인 없이 바로 삭제(되돌리기 토스트가 안전장치). 기본 로드아웃과 아직 목록에 없는 초안은 삭제 불가 */}
        <button className={styles.danger} onClick={() => onDelete(draft.id)} disabled={!saved || lockedAll} title={lockedAll ? copy.defaultLocked : undefined}>
          {copy.delete}
        </button>
      </div>

      {confirmReset && (
        <ReeducationDialog
          body={copy.reeducationBody(copy.reeducationReset)}
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            clearDraft()
            setConfirmReset(false)
          }}
        />
      )}
    </PermitFrame>
  )
}
