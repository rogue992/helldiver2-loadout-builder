import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react'

// 열린 모달의 닫기 함수 스택. Esc는 맨 위 하나만 닫는다(크레딧 위 확인창처럼 겹친 경우).
const stack: { current: () => void }[] = []
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && stack.length) stack[stack.length - 1].current()
}

/** Esc로 닫기. 겹쳐 열린 모달 중 가장 나중에 열린 것만 반응한다 */
export function useEscape(onClose: () => void): void {
  const ref = useRef(onClose)
  useEffect(() => {
    ref.current = onClose
  })
  useEffect(() => {
    const entry = ref
    stack.push(entry)
    if (stack.length === 1) window.addEventListener('keydown', onKey)
    return () => {
      stack.splice(stack.indexOf(entry), 1)
      if (stack.length === 0) window.removeEventListener('keydown', onKey)
    }
  }, [])
}

/**
 * 모달 배경용 props + Esc. 누르기와 떼기가 모두 배경 위일 때만 닫는다:
 * 안쪽(검색창 등)에서 드래그하다 배경에서 놓으면 브라우저가 배경에 click을 보내지만 닫지 않는다.
 */
export function useModal(onClose: () => void) {
  useEscape(onClose)
  const downOnBackdrop = useRef(false)
  return {
    role: 'presentation' as const,
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      downOnBackdrop.current = e.target === e.currentTarget
    },
    onClick: (e: MouseEvent<HTMLElement>) => {
      if (downOnBackdrop.current && e.target === e.currentTarget) onClose()
      downOnBackdrop.current = false
    },
  }
}
