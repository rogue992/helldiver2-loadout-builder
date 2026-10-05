import { useGameData } from '../data/GameDataContext'
import { copy } from '../copy/ko'
import { useModal } from './useModal'
import styles from './Credits.module.css'

interface Props {
  onClose: () => void
}

/** 공로 인정서: 출처 · 라이선스 고지를 슈퍼어스 표창장 형식으로. 비상업 개인 도구. */
export default function Credits({ onClose }: Props) {
  const { meta } = useGameData()
  const backdrop = useModal(onClose)
  return (
    <div className={styles.backdrop} {...backdrop}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={copy.creditsTitle} data-part="credits">
        <div className={styles.hazard} aria-hidden />
        <header className={styles.head}>
          <span className={styles.seal} aria-hidden>
            SE
          </span>
          <div>
            <h2>{copy.creditsTitle}</h2>
            <p>{copy.creditsSub}</p>
          </div>
          <span className={styles.no}>No. SE-{meta.version.replace(/\./g, '')}</span>
        </header>

        <section className={styles.maker}>
          <span className={styles.lbl}>{copy.creditsMakerLabel}</span>
          <a className={styles.handle} href="https://github.com/rogue992" target="_blank" rel="noopener">
            {copy.creditsMaker}
          </a>
          <p>{copy.creditsMakerNote}</p>
          <a className={styles.repo} href="https://github.com/rogue992/helldiver2-loadout-builder" target="_blank" rel="noopener">
            github.com/rogue992/helldiver2-loadout-builder
          </a>
        </section>

        <section className={styles.medals}>
          <h3>{copy.creditsSectionSources}</h3>
          <ol>
            <li>
              <i className={styles.medal} aria-hidden />
              <div>
                <a href="https://helldivers.wiki.gg/" target="_blank" rel="noopener">
                  Helldivers Wiki
                </a>
                <b>{copy.creditsWiki}</b>
                <small>{copy.creditsWikiNote(meta.version, meta.fetchedAt.slice(0, 10))}</small>
              </div>
            </li>
            <li>
              <i className={styles.medal} aria-hidden />
              <div>
                <a href="https://github.com/nvigneux/Helldivers-2-Stratagems-icons-svg" target="_blank" rel="noopener">
                  nvigneux / Helldivers-2-Stratagems-icons-svg
                </a>
                <b>{copy.creditsNvig}</b>
                <small>{copy.creditsNvigNote}</small>
              </div>
            </li>
            <li>
              <i className={styles.medal} aria-hidden />
              <div>
                <a href="https://ses-csd.vercel.app/" target="_blank" rel="noopener">
                  {copy.creditsSesName}
                </a>
                <b>{copy.creditsSes}</b>
                <small>{copy.creditsSesNote}</small>
              </div>
            </li>
          </ol>
        </section>

        <section className={styles.legal}>
          <h3>{copy.creditsSectionLegal}</h3>
          <p>{copy.creditsLegal1}</p>
          <p>{copy.creditsLegal2}</p>
        </section>

        <footer className={styles.foot}>
          <span className={styles.stamp} aria-hidden>
            {copy.creditsStamp}
          </span>
          <button className={styles.close} onClick={onClose}>
            {copy.creditsClose}
          </button>
        </footer>
      </div>
    </div>
  )
}
