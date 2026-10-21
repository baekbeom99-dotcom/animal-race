/*
 * 동물 달리기 추첨 · 캐릭터 디자인
 *
 * 동물 12종, 머리 위 번호 풍선, 마블 룰렛 구슬을 캔버스에 그리는 코드와
 * 이들이 쓰는 그리기 도구(ell 타원, tri 삼각형, star 별, outlined 테두리 글자)를 모았습니다.
 *
 * 쓰는 법: Chars.setContext(캔버스의 2d 컨텍스트)로 그릴 곳을 정한 뒤
 *   Chars.drawAnimal(동물번호, 발x, 발y, 키, { phase, state })
 *   Chars.drawMarble(x, y, 반지름, Chars.marbleCol(i, n))
 * state: 'idle' 서 있기, 'run' 달리기, 'boost' 부스터, 'trip' 꽈당, 'sleep' 쿨쿨, 'happy' 골인
 */
(() => {
'use strict';
let g = null; // 지금 그리는 캔버스 (Chars.setContext로 바꿈)

/* ---------- 동물 팔레트 (12종) ---------- */
const ANIMALS = [
  { id: 'chick',  c: '#ffe156', c2: '#fff3a1', o: '#b87414', belly: '#fff7c2', ear: '#ffb72b' },
  { id: 'panda',  c: '#ffffff', c2: '#ffffff', o: '#363440', belly: '#ffffff', ear: '#2e2d38' },
  { id: 'puppy',  c: '#fff7eb', c2: '#ffffff', o: '#784b2d', belly: '#ffffff', ear: '#c98449' },
  { id: 'bunny',  c: '#fff7fb', c2: '#ffffff', o: '#8c6b87', belly: '#ffffff', ear: '#ffb3c9' },
  { id: 'cat',    c: '#ffbe6b', c2: '#ffdca8', o: '#9e5018', belly: '#fff5e4', ear: '#ffa3b8' },
  { id: 'bear',   c: '#c98b56', c2: '#dfa674', o: '#5c3618', belly: '#f7dec1', ear: '#f2cba0' },
  { id: 'pig',    c: '#ffc2d4', c2: '#ffe0ea', o: '#b85270', belly: '#ffe5ee', ear: '#ff94b2' },
  { id: 'frog',   c: '#8ce063', c2: '#b6f291', o: '#317521', belly: '#f4fad2', ear: '#6bc445' },
  { id: 'monkey', c: '#bc7a46', c2: '#d69865', o: '#542e12', belly: '#ffdfbe', ear: '#ffb09c' },
  { id: 'koala',  c: '#c5cad6', c2: '#e1e5f0', o: '#545869', belly: '#f5f6fa', ear: '#f7f4f8' },
  { id: 'fox',    c: '#ff9248', c2: '#ffb884', o: '#993f10', belly: '#fff7ed', ear: '#4a2818' },
  { id: 'tiger',  c: '#ffb838', c2: '#ffd67d', o: '#8f4c0a', belly: '#fff8eb', ear: '#fff1d0' }
];
const BALLOON = ['#ff7a2e', '#5cb82e', '#2e8ef0', '#a45ce0', '#ff5c8a', '#e83a3a', '#19b5a5', '#f2b90c'];

function ell(x, y, rx, ry, fill, stroke, rot = 0) {
  g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.stroke(); }
}

function tri(ax, ay, bx, by, cx, cy, fill, stroke) {
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo(cx, cy); g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.stroke(); }
}

// 볼살이 통통한 모찌형 머리 외곽선 경로
function mochiPath(cx, cy, rx, ry) {
  const wTop = rx * 0.92, wBot = rx * 1.07;
  const topY = cy - ry, botY = cy + ry * 0.98;
  g.beginPath();
  g.moveTo(cx, topY);
  // 오른쪽 이마 -> 통통한 볼 -> 턱
  g.bezierCurveTo(cx + wTop * 0.85, topY, cx + wBot * 1.06, cy - ry * 0.2, cx + wBot, cy + ry * 0.26);
  g.bezierCurveTo(cx + wBot * 0.94, cy + ry * 0.78, cx + rx * 0.48, botY, cx, botY);
  // 턱 -> 왼쪽 통통한 볼 -> 이마
  g.bezierCurveTo(cx - rx * 0.48, botY, cx - wBot * 0.94, cy + ry * 0.78, cx - wBot, cy + ry * 0.26);
  g.bezierCurveTo(cx - wBot * 1.06, cy - ry * 0.2, cx - wTop * 0.85, topY, cx, topY);
  g.closePath();
}

// 끝이 둥근 귀(고양이·여우·돼지용)
function roundEar(ax, ay, bx, by, tx, ty, fill, stroke) {
  g.beginPath();
  g.moveTo(ax, ay);
  g.quadraticCurveTo((ax + tx) * 0.5, (ay + ty) * 0.5 - Math.abs(bx - ax) * 0.12, tx, ty);
  g.quadraticCurveTo((bx + tx) * 0.5, (by + ty) * 0.5 - Math.abs(bx - ax) * 0.12, bx, by);
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.stroke(); }
}

function eyes(ex, ey, er, mood, white) {
  for (const sx of [-1, 1]) {
    const x = ex * sx;
    if (mood === 'sleep') {
      g.beginPath();
      g.arc(x, ey - er * 0.15, er * 0.92, 0.15 * Math.PI, 0.85 * Math.PI);
      g.strokeStyle = '#3b2318'; g.lineWidth = er * 0.34; g.stroke();
      // 귀여운 속눈썹 한 가닥
      g.beginPath();
      g.moveTo(x + sx * er * 0.78, ey + er * 0.2);
      g.lineTo(x + sx * er * 1.08, ey + er * 0.38);
      g.lineWidth = er * 0.26; g.stroke();
      continue;
    }
    if (mood === 'happy') {
      g.beginPath();
      g.arc(x, ey + er * 0.42, er * 0.88, 1.15 * Math.PI, 1.85 * Math.PI);
      g.strokeStyle = '#3b2318'; g.lineWidth = er * 0.36; g.stroke();
      // 눈꼬리 웃음 포인트
      g.beginPath();
      g.moveTo(x + sx * er * 0.76, ey + er * 0.05);
      g.lineTo(x + sx * er * 1.05, ey - er * 0.08);
      g.lineWidth = er * 0.26; g.stroke();
      continue;
    }
    if (mood === 'dizzy') {
      // 귀여운 > < 꽈당 눈과 눈물 한 방울
      g.strokeStyle = '#3b2318'; g.lineWidth = er * 0.34;
      g.beginPath();
      g.moveTo(x - sx * er * 0.65, ey - er * 0.55);
      g.lineTo(x + sx * er * 0.5, ey);
      g.lineTo(x - sx * er * 0.65, ey + er * 0.55);
      g.stroke();
      // 눈물 방울
      ell(x + sx * er * 0.85, ey + er * 0.45, er * 0.26, er * 0.36, '#6ecbff', '#2e8ef0', sx * 0.4);
      continue;
    }
    if (white) ell(x, ey, er * 1.22, er * 1.32, '#fff');
    // 초롱초롱한 다크초콜릿 눈동자
    ell(x, ey, er * 1.04, er * 1.16, '#261714');
    // 아래쪽 따뜻한 갈색 반사광
    ell(x, ey + er * 0.42, er * 0.68, er * 0.42, 'rgba(255,175,130,.32)');
    // 큰 하이라이트 + 작은 반짝이 물방울
    ell(x - er * 0.32, ey - er * 0.38, er * 0.46, er * 0.48, '#fff');
    ell(x + er * 0.34, ey + er * 0.36, er * 0.22, er * 0.22, '#fff');
    if (mood === 'boost') {
      // 부스터 상태: 눈 속의 작은 반짝 별빛
      ell(x - er * 0.32, ey - er * 0.38, er * 0.54, er * 0.54, '#fff');
      ell(x + er * 0.28, ey - er * 0.15, er * 0.16, er * 0.16, '#ffe45e');
    }
  }
}

// 귀여운 꼬리 그리기
function drawTail(id, s, ph, C, O, earCol) {
  const wag = Math.sin(ph * 1.6) * 0.25;
  g.save();
  g.translate(s * 0.13, -s * 0.15);
  g.rotate(wag);
  if (id === 'bunny' || id === 'bear' || id === 'panda' || id === 'koala') {
    const tc = id === 'panda' ? '#2e2d38' : id === 'bunny' ? '#ffffff' : C;
    ell(s * 0.05, 0, s * 0.065, s * 0.065, tc, O);
  } else if (id === 'puppy') {
    ell(s * 0.08, -s * 0.04, s * 0.075, s * 0.045, earCol, O, -0.5);
  } else if (id === 'cat' || id === 'tiger' || id === 'monkey') {
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(s * 0.16, -s * 0.02, s * 0.2, -s * 0.18, s * 0.12, -s * 0.22);
    g.strokeStyle = O; g.lineWidth = s * 0.068; g.stroke();
    g.strokeStyle = C; g.lineWidth = s * 0.038; g.stroke();
    g.lineWidth = Math.max(1, s * 0.026);
  } else if (id === 'fox') {
    ell(s * 0.11, -s * 0.05, s * 0.11, s * 0.065, C, O, -0.45);
    ell(s * 0.17, -s * 0.08, s * 0.05, s * 0.04, '#fff7ed', null, -0.45);
  } else if (id === 'pig') {
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(s * 0.1, -s * 0.06, s * 0.04, -s * 0.12, s * 0.11, -s * 0.09);
    g.strokeStyle = O; g.lineWidth = Math.max(1.2, s * 0.024); g.stroke();
  }
  g.restore();
}

// x,y = 발 위치. s = 키. st = {phase, state}
function drawAnimal(k, x, y, s, st = {}) {
  const A = ANIMALS[k], id = A.id, ph = st.phase || 0, state = st.state || 'idle';
  const running = state === 'run' || state === 'boost';
  let bob = 0, lift = 0, arm = 0, rot = 0, sq = 0, headTilt = 0;
  if (running) {
    bob = Math.abs(Math.sin(ph)) * s * 0.075;
    lift = Math.sin(ph);
    arm = Math.sin(ph);
    sq = Math.cos(ph * 2) * 0.035;
    headTilt = Math.sin(ph) * 0.045;
  } else if (state === 'happy') {
    bob = Math.abs(Math.sin(ph * 0.5)) * s * 0.19;
    sq = Math.sin(ph) * 0.045;
    headTilt = Math.sin(ph * 0.5) * 0.06;
  } else if (state === 'idle') {
    bob = Math.abs(Math.sin(ph * 0.35)) * s * 0.028;
    sq = Math.sin(ph * 0.7) * 0.018;
    headTilt = Math.sin(ph * 0.35) * 0.03;
  } else if (state === 'trip') {
    rot = 0.52 + Math.sin(ph * 0.4) * 0.06;
  } else if (state === 'sleep') {
    sq = Math.sin(ph * 0.4) * 0.022;
  }

  g.save();
  g.translate(x, y);
  // 바닥 그림자 (점프 높이에 따라 작아짐)
  const shScale = Math.max(0.65, 1 - bob / (s * 0.5));
  ell(0, 0, s * 0.27 * shScale, s * 0.068 * shScale, 'rgba(55,28,10,.18)');

  g.rotate(rot);
  g.translate(0, -bob);
  g.scale(1 + sq, 1 - sq);

  const lw = Math.max(1.1, s * 0.026);
  g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round';
  const O = A.o, C = A.c, C2 = A.c2, B = A.belly, E = A.ear;
  const limb = id === 'panda' ? '#2e2d38' : id === 'chick' ? '#ff9824' : C;

  // 꼬리 (몸통 뒤)
  drawTail(id, s, ph, C, O, E);

  // 발 (달리거나 점프할 때 분홍 발바닥 젤리 포인트)
  for (const sx of [-1, 1]) {
    const lft = sx < 0 ? (lift > 0 ? lift : 0) : (lift < 0 ? -lift : 0);
    const fy = -s * 0.052 - lft * s * 0.075;
    ell(sx * s * 0.095, fy, s * 0.074, s * 0.05, limb, O, sx * 0.08);
    if ((state === 'happy' || lft > 0.35) && id !== 'chick' && id !== 'frog') {
      ell(sx * s * 0.095, fy + s * 0.006, s * 0.035, s * 0.024, '#ffa3b8');
    }
  }

  // 몸통 (통통한 아기 체형)
  const bodyCol = id === 'panda' ? '#ffffff' : C;
  ell(0, -s * 0.205, s * 0.185, s * 0.165, bodyCol, O);
  // 판다 어깨 조끼 무늬
  if (id === 'panda') {
    g.save();
    g.beginPath(); g.ellipse(0, -s * 0.205, s * 0.185, s * 0.165, 0, 0, Math.PI * 2); g.clip();
    ell(0, -s * 0.31, s * 0.22, s * 0.09, '#2e2d38');
    g.restore();
    ell(0, -s * 0.205, s * 0.185, s * 0.165, null, O);
  }
  // 포근한 배 무늬
  if (id !== 'panda') {
    ell(0, -s * 0.185, s * 0.118, s * 0.105, B);
  }
  // 호랑이 몸통 줄무늬
  if (id === 'tiger') {
    g.strokeStyle = '#6b3606'; g.lineWidth = lw * 1.1;
    for (const sx of [-1, 1]) {
      g.beginPath(); g.moveTo(sx * s * 0.17, -s * 0.22); g.lineTo(sx * s * 0.11, -s * 0.21); g.stroke();
    }
    g.lineWidth = lw;
  }
  // 강아지·고양이 귀여운 방울 목걸이
  if (id === 'puppy' || id === 'cat') {
    ell(0, -s * 0.31, s * 0.12, s * 0.032, id === 'puppy' ? '#ff5c77' : '#45a5ff', O);
    ell(0, -s * 0.295, s * 0.034, s * 0.034, '#ffd93d', '#b87414');
  }

  // 팔 (병아리는 날개 모양)
  const armCol = id === 'chick' ? '#ffd13b' : limb;
  if (state === 'happy') {
    ell(-s * 0.205, -s * 0.34, s * 0.055, s * 0.092, armCol, O, 0.55);
    ell(s * 0.205, -s * 0.34, s * 0.055, s * 0.092, armCol, O, -0.55);
    if (id !== 'chick' && id !== 'frog') {
      ell(-s * 0.215, -s * 0.355, s * 0.025, s * 0.025, '#ffa3b8');
      ell(s * 0.215, -s * 0.355, s * 0.025, s * 0.025, '#ffa3b8');
    }
  } else {
    ell(-s * 0.19, -s * 0.215 + arm * s * 0.045, s * 0.056, s * 0.082, armCol, O, 0.32);
    ell(s * 0.19, -s * 0.215 - arm * s * 0.045, s * 0.056, s * 0.082, armCol, O, -0.32);
  }

  // 머리 (살짝 갸우뚱하는 회전 애니메이션)
  const hy = -s * 0.575, R = s * 0.345;
  g.save();
  g.translate(0, hy);
  g.rotate(headTilt);
  g.translate(0, -hy);

  const earBounce = Math.sin(ph) * 0.04;
  // 귀 (머리 뒤에 그려질 부분)
  if (id === 'panda') {
    for (const sx of [-1, 1]) {
      ell(sx * R * 0.74, hy - R * 0.72, R * 0.31, R * 0.31, E, O);
      ell(sx * R * 0.74, hy - R * 0.72, R * 0.15, R * 0.15, '#4c4a59');
    }
  }
  if (id === 'bear' || id === 'tiger') {
    for (const sx of [-1, 1]) {
      ell(sx * R * 0.74, hy - R * 0.72, R * 0.3, R * 0.3, C, O);
      ell(sx * R * 0.74, hy - R * 0.72, R * 0.16, R * 0.16, E);
    }
  }
  if (id === 'bunny') {
    // 왼쪽 귀는 쫑긋, 오른쪽 귀는 끝이 살짝 접힌 귀여운 토끼귀
    ell(-R * 0.36, hy - R * 1.24, R * 0.22, R * 0.62, C, O, -0.1 + earBounce);
    ell(-R * 0.36, hy - R * 1.2, R * 0.115, R * 0.44, E, null, -0.1 + earBounce);
    ell(R * 0.38, hy - R * 1.18, R * 0.22, R * 0.56, C, O, 0.22 - earBounce);
    ell(R * 0.38, hy - R * 1.15, R * 0.115, R * 0.4, E, null, 0.22 - earBounce);
  }
  if (id === 'cat' || id === 'fox') {
    for (const sx of [-1, 1]) {
      roundEar(sx * R * 0.22, hy - R * 0.84, sx * R * 0.94, hy - R * 0.42, sx * R * 0.84, hy - R * 1.26, C, O);
      roundEar(sx * R * 0.38, hy - R * 0.8, sx * R * 0.82, hy - R * 0.54, sx * R * 0.76, hy - R * 1.08, E);
    }
  }
  if (id === 'pig') {
    for (const sx of [-1, 1]) {
      roundEar(sx * R * 0.28, hy - R * 0.84, sx * R * 0.92, hy - R * 0.5, sx * R * 0.88, hy - R * 1.12, E, O);
    }
  }
  if (id === 'koala') {
    for (const sx of [-1, 1]) {
      ell(sx * R * 0.92, hy - R * 0.42, R * 0.44, R * 0.42, C, O);
      ell(sx * R * 0.92, hy - R * 0.42, R * 0.26, R * 0.25, E);
    }
  }
  if (id === 'monkey') {
    for (const sx of [-1, 1]) {
      ell(sx * R * 0.98, hy + R * 0.04, R * 0.29, R * 0.29, C, O);
      ell(sx * R * 0.98, hy + R * 0.04, R * 0.17, R * 0.17, E);
    }
  }
  if (id === 'puppy') {
    // 머리 뒤쪽 관자놀이에서 시작해 바깥쪽 아래로 통통하게 벌어지는 강아지 귀
    for (const sx of [-1, 1]) {
      ell(sx * R * 0.94, hy - R * 0.04, R * 0.27, R * 0.52, E, O, -sx * (0.45 + Math.abs(earBounce)));
    }
  }
  if (id === 'frog') {
    for (const sx of [-1, 1]) {
      ell(sx * R * 0.46, hy - R * 0.7, R * 0.34, R * 0.34, C, O);
    }
  }

  // 머리 본체 (볼살 통통한 모찌 모양 + 은은한 입체 그라데이션)
  const hrx = R * (id === 'frog' ? 1.08 : 1.02);
  const hry = R * (id === 'frog' ? 0.86 : 0.96);
  const hGrad = g.createLinearGradient(0, hy - hry, 0, hy + hry);
  hGrad.addColorStop(0, C2);
  hGrad.addColorStop(0.55, C);
  hGrad.addColorStop(1, C);
  mochiPath(0, hy, hrx, hry);
  g.fillStyle = hGrad; g.fill();

  // 얼굴 안쪽 무늬 (머리 외곽선 안으로 클리핑)
  g.save();
  mochiPath(0, hy, hrx, hry);
  g.clip();

  // 정수리 은은한 하이라이트
  ell(0, hy - hry * 0.68, hrx * 0.55, hry * 0.22, 'rgba(255,255,255,.35)');

  if (id === 'fox') {
    // 여우 양볼의 하얀 털 배색
    ell(-R * 0.48, hy + R * 0.48, R * 0.65, R * 0.52, B);
    ell(R * 0.48, hy + R * 0.48, R * 0.65, R * 0.52, B);
    ell(0, hy + R * 0.58, R * 0.55, R * 0.45, B);
  }
  if (id === 'monkey') {
    // 원숭이 하트 모양 얼굴 배색
    ell(-R * 0.32, hy - R * 0.02, R * 0.42, R * 0.42, B);
    ell(R * 0.32, hy - R * 0.02, R * 0.42, R * 0.42, B);
    ell(0, hy + R * 0.36, R * 0.66, R * 0.44, B);
  }
  if (id === 'cat') {
    // 치즈냥이 이마 줄무늬
    g.strokeStyle = '#d47424'; g.lineWidth = lw * 1.4;
    for (const dx of [-0.2, 0, 0.2]) {
      g.beginPath(); g.moveTo(dx * R, hy - hry * 0.96); g.lineTo(dx * R * 0.85, hy - hry * 0.68); g.stroke();
    }
    g.lineWidth = lw;
  }
  if (id === 'tiger') {
    // 호랑이 이마 왕(王)자 무늬와 양볼 줄무늬, 하얀 주둥이
    g.strokeStyle = '#5c2f06'; g.lineWidth = lw * 1.45;
    for (const dx of [-0.22, 0, 0.22]) {
      g.beginPath(); g.moveTo(dx * R, hy - hry * 0.98); g.lineTo(dx * R * 0.82, hy - hry * 0.64); g.stroke();
    }
    g.beginPath(); g.moveTo(-R * 0.24, hy - hry * 0.78); g.lineTo(R * 0.24, hy - hry * 0.78); g.stroke();
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.moveTo(sx * R * 1.05, hy + R * 0.02); g.lineTo(sx * R * 0.8, hy + R * 0.06);
      g.moveTo(sx * R * 1.05, hy + R * 0.22); g.lineTo(sx * R * 0.82, hy + R * 0.24);
      g.stroke();
    }
    g.lineWidth = lw;
    ell(0, hy + R * 0.32, R * 0.44, R * 0.3, B);
  }
  if (id === 'bear') {
    ell(0, hy + R * 0.3, R * 0.38, R * 0.28, B);
  }
  if (id === 'puppy') {
    // 강아지 한쪽 눈 얼룩과 귀여운 콩 눈썹
    ell(R * 0.38, hy + R * 0.04, R * 0.31, R * 0.32, '#eab37e');
    ell(-R * 0.36, hy - R * 0.22, R * 0.09, R * 0.055, '#c98449', null, -0.15);
    ell(R * 0.36, hy - R * 0.22, R * 0.09, R * 0.055, '#a8642c', null, 0.15);
  }
  g.restore();

  // 머리 외곽선 그리기
  mochiPath(0, hy, hrx, hry);
  g.strokeStyle = O; g.lineWidth = lw; g.stroke();

  // 정수리 귀여운 포인트 (병아리 솜털·새싹, 개구리 새싹, 원숭이·곰 솜털)
  if (id === 'chick') {
    ell(-R * 0.1, hy - hry * 1.08, R * 0.1, R * 0.2, C, O, -0.35);
    ell(R * 0.08, hy - hry * 1.12, R * 0.11, R * 0.24, C, O, 0.25);
  } else if (id === 'frog') {
    // 개구리 머리 위 귀여운 초록 새싹
    g.beginPath(); g.moveTo(0, hy - hry * 0.95); g.lineTo(0, hy - hry * 1.18); g.strokeStyle = '#317521'; g.stroke();
    ell(-R * 0.12, hy - hry * 1.2, R * 0.13, R * 0.07, '#64d439', '#317521', -0.4);
    ell(R * 0.12, hy - hry * 1.2, R * 0.13, R * 0.07, '#64d439', '#317521', 0.4);
  } else if (id === 'monkey' || id === 'bear') {
    g.beginPath();
    g.arc(0, hy - hry * 0.96, R * 0.12, Math.PI * 0.9, Math.PI * 2.1);
    g.fillStyle = C; g.fill(); g.strokeStyle = O; g.stroke();
  }

  const mood = state === 'sleep' ? 'sleep' : state === 'happy' ? 'happy' : state === 'trip' ? 'dizzy' : state === 'boost' ? 'boost' : 'n';

  // 눈 (동안 비율을 위해 얼굴 중하단에 배치)
  if (id === 'panda') {
    ell(-R * 0.39, hy + R * 0.1, R * 0.25, R * 0.3, '#2e2d38', null, 0.42);
    ell(R * 0.39, hy + R * 0.1, R * 0.25, R * 0.3, '#2e2d38', null, -0.42);
  }
  if (id === 'frog') eyes(R * 0.46, hy - R * 0.7, R * 0.175, mood, true);
  else if (id === 'panda') eyes(R * 0.39, hy + R * 0.08, R * 0.14, mood, true);
  else eyes(R * 0.39, hy + R * 0.06, R * 0.17, mood, false);

  // 발그레한 볼터치 + 귀여운 하이라이트 빗금
  for (const sx of [-1, 1]) {
    const cx = sx * R * 0.66, cy = hy + R * 0.28;
    ell(cx, cy, R * 0.19, R * 0.115, 'rgba(255,105,140,.52)');
    g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = Math.max(1, lw * 0.65);
    g.beginPath();
    g.moveTo(cx - R * 0.04, cy - R * 0.03); g.lineTo(cx - R * 0.01, cy + R * 0.03);
    g.moveTo(cx + R * 0.03, cy - R * 0.03); g.lineTo(cx + R * 0.06, cy + R * 0.03);
    g.stroke();
  }
  g.lineWidth = lw;

  // 코·입 (눈과 가까운 아기 비율)
  g.strokeStyle = '#3b2318'; g.lineWidth = lw;
  if (id === 'chick') {
    // 통통하고 둥근 병아리 부리
    ell(0, hy + R * 0.22, R * 0.18, R * 0.12, '#ff9824', '#b85d0a');
    ell(-R * 0.05, hy + R * 0.19, R * 0.06, R * 0.03, 'rgba(255,255,255,.6)');
  } else if (id === 'pig') {
    // 복스러운 돼지 코
    ell(0, hy + R * 0.24, R * 0.28, R * 0.2, '#ffa1bc', O);
    ell(-R * 0.095, hy + R * 0.24, R * 0.048, R * 0.075, '#a84462');
    ell(R * 0.095, hy + R * 0.24, R * 0.048, R * 0.075, '#a84462');
    if (state === 'happy' || state === 'boost') {
      g.beginPath(); g.arc(0, hy + R * 0.44, R * 0.12, 0, Math.PI); g.fillStyle = '#ff6b8b'; g.fill(); g.stroke();
    }
  } else if (id === 'koala') {
    ell(0, hy + R * 0.18, R * 0.16, R * 0.22, '#363642');
    ell(-R * 0.04, hy + R * 0.11, R * 0.045, R * 0.06, 'rgba(255,255,255,.45)');
  } else if (id === 'frog') {
    if (state === 'happy' || state === 'boost') {
      g.beginPath(); g.arc(0, hy + R * 0.14, R * 0.26, 0, Math.PI);
      g.fillStyle = '#ff6b8b'; g.fill(); g.stroke();
      ell(0, hy + R * 0.3, R * 0.14, R * 0.07, '#ffa3b8');
    } else {
      // 귀여운 개구리 미소
      g.beginPath(); g.arc(0, hy + R * 0.06, R * 0.34, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    }
  } else {
    const nose = id === 'cat' || id === 'tiger' || id === 'bunny' ? '#ff85a6' : '#32221e';
    const ny = hy + R * 0.2;

    if (state === 'happy' || state === 'boost') {
      // 활짝 웃는 반달 입 + 입 안쪽으로 클리핑된 분홍 혀
      g.save();
      g.beginPath();
      g.arc(0, ny + R * 0.08, R * 0.14, 0, Math.PI);
      g.closePath();
      g.fillStyle = '#d94b68'; g.fill();
      g.clip();
      ell(0, ny + R * 0.2, R * 0.11, R * 0.08, '#ff9ebb');
      g.restore();
      g.beginPath();
      g.arc(0, ny + R * 0.08, R * 0.14, 0, Math.PI);
      g.closePath();
      g.stroke();
    } else if (state === 'trip') {
      // 꽈당 시 깜짝 놀란 동그란 입
      ell(0, ny + R * 0.13, R * 0.065, R * 0.075, '#d94b68', '#3b2318');
    } else if (id === 'monkey') {
      // 원숭이는 둥글고 활기찬 미소
      g.beginPath();
      g.arc(0, ny + R * 0.02, R * 0.16, 0.18 * Math.PI, 0.82 * Math.PI);
      g.stroke();
    } else {
      // 토끼 앞니: ω 윗입술 볼살 아래로 귀엽게 쏙 나와 보이도록 먼저 그림
      if (id === 'bunny') {
        g.fillStyle = '#fff';
        g.beginPath();
        g.roundRect(-R * 0.06, ny + R * 0.05, R * 0.12, R * 0.14, [0, 0, R * 0.04, R * 0.04]);
        g.fill(); g.stroke();
      }
      // ω 윗입술: 얼굴색( 또는 주둥이색)으로 내부를 채워 앞니 윗부분이 입술에 자연스럽게 가려지게 함
      const lipFill = id === 'bear' || id === 'tiger' || id === 'fox' ? B : C;
      g.beginPath();
      g.arc(-R * 0.08, ny + R * 0.04, R * 0.08, Math.PI, 0, true);
      g.arc(R * 0.08, ny + R * 0.04, R * 0.08, Math.PI, 0, true);
      g.fillStyle = lipFill; g.fill();
      g.stroke();
    }

    // 코를 입선 위에 마지막으로 그려 코와 입 중앙이 깔끔하게 이어지게 함
    ell(0, ny, R * 0.095, R * 0.068, nose);
    ell(-R * 0.03, ny - R * 0.02, R * 0.028, R * 0.018, 'rgba(255,255,255,.55)');

    // 고양이 수염
    if (id === 'cat') {
      g.beginPath();
      for (const sx of [-1, 1]) {
        g.moveTo(sx * R * 0.62, hy + R * 0.18); g.lineTo(sx * R * 0.96, hy + R * 0.12);
        g.moveTo(sx * R * 0.62, hy + R * 0.28); g.lineTo(sx * R * 0.96, hy + R * 0.31);
      }
      g.stroke();
    }
  }

  // 쿨쿨 잘 때 불어나는 귀여운 하늘색 코풍선
  if (state === 'sleep') {
    const br = R * (0.14 + (Math.sin(ph * 0.5) + 1) * 0.06);
    ell(R * 0.22, hy + R * 0.2, br, br * 0.92, 'rgba(170,230,255,.75)', '#5aa9e6');
    ell(R * 0.22 - br * 0.3, hy + R * 0.2 - br * 0.3, br * 0.28, br * 0.2, '#fff');
  }

  g.restore(); // 머리 회전 복원
  g.restore(); // 전체 캐릭터 복원

  // 상태별 이펙트 (쿨쿨·꽈당·부스터)
  const top = y - s * 0.98 - bob;
  if (state === 'sleep') {
    const z = (ph * 0.2) % 1;
    g.save();
    g.globalAlpha = 1 - z;
    outlined('Z', x + s * 0.3, top - z * s * 0.28, s * 0.22, '#78b8ff', '#2c5aa0', 'Jua', s * 0.045);
    g.globalAlpha = 1;
    outlined('z', x + s * 0.19, top + s * 0.1, s * 0.15, '#a8d4ff', '#2c5aa0', 'Jua', s * 0.035);
    g.restore();
  }
  if (state === 'trip') {
    for (let i = 0; i < 3; i++) {
      const a = ph * 0.6 + i * 2.094;
      star(x + Math.cos(a) * s * 0.3, top + s * 0.05 + Math.sin(a) * s * 0.08, s * 0.068, i % 2 ? '#ff9ebb' : '#ffe047');
    }
  }
  if (state === 'boost') {
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = Math.max(2, s * 0.032);
    for (let i = -2; i <= 2; i++) {
      const lx = x + i * s * 0.11, l = s * (0.24 + ((ph * 0.7 + i * 1.3) % 1) * 0.28);
      g.beginPath(); g.moveTo(lx, top - s * 0.04); g.lineTo(lx, top - s * 0.04 - l); g.stroke();
    }
    star(x - s * 0.28, y - s * 0.45, s * 0.055, '#ffe047');
    star(x + s * 0.28, y - s * 0.62, s * 0.045, '#ff9ebb');
  }
}

// 통통하고 귀여운 별
function star(x, y, r, col) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.52 : r;
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath();
  g.fillStyle = col; g.fill();
  g.strokeStyle = '#c07800'; g.lineWidth = Math.max(1, r * 0.22); g.lineJoin = 'round'; g.stroke();
  ell(x - r * 0.22, y - r * 0.22, r * 0.16, r * 0.16, 'rgba(255,255,255,.8)');
}

// 반짝이는 입체 번호 풍선
function balloon(x, y, r, col, label) {
  g.strokeStyle = 'rgba(90,80,80,.65)'; g.lineWidth = Math.max(1, r * 0.085);
  g.beginPath(); g.moveTo(x, y + r * 1.15); g.quadraticCurveTo(x + r * 0.28, y + r * 1.6, x, y + r * 2.08); g.stroke();
  // 풍선 매듭
  tri(x - r * 0.2, y + r * 1.26, x + r * 0.2, y + r * 1.26, x, y + r * 1.04, col, 'rgba(0,0,0,.22)');
  // 풍선 본체
  ell(x, y, r * 1.03, r * 1.15, col, 'rgba(0,0,0,.24)');
  // 상단 빛 반사
  ell(x - r * 0.36, y - r * 0.44, r * 0.24, r * 0.34, 'rgba(255,255,255,.65)', null, 0.48);
  ell(x - r * 0.18, y - r * 0.72, r * 0.1, r * 0.1, 'rgba(255,255,255,.75)');
  outlined(label, x, y + r * 0.42, r * 1.25, '#fff', 'rgba(0,0,0,.28)', 'Jua', r * 0.2);
}

function outlined(txt, x, y, size, fill, stroke, font = 'Jua', lw) {
  g.font = `${size}px ${font}, 'Malgun Gothic', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.lineJoin = 'round'; g.lineWidth = lw || size * 0.2; g.strokeStyle = stroke; g.strokeText(txt, x, y); g.fillStyle = fill; g.fillText(txt, x, y);
}

/* ---------- 마블 룰렛 구슬 ---------- */
function marbleCol(i, n) {
  const h = Math.round((i * 360 / Math.max(n, 1) + (i % 2) * 180 * 0.15) % 360);
  return { c: `hsl(${h},88%,60%)`, d: `hsl(${h},78%,34%)`, l: `hsl(${h},100%,90%)` };
}

function drawMarble(x, y, r, col) {
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
  gr.addColorStop(0, col.l); gr.addColorStop(0.38, col.c); gr.addColorStop(1, col.d);
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = gr; g.fill();
  g.lineWidth = Math.max(1, r * 0.085); g.strokeStyle = 'rgba(0,0,0,.25)'; g.stroke();
  // 영롱한 유리구슬 반사광
  ell(x - r * 0.34, y - r * 0.4, r * 0.3, r * 0.19, 'rgba(255,255,255,.88)', null, -0.6);
  ell(x + r * 0.32, y + r * 0.36, r * 0.16, r * 0.1, 'rgba(255,255,255,.45)', null, -0.6);
}

window.Chars = {
  setContext(ctx) { g = ctx; },
  getContext() { return g; },
  ANIMALS, BALLOON, ell, tri, eyes, star, balloon, outlined, drawAnimal, marbleCol, drawMarble
};
})();
