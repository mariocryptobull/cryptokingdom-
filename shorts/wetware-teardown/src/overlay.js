// Marks layer: hook, anchored labels, cards, the Pong screen, the power bars, captions. 1080×1920.
import * as THREE from 'three';
import { clamp, seg, ss, eo } from '/core/lib.js';

const cv = document.getElementById('ov'), g = cv.getContext('2d');
const MONO = '"JBMono", monospace', SANS = '"Inter", sans-serif';
const INK = '#f1efe9', DIM = 'rgba(241,239,233,.66)', ACC = '#ff6b3d', CYAN = '#59d4ff', LINE = 'rgba(241,239,233,.78)';
const CAP = { font: `800 54px ${SANS}`, y: 1460, max: 960 };

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
    const a = fade(t, t0 + it.d, .4) * (1 - fade(t, t1 - .35, .35)); if (a <= 0) continue;
    g.globalAlpha = a; g.font = it.font; g.fillStyle = it.col; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 14;
    const w0 = g.measureText(it.text).width, s = Math.min(1, 980 / w0);
    g.save(); g.translate(Wd / 2, it.y + (1 - a) * 12); g.scale(s, s); g.fillText(it.text, 0, 0); g.restore(); g.shadowBlur = 0;
    const w = w0 * s;
    if (a > .99) texts.push({ id: it.id, text: it.text, x0: Wd / 2 - w / 2, y0: it.y - 70, x1: Wd / 2 + w / 2, y1: it.y + 14 });
    g.textAlign = 'left';
  }
}
const bar = (t, t0, t1, y) => { const a = fade(t, t0, .3) * (1 - fade(t, t1 - .3, .3)); if (a <= 0) return; g.globalAlpha = a; g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, y, 80 * eo(seg(t, t0, t0 + .6)), 6); };

function pongScreen(t, P, t0, t1) {
  const a = fade(t, t0, .35) * (1 - fade(t, t1 - .3, .3)); if (a <= 0 || !P) return;
  const x0 = 250, y0 = 400, w = 580, h = 380;
  g.globalAlpha = a * .88; g.fillStyle = '#0c0e11'; g.fillRect(x0, y0, w, h);
  g.globalAlpha = a; g.strokeStyle = 'rgba(241,239,233,.5)'; g.lineWidth = 2; g.strokeRect(x0, y0, w, h);
  g.setLineDash([10, 12]); g.beginPath(); g.moveTo(x0 + w / 2, y0 + 10); g.lineTo(x0 + w / 2, y0 + h - 10); g.stroke(); g.setLineDash([]);
  const py = y0 + 20 + (h - 40) * clamp(P.pad, .1, .9), by = y0 + 20 + (h - 40) * P.by, bx = x0 + 34 + (w - 60) * P.bx;
  g.fillStyle = INK; g.fillRect(x0 + 18, py - 42, 12, 84); g.fillRect(bx - 9, by - 9, 18, 18);
  g.font = `500 22px ${MONO}`; g.fillStyle = DIM; g.textAlign = 'left'; g.fillText('PONG · NEURONS CONTROL THE PADDLE', x0, y0 - 16);
  // feedback tag
  const last = Math.floor((t - P.t0) / P.P); let tag = null;
  for (let n = last; n >= last - 1; n--) if (n >= 0 && n % 2 === 0) { const te = P.t0 + (n + .95) * P.P; if (t > te && t < te + 1.0) tag = P.missAt.has(n) ? 'miss' : 'hit'; }
  if (tag) { g.font = `800 40px ${SANS}`; g.textAlign = 'center'; g.fillStyle = tag === 'hit' ? CYAN : ACC; g.fillText(tag === 'hit' ? 'HIT → PREDICTABLE PULSE' : 'MISS → RANDOM NOISE', x0 + w / 2, y0 + h + 60); g.textAlign = 'left'; }
}

function powerBars(t, t0, t1) {
  const a = fade(t, t0, .35) * (1 - fade(t, t1 - .3, .3)); if (a <= 0) return;
  const x0 = 110, w = 860;
  g.globalAlpha = a * .8; g.fillStyle = 'rgba(12,14,17,.85)'; g.fillRect(x0 - 30, 210, w + 60, 420);
  g.globalAlpha = a; g.textAlign = 'left';
  g.font = `500 26px ${MONO}`; g.fillStyle = CYAN; g.fillText('YOUR BRAIN', x0, 280);
  g.font = `800 64px ${SANS}`; g.fillStyle = INK; g.fillText('≈ 20 W', x0, 350);
  const k1 = eo(seg(t, t0 + .2, t0 + .8)); g.fillStyle = CYAN; g.fillRect(x0, 372, Math.max(3, 4 * k1), 22);
  const t2 = Math.max(t0 + 1.0, window.T.dc - .1), k2 = eo(seg(t, t2, t2 + 1.6));
  if (t > t2) { g.globalAlpha = a * fade(t, t2, .3);
    g.font = `500 26px ${MONO}`; g.fillStyle = ACC; g.fillText('AI DATA CENTER', x0, 460);
    g.font = `800 64px ${SANS}`; g.fillStyle = INK; g.fillText('100s of MW', x0, 530);
    g.fillStyle = ACC; g.fillRect(x0, 552, w * k2, 22);
    g.font = `400 22px ${MONO}`; g.fillStyle = DIM; g.fillText('brain bar to scale: a sliver', x0, 610); }
  g.globalAlpha = 1;
}

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, L, unit } = c;
  const W3 = (layer, x, y, z) => { v3.set(x, L[layer].g.position.y + y, z); return proj(unit.localToWorld(v3.clone())); };
  // hook
  card(t, [
    { id: 'h1', font: `800 80px ${SANS}`, col: INK, text: 'WHAT HAPPENS WHEN', y: 250, d: .05 },
    { id: 'h2', font: `800 80px ${SANS}`, col: INK, text: 'COMPUTERS START USING', y: 340, d: .12 },
    { id: 'h3', font: `800 80px ${SANS}`, col: ACC, text: 'HUMAN BRAINS?', y: 430, d: .2 },
  ], 0, T.reveal + .3);
  bar(t, .05, T.reveal + .3, 150);
  card(t, [{ id: 'r1', font: `800 72px ${SANS}`, col: INK, text: 'A BIOCOMPUTER', y: 280, d: 0 }, { id: 'r2', font: `500 28px ${MONO}`, col: DIM, text: 'LIVING HUMAN NEURONS ON A CHIP · SCHEMATIC', y: 334, d: .2 }], T.reveal + .35, T.stem - .2);
  // neurons + chip
  label(t, { id: 'nn', t0: T.neurons + .3, t1: T.stem, a: W3('neur', .12, .02, .1), ly: 1180, idx: 'ALIVE', name: 'Human neurons', spec: 'firing right now', side: 'R', lx: 120 });
  label(t, { id: 'sc', t0: T.stem + .1, t1: T.mea, a: W3('neur', -.1, .02, .05), ly: 1180, idx: '01', name: 'Grown from stem cells', spec: 'cultured on the chip', side: 'R', lx: 120 });
  label(t, { id: 'me', t0: T.mea59 - .2, t1: T.sil, a: W3('mea', .2, .06, .2), ly: 1220, idx: '02', name: 'Microelectrode array', spec: '59 electrodes', side: 'R', lx: 120 });
  label(t, { id: 'si', t0: T.sil + .1, t1: T.body, a: W3('mea', -.28, .06, -.28), ly: 560, idx: '03', name: 'Silicon interface', spec: 'pulses in · spikes out', side: 'R', lx: 120 });
  if (t > T.pin - .1 && t < T.body) { const k = fade(t, T.pin - .1, .25) * (1 - fade(t, T.body - .3, .3)); g.globalAlpha = k; g.font = `700 34px ${MONO}`; g.textAlign = 'center';
    g.fillStyle = ACC; g.fillText('↑ STIMULATE', Wd / 2 - 190, 1300); if (t > T.pout - .1) { g.globalAlpha = k * fade(t, T.pout - .1, .25); g.fillStyle = CYAN; g.fillText('↓ RECORD', Wd / 2 + 210, 1300); } g.textAlign = 'left'; }
  // life support
  card(t, [{ id: 'ls', font: `800 64px ${SANS}`, col: INK, text: 'LIFE SUPPORT', y: 280, d: 0 }, { id: 'ls2', font: `500 28px ${MONO}`, col: DIM, text: 'THE BOX IS THE BODY', y: 330, d: .2 }], T.box - .1, T.pump);
  label(t, { id: 'pu', t0: T.pump + .1, t1: T.filt + .4, a: W3('tray', c.PUMP[0].x, .42, c.PUMP[0].z), ly: 620, idx: '04', name: 'Pumps', spec: 'circulate nutrient medium', side: 'R', lx: 120 });
  label(t, { id: 'fi', t0: T.filt + .1, t1: T.gas + .4, a: W3('tray', c.FILT.x, .5, c.FILT.z), ly: 1200, idx: '05', name: 'Filtration', spec: 'pulls out waste', side: 'L', lx: 960 });
  label(t, { id: 'ga', t0: T.gas + .1, t1: T.heat + .3, a: W3('tray', c.GAS.x, .3, c.GAS.z), ly: 620, idx: '06', name: 'Gas mixing', spec: 'O₂ / CO₂ in balance', side: 'L', lx: 960 });
  label(t, { id: 'he', t0: T.heat + .1, t1: T.life + .3, a: W3('heat', .5, .03, .5), ly: 1200, idx: '07', name: 'Heater', spec: 'held at ~37 °C', side: 'R', lx: 120 });
  card(t, [{ id: 'm6', font: `800 104px ${SANS}`, col: ACC, text: 'UP TO 6 MONTHS', y: 300, d: 0 }, { id: 'm6b', font: `500 28px ${MONO}`, col: INK, text: 'NEURON LIFESPAN IN THE UNIT', y: 352, d: .2 }], T.life - .1, T.learn - .1);
  // DishBrain + Pong
  card(t, [{ id: 'db', font: `800 72px ${SANS}`, col: INK, text: 'DISHBRAIN · 2022', y: 250, d: 0 }, { id: 'db2', font: `500 28px ${MONO}`, col: DIM, text: '~800,000 NEURONS · LEARNED PONG', y: 302, d: .2 }], T.learn + .2, T.dishb + .2);
  pongScreen(t, c.pongS, T.pong - .3, T.dishb - .1);
  card(t, [{ id: 'cl', font: `800 104px ${SANS}`, col: ACC, text: 'CL1 · $35,000', y: 300, d: 0 }, { id: 'cl2', font: `500 28px ${MONO}`, col: INK, text: 'CORTICAL LABS · ON SALE SINCE 2025', y: 352, d: .2 }], T.cl1 - .1, T.rent);
  // rent
  card(t, [{ id: 'fs', font: `800 66px ${SANS}`, col: INK, text: 'FINALSPARK', y: 250, d: 0 }, { id: 'fs2', font: `500 28px ${MONO}`, col: DIM, text: 'NEUROPLATFORM · 16 ORGANOIDS · REMOTE', y: 300, d: .2 }], T.fs - .1, T.why);
  if (t > T.org - .1 && t < T.why) { const a = fade(t, T.org - .1, .3) * (1 - fade(t, T.why - .3, .3)); const p0 = proj(c.orgP.localToWorld(new THREE.Vector3(0, .5, 0)));
    g.globalAlpha = a; g.strokeStyle = CYAN; g.lineWidth = 3; g.setLineDash([12, 10]); g.lineDashOffset = -t * 60; g.beginPath(); g.moveTo(p0[0], p0[1] - 30); g.lineTo(p0[0], 470); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(12,14,17,.85)'; g.fillRect(p0[0] - 120, 400, 240, 70); g.strokeRect(p0[0] - 120, 400, 240, 70); g.fillStyle = INK; g.font = `700 32px ${MONO}`; g.textAlign = 'center'; g.fillText('RENT ONLINE', p0[0], 446); g.textAlign = 'left'; }
  // power
  powerBars(t, T.brain - .1, T.claim - .05);
  card(t, [{ id: 'cm', font: `800 92px ${SANS}`, col: INK, text: '1,000,000×', y: 300, d: 0 }, { id: 'cm2', font: `500 28px ${MONO}`, col: DIM, text: 'LESS ENERGY · COMPANY CLAIM, UNPROVEN', y: 352, d: .2 }], T.claim - .05, T.course);
  // end
  card(t, [{ id: 'e1', font: `800 96px ${SANS}`, col: INK, text: 'GROWN,', y: 270, d: 0 }, { id: 'e2', font: `800 96px ${SANS}`, col: ACC, text: 'NOT BUILT.', y: 370, d: .2 }], T.grownb - .1, T.next - .05);
  card(t, [{ id: 'n1', font: `800 70px ${SANS}`, col: INK, text: 'WHAT SHOULD WE', y: 270, d: 0 }, { id: 'n2', font: `800 70px ${SANS}`, col: ACC, text: 'TAKE APART NEXT?', y: 355, d: .1 }, { id: 'n3', font: `500 24px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 410, d: .3 }], T.next - .05, 999);
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
