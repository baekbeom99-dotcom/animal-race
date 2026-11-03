/*
 * pokemon-data.js 의 스프라이트를 2배 해상도로 키웁니다 (2xBR).
 *
 * 사용법:  node tools/upscale_pokemon.js
 *   1) python tools/build_pokemon.py <SpriteCollab 폴더> 1 73  으로 원본 데이터를 만든 뒤 실행
 *   2) 경주에 쓰는 아래쪽(보는 사람 쪽) 방향 줄만 남기고, 프레임마다 따로 2xBR로 2배 확대
 *   3) 같은 파일(pokemon-data.js)에 덮어씀. 이미 키운 데이터면 다시 키우지 않음
 *
 * 외부 라이브러리 없이 Node 기본 기능(zlib)만 씁니다. 원본 시트는 모두 8비트 RGBA PNG입니다.
 */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const FILE = path.join(__dirname, '..', 'pokemon-data.js');

/* ---------- PNG 읽기 (8비트 RGBA, 인터레이스 없음) ---------- */
function decodePNG(buf) {
  let p = 8, w = 0, h = 0, ct = 0, bd = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]; if (data[12]) throw new Error('인터레이스 PNG는 지원 안 함'); }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (ct !== 6 || bd !== 8) throw new Error(`지원하지 않는 PNG 형식 (color ${ct}, depth ${bd})`);
  const raw = zlib.inflateSync(Buffer.concat(idat)), bpp = 4, stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[dst + x - bpp] : 0, b = y ? out[dst - stride + x] : 0, c = x >= bpp && y ? out[dst - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[dst + x] = v & 255;
    }
  }
  return { w, h, px: new Uint32Array(out.buffer, out.byteOffset, w * h).slice() };
}

/* ---------- PNG 쓰기: 색이 256개 이하면 팔레트 PNG(작음), 아니면 RGBA ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, px) {
  const colors = new Map();
  for (const c of px) { if (!colors.has(c)) colors.set(c, colors.size); if (colors.size > 256) break; }
  const pal = colors.size <= 256, ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = pal ? 3 : 6;
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr)];
  let raw;
  if (pal) {
    const plte = Buffer.alloc(colors.size * 3), trns = Buffer.alloc(colors.size);
    for (const [c, i] of colors) { plte[i * 3] = c & 255; plte[i * 3 + 1] = (c >>> 8) & 255; plte[i * 3 + 2] = (c >>> 16) & 255; trns[i] = c >>> 24; }
    parts.push(chunk('PLTE', plte), chunk('tRNS', trns));
    raw = Buffer.alloc(h * (w + 1));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw[y * (w + 1) + 1 + x] = colors.get(px[y * w + x]);
  } else {
    raw = Buffer.alloc(h * (w * 4 + 1)); const b = Buffer.from(px.buffer, px.byteOffset, px.byteLength);
    for (let y = 0; y < h; y++) b.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  parts.push(chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

/* ---------- 2xBR (tools/upscale-compare.html 과 같은 규칙) ---------- */
function xbr2x(u, w, h) {
  const s = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : u[y * w + x];
  const o = new Uint32Array(w * h * 4), W = w * 2;
  const yuv = c => { const a = c >>> 24, r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255; return [0.299 * r + 0.587 * g + 0.114 * b, -0.169 * r - 0.331 * g + 0.5 * b, 0.5 * r - 0.419 * g - 0.081 * b, a]; };
  const dist = (p, q) => { if (p === q) return 0; const a = yuv(p), b = yuv(q); return 48 * Math.abs(a[0] - b[0]) + 7 * Math.abs(a[1] - b[1]) + 6 * Math.abs(a[2] - b[2]) + 2 * Math.abs(a[3] - b[3]); };
  const mix = (p, q) => {
    if ((p >>> 24) === 0) return q; if ((q >>> 24) === 0) return p;
    const r = ((p & 255) + (q & 255)) >> 1, g = (((p >>> 8) & 255) + ((q >>> 8) & 255)) >> 1, b = (((p >>> 16) & 255) + ((q >>> 16) & 255)) >> 1;
    return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
  };
  const OFF = { C: [1, -1], G: [-1, 1], I: [1, 1], F4: [2, 0], H5: [0, 2], H: [0, 1], F: [1, 0], D: [-1, 0], B: [0, -1], I5: [1, 2], I4: [2, 1] };
  const ROT = [0, 1, 2, 3].map(k => { const m = {}; for (const n in OFF) { let [dx, dy] = OFF[n]; for (let i = 0; i < k; i++) [dx, dy] = [-dy, dx]; m[n] = [dx, dy]; } let [cx, cy] = [1, 1]; for (let i = 0; i < k; i++) [cx, cy] = [-cy, cx]; m.idx = (cy > 0 ? 2 : 0) + (cx > 0 ? 1 : 0); return m; });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const E = s(x, y), out = [E, E, E, E];
    for (const m of ROT) {
      const g = n => s(x + m[n][0], y + m[n][1]);
      const C = g('C'), G = g('G'), I = g('I'), F4 = g('F4'), H5 = g('H5'), Hh = g('H'), F = g('F'), D = g('D'), B = g('B'), I5 = g('I5'), I4 = g('I4');
      const e = dist(E, C) + dist(E, G) + dist(I, F4) + dist(I, H5) + 4 * dist(Hh, F);
      const iw = dist(Hh, D) + dist(Hh, I5) + dist(F, I4) + dist(F, B) + 4 * dist(E, I);
      if (e < iw) out[m.idx] = mix(E, dist(E, F) <= dist(E, Hh) ? F : Hh);
    }
    const i = 2 * y * W + 2 * x; o[i] = out[0]; o[i + 1] = out[1]; o[i + W] = out[2]; o[i + W + 1] = out[3];
  }
  return o;
}

/* ---------- 시트 한 장: 아래쪽 줄만 잘라 프레임마다 2배 ---------- */
function upscaleSheet(a) {
  const png = decodePNG(Buffer.from(a.img.split(',')[1], 'base64'));
  // 반투명은 완전 투명/불투명으로 정리 (발 위치 계산, 흰 실루엣 진화 효과가 맞도록)
  for (let i = 0; i < png.px.length; i++) png.px[i] = (png.px[i] >>> 24) < 128 ? 0 : (png.px[i] | 0xff000000) >>> 0;
  const fw = a.fw, fh = a.fh, n = a.frames, FW = fw * 2, FH = fh * 2, out = new Uint32Array(n * FW * FH), OW = n * FW;
  for (let f = 0; f < n; f++) {
    const pw = fw + 2, ph = fh + 2, buf = new Uint32Array(pw * ph); // 둘레 투명 1칸
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) buf[(y + 1) * pw + x + 1] = png.px[y * png.w + f * fw + x];
    const big = xbr2x(buf, pw, ph), BW = pw * 2;
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) out[y * OW + f * FW + x] = big[(y + 2) * BW + x + 2];
  }
  return { img: 'data:image/png;base64,' + encodePNG(OW, FH, out).toString('base64'), fw: FW, fh: FH, frames: n, rows: 1, dur: a.dur };
}

function main() {
  const js = fs.readFileSync(FILE, 'utf8');
  const head = js.slice(0, js.indexOf('window.POKEMON_DATA')), body = js.slice(js.indexOf('{'), js.lastIndexOf('}') + 1);
  const data = JSON.parse(body);
  if (data.upscaled) { console.log(`이미 ${data.upscaled}배로 키운 데이터입니다. build_pokemon.py로 다시 만든 뒤 실행하세요.`); return; }
  const t0 = Date.now(); let sheets = 0;
  for (const id in data.species) for (const name in data.species[id].anims) { data.species[id].anims[name] = upscaleSheet(data.species[id].anims[name]); sheets++; }
  data.upscaled = 2;
  const outJs = head.replace('직접 고치지 마세요.', '직접 고치지 마세요.\n * tools/upscale_pokemon.js 로 2xBR 2배 확대, 아래쪽 방향 줄만 남김.') + 'window.POKEMON_DATA = ' + JSON.stringify(data) + ';\n';
  fs.writeFileSync(FILE, outJs);
  console.log(`${Object.keys(data.species).length}종 ${sheets}장 처리, ${((Date.now() - t0) / 1000).toFixed(1)}초, ${Math.round(js.length / 1024)}KB → ${Math.round(outJs.length / 1024)}KB`);
}
main();
