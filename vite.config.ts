import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

/** git 출력 한 줄. git이 없거나 기록이 모자라면(얕은 클론) null */
function git(args: string): string | null {
  try {
    return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null
  } catch {
    return null
  }
}

/** 화면 버전: major.minor는 package.json, patch는 그 version 줄을 바꾼 커밋 뒤의 커밋 수라 배포마다 오른다(CI는 fetch-depth: 0) */
function appVersion(): string {
  const [major, minor] = pkg.version.split('.')
  const base = git(`log -1 --format=%H -G'"version":' -- package.json`)
  const patch = base ? git(`rev-list --count ${base}..HEAD`) : null
  return `${major}.${minor}.${patch ?? 0}`
}

// GitHub Pages 프로젝트 사이트 경로. 라우팅은 해시만 쓰므로 rewrite가 필요 없다.
export default defineConfig(({ command }) => ({
  base: '/helldiver2-loadout-builder/',
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
    __APP_BUILD__: JSON.stringify({
      // 로컬 개발 서버는 배포본과 구분되게 -dev를 붙인다
      version: appVersion() + (command === 'serve' ? '-dev' : ''),
      commit: git('rev-parse --short HEAD'),
      date: new Date().toISOString().slice(0, 10),
    }),
  },
}))
