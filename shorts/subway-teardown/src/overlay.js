// Marks layer: anchored labels, measured callouts on the wheelset, captions, title and end cards. 1080×1920.
import * as THREE from 'three';
import { clamp, seg, ss, eo } from '/core/lib.js';

const cv = document.getElementById('ov'), g = cv.getContext('2d');
const MONO = '"JBMono", monospace', SANS = '"Inter", sans-serif';
const INK = '#f1efe9', DIM = 'rgba(241,239,233,.66)', ACC = '#ff6b3d', LINE = 'rgba(241,239,233,.78)';
const CAP = { font: `800 54px ${SANS}`, y: 1430, max: 960 };

let CUES = [], texts = [];
export async function initOverlay({ VO, VDUR, TL }) {
  // caption chunks: each line's chunks share its spoken length in proportion to their letters
  for (let li = 0; li < TL.vo.length; li++) {
    const v = TL.vo[li], d = VDUR[v.id], next = TL.vo[li + 1] ? TL.vo[li + 1].t : TL.dur;
    const n = v.chunks.map(c => c.replace(/[^A-Za-z0-9]/g, '').length + 2), tot = n.reduce((a, b) => a + b, 0);
    let t = v.t;
    v.chunks.forEach((c, i) => {
      const dt = d * n[i] / tot, last = i === v.chunks.length - 1;
      CUES.push({ t0: t - .04, t1: last ? Math.min(t + dt + .45, next - .06) : t + dt - .02, text: c });
      t += dt;
    });
  }
  window.CUES = CUES;
}
export const overlayTexts = () => texts;

const v3 = new THREE.Vector3();
let CAM, Wd, Hd;
const proj = v => { v3.copy(v).project(CAM); return [(v3.x + 1) / 2 * Wd, (1 - v3.y) / 2 * Hd, v3.z]; };
const fade = (t, a, d = .3) => ss(seg(t, a, a + d));

// label: anchor dot + elbow leader + two-digit index / name / spec. side 'L' = text column on the left, right-aligned at lx
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
  if (tx > .99 && out > .99) {
    const x0 = side === 'L' ? lx - w : lx, x1 = side === 'L' ? lx : lx + w;
    texts.push({ id, text: name + (spec ? ' ' + spec : ''), x0: Math.max(0, x0), y0: ly - 64, x1: Math.min(Wd, x1), y1: ly + 50 });
  }
}

// dimension line between two projected points, with a text plate
function dimension(t, o) {
  const { t0, t1, A, B, text, id, side = 1 } = o;
  const k = eo(seg(t, t0, t0 + .55)), out = 1 - fade(t, t1 - .3, .3);
  if (k <= 0 || out <= 0) return;
  const a = proj(A), b = proj(B), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  g.globalAlpha = out; g.strokeStyle = ACC; g.lineWidth = 3;
  g.beginPath(); g.moveTo(mx + (a[0] - mx) * k, my + (a[1] - my) * k); g.lineTo(mx + (b[0] - mx) * k, my + (b[1] - my) * k); g.stroke();
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  for (const p of [a, b]) { g.save(); g.translate(p[0], p[1]); g.rotate(ang - Math.PI / 4); g.beginPath(); g.moveTo(-10 * k, 0); g.lineTo(10 * k, 0); g.stroke(); g.restore(); }
  const tA = fade(t, t0 + .35, .3); if (tA <= 0) return;
  g.globalAlpha = out * tA; g.textAlign = 'center'; g.font = `600 30px ${MONO}`;
  const w = g.measureText(text).width, x = mx + side * (w / 2 + 34), y = my;
  g.fillStyle = 'rgba(14,15,17,.78)'; g.fillRect(x - w / 2 - 12, y - 30, w + 24, 44);
  g.fillStyle = INK; g.fillText(text, x, y + 3); g.textAlign = 'left';
  if (tA > .99 && out > .99) texts.push({ id, text, x0: x - w / 2 - 12, y0: y - 30, x1: x + w / 2 + 12, y1: y + 14 });
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

function dashed(a, b, alpha, phase) {
  g.globalAlpha = alpha; g.strokeStyle = 'rgba(255,210,191,.85)'; g.lineWidth = 2.5; g.setLineDash([12, 14]); g.lineDashOffset = -phase * 60;
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.setLineDash([]);
}

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, plateY, BASE } = c, V = (x, y, z) => new THREE.Vector3(x, y, z);
  card(t, [
    { id: 't1', font: `800 84px ${SANS}`, col: INK, text: "HOW NYC'S SUBWAY", y: 270, d: .1 },
    { id: 't2', font: `800 84px ${SANS}`, col: INK, text: 'BECAME ONE', y: 362, d: .2 },
    { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · SCHEMATIC MODEL', y: 418, d: .4 },
  ], 0, 5.0);
  if (t < 5.3) { g.globalAlpha = fade(t, .1, .5) * (1 - fade(t, 4.8, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 160, 80 * eo(seg(t, .1, .7)), 6); }
  label(t, { id: 'irt', t0: T.irt + .5, t1: T.bmt - .2, a: proj(V(.2, plateY('irt', t) + .03, -.8)), ly: 520, idx: '1904', name: 'IRT', spec: 'city-built · privately run' });
  label(t, { id: 'bmt', t0: T.bmt + .5, t1: T.ind - .2, a: proj(V(1.6, plateY('bmt', t) + .03, -.9)), ly: 470, idx: '', name: 'BMT', spec: 'private · Brooklyn + Queens', side: 'L' });
  label(t, { id: 'ind', t0: T.ind + .4, t1: T.fares - .2, a: proj(V(2.0, plateY('ind', t) + .03, -.52)), ly: 420, idx: '1932', name: 'IND', spec: 'city-owned competitor' });
  label(t, { id: 'dup', t0: T.dup + .2, t1: T.noConn + .3, a: proj(V(-.04, plateY('ind', t) + .03, -.6)), ly: 560, name: 'Duplicate routes', spec: 'IRT + IND, same avenue', side: 'R', lx: 600 });
  label(t, { id: 'gap', t0: T.noConn + .2, t1: T.nickel - .1, a: proj(V(.6, (plateY('irt', t) + plateY('bmt', t)) / 2, .92)), ly: 1180, name: 'No connection', spec: 'separate plates, separate fares', side: 'R', lx: 560 });
  if (t > T.nickel && t < T.unify) { const k = fade(t, T.nickel + .3, .3) * (1 - fade(t, T.unify - .4, .3));
    [['irt', .35, -1.4], ['bmt', 1.95, 1.75], ['ind', 2.4, -.9]].forEach(([pk, x, z]) => { const p = proj(V(x, plateY(pk, t) + .7, z)); g.globalAlpha = k; g.font = `700 40px ${MONO}`; g.textAlign = 'center'; g.fillStyle = 'rgba(14,15,17,.75)'; g.fillRect(p[0] - 44, p[1] - 36, 88, 48); g.fillStyle = INK; g.fillText('5¢', p[0], p[1]); g.textAlign = 'left'; }); }
  card(t, [{ id: 'y1940', font: `800 104px ${SANS}`, col: ACC, text: '1940', y: 300, d: 0 }, { id: 'one', font: `500 30px ${MONO}`, col: INK, text: 'three systems → one', y: 352, d: .2 }], T.unify + .2, T.transfers - .1);
  label(t, { id: 'xf', t0: T.transfers + .3, t1: T.mta - .1, a: proj(V(.12, BASE + .12, .72)), ly: 520, idx: '1948', name: 'Free transfers', spec: '' });
  card(t, [{ id: 'y1968', font: `800 104px ${SANS}`, col: ACC, text: '1968', y: 300, d: 0 }, { id: 'mta', font: `500 30px ${MONO}`, col: INK, text: 'the MTA takes over', y: 352, d: .2 }], T.mta - .1, T.ibx - .2);
  label(t, { id: 'ibx', t0: T.ibxPlate + 1.2, t1: T.review - .2, a: proj(V(1.9, c.ibxY + .05, .5)), ly: 1170, idx: 'PLANNED', name: 'Interborough Express', spec: '~14 mi light rail · 18 stations', side: 'R', lx: 470 });
  card(t, [{ id: 'st1', font: `800 64px ${SANS}`, col: INK, text: 'IN DESIGN + REVIEW', y: 300, d: 0 }, { id: 'st2', font: `500 30px ${MONO}`, col: DIM, text: 'no opening date yet', y: 352, d: .2 }], T.review - .1, T.congrats - .1);
  card(t, [{ id: 'e1', font: `800 92px ${SANS}`, col: INK, text: '120+ YEARS', y: 300, d: .05 }, { id: 'e2', font: `500 26px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 352, d: .4 }], T.card - .2, 99);
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
