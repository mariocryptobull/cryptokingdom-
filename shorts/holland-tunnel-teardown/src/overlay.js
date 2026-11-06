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
  const { T, CY, R, LIFT, ZL, rk, ek, BLD, YF, YE, YRD, YC, WY, GL } = c, V = (x, y, z) => new THREE.Vector3(x, y, z);
  const ty = LIFT * rk, tz = ZL * rk;
  { const gr = g.createLinearGradient(0, 0, 0, 560); gr.addColorStop(0, 'rgba(8,9,11,.62)'); gr.addColorStop(.7, 'rgba(8,9,11,.3)'); gr.addColorStop(1, 'rgba(8,9,11,0)'); g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(0, 0, Wd, 560); }
  card(t, [
    { id: 't1', font: `800 92px ${SANS}`, col: INK, text: 'HOW THE HOLLAND', y: 270, d: .1 },
    { id: 't2', font: `800 92px ${SANS}`, col: INK, text: 'TUNNEL BREATHES', y: 368, d: .2 },
    { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · SCHEMATIC MODEL', y: 424, d: .4 },
  ], 0, T.open - .1);
  if (t < T.open) { g.globalAlpha = fade(t, .1, .5) * (1 - fade(t, T.open - .4, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 160, 80 * eo(seg(t, .1, .7)), 6); }
  yearCard(t, 'y', '1927', 'HUDSON RIVER · NEW JERSEY ⇄ MANHATTAN', T.open - .1, T.co - .1);
  label(t, { id: 'nj', t0: T.hudson + .1, t1: T.co - .2, a: proj(V(-4.3, GL + .1, -.4)), ly: 1150, idx: 'WEST', name: 'New Jersey', spec: '', side: 'R', lx: 90 });
  label(t, { id: 'mh', t0: T.hudson + .3, t1: T.co - .2, a: proj(V(4.3, GL + .1, -.4)), ly: 1150, idx: 'EAST', name: 'Manhattan', spec: '', side: 'L', lx: 990 });
  label(t, { id: 'tb', t0: T.mile + .1, t1: T.co - .2, a: proj(V(.3, CY + .2, -.4)), ly: 1300, idx: '1927', name: 'The tube', spec: '8,558 ft · over 1.5 miles', side: 'R', lx: 330 });
  card(t, [{ id: 'c1', font: `800 120px ${SANS}`, col: '#ff4a3a', text: 'CO', y: 300, d: 0 }, { id: 'c2', font: `600 34px ${MONO}`, col: INK, text: 'CARBON MONOXIDE', y: 356, d: .15 },
    { id: 'c3', font: `500 30px ${MONO}`, col: DIM, text: '> 4 PARTS IN 10,000 = DANGER', y: 404, d: .2 }], T.co - .05, T.holland - .1);
  card(t, [{ id: 'h1', font: `800 60px ${SANS}`, col: INK, text: 'CLIFFORD HOLLAND', y: 250, d: 0 }, { id: 'h2', font: `500 28px ${MONO}`, col: DIM, text: 'CHIEF ENGINEER · DIED 1924', y: 296, d: .15 }], T.holland - .05, T.answer - .1);
  card(t, [{ id: 's1', font: `800 60px ${SANS}`, col: ACC, text: 'OLE SINGSTAD', y: 390, d: 0 }, { id: 's2', font: `500 28px ${MONO}`, col: DIM, text: 'DESIGNED THE VENTILATION', y: 436, d: .15 }], T.singstad - .05, T.answer - .1);
  // exploded layers
  const xL = 3.6;
  label(t, { id: 'l1', t0: T.split + .5, t1: T.down + .2, a: proj(V(xL, CY + .66 + ty + .5 * ek, -.4 + tz)), ly: 560, idx: '01 · TOP', name: 'Exhaust duct', spec: 'above the ceiling', side: 'R', lx: 90 });
  label(t, { id: 'l2', t0: T.split + .75, t1: T.down + .2, a: proj(V(xL - .3, YRD + .15 + ty, -.3 + tz)), ly: 1130, idx: '02', name: 'Roadway', spec: 'traffic', side: 'R', lx: 90 });
  label(t, { id: 'l3', t0: T.split + 1.0, t1: T.down + .2, a: proj(V(xL - .6, YF + ty - .5 * ek, -.35 + tz)), ly: 1300, idx: '03 · BOTTOM', name: 'Fresh-air duct', spec: 'under the road', side: 'L', lx: 990 });
  // fresh / exhaust path
  label(t, { id: 'fd', t0: T.duct + .1, t1: T.slots - .1, a: proj(V(3.2, YF, -.4)), ly: 1130, idx: 'IN', name: 'Fresh-air duct', spec: 'blown in by fans', side: 'R', lx: 90 });
  label(t, { id: 'cs', t0: T.slots + .1, t1: T.dirty - .1, a: proj(V(3.3, YRD + .05, -.6)), ly: 1130, idx: 'IN', name: 'Curb slots', spec: 'fresh air rises', side: 'R', lx: 90 });
  label(t, { id: 'cv', t0: T.vents + .1, t1: T.exh - .1, a: proj(V(3.3, YC, -.42)), ly: 560, idx: 'OUT', name: 'Ceiling vents', spec: 'dirty air pulled up', side: 'R', lx: 90 });
  label(t, { id: 'ed', t0: T.exh + .1, t1: T.bld - .1, a: proj(V(3.4, YE, -.4)), ly: 560, idx: 'OUT', name: 'Exhaust duct', spec: '→ ventilation building', side: 'R', lx: 90 });
  const bR = BLD[2], bL = BLD[3];
  label(t, { id: 'rb', t0: T.river + .1, t1: T.fans - .2, a: proj(V(bR.x, WY + .8, -.3)), ly: 1150, idx: 'IN THE RIVER', name: 'Ventilation building', spec: '2 in the Hudson', side: 'R', lx: 90 });
  label(t, { id: 'lb', t0: T.bld + .2, t1: T.fans - .2, a: proj(V(bL.x, GL + 1.0, -.3)), ly: 560, idx: 'ON LAND', name: 'Ventilation building', spec: '2 on shore', side: 'L', lx: 990 });
  card(t, [{ id: 'f1', font: `800 104px ${SANS}`, col: ACC, text: '84 FANS', y: 300, d: 0 }, { id: 'f2', font: `500 32px ${MONO}`, col: INK, text: '42 BLOW IN · 42 PULL OUT', y: 354, d: .2 }], T.fans - .1, T.together - .1);
  card(t, [{ id: 'n1', font: `800 92px ${SANS}`, col: ACC, text: 'EVERY 90 SECONDS', y: 300, d: 0 }, { id: 'n2', font: `500 30px ${MONO}`, col: INK, text: 'ALL THE AIR, REPLACED · FULL SPEED', y: 354, d: .2 }], T.ninety - .2, T.first - .1);
  card(t, [{ id: 'w1', font: `800 76px ${SANS}`, col: INK, text: 'WORLD FIRST', y: 270, d: 0 }, { id: 'w2', font: `500 28px ${MONO}`, col: DIM, text: 'MECHANICALLY VENTILATED TUNNEL', y: 318, d: .15 },
    { id: 'w3', font: `700 34px ${SANS}`, col: ACC, text: 'NATIONAL HISTORIC LANDMARK · 1993', y: 392, d: .1 + (T.nhl - T.first) }], T.first - .05, T.next - .1);
  card(t, [{ id: 'q1', font: `800 84px ${SANS}`, col: INK, text: 'WHAT SHOULD WE', y: 290, d: 0 }, { id: 'q2', font: `800 84px ${SANS}`, col: ACC, text: 'TAKE APART NEXT?', y: 386, d: .1 }, { id: 'q3', font: `500 28px ${MONO}`, col: DIM, text: 'TELL US IN THE COMMENTS', y: 440, d: .3 }], T.next - .1, T.congrats - .1);
  card(t, [{ id: 'e1', font: `800 64px ${SANS}`, col: INK, text: 'FRESH IN BELOW', y: 270, d: .05 }, { id: 'e2', font: `800 64px ${SANS}`, col: ACC, text: 'EXHAUST OUT ABOVE', y: 348, d: .2 }, { id: 'e3', font: `500 26px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 400, d: .4 }], T.card - .2, 99);
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
