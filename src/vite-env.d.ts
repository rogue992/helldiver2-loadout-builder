/// <reference types="vite/client" />

/** 빌드 시각 기반 캐시 버스터 (vite.config.ts define). */
declare const __BUILD_ID__: string

/** 화면 버전과 빌드 정보 (vite.config.ts define). commit은 git이 없으면 null */
declare const __APP_BUILD__: { version: string; commit: string | null; date: string }
