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
  const { T, G0, DECK, RAIL_Y, PLZ, PZ, layerY } = c, V = (x, y, z) => new THREE.Vector3(x, y, z);
  // title
  card(t, [
    { id: 't1', font: `800 84px ${SANS}`, col: INK, text: 'HOW 46 ST–BLISS ST', y: 270, d: .1 },
    { id: 't2', font: `800 84px ${SANS}`, col: INK, text: 'WAS BUILT', y: 362, d: .2 },
    { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: '7 LINE · SUNNYSIDE, QUEENS · 1917', y: 418, d: .4 },
  ], 0, T.explode - .1);
  if (t < T.explode) { g.globalAlpha = fade(t, .1, .5) * (1 - fade(t, T.explode - .4, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 160, 80 * eo(seg(t, .1, .7)), 6); }
  yearCard(t, 'y13', '1913', 'Dual Contracts → subway to Queens', T.dual - .1, T.beauty - .1);
  label(t, { id: 'arch', t0: T.chose + .1, t1: T.footings - .1, a: proj(V(-1.2, G0 + .9 + layerY('arches', t), PZ + .1)), ly: 560, idx: 'NOT A STEEL EL', name: 'Reinforced concrete arches', spec: '~4,271 ft · 33rd → 48th St', side: 'R', lx: 140 });
  label(t, { id: 'ft', t0: T.footings + .4, t1: T.piers + .1, a: proj(V(-1.8, G0 + .08 + layerY('footings', t), PZ)), ly: 1120, idx: '01', name: 'Footings', spec: 'spread the load into the ground' });
  label(t, { id: 'pr', t0: T.piers + .9, t1: T.arches - .1, a: proj(V(-1.8, G0 + .5 + layerY('piers', t), PZ)), ly: 600, idx: '02', name: 'Concrete piers', spec: 'poured day + night' });
  label(t, { id: 'ar', t0: T.arches + .7, t1: T.girders, a: proj(V(.0, DECK - .1, PZ + .08)), ly: 560, idx: '03', name: 'Arches', spec: 'tie the piers together' });
  label(t, { id: 'gd', t0: T.girders + .5, t1: T.tracks + .1, a: proj(V(1.2, DECK + .05 + layerY('girders', t), .66)), ly: 520, idx: '04', name: 'Steel girders', spec: 'carry the deck' });
  label(t, { id: 'tk', t0: T.tracks + .7, t1: T.station, a: proj(V(.6, RAIL_Y + layerY('tracks', t), 0)), ly: 480, idx: '05', name: '3 tracks', spec: 'local · express · local' });
  label(t, { id: 'pl', t0: T.platforms + .7, t1: T.canopies + .2, a: proj(V(.9, DECK + .24 + layerY('platforms', t), PLZ)), ly: 1150, idx: '06', name: 'Side platforms', spec: 'one per direction' });
  label(t, { id: 'cn', t0: T.canopies + .6, t1: T.house, a: proj(V(-.8, DECK + .66 + layerY('canopies', t), PLZ)), ly: 520, idx: '07', name: 'Canopies', spec: '' });
  label(t, { id: 'hs', t0: T.house + .7, t1: T.open - .1, a: proj(V(0, G0 + .3, .56)), ly: 1150, idx: '08', name: 'Station house', spec: 'built inside the viaduct' });
  yearCard(t, 'y17', 'APRIL 21, 1917', 'opening day', T.open - .1, T.ext - .1);
  label(t, { id: 'ex', t0: T.ext + .8, t1: T.water - .1, a: proj(V(2.4, DECK + .28, PLZ)), ly: 560, idx: '1955–56', name: 'Platforms extended', spec: 'for longer trains' });
  label(t, { id: 'wt', t0: T.water + .3, t1: T.rebuild - .1, a: proj(V(-.6, DECK - .1, .3)), ly: 560, idx: 'DECADES OF WATER', name: 'Concrete crumbles', spec: 'drainage failed through the track bed', side: 'R', lx: 140 });
  yearCard(t, 'y93', '1993–97', '~40,000 tons of concrete replaced', T.rebuild - .1, T.glass + .2);
  label(t, { id: 'gl', t0: T.glass + .4, t1: T.cbtc - .1, a: proj(V(-.35, DECK + .38, PLZ + .18)), ly: 560, idx: 'ART', name: 'Stained glass', spec: '"Q Is For Queens" · Yumi Heo' });
  yearCard(t, 'y18', '2018', 'CBTC computer signals', T.cbtc - .1, T.now - .1);
  label(t, { id: 'tp', t0: T.temp + .6, t1: T.congrats - .2, a: proj(V(.4, DECK + .28, PLZ + .32)), ly: 1150, idx: 'NOW · TO 2027', name: 'Temporary platforms', spec: 'while the station is rebuilt' });
  label(t, { id: 'el', t0: T.elev + .9, t1: T.congrats - .2, a: proj(V(2.15, DECK + .1, -PLZ)), ly: 470, idx: 'ADA', name: '2 new elevators', spec: '+ new stairs + station house', side: 'L', lx: 940 });
  card(t, [{ id: 'e1', font: `800 92px ${SANS}`, col: INK, text: '1917 → TODAY', y: 300, d: .05 }, { id: 'e2', font: `500 26px ${MONO}`, col: DIM, text: 'STILL IN SERVICE · SOURCES IN CAPTION', y: 352, d: .4 }], T.card - .2, 99);
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
const PLW = () => .18;
