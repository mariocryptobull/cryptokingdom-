// Marks layer: anchored labels, dimension lines, force arrows, live torque HUD, torque-angle graph, cards, captions. 1080×1920.
import * as THREE from 'three';
import { clamp, seg, ss, eo, lerp } from '/core/lib.js';

const cv = document.getElementById('ov'), g = cv.getContext('2d');
const MONO = '"JBMono", monospace', SANS = '"Inter", sans-serif';
const INK = '#f1efe9', DIM = 'rgba(241,239,233,.66)', ACC = '#ff6b3d', CYAN = '#59d4ff', LINE = 'rgba(241,239,233,.78)';
const CAP = { font: `800 54px ${SANS}`, y: 1430, max: 960 };

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
const win = (t, a, b, fi = .3, fo = .3) => Math.min(fade(t, a, fi), 1 - fade(t, b - fo, fo));

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

// arrow from (x0,y0) along unit (ux,uy) with length len (px)
function arrow(x0, y0, ux, uy, len, col, k, w = 10) {
  if (k <= 0 || len < 2) return;
  const x1 = x0 + ux * len, y1 = y0 + uy * len, hl = Math.min(34, len * .5), nx = -uy, ny = ux;
  g.globalAlpha = k; g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round';
  g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 8;
  g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 - ux * hl * .7, y1 - uy * hl * .7); g.stroke();
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - ux * hl + nx * hl * .55, y1 - uy * hl + ny * hl * .55); g.lineTo(x1 - ux * hl - nx * hl * .55, y1 - uy * hl - ny * hl * .55); g.closePath(); g.fill();
  g.shadowBlur = 0; g.lineCap = 'butt';
}
function tag(x, y, text, col, k, font = `700 34px ${MONO}`, align = 'left') {
  if (k <= 0) return;
  g.globalAlpha = k; g.font = font; g.textAlign = align; const w = g.measureText(text).width, px = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
  g.fillStyle = 'rgba(14,15,17,.78)'; g.fillRect(px - 12, y - 34, w + 24, 46);
  g.fillStyle = col; g.fillText(text, x, y); g.textAlign = 'left';
  if (k > .99) texts.push({ id: 'tag' + text, text, x0: px - 12, y0: y - 34, x1: px + w + 12, y1: y + 12 });
}
// dimension line between two screen points, offset along the screen normal
function dim(a, b, off, text, k, col = INK) {
  if (k <= 0) return;
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * off, ny = dx / l * off, gr = eo(k);
  const A = [a[0] + nx, a[1] + ny], B = [a[0] + nx + dx * gr, a[1] + ny + dy * gr];
  g.globalAlpha = k; g.strokeStyle = col; g.lineWidth = 2;
  g.setLineDash([6, 6]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(A[0], A[1]); g.moveTo(b[0], b[1]); g.lineTo(b[0] + nx, b[1] + ny); g.stroke(); g.setLineDash([]);
  g.lineWidth = 3; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
  for (const P of [A, B]) { g.beginPath(); g.moveTo(P[0] - ny / Math.abs(off) * 12, P[1] + nx / Math.abs(off) * 12); g.lineTo(P[0] + ny / Math.abs(off) * 12, P[1] - nx / Math.abs(off) * 12); g.stroke(); }
  if (k > .6) tag((A[0] + B[0]) / 2 + nx * .3, (A[1] + B[1]) / 2 + ny * .3 + 12, text, col, (k - .6) / .4, `700 32px ${MONO}`, 'center');
}

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, th, m } = c;
  const pv = proj(c.pivot), ins = proj(c.ins), hd = proj(c.hand), A = proj(c.A);

  // ---- title ----
  card(t, [
    { id: 't1', font: `800 92px ${SANS}`, col: INK, text: 'YOUR BICEP', y: 250, d: .05 },
    { id: 't2', font: `800 92px ${SANS}`, col: INK, text: 'IS A LEVER', y: 350, d: .15 },
    { id: 't3', font: `800 52px ${SANS}`, col: ACC, text: "(AND IT'S LOSING)", y: 430, d: T.losing - .1 },
    { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · SCHEMATIC MODEL', y: 486, d: .5 },
  ], 0, T.apart + .2);
  if (t < T.apart + .2) { g.globalAlpha = fade(t, .1, .5) * (1 - fade(t, T.apart - .2, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 150, 80 * eo(seg(t, .1, .7)), 6); }

  // ---- teardown labels ----
  const fm = proj(c.frameMid), bm = proj(c.beamMid), pn = proj(c.pinPt), am = proj(c.actMid);
  label(t, { id: 'fr', t0: T.frame, t1: T.act, a: fm, ly: 760, idx: 'HUMERUS', name: 'The frame', spec: 'upper arm bone', side: 'L', lx: 250 });
  label(t, { id: 'bm', t0: T.beam, t1: T.act, a: bm, ly: 1080, idx: 'RADIUS + ULNA', name: 'The beam', spec: 'twin forearm bones', side: 'L', lx: 1010 });
  label(t, { id: 'pv', t0: T.pivot, t1: T.tendon, a: pn, ly: 1060, idx: 'ELBOW', name: 'The pivot', spec: 'hinge pin', side: 'R', lx: 90 });
  label(t, { id: 'ac', t0: T.act + .05, t1: T.db, a: am, ly: 600, idx: 'BICEPS', name: 'The actuator', spec: 'pulls, never pushes', side: 'L', lx: 1000 });
  label(t, { id: 'td', t0: T.tendon + .9, t1: T.db, a: ins, ly: 1180, idx: 'TENDON', name: 'Insertion', spec: 'on the radius', side: 'R', lx: 90 });
  // dimension lines (forearm frame: pivot → insertion, pivot → hand), drawn under the forearm
  const dk4 = win(t, T.ins, T.speed, .5), dk35 = win(t, T.db35 - .1, T.speed, .6);
  dim(pv, proj(c.ins.clone().setZ(0)), 70, '4 cm', dk4, CYAN);
  dim(pv, hd, -150, '35 cm', dk35, ACC);
  // pivot / effort / load
  { const k = win(t, T.pel - .1, T.bal + .2, .25); const items = [[pv, 'PIVOT', INK, 0], [ins, 'EFFORT', CYAN, .45], [hd, 'LOAD', ACC, .9]];
    for (const [p, s, col, d] of items) { const kk = Math.min(k, fade(t, T.pel + d - .1, .25)); if (kk <= 0) continue; g.globalAlpha = kk; g.fillStyle = col; g.beginPath(); g.arc(p[0], p[1], 13, 0, 7); g.fill(); tag(p[0] + (s === 'PIVOT' ? -90 : 0), p[1] + (s === 'PIVOT' ? 70 : -60), s, col, kk, `800 32px ${SANS}`, 'center'); } }
  card(t, [{ id: 'c3', font: `800 72px ${SANS}`, col: INK, text: 'THIRD-CLASS LEVER', y: 300, d: 0 }, { id: 'c3b', font: `500 28px ${MONO}`, col: DIM, text: 'pivot · effort · load — effort in the middle', y: 352, d: .2 }], T.cls - .1, T.bal + .3);

  // ---- forces ----
  const fShow = win(t, T.kg - .1, T.pay - .2, .35) * (1 - .0);
  const WPX = 78;                                                       // px per 98 N, the biceps arrow uses the same scale
  { // weight arrow at the hand (straight down on screen)
    const k = fShow * (1 - c.ek); arrow(hd[0], hd[1] + 40, 0, 1, WPX, ACC, k, 12);
    tag(hd[0] + 26, hd[1] + 40 + WPX * .7, '98 N', ACC, k * fade(t, T.kg + .2, .3), `700 32px ${MONO}`);
  }
  { // biceps force: along the actuator toward its origin, length ∝ force (same scale)
    const k = win(t, T.lev4 + .2, T.pay - .2, .4) * (1 - c.ek), ux = A[0] - ins[0], uy = A[1] - ins[1], l = Math.hypot(ux, uy);
    const grow = eo(seg(t, T.pull, T.n860 + .3)), Fp = m.F * (t < T.n860 + .3 ? grow : 1);
    const gk = win(t, T.load - .1, T.pay - .2, .4), len0 = WPX * Fp / c.WN, sx = 46;
    const len = gk > 0 ? Math.min(len0, Math.max(60, (ins[1] - 510) / Math.max(.2, Math.abs(uy / l)))) : len0;
    arrow(ins[0] + sx, ins[1], ux / l, uy / l, len, CYAN, k, 12);
    tag(ins[0] + sx + 22 + ux / l * len * .45, ins[1] + uy / l * len * .45, `${Math.round(Fp)} N`, CYAN, k * fade(t, T.pull + .2, .3), `700 32px ${MONO}`);
  }
  { // torque arc about the pivot
    const k = win(t, T.at35 - .1, T.pay - .2, .35) * (1 - c.ek), r = 64; if (k > 0) {
      g.globalAlpha = k; g.strokeStyle = ACC; g.lineWidth = 6; const a0 = -.2 * Math.PI, a1 = .55 * Math.PI;
      g.beginPath(); g.arc(pv[0], pv[1], r, a0, a1); g.stroke();
      const ex = pv[0] + r * Math.cos(a1), ey = pv[1] + r * Math.sin(a1); g.fillStyle = ACC; g.beginPath(); g.moveTo(ex - 16, ey - 4); g.lineTo(ex + 6, ey - 18); g.lineTo(ex + 8, ey + 10); g.closePath(); g.fill();
    } }

  // ---- live HUD (bottom) ----
  { const k = win(t, T.bal, T.pay - .2, .4); if (k > 0) {
      g.globalAlpha = k * .85; g.fillStyle = 'rgba(14,15,17,.82)'; g.fillRect(60, 1540, 960, 190);
      g.globalAlpha = k; g.strokeStyle = 'rgba(241,239,233,.18)'; g.lineWidth = 2; g.strokeRect(60, 1540, 960, 190);
      const cols = [['ANGLE', `${Math.round(th)}°`, INK], ['LOAD TORQUE', `${m.tq.toFixed(1)} N·m`, ACC], ['BICEPS', `${Math.round(m.F)} N`, CYAN], ['RATIO', `${m.ratio.toFixed(1)}×`, INK]];
      const xs = [100, 300, 590, 850];
      cols.forEach(([h, v, col], i) => { g.font = `500 22px ${MONO}`; g.fillStyle = DIM; g.fillText(h, xs[i], 1590); g.font = `700 46px ${MONO}`; g.fillStyle = col; g.fillText(v, xs[i], 1652); });
      g.font = `400 22px ${MONO}`; g.fillStyle = DIM; g.fillText(`10 kg dumbbell · grip 35 cm · biceps lever ${(m.r * 10).toFixed(1)} cm`, 100, 1700);
      texts.push({ id: 'hud', text: 'hud', x0: 60, y0: 1540, x1: 1020, y1: 1730 });
    } }

  // ---- 7–10× card ----
  card(t, [{ id: 'r1', font: `800 130px ${SANS}`, col: CYAN, text: '7–10×', y: 310, d: 0 }, { id: 'r2', font: `500 28px ${MONO}`, col: INK, text: 'BICEPS FORCE ÷ WEIGHT IN HAND', y: 362, d: .2 }], T.r710 - .1, T.speed + .1);

  // ---- speed: actuator travel vs hand travel ----
  { const k = win(t, T.cm1 - .1, T.small + .3, .3); if (k > 0) {
      const m0 = c.mech(90), dLen = (m.len - m0.len) * 10, dTh = (90 - th) * Math.PI / 180, dHand = c.L * 10 * dTh;
      // arcs traced by the insertion and the hand
      const arc = (rad, off, col) => { g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); for (let i = 0; i <= 24; i++) { const a = lerp(90, th, i / 24), u = c.uvec(a), P = i === 0 ? null : 0; const w = c.pivot.clone().add(new THREE.Vector3(u.x * rad - (off ? .12 * u.y : 0), u.y * rad + (off ? .12 * u.x : 0), .45)); const s = proj(w); i ? g.lineTo(s[0], s[1]) : g.moveTo(s[0], s[1]); } g.stroke(); };
      g.globalAlpha = k; arc(c.L, false, ACC); arc(c.D, true, CYAN);
      tag(hd[0] - 30, hd[1] - 110, `hand ${dHand.toFixed(1)} cm`, ACC, k * fade(t, T.cm9 - .2, .3), `700 34px ${MONO}`, 'right');
      tag(ins[0] + 10, ins[1] + 150, `actuator ${Math.abs(dLen).toFixed(1)} cm`, CYAN, k, `700 34px ${MONO}`);
    } }
  card(t, [{ id: 'sp1', font: `800 76px ${SANS}`, col: INK, text: 'FORCE → SPEED', y: 300, d: 0 }, { id: 'sp2', font: `500 28px ${MONO}`, col: DIM, text: '1 cm of muscle = ~9 cm of hand', y: 352, d: .2 }], T.speed - .05, T.load);

  // ---- torque vs angle graph (top) ----
  { const k = win(t, T.load - .1, T.pay - .2, .4); if (k > 0) {
      const X0 = 130, X1 = 960, Y0 = 420, Y1 = 190, TH = 150, TQ = 40, gx = a => X0 + (X1 - X0) * a / TH, gy = q => Y0 - (Y0 - Y1) * q / TQ;
      g.globalAlpha = k * .85; g.fillStyle = 'rgba(14,15,17,.8)'; g.fillRect(70, 135, 940, 340);
      g.globalAlpha = k; g.strokeStyle = 'rgba(241,239,233,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X0, Y1 - 10); g.lineTo(X0, Y0); g.lineTo(X1 + 10, Y0); g.stroke();
      g.font = `500 22px ${MONO}`; g.fillStyle = DIM; g.textAlign = 'center';
      for (const a of [0, 45, 90, 135]) { g.fillText(`${a}°`, gx(a), Y0 + 34); }
      g.textAlign = 'left'; g.fillText('LOAD TORQUE (N·m) vs ELBOW ANGLE', X0 + 10, 172);
      g.textAlign = 'right'; for (const q of [0, 20, 40]) g.fillText(q, X0 - 12, gy(q) + 8); g.textAlign = 'left';
      g.strokeStyle = ACC; g.lineWidth = 5; g.beginPath(); for (let a = 0; a <= TH; a += 2) { const q = c.WN * .35 * Math.sin(a * Math.PI / 180); a ? g.lineTo(gx(a), gy(q)) : g.moveTo(gx(a), gy(q)); } g.stroke();
      const sk = win(t, T.stick - .2, T.pay - .2, .3);
      if (sk > 0) { g.globalAlpha = k * sk; g.setLineDash([8, 8]); g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(gx(90), Y1 - 10); g.lineTo(gx(90), Y0); g.stroke(); g.setLineDash([]);
        g.font = `800 30px ${SANS}`; g.fillStyle = INK; g.textAlign = 'center'; g.fillText('STICKING POINT', gx(90), 222); g.textAlign = 'left'; g.globalAlpha = k; }
      const q = m.tq; g.fillStyle = INK; g.beginPath(); g.arc(gx(th), gy(q), 12, 0, 7); g.fill(); g.strokeStyle = ACC; g.lineWidth = 4; g.stroke();
      texts.push({ id: 'graph', text: 'graph', x0: 70, y0: 135, x1: 1010, y1: 475 });
    } }

  // ---- payoff / closer ----
  card(t, [{ id: 'p1', font: `800 150px ${SANS}`, col: CYAN, text: '≈9×', y: 330, d: 0 }, { id: 'p2', font: `800 46px ${SANS}`, col: INK, text: "WHAT YOU'RE HOLDING", y: 400, d: .25 }], T.pay - .1, T.next - .1);
  card(t, [{ id: 'n1', font: `800 76px ${SANS}`, col: INK, text: 'WHAT SHOULD WE', y: 280, d: 0 }, { id: 'n2', font: `800 76px ${SANS}`, col: ACC, text: 'TAKE APART NEXT?', y: 366, d: .1 }], T.next - .1, T.congrats - .05);
  card(t, [{ id: 'e1', font: `800 76px ${SANS}`, col: INK, text: 'PIVOT · EFFORT · LOAD', y: 300, d: .05 }, { id: 'e2', font: `500 26px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 352, d: .4 }], T.congrats, 99);

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
