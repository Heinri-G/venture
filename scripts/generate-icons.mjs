/**
 * Generates PWA/app icons as raw PNGs (no dependencies).
 * Replicates the favicon: cream rounded square with a slate-blue compass mark.
 * Usage: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICON_SIZE = 32;
const RADIUS = 8;
const BG = [0xf7, 0xf3, 0xea]; // cream
const MARK = [0x7d, 0x8f, 0xc4]; // slate blue
const COMPASS_CX = 16;
const COMPASS_CY = 16;
const COMPASS_SCALE = 0.62;

// Bezier petals: [tipY, bottomY, controlXs, controlYs] in compass units.
const BIG_PETAL = { tipY: -22, bottomY: 2, xs: [0, 6, 6.5, 0], ys: [-22, -16, -5, 2] };
const SMALL_PETAL = { tipY: -12, bottomY: 2, xs: [0, 4, 4.5, 0], ys: [-12, -8.5, -3.5, 2] };

const PETALS = [];
for (const deg of [0, 90, 180, 270]) PETALS.push({ ...BIG_PETAL, rad: (deg * Math.PI) / 180 });
for (const deg of [45, 135, 225, 315]) PETALS.push({ ...SMALL_PETAL, rad: (deg * Math.PI) / 180 });

function cubic(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

// Binary search t for a target y (curves are y-monotonic in [tipY, bottomY]).
function widthAtY(petal, y) {
  if (y < petal.tipY || y > petal.bottomY) return null;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 28; i++) {
    const t = (lo + hi) / 2;
    const py = cubic(petal.ys[0], petal.ys[1], petal.ys[2], petal.ys[3], t);
    if (py < y) lo = t;
    else hi = t;
  }
  return cubic(petal.xs[0], petal.xs[1], petal.xs[2], petal.xs[3], (lo + hi) / 2);
}

function insideRoundedRect(px, py) {
  if (px < 0 || py < 0 || px >= ICON_SIZE || py >= ICON_SIZE) return false;
  const rx = Math.min(px, ICON_SIZE - 1 - px);
  const ry = Math.min(py, ICON_SIZE - 1 - py);
  if (rx >= RADIUS || ry >= RADIUS) return true;
  const dx = RADIUS - rx;
  const dy = RADIUS - ry;
  return dx * dx + dy * dy <= RADIUS * RADIUS;
}

function insideCompass(u, v) {
  if (u * u + v * v <= 3 * 3) return true;
  for (const petal of PETALS) {
    const c = Math.cos(-petal.rad);
    const s = Math.sin(-petal.rad);
    const u2 = u * c - v * s;
    const v2 = u * s + v * c;
    const w = widthAtY(petal, v2);
    if (w != null && Math.abs(u2) <= w) return true;
  }
  return false;
}

// Renders the icon at `size` (already scaled by `supersample` for anti-aliasing).
function renderIcon(renderSize) {
  const scale = renderSize / ICON_SIZE;
  const pixels = Buffer.alloc(renderSize * renderSize * 4);
  for (let py = 0; py < renderSize; py++) {
    for (let px = 0; px < renderSize; px++) {
      // Sample at pixel center in icon space.
      const ix = (px + 0.5) / scale;
      const iy = (py + 0.5) / scale;
      const idx = (py * renderSize + px) * 4;
      if (!insideRoundedRect(ix, iy)) continue; // transparent
      const u = (ix - COMPASS_CX) / COMPASS_SCALE;
      const v = (iy - COMPASS_CY) / COMPASS_SCALE;
      const color = insideCompass(u, v) ? MARK : BG;
      pixels[idx] = color[0];
      pixels[idx + 1] = color[1];
      pixels[idx + 2] = color[2];
      pixels[idx + 3] = 255;
    }
  }
  return pixels;
}

function downsample(src, srcSize, dstSize) {
  const ratio = srcSize / dstSize;
  const dst = Buffer.alloc(dstSize * dstSize * 4);
  for (let dy = 0; dy < dstSize; dy++) {
    for (let dx = 0; dx < dstSize; dx++) {
      const sxs = Math.floor(dx * ratio);
      const sys = Math.floor(dy * ratio);
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let y = sys; y < sys + ratio; y++) {
        for (let x = sxs; x < sxs + ratio; x++) {
          const i = (y * srcSize + x) * 4;
          r += src[i]; g += src[i + 1]; b += src[i + 2]; a += src[i + 3]; n++;
        }
      }
      const o = (dy * dstSize + dx) * 4;
      dst[o] = Math.round(r / n);
      dst[o + 1] = Math.round(g / n);
      dst[o + 2] = Math.round(b / n);
      dst[o + 3] = Math.round(a / n);
    }
  }
  return dst;
}

// ---- PNG encoding ----
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// Render at 2x supersample, then downsample.
const SS = 2;
for (const size of [192, 512]) {
  const hi = renderIcon(size * SS);
  const rgba = downsample(hi, size * SS, size);
  writeFileSync(join(outDir, `icon-${size}.png`), encodePng(rgba, size));
  console.log(`Wrote public/icons/icon-${size}.png`);
}
