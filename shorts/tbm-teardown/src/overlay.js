// Marks layer: anchored labels, year cards, captions, title and end cards. 1080×1920.
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
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 12;
    g.fillText(it.text, Wd / 2, it.y + (1 - a) * 12); g.shadowBlur = 0;
    const w = g.measureText(it.text).width;
    if (a > .99) texts.push({ id: it.id, text: it.text, x0: Wd / 2 - w / 2, y0: it.y - 70, x1: Wd / 2 + w / 2, y1: it.y + 14 });
    g.textAlign = 'left';
  }
}
const yearCard = (t, id, big, sub, t0, t1) => card(t, [{ id: id + 'a', font: `800 104px ${SANS}`, col: ACC, text: big, y: 300, d: 0 }, { id: id + 'b', font: `500 30px ${MONO}`, col: INK, text: sub, y: 352, d: .2 }], t0, t1);

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, F, CY, R, LIFT, rk, ek, P } = c, V = (x, y, z) => new THREE.Vector3(x, y, z);
  const y0 = CY + LIFT * rk, px = n => F + P[n].dx * ek;   // machine part world x
  card(t, [
    { id: 't1', font: `800 84px ${SANS}`, col: INK, text: 'HOW A TUNNEL', y: 270, d: .1 },
    { id: 't2', font: `800 84px ${SANS}`, col: INK, text: 'BORING MACHINE WORKS', y: 362, d: .2 },
    { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · SCHEMATIC MODEL', y: 418, d: .4 },
  ], 0, T.rise - .1);
  if (t < T.rise) { g.globalAlpha = fade(t, .1, .5) * (1 - fade(t, T.rise - .4, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 160, 80 * eo(seg(t, .1, .7)), 6); }
  label(t, { id: 'tbm', t0: T.tbm + .2, t1: T.rise, a: proj(V(F - 1, CY + .3, .3)), ly: 1180, idx: 'TBM', name: 'Tunnel boring machine', spec: 'deep under the street', side: 'R', lx: 140 });
  label(t, { id: 'dr', t0: T.drill + .1, t1: T.cut - .2, a: proj(V(px('head'), y0 + .5, .3)), ly: 560, idx: 'FRONT', name: 'The drill', spec: '', side: 'L', lx: 940 });
  label(t, { id: 'st', t0: T.site + .1, t1: T.cut - .2, a: proj(V(F + P.gear.dx * ek - 4.2, y0 + .45, .2)), ly: 1150, idx: 'BEHIND', name: 'Moving construction site', spec: 'trailing gear on rails', side: 'R', lx: 120 });
  label(t, { id: 'ch', t0: T.cut + .3, t1: T.discs - .1, a: proj(V(px('head') + .08, y0 + .55, .2)), ly: 560, idx: '01', name: 'Cutterhead', spec: 'a few rpm', side: 'R', lx: 140 });
  label(t, { id: 'dc', t0: T.discs + .2, t1: T.soft - .1, a: proj(V(px('head') + .1, y0 - .4, .25)), ly: 1150, idx: '02', name: 'Disc cutters', spec: 'crush → crack → chip', side: 'R', lx: 140 });
  label(t, { id: 'fc', t0: T.face + .2, t1: T.shield - .1, a: proj(V(px('chamber') - .25, y0 + .2, .3)), ly: 560, idx: '03', name: 'Pressurized face', spec: 'EPB soil or slurry', side: 'R', lx: 140 });
  label(t, { id: 'sh', t0: T.shield2 + .1, t1: T.muck - .1, a: proj(V(px('fshield') - .6, y0 + R - .05, -.1)), ly: 520, idx: '04', name: 'Steel shield', spec: 'holds the bore open', side: 'R', lx: 140 });
  label(t, { id: 'sc', t0: T.screw + .1, t1: T.belt + .1, a: proj(V(px('screw') - 1.4, y0 - .25, -.1)), ly: 1150, idx: '05', name: 'Screw conveyor', spec: 'lifts the muck', side: 'R', lx: 140 });
  label(t, { id: 'bt', t0: T.belt + .3, t1: T.down + .3, a: proj(V(px('gear') - 4.4, y0 + .22, -.1)), ly: 560, idx: '06', name: 'Belt conveyor', spec: 'muck out of the tunnel', side: 'R', lx: 140 });
  label(t, { id: 'er', t0: T.erector + .3, t1: T.push - .1, a: proj(V(F - 2.0, CY + .5, 0)), ly: 560, idx: '07', name: 'Segment erector', spec: '1 ring = curved concrete segments', side: 'R', lx: 120 });
  label(t, { id: 'rm', t0: T.push + .4, t1: T.cycle - .1, a: proj(V(F - 1.9, CY - .6, 0)), ly: 1150, idx: '08', name: 'Thrust rams', spec: 'push off the last ring', side: 'R', lx: 140 });
  if (t > T.steer && t < T.cycle) { const k = fade(t, T.steer, .3) * (1 - fade(t, T.cycle - .3, .3)); g.globalAlpha = k; g.font = `600 30px ${MONO}`; g.textAlign = 'center'; g.fillStyle = 'rgba(14,15,17,.78)'; g.fillRect(Wd / 2 - 290, 1210, 580, 50); g.fillStyle = INK; g.fillText('more push on one side → it curves', Wd / 2, 1245); g.textAlign = 'left'; }
  // cycle card: four steps light up in turn
  if (t > T.cycle - .2 && t < T.sas) { const k = fade(t, T.cycle - .2, .3) * (1 - fade(t, T.sas - .35, .3)); const W4 = ['CUT', 'MUCK', 'RING', 'PUSH']; const ph = Math.floor(((t - T.cycle) / ((T.sas - .4 - T.cycle) / 4)) * 4) % 4;
    g.font = `800 54px ${SANS}`; g.textAlign = 'center'; W4.forEach((w, i) => { g.globalAlpha = k * (i === ph ? 1 : .35); g.fillStyle = i === ph ? ACC : INK; g.fillText(w, Wd / 2 + (i - 1.5) * 250, 300); if (i < 3) { g.globalAlpha = k * .5; g.fillStyle = INK; g.fillText('›', Wd / 2 + (i - 1) * 250, 296); } }); g.textAlign = 'left'; }
  card(t, [{ id: 's1', font: `800 64px ${SANS}`, col: ACC, text: 'SECOND AVE SUBWAY', y: 280, d: 0 }, { id: 's2', font: `500 30px ${MONO}`, col: INK, text: 'TBM "Adi" · 450 ft · 485 tons · ~60 ft/day', y: 334, d: .25 }], T.sas - .1, T.congrats - .1);
  card(t, [{ id: 'e1', font: `800 84px ${SANS}`, col: INK, text: 'CUT · MUCK · RING · PUSH', y: 300, d: .05 }, { id: 'e2', font: `500 26px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 352, d: .4 }], T.card - .2, 99);
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
