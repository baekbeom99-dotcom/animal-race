/*
 * 동물 달리기 추첨 · 포켓몬 모드 그리기
 *
 * 스프라이트: PMD Sprite Repository (SpriteCollab), CC BY-NC 4.0
 * 데이터(pokemon-data.js)는 tools/build_pokemon.py 로 만들고, 포켓몬 모드를 고를 때만 불러옵니다.
 *
 * 쓰는 법:
 *   await Poke.load()                         데이터와 이미지 준비
 *   Poke.draw(번호, 발x, 발y, 키, { state, t, evolve })
 *     state: 'idle' 'run' 'boost' 'trip' 'sleep' 'happy' 'evolve'
 *     t: 동작 재생 시간(초). evolve: { from, to, u } (u = 진화 진행 0~1)
 * 그릴 캔버스는 characters.js 와 같은 곳(Chars.getContext())을 씁니다.
 */
(() => {
'use strict';
const DATA_URL = 'pokemon-data.js';
// 진화 단계별 크기 배율 (1단계 / 2단계 / 3단계)
const STAGE_SIZE = [1, 1.2, 1.4];
// 기본 크기: 동물 캐릭터 키 대비 (0.82의 70%)
const BASE_SIZE = 0.82 * 0.7;
// 경주 상태 → 쓸 동작 (앞에서부터 있는 것을 씀)
const STATE_ANIM = {
  idle: ['Idle', 'Walk'], run: ['Walk'], boost: ['Walk'], trip: ['Trip', 'Hurt', 'Idle'],
  sleep: ['Sleep', 'Idle'], happy: ['Pose', 'Hop', 'Idle'], evolve: ['Charge', 'Idle', 'Walk']
};

let species = null, loading = null;
const ctx = () => Chars.getContext();

function loadScript(src) {
  return new Promise((ok, fail) => {
    if (window.POKEMON_DATA) return ok();
    const s = document.createElement('script'); s.src = src; s.onload = () => ok(); s.onerror = () => fail(new Error('포켓몬 데이터를 불러오지 못했어요'));
    document.head.appendChild(s);
  });
}
function loadImage(src) {
  return new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = src; });
}
// 아래쪽 방향 줄(row 0)의 각 프레임에서 그림이 실제로 있는 위·아래 줄을 찾음 → 발 위치와 실제 키
function measure(a) {
  const c = document.createElement('canvas'); c.width = a.fw; c.height = a.fh;
  const g = c.getContext('2d', { willReadFrequently: true });
  let bottom = 0, top = a.fh, left = a.fw, right = 0;
  a.fb = []; // 프레임마다 발(가장 아래 그림) 위치: 이걸 땅에 맞춰야 꼬리·점프 프레임에서 몸이 뜨지 않음
  for (let i = 0; i < a.frames; i++) {
    g.clearRect(0, 0, a.fw, a.fh); g.drawImage(a.im, i * a.fw, 0, a.fw, a.fh, 0, 0, a.fw, a.fh);
    const px = g.getImageData(0, 0, a.fw, a.fh).data;
    let fb = 0;
    for (let y = 0; y < a.fh; y++) for (let x = 0; x < a.fw; x++) if (px[(y * a.fw + x) * 4 + 3] > 20) {
      if (y > fb) fb = y; if (y > bottom) bottom = y; if (y < top) top = y; if (x < left) left = x; if (x > right) right = x;
    }
    a.fb.push(fb + 1);
  }
  a.bottom = bottom + 1; a.visH = Math.max(1, bottom + 1 - top); a.visW = Math.max(1, right + 1 - left); a.cx = (left + right + 1) / 2;
  a.total = a.dur.reduce((x, y) => x + y, 0) || 1;
}

const Poke = {
  STAGE_SIZE,
  ready: false,
  load() {
    if (loading) return loading;
    loading = (async () => {
      await loadScript(DATA_URL);
      species = window.POKEMON_DATA.species;
      const jobs = [];
      for (const id in species) for (const name in species[id].anims) {
        const a = species[id].anims[name];
        jobs.push(loadImage(a.img).then(im => { a.im = im; measure(a); }));
      }
      await Promise.all(jobs);
      this.ready = true;
    })();
    loading.catch(() => { loading = null; });
    return loading;
  },
  ids() { return species ? Object.keys(species).map(Number) : []; },
  info(id) { return species[id]; },
  // 진화 계열: [지금, 다음, 그다음]
  line(id) { const out = [id]; while (species[out[out.length - 1]].next) out.push(species[out[out.length - 1]].next); return out; },
  credits() { const s = new Set(); for (const id in species) for (const c of species[id].credits) s.add(c); return [...s]; },
  anim(id, state) {
    const A = species[id].anims;
    for (const n of STATE_ANIM[state] || STATE_ANIM.idle) if (A[n]) return A[n];
    return A.Walk;
  },
  // 그림 배율. 크기는 걷기 그림의 실제 키와 너비의 기하평균으로 재서, 키 큰 종과 옆으로 넓은 종이 비슷해 보이게 함
  //   gm을 주면: 그 크기(픽셀)로 그림 (경주 화면: 레인 너비에 맞춘 크기)
  //   gm이 없으면: 키 s 자리에 맞춰, 진화 단계만큼 크게 (선택 화면·결과 화면)
  size(id) { const w = species[id].anims.Walk; return Math.sqrt(w.visW * w.visH); },
  scale(id, s, gm) { return gm ? gm / this.size(id) : s * BASE_SIZE * STAGE_SIZE[species[id].stage - 1] / this.size(id); },
  height(id, s, gm) { return species[id].anims.Walk.visH * this.scale(id, s, gm); },
  width(id, s, gm) { return species[id].anims.Walk.visW * this.scale(id, s, gm); },
  frameOf(a, t) {
    let tick = Math.floor(t * 60) % a.total;
    for (let i = 0; i < a.dur.length; i++) { tick -= a.dur[i]; if (tick < 0) return i; }
    return 0;
  },
  // 한 프레임 그리기. white = 흰 실루엣
  blit(id, state, x, y, s, t, alpha = 1, white = false, gm) {
    const g = ctx(), a = this.anim(id, state), k = this.scale(id, s, gm), f = this.frameOf(a, t);
    const w = a.fw * k, h = a.fh * k, dx = x - a.cx * k, dy = y - (a.fb[f] || a.bottom) * k;
    g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = alpha;
    if (white) g.drawImage(silhouette(a, f), dx, dy, w, h);
    else g.drawImage(a.im, f * a.fw, 0, a.fw, a.fh, dx, dy, w, h);
    g.restore();
  },
  draw(id, x, y, s, st = {}) {
    const g = ctx(), state = st.state || 'idle', t = st.t || 0, gm = st.gm;
    // 그림자
    const sw = gm ? this.width(id, s, gm) * 0.5 : Math.min(s * 0.45, this.width(id, s) * 0.55);
    g.save(); g.fillStyle = 'rgba(60,30,10,.2)'; g.beginPath(); g.ellipse(x, y, sw, sw * 0.28, 0, 0, Math.PI * 2); g.fill(); g.restore();
    if (state === 'evolve' && st.evolve) return this.drawEvolve(x, y, s, t, st.evolve);
    let yy = y;
    if (state === 'happy') yy -= Math.abs(Math.sin(t * 6)) * s * 0.12;
    this.blit(id, state, x, yy, s, t, 1, false, gm);
    const top = y - this.height(id, s, gm) - s * 0.1;
    if (state === 'sleep') { g.save(); g.fillStyle = '#3f6fd8'; g.font = `${s * 0.22}px Jua, sans-serif`; g.textAlign = 'left'; const z = (t * 0.6) % 1; g.globalAlpha = 1 - z; g.fillText('Z', x + s * 0.3, top - z * s * 0.3); g.restore(); }
    if (state === 'trip') for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; Chars.star(x + Math.cos(a) * s * 0.3, top + s * 0.1 + Math.sin(a) * s * 0.08, s * 0.06, '#ffd21a'); }
    if (state === 'boost') { g.save(); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = Math.max(2, s * 0.03); for (let i = -2; i <= 2; i++) { const lx = x + i * s * 0.11, l = s * (0.25 + ((t * 5 + i * 1.3) % 1) * 0.3); g.beginPath(); g.moveTo(lx, top); g.lineTo(lx, top - l); g.stroke(); } g.restore(); }
  },
  // 진화 이펙트: 빛 → 흰 실루엣이 옛 모습/새 모습으로 점점 빠르게 바뀜 → 번쩍 + 빛 고리와 별
  drawEvolve(x, y, s, t, ev) {
    const g = ctx(), u = Math.min(1, Math.max(0, ev.u)), from = ev.from, to = ev.to, gf = ev.gmFrom, gt = ev.gmTo;
    const h = Math.max(this.height(from, s, gf), this.height(to, s, gt)), cy = y - h * 0.5;
    // 뒤쪽 빛
    const glow = g.createRadialGradient(x, cy, 0, x, cy, h * (0.9 + u * 0.6));
    glow.addColorStop(0, `rgba(255,255,220,${0.55 + u * 0.35})`); glow.addColorStop(0.5, `rgba(140,220,255,${0.25 + u * 0.2})`); glow.addColorStop(1, 'rgba(140,220,255,0)');
    g.save(); g.fillStyle = glow; g.beginPath(); g.arc(x, cy, h * (0.9 + u * 0.6), 0, Math.PI * 2); g.fill(); g.restore();
    // 올라가는 반짝이
    for (let i = 0; i < 10; i++) {
      const ph = (i * 0.37 + t * 0.9) % 1, ax = x + Math.sin(i * 2.4 + t * 2) * h * 0.55, ay = y - ph * h * 1.4;
      g.save(); g.globalAlpha = 1 - ph; Chars.star(ax, ay, s * 0.045 * (1 - ph * 0.5), i % 2 ? '#fff6b0' : '#bfefff'); g.restore();
    }
    if (u < 0.78) {
      // 바뀌는 간격: 0.32초 → 0.04초
      const v = u / 0.78, period = 0.32 - 0.28 * v, showNew = Math.floor(t / period) % 2 === 1;
      this.blit(showNew ? to : from, 'idle', x, y, s, t, 1, true, showNew ? gt : gf);
    } else {
      const w = (u - 0.78) / 0.22;
      this.blit(to, 'idle', x, y, s, t, 1, false, gt);
      this.blit(to, 'idle', x, y, s, t, 1 - w, true, gt);
      // 번쩍이는 빛 고리
      g.save(); g.strokeStyle = `rgba(255,255,255,${1 - w})`; g.lineWidth = s * 0.08 * (1 - w) + 1;
      g.beginPath(); g.arc(x, cy, h * (0.4 + w * 1.4), 0, Math.PI * 2); g.stroke(); g.restore();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = h * (0.3 + w * 1.2); g.save(); g.globalAlpha = 1 - w; Chars.star(x + Math.cos(a) * r, cy + Math.sin(a) * r, s * 0.07, '#ffe14a'); g.restore(); }
    }
  }
};

// 흰 실루엣 프레임 (한 번 만들어 재사용)
const silCache = new WeakMap();
function silhouette(a, f) {
  let list = silCache.get(a); if (!list) silCache.set(a, list = []);
  let c = list[f];
  if (!c) {
    c = document.createElement('canvas'); c.width = a.fw; c.height = a.fh;
    const g = c.getContext('2d'); g.drawImage(a.im, f * a.fw, 0, a.fw, a.fh, 0, 0, a.fw, a.fh);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, a.fw, a.fh);
    list[f] = c;
  }
  return c;
}

window.Poke = Poke;
})();
