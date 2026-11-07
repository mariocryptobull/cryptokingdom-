// Marks layer: anchored labels, force arrows, travel bars, cards and captions. 1080×1920.
import * as THREE from 'three';
import { clamp, seg, ss, eo } from '/core/lib.js';

const cv = document.getElementById('ov'), g = cv.getContext('2d');
const MONO = '"JBMono", monospace', SANS = '"Inter", sans-serif';
const INK = '#f1efe9', DIM = 'rgba(241,239,233,.66)', ACC = '#ff6b3d', BLU = '#59d4ff', LINE = 'rgba(241,239,233,.78)';
const CAP = { font: `800 54px ${SANS}`, y: 1610, max: 960 };

let CUES = [], texts = [];
export async function initOverlay({ VDUR, TL }) {
  for (let li = 0; li < TL.vo.length; li++) {
    const v = TL.vo[li], d = VDUR[v.id], next = TL.vo[li + 1] ? TL.vo[li + 1].t : TL.dur;
    const n = v.chunks.map(c => c.replace(/[^A-Za-z0-9]/g, '').length + 2), tot = n.reduce((a, b) => a + b, 0);
    let t = v.t;
    v.chunks.forEach((c, i) => { const dt = d * n[i] / tot, last = i === v.chunks.length - 1; CUES.push({ t0: t - .04, t1: last ? Math.min(t + dt + .45, next - .06) : t + dt - .02, text: c }); t += dt; });
  }
  window.CUES = CUES;
}
export const overlayTexts = () => texts;

const v3 = new THREE.Vector3();
let CAM, Wd, Hd;
const proj = v => { v3.copy(v).project(CAM); return [(v3.x + 1) / 2 * Wd, (1 - v3.y) / 2 * Hd, v3.z]; };
const fade = (t, a, d = .3) => ss(seg(t, a, a + d));
const win = (t, a, b, d = .3) => fade(t, a, d) * (1 - fade(t, b - d, d));

function label(t, o) {
  const { t0, t1, a, ly, idx, name, spec, id } = o;
  const side = o.side || (a[0] > 560 ? 'L' : 'R'), lx = o.lx ?? (side === 'L' ? 470 : 610), dir = side === 'L' ? -1 : 1;
  const dl = eo(seg(t, t0, t0 + .38)), tx = fade(t, t0 + .18, .32), out = 1 - fade(t, t1 - .3, .3);
  if (dl <= 0 || out <= 0) return;
  const [ax, ay] = a, ex = lx - dir * 46;
  g.globalAlpha = out;
  g.fillStyle = INK; g.beginPath(); g.arc(ax, ay, 5, 0, 7); g.fill();
  g.strokeStyle = 'rgba(241,239,233,.4)'; g.lineWidth = 1.5; g.beginPath(); g.arc(ax, ay, 5 + 9 * dl, 0, 7); g.stroke();
  const s1 = Math.hypot(ex - ax, ly - ay), s2 = Math.abs(lx - dir * 16 - ex), len = (s1 + s2) * dl;
  g.strokeStyle = LINE; g.lineWidth = 2; g.beginPath(); g.moveTo(ax, ay);
  if (len <= s1) g.lineTo(ax + (ex - ax) * len / s1, ay + (ly - ay) * len / s1);
  else { g.lineTo(ex, ly); g.lineTo(ex + dir * (len - s1), ly); }
  g.stroke();
  if (tx <= 0) return;
  g.globalAlpha = out * tx; const dx = (1 - tx) * 12 * dir;
  g.textAlign = side === 'L' ? 'right' : 'left'; g.textBaseline = 'alphabetic';
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 10;
  { g.font = `700 44px ${SANS}`; let bw = g.measureText(name).width; if (spec) { g.font = `400 26px ${MONO}`; bw = Math.max(bw, g.measureText(spec).width); } const bx = side === 'L' ? lx + dx - bw - 14 : lx + dx - 14; g.shadowBlur = 0; g.fillStyle = 'rgba(14,15,17,.72)'; g.fillRect(bx, ly - (idx ? 66 : 42), bw + 28, (idx ? 66 : 42) + (spec ? 58 : 18)); g.shadowBlur = 10; }
  if (idx) { g.fillStyle = ACC; g.font = `500 24px ${MONO}`; g.fillText(idx, lx + dx, ly - 40); }
  g.fillStyle = INK; g.font = `700 44px ${SANS}`; g.fillText(name, lx + dx, ly + 4);
  let w = g.measureText(name).width;
  if (spec) { g.fillStyle = DIM; g.font = `400 26px ${MONO}`; g.fillText(spec, lx + dx, ly + 42); w = Math.max(w, g.measureText(spec).width); }
  g.shadowBlur = 0; g.textAlign = 'left';
  if (tx > .99 && out > .99) { const x0 = side === 'L' ? lx - w : lx, x1 = side === 'L' ? lx : lx + w; texts.push({ id, text: name + (spec ? ' ' + spec : ''), x0: Math.max(0, x0), y0: ly - 64, x1: Math.min(Wd, x1), y1: ly + 50 }); }
}

function card(t, items, t0, t1) {
  for (const it of items) {
    const a = fade(t, t0 + it.d, .45) * (1 - fade(t, t1 - .35, .35)); if (a <= 0) continue;
    g.globalAlpha = a; g.font = it.font; g.fillStyle = it.col; g.textAlign = 'center';
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 12;
    g.fillText(it.text, Wd / 2, it.y + (1 - a) * 12); g.shadowBlur = 0;
    const w = g.measureText(it.text).width;
    if (a > .99) texts.push({ id: it.id, text: it.text, x0: Wd / 2 - w / 2, y0: it.y - 70, x1: Wd / 2 + w / 2, y1: it.y + 14 });
    g.textAlign = 'left';
  }
}

// force arrow from screen point (x, y) along (ux, uy) of length len px, with a value tag
function arrow(k, x, y, ux, uy, len, col, text, tagSide = 1) {
  if (k <= 0) return;
  const l = len * eo(k), x1 = x + ux * l, y1 = y + uy * l, hw = 13;
  g.globalAlpha = Math.min(1, k * 1.5);
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 7; g.lineCap = 'round';
  g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 8;
  g.beginPath(); g.moveTo(x, y); g.lineTo(x1 - ux * 14, y1 - uy * 14); g.stroke();
  g.beginPath(); g.moveTo(x1 + ux * 8, y1 + uy * 8); g.lineTo(x1 - ux * 20 - uy * hw, y1 - uy * 20 + ux * hw); g.lineTo(x1 - ux * 20 + uy * hw, y1 - uy * 20 - ux * hw); g.closePath(); g.fill();
  if (text) {
    g.font = `700 34px ${MONO}`; const w = g.measureText(text).width;
    const mx = x + ux * l * .5, my = y + uy * l * .5;
    let tx = Math.abs(uy) > .5 ? mx + tagSide * 22 + (tagSide < 0 ? -w : 0) : mx - w / 2, ty = Math.abs(uy) > .5 ? my + 12 : my - 22;
    tx = clamp(tx, 24, Wd - 24 - w);
    g.fillStyle = 'rgba(14,15,17,.78)'; g.fillRect(tx - 8, ty - 32, w + 16, 44);
    g.fillStyle = col; g.fillText(text, tx, ty);
  }
  g.shadowBlur = 0; g.lineCap = 'butt';
}
function bar(k, a, b, col, text, vertical) {
  if (k <= 0) return;
  g.globalAlpha = k; g.strokeStyle = col; g.lineWidth = 4; g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 6;
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  const tick = (p) => { g.beginPath(); if (vertical) { g.moveTo(p[0] - 14, p[1]); g.lineTo(p[0] + 14, p[1]); } else { g.moveTo(p[0], p[1] - 14); g.lineTo(p[0], p[1] + 14); } g.stroke(); };
  tick(a); tick(b);
  g.font = `700 32px ${MONO}`; const w = g.measureText(text).width;
  let tx, ty; if (vertical) { tx = a[0] - 26 - w; ty = (a[1] + b[1]) / 2 + 11; } else { tx = (a[0] + b[0]) / 2 - w / 2; ty = a[1] + 50; }
  tx = clamp(tx, 24, Wd - 24 - w);
  g.fillStyle = 'rgba(14,15,17,.78)'; g.fillRect(tx - 8, ty - 31, w + 16, 42); g.fillStyle = col; g.fillText(text, tx, ty); g.shadowBlur = 0;
}

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, h, vel, ratio, MC, F, HP, plates, pinG, headG, R, PIN, plateY, STOP, LMAX } = c, V = (x, y, z) => new THREE.Vector3(x, y, z);
  // ---- title ----
  card(t, [
    { id: 't1', font: `800 92px ${SANS}`, col: INK, text: 'WHY DOES 50 LB', y: 270, d: .1 },
    { id: 't2', font: `800 92px ${SANS}`, col: ACC, text: 'FEEL LIGHTER?', y: 370, d: .2 },
    { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · CABLE MACHINE', y: 428, d: .4 },
  ], 0, T.stack - .1);
  if (t < T.stack) { g.globalAlpha = fade(t, .1, .5) * (1 - fade(t, T.stack - .4, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 160, 80 * eo(seg(t, .1, .7)), 6); }
  // ---- teardown labels ----
  const pl = plates[7].m.position, rodTop = V(-.35 - .0, 1.9, c.rodsZ), pinK = V(pinG.position.x, pinG.position.y, pinG.position.z + .15);
  label(t, { id: 'ws', t0: T.stack + .4, t1: T.rods, a: proj(V(pl.x - .12, pl.y, .1)), ly: 1240, idx: '01', name: 'Weight stack', spec: 'steel plates · 10 lb steps', side: 'R', lx: 110 });
  label(t, { id: 'gr', t0: T.rods + .1, t1: T.pin, a: proj(rodTop), ly: 600, idx: '02', name: 'Guide rods', spec: 'keep the plates in line', side: 'R', lx: 110 });
  label(t, { id: 'sp', t0: T.pin + .2, t1: T.cable - .1, a: proj(pinK), ly: 1260, idx: '03', name: 'Selector pin', spec: 'pin at 50 → top 5 plates ride', side: 'R', lx: 110 });
  label(t, { id: 'cb', t0: T.cable + .2, t1: T.pulleys, a: proj(V(.55, 2.30, F[1].z * .5)), ly: 640, idx: '04', name: 'Steel cable', spec: '1/8″ wire rope · nylon jacket', side: 'R', lx: 110 });
  label(t, { id: 'pu', t0: T.pulleys + .1, t1: T.handle + .1, a: proj(V(F[1].x, F[1].y, F[1].z + .02)), ly: 640, idx: '05', name: 'Pulleys', spec: 'sealed ball-bearing sheaves', side: 'L', lx: 960 });
  label(t, { id: 'hd', t0: T.handle + .1, t1: T.one - .3, a: proj(V(HP.x + .12, HP.y, HP.z)), ly: 1250, idx: '06', name: 'Handle', spec: 'where you feel it', side: 'L', lx: 960 });
  label(t, { id: 'mv', t0: T.movable + .2, t1: T.strands, a: proj(V(MC.x - .04, MC.y + .02, .03)), ly: 640, idx: '07', name: 'Movable pulley', spec: 'rides on the stack', side: 'L', lx: 960 });
  // ---- ratio badge ----
  card(t, [{ id: 'r1', font: `800 120px ${SANS}`, col: INK, text: '1 : 1', y: 330, d: 0 }, { id: 'r1b', font: `500 30px ${MONO}`, col: DIM, text: 'cable tied straight to the stack', y: 390, d: .2 }], T.one + .3, T.movable);
  card(t, [{ id: 'r2', font: `800 120px ${SANS}`, col: BLU, text: '2 : 1', y: 330, d: 0 }, { id: 'r2b', font: `500 30px ${MONO}`, col: DIM, text: 'two strands hold the stack', y: 390, d: .2 }], T.movable + .3, T.fd);
  card(t, [{ id: 'fd1', font: `800 66px ${SANS}`, col: INK, text: '50 lb × 1 ft = 25 lb × 2 ft', y: 320, d: 0 }, { id: 'fd2', font: `500 30px ${MONO}`, col: DIM, text: 'same work · force traded for distance', y: 380, d: .2 }], T.fd, T.four);
  card(t, [{ id: 'q1', font: `800 120px ${SANS}`, col: ACC, text: '4 : 1', y: 330, d: 0 }, { id: 'q2', font: `500 32px ${MONO}`, col: INK, text: '¼ the force · 4× the travel', y: 392, d: .2 }], T.four, T.real);
  card(t, [{ id: 'f1', font: `800 70px ${SANS}`, col: ACC, text: 'FRICTION', y: 310, d: 0 }, { id: 'f2', font: `500 30px ${MONO}`, col: INK, text: '≈3–5% lost per ball-bearing pulley', y: 370, d: .2 }], T.real, T.stretch - .2);
  card(t, [{ id: 'k1', font: `800 70px ${SANS}`, col: BLU, text: 'CABLE STRETCH', y: 310, d: 0 }, { id: 'k2', font: `500 30px ${MONO}`, col: INK, text: '≈0.02% at 25 lb → ~1 mm over ~5 m', y: 370, d: .2 }], T.stretch, T.e09 + .3);
  card(t, [{ id: 'p1', font: `800 64px ${SANS}`, col: INK, text: 'LABEL 50 LB → HANDS ≈25', y: 310, d: 0 }, { id: 'p2', font: `600 34px ${MONO}`, col: ACC, text: '≈30 pulling  ·  ≈20 letting go', y: 372, d: .3 }], T.pay, T.next - .1);
  card(t, [{ id: 'n1', font: `800 84px ${SANS}`, col: INK, text: 'WHAT SHOULD WE', y: 300, d: 0 }, { id: 'n2', font: `800 84px ${SANS}`, col: ACC, text: 'TAKE APART NEXT?', y: 392, d: .15 }], T.next - .1, T.congrats - .1);
  card(t, [{ id: 'e1', font: `800 96px ${SANS}`, col: ACC, text: 'CONGRATS!', y: 290, d: 0 }, { id: 'e2', font: `700 44px ${SANS}`, col: INK, text: "You've discovered the cable machine", y: 360, d: .25 },
    { id: 'e3', font: `500 26px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 412, d: .5 }], T.congrats - .1, 99);
  // ---- forces ----
  const frc = Math.max(win(t, T.fifty - .3, T.e07, .35), win(t, T.lifting - .3, T.e08 + .2, .35), win(t, T.pay2 - .3, T.next - .2, .35));
  if (frc > 0) {
    const fr = (t > T.lifting - .3 && t < T.e08 + .3) || (t > T.pull30 - .2 && t < T.next);
    const hand = ratio === 1 ? 50 : fr ? (vel > .02 ? 30 : vel < -.02 ? 20 : 25) : 25;
    const hc = ratio === 1 ? INK : fr ? (vel > .02 ? ACC : vel < -.02 ? BLU : INK) : INK;
    const wB = proj(V(0, plateY(PIN) - .025 + h, .1));
    arrow(frc, wB[0], wB[1] + 8, 0, 1, 130, INK, '50 lb', -1);
    if (ratio === 2) {
      const s = t > T.strands - .2 || t > T.fd ? 1 : 0;
      for (const sx of [-1, 1]) { const p = proj(V(MC.x + sx * R, MC.y + .22, 0)); arrow(frc * (t < T.fd ? fade(t, T.strands, .4) : 1) * s, p[0], p[1], 0, -1, 95, BLU, '25', sx); }
    } else { const p = proj(V(R * 2 - R, STOP + .3 + h, 0)); arrow(frc * fade(t, T.one2, .4), p[0], p[1], 0, -1, 95, INK, '50', 1); }
    const hp = proj(V(HP.x + .16, HP.y, HP.z));
    if (t > T.fifty - .3) arrow(frc * (ratio === 1 ? 1 : fade(t, T.feel, .4)), hp[0], hp[1], 1, 0, 80, hc, `${fr ? '≈' : ''}${hand} lb`);
    if (fr && t < T.e08 + .3) { // which way friction acts
      const k = frc * fade(t, T.lifting, .3); g.globalAlpha = k; g.font = `600 30px ${MONO}`; g.textAlign = 'center';
      const msg = vel > .02 ? 'pulling: friction adds' : vel < -.02 ? 'lowering: friction helps' : '';
      if (msg) { const w = g.measureText(msg).width; g.fillStyle = 'rgba(14,15,17,.78)'; g.fillRect(Wd / 2 - w / 2 - 14, 1420, w + 28, 50); g.fillStyle = vel > 0 ? ACC : BLU; g.fillText(msg, Wd / 2, 1455); }
      g.textAlign = 'left';
    }
  }
  // per-pulley friction tags
  if (t > T.fric && t < T.e08 + .2) {
    const ps = [MC, F[0], F[1], F[2]];
    ps.forEach((p, i) => { const k = win(t, T.fric + i * .35, T.e08 + .2, .25); if (k <= 0) return; const q = proj(V(p.x + (i === 1 ? -.1 : .1), p.y + .13, p.z)); g.globalAlpha = k; g.font = `700 28px ${MONO}`; const s = '−5%'; const w = g.measureText(s).width; g.fillStyle = 'rgba(14,15,17,.78)'; g.fillRect(q[0] - w / 2 - 8, q[1] - 28, w + 16, 38); g.fillStyle = ACC; g.textAlign = 'center'; g.fillText(s, q[0], q[1]); g.textAlign = 'left'; });
  }
  // stretch tag on the top strand
  label(t, { id: 'st', t0: T.mm, t1: T.e09 + .2, a: proj(V(.55, 2.30, 0)), ly: 640, idx: 'Δ', name: '≈1 mm', spec: 'so the load arrives at once', side: 'R', lx: 110 });
  // ---- travel bars ----
  const trv = Math.max(win(t, T.fifty - .2, T.but - .1, .3), win(t, T.price - .3, T.four, .3), win(t, T.pay2 - .5, T.next - .2, .3));
  if (trv > 0 && h > .02) {
    const a = proj(V(-.3, STOP, .1)), b = proj(V(-.3, STOP + h, .1));
    bar(trv, a, b, INK, `↑ ${(h / .3048).toFixed(1)} ft`, true);
    const y = F[2].y - R - .12, x0 = F[2].x + .14;
    bar(trv, proj(V(x0, y, F[2].z)), proj(V(x0 + ratio * h, y, F[2].z)), ratio === 1 ? INK : BLU, `→ ${(ratio * h / .3048).toFixed(1)} ft`, false);
  }
  // ---- captions ----
  for (const cu of CUES) {
    if (t < cu.t0 || t > cu.t1) continue;
    const k = Math.min(fade(t, cu.t0, .08), 1 - fade(t, cu.t1 - .08, .08));
    g.globalAlpha = k; g.textAlign = 'center'; g.font = CAP.font;
    const w = g.measureText(cu.text).width, s = Math.min(1, CAP.max / w);
    g.save(); g.translate(Wd / 2, CAP.y); g.scale(s, s);
    g.lineJoin = 'round'; g.lineWidth = 10; g.strokeStyle = 'rgba(10,10,12,.9)'; g.strokeText(cu.text, 0, 0);
    g.fillStyle = INK; g.fillText(cu.text, 0, 0); g.restore(); g.textAlign = 'left';
  }
  g.globalAlpha = 1;
}
