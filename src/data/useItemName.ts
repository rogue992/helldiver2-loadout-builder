import { useStore } from '../store/useStore'
import type { Item } from './types'

/** 화면 언어에 따른 아이템 이름: 영문이면 wiki 이름, 아니면 한글 이름 */
export function useItemName(): (item: Item) => string {
  const lang = useStore((s) => s.settings.nameDisplay)
  return (item) => (lang === 'en' ? item.nameEn : item.nameKo)
}
