import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { LoadoutRace, Race } from '../data/factions'
import type { Aliases } from '../data/types'
import { resolveAlias } from '../data/loadData'
import { defaultLoadout, ensureDefault, isDefaultLoadout } from './defaults'
import { sanitizeDraft, sanitizeLoadouts, sanitizeSettings } from './sanitize'
import { assignView } from '../rules/assign'
import {
  DEFAULT_SETTINGS,
  EMPTY_GEAR,
  STORAGE_KEY,
  defaultSizes,
  emptyPools,
  newId,
  sizesOf,
  type Draft,
  type Favorites,
  type GearSlot,
  type Loadout,
  type PersistedState,
  type PoolSize,
  type PoolSizes,
  type Pools,
  type Settings,
} from './types'

export interface UiState {
  race: Race | 'all'
  faction: string | 'all'
  sidebarOpen: boolean
  settingsOpen: boolean
}

/** 삭제 결과. 열려 있던 것을 지웠으면 그때의 초안(저장 안 한 편집 포함)도 함께 돌려줘 되돌리기가 그대로 복원한다. */
export interface Removed {
  loadout: Loadout
  draft: Draft | null
}

interface Actions {
  // draft 생명주기
  /** 신규 배정: 전선 미지정 빈 허가서를 연다. 목록에는 종족을 고를 때(assignRace) 들어간다 */
  startNew: () => void
  /** 전선 미지정 허가서에 종족을 정해 목록에 발급한다. 다른 종족을 보고 있었으면 필터도 그 종족으로 옮긴다 */
  assignRace: (race: LoadoutRace) => Loadout | null
  openLoadout: (id: string) => void
  editDraft: (patch: Partial<Pick<Loadout, 'name' | 'race' | 'faction'>>) => void
  setGear: (slot: GearSlot, itemId: string | null) => void
  setPool: (slotIndex: number, ids: string[]) => void
  setPoolSize: (slotIndex: number, size: PoolSize) => void
  /** 배정 내역(장비 · 후보)만 비운다. 이름 · 종족 · 팩션은 유지 */
  clearDraft: () => void
  saveDraft: () => Loadout | null
  // 목록
  removeLoadout: (id: string) => Removed | null
  restoreLoadout: (removed: Removed) => void
  duplicateLoadout: (id: string) => Loadout | null
  reorder: (orderedIds: string[]) => void
  replaceAll: (loadouts: Loadout[], settings?: Settings) => void
  mergeLoadouts: (incoming: Loadout[]) => void
  // 설정 · UI
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  /** 설정만 통째로 바꾼다(가져오기 병합 + 설정). 초안은 건드리지 않는다 */
  setSettings: (settings: Settings) => void
  toggleUnownedWarbond: (id: string) => void
  setUnownedWarbonds: (ids: string[]) => void
  /** 그 종족 즐겨찾기에 넣거나 뺀다 */
  toggleFavorite: (race: LoadoutRace, itemId: string) => void
  setUi: (patch: Partial<UiState>) => void
  applyAliases: (aliases: Aliases, validWarbondIds: Set<string>) => void
}

export type Store = PersistedState & { ui: UiState } & Actions

const now = () => new Date().toISOString()

/** order를 목록 위치(0..n-1)로 다시 매긴다. 삭제 · 복원 · 병합 뒤 번호가 겹치거나 비는 것을 막는다. */
function normalize(loadouts: Loadout[]): Loadout[] {
  return [...loadouts].sort((a, b) => a.order - b.order).map((l, i) => (l.order === i ? l : { ...l, order: i }))
}

/** 사용자 로드아웃 수 + 1부터 비어 있는 번호. 기본 로드아웃은 세지 않는다. */
function nextName(loadouts: Loadout[]): string {
  const taken = new Set(loadouts.map((l) => l.name))
  for (let n = loadouts.filter((l) => !isDefaultLoadout(l.id)).length + 1; ; n++) {
    const name = `로드아웃 ${n}`
    if (!taken.has(name)) return name
  }
}

function blank(loadouts: Loadout[]): Loadout {
  return {
    id: newId(), name: nextName(loadouts), race: 'all', faction: 'default',
    gear: { ...EMPTY_GEAR }, pools: emptyPools(), sizes: defaultSizes(), order: loadouts.length, createdAt: now(), updatedAt: now(),
  }
}

/** 기본 로드아웃은 어떤 편집도 받지 않는다(복제만 가능) */
const locked = (d: Draft | null): boolean => !!d && isDefaultLoadout(d.id)
/** 슬롯 · 장비를 바꿀 수 없는 초안: 기본 로드아웃, 전선 미지정(종족을 고르면 열린다) */
const frozen = (d: Draft | null): boolean => !d || locked(d) || !!d.needsRace

function toDraft(l: Loadout): Draft {
  return { ...l, gear: { ...l.gear }, pools: l.pools.map((p) => [...p]) as Pools, sizes: sizesOf(l), dirty: false }
}

/** 초안 전용 필드(dirty · needsRace)를 걷어 낸 로드아웃. 목록에 넣는 곳은 모두 이것을 거친다 */
function fromDraft(d: Draft): Loadout {
  const { dirty: _d, needsRace: _n, ...l } = d
  void _d
  void _n
  return l
}

function remapLoadout(l: Loadout, aliases: Aliases): Loadout {
  const map = (id: string | null) => (id ? resolveAlias(aliases, id) : id)
  return {
    ...l,
    gear: { armor: map(l.gear.armor), primary: map(l.gear.primary), secondary: map(l.gear.secondary), throwable: map(l.gear.throwable) },
    pools: l.pools.map((p) => p.map((id) => resolveAlias(aliases, id))) as Pools,
  }
}

/**
 * 이 브라우저에 저장 기록이 있었는지. 앱이 처음 무엇이든 저장하기 전(스토어를 만들기 전)에 잰다.
 * 처음 온 사람에게는 신규 채권 공고를 띄우지 않는 데 쓴다.
 */
export const hadSavedState = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return false
  }
})()

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      loadouts: [defaultLoadout()],
      draft: null,
      settings: DEFAULT_SETTINGS,
      ui: { race: 'all', faction: 'all', sidebarOpen: true, settingsOpen: false },

      startNew: () => set((s) => ({ draft: { ...toDraft(blank(s.loadouts)), needsRace: true } })),
      assignRace: (race) => {
        const { draft, loadouts, ui } = get()
        if (!draft?.needsRace) return null
        const { faction, view } = assignView(race, ui)
        const rest = fromDraft(draft)
        const l: Loadout = { ...rest, name: rest.name.trim() ? rest.name : nextName(loadouts), race, faction, order: loadouts.length, createdAt: now(), updatedAt: now() }
        set({ loadouts: normalize([...loadouts, l]), draft: toDraft(l), ...(view ? { ui: { ...ui, ...view } } : {}) })
        return l
      },
      openLoadout: (id) => {
        const l = get().loadouts.find((x) => x.id === id)
        if (l) set({ draft: toDraft(l) })
      },
      editDraft: (patch) => set((s) => (s.draft && !locked(s.draft) ? { draft: { ...s.draft, ...patch, dirty: true } } : {})),
      setGear: (slot, itemId) => set((s) => (s.draft && !frozen(s.draft) ? { draft: { ...s.draft, gear: { ...s.draft.gear, [slot]: itemId }, dirty: true } } : {})),
      setPool: (slotIndex, ids) =>
        set((s) => {
          if (!s.draft || frozen(s.draft)) return {}
          const size = sizesOf(s.draft)[slotIndex]
          const pools = s.draft.pools.map((p, i) => (i === slotIndex ? ids.slice(0, size) : p)) as Pools
          return { draft: { ...s.draft, pools, dirty: true } }
        }),
      setPoolSize: (slotIndex, size) =>
        set((s) => {
          // 같은 칸 수를 다시 누르면 아무것도 바뀌지 않는다(저장 안 한 변경으로 치지 않게)
          if (!s.draft || frozen(s.draft) || sizesOf(s.draft)[slotIndex] === size) return {}
          const sizes = sizesOf(s.draft).map((v, i) => (i === slotIndex ? size : v)) as PoolSizes
          // 칸을 줄이면 뒤쪽 후보부터 빠진다.
          const pools = s.draft.pools.map((p, i) => (i === slotIndex ? p.slice(0, size) : p)) as Pools
          return { draft: { ...s.draft, sizes, pools, dirty: true } }
        }),
      clearDraft: () => set((s) => (s.draft && !frozen(s.draft) ? { draft: { ...s.draft, gear: { ...EMPTY_GEAR }, pools: emptyPools(), dirty: true } } : {})),
      saveDraft: () => {
        const { draft, loadouts } = get()
        if (!draft || frozen(draft)) return null
        const rest = fromDraft(draft)
        // 순서는 목록의 현재 값을 따른다. 초안이 열린 뒤 드래그 · 복제 · 삭제로 목록 순서가 바뀌었을 수 있다
        const current = loadouts.find((l) => l.id === rest.id)
        const name = rest.name.trim() ? rest.name : current?.name ?? nextName(loadouts)
        const saved: Loadout = { ...rest, name, updatedAt: now(), order: current ? current.order : loadouts.length }
        const exists = !!current
        set({
          loadouts: normalize(exists ? loadouts.map((l) => (l.id === saved.id ? saved : l)) : [...loadouts, saved]),
          draft: toDraft(saved),
        })
        return saved
      },

      removeLoadout: (id) => {
        if (isDefaultLoadout(id)) return null
        const { loadouts, draft } = get()
        const sorted = normalize(loadouts)
        const idx = sorted.findIndex((x) => x.id === id)
        if (idx < 0) return null
        const removed = sorted[idx]
        const rest = normalize(sorted.filter((x) => x.id !== id))
        // 열려 있던 것을 지우면 이웃(아래, 없으면 위)을 연다. 편집 중이던 다른 로드아웃은 그대로.
        let nextDraft: Draft | null = draft
        const wasOpen = draft?.id === id
        if (wasOpen) {
          const neighbor = rest[Math.min(idx, rest.length - 1)]
          nextDraft = neighbor ? toDraft(neighbor) : null
        }
        set({ loadouts: rest, draft: nextDraft })
        return { loadout: removed, draft: wasOpen ? draft : null }
      },
      restoreLoadout: ({ loadout, draft }) =>
        set((s) => {
          // order == 삭제 전 위치. 그 자리에 다시 끼운다. 열려 있던 것이면 지울 때의 초안으로 다시 연다
          const list = normalize(s.loadouts.filter((l) => l.id !== loadout.id))
          const at = Math.min(Math.max(0, loadout.order), list.length)
          list.splice(at, 0, loadout)
          const loadouts = list.map((l, i) => ({ ...l, order: i }))
          return { loadouts, ...(draft ? { draft: { ...draft, order: at } } : {}) }
        }),
      duplicateLoadout: (id) => {
        const { loadouts } = get()
        const src = loadouts.find((x) => x.id === id)
        if (!src) return null
        const copy: Loadout = { ...src, id: newId(), name: `${src.name} (복제)`, order: src.order + 0.5, createdAt: now(), updatedAt: now(), gear: { ...src.gear }, pools: src.pools.map((p) => [...p]) as Pools, sizes: sizesOf(src) }
        const renumbered = normalize([...loadouts, copy])
        set({ loadouts: renumbered })
        return renumbered.find((l) => l.id === copy.id) ?? copy
      },
      reorder: (orderedIds) =>
        set((s) => {
          // 필터된 목록 안의 상대 순서만 바꾼다: 해당 id들이 차지하던 order 값을 새 순서대로 재배정.
          const slots = s.loadouts.filter((l) => orderedIds.includes(l.id)).map((l) => l.order).sort((a, b) => a - b)
          const orderOf = new Map(orderedIds.map((id, i) => [id, slots[i]]))
          return { loadouts: normalize(s.loadouts.map((l) => (orderOf.has(l.id) ? { ...l, order: orderOf.get(l.id)! } : l))) }
        }),
      replaceAll: (loadouts, settings) => set((s) => ({ loadouts: normalize(ensureDefault(loadouts)), draft: null, settings: settings ? sanitizeSettings(settings) : s.settings })),
      mergeLoadouts: (incoming) =>
        set((s) => {
          const byId = new Map(s.loadouts.map((l) => [l.id, l]))
          let order = s.loadouts.length
          for (const l of incoming) {
            if (isDefaultLoadout(l.id)) continue
            if (byId.has(l.id)) byId.set(l.id, { ...l, order: byId.get(l.id)!.order })
            else byId.set(l.id, { ...l, order: order++ })
          }
          return { loadouts: normalize([...byId.values()]) }
        }),

      setSetting: (key, value) => set((s) => ({ settings: { ...s.settings, [key]: value } })),
      setSettings: (settings) => set({ settings: sanitizeSettings(settings) }),
      toggleUnownedWarbond: (id) =>
        set((s) => {
          const set_ = new Set(s.settings.unownedWarbonds)
          if (set_.has(id)) set_.delete(id)
          else set_.add(id)
          return { settings: { ...s.settings, unownedWarbonds: [...set_] } }
        }),
      setUnownedWarbonds: (ids) => set((s) => ({ settings: { ...s.settings, unownedWarbonds: [...new Set(ids)] } })),
      toggleFavorite: (race, itemId) =>
        set((s) => {
          const list = s.settings.favorites[race]
          const next = list.includes(itemId) ? list.filter((x) => x !== itemId) : [...list, itemId]
          return { settings: { ...s.settings, favorites: { ...s.settings.favorites, [race]: next } } }
        }),
      setUi: (patch) => set((s) => ({ ui: { ...s.ui, ...patch } })),
      applyAliases: (aliases, validWarbondIds) =>
        set((s) => ({
          loadouts: s.loadouts.map((l) => remapLoadout(l, aliases)),
          draft: s.draft ? { ...s.draft, ...remapLoadout(s.draft, aliases) } : null,
          settings: {
            ...s.settings,
            unownedWarbonds: s.settings.unownedWarbonds.map((id) => resolveAlias(aliases, id)).filter((id) => validWarbondIds.has(id)),
            favorites: Object.fromEntries(Object.entries(s.settings.favorites).map(([race, ids]) => [race, [...new Set(ids.map((id) => resolveAlias(aliases, id)))]])) as Favorites,
          },
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ loadouts: s.loadouts, draft: s.draft, settings: s.settings }),
      migrate: (persisted) => persisted as PersistedState,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Record<keyof PersistedState, unknown>>
        return {
          ...current,
          loadouts: normalize(ensureDefault(sanitizeLoadouts(p.loadouts))),
          draft: sanitizeDraft(p.draft),
          settings: sanitizeSettings(p.settings),
        }
      },
    },
  ),
)

/**
 * 다른 탭의 변경 반영: loadouts · settings만. 편집 중인 draft는 덮지 않는다.
 * 반영도 persist를 거쳐 이 탭의 초안과 함께 다시 저장되므로, 이미 같은 값이면 건너뛴다.
 * 건너뛰지 않으면 두 탭이 서로의 쓰기를 받아 끝없이 다시 쓴다.
 */
export function subscribeCrossTab() {
  const handler = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return
    try {
      const parsed = JSON.parse(e.newValue) as { state?: Partial<Record<keyof PersistedState, unknown>> }
      const st = parsed.state
      if (!st) return
      const s = useStore.getState()
      const loadouts = st.loadouts ? normalize(ensureDefault(sanitizeLoadouts(st.loadouts))) : s.loadouts
      const settings = st.settings ? sanitizeSettings(st.settings) : s.settings
      // 같은 정규화를 거친 형태로 비교한다(키 순서 차이로 다르다고 보지 않게)
      const canon = (ls: unknown, st_: unknown) => JSON.stringify([sanitizeLoadouts(ls), sanitizeSettings(st_)])
      if (canon(loadouts, settings) === canon(s.loadouts, s.settings)) return
      useStore.setState({ loadouts, settings })
    } catch {
      /* 다른 탭이 깨진 값을 썼으면 무시 */
    }
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
