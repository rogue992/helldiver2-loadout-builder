// helldivers.wiki.gg Cargo API 호출. 요청 간격 1.5초, 식별 UA, 429는 1회 재시도 후 중단.

export const WIKI_API = 'https://helldivers.wiki.gg/api.php'
export const USER_AGENT = 'hd2-loadout-builder (github.com/rogue992/helldiver2-loadout-builder)'
const DELAY_MS = 1500

let lastCall = 0

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function throttle() {
  const wait = lastCall + DELAY_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastCall = Date.now()
}

export async function wikiGet(params: Record<string, string>): Promise<unknown> {
  const url = new URL(WIKI_API)
  for (const [k, v] of Object.entries({ ...params, format: 'json' })) url.searchParams.set(k, v)
  for (let attempt = 0; attempt < 2; attempt++) {
    await throttle()
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (res.status === 429) {
      const retry = Number(res.headers.get('retry-after')) || 30
      console.warn(`429 from wiki, waiting ${retry}s before one retry`)
      await sleep(retry * 1000)
      continue
    }
    if (!res.ok) throw new Error(`wiki ${res.status} ${res.statusText}: ${url}`)
    return res.json()
  }
  throw new Error(`wiki 429 persisted: ${url}`)
}

export type CargoRow = Record<string, string>

/** Cargo 테이블 전량 조회(limit 500, 넘치면 offset으로 이어 받음). */
export async function cargoQuery(table: string, fields: string[], where?: string): Promise<CargoRow[]> {
  const rows: CargoRow[] = []
  for (let offset = 0; ; offset += 500) {
    const params: Record<string, string> = {
      action: 'cargoquery',
      tables: table,
      fields: fields.join(','),
      limit: '500',
      offset: String(offset),
    }
    if (where) params.where = where
    const json = (await wikiGet(params)) as { cargoquery?: { title: CargoRow }[]; error?: { info: string } }
    if (json.error) throw new Error(`cargoquery ${table}: ${json.error.info}`)
    const page = (json.cargoquery ?? []).map((r) => r.title)
    rows.push(...page)
    if (page.length < 500) break
  }
  return rows
}

export interface ImageInfo {
  url: string
  thumbUrl: string | null
  mime: string
}

/** 한 번에 물을 수 있는 titles 수(MediaWiki 일반 사용자 한도) */
const TITLES_PER_QUERY = 50

/**
 * 파일명 여러 개 → 실제 URL. `iiurlwidth`를 주면 썸네일 URL(`thumburl`)도 온다(SVG는 원본 URL 그대로).
 * 50개씩 묶어 묻는다. 위키가 제목을 정규화(밑줄 → 공백 등)해 돌려주므로 normalized로 원래 파일명에 다시 붙인다.
 * 위키에 없는 파일은 결과 Map에 없다.
 */
export async function imageInfos(fileNames: string[], width?: number): Promise<Map<string, ImageInfo>> {
  const out = new Map<string, ImageInfo>()
  const uniq = [...new Set(fileNames.filter(Boolean))]
  for (let i = 0; i < uniq.length; i += TITLES_PER_QUERY) {
    const chunk = uniq.slice(i, i + TITLES_PER_QUERY)
    const params: Record<string, string> = {
      action: 'query',
      titles: chunk.map((f) => `File:${f}`).join('|'),
      prop: 'imageinfo',
      iiprop: 'url|mime',
    }
    if (width) params.iiurlwidth = String(width)
    const json = (await wikiGet(params)) as {
      query?: {
        normalized?: { from: string; to: string }[]
        pages?: Record<string, { title: string; imageinfo?: { url: string; thumburl?: string; mime: string }[] }>
      }
    }
    const norm = new Map((json.query?.normalized ?? []).map((n) => [n.from, n.to]))
    const byTitle = new Map(Object.values(json.query?.pages ?? {}).map((p) => [p.title, p.imageinfo?.[0]]))
    for (const f of chunk) {
      const t = `File:${f}`
      const info = byTitle.get(norm.get(t) ?? t)
      if (info) out.set(f, { url: info.url, thumbUrl: info.thumburl ?? null, mime: info.mime })
    }
  }
  return out
}

/** 요청 간격 제한은 위키에만 건다(GitHub raw 등 다른 호스트는 기다리지 않는다) */
export async function download(url: string): Promise<Buffer> {
  if (new URL(url).hostname.endsWith('wiki.gg')) await throttle()
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`download ${res.status}: ${url}`)
  return Buffer.from(await res.arrayBuffer())
}
