// Marks layer: anchored labels, dimension lines, graphs, captions, title and end cards. 1080×1920.
import * as THREE from 'three';
import { clamp, seg, ss, eo } from '/core/lib.js';

const cv = document.getElementById('ov'), g = cv.getContext('2d');
const MONO = '"JBMono", monospace', SANS = '"Inter", sans-serif';
const INK = '#f1efe9', DIM = 'rgba(241,239,233,.66)', ACC = '#ff6b3d', BLUE = '#59d4ff', LINE = 'rgba(241,239,233,.78)';
const CAP = { font: `800 54px ${SANS}`, y: 1450, max: 960 };

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
const proj = (x, y, z) => { v3.set(x, y, z).project(CAM); return [(v3.x + 1) / 2 * Wd, (1 - v3.y) / 2 * Hd, v3.z]; };
const fade = (t, a, d = .3) => ss(seg(t, a, a + d));
const win = (t, a, b, d = .3) => fade(t, a, d) * (1 - fade(t, b - d, d));

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
// dimension line between two screen points, offset sideways by off px, with a centred text
function dimLine(t, a, b, off, text, t0, t1, id) {
  const k = win(t, t0, t1); if (k <= 0) return;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, gr = eo(seg(t, t0, t0 + .5));
  const A = [a[0] + nx * off, a[1] + ny * off], B = [a[0] + nx * off + dx * gr, a[1] + ny * off + dy * gr];
  g.globalAlpha = k; g.strokeStyle = ACC; g.lineWidth = 3;
  g.beginPath(); g.moveTo(a[0] + nx * off * .3, a[1] + ny * off * .3); g.lineTo(a[0] + nx * off * 1.15, a[1] + ny * off * 1.15); g.stroke();
  if (gr > .98) { g.beginPath(); g.moveTo(b[0] + nx * off * .3, b[1] + ny * off * .3); g.lineTo(b[0] + nx * off * 1.15, b[1] + ny * off * 1.15); g.stroke(); }
  g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
  const tk = fade(t, t0 + .4, .3); if (tk <= 0) return;
  const mx = (A[0] + a[0] + nx * off + dx) / 2 + nx * 30, my = (A[1] + a[1] + ny * off + dy) / 2 + ny * 30;
  g.globalAlpha = k * tk; g.font = `800 52px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(text).width; g.fillStyle = 'rgba(14,15,17,.82)'; g.fillRect(mx - w / 2 - 16, my - 36, w + 32, 72);
  g.fillStyle = ACC; g.fillText(text, mx, my + 2); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  if (k * tk > .99) texts.push({ id, text, x0: mx - w / 2 - 16, y0: my - 36, x1: mx + w / 2 + 16, y1: my + 36 });
}
function panel(x, y, w, h) { g.fillStyle = 'rgba(14,15,17,.78)'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(241,239,233,.18)'; g.lineWidth = 1.5; g.strokeRect(x, y, w, h); }

// stress-strain sketch: elastic line, yield, hardening to the tensile peak, fracture
function stressStrain(t, T) {
  const k = win(t, T.tears - .1, T.knurl - .1); if (k <= 0) return;
  const X = 150, Y = 170, Wp = 780, Hp = 430; g.globalAlpha = k; panel(X, Y, Wp, Hp);
  const ox = X + 80, oy = Y + Hp - 70, sx = Wp - 140, sy = Hp - 140;
  g.strokeStyle = DIM; g.lineWidth = 2; g.beginPath(); g.moveTo(ox, oy - sy - 10); g.lineTo(ox, oy); g.lineTo(ox + sx + 10, oy); g.stroke();
  g.fillStyle = DIM; g.font = `500 24px ${MONO}`; g.fillText('STRAIN (stretch) →', ox + sx - 250, oy + 40);
  g.save(); g.translate(ox - 26, oy - 10); g.rotate(-Math.PI / 2); g.fillText('STRESS →', 0, 0); g.restore();
  const pt = u => { // u in 0..1 along the curve
    if (u < .25) return [ox + sx * .1 * u / .25, oy - sy * .78 * u / .25];
    const v = (u - .25) / .75, x = .1 + .82 * v, y = v < .85 ? .78 + .22 * Math.sin(v / .85 * Math.PI / 2) : 1 - .25 * Math.pow((v - .85) / .15, 2);
    return [ox + sx * x, oy - sy * y];
  };
  const dr = clamp(seg(t, T.tears, T.tears + 1.6));
  // elastic zone shading
  const ez = win(t, T.springs - .1, T.knurl - .1);
  if (ez > 0) { g.globalAlpha = k * ez * .35; g.fillStyle = BLUE; g.beginPath(); g.moveTo(ox, oy); for (let u = 0; u <= .25; u += .01) { const p = pt(u); g.lineTo(p[0], p[1]); } g.lineTo(pt(.25)[0], oy); g.fill(); g.globalAlpha = k; }
  g.strokeStyle = INK; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath();
  for (let u = 0; u <= dr + 1e-6; u += .005) { const p = pt(Math.min(u, dr)); u ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.stroke();
  const dot = (p, col, txt, sub, a, dx = 18, dy = -18) => { if (a <= 0) return; g.globalAlpha = k * a; g.fillStyle = col; g.beginPath(); g.arc(p[0], p[1], 10, 0, 7); g.fill(); g.font = `800 34px ${SANS}`; g.fillText(txt, p[0] + dx, p[1] + dy); if (sub) { g.fillStyle = DIM; g.font = `500 23px ${MONO}`; g.fillText(sub, p[0] + dx, p[1] + dy + 32); } g.globalAlpha = k; };
  if (dr > .99) { const p = pt(1); g.strokeStyle = ACC; g.lineWidth = 4; g.beginPath(); g.moveTo(p[0] - 12, p[1] - 12); g.lineTo(p[0] + 12, p[1] + 12); g.moveTo(p[0] + 12, p[1] - 12); g.lineTo(p[0] - 12, p[1] + 12); g.stroke(); }
  dot(pt(.25 + .75 * .85 * .97), ACC, 'TENSILE ≈ 190k PSI', 'max stress before it tears', fade(t, T.tears + 1.2, .3), -380, -40);
  dot(pt(.25), BLUE, 'YIELD', 'past here: bent for good', fade(t, T.yld, .3), 22, 2);
  if (ez > 0) { g.globalAlpha = k * ez; g.fillStyle = BLUE; g.font = `800 30px ${SANS}`; g.fillText('ELASTIC', ox + 22, oy - 26); g.globalAlpha = k; }
}
// whip trace: end deflection over time
function whipGraph(t, T, WH) {
  const k = win(t, T.dip - .2, T.payoff - .1); if (k <= 0) return;
  const X = 150, Y = 170, Wp = 780, Hp = 300, t0 = T.dip - .2, t1 = T.payoff - .1; g.globalAlpha = k; panel(X, Y, Wp, Hp);
  g.fillStyle = INK; g.font = `800 34px ${SANS}`; g.fillText('BAR-END FLEX', X + 30, Y + 52);
  g.fillStyle = DIM; g.font = `500 22px ${MONO}`; g.fillText('schematic · deflection exaggerated', X + 30, Y + 86);
  const ox = X + 30, oy = Y + 190, sx = Wp - 60, sy = 95;
  g.strokeStyle = 'rgba(241,239,233,.3)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + sx, oy); g.stroke();
  g.strokeStyle = ACC; g.lineWidth = 4; g.beginPath();
  const te = Math.min(t, t1); for (let x = t0; x <= te; x += 1 / 60) { const px = ox + sx * (x - t0) / (t1 - t0), py = oy - sy * WH(x) / 1.4; x === t0 ? g.moveTo(px, py) : g.lineTo(px, py); } g.stroke();
  const st = fade(t, T.store, .3), sb = fade(t, T.snap2, .3);
  g.font = `700 26px ${MONO}`; g.fillStyle = BLUE; g.globalAlpha = k * st; g.fillText('↓ stores energy', ox + sx * (T.store - t0) / (t1 - t0) - 20, oy + 92);
  g.fillStyle = ACC; g.globalAlpha = k * sb; g.fillText('↑ springs back', ox + sx * (T.snap2 - t0) / (t1 - t0) + 10, oy - 60 > Y + 100 ? oy - 66 : Y + 120);
}

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, Y0, bendY, ek, hk, n, WH } = c, Y = x => Y0 + bendY(x);
  // title
  card(t, [
    { id: 't1', font: `800 84px ${SANS}`, col: INK, text: "WHAT'S INSIDE AN", y: 270, d: .1 },
    { id: 't2', font: `800 96px ${SANS}`, col: ACC, text: 'OLYMPIC BARBELL?', y: 372, d: .2 },
    { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · SCHEMATIC MODEL', y: 428, d: .4 },
  ], 0, T.comp - .1);
  if (t < T.comp) { g.globalAlpha = fade(t, .1, .5) * (1 - fade(t, T.comp - .4, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 160, 80 * eo(seg(t, .1, .7)), 6); }
  // v02: the whole bar
  label(t, { id: 'iwf', t0: T.comp + .4, t1: T.shaft - .1, a: proj(0, Y(0) + .14, .1), ly: 760, idx: "IWF MEN'S BAR", name: '20 kg', spec: '', side: 'L', lx: 420 });
  dimLine(t, proj(-11, Y0, 0), proj(11, Y0, 0), 150, '2.2 m', T.len - .1, T.shaft - .1, 'len');
  // v03: shaft
  label(t, { id: 'sh', t0: T.shaft + .2, t1: T.tears - .1, a: proj(2.4, Y(2.4) + .1, .1), ly: 1180, idx: '01', name: 'Alloy-steel shaft', spec: 'solid · Ø 28 mm', side: 'R', lx: 120 });
  label(t, { id: 'psi', t0: T.psi + .1, t1: T.tears - .1, a: proj(3, Y0 + .9 + .2, 0), ly: 520, idx: 'RATED', name: '≈ 190,000 PSI', spec: 'tensile ≈ 1,310 MPa', side: 'R', lx: 120 });
  stressStrain(t, T);
  // v05–v06: knurl
  label(t, { id: 'kn', t0: T.knurl + .3, t1: T.rings - .1, a: proj(3.2, Y0 + .1, .1), ly: 520, idx: '02', name: 'Knurl', spec: 'crossed grooves → diamond points', side: 'R', lx: 120 });
  dimLine(t, proj(-4.55, Y0, 0), proj(4.55, Y0, 0), -140, '910 mm', T.rings + .3, T.ck + .2, 'marks');
  label(t, { id: 'mk', t0: T.rings + .3, t1: T.ck + .2, a: proj(4.55, Y0, .14), ly: 470, idx: '03', name: 'Grip marks', spec: 'IWF: 910 mm apart', side: 'R', lx: 120 });
  label(t, { id: 'ck', t0: T.ck + .2, t1: T.sleeves - .4, a: proj(.2, Y0, .14), ly: 470, idx: '04', name: 'Centre knurl', spec: 'grips the shoulders', side: 'R', lx: 120 });
  // v07: sleeves and what they spin on
  const sx = 6.55 + 5.6 * ek;
  label(t, { id: 'sl', t0: T.sleeves + .9, t1: T.needle, a: proj(sx + 2.6, Y0, .25), ly: 430, idx: '05', name: 'Sleeve', spec: 'Ø 50 mm · spins on the shaft', side: 'R', lx: 120 });
  label(t, { id: 'bu', t0: T.bush + .2, t1: T.snatch - .9, a: proj(7.3, Y0 + 1.1, .15), ly: 1170, idx: '06', name: 'Bronze bushings', spec: 'smooth, controlled spin', side: 'R', lx: 120 });
  label(t, { id: 'nb', t0: T.needle + .2, t1: T.snatch - .9, a: proj(10.3, Y0 - .1, .15), ly: 430, idx: '06', name: 'or needle bearings', spec: 'rows of rollers · faster spin', side: 'R', lx: 120 });
  // v08: turnover demo
  label(t, { id: 'tu', t0: T.flips + .1, t1: T.snap - .1, a: proj(4.2, Y0 + .14, .1), ly: 1180, idx: 'SHAFT', name: 'turns with your wrists', spec: '', side: 'R', lx: 120 });
  label(t, { id: 'pl', t0: T.spinsl, t1: T.snap - .1, a: proj(7.2, Y0 + 1.6, .2), ly: 470, idx: 'SLEEVE + PLATE', name: 'stay put', spec: 'no twist on the wrists', side: 'R', lx: 120 });
  // v09: end hardware
  label(t, { id: 'sr', t0: T.snap + .3, t1: T.load - .7, a: proj(10.93 + 2.6 * hk, Y0 + .14, 0), ly: 470, idx: '07', name: 'Snap ring', spec: 'locks the sleeve on', side: 'R', lx: 120 });
  label(t, { id: 'ec', t0: T.caps + .1, t1: T.load - .7, a: proj(11.04 + 4 * hk, Y0 - .2, 0), ly: 1180, idx: '08', name: 'End cap', spec: 'seals the bearings', side: 'R', lx: 120 });
  label(t, { id: 'co', t0: T.collars + .1, t1: T.load - .7, a: proj(7.75 + 4.4 * hk, Y0 + .5, 0), ly: 1300, idx: '09', name: 'Collar', spec: 'clamps the plates', side: 'L', lx: 960 });
  // v10: whip
  whipGraph(t, T, WH);
  // payoff, next, end
  card(t, [{ id: 'p1', font: `800 80px ${SANS}`, col: INK, text: 'A SPRING WITH', y: 300, d: 0 }, { id: 'p2', font: `800 92px ${SANS}`, col: ACC, text: 'SPINNING ENDS', y: 400, d: .15 }], T.payoff - .05, T.next - .1);
  card(t, [{ id: 'n1', font: `800 80px ${SANS}`, col: INK, text: 'WHAT SHOULD WE', y: 300, d: 0 }, { id: 'n2', font: `800 88px ${SANS}`, col: ACC, text: 'TAKE APART NEXT?', y: 400, d: .1 }, { id: 'n3', font: `500 30px ${MONO}`, col: DIM, text: 'TELL US IN THE COMMENTS ↓', y: 460, d: .3 }], T.next - .1, T.congrats - .05);
  card(t, [{ id: 'e1', font: `800 92px ${SANS}`, col: INK, text: 'OLYMPIC BARBELL', y: 300, d: .05 }, { id: 'e2', font: `500 30px ${MONO}`, col: ACC, text: '20 kg · 2.2 m · Ø28 mm · ~190k PSI', y: 360, d: .25 }, { id: 'e3', font: `500 24px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 404, d: .4 }], T.congrats - .05, 99);
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
