// 허가서 + 슬롯을 그대로 PNG로. 현재 테마 DOM을 캔버스로 찍는다(테마별 작업 없음).
import { toPng } from 'html-to-image'
import { triggerDownload } from '../share/json'

/** data-export="skip"이 붙은 요소(버튼 줄 등)는 이미지에서 뺀다 */
const keep = (node: HTMLElement) => !(node instanceof HTMLElement && node.dataset.export === 'skip')

/** 실패하면 예외를 던진다. 서체를 못 넣어 시스템 서체로 다시 찍었으면 fontFallback. */
export async function exportElementPng(el: HTMLElement, fileName: string): Promise<{ fontFallback: boolean }> {
  const opts = { pixelRatio: 2, cacheBust: true, filter: keep, backgroundColor: getComputedStyle(document.body).backgroundColor }
  let fontFallback = false
  let dataUrl: string
  try {
    dataUrl = await toPng(el, opts)
  } catch {
    // 웹폰트 CSS를 못 가져오는 경우(CORS 등): 폰트 포함을 끄고 한 번 더. 이것도 실패하면 호출 쪽이 알린다
    fontFallback = true
    dataUrl = await toPng(el, { ...opts, skipFonts: true })
  }
  triggerDownload(dataUrl, fileName)
  return { fontFallback }
}
