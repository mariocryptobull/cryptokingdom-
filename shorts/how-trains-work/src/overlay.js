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
  const { world } = c;

  // opening title + model tag
  card(t, [
    { id: 'title', font: `800 84px ${SANS}`, col: INK, text: 'HOW TRAINS WORK', y: 300, d: .1 },
    { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · ILLUSTRATIVE MODEL', y: 352, d: .35 },
  ], 0, 5.9);
  if (t < 6.3) { g.globalAlpha = fade(t, .1, .5) * (1 - fade(t, 5.6, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 196, 80 * eo(seg(t, .1, .7)), 6); }

  // 01 catenary
  label(t, { id: 'cat', t0: 7.7, t1: 12.3, a: proj(world('wire', -1.6, 5.3, 0)), ly: 560, idx: '01', name: 'Catenary', spec: '25 kV · 60 Hz' });
  // 02 pantograph (its head follows the spring dip)
  label(t, { id: 'pan', t0: 13.2, t1: 17.7, a: proj(world('panto', c.head.x, c.head.y + .03, .5)), ly: 620, idx: '02', name: 'Pantograph', spec: 'spring-raised' });
  // 03 / 04 transformer + converter
  label(t, { id: 'xf', t0: 19.0, t1: 24.0, a: proj(world('equip', -1.0, 2.55, .3)), ly: 640, idx: '03', name: 'Transformer', spec: 'steps voltage down', side: 'L' });
  label(t, { id: 'cv', t0: 20.6, t1: 24.0, a: proj(world('equip', 1.1, 2.6, .5)), ly: 1150, idx: '04', name: 'Traction converter', spec: 'shapes power for motors', side: 'R', lx: 560 });
  // 05 traction motor
  label(t, { id: 'mot', t0: 24.9, t1: 27.5, a: proj(world('motor', -1.45, c.WY + .2, -.4)), ly: 700, idx: '05', name: 'Traction motor', spec: 'drives the axle via gears' });
  // 06 wheelset
  label(t, { id: 'ws', t0: 29.0, t1: 32.8, a: proj(world('wheel', -3.1 + .2, c.RAIL_TOP + .02, c.CONTACT_Z - .05)), ly: 620, idx: '06', name: 'Wheelset', spec: 'conical tread', side: 'L' });
  // steering: rolling radius at each contact point (outer = +z), drawn while the wheelset is shifted
  if (t > 33.4 && t < 39.6) {
    const ax = -3.1, y0 = c.WY + c.layerY('wheel', t);
    const rO = c.treadR(c.CONTACT_Z - (c.INNER + c.lat)), rI = c.treadR(c.CONTACT_Z - (c.INNER - c.lat));
    const Ao = new THREE.Vector3(ax, y0, c.CONTACT_Z), Bo = new THREE.Vector3(ax, y0 - rO, c.CONTACT_Z);
    const Ai = new THREE.Vector3(ax, y0, -c.CONTACT_Z), Bi = new THREE.Vector3(ax, y0 - rI, -c.CONTACT_Z);
    // camera looks from −x, so +z (outer) is on screen left
    dimension(t, { id: 'rO', t0: 34.6, t1: 39.4, A: Ao, B: Bo, text: 'BIGGER', side: -1 });
    dimension(t, { id: 'rI', t0: 35.3, t1: 39.4, A: Ai, B: Bi, text: 'SMALLER', side: 1 });
    // curve direction arrow above the wheelset
    const k = fade(t, 33.6, .5) * (1 - fade(t, 39.1, .3));
    if (k > 0) {
      const p = proj(new THREE.Vector3(ax, y0 + .62, 0)), q = proj(new THREE.Vector3(ax, y0 + .62, .55));
      g.globalAlpha = k; g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = 4;
      g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
      const an = Math.atan2(q[1] - p[1], q[0] - p[0]);
      g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[0] - 22 * Math.cos(an - .45), q[1] - 22 * Math.sin(an - .45)); g.lineTo(q[0] - 22 * Math.cos(an + .45), q[1] - 22 * Math.sin(an + .45)); g.closePath(); g.fill();
      g.font = `600 30px ${MONO}`; g.textAlign = 'center'; g.fillText('OUTSIDE OF CURVE', (p[0] + q[0]) / 2, p[1] - 30); g.textAlign = 'left';
      if (k > .99) texts.push({ id: 'curve', text: 'OUTSIDE OF CURVE', x0: (p[0] + q[0]) / 2 - 160, y0: p[1] - 62, x1: (p[0] + q[0]) / 2 + 160, y1: p[1] - 20 });
    }
  }
  // regenerative braking
  label(t, { id: 'regen', t0: 40.9, t1: 44.6, a: proj(world('motor', -1.45, c.WY + .25, -.18)), ly: 520, idx: '05', name: 'Motor → generator', spec: 'regenerative braking' });

  // PTC: signal lines, then labels
  if (c.pk > .01) {
    const ant = proj(c.antenna), sat = proj(c.satPos), mast = proj(c.mastTop), comp = proj(c.compPos);
    dashed(sat, ant, c.pk * .9, t); dashed(mast, ant, c.pk * .9, t + .5); dashed(comp, ant, c.pk * .6, t + .25);
    g.globalAlpha = 1;
    label(t, { id: 'gps', t0: 46.6, t1: 57.6, a: sat, ly: Math.max(sat[1] + 130, 470), idx: '07', name: 'GPS', spec: 'where the train is', side: 'L', lx: 440 });
    label(t, { id: 'radio', t0: 48.0, t1: 57.6, a: mast, ly: Math.max(mast[1] + 150, 760), idx: '08', name: 'Radio', spec: 'signals + speed limits', side: 'R', lx: 520 });
    label(t, { id: 'comp', t0: 49.4, t1: 57.6, a: comp, ly: Math.max(comp[1] + 280, 1000), idx: '09', name: 'Onboard computer', spec: 'can brake on its own', side: 'R', lx: 470 });
  }
  // law + deployment cards
  card(t, [
    { id: 'y2008', font: `800 96px ${SANS}`, col: ACC, text: '2008', y: 250, d: 0 },
    { id: 'law', font: `500 30px ${MONO}`, col: INK, text: 'Rail Safety Improvement Act', y: 300, d: .2 },
  ], 53.6, 56.4);
  card(t, [
    { id: 'y2020', font: `800 96px ${SANS}`, col: ACC, text: '2020', y: 250, d: 0 },
    { id: 'live', font: `500 30px ${MONO}`, col: INK, text: 'PTC on every mandated line', y: 300, d: .2 },
  ], 56.4, 60.9);
  // end card
  card(t, [
    { id: 'end1', font: `800 84px ${SANS}`, col: INK, text: 'WIRE · WHEEL · SIGNAL', y: 300, d: .1 },
    { id: 'end2', font: `500 26px ${MONO}`, col: DIM, text: 'ILLUSTRATIVE MODEL · SOURCES IN CAPTION', y: 352, d: .5 },
  ], 61.6, 70);

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
