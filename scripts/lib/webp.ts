// sharp는 devDependency. 없으면 어디서 왜 실패했는지 바로 알 수 있게 메시지를 남긴다.

type Sharp = (typeof import('sharp'))['default']

let sharpMod: Sharp | null = null

async function loadSharp(): Promise<Sharp> {
  if (sharpMod) return sharpMod
  try {
    sharpMod = (await import('sharp')).default
    return sharpMod
  } catch {
    throw new Error('sharp가 설치되어 있지 않습니다. `npm install` 후 다시 실행하세요 (icons:fetch 전용).')
  }
}

export interface ResizeSpec {
  /** 폭 기준 축소(높이는 비율). `height`와 함께 주면 contain. */
  width?: number
  height?: number
  quality: number
}

export async function toWebp(input: Buffer, spec: ResizeSpec): Promise<Buffer> {
  const sharp = await loadSharp()
  let img = sharp(input)
  if (spec.width || spec.height) {
    img = img.resize({ width: spec.width, height: spec.height, fit: 'inside', withoutEnlargement: true })
  }
  return img.webp({ quality: spec.quality }).toBuffer()
}

/** 투명 여백 제거. wiki 무기 렌더는 3840×2160 프레임 가운데에 작게 놓여 있어 그대로 쓰면 타일 안에서 작고 치우친다. */
export async function trimAlpha(input: Buffer): Promise<Buffer> {
  const sharp = await loadSharp()
  return sharp(input).trim({ threshold: 10 }).png().toBuffer()
}

const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 }

/**
 * 방어구 상체 정사각 크롭(SES와 같은 프레이밍). 전신 렌더의 투명 여백을 지운 뒤
 * 머리(위 18%)의 가로 중심을 기준으로 턱 아래(13%)부터 허벅지(60%)까지 정사각형으로 잘라낸다.
 * 망토가 한쪽으로 퍼진 렌더도 몸 중심이 잡히도록 머리 bbox를 쓴다. 렌더가 너무 작아 잘라낼 수 없으면 전신을 정사각형에 contain.
 * sharp 오류는 그대로 던진다(호출 쪽이 그 아이템을 실패로 보고한다).
 */
export async function torsoCrop(input: Buffer): Promise<Buffer> {
  const sharp = await loadSharp()
  const body = await sharp(input).trim({ threshold: 10 }).png().toBuffer({ resolveWithObject: true })
  const w = body.info.width
  const h = body.info.height
  const side = Math.round(h * 0.47)
  const top = Math.round(h * 0.13)
  if (side < 1 || top + side > h) {
    const s = Math.max(w, h)
    return sharp(body.data)
      .extend({ left: Math.floor((s - w) / 2), right: Math.ceil((s - w) / 2), top: Math.floor((s - h) / 2), bottom: Math.ceil((s - h) / 2), background: CLEAR })
      .png()
      .toBuffer()
  }
  const headH = Math.max(1, Math.round(h * 0.18))
  const head = await sharp(body.data).extract({ left: 0, top: 0, width: w, height: headH }).trim({ threshold: 10 }).toBuffer({ resolveWithObject: true })
  const cx = -(head.info.trimOffsetLeft ?? 0) + head.info.width / 2
  const width = Math.min(side, w)
  const left = Math.max(0, Math.min(Math.round(cx - width / 2), w - width))
  let img = sharp(body.data).extract({ left, top, width, height: side })
  if (width < side) {
    const pad = side - width
    img = img.extend({ left: Math.floor(pad / 2), right: Math.ceil(pad / 2), background: CLEAR })
  }
  return img.png().toBuffer()
}
