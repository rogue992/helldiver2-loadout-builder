import { useId } from 'react'

/** 앱 아이콘(호출 비컨): 빛기둥 + 바닥의 위험 줄무늬. public/icon.svg와 같은 그림이다(파비콘 · 홈 화면 아이콘은 그쪽에서 만든다) */
export default function AppIcon({ size = 28 }: { size?: number }) {
  // 한 화면에 여러 번 그려도 clip · 무늬 id가 겹치지 않게
  const u = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden focusable="false">
      <defs>
        <clipPath id={`c${u}`}>
          <rect x="2" y="2" width="60" height="60" rx="14" />
        </clipPath>
        <linearGradient id={`g${u}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#d6f1ff" />
          <stop offset="1" stopColor="#7fc2ea" stopOpacity="0" />
        </linearGradient>
        <pattern id={`p${u}`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <rect width="4.5" height="9" fill="#ffe14d" />
        </pattern>
      </defs>
      <g clipPath={`url(#c${u})`}>
        <rect width="64" height="64" fill="#0b1626" />
        <rect y="50" width="64" height="14" fill={`url(#p${u})`} />
        <rect x="24" y="0" width="16" height="44" fill={`url(#g${u})`} opacity=".35" />
        <rect x="29" y="0" width="6" height="44" fill={`url(#g${u})`} />
        <ellipse cx="32" cy="45" rx="12" ry="3.4" fill="none" stroke="#7fc2ea" strokeWidth="2.2" />
        <circle cx="32" cy="43" r="5" fill="#ffe14d" />
      </g>
      <rect x="3.5" y="3.5" width="57" height="57" rx="13" fill="none" stroke="#ffe14d" strokeWidth="3" />
    </svg>
  )
}
