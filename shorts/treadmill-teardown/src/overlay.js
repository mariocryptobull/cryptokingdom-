// Marks layer: anchored labels, data panels, captions, title and end cards. 1080×1920.
import * as THREE from 'three';
import { clamp, seg, ss, eo } from '/core/lib.js';

const cv = document.getElementById('ov'), g = cv.getContext('2d');
const MONO = '"JBMono", monospace', SANS = '"Inter", sans-serif';
const INK = '#f1efe9', DIM = 'rgba(241,239,233,.66)', ACC = '#ff6b3d', CYAN = '#59d4ff', GRN = '#7dffb0', LINE = 'rgba(241,239,233,.78)';
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
const env = (t, a, b, fi = .3, fo = .3) => fade(t, a, fi) * (1 - fade(t, b - fo, fo));

function label(t, o) {
  const { t0, t1, a, ly, idx, name, spec, id } = o;
  const side = o.side || (a[0] > 540 ? 'L' : 'R'), lx = o.lx ?? (side === 'L' ? 980 : 100), dir = side === 'L' ? -1 : 1;
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
// dark panel with a scrolling trace: fn(t') → 0..1, plotted over the last `span` seconds
function scope(t, k, y, title, sub, traces, span = 3) {
  if (k <= 0) return;
  const x0 = 110, x1 = 970, h = 150;
  g.globalAlpha = k; g.fillStyle = 'rgba(14,15,17,.8)'; g.fillRect(x0 - 20, y - 70, x1 - x0 + 40, h + 110);
  g.fillStyle = INK; g.font = `700 34px ${SANS}`; g.fillText(title, x0, y - 22);
  if (sub) { g.fillStyle = DIM; g.font = `400 24px ${MONO}`; g.textAlign = 'right'; g.fillText(sub, x1, y - 22); g.textAlign = 'left'; }
  g.strokeStyle = 'rgba(241,239,233,.15)'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i <= 4; i++) { g.moveTo(x0, y + i * h / 4); g.lineTo(x1, y + i * h / 4); } g.stroke();
  for (const tr of traces) {
    g.strokeStyle = tr.col; g.lineWidth = 4; g.beginPath();
    for (let i = 0; i <= 260; i++) { const u = i / 260, tt = t - span * (1 - u), val = tt < tr.from ? null : tr.fn(tt); const px = x0 + u * (x1 - x0), py = y + h - clamp(val ?? tr.rest) * h; i ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.stroke();
    if (tr.name) { g.fillStyle = tr.col; g.font = `600 24px ${MONO}`; g.fillText(tr.name, tr.nx ?? x0, y + h + 34); }
  }
  texts.push({ id: 'scope' + title, text: title, x0: x0, y0: y - 60, x1: x1, y1: y + h + 40 });
}

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, A, wp, vBelt, current, pulseAt, VBELT, STRIKES } = c, P = n => proj(wp(A[n]));
  card(t, [
    { id: 't1', font: `800 84px ${SANS}`, col: INK, text: 'HOW A TREADMILL', y: 290, d: .1 },
    { id: 't2', font: `800 84px ${SANS}`, col: INK, text: 'KNOWS YOUR SPEED', y: 382, d: .2 },
    { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · SCHEMATIC MODEL', y: 438, d: .4 },
  ], 0, T.motor - .1);
  if (t < T.motor) { g.globalAlpha = fade(t, .1, .5) * (1 - fade(t, T.motor - .4, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 180, 80 * eo(seg(t, .1, .7)), 6); }
  // teardown labels
  const L = (id, n, t0, t1, idx, name, spec, ly, side, lx) => label(t, { id, t0, t1, a: P(n), ly, idx, name, spec, side, lx });
  L('mo', 'motor', T.motor + .1, T.drive + .1, '01', 'DC motor', 'spins the drive', 560, 'R');
  L('dr', 'fly', T.drive + .1, T.roller + .2, '02', 'Drive belt + flywheel', 'flywheel smooths the spin', 560, 'R');
  L('ro', 'roller', T.roller + .1, T.belt, '03', 'Front roller', 'pulls the running belt', 1220, 'R');
  L('be', 'belt', T.belt + .1, T.deck + .1, '04', 'Running belt', 'loops around two rollers', 560, 'R');
  L('de', 'deck', T.deck + .1, T.cush + .1, '05', 'Lubricated deck', 'silicone cuts belt friction', 1220, 'R');
  L('cu', 'cush', T.cush + .1, T.down - .3, '06', 'Deck cushions', 'soften every landing', 1250, 'R');
  L('mg', 'magnet', T.magnet + .1, T.formula - .1, '07', 'Magnet', 'on the roller pulley', 560, 'R');
  L('se', 'sensor', T.pulse, T.formula - .1, '08', 'Speed sensor', 'reed or Hall: 1 pulse / turn', 1230, 'R');
  L('ct', 'ctrl', T.ctrl + .1, T.incline - .1, '09', 'Motor controller', 'more current on impact', 1250, 'R');
  L('in', 'lift', T.incline + .2, T.key - .1, '10', 'Incline motor + lead screw', 'tilts the deck: 0 → 10 %', 1250, 'R');
  L('ke', 'key', T.key + .1, T.why - .1, '11', 'Safety key', 'pulled → motor stops', 560, 'R');
  // slow-motion tag during the sensor close-up
  { const k = env(t, T.magnet, T.strike - .3); if (k > 0) { g.globalAlpha = k * .9; g.fillStyle = DIM; g.font = `500 26px ${MONO}`; g.textAlign = 'right'; g.fillText('SLOW MOTION', 980, 1380); g.textAlign = 'left'; } }
  // pulse scope
  scope(t, env(t, T.pulse - .2, T.formula + .1), 250, 'Sensor pulses', '1 pulse = 1 roller turn',
    [{ col: CYAN, fn: tt => pulseAt(tt) ? .85 : .1, rest: .1, from: -1 }], 3);
  // formula card
  card(t, [
    { id: 'f1', font: `800 64px ${SANS}`, col: ACC, text: 'SPEED = RPM × CIRCUMFERENCE', y: 270, d: 0 },
    { id: 'f2', font: `500 34px ${MONO}`, col: INK, text: 'π × 2.5 in roller = 7.85 in per turn', y: 340, d: .9 },
    { id: 'f3', font: `500 34px ${MONO}`, col: INK, text: '× 700 rpm ≈ 5,500 in/min ≈ 5.2 mph', y: 392, d: 2.0 },
  ], T.formula - .1, T.strike - .1);
  // speed + current scope during the foot-strike beat
  { const k = env(t, T.strike + .2, T.incline - .1);
    scope(t, k, 250, 'Belt speed vs. motor current', '', [
      { col: ACC, fn: tt => .35 + 2.6 * (vBelt(tt) / VBELT - .9), rest: .61, from: T.strike - 2, name: 'BELT SPEED', nx: 110 },
      { col: CYAN, fn: tt => current(tt) * .9 - .25, rest: .07, from: T.strike - 2, name: 'CURRENT', nx: 420 },
    ], 2.5);
    const kd = env(t, T.dip, T.incline - .1); if (kd > 0) { g.globalAlpha = kd; g.fillStyle = ACC; g.font = `700 30px ${MONO}`; g.textAlign = 'right'; g.fillText('dips 4–9 % per step', 970, 444); g.textAlign = 'left'; } }
  // why it feels easier
  card(t, [{ id: 'w1', font: `800 64px ${SANS}`, col: INK, text: 'NO AIR RESISTANCE', y: 270, d: .2 }], T.air - .1, T.study + .2);
  card(t, [{ id: 'w2', font: `800 72px ${SANS}`, col: ACC, text: '1% INCLINE ≈ OUTDOORS', y: 270, d: 0 },
    { id: 'w3', font: `500 28px ${MONO}`, col: INK, text: 'Jones & Doust 1996 · J. Sports Sciences', y: 326, d: .3 }], T.study + .2, T.next - .1);
  // what next + end cards
  card(t, [{ id: 'n1', font: `800 80px ${SANS}`, col: INK, text: 'WHAT SHOULD WE', y: 300, d: 0 }, { id: 'n2', font: `800 80px ${SANS}`, col: ACC, text: 'TAKE APART NEXT?', y: 392, d: .15 }], T.next - .1, T.congrats - .05);
  card(t, [{ id: 'e1', font: `800 80px ${SANS}`, col: INK, text: 'SPEED = RPM × π × D', y: 300, d: .05 }, { id: 'e2', font: `500 26px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 352, d: .4 }], T.card - .2, 99);
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
