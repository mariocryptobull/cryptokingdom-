// Marks layer: anchored labels, cards, chart, captions, hook and end cards. 1080×1920.
import * as THREE from 'three';
import { clamp, seg, ss, eo } from '/core/lib.js';

const cv = document.getElementById('ov'), g = cv.getContext('2d');
const MONO = '"JBMono", monospace', SANS = '"Inter", sans-serif';
const INK = '#f1efe9', DIM = 'rgba(241,239,233,.66)', ACC = '#ff6b3d', BLUE = '#59d4ff', LINE = 'rgba(241,239,233,.78)';
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
    const a = fade(t, t0 + it.d, .4) * (1 - fade(t, t1 - .3, .3)); if (a <= 0) continue;
    g.globalAlpha = a; g.font = it.font; g.fillStyle = it.col; g.textAlign = 'center';
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 12;
    g.fillText(it.text, Wd / 2, it.y + (1 - a) * 12); g.shadowBlur = 0;
    const w = g.measureText(it.text).width;
    if (a > .99) texts.push({ id: it.id, text: it.text, x0: Wd / 2 - w / 2, y0: it.y - 70, x1: Wd / 2 + w / 2, y1: it.y + 14 });
    g.textAlign = 'left';
  }
}
const panel = (x, y, w, h, a) => { g.globalAlpha = a * .8; g.fillStyle = 'rgba(14,15,17,.86)'; g.beginPath(); g.roundRect(x, y, w, h, 18); g.fill(); g.globalAlpha = a; g.strokeStyle = 'rgba(241,239,233,.18)'; g.lineWidth = 2; g.stroke(); };

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, ek, VX, VY0, VH, VZ, VR, SGX, SGY0, SGH, SGZ, TX0, TX1, TY, TZ, GX0, GX1, TOWERS, TWH, BY, DC, CX, CZ, CR, CH, PY } = c, V = (x, y, z) => new THREE.Vector3(x, y, z);
  // hook
  card(t, [
    { id: 'h1', font: `800 84px ${SANS}`, col: INK, text: 'WILL AI BRING ABOUT', y: 280, d: .05 },
    { id: 'h2', font: `800 96px ${SANS}`, col: ACC, text: 'NUCLEAR DISASTER?', y: 390, d: .25 },
  ], 0, T.reveal + .1);
  if (t < T.reveal + .1) { g.globalAlpha = fade(t, .05, .4) * (1 - fade(t, T.reveal - .2, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 170, 80 * eo(seg(t, .05, .6)), 6); }
  // reveal
  label(t, { id: 'tmi', t0: T.tmi + .3, t1: T.deal, a: proj(V(CX, BY + CH + CR * .6 + 3.4 * ek, CZ)), ly: 560, idx: 'PENNSYLVANIA, USA', name: 'Three Mile Island', spec: '1979: partial meltdown (Unit 2)', side: 'R', lx: 110 });
  card(t, [{ id: 'd1', font: `800 70px ${SANS}`, col: INK, text: '20-YEAR POWER DEAL', y: 270, d: 0 }, { id: 'd2', font: `500 30px ${MONO}`, col: DIM, text: 'MICROSOFT · CONSTELLATION · SEPT 2024', y: 326, d: .2 }], T.deal - .1, T.apart - .1);
  label(t, { id: 'u1', t0: T.unit1 + .1, t1: T.apart, a: proj(V(CX + .6, BY + CH * .7, CZ + CR * .8)), ly: 1150, idx: 'UNIT 1 · CLOSED 2019', name: 'Crane Clean Energy Center', spec: 'renamed for the restart', side: 'R', lx: 90 });
  // teardown labels
  label(t, { id: 'fu', t0: T.fuel + .4, t1: T.crod - .1, a: proj(c.pelletPos.clone().add(V(-.06, .2, 0))), ly: 560, idx: '01', name: 'Fuel rods', spec: 'uranium oxide pellets', side: 'R', lx: 110 });
  label(t, { id: 'cr', t0: T.crod + .3, t1: T.vessel - .1, a: proj(V(VX + .17, c.crodTop + .02, VZ)), ly: 560, idx: '02', name: 'Control rods', spec: 'absorb neutrons', side: 'R', lx: 110 });
  label(t, { id: 've', t0: T.vessel + .2, t1: T.loop - .1, a: proj(V(VX - VR, VY0 + VH * .55, VZ)), ly: 1150, idx: '03', name: 'Pressure vessel', spec: '~2,250 psi · ~600 °F water', side: 'R', lx: 90 });
  label(t, { id: 'sg', t0: T.sg + .1, t1: T.turb - .1, a: proj(V(SGX + .2, SGY0 + SGH * .8, SGZ + .1)), ly: 560, idx: '04', name: 'Steam generator', spec: 'loop 1 heats loop 2', side: 'L', lx: 990 });
  label(t, { id: 'tu', t0: T.turb + .2, t1: T.tower - .1, a: proj(V((TX0 + TX1) / 2, TY + .35, TZ)), ly: 560, idx: '05', name: 'Turbine', spec: 'steam → spin', side: 'R', lx: 90 });
  label(t, { id: 'ge', t0: T.gen + .2, t1: T.tower - .1, a: proj(V((GX0 + GX1) / 2, TY + .2, TZ + .2)), ly: 1150, idx: '06', name: 'Generator', spec: 'spin → electricity', side: 'L', lx: 990 });
  label(t, { id: 'ct', t0: T.tower + .2, t1: T.chain - .05, a: proj(V(TOWERS[0][0] + .55, BY + TWH * .55, TOWERS[0][1] + .45)), ly: 1150, idx: '07', name: 'Cooling towers', spec: 'leftover heat out', side: 'R', lx: 90 });
  label(t, { id: 'dc', t0: T.gpus + .1, t1: T.mw - .1, a: proj(V(DC.x - .3, BY + .5, DC.z + .3)), ly: 1150, idx: '08', name: 'Data center', spec: 'power → GPUs', side: 'L', lx: 990 });
  // chain card
  if (t > T.chain - .2 && t < T.mw) { const k = fade(t, T.chain - .2, .3) * (1 - fade(t, T.mw - .3, .3)); const W5 = ['HEAT', 'STEAM', 'SPIN', 'POWER', 'GPUs']; const ph = Math.min(4, Math.floor((t - T.chain) / .5));
    g.font = `800 46px ${SANS}`; g.textAlign = 'center'; W5.forEach((w, i) => { g.globalAlpha = k * (i <= ph ? 1 : .3); g.fillStyle = i === ph ? ACC : INK; g.fillText(w, Wd / 2 + (i - 2) * 196, 300); if (i < 4) { g.globalAlpha = k * .5; g.fillStyle = INK; g.fillText('›', Wd / 2 + (i - 1.5) * 196, 296); } }); g.textAlign = 'left'; }
  // stats card
  card(t, [{ id: 'm1', font: `800 150px ${SANS}`, col: ACC, text: '835 MW', y: 330, d: 0 }, { id: 'm2', font: `600 34px ${MONO}`, col: INK, text: '24/7 · CARBON-FREE', y: 394, d: .2 }, { id: 'm3', font: `500 28px ${MONO}`, col: DIM, text: 'RESTART TARGET: 2027 (PLAN, NRC APPROVAL PENDING)', y: 444, d: .5 }], T.mw - .1, T.now - .1);
  // chart: data-center share of US electricity
  if (t > T.chart - .2 && t < T.smr) {
    const k = fade(t, T.chart - .2, .35) * (1 - fade(t, T.smr - .35, .3)); const x0 = 90, y0 = 150, w = 900, h = 420; panel(x0, y0, w, h, k);
    g.globalAlpha = k; g.fillStyle = DIM; g.font = `500 26px ${MONO}`; g.fillText('US ELECTRICITY USED BY DATA CENTERS', x0 + 40, y0 + 58);
    const bx = x0 + 230, bw = 600, sc = bw / 12;
    const g1 = eo(seg(t, T.chart + .3, T.chart + 1.3)), g2 = eo(seg(t, T.y28, T.y28 + 1.2));
    g.font = `800 52px ${SANS}`; g.fillStyle = INK; g.fillText('2023', x0 + 40, y0 + 170); g.fillText('2028', x0 + 40, y0 + 300);
    g.fillStyle = INK; g.fillRect(bx, y0 + 125, 4.4 * sc * g1, 56);
    g.fillStyle = ACC; g.font = `800 46px ${SANS}`; if (g1 > .5) { g.globalAlpha = k * fade(t, T.chart + 1, .3); g.fillText('4.4%', bx + 4.4 * sc + 18, y0 + 170); }
    g.globalAlpha = k * (g2 > 0 ? 1 : 0); g.fillStyle = 'rgba(255,107,61,.95)'; g.fillRect(bx, y0 + 255, 6.7 * sc * Math.min(1, g2 * 1.8), 56);
    g.fillStyle = 'rgba(255,107,61,.35)'; g.fillRect(bx + 6.7 * sc, y0 + 255, 5.3 * sc * clamp(g2 * 1.8 - .8), 56);
    g.globalAlpha = k * fade(t, T.y28 + 1, .3); g.fillStyle = ACC; g.font = `800 40px ${SANS}`; g.fillText('6.7–12%', bx + 12 * sc - 170, y0 + 240);
    g.fillStyle = DIM; g.font = `400 24px ${MONO}`; g.globalAlpha = k; g.fillText('2028 = projection range · LBNL for US DOE, Dec 2024', x0 + 40, y0 + 380); g.globalAlpha = 1;
  }
  // SMR plans
  if (t > T.smr && t < T.catch) {
    const k = fade(t, T.smr, .35) * (1 - fade(t, T.catch - .3, .3)); const x0 = 70, w = 940;
    const rows = [{ t0: T.goog - .3, a: 'GOOGLE + KAIROS POWER', b: '~500 MW · first reactor by 2030 · all by 2035' }, { t0: T.amzn - .3, a: 'AMAZON + X-ENERGY', b: '5 GW of SMRs by 2039' }];
    g.globalAlpha = k; g.fillStyle = INK; g.font = `800 60px ${SANS}`; g.textAlign = 'center'; g.fillText('SMALL MODULAR REACTORS', Wd / 2, 210);
    g.fillStyle = ACC; g.font = `600 26px ${MONO}`; g.fillText('PLANS · NOT BUILT YET', Wd / 2, 254); g.textAlign = 'left';
    rows.forEach((r, i) => { const a = k * fade(t, r.t0, .35); if (a <= 0) return; const y = 290 + i * 150; panel(x0, y, w, 128, a); g.globalAlpha = a; g.fillStyle = INK; g.font = `800 40px ${SANS}`; g.fillText(r.a, x0 + 36, y + 56); g.fillStyle = DIM; g.font = `500 28px ${MONO}`; g.fillText(r.b, x0 + 36, y + 100); });
    g.globalAlpha = 1;
  }
  // the catch
  if (t > T.catch - .1 && t < T.close) {
    const k = fade(t, T.catch - .1, .35) * (1 - fade(t, T.close - .3, .3));
    panel(70, 150, 940, 400, k);
    g.globalAlpha = k; g.fillStyle = ACC; g.font = `800 76px ${SANS}`; g.textAlign = 'center'; g.fillText('THE CATCH', Wd / 2, 230); g.textAlign = 'left';
    const rows = [{ t0: T.cost - .1, a: '$1.6B', b: 'to restart one reactor' }, { t0: T.years - .1, a: 'YEARS', b: 'licensing + building new ones' }, { t0: T.waste - .1, a: 'WASTE', b: 'no permanent US repository' }];
    rows.forEach((r, i) => { const a = k * fade(t, r.t0, .3); if (a <= 0) return; const y = 300 + i * 92; g.globalAlpha = a; g.fillStyle = INK; g.font = `800 50px ${SANS}`; g.textAlign = 'right'; g.fillText(r.a, 400, y + (1 - a) * 10); g.textAlign = 'left'; g.fillStyle = DIM; g.font = `500 30px ${MONO}`; g.fillText(r.b, 430, y - 6 + (1 - a) * 10); });
    g.globalAlpha = 1;
  }
  label(t, { id: 'ca', t0: T.waste + .2, t1: T.close - .1, a: proj(V(-3.05, BY + .55, -1.0)), ly: 1150, idx: 'ON SITE', name: 'Spent fuel casks', spec: 'stored where it was made', side: 'R', lx: 70 });
  // end card
  card(t, [{ id: 'e1', font: `800 74px ${SANS}`, col: INK, text: 'WHAT SHOULD WE', y: 270, d: .05 }, { id: 'e2', font: `800 74px ${SANS}`, col: ACC, text: 'TAKE APART NEXT?', y: 356, d: .2 }, { id: 'e3', font: `500 26px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 412, d: .4 }], T.end - .1, 99);
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
