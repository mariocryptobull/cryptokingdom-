// Marks layer: anchored labels, part tags, arrows, cards, captions. 1080×1920.
import * as THREE from 'three';
import { clamp, seg, ss, eo } from '/core/lib.js';

const cv = document.getElementById('ov'), g = cv.getContext('2d');
const MONO = '"JBMono", monospace', SANS = '"Inter", sans-serif';
const INK = '#f1efe9', DIM = 'rgba(241,239,233,.66)', ACC = '#ff6b3d', BLUE = '#6fc0ff', LINE = 'rgba(241,239,233,.78)';
const CAP = { font: `800 54px ${SANS}`, y: 1450, max: 960 };

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

// small tag over a part in the exploded overview
function tag(t, id, text, a, dy, t0, t1) {
  const k = fade(t, t0, .3) * (1 - fade(t, t1 - .3, .3)); if (k <= 0) return;
  const [x, y] = a, ty = y + dy;
  g.globalAlpha = k; g.strokeStyle = LINE; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, ty + (dy < 0 ? 12 : -34)); g.stroke();
  g.fillStyle = INK; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill();
  g.font = `600 30px ${MONO}`; g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 10; g.fillStyle = INK; g.fillText(text, x, ty); g.shadowBlur = 0;
  const w = g.measureText(text).width; if (k > .99) texts.push({ id, text, x0: x - w / 2, y0: ty - 30, x1: x + w / 2, y1: ty + 6 });
  g.textAlign = 'left';
}

function arrow(x0, y0, x1, y1, col, w, k) {
  const L = Math.hypot(x1 - x0, y1 - y0) * k; if (L < 2) return; const ux = (x1 - x0) / Math.hypot(x1 - x0, y1 - y0), uy = (y1 - y0) / Math.hypot(x1 - x0, y1 - y0);
  const ex = x0 + ux * L, ey = y0 + uy * L, hw = w * 1.9, hl = w * 2.4;
  g.fillStyle = col; g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'butt';
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(ex - ux * hl * .9, ey - uy * hl * .9); g.stroke();
  g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex - ux * hl - uy * hw, ey - uy * hl + ux * hw); g.lineTo(ex - ux * hl + uy * hw, ey - uy * hl - ux * hw); g.closePath(); g.fill();
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

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, CY, ek, P, FANX } = c, V = (x, y, z) => new THREE.Vector3(x, y, z);
  const px = n => P[n].dx * ek;
  card(t, [
    { id: 't1', font: `800 92px ${SANS}`, col: INK, text: 'HOW A JET', y: 270, d: .1 },
    { id: 't2', font: `800 92px ${SANS}`, col: INK, text: 'ENGINE WORKS', y: 370, d: .2 },
    { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · SCHEMATIC MODEL', y: 428, d: .4 },
  ], 0, T.turbofan + .2);
  if (t < T.turbofan + .2) { g.globalAlpha = fade(t, .1, .5) * (1 - fade(t, T.turbofan - .1, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 160, 80 * eo(seg(t, .1, .7)), 6); }
  // exploded overview tags
  const tg = (id, n, x, r, dy, text, d) => tag(t, id, text, proj(V(x + px(n), CY + (dy < 0 ? r : -r), 0)), dy, T.apart + 1.2 + d, T.grab - .5);
  tg('gf', 'fan', FANX, 1.5, -70, 'FAN', 0); tg('gc', 'hpc', -.8, .75, 80, 'COMPRESSOR', .15); tg('gb', 'comb', .26, .55, -90, 'COMBUSTOR', .3);
  tg('gt', 'lpt', 1.1, .65, 80, 'TURBINE', .45); tg('gn', 'plug', 2.0, .3, -90, 'NOZZLE', .6);
  card(t, [{ id: 'tf', font: `800 64px ${SANS}`, col: ACC, text: 'TURBOFAN', y: 300, d: 0 }, { id: 'tf2', font: `500 30px ${MONO}`, col: INK, text: 'two spools · high bypass', y: 352, d: .2 }], T.turbofan, T.grab + .2);
  // intake / exhaust arrows on "grab air ... throw it out the back"
  if (t > T.grab && t < T.fan) { const k = fade(t, T.grab + .2, .5) * (1 - fade(t, T.fan - .3, .3)); g.globalAlpha = k;
    const a0 = proj(V(-4.3, CY, 0)), a1 = proj(V(-3.3, CY, 0)), b0 = proj(V(2.6, CY, 0)), b1 = proj(V(4.2, CY, 0));
    arrow(a0[0], a0[1], a1[0], a1[1], BLUE, 12, eo(seg(t, T.grab + .2, T.grab + .9))); arrow(b0[0], b0[1], b1[0], b1[1], ACC, 16, eo(seg(t, T.back, T.back + .6))); }
  // labels
  label(t, { id: 'fn', t0: T.fan + .2, t1: T.never, a: proj(V(FANX, CY + .95, 0)), ly: 500, idx: '01', name: 'Fan', spec: 'pulls in a huge airflow', side: 'R', lx: 560 });
  label(t, { id: 'bp', t0: T.around, t1: T.core, a: proj(V(-1.2, CY - 1.02, 0)), ly: 1270, idx: '02', name: 'Bypass air', spec: 'around the core → most thrust', side: 'R', lx: 120 });
  label(t, { id: 'cm', t0: T.squeeze + .2, t1: T.comb, a: proj(V(-1.0, CY + .4, 0)), ly: 500, idx: '03', name: 'Compressor', spec: '3 + 9 stages · 30×+ pressure', side: 'R', lx: 120 });
  label(t, { id: 'cb', t0: T.comb + .2, t1: T.turb, a: proj(V(.3, CY - .43, 0)), ly: 1270, idx: '04', name: 'Combustor', spec: 'fuel + air, burning nonstop', side: 'R', lx: 120 });
  label(t, { id: 'tb', t0: T.turb + .2, t1: T.shaft, a: proj(V(1.1, CY + .45, 0)), ly: 500, idx: '05', name: 'Turbine', spec: 'hot gas spins it · 1 + 4 stages', side: 'R', lx: 120 });
  label(t, { id: 'sf', t0: T.shaft + .2, t1: T.nozzle, a: proj(V(-.6, CY, .0)), ly: 1270, idx: '06', name: 'Shafts', spec: 'turbine → compressor + fan', side: 'R', lx: 120 });
  label(t, { id: 'nz', t0: T.nozzle + .2, t1: T.goback + .3, a: proj(V(1.9, CY + .26, 0)), ly: 500, idx: '07', name: 'Nozzle', spec: 'fast jet out the back', side: 'L', lx: 960 });
  // thrust: air back, engine forward
  if (t > T.goback - .1 && t < T.cycle) { const k = fade(t, T.goback - .1, .3) * (1 - fade(t, T.cycle - .3, .3)); g.globalAlpha = k;
    const b0 = proj(V(2.6, CY, 0)), b1 = proj(V(3.9, CY, 0)); arrow(b0[0], b0[1], b1[0], b1[1], ACC, 18, eo(seg(t, T.goback, T.goback + .6)));
    const f0 = proj(V(.4, CY + 2.0, 0)), f1 = proj(V(-2.6, CY + 2.0, 0)); arrow(f0[0], f0[1], f1[0], f1[1], INK, 18, eo(seg(t, T.fwd, T.fwd + .6)));
    g.font = `700 34px ${MONO}`; g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 10;
    g.globalAlpha = k * fade(t, T.goback + .3, .3); g.fillStyle = ACC; g.fillText('AIR OUT', (b0[0] + b1[0]) / 2, b0[1] + 70);
    g.globalAlpha = k * fade(t, T.fwd + .3, .3); g.fillStyle = INK; g.fillText('THRUST', (f0[0] + f1[0]) / 2, f0[1] - 34);
    g.globalAlpha = k * fade(t, T.newton, .3); g.font = `600 30px ${MONO}`; g.fillStyle = 'rgba(14,15,17,.78)'; g.fillRect(Wd / 2 - 300, 1250, 600, 52); g.fillStyle = INK; g.fillText('every action → equal & opposite reaction', Wd / 2, 1286);
    g.shadowBlur = 0; g.textAlign = 'left'; }
  // cycle card
  if (c.ph >= 0) { const k = fade(t, T.cycle - .1, .3) * (1 - fade(t, T.cfm - .55, .3)); const W4 = ['SUCK', 'SQUEEZE', 'BANG', 'BLOW'];
    g.font = `800 42px ${SANS}`; g.textAlign = 'center'; const XS = [175, 420, 665, 900]; W4.forEach((w, i) => { g.globalAlpha = k * (i === c.ph ? 1 : .35); g.fillStyle = i === c.ph ? ACC : INK; g.fillText(w, XS[i], 300); if (i < 3) { g.globalAlpha = k * .5; g.fillStyle = INK; g.fillText('›', i === 0 ? 290 : i === 1 ? 548 : 785, 297); } }); g.textAlign = 'left'; }
  // CFM56 card + fan dimension + bypass bars
  card(t, [{ id: 's1', font: `800 64px ${SANS}`, col: ACC, text: 'CFM56-7B · BOEING 737', y: 280, d: 0 }, { id: 's2', font: `500 30px ${MONO}`, col: INK, text: '61-in fan · ~5:1 bypass · up to 27,300 lbf', y: 334, d: .25 }], T.cfm - .1, T.congrats - .1);
  if (t > T.five - .1 && t < T.congrats) { const k = fade(t, T.five - .1, .3) * (1 - fade(t, T.congrats - .4, .3)); g.globalAlpha = k;
    const p0 = proj(V(FANX - .05, CY + 1.24, .02)), p1 = proj(V(FANX - .05, CY - 1.24, .02)), dl = eo(seg(t, T.five, T.five + .6)), xo = -90;
    g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(p0[0] + xo, p0[1]); g.lineTo(p0[0] + xo, p0[1] + (p1[1] - p0[1]) * dl); g.stroke();
    for (const p of [p0, p1]) { g.beginPath(); g.moveTo(p[0] + xo - 16, p[1]); g.lineTo(p[0] + xo + 16, p[1]); g.stroke(); g.globalAlpha = k * .4; g.setLineDash([6, 8]); g.beginPath(); g.moveTo(p[0] + xo, p[1]); g.lineTo(p[0], p[1]); g.stroke(); g.setLineDash([]); g.globalAlpha = k; }
    g.save(); g.translate(p0[0] + xo - 22, (p0[1] + p1[1]) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.font = `700 34px ${MONO}`; g.fillStyle = INK; g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 10;
    g.globalAlpha = k * fade(t, T.five + .3, .3); g.fillText('≈ 5 ft', 0, 0); g.restore(); }
  if (t > T.ratio5 && t < T.congrats) { const k = fade(t, T.ratio5, .3) * (1 - fade(t, T.congrats - .4, .3)), u = eo(seg(t, T.ratio5 + .1, T.ratio5 + 1.2));
    const x0 = 170, y0 = 1210, uw = 120; g.globalAlpha = k; g.font = `600 26px ${MONO}`; g.textAlign = 'left'; g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 8;
    g.fillStyle = BLUE; g.fillRect(x0, y0, uw * 5 * u, 34); g.fillStyle = ACC; g.fillRect(x0, y0 + 50, uw * u, 34);
    g.fillStyle = INK; g.fillText('around the core ×5', x0 + 12, y0 + 25); g.fillText('through it ×1', x0 + uw * u + 14, y0 + 75); g.shadowBlur = 0; }
  card(t, [{ id: 'e1', font: `800 58px ${SANS}`, col: INK, text: 'SUCK · SQUEEZE · BANG · BLOW', y: 300, d: .05 }, { id: 'e2', font: `500 26px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 352, d: .4 }], T.card - .2, 99);
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
