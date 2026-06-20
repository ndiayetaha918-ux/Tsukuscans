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

// Tsuki crescent-moon glyph on infinite black.
function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  // big disc
  const cx = size * 0.56, cy = size * 0.5, r = size * 0.34;
  // carve disc (offset up-right) makes the crescent
  const cx2 = size * 0.72, cy2 = size * 0.36, r2 = size * 0.3;
  const bright = [215, 198, 255];
  const mid = [138, 99, 239];
  const dim = [90, 54, 201];
  const bg = [7, 7, 13];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const gx = (x - size * 0.2) / size, gy = (y + size * 0.12) / size;
      const corner = clamp01(1 - Math.hypot(gx, gy) * 1.3) * 0.45;
      let R = bg[0] + corner * 26, G = bg[1] + corner * 20, B = bg[2] + corner * 56;

      const d = Math.hypot(x - cx, y - cy);
      const d2 = Math.hypot(x - cx2, y - cy2);
      const inCrescent = d <= r && d2 >= r2;

      if (inCrescent) {
        // shade across the crescent (bright outer edge → dim inner)
        const t = smooth(clamp01((d2 - r2) / (r * 0.9)));
        R = lerp(dim[0], bright[0], t);
        G = lerp(dim[1], bright[1], t);
        B = lerp(dim[2], bright[2], t);
      } else {
        // glow hugging the crescent's outer rim
        const g = Math.exp(-Math.abs(d - r) / (r * 0.35)) * (d > r ? 1 : 0);
        R += mid[0] * g * 0.5; G += mid[1] * g * 0.5; B += mid[2] * g * 0.7;
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
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="11" fill="#07070d"/>
  <path d="M31 8a16 16 0 1 0 0 32 12.6 12.6 0 0 1 0-32Z" fill="url(#m)"/>
  <circle cx="34.5" cy="15.5" r="1.7" fill="#fff" opacity="0.9"/>
  <defs>
    <linearGradient id="m" x1="12" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
      <stop stop-color="#d7c6ff"/>
      <stop offset="0.55" stop-color="#8a63ef"/>
      <stop offset="1" stop-color="#5a36c9"/>
    </linearGradient>
  </defs>
</svg>`;
writeFileSync(resolve(pub, "favicon.svg"), favicon);

console.log("Icons generated in public/ and public/icons/");
