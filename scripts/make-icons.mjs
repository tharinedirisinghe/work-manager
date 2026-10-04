// Generates the PWA PNG icons from the Work Manager mark (see src/components/Logo.tsx) without image libraries.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BRAND = [0x2f, 0x5f, 0x58]
// The three stepping cards on a 64-unit grid: [x, y, size, radius, opacity].
const CARDS = [
  [13, 33, 18, 5, 0.35],
  [23, 23, 18, 5, 0.6],
  [33, 13, 18, 5, 1],
]

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

/** Coverage (0..1) of a rounded rectangle at pixel centre (px, py), with 1px antialiasing. */
function roundRect(px, py, x, y, w, h, r) {
  const qx = Math.abs(px - (x + w / 2)) - (w / 2 - r)
  const qy = Math.abs(py - (y + h / 2)) - (h / 2 - r)
  const dist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
  return Math.max(0, Math.min(1, 0.5 - dist))
}

/**
 * @param size  output size in px
 * @param maskable  full-bleed background with the mark inside the 80% safe zone (Android adaptive icons)
 */
function icon(size, maskable = false) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  const tile = maskable ? null : { r: 15 }
  // Maskable: shrink the mark to 70% around the centre so it survives circular masks.
  const scale = (size / 64) * (maskable ? 0.7 : 1)
  const offset = maskable ? (size - 64 * scale) / 2 : 0
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const px = x + 0.5
      const py = y + 0.5
      const bg = tile ? roundRect(px, py, 0, 0, size, size, tile.r * (size / 64)) : 1
      let [r, g, b] = BRAND
      for (const [cx, cy, s, cr, op] of CARDS) {
        const a = roundRect(px, py, offset + cx * scale, offset + cy * scale, s * scale, s * scale, cr * scale) * op
        r += (255 - r) * a
        g += (255 - g) * a
        b += (255 - b) * a
      }
      const o = y * (size * 4 + 1) + 1 + x * 4
      raw[o] = Math.round(r)
      raw[o + 1] = Math.round(g)
      raw[o + 2] = Math.round(b)
      raw[o + 3] = Math.round(bg * 255)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync('public/icon-192.png', icon(192))
writeFileSync('public/icon-512.png', icon(512))
writeFileSync('public/icon-maskable-512.png', icon(512, true))
console.log('Wrote public/icon-192.png, icon-512.png and icon-maskable-512.png')
