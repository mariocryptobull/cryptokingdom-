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


const pill = (t, text, y, t0, t1, col = INK) => { const k = fade(t, t0, .3) * (1 - fade(t, t1 - .3, .3)); if (k <= 0) return; g.globalAlpha = k; g.font = `600 30px ${MONO}`; g.textAlign = 'center'; const w = g.measureText(text).width + 50; g.fillStyle = 'rgba(14,15,19,.8)'; g.fillRect(Wd / 2 - w / 2, y - 36, w, 52); g.fillStyle = col; g.fillText(text, Wd / 2, y); g.textAlign = 'left'; };
function containers(t, t0, t1) {
  const k = 1 - fade(t, t1 - .35, .35); if (t < t0 || k <= 0) return;
  const cw = 92, chh = 38, gx = 14, gy = 12, cols = 8, x0 = Wd / 2 - (cols * cw + (cols - 1) * gx) / 2, y0 = 520;
  for (let i = 0; i < 40; i++) { const a = fade(t, t0 + i * .03, .2) * k; if (a <= 0) continue; const r = Math.floor(i / cols), c = i % cols; const x = x0 + c * (cw + gx), y = y0 + r * (chh + gy) + (1 - a) * 20;
    g.globalAlpha = a; g.fillStyle = ['#7b5cff', '#ff6b3d', '#3fa7d6', '#e9e4d6'][i % 4]; g.fillRect(x, y, cw, chh); g.fillStyle = 'rgba(0,0,0,.25)'; for (let s = 1; s < 6; s++) g.fillRect(x + s * cw / 6, y + 4, 3, chh - 8); }
  for (let p = 0; p < 3; p++) { const a = fade(t, t0 + 1.4 + p * .2, .3) * k; if (a <= 0) continue; const cx = Wd / 2 + (p - 1) * 260 + (1 - a) * 60, cy = 860;
    g.globalAlpha = a; g.fillStyle = INK; g.save(); g.translate(cx, cy); g.beginPath(); g.moveTo(90, 0); g.lineTo(-80, -10); g.lineTo(-80, 10); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(10, -6); g.lineTo(-30, -70); g.lineTo(-48, -70); g.lineTo(-20, 0); g.lineTo(-48, 70); g.lineTo(-30, 70); g.lineTo(10, 6); g.fill();
    g.beginPath(); g.moveTo(-62, -4); g.lineTo(-84, -30); g.lineTo(-92, -30); g.lineTo(-84, 0); g.lineTo(-92, 30); g.lineTo(-84, 30); g.lineTo(-62, 4); g.fill(); g.restore(); }
}
function hairVsGate(t, t0, t1) {
  const k = fade(t, t0, .4) * (1 - fade(t, t1 - .35, .35)); if (k <= 0) return;
  g.globalAlpha = k * .78; g.fillStyle = '#0c0d11'; g.fillRect(0, 440, Wd, 900);
  const hk = fade(t, t0 + .9, .5) * k;   // hair appears on "A hair?"
  const cx = Wd / 2, cy = 870, R = 330;
  if (hk > 0) { g.globalAlpha = hk; const gr = g.createRadialGradient(cx - 90, cy - 90, 40, cx, cy, R); gr.addColorStop(0, '#8a6a4a'); gr.addColorStop(1, '#3a2a1c'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R * eo(seg(t, t0 + .9, t0 + 1.5)), 0, 7); g.fill();
    g.fillStyle = INK; g.font = `700 40px ${SANS}`; g.textAlign = 'center'; g.fillText('Human hair ≈ 80,000 nm', cx, cy - R - 30); }
  g.globalAlpha = k; g.fillStyle = ACC; g.beginPath(); g.arc(cx, cy, 2.5, 0, 7); g.fill();
  g.strokeStyle = ACC; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + 4, cy - 4); g.lineTo(cx + 120, cy - 110); g.lineTo(cx + 170, cy - 110); g.stroke();
  g.fillStyle = ACC; g.font = `700 38px ${SANS}`; g.textAlign = 'left'; g.fillText('Gate ≈ 20 nm', cx + 180, cy - 98);
  g.fillStyle = INK; g.font = `500 28px ${MONO}`; g.textAlign = 'center'; if (hk > 0) { g.globalAlpha = hk; g.fillText('~4,000 gates fit across one hair', cx, cy + R + 58); }
  g.textAlign = 'left';
}
export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, wp, P0, IF, M1p, M2p, POp, WPp, RMp, pts, STACK } = c, V = (x, y, z) => new THREE.Vector3(x, y, z);
  // hook (spoken + on screen)
  card(t, [
    { id: 'h1', font: `800 80px ${SANS}`, col: INK, text: 'WHAT IF ONE MACHINE', y: 270, d: .05 },
    { id: 'h2', font: `800 80px ${SANS}`, col: INK, text: 'CONTROLLED THE', y: 358, d: .15 },
    { id: 'h3', font: `800 80px ${SANS}`, col: ACC, text: 'FUTURE OF AI?', y: 446, d: .25 },
  ], 0, T.reveal + .2);
  if (t < T.reveal + .2) { g.globalAlpha = fade(t, .1, .5) * (1 - fade(t, T.reveal - .1, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 160, 80 * eo(seg(t, .1, .7)), 6); }
  card(t, [{ id: 'r1', font: `800 72px ${SANS}`, col: INK, text: 'EUV LITHOGRAPHY', y: 280, d: 0 }, { id: 'r2', font: `500 30px ${MONO}`, col: DIM, text: 'EXTREME ULTRAVIOLET · SCHEMATIC MODEL', y: 334, d: .2 }], T.euv - .1, T.tin - .2);
  card(t, [{ id: 'o1', font: `800 104px ${SANS}`, col: ACC, text: '1 COMPANY', y: 470, d: 0 }, { id: 'o2', font: `500 30px ${MONO}`, col: INK, text: 'ASML · VELDHOVEN, NETHERLANDS', y: 522, d: .2 }], T.one, T.tin - .2);
  // source
  label(t, { id: 'tin', t0: T.tin + .9, t1: T.laser, a: proj(wp('src', V(P0.x, 2.2, 0))), ly: 560, idx: '01', name: 'Tin droplets', spec: 'molten · ~25 µm', side: 'R', lx: 120 });
  label(t, { id: 'co2', t0: T.laser + .3, t1: T.plasma, a: proj(wp('laser', V(0, .3, 0))), ly: 1180, idx: '02', name: 'CO₂ laser', spec: '50,000 hits / second', side: 'R', lx: 120 });
  label(t, { id: 'pl', t0: T.plasma + .3, t1: T.glow, a: proj(wp('src', P0)), ly: 560, idx: '03', name: 'Tin plasma', spec: '~220,000 °C · ~40× Sun surface', side: 'R', lx: 120 });
  label(t, { id: 'nm', t0: T.nm, t1: T.vac, a: proj(pts[0]), ly: 1180, idx: '04', name: 'λ = 13.5 nm', spec: 'extreme ultraviolet (EUV)', side: 'R', lx: 120 });
  pill(t, 'VACUUM · EUV is absorbed by air & glass', 1230, T.air, T.lens);
  label(t, { id: 'col', t0: T.lens + .2, t1: T.stack - .2, a: proj(wp('src', V(P0.x - .45, P0.y + .45, 0))), ly: 560, idx: '05', name: 'Collector mirror', spec: 'gathers the light', side: 'R', lx: 120 });
  label(t, { id: 'mir', t0: T.mirrors + .2, t1: T.stack - .2, a: proj(pts[5]), ly: 1180, idx: '06', name: 'Mirrors, not lenses', spec: 'every optic reflects', side: 'L', lx: 960 });
  // multilayer + flatness
  label(t, { id: 'ml', t0: T.layers, t1: T.smooth, a: proj(STACK.position.clone().add(V(.55, .6, 0))), ly: 560, idx: '07', name: 'Mo / Si multilayer', spec: '~40 layer pairs', side: 'L', lx: 960 });
  card(t, [{ id: 'g1', font: `500 30px ${MONO}`, col: INK, text: 'IF A MIRROR WERE THE SIZE OF GERMANY', y: 300, d: 0 }, { id: 'g2', font: `800 104px ${SANS}`, col: ACC, text: '1 mm', y: 410, d: .5 }, { id: 'g3', font: `500 28px ${MONO}`, col: DIM, text: 'TALLEST BUMP (ASML)', y: 458, d: .7 }], T.germany - .1, T.mask - .1);
  // mask, wafer, stages
  label(t, { id: 'rt', t0: T.mask + .3, t1: T.wafer, a: proj(wp('rs', V(0, 0, .3))), ly: 1180, idx: '08', name: 'Reticle (mask)', spec: 'the chip pattern', side: 'R', lx: 120 });
  label(t, { id: 'wf', t0: T.wafer + .3, t1: T.stages, a: proj(wp('ws', V(0, .33, .2))), ly: 560, idx: '09', name: 'Silicon wafer', spec: 'pattern shrunk 4×', side: 'R', lx: 120 });
  label(t, { id: 'rs', t0: T.stages + .2, t1: T.gates, a: proj(wp('rs', V(-.6, .25, .5))), ly: 520, idx: '10', name: 'Reticle stage', spec: 'scans', side: 'R', lx: 120 });
  label(t, { id: 'ws', t0: T.stages + .4, t1: T.gates, a: proj(wp('ws', V(-.7, .2, .6))), ly: 1180, idx: '11', name: 'Wafer stage', spec: 'layers align to nanometres', side: 'R', lx: 120 });
  hairVsGate(t, T.gates, T.price);
  // business + geopolitics
  card(t, [{ id: 'c1', font: `500 30px ${MONO}`, col: INK, text: 'PRICE PER MACHINE', y: 300, d: 0 }, { id: 'c2', font: `800 112px ${SANS}`, col: ACC, text: '~$150M', y: 418, d: .2 }, { id: 'c3', font: `500 30px ${MONO}`, col: DIM, text: 'NEWEST HIGH-NA: ~$380–400M', y: 470, d: T.p400 - T.price }], T.price, T.ship - .1);
  card(t, [{ id: 's1', font: `500 30px ${MONO}`, col: INK, text: 'ONE MACHINE SHIPS IN', y: 300, d: 0 }, { id: 's2', font: `800 72px ${SANS}`, col: ACC, text: '40 CONTAINERS · 3 PLANES', y: 390, d: .2 }], T.ship, T.china - .1);
  containers(t, T.cont - .1, T.china - .1);
  card(t, [{ id: 'k1', font: `500 30px ${MONO}`, col: INK, text: 'EUV MACHINES SHIPPED TO CHINA', y: 300, d: 0 }, { id: 'k2', font: `800 150px ${SANS}`, col: ACC, text: '0', y: 440, d: T.never - T.china }, { id: 'k3', font: `500 28px ${MONO}`, col: DIM, text: 'DUTCH EXPORT LICENCE WITHHELD SINCE 2019', y: 500, d: T.dutch - T.china }], T.china, T.us - .1);
  card(t, [{ id: 'u1', font: `500 30px ${MONO}`, col: INK, text: 'US EXPORT CONTROLS · OCT 2022', y: 300, d: 0 }, { id: 'u2', font: `800 64px ${SANS}`, col: ACC, text: 'ADVANCED AI CHIPS', y: 384, d: .2 }, { id: 'u3', font: `800 64px ${SANS}`, col: ACC, text: '+ CHIPMAKING TOOLS', y: 456, d: .4 }], T.us, T.close - .1);
  card(t, [{ id: 'e1', font: `800 76px ${SANS}`, col: INK, text: 'WHAT SHOULD WE', y: 290, d: .05 }, { id: 'e2', font: `800 76px ${SANS}`, col: ACC, text: 'TAKE APART NEXT?', y: 374, d: .15 }, { id: 'e3', font: `500 26px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 428, d: .4 }], T.next - .1, 99);
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
