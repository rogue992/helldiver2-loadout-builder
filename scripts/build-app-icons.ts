// 앱 아이콘(호출 비컨) PNG를 public/icon.svg 한 장에서 만든다. 그림을 고치면 다시 돌린다: npm run icons:app
import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const svg = readFileSync('public/icon.svg')
const out: [string, number][] = [
  ['public/favicon-32.png', 32],
  ['public/apple-touch-icon.png', 180],
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
]
for (const [file, size] of out) {
  await sharp(svg, { density: Math.ceil((72 * size) / 64) }).resize(size, size).png().toFile(file)
  console.log(file, size)
}
