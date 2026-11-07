// Marks layer: anchored labels, cards, spike trace, radio arcs, captions. 1080×1920.
import * as THREE from 'three';
import { clamp, seg, ss, eo, hash } from '/core/lib.js';

const cv = document.getElementById('ov'), g = cv.getContext('2d');
const MONO = '"JBMono", monospace', SANS = '"Inter", sans-serif';
const INK = '#f1efe9', DIM = 'rgba(241,239,233,.7)', ACC = '#ff6b3d', CYAN = '#59d4ff', LINE = 'rgba(241,239,233,.8)';
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
const wpos = (obj, x = 0, y = 0, z = 0) => obj.localToWorld(new THREE.Vector3(x, y, z));

// label: anchor dot → elbow → text. align 'left' = text starts at lx (to the right of the elbow); 'right' = text ends at lx.
function label(t, o) {
  const { t0, t1, a, ly, lx, name, spec, id, idx } = o, right = o.align === 'right', dir = right ? -1 : 1;
  const dl = eo(seg(t, t0, t0 + .38)), tx = fade(t, t0 + .18, .32), out = 1 - fade(t, t1 - .3, .3);
  if (dl <= 0 || out <= 0) return;
  const [ax, ay] = a, ex = lx - dir * 34, end = lx - dir * 10;
  g.globalAlpha = out;
  g.fillStyle = INK; g.beginPath(); g.arc(ax, ay, 5, 0, 7); g.fill();
  g.strokeStyle = 'rgba(241,239,233,.4)'; g.lineWidth = 1.5; g.beginPath(); g.arc(ax, ay, 5 + 9 * dl, 0, 7); g.stroke();
  const s1 = Math.hypot(ex - ax, ly - ay), s2 = Math.abs(end - ex), len = (s1 + s2) * dl;
  g.strokeStyle = LINE; g.lineWidth = 2; g.beginPath(); g.moveTo(ax, ay);
  if (len <= s1) g.lineTo(ax + (ex - ax) * len / s1, ay + (ly - ay) * len / s1); else { g.lineTo(ex, ly); g.lineTo(ex + dir * (len - s1), ly); }
  g.stroke();
  if (tx <= 0) return;
  g.globalAlpha = out * tx; const dx = (1 - tx) * 12 * dir;
  g.textAlign = right ? 'right' : 'left'; g.textBaseline = 'alphabetic';
  g.shadowColor = 'rgba(0,0,0,.75)'; g.shadowBlur = 12;
  if (idx) { g.fillStyle = ACC; g.font = `500 24px ${MONO}`; g.fillText(idx, lx + dx, ly - 40); }
  g.fillStyle = INK; g.font = `700 42px ${SANS}`; g.fillText(name, lx + dx, ly + 4);
  let w = g.measureText(name).width;
  if (spec) { g.fillStyle = DIM; g.font = `400 25px ${MONO}`; g.fillText(spec, lx + dx, ly + 40); w = Math.max(w, g.measureText(spec).width); }
  g.shadowBlur = 0; g.textAlign = 'left';
  if (tx > .99 && out > .99) { const x0 = right ? lx - w : lx, x1 = right ? lx : lx + w; texts.push({ id, text: name + (spec ? ' ' + spec : ''), x0: Math.max(0, x0), y0: ly - 64, x1: Math.min(Wd, x1), y1: ly + 48 }); }
}

function card(t, items, t0, t1) {
  for (const it of items) {
    const a = fade(t, t0 + it.d, .45) * (1 - fade(t, t1 - .35, .35)); if (a <= 0) continue;
    g.globalAlpha = a; g.font = it.font; g.fillStyle = it.col; g.textAlign = 'center';
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 12;
    g.fillText(it.text, Wd / 2, it.y + (1 - a) * 12); g.shadowBlur = 0;
    const w = g.measureText(it.text).width;
    if (a > .99) texts.push({ id: it.id, text: it.text, x0: Wd / 2 - w / 2, y0: it.y - 70, x1: Wd / 2 + w / 2, y1: it.y + 14 });
    g.textAlign = 'left';
  }
}
function tag(t, id, text, [x, y], t0, t1, col = INK) {
  const a = fade(t, t0, .35) * (1 - fade(t, t1 - .3, .3)); if (a <= 0) return;
  g.globalAlpha = a; g.font = `600 26px ${MONO}`; const w = g.measureText(text).width + 28;
  x = clamp(x, w / 2 + 16, Wd - w / 2 - 16);
  g.fillStyle = 'rgba(14,15,17,.82)'; g.beginPath(); g.roundRect(x - w / 2, y - 22, w, 44, 8); g.fill();
  g.strokeStyle = col; g.lineWidth = 2; g.stroke(); g.fillStyle = col; g.textAlign = 'center'; g.fillText(text, x, y + 9); g.textAlign = 'left';
  if (a > .99) texts.push({ id, text, x0: x - w / 2, y0: y - 22, x1: x + w / 2, y1: y + 22 });
}
// radio arcs from a → b
function arcs(t, a, b, t0, t1, col = CYAN, dashed = false) {
  const k = fade(t, t0, .3) * (1 - fade(t, t1 - .3, .3)); if (k <= 0) return;
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  g.strokeStyle = col; g.lineWidth = 4; g.lineCap = 'round';
  if (dashed) { g.globalAlpha = k * .55; g.setLineDash([6, 14]); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); g.setLineDash([]); }
  for (let i = 0; i < 4; i++) { const u = ((t - t0) * .9 + i / 4) % 1, r = 30 + u * (L - 40);
    g.globalAlpha = k * (1 - u) * .95; g.beginPath(); g.arc(a[0], a[1], r, ang - .32, ang + .32); g.stroke(); }
  g.lineCap = 'butt';
}

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, head, ipos, IP, curves, neurons, fireAmt, laptop, phone, car, arm, LH } = c, V = (x, y, z) => new THREE.Vector3(x, y, z);
  const P = n => wpos(IP[n].g);
  // hook
  card(t, [
    { id: 't1', font: `800 66px ${SANS}`, col: INK, text: "THIS IS ELON MUSK'S", y: 250, d: .05 },
    { id: 't2', font: `900 140px ${SANS}`, col: ACC, text: 'NEURALINK.', y: 390, d: .25 },
    { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · SCHEMATIC MODEL', y: 448, d: .6 },
  ], 0, T.apart - .1);
  label(t, { id: 'n1', t0: T.coin + .1, t1: T.apart + .2, a: proj(wpos(IP.lid.g, .3, .05, .25)), ly: 1190, lx: 600, name: 'The implant', spec: 'coin-sized, in the skull', align: 'left' });
  // teardown labels
  label(t, { id: 'lid', t0: T.kase + .1, t1: T.chip + .2, a: proj(wpos(IP.lid.g, .42, .05, .2)), ly: proj(P('lid'))[1] - 30, lx: 760, idx: '01', name: 'Sealed case', spec: '≈ 23 × 8 mm', align: 'left' });
  label(t, { id: 'coil', t0: T.wireless + .05, t1: T.chip + .2, a: proj(wpos(IP.coil.g, -.4, 0, .1)), ly: proj(P('coil'))[1] + 10, lx: 320, idx: '02', name: 'Charging coil', spec: 'wireless', align: 'right' });
  label(t, { id: 'bat', t0: T.battery + .1, t1: T.chip + .2, a: proj(wpos(IP.battery.g, .34, 0, .1)), ly: proj(P('battery'))[1] + 60, lx: 760, idx: '03', name: 'Battery', spec: 'rechargeable', align: 'left' });
  label(t, { id: 'chip', t0: T.chip + .25, t1: T.threads, a: proj(wpos(IP.chip.g, 0, .04, .1)), ly: proj(P('chip'))[1] + 120, lx: 300, idx: '04', name: 'Custom chip', spec: 'amplify · process', align: 'right' });
  if (curves[0]) {
    label(t, { id: 'thr', t0: T.threads + .25, t1: T.robot - .2, a: proj(curves[8].getPoint(.45)), ly: 1150, lx: 290, idx: '05', name: '64 threads', spec: 'thinner than a hair', align: 'right' });
    label(t, { id: 'el', t0: T.electrodes + .2, t1: T.robot - .2, a: proj(curves[52].getPoint(.92)), ly: 1250, lx: 790, idx: '06', name: '1,024', spec: 'electrodes, 16/thread', align: 'left' });
  }
  // robot
  label(t, { id: 'r1', t0: T.robot + .6, t1: T.how, a: proj(wpos(head, -.12, .12, 0)), ly: 560, lx: 300, idx: '07', name: 'R1 robot', spec: 'inserts the threads', align: 'right' });
  label(t, { id: 'ves', t0: T.vessels + .1, t1: T.how, a: proj(V(.11, .03, -.35)), ly: 1200, lx: 760, name: 'Blood vessels', spec: 'avoided', align: 'left' });
  // neurons + spike trace
  const nA = neurons[6].g.getWorldPosition(new THREE.Vector3());
  label(t, { id: 'neu', t0: T.think + .3, t1: T.spikes - .1, a: proj(nA), ly: 1210, lx: 300, name: 'Neurons', spec: 'motor cortex', align: 'right' });
  { const k = fade(t, T.fire - .3, .3) * (1 - fade(t, T.send + .3, .3));
    if (k > 0) { const x0 = 120, x1 = 960, y0 = 560, hgt = 160, nn = neurons[6], nb = neurons[11];
      g.globalAlpha = k; g.fillStyle = 'rgba(14,15,17,.8)'; g.beginPath(); g.roundRect(x0 - 20, y0 - 60, x1 - x0 + 40, hgt + 90, 14); g.fill();
      g.font = `600 24px ${MONO}`; g.fillStyle = DIM; g.fillText('ONE ELECTRODE · VOLTAGE', x0, y0 - 24); g.fillStyle = CYAN; g.textAlign = 'right'; g.fillText('SPIKES', x1, y0 - 24); g.textAlign = 'left';
      g.strokeStyle = CYAN; g.lineWidth = 3; g.beginPath(); const span = 2.2;
      for (let i = 0; i <= 420; i++) { const tt = t - span + span * i / 420; let y = y0 + hgt / 2 + 6 * (hash(Math.floor(tt * 400)) - .5);
        const a1 = fireAmt(nn, tt), a2 = fireAmt(nb, tt); const sp = Math.max(a1, a2 * .7); if (sp > .6) y -= (sp - .6) / .4 * hgt * .55 * Math.sin((1 - sp) * 40); else if (sp > 0) y += sp * 18;
        const x = x0 + (x1 - x0) * i / 420; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke(); if (k > .99) texts.push({ id: 'trace', text: 'ONE ELECTRODE · VOLTAGE SPIKES', x0, y0: y0 - 60, x1, y1: y0 + hgt + 30 }); } }
  // radio link to the computer
  const lapScr = laptop.visible ? proj(wpos(laptop, 0, .45, .1)) : null, imp = proj(V(ipos.x, ipos.y + .45, ipos.z));
  if (lapScr) arcs(t, imp, lapScr, T.bt - .1, T.decode + .6);
  tag(t, 'bt', 'BLUETOOTH', [(imp[0] + (lapScr || imp)[0]) / 2, (imp[1] + (lapScr || imp)[1]) / 2 + 70], T.bt + .1, T.decode + .6, CYAN);
  if (lapScr) tag(t, 'dec', 'SPIKES → INTENT → CURSOR', [Wd / 2, 1250], T.decode + .2, T.y24 - .1);
  // milestones
  card(t, [{ id: 'y1', font: `800 110px ${SANS}`, col: ACC, text: 'JAN 2024', y: 300, d: 0 }, { id: 'y2', font: `500 30px ${MONO}`, col: INK, text: 'first human implant · PRIME study', y: 356, d: .25 }], T.y24 - .1, T.y26 - .1);
  if (lapScr) tag(t, 'chs', 'online chess by thought · Mar 2024', [Wd / 2, 1250], T.chess - .2, T.y26 - .1);
  card(t, [{ id: 'p1', font: `800 110px ${SANS}`, col: ACC, text: '21', y: 300, d: 0 }, { id: 'p2', font: `500 30px ${MONO}`, col: INK, text: 'participants · Neuralink, Jan 2026', y: 356, d: .25 }], T.y26 - .1, T.goal - .1);
  { const rows = [['ROBOTIC ARM', 'tested in trials', T.arm], ['SPEECH', 'in development', T.speech], ['BLINDSIGHT (VISION)', 'in development', T.speech + .9]];
    rows.forEach(([a, b, t0], i) => { const k = fade(t, t0, .35) * (1 - fade(t, T.goal - .4, .3)); if (k <= 0) return; const y = 440 + i * 54;
      g.globalAlpha = k; g.font = `700 32px ${SANS}`; g.fillStyle = INK; g.textAlign = 'right'; g.fillText(a, Wd / 2 - 14, y); g.font = `500 26px ${MONO}`; g.fillStyle = i ? DIM : CYAN; g.textAlign = 'left'; g.fillText(b, Wd / 2 + 14, y);
      if (k > .99) texts.push({ id: 'row' + i, text: a + ' ' + b, x0: 200, y0: y - 34, x1: 880, y1: y + 10 }); }); }
  // the goal
  card(t, [{ id: 'g1', font: `800 96px ${SANS}`, col: INK, text: 'THE GOAL', y: 290, d: 0 }, { id: 'g2', font: `600 30px ${MONO}`, col: ACC, text: 'NOT YET DEMONSTRATED', y: 346, d: .3 }], T.goal - .1, T.next - .2);
  if (phone.visible) { const pp = proj(wpos(phone, 0, 0, 0)); arcs(t, imp, pp, T.phones, T.next - .2, ACC, true); tag(t, 'ph', 'PHONE', [pp[0], pp[1] - 240], T.phones + .2, T.next - .2, ACC); }
  if (lapScr && t > T.goal) { arcs(t, imp, lapScr, T.phones + .3, T.next - .2, ACC, true); tag(t, 'pc', 'COMPUTER', [lapScr[0] + 240, lapScr[1] + 40], T.phones + .5, T.next - .2, ACC); }
  if (car.visible) { const cp = proj(wpos(car, 0, .3, 0)); arcs(t, imp, cp, T.tesla, T.next - .2, ACC, true); tag(t, 'car', "CAR · MUSK'S IDEA", [cp[0], cp[1] + 150], T.tesla + .2, T.next - .2, ACC); }
  // closer
  card(t, [{ id: 'e1', font: `800 80px ${SANS}`, col: INK, text: 'WHAT SHOULD WE', y: 280, d: .05 }, { id: 'e2', font: `800 80px ${SANS}`, col: ACC, text: 'TAKE APART NEXT?', y: 372, d: .2 }, { id: 'e3', font: `500 26px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 428, d: .5 }], T.next - .15, 999);
  // captions
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
