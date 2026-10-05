import type { ReactNode } from 'react'

// 버튼 안의 얇은 선 아이콘. 크기는 1em(부모 글자 크기), 색은 currentColor라 테마 토큰을 그대로 따른다
const PATHS = {
  arrow: <path d="M7 17 17 7M9 7h8v8" />,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  image: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="m4 16 5-5 4 4 3-3 4 4" />
      <circle cx="15.5" cy="9.5" r="1" />
    </>
  ),
  doc: <path d="M7 3h7l5 5v13H7V3Zm7 0v5h5M10 13h6M10 17h6" />,
  reset: <path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5" />,
  trash: <path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v6M14 11v6" />,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

/** stroke는 viewBox(24) 기준 선 굵기. 아주 작게 그리는 ✕ 같은 곳만 굵게 준다 */
export default function Icon({ name, stroke = 1.6 }: { name: IconName; stroke?: number }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      {PATHS[name]}
    </svg>
  )
}
