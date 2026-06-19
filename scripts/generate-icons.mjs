import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const pub = resolve(here, "../public");
const iconsDir = resolve(pub, "icons");
mkdirSync(iconsDir, { recursive: true });

// ---- minimal PNG (RGBA, 8-bit) encoder ----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "latin1");
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// Tsuki moon glyph on infinite black.
function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size * 0.6;
  const cy = size * 0.42;
  const r = size * 0.27;
  // moon palette (approx oklch violet ramp in sRGB)
  const bright = [196, 178, 255];
  const mid = [142, 108, 240];
  const dim = [78, 52, 150];
  const bg = [7, 7, 13];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // background with a faint corner glow
      const gx = (x - size * 0.18) / size;
      const gy = (y + size * 0.1) / size;
      const corner = clamp01(1 - Math.hypot(gx, gy) * 1.3) * 0.5;
      let R = bg[0] + corner * 30;
      let G = bg[1] + corner * 24;
      let B = bg[2] + corner * 60;

      const d = Math.hypot(x - cx, y - cy);
      // outer glow
      if (d > r) {
        const g = Math.exp(-(d - r) / (r * 0.55));
        R += mid[0] * g * 0.5;
        G += mid[1] * g * 0.5;
        B += mid[2] * g * 0.7;
      } else {
        // moon body: bright core to dim edge, with a soft top-left highlight
        const t = smooth(clamp01(d / r));
        const hx = (x - (cx - r * 0.3)) / r;
        const hy = (y - (cy - r * 0.3)) / r;
        const hi = clamp01(1 - Math.hypot(hx, hy)) * 0.4;
        R = lerp(bright[0], dim[0], t) + hi * 40;
        G = lerp(bright[1], dim[1], t) + hi * 40;
        B = lerp(bright[2], dim[2], t) + hi * 40;
      }
      buf[i] = Math.min(255, Math.round(R));
      buf[i + 1] = Math.min(255, Math.round(G));
      buf[i + 2] = Math.min(255, Math.round(B));
      buf[i + 3] = 255;
    }
  }
  return buf;
}

for (const size of [192, 512]) {
  writeFileSync(resolve(iconsDir, `icon-${size}.png`), encodePNG(size, size, render(size)));
}
writeFileSync(resolve(pub, "apple-touch-icon.png"), encodePNG(180, 180, render(180)));

// SVG favicon
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#07070d"/>
  <defs>
    <radialGradient id="m" cx="42%" cy="36%" r="62%">
      <stop offset="0" stop-color="#c4b2ff"/>
      <stop offset="62%" stop-color="#7a52e6"/>
      <stop offset="100%" stop-color="#3a2a78"/>
    </radialGradient>
  </defs>
  <circle cx="38" cy="27" r="17" fill="url(#m)"/>
  <circle cx="38" cy="27" r="17" fill="none" stroke="#b9a6ff" stroke-opacity="0.25"/>
</svg>`;
writeFileSync(resolve(pub, "favicon.svg"), favicon);

console.log("Icons generated in public/ and public/icons/");
