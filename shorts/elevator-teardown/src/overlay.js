// Marks layer: anchored labels, cards, captions, title and end cards. 1080×1920.
import * as THREE from 'three';
import { clamp, seg, ss, eo } from '/core/lib.js';

const cv = document.getElementById('ov'), g = cv.getContext('2d');
const MONO = '"JBMono", monospace', SANS = '"Inter", sans-serif';
const INK = '#f1efe9', DIM = 'rgba(241,239,233,.66)', ACC = '#ff6b3d', LINE = 'rgba(241,239,233,.78)';
const CAP = { font: `800 54px ${SANS}`, y: 1500, max: 960 };

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

function card(t, items, t0, t1) {
  for (const it of items) {
    const a = fade(t, t0 + it.d, .45) * (1 - fade(t, t1 - .35, .35)); if (a <= 0) continue;
    g.globalAlpha = a; g.font = it.font; g.fillStyle = it.col; g.textAlign = 'center';
    g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 14;
    g.fillText(it.text, Wd / 2, it.y + (1 - a) * 12); g.shadowBlur = 0;
    const w = g.measureText(it.text).width;
    if (a > .99) texts.push({ id: it.id, text: it.text, x0: Wd / 2 - w / 2, y0: it.y - 70, x1: Wd / 2 + w / 2, y1: it.y + 14 });
    g.textAlign = 'left';
  }
}
function pill(t, text, y, t0, t1) {
  if (t < t0 || t > t1) return; const k = fade(t, t0, .3) * (1 - fade(t, t1 - .3, .3));
  g.globalAlpha = k; g.font = `600 30px ${MONO}`; g.textAlign = 'center'; const w = g.measureText(text).width + 60;
  g.fillStyle = 'rgba(14,15,17,.8)'; g.fillRect(Wd / 2 - w / 2, y - 35, w, 50); g.fillStyle = INK; g.fillText(text, Wd / 2, y); g.textAlign = 'left';
}

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, CX, CH, CW, WX, WH, SCX, SCY, SR, GX, GR, GY, RAIL, HS, yc, yw, ex } = c, V = (x, y, z) => new THREE.Vector3(x, y, z);
  const carX = CX + ex.carx, carZ = ex.carz, my = ex.mach;
  card(t, [
    { id: 't1', font: `800 92px ${SANS}`, col: INK, text: 'HOW AN ELEVATOR', y: 250, d: .1 },
    { id: 't2', font: `800 92px ${SANS}`, col: INK, text: 'WORKS', y: 350, d: .2 },
    { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · SCHEMATIC MODEL', y: 406, d: .4 },
  ], 0, T.trac - .1);
  if (t < T.trac) { g.globalAlpha = fade(t, .1, .5) * (1 - fade(t, T.trac - .4, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 150, 80 * eo(seg(t, .1, .7)), 6); }
  // exploded overview
  label(t, { id: 'car', t0: T.car + .1, t1: T.top - .3, a: proj(V(carX - .3, yc + 1.2, carZ + .8)), ly: 1180, idx: '01', name: 'Car', spec: 'the box you ride in', side: 'R', lx: 120 });
  label(t, { id: 'hr', t0: T.ropes + .1, t1: T.top - .3, a: proj(V(CX + ex.carx * .5, (SCY + my + yc + CH) / 2 + .5, .1 + carZ * .5)), ly: 600, idx: '02', name: 'Hoist ropes', spec: 'steel wire', side: 'L', lx: 960 });
  // machine
  label(t, { id: 'sv', t0: T.sheave + .1, t1: T.motor - .1, a: proj(V(SCX - SR * .7, SCY + SR * .7, .25)), ly: 520, idx: '03', name: 'Traction sheave', spec: 'grooved drive wheel', side: 'R', lx: 120 });
  label(t, { id: 'mo', t0: T.motor + .1, t1: T.cwt - .2, a: proj(V(SCX + .55, SCY + .55, -.75)), ly: 520, idx: '04', name: 'Electric motor', spec: 'friction in the grooves lifts', side: 'R', lx: 120 });
  // counterweight
  label(t, { id: 'cw', t0: T.cwt2 + .1, t1: T.never - .1, a: proj(V(WX + .25, yw + WH * .5, .17)), ly: 600, idx: '05', name: 'Counterweight', spec: 'stacked steel plates', side: 'L', lx: 960 });
  pill(t, 'CWT ≈ CAR + 40% OF RATED LOAD', 1300, T.weighs, T.never - .1);
  // balance card
  if (t > T.never - .1 && t < T.rails) {
    const k = fade(t, T.never - .1, .3) * (1 - fade(t, T.rails - .35, .3)), dk = eo(seg(t, T.diff - .2, T.diff + .5));
    g.globalAlpha = k; g.textAlign = 'center'; g.font = `800 50px ${SANS}`; g.fillStyle = INK; g.fillText('MOTOR LIFTS', Wd / 2, 250); g.fillStyle = ACC; g.fillText('ONLY THE DIFFERENCE', Wd / 2, 312);
    const bx = 240, bw = 600, by = 360; g.font = `500 24px ${MONO}`;
    g.fillStyle = 'rgba(14,15,17,.8)'; g.fillRect(bx - 20, by - 10, bw + 40, 132);
    g.fillStyle = DIM; g.textAlign = 'left'; g.fillText('CAR + PEOPLE', bx, by + 24); g.fillText('COUNTERWEIGHT', bx, by + 82);
    g.fillStyle = INK; g.fillRect(bx + 220, by + 6, 330, 24); g.fillStyle = '#9aa1a8'; g.fillRect(bx + 220, by + 64, 290, 24);
    g.globalAlpha = k * dk; g.fillStyle = ACC; g.fillRect(bx + 510, by + 64, 40, 24); g.textAlign = 'left'; g.fillText('← motor', bx + 556, by + 84);
    g.textAlign = 'left';
  }
  // rails
  label(t, { id: 'gr', t0: T.rails2 + .1, t1: T.codes - .2, a: proj(V(RAIL[0], 10.5, .07)), ly: 600, idx: '06', name: 'Guide rails', spec: 'steel T-rails, full height', side: 'R', lx: 110 });
  // ropes, codes
  label(t, { id: 'r3', t0: T.three + .1, t1: T.what - .1, a: proj(V(CX, Math.min(SCY - 1.2, yc + CH + 1.4), .18)), ly: 760, idx: '02', name: 'Hoist ropes ×4', spec: 'code minimum: 3', side: 'L', lx: 960 });
  pill(t, 'each rope rated many times its share', 1300, T.margin, T.what - .1);
  // governor + safeties
  label(t, { id: 'gv', t0: T.gov + .1, t1: T.grab + .2, a: proj(V(GX + ex.govx, GY + ex.gov + .1, .08)), ly: 560, idx: '07', name: 'Overspeed governor', spec: 'flyweights sense speed', side: 'R', lx: 120 });
  pill(t, 'TRIPS AT ≥ 115% OF RATED SPEED', 1300, T.trip, T.grab + .2);
  label(t, { id: 'sf', t0: T.yank + .1, t1: T.otis - .2, a: proj(V(carX + RAIL[0] - CX + .05, yc - .32, .1)), ly: 1200, idx: '08', name: 'Safety brakes', spec: 'wedges clamp the rails', side: 'R', lx: 520 });
  // Otis 1854
  card(t, [{ id: 'o1', font: `800 110px ${SANS}`, col: ACC, text: '1854', y: 270, d: 0 }, { id: 'o2', font: `500 30px ${MONO}`, col: INK, text: 'ELISHA OTIS · CRYSTAL PALACE, NEW YORK', y: 326, d: .25 },
    { id: 'o3', font: `500 26px ${MONO}`, col: DIM, text: 'rope cut → spring + ratchet catch', y: 372, d: .6 }], T.otis - .1, T.cut);
  // end card
  card(t, [{ id: 'e1', font: `800 68px ${SANS}`, col: INK, text: 'ROPES · SHEAVE ·', y: 230, d: .05 }, { id: 'e3', font: `800 68px ${SANS}`, col: INK, text: 'COUNTERWEIGHT · BRAKES', y: 310, d: .15 }, { id: 'e2', font: `500 26px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 362, d: .4 }], T.card - .2, 99);
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
