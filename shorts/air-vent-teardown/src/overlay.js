// Marks layer: anchored labels, cards, speed legend, captions, title and end cards. 1080×1920.
import * as THREE from 'three';
import { clamp, seg, ss, eo } from '/core/lib.js';

const cv = document.getElementById('ov'), g = cv.getContext('2d');
const MONO = '"JBMono", monospace', SANS = '"Inter", sans-serif';
const INK = '#f1efe9', DIM = 'rgba(241,239,233,.66)', ACC = '#ff6b3d', LINE = 'rgba(241,239,233,.78)';
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
    { const w0 = g.measureText(it.text).width, fs = parseInt(it.font.split(' ')[1]); g.fillStyle = 'rgba(14,15,17,.62)'; g.fillRect(Wd / 2 - w0 / 2 - 22, it.y - fs * .82, w0 + 44, fs * 1.08); g.fillStyle = it.col; }
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 12;
    g.fillText(it.text, Wd / 2, it.y + (1 - a) * 12); g.shadowBlur = 0;
    const w = g.measureText(it.text).width;
    if (a > .99) texts.push({ id: it.id, text: it.text, x0: Wd / 2 - w / 2, y0: it.y - 70, x1: Wd / 2 + w / 2, y1: it.y + 14 });
    g.textAlign = 'left';
  }
}


// speed → colour (log scale, 20 … 1,600 ft/min): slow = cool blue, fast = warm orange
const VLO = 20, VHI = 1600;
const STOPS = [[0, [.16, .36, 1.0]], [.28, [.22, .7, 1.0]], [.48, [.62, .9, 1.0]], [.62, [1.0, .9, .7]], [.8, [1.0, .62, .22]], [1, [1.0, .3, .16]]];
const vk = v => clamp(Math.log(Math.max(v, VLO) / VLO) / Math.log(VHI / VLO));
export function speedCol(v, out) {
  const k = vk(v); let i = 0; while (i < STOPS.length - 2 && k > STOPS[i + 1][0]) i++;
  const [k0, c0] = STOPS[i], [k1, c1] = STOPS[i + 1], f = clamp((k - k0) / (k1 - k0));
  out[0] = c0[0] + (c1[0] - c0[0]) * f; out[1] = c0[1] + (c1[1] - c0[1]) * f; out[2] = c0[2] + (c1[2] - c0[2]) * f; return out;
}
const css = c => `rgb(${c.map(x => Math.round(clamp(x) * 255)).join(',')})`;
function legend(t, a) {
  if (a <= 0) return;
  const x0 = 300, x1 = 780, y = 1590, gr = g.createLinearGradient(x0, 0, x1, 0), c = [0, 0, 0];
  for (let i = 0; i <= 20; i++) { const v = VLO * Math.pow(VHI / VLO, i / 20); gr.addColorStop(i / 20, css(speedCol(v, c))); }
  g.globalAlpha = a; g.fillStyle = 'rgba(14,15,17,.6)'; g.fillRect(x0 - 40, y - 52, x1 - x0 + 80, 104);
  g.fillStyle = gr; g.fillRect(x0, y - 6, x1 - x0, 12);
  g.font = `500 22px ${MONO}`; g.fillStyle = DIM; g.textAlign = 'center'; g.fillText('AIR SPEED · ft/min', (x0 + x1) / 2, y - 20);
  g.textAlign = 'left'; g.fillText('SLOW', x0 - 28, y - 20); g.textAlign = 'right'; g.fillText('FAST', x1 + 28, y - 20);
  g.textAlign = 'center'; g.fillStyle = INK;
  for (const v of [50, 200, 600, 1500]) { const x = x0 + (x1 - x0) * vk(v); g.fillRect(x - 1, y + 6, 2, 8); g.fillText(v.toLocaleString('en-US'), x, y + 38); }
  g.textAlign = 'left'; g.globalAlpha = 1;
}
function dimLine(t, a, b, text, t0, t1) {
  const k = eo(seg(t, t0, t0 + .6)), out = 1 - fade(t, t1 - .3, .3); if (k <= 0 || out <= 0) return;
  const [ax, ay] = a, [bx, by] = b, ex = ax + (bx - ax) * k, ey = ay + (by - ay) * k;
  g.globalAlpha = out; g.strokeStyle = ACC; g.lineWidth = 3; g.setLineDash([12, 8]); g.beginPath(); g.moveTo(ax, ay); g.lineTo(ex, ey); g.stroke(); g.setLineDash([]);
  g.fillStyle = ACC; for (const [x, y] of [[ax, ay], [ex, ey]]) { g.fillRect(x - 2, y - 16, 4, 32); }
  if (k > .6) { g.globalAlpha = out * fade(t, t0 + .4, .3); g.font = `700 36px ${SANS}`; g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 10; g.fillStyle = INK;
    g.fillText(text, (ax + bx) / 2, Math.min(ay, by) - 30); g.shadowBlur = 0; g.textAlign = 'left';
    const w = g.measureText(text).width; texts.push({ id: 'dim', text, x0: (ax + bx) / 2 - w / 2, y0: Math.min(ay, by) - 70, x1: (ax + bx) / 2 + w / 2, y1: Math.min(ay, by) - 20 }); }
  g.globalAlpha = 1;
}
const big2 = (id, a, b, sub, t, t0, t1, col = INK) => card(t, [{ id: id + 'a', font: `800 84px ${SANS}`, col, text: a, y: 270, d: .05 }, ...(b ? [{ id: id + 'b', font: `800 84px ${SANS}`, col, text: b, y: 362, d: .15 }] : []), ...(sub ? [{ id: id + 'c', font: `500 28px ${MONO}`, col: DIM, text: sub, y: b ? 418 : 330, d: .35 }] : [])], t0, t1);

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, DX, DY, Z0, CEIL, SLAB, BX, BY, ER, XE, RHO50, PX, PZ, RX1, dk } = c, V = (x, y, z) => new THREE.Vector3(x, y, z);
  big2('t', 'HOW AIR FLOWS', 'THROUGH A VENT', 'EXPLODED TEARDOWN · SCHEMATIC MODEL', t, 0, T.blower - .1);
  if (t < T.blower) { g.globalAlpha = fade(t, .1, .5) * (1 - fade(t, T.blower - .4, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 160, 80 * eo(seg(t, .1, .7)), 6); g.globalAlpha = 1; }
  legend(t, fade(t, T.follow, .5) * (1 - fade(t, T.next - .4, .3)));
  label(t, { id: 'bw', t0: T.blower + .5, t1: T.dp - .05, a: proj(V(BX + .1, BY + .15, Z0 + .22)), ly: 560, idx: '01', name: 'Blower wheel', spec: 'flings air outward', side: 'R', lx: 150 });
  card(t, [{ id: 'dp1', font: `800 92px ${SANS}`, col: ACC, text: 'Δp ≈ 0.5 in. of water', y: 290, d: 0 }, { id: 'dp2', font: `500 28px ${MONO}`, col: INK, text: '≈ 125 Pa · about 0.1% of air pressure', y: 344, d: .25 }], T.dp - .1, T.trunk - .1);
  label(t, { id: 'md', t0: T.trunk + .3, t1: T.narrow - .05, a: proj(V(-2.3, DY + .2, Z0 + .1)), ly: 560, idx: '02', name: 'Main duct', spec: '≈ 900 ft/min', side: 'R', lx: 150 });
  label(t, { id: 'nr', t0: T.narrow + .1, t1: T.widen - .05, a: proj(V(-1.3, DY - .17, Z0 + .1)), ly: 1170, idx: '03', name: 'Narrower → faster', spec: 'same air, less area', side: 'R', lx: 150 });
  label(t, { id: 'wd', t0: T.widen + .1, t1: T.fric - .05, a: proj(V(-.45, DY + .22, Z0 + .1)), ly: 560, idx: '04', name: 'Wider → slower', spec: 'pressure climbs back', side: 'L', lx: 930 });
  card(t, [{ id: 'eq1', font: `800 76px ${SANS}`, col: ACC, text: 'A₁v₁ = A₂v₂', y: 285, d: 0 }, { id: 'eq2', font: `500 28px ${MONO}`, col: INK, text: 'p + ½ρv² ≈ constant', y: 338, d: .25 }], T.narrow + .2, T.fric - .1);
  label(t, { id: 'el', t0: T.fric + .2, t1: T.branch - .05, a: proj(V(XE + .25, DY - .1, Z0 + .2)), ly: 560, idx: '05', name: 'Elbow + friction', spec: 'every fitting costs pressure', side: 'L', lx: 930 });
  label(t, { id: 'br', t0: T.branch + .1, t1: T.diff - .05, a: proj(V(DX + .2, SLAB + .3, Z0 + .1)), ly: 1170, idx: '06', name: 'Branch duct', spec: '≈ 600 ft/min', side: 'L', lx: 930 });
  label(t, { id: 'df', t0: T.diff + .2, t1: T.drag - .4, a: proj(V(DX + .25, CEIL - .06 - .25 * dk, Z0 + .25)), ly: 1170, idx: '07', name: 'Ceiling diffuser', spec: 'angled vanes turn the jet', side: 'L', lx: 930 });
  label(t, { id: 'gp', t0: T.gap, t1: T.coanda - .1, a: proj(V(DX - 1.3, CEIL - .04, Z0 + .35)), ly: 640, idx: '08', name: 'Low-pressure gap', spec: 'pulls the jet up', side: 'R', lx: 150 });
  big2('co', 'COANDĂ EFFECT', '', 'a fast jet clings to a nearby surface', t, T.coanda - .15, T.turb + .4, ACC);
  label(t, { id: 'ed', t0: T.turb + .3, t1: T.throw - .05, a: proj(V(DX - 1.9, CEIL - .3, Z0 + .3)), ly: 640, idx: '09', name: 'Turbulent eddies', spec: 'mixing with room air', side: 'R', lx: 150 });
  dimLine(t, proj(V(DX - .33, CEIL + .25, Z0 + .6)), proj(V(DX - RHO50, CEIL + .25, Z0 + .6)), 'THROW → 50 ft/min', T.throw, T.reach - .05);
  label(t, { id: 'yo', t0: T.reach + .3, t1: T.warm - .05, a: proj(V(PX + .1, 1.62, PZ)), ly: 640, idx: '10', name: 'You', spec: 'under 40 ft/min · no draft', side: 'L', lx: 930 });
  label(t, { id: 'wa', t0: T.warm, t1: T.why - .05, a: proj(V(PX, 2.05, PZ)), ly: 640, name: 'Warm air rises', spec: '', side: 'L', lx: 930 });
  label(t, { id: 'cl', t0: T.cool, t1: T.why - .05, a: proj(V(RX1 - .12, 1.1, -.2)), ly: 880, name: 'Cool air sinks', spec: '', side: 'L', lx: 930 });
  card(t, [{ id: 'w1', font: `800 70px ${SANS}`, col: ACC, text: 'FAST JET', y: 250, d: 0 }, { id: 'w2', font: `800 70px ${SANS}`, col: INK, text: '+ LOW-PRESSURE GAP', y: 330, d: .9 }, { id: 'w3', font: `800 70px ${SANS}`, col: INK, text: '+ A SURFACE', y: 410, d: 1.8 }], T.why + .2, T.next - .1);
  big2('nx', 'WHAT SHOULD WE', 'TAKE APART NEXT?', '', t, T.next - .1, T.congrats - .1, ACC);
  big2('e', 'HOW AIR FLOWS', 'THROUGH A VENT', 'SCHEMATIC MODEL · SOURCES IN CAPTION', t, T.congrats - .1, 99);
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
