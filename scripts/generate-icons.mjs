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

// distance to a rounded-rect edge (negative inside)
function roundRectSDF(x, y, cx, cy, hw, hh, r) {
  const dx = Math.abs(x - cx) - (hw - r);
  const dy = Math.abs(y - cy) - (hh - r);
  const ox = Math.max(dx, 0), oy = Math.max(dy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(dx, dy), 0) - r;
}

// Tsuki hanko seal: vermillion rounded square with a carved bone crescent.
function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  const ink = [13, 11, 10];
  const verm = [216, 65, 42];
  const bone = [253, 241, 231];
  const cx = size / 2, cy = size / 2;
  const half = size * 0.38, rad = size * 0.26; // seal extents + corner radius
  // crescent (within seal)
  const mx = size * 0.48, my = size * 0.5, mr = size * 0.25;
  const cx2 = size * 0.6, cy2 = size * 0.41, cr2 = size * 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let R = ink[0], G = ink[1], B = ink[2];
      const sd = roundRectSDF(x + 0.5, y + 0.5, cx, cy, half, half, rad);
      const sealA = clamp01(0.5 - sd); // ~1px antialias edge
      if (sealA > 0) {
        // subtle paper-ink mottle on the seal
        const n = (Math.sin(x * 0.7) * Math.cos(y * 0.6)) * 6;
        let r = verm[0] + n, g = verm[1] + n * 0.6, b = verm[2] + n * 0.4;
        const d = Math.hypot(x - mx, y - my), d2 = Math.hypot(x - cx2, y - cy2);
        const inCrescent = d <= mr && d2 >= cr2;
        if (inCrescent) { r = bone[0]; g = bone[1]; b = bone[2]; }
        R = lerp(R, r, sealA); G = lerp(G, g, sealA); B = lerp(B, b, sealA);
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
  <rect width="48" height="48" fill="#0d0b0a"/>
  <defs>
    <mask id="c"><rect width="48" height="48" fill="#000"/><circle cx="23" cy="24" r="12" fill="#fff"/><circle cx="30" cy="19.5" r="10.5" fill="#000"/></mask>
  </defs>
  <rect x="4" y="4" width="40" height="40" rx="12" fill="#d8412a"/>
  <rect width="48" height="48" fill="#fdf1e7" mask="url(#c)"/>
</svg>`;
writeFileSync(resolve(pub, "favicon.svg"), favicon);

console.log("Icons generated in public/ and public/icons/");
