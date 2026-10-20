// 채권별 색(설정의 보유 채권 칩 · 신규 채권 공고). 각 채권 표지의 주된 색과 로고 색에서 골랐다.
// 새 채권은 여기에 id와 색을 넣는다. 빠지면 기본 강조색으로 보이고 단위 테스트가 실패한다.

export const WARBOND_COLOR: Record<string, string> = {
  'helldivers-mobilize-warbond': '#f5cf3c', // 헬다이버 노랑
  'steeled-veterans-premium-warbond': '#f0912d', // 표지의 주황 띠
  'cutting-edge-premium-warbond': '#22b4ea', // 전기 청록
  'democratic-detonation-premium-warbond': '#e8452c', // 폭발 적주황
  'polar-patriots-premium-warbond': '#a6d9f7', // 얼음 하늘색
  'viper-commandos-premium-warbond': '#23b08f', // 정글 청록
  'freedom-s-flame-premium-warbond': '#ff7419', // 불꽃
  'chemical-agents-premium-warbond': '#b4d834', // 독성 연두
  'truth-enforcers-premium-warbond': '#dd3550', // 진리부 진홍
  'urban-legends-premium-warbond': '#c8ac3e', // 도시 경고 띠 머스터드
  'servants-of-freedom-premium-warbond': '#c45a32', // 노을 녹빛
  'borderline-justice-premium-warbond': '#dcae7c', // 사막 모래
  'masters-of-ceremony-premium-warbond': '#5b7ee6', // 의장대 청색
  'force-of-law-premium-warbond': '#7266ee', // 야간 순찰 남보라
  'control-group-premium-warbond': '#b591f5', // 실험실 보라
  'obedient-democracy-support-troopers-legendary-warbond': '#5b8bb5', // 강하병 강철 청색
  'dust-devils-premium-warbond': '#bf9152', // 흙먼지 청동
  'python-commandos-premium-warbond': '#5ea648', // 비단뱀 녹색
  'righteous-revenants-legendary-warbond': '#c9282b', // 붉은 눈 핏빛
  'redacted-regiment-premium-warbond': '#8193a8', // 지워진 문서 회청
  'siege-breakers-premium-warbond': '#e8b23e', // 용광로 금빛
  'entrenched-division-premium-warbond': '#9c8d5c', // 참호 진흙
  'exo-experts-premium-warbond': '#ff6047', // 레이저 산호빛
  'castellan-s-creed-legendary-warbond': '#a3a55e', // 카디안 카키
  'ironclad-democracy-premium-warbond': '#5fa8ae', // 전차 강철 청록
}

/** 색표에 없는 채권(새로 들어와 아직 안 정한 것)은 테마 강조색 */
export function warbondColor(id: string): string {
  return Object.hasOwn(WARBOND_COLOR, id) ? WARBOND_COLOR[id] : 'var(--acc)'
}
