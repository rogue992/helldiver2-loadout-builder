---
name: update-data
description: >-
  헬다이버즈 2 게임 업데이트(새 채권 · 무기 · 스트라타젬) 후 helldivers.wiki.gg Cargo API에서 데이터를 다시 수집해
  public/data/*.json과 아이콘을 갱신하는 절차. "데이터 업데이트", "새 워본드 반영", "위키 갱신", "/update-data" 요청에 사용.
  wiki HTML 스크래핑 금지, API만, 요청 간격 1.5초, 수동 실행 전용. 커밋·푸시는 사용자가 한다.
---

# /update-data : wiki.gg → 정적 데이터 갱신

이 레포의 데이터는 빌드 시 생성되는 정적 파일이다. 게임 업데이트가 나오면 이 절차를 **로컬에서 수동으로** 돈다.
CI는 데이터 스크립트를 돌리지 않는다.

## 운영 규칙 (항상)

- **API만** 쓴다. `helldivers.wiki.gg/api.php`의 `cargoquery` · `imageinfo`. HTML 페이지를 긁지 않는다(robots · ToS).
- 요청 간격 **1.5초 이상**(스크립트가 강제), 식별 User-Agent. 429가 나면 스크립트가 30초 후 1회 재시도하고 그래도 실패하면 **중단**한다. 그대로 사용자에게 보고하고 다시 시도하지 않는다.
- **주 1회 이하, 자동 스케줄 없음.**
- 표기 규칙: 종족은 테르미니드 · 오토마톤 · 일루미닛, 부처는 수호부(군사) / 진리부(판정 · 선전), 모든 문구에 em dash(U+2014) 금지(`npm run lint:copy`).
- 사람이 관리하는 파일은 `data/overrides/{ko,manual,aliases}.json`만. `public/data`와 `data/registry.json`은 스크립트가 쓴다.

## 절차

1. **수집**: `npm run data:fetch`
   - `data/raw/wiki.json`을 갱신하고 이전 스냅샷과의 diff(추가 · 삭제 · 변경 페이지명)를 출력한다.
   - **삭제 + 추가 쌍**은 rename 후보다. 먼저 사용자에게 diff와 후보를 보여준다.
2. **rename 처리**: 사용자가 rename으로 확인한 쌍은 `data/overrides/aliases.json`에 `"구 id": "신 id"`로 기록한다.
   id 규칙은 `{pw|sw|th|ar|st}-{페이지명 슬러그}` (소문자, 비영숫자 → `-`). 빌드가 `n`을 승계하고 `ko.json` 키를 옮긴다.
3. **dry-run**: `npm run data:build -- --dry-run`
   - `counts`: 직전 빌드(`public/data/meta.json`) 대비 증감이 괄호로 나온다. 신규 아이템 수만큼 늘어야 하고, 줄어든 종류가 있으면 원인을 확인한다
   - `missingKo`(아이템 id · `passive:{영문}` · `warbond:{id}`), `unknownSource`, 미배정 `n`
   - `stratagem_type` 매핑표에 없는 값이 있으면 빌드가 실패한다 → `scripts/build-data.ts`의 `classifyStrat` 매핑표를 먼저 확장한다.
4. **한글화 · 분류 제안**: `missingKo` 항목마다 아래를 **표로 제안하고 사용자 확인 후** 기록한다. 확인 없이 쓰지 않는다.
   - `nameKo`: 모델 코드는 그대로, 명칭은 기존 `ko.json` 표기 관습과 나무위키(HELLDIVERS 2 문서) 표기를 참고. 형제 항목 형식을 따른다(예: `M-102 사수 FRV` → `M-104 소각 FRV`).
   - `warbondId` / `warbondPage`: Cargo `source`에서 자동 판정되면 생략. `unknownSource`만 판단.
   - 스트라타젬 `stratType`: 자동 판정(`Orbital` + `Barrage`, `traits`의 `Expendable` · `Backpack`)과 다르면 `data/overrides/manual.json`에 `{ "stratType": "..." }`. 근거는 `api.php?action=parse&page=<페이지명>&prop=wikitext`로 1회 조회해 인용.
   - 기록 위치: `data/overrides/ko.json`의 `items[id].nameKo`, `passives[영문]`, `warbonds[id]`.
5. **산출물 생성**: `npm run data:build -- --assign-n --label <패치 버전>` (예: `01.007.002`)
   - 신규 아이템에 `n`이 배정되고 `public/data/*.json`, `data/registry.json`, `data/CHANGELOG.md`가 갱신된다.
6. **아이콘**: `npm run icons:fetch`
   - 스트라타젬은 nvigneux(정규화 매칭 + `scripts/lib/strat-map.ts` 수동표), 없으면 wiki SVG 임시 폴백 + `data/icon-fallbacks.json`에 기록(매 실행 재시도).
   - 실패 목록이 나오면 보고. 매칭 키 충돌이면 `NVIGNEUX_MANUAL`에 항목을 추가한다.
   - nvigneux는 `scripts/fetch-icons.ts`의 `NVIG_REF`(커밋 SHA)로 고정돼 있다. 새 아이콘이 필요하면 그 저장소의 변경을 확인한 뒤 SHA를 올린다.
   - 받은 SVG에 스크립트 · 이벤트 속성 · 외부 참조가 있으면 저장하지 않고 "SVG 거부"로 실패한다. 그대로 보고하고 손으로 고치지 않는다.
7. **아이콘 검증 재빌드**: `npm run data:build -- --label <패치 버전>` → "아이콘 파일 없음" 경고가 0건인지 확인.
8. **검증**: `npm run typecheck && npm run lint:copy && npm run lint:theme && npm test && npm run build`
9. **보고**: 변경 파일 목록 · CHANGELOG 블록 · 폴백 목록 · unknownSource를 요약해 사용자에게 전달한다. **커밋 · 푸시는 하지 않는다**(사용자가 한다. main push가 Pages 배포를 트리거한다).

## 자주 걸리는 것

- `Armor` 테이블은 헬멧 행이 본체와 페이지명을 공유한다. 빌드가 `type === 'Helmet'`을 걸러내니 counts.armor가 직전 빌드의 두 배 가까이 뛰면 필터가 깨진 것.
- `Weapons`의 `Support Weapons`는 스트라타젬 쪽에서만 취급한다(무기 슬롯에 넣지 않음).
- 채권 링크 타깃은 `_`, U+2019 어포스트로피가 섞여 온다. `lib/wikitext.ts`가 정규화하니 조인 실패가 나면 새 변형인지 확인.
- `data/registry.json`(아이템 번호 `n`)은 append-only다. 지우거나 재생성하지 않는다(데이터 계약). 제외(`manual.json`의 `exclude`) 항목에는 번호가 배정되지 않는다.
- `data:seed`는 1회성이다. `ko.json`이 있으면 `--force` 없이는 덮어쓰지 않는다.
