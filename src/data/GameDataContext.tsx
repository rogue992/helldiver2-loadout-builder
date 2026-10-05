import { createContext, useContext } from 'react'
import type { GameData } from './loadData'

const Ctx = createContext<GameData | null>(null)

export const GameDataProvider = Ctx.Provider

export function useGameData(): GameData {
  const v = useContext(Ctx)
  if (!v) throw new Error('GameDataProvider 밖에서 useGameData를 호출했습니다')
  return v
}
