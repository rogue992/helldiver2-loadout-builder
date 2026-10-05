import { useStore } from '../store/useStore'
import type { Item } from './types'

/** 설정(한글 / 한 + 영 / 영문)에 따른 표시 이름. */
export function useItemName(): (item: Item) => string {
  const mode = useStore((s) => s.settings.nameDisplay)
  return (item) => {
    if (mode === 'en') return item.nameEn
    if (mode === 'both' && item.nameKo !== item.nameEn) return `${item.nameKo} (${item.nameEn})`
    return item.nameKo
  }
}
