import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages 프로젝트 사이트 경로. 라우팅은 해시만 쓰므로 rewrite가 필요 없다.
export default defineConfig({
  base: '/helldiver2-loadout-builder/',
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
  },
})
