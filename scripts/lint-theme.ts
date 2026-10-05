// 테마 계약 검사: data-theme 셀렉터·분기는 src/theme/*.css 와 PermitFrame · Stamp · Broadcast 안에서만.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'

const ALLOWED_COMPONENTS = new Set(['PermitFrame', 'Stamp', 'Broadcast'])
const failures: string[] = []

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

for (const f of walk('src')) {
  if (f.startsWith(join('src', 'theme') + '/')) continue
  // .css는 CSS 모듈이든 아니든 전부 본다(src/theme 밖의 일반 css도 계약 대상)
  if (!(f.endsWith('.tsx') || f.endsWith('.css') || f.endsWith('.ts'))) continue
  const stem = basename(f).replace(/\.module\.css$|\.css$|\.tsx$|\.ts$/, '')
  if (ALLOWED_COMPONENTS.has(stem)) continue
  // 테마 적용 자체(App에서 documentElement.dataset.theme 설정)는 허용: 'data-theme' 리터럴만 잡는다.
  const lines = readFileSync(f, 'utf8').split('\n')
  lines.forEach((l, i) => {
    if (l.includes('data-theme')) failures.push(`${f}:${i + 1}: ${l.trim()}`)
  })
}

if (failures.length) {
  console.error(`lint:theme 실패: 허용 범위 밖의 data-theme ${failures.length}건`)
  for (const f of failures) console.error('  ' + f)
  process.exit(1)
}
console.log('lint:theme OK')
