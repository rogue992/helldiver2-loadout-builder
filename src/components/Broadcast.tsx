import { copy } from '../copy'
import styles from './Broadcast.module.css'

// 페이지를 열 때 한 번만 고른다. 타이머로 바꾸지 않아 가만히 둔 화면은 다시 그릴 일이 없다
const pick = Math.random()

interface Props {
  /** 방금 저장해 승인이 났으면 "모범 헬다이버" 문구로 바뀐다 */
  exemplary?: boolean
}

/** 진리부 방송: 허가서 머리 아래의 공문 한 줄. 움직이지 않는다. */
export default function Broadcast({ exemplary = false }: Props) {
  const line = exemplary ? copy.sloganExemplary : copy.slogans[Math.floor(pick * copy.slogans.length)]
  return (
    <div className={styles.notice} data-part="broadcast">
      <div className={styles.head}>
        <i aria-hidden />
        {copy.broadcast} · {copy.broadcastChannel}
      </div>
      <p>{line}</p>
    </div>
  )
}
