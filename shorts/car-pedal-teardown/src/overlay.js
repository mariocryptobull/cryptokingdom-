// Marks layer: anchored labels, live-number readout, section chips, captions, title and end cards. 1080×1920.
import * as THREE from 'three';
import { seg, ss, eo, lerp } from '/core/lib.js';

const cv = document.getElementById('ov'), g = cv.getContext('2d');
const MONO = '"JBMono", monospace', SANS = '"Inter", sans-serif';
const INK = '#f1efe9', DIM = 'rgba(241,239,233,.66)', ACC = '#ff8a2a', CYAN = '#59d4ff', LINE = 'rgba(241,239,233,.78)';
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
  const { t0, t1, a, ly, idx, name, spec, id } = o, acc = o.acc || ACC;
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
  if (idx) { g.fillStyle = acc; g.font = `500 24px ${MONO}`; g.fillText(idx, lx + dx, ly - 40); }
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

// section chip at the top: which pedal we are following
function chip(t, t0, t1, text, col) {
  const a = fade(t, t0, .35) * (1 - fade(t, t1 - .35, .35)); if (a <= 0) return;
  g.globalAlpha = a; g.font = `600 30px ${MONO}`; const w = g.measureText(text).width + 56, x = Wd / 2 - w / 2, y = 150;
  g.fillStyle = 'rgba(14,15,17,.72)'; g.beginPath(); g.roundRect(x, y, w, 58, 29); g.fill();
  g.strokeStyle = col; g.lineWidth = 2; g.stroke();
  g.fillStyle = col; g.beginPath(); g.arc(x + 26, y + 29, 7, 0, 7); g.fill();
  g.fillStyle = INK; g.textAlign = 'left'; g.fillText(text, x + 42, y + 40);
  if (a > .99) texts.push({ id: 'chip' + t0.toFixed(1), text, x0: x, y0: y, x1: x + w, y1: y + 58 });
}

// live-number readout at the bottom: small heading, big counting number, formula line
const fmt = n => Math.round(n).toLocaleString('en-US');
function readout(t, o) {
  const { t0, t1, head, big, sub, col, id } = o;
  const a = fade(t, t0, .3) * (1 - fade(t, t1 - .3, .3)); if (a <= 0) return;
  const k = eo(seg(t, t0 + .1, t0 + 1.1));
  const y = 1590;
  g.globalAlpha = a; g.fillStyle = 'rgba(14,15,17,.7)'; g.beginPath(); g.roundRect(110, y - 70, 860, 250, 22); g.fill();
  g.fillStyle = col; g.fillRect(110, y - 70, 8, 250);
  g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 10;
  g.fillStyle = DIM; g.font = `500 28px ${MONO}`; g.fillText(head, Wd / 2, y - 20);
  const B = big(k); g.fillStyle = col; g.font = `800 96px ${SANS}`; g.fillText(B, Wd / 2, y + 78);
  g.fillStyle = INK; g.font = `400 27px ${MONO}`; g.fillText(sub, Wd / 2, y + 140);
  g.shadowBlur = 0; g.textAlign = 'left';
  if (a > .99 && k > .99) texts.push({ id, text: head + ' ' + B + ' ' + sub, x0: 110, y0: y - 70, x1: 970, y1: y + 180 });
}

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, V, wheels, calWorld, XE, CYLX, CRK, ZG, ZB, PEDX, XD, YD } = c;
  // title
  card(t, [
    { id: 't1', font: `800 92px ${SANS}`, col: INK, text: 'HOW A PEDAL', y: 300, d: .1 },
    { id: 't2', font: `800 92px ${SANS}`, col: INK, text: 'MOVES A CAR', y: 400, d: .2 },
    { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · SCHEMATIC MODEL', y: 458, d: .4 },
  ], -.7, T.gas - .2);
  if (t < T.gas) { g.globalAlpha = fade(t, -.6, .5) * (1 - fade(t, T.gas - .5, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 190, 80 * eo(seg(t, -.6, 0)), 6); }
  chip(t, T.gas - .1, T.gasEnd + .3, 'GAS PEDAL → ROAD', ACC);
  chip(t, T.brake - .1, T.next - .2, 'BRAKE PEDAL → ROTORS', CYAN);
  // gas labels
  label(t, { id: 'app', t0: T.sensors + .1, t1: T.ecu + .3, a: proj(V(PEDX, .82, ZG + .055)), ly: 1150, idx: '01', name: 'Pedal sensors', spec: '2 redundant, no cable', side: 'R', lx: 140 });
  label(t, { id: 'ecu', t0: T.ecu + .3, t1: T.throttle + .1, a: proj(V(.85, 1.11, .64)), ly: 560, idx: '02', name: 'Engine computer', spec: 'ECU: pedal → throttle', side: 'R', lx: 140 });
  label(t, { id: 'tb', t0: T.throttle + .4, t1: T.fuel, a: proj(V(XE + .47, .86, .39)), ly: 560, idx: '03', name: 'Electronic throttle', spec: 'motor-driven air valve', side: 'R', lx: 140 });
  label(t, { id: 'inj', t0: T.fuel + .1, t1: T.spark, a: proj(V(CYLX[2], .9, .17)), ly: 560, idx: '04', name: 'Fuel injectors', spec: 'air : fuel ≈ 14.7 : 1 (mass)', side: 'R', lx: 140 });
  label(t, { id: 'pis', t0: T.shove, t1: T.crank, a: proj(V(CYLX[0], .66, .07)), ly: 1150, idx: '05', name: 'Pistons', spec: 'spark → push down', side: 'R', lx: 140 });
  label(t, { id: 'crk', t0: T.crank + .1, t1: T.gear, a: proj(V(XE + .2, CRK, .05)), ly: 1150, idx: '06', name: 'Crankshaft', spec: 'push → spin', side: 'R', lx: 140 });
  label(t, { id: 'gb', t0: T.gear + .1, t1: T.drive, a: proj(V(.1, CRK + .1, .1)), ly: 560, idx: '07', name: 'Gearbox', spec: '1st gear ≈ 4 : 1', side: 'R', lx: 140 });
  label(t, { id: 'df', t0: T.mult + .3, t1: T.drive + .6, a: proj(V(XD, YD + .15, .05)), ly: 1150, idx: '08', name: 'Differential', spec: 'final drive ≈ 3.5 : 1', side: 'R', lx: 140 });
  label(t, { id: 'ds', t0: T.drive + .6, t1: T.patch + .2, a: proj(V(-.8, .39, .03)), ly: 560, idx: '09', name: 'Driveshaft + axles', spec: 'carry the twist back', side: 'R', lx: 140 });
  label(t, { id: 'cp', t0: T.patch + .9, t1: T.forward + .4, a: proj(V(XD, .02, 1.12)), ly: 560, idx: '10', name: 'Contact patch', spec: '≈ hand-sized, × 4', side: 'R', lx: 140 });
  // brake labels
  label(t, { id: 'bp', t0: T.lever + .1, t1: T.booster, a: proj(V(PEDX + .02, .4, ZB + .06)), ly: 1150, idx: '11', name: 'Pedal lever', spec: '≈ 4 : 1 ratio', side: 'R', lx: 140, acc: CYAN });
  label(t, { id: 'vb', t0: T.booster + .1, t1: T.mc, a: proj(V(.62, .87, ZB)), ly: 560, idx: '12', name: 'Vacuum booster', spec: 'engine suction assist', side: 'R', lx: 140, acc: CYAN });
  label(t, { id: 'mc', t0: T.mc + .2, t1: T.pascal, a: proj(V(.82, .75, ZB + .05)), ly: 560, idx: '13', name: 'Master cylinder', spec: '1 in bore = 0.785 in²', side: 'R', lx: 140, acc: CYAN });
  label(t, { id: 'cal', t0: T.caliper + .3, t1: T.squeeze, a: proj(calWorld(wheels[0], 1).add(V(0, .07, .02))), ly: 560, idx: '14', name: 'Caliper piston', spec: '2.5 in = 4.9 in² (≈ 6×)', side: 'R', lx: 140, acc: CYAN });
  label(t, { id: 'rot', t0: T.squeeze + .1, t1: T.next, a: proj(V(wheels[0].x + .15, .3, calWorld(wheels[0], 1).z)), ly: 560, idx: '15', name: 'Pads + rotor', spec: 'motion → heat', side: 'R', lx: 140, acc: CYAN });
  // live numbers
  readout(t, { id: 'r1', t0: T.afr - .1, t1: T.gear - .1, col: ACC, head: 'AIR : FUEL (BY MASS)', big: k => (14.7 * k).toFixed(1) + ' : 1', sub: 'stoichiometric for gasoline' });
  readout(t, { id: 'r2', t0: T.mult - .1, t1: T.drive + 1.0, col: ACC, head: 'TORQUE AT THE WHEELS', big: k => '× ' + Math.round(lerp(1, 14, k)), sub: '1st gear ≈ 4 : 1  ×  final drive ≈ 3.5 : 1' });
  readout(t, { id: 'r3', t0: T.lb100 - .1, t1: T.booster + .2, col: CYAN, head: 'FORCE', big: k => fmt(lerp(100, 400, eo(seg(k, .35, 1)))) + ' lb', sub: '100 lb foot  ×  4 (pedal lever)' });
  readout(t, { id: 'r4', t0: T.dbl - .2, t1: T.fluid - .3, col: CYAN, head: 'FORCE ON THE PUSHROD', big: k => fmt(lerp(400, 800, k)) + ' lb', sub: '400 lb  ×  ≈ 2 (vacuum booster)' });
  readout(t, { id: 'r5', t0: T.fluid - .2, t1: T.every + .4, col: CYAN, head: 'BRAKE-FLUID PRESSURE', big: k => '≈ ' + fmt(lerp(0, 1000, k)) + ' psi', sub: '800 lb  ÷  0.785 in²  =  1,019 psi' });
  readout(t, { id: 'r6', t0: T.caliper - .2, t1: T.next - .2, col: CYAN, head: 'CLAMPING FORCE, PER CALIPER', big: k => '≈ ' + fmt(lerp(0, 5000, k)) + ' lb', sub: '1,000 psi  ×  4.9 in²  (before losses)' });
  // closer beats
  card(t, [{ id: 'n1', font: `800 84px ${SANS}`, col: INK, text: 'WHAT SHOULD WE', y: 300, d: 0 }, { id: 'n2', font: `800 84px ${SANS}`, col: ACC, text: 'TAKE APART NEXT?', y: 395, d: .12 }, { id: 'n3', font: `500 28px ${MONO}`, col: DIM, text: 'TELL US IN THE COMMENTS', y: 450, d: .3 }], T.next - .1, T.congrats - .05);
  card(t, [{ id: 'e0', font: `800 96px ${SANS}`, col: ACC, text: 'CONGRATS!', y: 280, d: 0 }, { id: 'e1', font: `700 52px ${SANS}`, col: INK, text: "You've discovered how", y: 360, d: .15 }, { id: 'e2', font: `700 52px ${SANS}`, col: INK, text: 'a pedal moves a car.', y: 425, d: .25 }, { id: 'e3', font: `500 26px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 485, d: .5 }], T.congrats - .05, 99);
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
