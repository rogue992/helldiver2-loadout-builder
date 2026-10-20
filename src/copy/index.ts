// 화면에서 쓰는 문구. copy.x를 읽는 순간 지금 언어(lang.ts) 사전을 본다. 사전은 ko.ts · en.ts 두 벌이고 모양이 같다
import { byLang } from './lang'
import { copyKo } from './ko'
import { copyEn } from './en'

/** ko.ts의 글자 그대로 타입(as const)을 string으로 넓힌 모양. en.ts가 이 모양을 지킨다 */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : T extends object
        ? { [K in keyof T]: Widen<T[K]> }
        : T

export type Copy = Widen<typeof copyKo>

export const copy: Copy = byLang<Copy>(copyKo, copyEn)

export { getLang, pick, setLang, type Lang } from './lang'
