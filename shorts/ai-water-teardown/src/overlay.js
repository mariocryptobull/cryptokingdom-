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


const BLUE = '#59b4ff';
function bars(t, t0, t1, title, sub, rows) {
  const a = fade(t, t0, .4) * (1 - fade(t, t1 - .35, .35)); if (a <= 0) return;
  g.globalAlpha = a; g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 12;
  g.textAlign = 'center'; g.font = `800 58px ${SANS}`; g.fillStyle = INK; g.fillText(title, Wd / 2, 250);
  g.font = `500 26px ${MONO}`; g.fillStyle = DIM; g.fillText(sub, Wd / 2, 296);
  const X0 = 150, BW = 600;
  rows.forEach((r, i) => {
    const y = 360 + i * 92, k = eo(seg(t, r.t, r.t + .7)); if (k <= 0) return;
    g.globalAlpha = a * Math.min(1, k * 3);
    g.textAlign = 'left'; g.font = `600 28px ${MONO}`; g.fillStyle = INK; g.fillText(r.name, X0, y);
    g.shadowBlur = 0; g.fillStyle = 'rgba(241,239,233,.12)'; g.fillRect(X0, y + 14, BW, 30);
    g.fillStyle = r.col; g.fillRect(X0, y + 14, BW * r.val * k, 30);
    g.shadowBlur = 12; g.font = `800 42px ${SANS}`; g.fillStyle = INK; g.textAlign = 'left'; g.fillText(r.txt, X0 + Math.max(BW * r.val * k, 0) + 18, y + 41);
    if (a > .99 && k > .99) texts.push({ id: 'bar' + r.name, text: r.name, x0: X0, y0: y - 30, x1: X0 + BW + 200, y1: y + 50 });
  });
  g.shadowBlur = 0; g.textAlign = 'left';
}
function drop(x, y, s, col) { g.beginPath(); g.moveTo(x, y - s * 1.6); g.bezierCurveTo(x + s * .2, y - s * 1.0, x + s, y - s * .5, x + s, y + s * .15); g.arc(x, y + s * .15, s, 0, Math.PI); g.bezierCurveTo(x - s, y - s * .5, x - s * .2, y - s * 1.0, x, y - s * 1.6); g.fillStyle = col; g.fill(); }
function check(x, y, k) { g.strokeStyle = ACC; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 12 * Math.min(1, k * 2), y + 12 * Math.min(1, k * 2)); if (k > .5) g.lineTo(x + 12 + 22 * (k - .5) * 2, y + 12 - 30 * (k - .5) * 2); g.stroke(); }

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, hero, trays, TOW, CH, PP, roofY, FL, NT } = c, V = (x, y, z) => new THREE.Vector3(x, y, z);
  // hook
  card(t, [
    { id: 'h1', font: `800 96px ${SANS}`, col: INK, text: 'IS AI DRINKING', y: 280, d: .05 },
    { id: 'h2', font: `800 96px ${SANS}`, col: ACC, text: 'THE PLANET DRY?', y: 384, d: .2 },
    { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · SCHEMATIC MODEL', y: 444, d: .45 },
  ], 0, T.dc + 1.2);
  if (t < T.dc + 1.2) { g.globalAlpha = fade(t, .1, .5) * (1 - fade(t, T.dc + .8, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 170, 80 * eo(seg(t, .1, .7)), 6); }
  // world anchors
  const hp = hero.position, hs = hero.scale.x;
  const trayW = (k, lx, ly, lz) => { const p = trays[k].g.position; return V(hp.x + (p.x + lx) * hs, hp.y + (p.y + ly) * hs, hp.z + (p.z + lz) * hs); };
  label(t, { id: 'dc', t0: T.dc + .9, t1: T.racks - .1, a: proj(V(-1.6, roofY + .15, .9)), ly: 1160, idx: 'SITE', name: 'AI data center', spec: 'front wall cut away', side: 'R', lx: 140 });
  label(t, { id: 'in', t0: T.drink, t1: T.racks + .2, a: proj(V(4.55, FL + .35, 1.55)), ly: 600, idx: 'IN', name: 'Water intake', spec: 'from the river', side: 'L', lx: 940 });
  label(t, { id: 'rk', t0: T.racks + 1.4, t1: T.air + .2, a: proj(V(hp.x + .25 * hs, hp.y + .9 * hs, hp.z + .3 * hs)), ly: 1160, idx: '01', name: 'GPU rack', spec: '~120 kW per rack', side: 'R', lx: 140 });
  label(t, { id: 'air', t0: T.air + .5, t1: T.plates - .1, a: proj(trayW(NT - 1, 0, .1, 0)), ly: 1160, idx: '02', name: 'Air alone', spec: "can't carry this much heat", side: 'R', lx: 140 });
  label(t, { id: 'cp', t0: T.plates + .3, t1: T.chiller - .4, a: proj(trayW(NT - 1, .11, .05 + .14, .12)), ly: 1160, idx: '03', name: 'Cold plates', spec: 'direct-to-chip', side: 'R', lx: 140 });
  label(t, { id: 'cl', t0: T.flow + .1, t1: T.chiller - .4, a: proj(trayW(NT - 1, -.2, .05, -.1)), ly: 600, idx: '04', name: 'Coolant loop', spec: 'in cold · out hot', side: 'R', lx: 140 });
  label(t, { id: 'ch', t0: T.chiller2 - .1, t1: T.towers - .1, a: proj(V((CH.x0 + CH.x1) / 2, CH.y1, (CH.z0 + CH.z1) / 2)), ly: 1160, idx: '05', name: 'Chiller', spec: 'hands heat to a 2nd loop', side: 'R', lx: 140 });
  label(t, { id: 'ct', t0: T.towers + .1, t1: T.much - .1, a: proj(V(TOW[0].x, TOW[0].y + .8, TOW[0].z + .5)), ly: 1160, idx: '06', name: 'Cooling towers', spec: 'evaporative', side: 'R', lx: 140 });
  label(t, { id: 'vp', t0: T.evap, t1: T.much - .1, a: proj(V(TOW[1].x + .3, TOW[1].y + 2.4, TOW[1].z)), ly: 600, idx: '07', name: 'Vapour plume', spec: 'this water is gone', side: 'L', lx: 940 });
  label(t, { id: 'pp', t0: T.plants + .3, t1: T.prompt - .2, a: proj(V(PP.x - 1.6, 3.4, PP.z + 1.2)), ly: 580, idx: '08', name: 'Power plant', spec: 'its cooling evaporates water too', side: 'R', lx: 120 });
  label(t, { id: 'dr', t0: T.dry + .6, t1: T.closer - .1, a: proj(V(TOW[1].x, TOW[1].y + .45, TOW[1].z + .5)), ly: 1160, idx: 'FIX', name: 'Dry coolers', spec: 'no evaporation · uses more power', side: 'R', lx: 120 });
  // numbers
  bars(t, T.wue - .1, T.half, 'ON-SITE WATER', 'litres per kWh of IT load · operator reports', [
    { name: 'AWS · 2024', val: .15 / .3, txt: '0.15', col: BLUE, t: T.aws - .2 },
    { name: 'MICROSOFT · 2025', val: .27 / .3, txt: '0.27', col: BLUE, t: T.ms - .2 }]);
  bars(t, T.hidden - .3, T.prompt - .1, 'US DATA CENTERS · 2023', 'billion gallons consumed · LBNL estimate', [
    { name: 'ON SITE (COOLING)', val: 17 / 211 * .78, txt: '17', col: BLUE, t: T.hidden - .1 },
    { name: 'AT THE POWER PLANT', val: .78, txt: '211  (12×)', col: ACC, t: T.x12 - .2 }]);
  { const a = fade(t, T.prompt + .1, .4) * (1 - fade(t, T.big - .35, .3)); if (a > 0) {
    g.globalAlpha = a; g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 12;
    g.font = `500 28px ${MONO}`; g.fillStyle = DIM; g.fillText('ONE MEDIAN GEMINI TEXT PROMPT', Wd / 2, 230);
    for (let i = 0; i < 5; i++) { const k = eo(seg(t, T.drops + i * .12, T.drops + .4 + i * .12)); if (k <= 0) continue; g.globalAlpha = a * k; drop(Wd / 2 + (i - 2) * 90, 300 - (1 - k) * 30, 24, BLUE); }
    g.globalAlpha = a; g.font = `800 64px ${SANS}`; g.fillStyle = INK; g.fillText('≈ 0.26 mL', Wd / 2, 410);
    g.font = `500 24px ${MONO}`; g.fillStyle = DIM; g.fillText('GOOGLE, AUG 2025 · ON-SITE WATER ONLY', Wd / 2, 452); g.shadowBlur = 0; g.textAlign = 'left';
    if (a > .99) texts.push({ id: 'drops', text: '0.26 mL', x0: 300, y0: 190, x1: 780, y1: 460 }); } }
  card(t, [{ id: 'g1', font: `500 28px ${MONO}`, col: DIM, text: 'ONE LARGE DATA CENTER', y: 240, d: 0 },
    { id: 'g2', font: `800 96px ${SANS}`, col: ACC, text: 'UP TO 5M GAL', y: 340, d: .1 },
    { id: 'g3', font: `500 28px ${MONO}`, col: INK, text: 'PER DAY · ≈ 19 MILLION LITRES (EESI)', y: 392, d: .3 }], T.gal - .4, T.fixes - .1);
  { const a = fade(t, T.fixes, .35) * (1 - fade(t, T.closer - .3, .3)); if (a > 0) {
    g.globalAlpha = a; g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 12; g.font = `800 64px ${SANS}`; g.fillStyle = INK; g.fillText('THE FIXES', Wd / 2, 250); g.shadowBlur = 0;
    [['Closed loops', T.closed], ['Dry coolers', T.dry], ['Cooler climates', T.climate]].forEach(([s, t0], i) => { const k = eo(seg(t, t0 - .1, t0 + .4)); if (k <= 0) return; const y = 330 + i * 64;
      g.globalAlpha = a * k; check(330, y - 26, k); g.textAlign = 'left'; g.font = `700 44px ${SANS}`; g.fillStyle = INK; g.shadowBlur = 10; g.fillText(s, 390 + (1 - k) * 12, y); g.shadowBlur = 0; });
    g.textAlign = 'left'; if (a > .99) texts.push({ id: 'fix', text: 'fixes', x0: 300, y0: 190, x1: 800, y1: 470 }); } }
  card(t, [{ id: 'b1', font: `800 84px ${SANS}`, col: ACC, text: '× BILLIONS', y: 300, d: 0 }, { id: 'b2', font: `500 28px ${MONO}`, col: INK, text: 'OF PROMPTS · EVERY DAY', y: 352, d: .2 }], T.billions - .1, T.next - .1);
  card(t, [{ id: 'e1', font: `800 80px ${SANS}`, col: INK, text: 'AI × WATER', y: 300, d: .05 }, { id: 'e2', font: `500 26px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 352, d: .3 }], T.next - .1, 99);
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
