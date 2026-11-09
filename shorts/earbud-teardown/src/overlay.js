// Marks layer: anchored labels, year cards, captions, title and end cards. 1080×1920.
import * as THREE from 'three';
import { clamp, seg, ss, eo } from '/core/lib.js';

const cv = document.getElementById('ov'), g = cv.getContext('2d');
const MONO = '"JBMono", monospace', SANS = '"Inter", sans-serif';
const INK = '#f1efe9', DIM = 'rgba(241,239,233,.66)', ACC = '#ff6b3d', LINE = 'rgba(241,239,233,.78)';
const CAP = { font: `800 54px ${SANS}`, y: 1480, max: 960 };

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
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 12;
    g.fillText(it.text, Wd / 2, it.y + (1 - a) * 12); g.shadowBlur = 0;
    const w = g.measureText(it.text).width;
    if (a > .99) texts.push({ id: it.id, text: it.text, x0: Wd / 2 - w / 2, y0: it.y - 70, x1: Wd / 2 + w / 2, y1: it.y + 14 });
    g.textAlign = 'left';
  }
}
const yearCard = (t, id, big, sub, t0, t1) => card(t, [{ id: id + 'a', font: `800 104px ${SANS}`, col: ACC, text: big, y: 300, d: 0 }, { id: id + 'b', font: `500 30px ${MONO}`, col: INK, text: sub, y: 352, d: .2 }], t0, t1);

function ancPanel(t, T) {
  const k = fade(t, T.anc - .1, .4) * (1 - fade(t, T.glue - .3, .3)); if (k <= 0) return;
  const X0 = 110, X1 = 970, rows = [{ y: 300, lab: 'NOISE  ·  outer mic hears it', col: '#c9ccd2' }, { y: 450, lab: 'ANTI-NOISE  ·  flipped, played by the driver', col: ACC }, { y: 600, lab: 'WHAT YOU HEAR', col: '#7ee0a1' }];
  const a = eo(seg(t, T.flip + .2, T.flip + 1.4)), p = ss(seg(t, T.cancel - .2, T.cancel + 1.0));
  const nz = (x, tt) => Math.sin(x * .028 - tt * 5) * .7 + Math.sin(x * .061 - tt * 8.3 + 1) * .3;
  g.globalAlpha = k * .82; g.fillStyle = 'rgba(14,15,17,.8)'; g.fillRect(X0 - 40, 175, X1 - X0 + 80, 500);
  g.globalAlpha = k; g.font = `800 40px ${SANS}`; g.fillStyle = INK; g.textAlign = 'left'; g.fillText('NOISE CANCELLATION', X0, 228);
  const rk = fade(t, T.rate, .4);
  if (rk > 0) { g.globalAlpha = k * rk; g.textAlign = 'right'; g.font = `800 40px ${SANS}`; g.fillStyle = ACC; g.fillText('200× / s', X1, 228); g.textAlign = 'left'; }
  rows.forEach((r, i) => {
    const amp = i === 0 ? 1 : i === 1 ? a : 1 - a * p, rowA = i === 0 ? fade(t, T.hear, .3) : i === 1 ? fade(t, T.flip, .3) : fade(t, T.plays, .3);
    if (rowA <= 0) return;
    g.globalAlpha = k * rowA; g.font = `500 24px ${MONO}`; g.fillStyle = DIM; g.fillText(r.lab, X0, r.y - 62);
    g.strokeStyle = 'rgba(241,239,233,.18)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X0, r.y); g.lineTo(X1, r.y); g.stroke();
    g.strokeStyle = r.col; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath();
    for (let x = X0; x <= X1; x += 4) { const v = (i === 1 ? -1 : 1) * nz(x, t) * 46 * amp; x === X0 ? g.moveTo(x, r.y - v) : g.lineTo(x, r.y - v); }
    g.stroke();
    if (i === 2 && p > .9) { g.globalAlpha = k * fade(t, T.cancel + .9, .3); g.font = `700 26px ${MONO}`; g.fillStyle = '#7ee0a1'; g.textAlign = 'right'; g.fillText('peak + trough = silence', X1, r.y + 52); g.textAlign = 'left'; }
  });
  if (k > .99) texts.push({ id: 'anc', text: 'NOISE CANCELLATION', x0: X0, y0: 190, x1: X0 + 420, y1: 240 });
}

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, wp, EXPAX, vib, ek } = c;
  const P = n => proj(wp(n));
  card(t, [
    { id: 't1', font: `800 92px ${SANS}`, col: INK, text: "WHAT'S INSIDE", y: 270, d: .1 },
    { id: 't2', font: `800 92px ${SANS}`, col: INK, text: 'AN AIRPOD?', y: 370, d: .2 },
    { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · AIRPODS-STYLE BUD', y: 428, d: .4 },
  ], 0, T.open + .2);
  card(t, [{ id: 'sc', font: `700 34px ${MONO}`, col: ACC, text: 'SCALE 100 : 1 · SCHEMATIC MODEL', y: 486, d: 0 }], T.scale, T.open + .2);
  if (t < T.open) { g.globalAlpha = fade(t, .1, .5) * (1 - fade(t, T.open - .2, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 160, 80 * eo(seg(t, .1, .7)), 6); }
  label(t, { id: 'gl', t0: T.open - .1, t1: T.out + .2, a: proj(wp('shellR').clone().set(0, 2.55, .4)), ly: 560, idx: 'SEAM', name: 'Glued shell', spec: 'two halves', side: 'R', lx: 140 });
  label(t, { id: 'bt', t0: T.cell, t1: T.chip - .1, a: P('batt'), ly: 1150, idx: '01', name: 'Battery', spec: 'Li-ion button cell', side: 'R', lx: 120 });
  card(t, [{ id: 'm1', font: `800 104px ${SANS}`, col: ACC, text: '49.7 mAh', y: 330, d: 0 }, { id: 'm2', font: `500 28px ${MONO}`, col: INK, text: 'AirPods Pro 2 earbud · regulatory filing', y: 384, d: .2 }], T.mah - .3, T.chip - .1);
  label(t, { id: 'ch', t0: T.chip + .1, t1: T.spk - .2, a: proj(wp('board').add(new THREE.Vector3(-.25, .08, 0))), ly: 560, idx: '02', name: 'Main chip', spec: 'Bluetooth + audio processing', side: 'R', lx: 110 });
  label(t, { id: 'an', t0: T.ant + .1, t1: T.spk - .2, a: proj(wp('ant').add(new THREE.Vector3(.5, 0, 0))), ly: 1170, idx: '03', name: 'Antenna', spec: 'radio link to your phone', side: 'L', lx: 970 });
  label(t, { id: 'mg', t0: T.coil + .1, t1: T.mics - .1, a: proj(wp('magnet').addScaledVector(EXPAX, -.1).add(new THREE.Vector3(.55, 0, 0))), ly: 1170, idx: '04', name: 'Magnet', spec: '', side: 'L', lx: 970 });
  label(t, { id: 'vc', t0: T.coil + .4, t1: T.mics - .1, a: proj(wp('coil').add(new THREE.Vector3(-.32, 0, 0))), ly: 1170, idx: '05', name: 'Voice coil', spec: 'copper wire', side: 'R', lx: 110 });
  label(t, { id: 'dp', t0: T.push - .1, t1: T.mics - .1, a: proj(wp('dia').add(new THREE.Vector3(.4, .05, 0))), ly: 560, idx: '06', name: 'Diaphragm', spec: 'pushes the air', side: 'L', lx: 970 });
  // sound waves off the diaphragm
  if (t > T.push && t < T.mics) { const k = fade(t, T.push, .3) * (1 - fade(t, T.mics - .3, .3)); const [ax, ay] = proj(wp('dia')), [bx, by] = proj(wp('dia').addScaledVector(EXPAX, 1));
    const ang = Math.atan2(by - ay, bx - ax);
    for (let i = 0; i < 4; i++) { const u = ((t - T.push) * 1.1 + i / 4) % 1; g.globalAlpha = k * (1 - u) * .9; g.strokeStyle = ACC; g.lineWidth = 5; g.beginPath(); g.arc(ax, ay, 150 + u * 260, ang - .6, ang + .6); g.stroke(); } }
  card(t, [{ id: 'k1', font: `800 64px ${SANS}`, col: ACC, text: '1,000+ PUSHES / SECOND', y: 300, d: 0 }, { id: 'k2', font: `500 28px ${MONO}`, col: INK, text: 'a 1 kHz tone = 1,000 cycles per second · shown slowed', y: 350, d: .2 }], T.push + .2, T.mics - .1);
  label(t, { id: 'mc', t0: T.mics + .2, t1: T.force - .1, a: P('mic2'), ly: 1170, idx: '07', name: 'Beamforming mics', spec: 'aim at your voice', side: 'L', lx: 960 });
  label(t, { id: 'vt', t0: T.vent + .1, t1: T.force - .1, a: P('vent'), ly: 560, idx: '08', name: 'Pressure vent', spec: 'no plugged-ear feeling', side: 'R', lx: 110 });
  label(t, { id: 'fs', t0: T.force + .1, t1: T.anc - .7, a: P('force'), ly: 1170, idx: '09', name: 'Force sensor', spec: 'squeeze the stem', side: 'L', lx: 960 });
  label(t, { id: 'sk', t0: T.skin + .1, t1: T.anc - .7, a: P('skin'), ly: 560, idx: '10', name: 'Skin sensor', spec: 'in-ear detection', side: 'R', lx: 110 });
  ancPanel(t, T);
  card(t, [{ id: 'g1', font: `800 92px ${SANS}`, col: ACC, text: 'REPAIRABILITY 0/10', y: 330, d: 0 }, { id: 'g2', font: `500 28px ${MONO}`, col: INK, text: 'iFixit · AirPods Pro & Pro 2 teardowns', y: 384, d: .25 }], T.zero - .2, T.next - .1);
  card(t, [{ id: 'n1', font: `800 84px ${SANS}`, col: INK, text: 'WHAT SHOULD WE', y: 290, d: 0 }, { id: 'n2', font: `800 84px ${SANS}`, col: ACC, text: 'TAKE APART NEXT?', y: 384, d: .15 }], T.next - .1, T.congrats - .1);
  card(t, [{ id: 'e1', font: `800 64px ${SANS}`, col: INK, text: 'BATTERY · CHIP · DRIVER', y: 290, d: .05 }, { id: 'e3', font: `800 64px ${SANS}`, col: INK, text: 'MICS · SENSORS · GLUE', y: 370, d: .15 }, { id: 'e2', font: `500 26px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 424, d: .4 }], T.card - .2, 99);
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
