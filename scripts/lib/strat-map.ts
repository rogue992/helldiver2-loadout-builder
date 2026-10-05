// 모델 코드가 없는 스트라타젬(궤도 · 이글)의 시드 한글명 → wiki 페이지명 수동 매핑.
// 코드가 있는 항목은 seed-from-ses.ts가 코드 토큰으로 자동 조인한다.
export const ORBITAL_EAGLE_KO_TO_EN: Record<string, string> = {
  '궤도 120mm 고폭 폭격': 'Orbital 120mm HE Barrage',
  '궤도 380mm 고폭 폭격': 'Orbital 380mm HE Barrage',
  '궤도 공중폭발 타격': 'Orbital Airburst Strike',
  '궤도 EMS 타격': 'Orbital EMS Strike',
  '궤도 개틀링 폭격': 'Orbital Gatling Barrage',
  '궤도 가스 타격': 'Orbital Gas Strike',
  '궤도 레이저': 'Orbital Laser',
  '궤도 네이팜 폭격': 'Orbital Napalm Barrage',
  '궤도 정밀 타격': 'Orbital Precision Strike',
  '궤도 레일캐넌 타격': 'Orbital Railcannon Strike',
  '궤도 연막 타격': 'Orbital Smoke Strike',
  '궤도 이동 폭격': 'Orbital Walking Barrage',
  '이글 110mm 로켓 포드': 'Eagle 110mm Rocket Pods',
  '이글 500kg 폭탄': 'Eagle 500kg Bomb',
  '이글 공중타격': 'Eagle Airstrike',
  '이글 집속탄': 'Eagle Cluster Bomb',
  '이글 가스 공중타격': 'Eagle Gas Airstrike',
  '이글 네이팜 공중타격': 'Eagle Napalm Airstrike',
  '이글 연막 타격': 'Eagle Smoke Strike',
  '이글 기총소사': 'Eagle Strafing Run',
}

/** nvigneux 파일명이 정규화로도 안 맞는 항목(wiki 페이지명 → nvigneux 파일명, 확장자 제외). */
export const NVIGNEUX_MANUAL: Record<string, string> = {
  'AX/ARC-3 K-9': 'Guard Dog K-9',
  'AX/FLAM-75 Hot Dog': 'Guard Dog Hot Dog',
  'AX/LAS-5 Rover': 'Guard Dog Rover',
  'AX/TX-13 Dog Breath': 'Guard Dog Breath',
  'B-100 Portable Hellbomb': 'Hellbomb Portable',
  'Eagle Gas Airstrike': 'Eagle Gas Strike',
  'M-102 Gunner FRV': 'Fast Recon Vehicle',
  'MD-8 Gas Mines': 'Gas Mine',
}
// nvigneux에 아직 없는 항목은 wiki SVG 임시 폴백으로 받고 data/icon-fallbacks.json에 남아 매 실행 재시도된다(목록은 그 파일이 기준).
