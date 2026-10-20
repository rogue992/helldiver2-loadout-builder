// 화면 언어. 설정의 표기(한글 / 영문)가 정하고 App이 그리기 전에 맞춘다. 문구 · 라벨 · 이름은 읽는 순간 이 값을 따른다
export type Lang = 'ko' | 'en'

let current: Lang = 'ko'

export const getLang = (): Lang => current

export function setLang(lang: Lang): void {
  current = lang
}

/** 언어별 값 두 벌에서 지금 언어 것 */
export const pick = <T>(ko: T, en: T): T => (current === 'en' ? en : ko)

/** 언어별 표 두 벌을 한 표처럼 쓴다. 키로 읽는 순간 지금 언어 표를 본다 */
export function byLang<T extends object>(ko: T, en: T): T {
  return new Proxy(ko, { get: (_, key) => Reflect.get(current === 'en' ? en : ko, key) })
}
