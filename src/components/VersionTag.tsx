import { useGameData } from '../data/GameDataContext'
import { copy } from '../copy'
import styles from './VersionTag.module.css'

/** 화면 오른쪽 아래 버전. 앱 버전은 배포마다 오르고(vite.config.ts), 빌드 커밋 · 날짜 · 데이터 패치는 올리면 보인다 */
export default function VersionTag() {
  const { meta } = useGameData()
  const { version, commit, date } = __APP_BUILD__
  return (
    <span className={styles.tag} title={copy.versionTitle(commit, date, meta.version)} data-part="version">
      v{version}
    </span>
  )
}
