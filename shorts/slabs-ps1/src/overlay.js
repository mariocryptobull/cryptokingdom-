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

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, P0, L, S, tw, HS } = c, V = (x, y, z) => new THREE.Vector3(P0.x + x, y, P0.z + z);
  card(t, [['ONE-WAY vs', 84, 230, '#ffffff'], ['TWO-WAY SLABS', 84, 330, '#ffe14a']], 0, 5.2);
  // live dimensions (1 unit = 3 ft)
  const ftL = Math.round(L * 3), ftS = Math.round(S * 3);
  const dimK = seg(t, T.ratio - .3, T.ratio) * (1 - seg(t, T.across - .2, T.across + .2)) + seg(t, T.squish + .2, T.squish + .5) * (1 - seg(t, T.lines - .3, T.lines));
  if (dimK > .01) {
    const pl = proj(V(S / 2 + .5, HS + .1, 0)), ps = proj(V(0, HS + .1, -L / 2 - .45));
    g.globalAlpha = dimK; g.font = `700 54px ${PIX}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 12; g.strokeStyle = '#0b0e2e';
    g.fillStyle = '#59d4ff'; g.strokeText(`${ftL} ft`, pl[0], pl[1]); g.fillText(`${ftL} ft`, pl[0], pl[1]);
    g.fillStyle = '#ffd23f'; g.strokeText(`${ftS} ft`, ps[0], ps[1]); g.fillText(`${ftS} ft`, ps[0], ps[1]);
  }
  // ratio readout
  const rk = seg(t, T.oneNum - .2, T.oneNum + .1) * (1 - seg(t, T.across + 1.5, T.across + 1.8)) + seg(t, T.twoNum - .2, T.twoNum + .1) * (1 - seg(t, T.lines + 1.2, T.lines + 1.5));
  if (rk > .01) {
    const one = t < T.squish, txt = one ? '18 ÷ 6 = 3.0' : '12 ÷ 9 = 1.33', verdict = one ? '> 2' : '≤ 2';
    card(t, [[txt, 92, 250, '#ffffff'], [verdict, 70, 350, one ? '#59d4ff' : '#ffd23f']], one ? T.oneNum - .2 : T.twoNum - .2, one ? T.across + 1.8 : T.lines + 1.5);
  }
  if (t > T.oneWay - .05 && t < T.oneWay + 1.6) memeText('ONE-WAY', Wd / 2, 760, 170, fade(t, T.oneWay - .05, .1) * (1 - fade(t, T.oneWay + 1.3, .3)), Math.max(0, 1 - (t - T.oneWay) / .3));
  if (t > T.twoWay - .05 && t < T.twoWay + 1.6) memeText('TWO-WAY', Wd / 2, 760, 170, fade(t, T.twoWay - .05, .1) * (1 - fade(t, T.twoWay + 1.3, .3)), Math.max(0, 1 - (t - T.twoWay) / .3));
  // beam load labels (lecture example: 400 lb/ft² live load)
  uiLabel(t, { id: 'uni', t0: T.uniform, t1: T.squish - .2, a: proj(V(S / 2 + .18, HS + .45, 0)), lx: 540, ly: 1560, text: 'UNIFORM LOAD', sub: '400 lb/ft² × 3 ft = 1,200 lb/ft' });
  uiLabel(t, { id: 'tri', t0: T.tri + .1, t1: T.same + 1.6, a: proj(V(0, HS + .65, L / 2 + .18)), lx: 540, ly: 470, text: 'TRIANGLE', sub: 'short beam · peak 1,800 lb/ft' });
  uiLabel(t, { id: 'trap', t0: T.trap + .1, t1: T.same + 1.6, a: proj(V(S / 2 + .18, HS + .65, -L / 4)), lx: 540, ly: 1560, text: 'TRAPEZOID', sub: 'long beam · max 1,800 lb/ft' });
  uiLabel(t, { id: 'ta', t0: T.trib + .2, t1: T.ratio - .2, a: proj(V(-S / 4, HS + .1, 0)), lx: 540, ly: 1560, text: 'TRIBUTARY AREA', sub: 'the floor each beam carries' });
  card(t, [['SKINNY → ONE-WAY', 70, 230, '#59d4ff'], ['SQUARE → TWO-WAY', 70, 320, '#ffd23f']], T.sum + .2, 99);
  for (const cu of CUES) {
    if (t < cu.t0 || t > cu.t1) continue;
    if ((/ONE-WAY slab/.test(cu.text) && t > T.oneWay - .05) || (/means TWO-WAY/.test(cu.text) && t > T.twoWay - .05)) continue;
    const k = Math.min(fade(t, cu.t0, .06), 1 - fade(t, cu.t1 - .06, .06));
    memeText(cu.text, Wd / 2, 1300, 72, k, Math.max(0, 1 - (t - cu.t0) / .12) * .4);
  }
  g.globalAlpha = 1;
}
const DURX = 99;
