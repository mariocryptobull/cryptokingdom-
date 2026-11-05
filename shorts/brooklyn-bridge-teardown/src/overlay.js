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


function gauge(t, a, b, text, t0, t1) {
  const k = eo(seg(t, t0, t0 + .5)), out = 1 - fade(t, t1 - .3, .3); if (k <= 0 || out <= 0) return;
  const [x, y0] = a, [, y1] = b, ye = y0 + (y1 - y0) * k;
  g.globalAlpha = out; g.strokeStyle = ACC; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, ye); g.stroke();
  for (const y of [y0, ye]) { g.beginPath(); g.moveTo(x - 16, y); g.lineTo(x + 16, y); g.stroke(); }
  g.globalAlpha = out * fade(t, t0 + .3, .3); g.fillStyle = ACC; g.font = `800 52px ${SANS}`; g.textAlign = 'left'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 10;
  g.fillText(text, x + 26, (y0 + ye) / 2 + 18); g.shadowBlur = 0;
  const w = g.measureText(text).width; if (k >= 1 && out > .99) texts.push({ id: 'g' + text, text, x0: x + 26, y0: (y0 + ye) / 2 - 36, x1: x + 26 + w, y1: (y0 + ye) / 2 + 26 });
}
function strands(t, t0, t1) {
  const a = fade(t, t0, .4) * (1 - fade(t, t1 - .3, .3)); if (a <= 0) return;
  const cx = Wd / 2, cy = 620, R = 150, r = 30;
  g.globalAlpha = a; g.fillStyle = 'rgba(14,15,17,.82)'; g.beginPath(); g.arc(cx, cy, R + 26, 0, 7); g.fill();
  g.strokeStyle = LINE; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R + 14, 0, 7); g.stroke();
  const P = [[0, 0]]; for (let i = 0; i < 6; i++) P.push([Math.cos(i * Math.PI / 3) * 2 * r, Math.sin(i * Math.PI / 3) * 2 * r]);
  for (let i = 0; i < 12; i++) { const ang = i * Math.PI / 6, d = i % 2 ? 2 * r * Math.sqrt(3) : 4 * r; P.push([Math.cos(ang) * d, Math.sin(ang) * d]); }
  P.forEach(([dx, dy], i) => { const k = fade(t, t0 + .15 + i * .04, .2); if (k <= 0) return; g.globalAlpha = a * k; g.fillStyle = i ? '#d9d6cf' : ACC; g.beginPath(); g.arc(cx + dx, cy + dy, (r - 3) * (.6 + .4 * k), 0, 7); g.fill();
    g.fillStyle = 'rgba(40,40,44,.35)'; for (let j = 0; j < 7; j++) { const aa = j * 0.9; g.beginPath(); g.arc(cx + dx + Math.cos(aa) * 12 * (j ? 1 : 0), cy + dy + Math.sin(aa) * 12 * (j ? 1 : 0), 3, 0, 7); g.fill(); } });
  g.globalAlpha = a; g.textAlign = 'center'; g.fillStyle = INK; g.font = `800 50px ${SANS}`; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 10;
  g.fillText('19 strands', cx, cy + R + 90); g.fillStyle = INK; g.font = `500 30px ${MONO}`; g.fillText('× 278 wires each · one cable', cx, cy + R + 132); g.shadowBlur = 0; g.textAlign = 'left';
  if (a > .99) texts.push({ id: 'st', text: '19 strands', x0: cx - 220, y0: cy + R + 40, x1: cx + 220, y1: cy + R + 142 });
}
const nameCard = (t, id, big, sub, t0, t1) => card(t, [{ id: id + 'a', font: `800 72px ${SANS}`, col: INK, text: big, y: 290, d: 0 }, { id: id + 'b', font: `500 30px ${MONO}`, col: ACC, text: sub, y: 342, d: .2 }], t0, t1);

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, DECK, TX, AX, TOPY, CB, BED, caissonY, cableY } = c, V = (x, y, z) => new THREE.Vector3(x, y, z);
  // title
  card(t, [
    { id: 't1', font: `800 84px ${SANS}`, col: INK, text: 'HOW THE BROOKLYN', y: 270, d: .1 },
    { id: 't2', font: `800 84px ${SANS}`, col: INK, text: 'BRIDGE WAS BUILT', y: 362, d: .2 },
    { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: 'EAST RIVER · NEW YORK · 1870–1883', y: 418, d: .4 },
  ], 0, T.explode - .1);
  if (t < T.explode) { g.globalAlpha = fade(t, .1, .5) * (1 - fade(t, T.explode - .4, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 160, 80 * eo(seg(t, .1, .7)), 6); }
  yearCard(t, 'y70', '1870', 'construction begins', T.explode - .1, T.designer - .1);
  nameCard(t, 'jr', 'JOHN A. ROEBLING', 'designer · died 1869', T.designer - .1, T.son - .1);
  nameCard(t, 'wr', 'WASHINGTON ROEBLING', 'his son · chief engineer', T.son - .1, T.caisson);
  const cy = s => caissonY(s, t);
  label(t, { id: 'cs', t0: T.boxes + .2, t1: T.dug, a: proj(V(TX - .47, cy(1) + .3, .85)), ly: 1200, idx: '01', name: 'Caissons', spec: '168 × 102 ft · open bottom', side: 'L', lx: 520 });
  label(t, { id: 'air', t0: T.air - .1, t1: T.bk44 + .2, a: proj(V(TX, cy(1) + .12, 0)), ly: 1250, idx: 'INSIDE', name: 'Compressed air', spec: 'holds the river back', side: 'L', lx: 520 });
  const gx = s => proj(V(s * TX - s * .62, 0, .86));
  gauge(t, gx(1), proj(V(TX - .62, cy(1), .86)), '44 ft', T.bk44, T.bed + .6);
  gauge(t, gx(-1), proj(V(-TX + .62, cy(-1), .86)), '78 ft', T.mh78, T.bed + .6);
  label(t, { id: 'bd', t0: T.bends + .1, t1: T.bed - .1, a: proj(V(-TX, cy(-1) + .15, .35)), ly: 560, idx: 'CAISSON DISEASE', name: 'The bends', spec: 'pressure sickness · some died' });
  nameCard(t, 'wr2', 'WASHINGTON ROEBLING', 'crippled by the bends · bedridden', T.bed - .1, T.emily - .1);
  nameCard(t, 'er', 'EMILY ROEBLING', 'relayed his orders · ran the job', T.emily - .1, T.towers - .1);
  label(t, { id: 'tw', t0: T.towers + .7, t1: T.shore, a: proj(V(TX, TOPY, -.75)), ly: 470, idx: '02', name: 'Granite towers', spec: '276 ft · two pointed arches', side: 'R', lx: 140 });
  label(t, { id: 'an', t0: T.anch + .6, t1: T.y77 - .1, a: proj(V(AX + .6, DECK + .1, -.85)), ly: 520, idx: '03', name: 'Anchorages', spec: '60,000 tons · chains inside', side: 'R', lx: 140 });
  yearCard(t, 'y77', '1877–78', 'cable spinning', T.y77 - .1, T.four - .1);
  label(t, { id: 'cb', t0: T.four + .1, t1: T.strands, a: proj(V(1.2, cableY(1.2), -.63)), ly: 470, idx: '04', name: 'Main cables', spec: '4 × ~15¾ in · steel wire', side: 'R', lx: 140 });
  strands(t, T.strands - .1, T.susp - .1);
  label(t, { id: 'sp', t0: T.susp + .3, t1: T.stays + .2, a: proj(V(0, (cableY(0) + DECK) / 2 + .05, -.63)), ly: 470, idx: '05', name: 'Suspenders', spec: 'vertical · cable → deck', side: 'R', lx: 140 });
  label(t, { id: 'sy', t0: T.stays + .3, t1: T.deck + .1, a: proj(V(TX - .8, DECK + .7, -.63)), ly: 520, idx: '06', name: 'Diagonal stays', spec: 'fan out from the towers', side: 'R', lx: 140 });
  label(t, { id: 'dk', t0: T.deck + .8, t1: T.open - .1, a: proj(V(1.2, DECK + .1, -.62)), ly: 1200, idx: '07', name: 'Deck', spec: 'trusses · roads · rails · walk', side: 'R', lx: 140 });
  yearCard(t, 'y83', 'MAY 24, 1883', 'opening day · 1,595 ft main span', T.open - .1, T.crowd - .1);
  const ex = AX + .3 - Math.max(0, t - T.first + .4) * .55;
  label(t, { id: 'em', t0: T.first + .2, t1: T.crowd + .2, a: proj(V(ex, DECK + .16, -.37)), ly: 1200, idx: 'FIRST ACROSS', name: 'Emily Roebling', spec: 'May 24, 1883', side: 'R', lx: 140 });
  card(t, [{ id: 'cr1', font: `800 104px ${SANS}`, col: ACC, text: '~150,300', y: 300, d: 0 }, { id: 'cr2', font: `500 30px ${MONO}`, col: INK, text: 'people crossed on day one', y: 352, d: .2 }], T.crowd - .1, T.trains - .1);
  yearCard(t, 'y44', '1883–1944', 'trains ran on the bridge', T.trains - .1, T.y21 - .1);
  yearCard(t, 'y21', '2021', 'protected two-way bike lane', T.y21 - .1, T.congrats - .1);
  label(t, { id: 'bk', t0: T.bike + .3, t1: T.congrats - .2, a: proj(V(2.4, DECK, .565)), ly: 1200, idx: 'TODAY', name: 'Bike lane', spec: 'replaced one car lane', side: 'R', lx: 140 });
  card(t, [{ id: 'e1', font: `800 92px ${SANS}`, col: INK, text: '1883 → TODAY', y: 300, d: .05 }, { id: 'e2', font: `500 26px ${MONO}`, col: DIM, text: 'STILL IN SERVICE · SOURCES IN CAPTION', y: 352, d: .4 }], T.card - .2, 99);
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
