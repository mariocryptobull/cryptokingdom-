// Overlay at full 1080×1920: meme captions (yellow pixel type, blue outline), game-UI labels, power HUD, title/end cards.
import * as THREE from 'three';
import { clamp, seg, ss, eo } from '/core/lib.js';

const cv = document.getElementById('ov'), g = cv.getContext('2d');
const PIX = '"Pix", monospace';
let CUES = [], texts = [];
export function makeCues(TL, VDUR) {
  const out = [];
  for (let li = 0; li < TL.vo.length; li++) {
    const v = TL.vo[li], d = VDUR[v.id], next = TL.vo[li + 1] ? TL.vo[li + 1].t : TL.dur;
    const n = v.chunks.map(c => c.replace(/[^A-Za-z0-9]/g, '').length + 2), tot = n.reduce((a, b) => a + b, 0);
    let t = v.t;
    v.chunks.forEach((c, i) => { const dt = d * n[i] / tot, last = i === v.chunks.length - 1; out.push({ id: v.id, i, t0: t - .04, t1: last ? Math.min(t + dt + .45, next - .06) : t + dt - .02, text: c }); t += dt; });
  }
  return out;
}
export async function initOverlay(c) { CUES = c; }
export const overlayTexts = () => texts;
const v3 = new THREE.Vector3();
let CAM, Wd, Hd;
const proj = v => { v3.copy(v).project(CAM); return [(v3.x + 1) / 2 * Wd, (1 - v3.y) / 2 * Hd, v3.z]; };
const fade = (t, a, d = .2) => ss(seg(t, a, a + d));
const snap = x => Math.round(x / 6) * 6;   // keep UI on a chunky 6-px grid

function memeText(text, x, y, size, k = 1, pop = 0) {
  g.save(); g.translate(x, y); const s = 1 + .25 * pop; g.scale(s, s);
  g.font = `700 ${size}px ${PIX}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(text).width, sc = Math.min(1, 980 / w); g.scale(sc, sc);
  g.globalAlpha = k; g.lineJoin = 'miter';
  g.shadowColor = 'rgba(80,150,255,.9)'; g.shadowBlur = 18; g.strokeStyle = '#16207a'; g.lineWidth = size * .22; g.strokeText(text, 0, 0);
  g.shadowBlur = 0; g.fillStyle = '#ffe14a'; g.fillText(text, 0, 0);
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-w / 2, -size * .32, w, size * .08);
  g.restore();
}
function uiLabel(t, o) {
  const { t0, t1, a, lx, ly, text, sub, id } = o;
  const k = fade(t, t0, .15) * (1 - fade(t, t1 - .15, .15)); if (k <= 0) return;
  const grow = eo(seg(t, t0, t0 + .3));
  g.globalAlpha = k;
  g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.beginPath(); g.moveTo(snap(a[0]), snap(a[1])); g.lineTo(snap(a[0] + (lx - a[0]) * grow), snap(a[1] + (ly - a[1]) * grow)); g.stroke();
  g.fillStyle = '#ffe14a'; g.fillRect(snap(a[0]) - 9, snap(a[1]) - 9, 18, 18);
  if (grow < .9) return;
  g.font = `700 46px ${PIX}`; const w = Math.max(g.measureText(text).width, sub ? (g.font = `400 30px ${PIX}`, g.measureText(sub).width) : 0);
  const bw = w + 48, bh = sub ? 104 : 70, bx = snap(Math.min(Math.max(lx - bw / 2, 24), Wd - bw - 24)), by = snap(ly - bh / 2);
  g.fillStyle = 'rgba(10,12,40,.88)'; g.fillRect(bx, by, bw, bh);
  g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.strokeRect(bx + 3, by + 3, bw - 6, bh - 6);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.font = `700 46px ${PIX}`; g.fillStyle = '#ffffff'; g.fillText(text, bx + 24, by + 52);
  if (sub) { g.font = `400 30px ${PIX}`; g.fillStyle = '#ffe14a'; g.fillText(sub, bx + 24, by + 88); }
  if (k > .99) texts.push({ id, text: text + (sub ? ' ' + sub : ''), x0: bx, y0: by, x1: bx + bw, y1: by + bh });
}
function card(t, lines, t0, t1) {
  const k = fade(t, t0, .25) * (1 - fade(t, t1 - .25, .25)); if (k <= 0) return;
  lines.forEach(([txt, size, y, col]) => {
    g.globalAlpha = k; g.font = `700 ${size}px ${PIX}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'miter'; g.strokeStyle = '#0b0e2e'; g.lineWidth = size * .2; g.strokeText(txt, Wd / 2, y);
    g.fillStyle = col; g.fillText(txt, Wd / 2, y);
    if (k > .99) { const w = g.measureText(txt).width; texts.push({ id: txt, text: txt, x0: Wd / 2 - w / 2, y0: y - size / 2, x1: Wd / 2 + w / 2, y1: y + size / 2 }); }
  });
}
function hud(t, T) {   // engine power bar, game style
  const k = fade(t, T.power - 1.2, .3) * (1 - fade(t, T.outro - .3, .3)); if (k <= 0) return;
  const x = 120, y = 300, w = 840, h = 56;
  const base = .45, gain = .4 * eo(seg(t, T.power - .5, T.power + .4)), cost = .1 * eo(seg(t, T.drive - .3, T.drive + .5));
  g.globalAlpha = k;
  g.font = `700 38px ${PIX}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = '#fff'; g.lineWidth = 8; g.strokeStyle = '#0b0e2e';
  g.strokeText('ENGINE POWER', x, y - 18); g.fillText('ENGINE POWER', x, y - 18);
  g.fillStyle = '#0b0e2e'; g.fillRect(x - 6, y - 6, w + 12, h + 12);
  g.fillStyle = '#2a2f6a'; g.fillRect(x, y, w, h);
  const seg1 = w * base, seg2 = w * (gain - cost), seg3 = w * cost;
  g.fillStyle = '#5ad46a'; g.fillRect(x, y, seg1, h);
  g.fillStyle = '#ffe14a'; g.fillRect(x + seg1, y, Math.max(0, seg2), h);
  if (cost > .001) { g.fillStyle = '#ff5a3a'; g.fillRect(x + seg1 + seg2, y, seg3, h); }
  for (let i = 1; i < 14; i++) { g.fillStyle = 'rgba(11,14,46,.6)'; g.fillRect(x + i * w / 14, y, 6, h); }
  g.font = `700 32px ${PIX}`;
  if (gain > .05) { g.fillStyle = '#ffe14a'; g.strokeText('+ TURBO', x + seg1 + 12, y + h + 44); g.fillText('+ TURBO', x + seg1 + 12, y + h + 44); }
  if (cost > .02) { g.fillStyle = '#ff7a5a'; g.textAlign = 'right'; g.strokeText('runs the turbo', x + w, y + h + 88); g.fillText('runs the turbo', x + w, y + h + 88); }
  g.textAlign = 'left';
}

function yearHud(t, T) {
  const ERAS = [[T.irt, '1904'], [T.bmt, ''], [T.ind, '1932'], [T.fares, ''], [T.unify, '1940'], [T.transfers, '1948'], [T.mta, '1968'], [T.ibx, '2026'], [T.congrats, '']];
  let yr = ''; for (const [t0, y] of ERAS) if (t >= t0) yr = y;
  if (!yr) return;
  const k = fade(t, T.irt, .2);
  g.globalAlpha = k; g.fillStyle = 'rgba(10,12,40,.88)'; g.fillRect(54, 180, 300, 120); g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(57, 183, 294, 114);
  g.font = `400 30px ${PIX}`; g.fillStyle = '#ffe14a'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('YEAR', 84, 226);
  g.font = `700 70px ${PIX}`; g.fillStyle = '#fff'; g.fillText(yr, 84, 286);
  if (k > .99) texts.push({ id: 'yr' + yr, text: 'YEAR ' + yr, x0: 54, y0: 180, x1: 354, y1: 300 });
}
export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, M2W, LY, CUES: CU } = c, P = (x, z, dy = 0) => proj(M2W(x, z, LY + dy));
  card(t, [['HOW NYC\'S SUBWAY', 80, 230, '#ffffff'], ['BECAME ONE', 92, 330, '#ffe14a']], 0, 4.6);
  yearHud(t, T);
  uiLabel(t, { id: 'irt', t0: T.irt + .3, t1: T.bmt - .3, a: P(.15, -.6, .05), lx: 680, ly: 760, text: 'IRT', sub: 'city-built · privately run' });
  uiLabel(t, { id: 'bmt', t0: T.bmt + .3, t1: T.ind - .3, a: P(1.3, 1.3, .05), lx: 540, ly: 1560, text: 'BMT', sub: 'private · Brooklyn + Queens' });
  uiLabel(t, { id: 'ind', t0: T.ind + .3, t1: T.fares - .2, a: P(1.6, -.65, .05), lx: 540, ly: 1560, text: 'IND', sub: 'city-owned competitor' });
  uiLabel(t, { id: 'dup', t0: T.dup + .1, t1: T.noConn + .3, a: P(.06, -.3, .05), lx: 700, ly: 600, text: 'DUPLICATE ROUTES', sub: 'two lines, one avenue' });
  if (t > T.nickel - .1 && t < T.unify) { const k = fade(t, T.nickel, .2) * (1 - fade(t, T.unify - .4, .3));
    for (const [x, z] of [[.35, -1.4], [1.95, 1.75], [2.4, -.9]]) { const p = P(x, z, .62); g.globalAlpha = k; g.font = `700 54px ${PIX}`; g.textAlign = 'center'; g.lineWidth = 10; g.strokeStyle = '#0b0e2e'; g.fillStyle = '#ffe14a'; g.strokeText('5¢', p[0], p[1]); g.fillText('5¢', p[0], p[1]); } }
  if (t > T.one - .05 && t < T.one + 1.8) memeText('ONE SYSTEM', Wd / 2, 760, 150, fade(t, T.one - .05, .1) * (1 - fade(t, T.one + 1.5, .3)), Math.max(0, 1 - (t - T.one) / .3));
  uiLabel(t, { id: 'xf', t0: T.transfers + .2, t1: T.mta - .1, a: P(.12, .72, .05), lx: 700, ly: 600, text: 'FREE TRANSFERS' });
  if (t > T.mta - .05 && t < T.mta + 2.6) memeText('MTA TAKES OVER', Wd / 2, 760, 110, fade(t, T.mta - .05, .1) * (1 - fade(t, T.mta + 2.3, .3)), Math.max(0, 1 - (t - T.mta) / .3));
  uiLabel(t, { id: 'ibx', t0: T.ibxLine + .4, t1: T.review - .2, a: P(1.9, .3, .05), lx: 540, ly: 1560, text: 'INTERBOROUGH EXPRESS', sub: 'planned · 14 mi light rail · 18 stops' });
  if (t > T.review - .05 && t < T.congrats - .1) card(t, [['STATUS:', 60, 230, '#ffffff'], ['IN DESIGN + REVIEW', 66, 310, '#ffe14a'], ['NO OPENING DATE YET', 46, 380, '#ff8a6a']], T.review - .05, T.congrats - .1);
  if (t > T.congrats - .05 && t < T.congrats + 1.3) memeText('CONGRATS!', Wd / 2, 760, 190, fade(t, T.congrats - .05, .1) * (1 - fade(t, T.congrats + 1.0, .3)), Math.max(0, 1 - (t - T.congrats) / .3));
  { const tl = CU.find(x => x.id === 'v11' && x.i === 2).t0; if (t > tl - .05) memeText('120+ YEARS', Wd / 2, 760, 150, fade(t, tl - .05, .12), Math.max(0, 1 - (t - tl) / .3)); }
  for (const cu of CU) {
    if (t < cu.t0 || t > cu.t1) continue;
    if (cu.id === 'v11' && cu.i === 0) continue;
    if (/became ONE/.test(cu.text) && t > T.one - .05) continue;
    const k = Math.min(fade(t, cu.t0, .06), 1 - fade(t, cu.t1 - .06, .06));
    memeText(cu.text, Wd / 2, 1300, 72, k, Math.max(0, 1 - (t - cu.t0) / .12) * .4);
  }
  g.globalAlpha = 1;
}
const DURX = 99;
