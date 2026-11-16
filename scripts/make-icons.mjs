// Writes the PWA icons (dark square, amber ring + dot) as PNGs. No dependencies.
import fs from 'node:fs'
import zlib from 'node:zlib'

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (type, data) => { const t = Buffer.from(type), len = Buffer.alloc(4), cr = Buffer.alloc(4); len.writeUInt32BE(data.length); cr.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, cr]) }

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size), cx = size / 2, cy = size / 2
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / size
      const ring = Math.abs(d - 0.3) < 0.045, dot = d < 0.075
      const on = ring || dot
      const i = y * (size * 4 + 1) + 1 + x * 4
      raw[i] = on ? 255 : 10; raw[i + 1] = on ? 176 : 10; raw[i + 2] = on ? 0 : 11; raw[i + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}
for (const [name, size] of [['icon-180', 180], ['icon-192', 192], ['icon-512', 512]]) fs.writeFileSync(`icons/${name}.png`, png(size))
console.log('icons written')
