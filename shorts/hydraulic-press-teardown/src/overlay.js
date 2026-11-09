// Marks layer: anchored labels, year cards, captions, title and end cards. 1080×1920.
import * as THREE from 'three';
import { clamp, seg, ss, eo, lerp } from '/core/lib.js';

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

function panel(t, t0, t1, rows, y0, opt = {}) {   // stacked mono readout rows, each with its own start time
  const out = 1 - fade(t, t1 - .3, .3); if (t < t0 || out <= 0) return;
  const w = opt.w || 760, x0 = Wd / 2 - w / 2, rh = opt.rh || 62, n = rows.filter(r => t >= r.t).length; if (!n) return;
  g.globalAlpha = out * fade(t, t0, .25); g.fillStyle = 'rgba(14,15,17,.78)'; g.fillRect(x0, y0, w, 30 + rh * n);
  g.fillStyle = ACC; g.fillRect(x0, y0, 6, 30 + rh * n);
  rows.forEach((r, i) => { if (t < r.t) return; const k = fade(t, r.t, .25); g.globalAlpha = out * k;
    g.textAlign = 'left'; g.font = r.big ? `800 52px ${SANS}` : `500 34px ${MONO}`; g.fillStyle = r.col || INK; g.fillText(r.text, x0 + 34 + (1 - k) * 14, y0 + 15 + rh * (i + 1) - 14);
    if (k > .99 && out > .99) { const tw = g.measureText(r.text).width; texts.push({ id: (opt.id || 'p') + i, text: r.text, x0: x0 + 34, y0: y0 + rh * i + 10, x1: x0 + 34 + tw, y1: y0 + rh * (i + 1) + 6 }); } });
  g.globalAlpha = 1;
}
function arrow(x0, y0, x1, y1, col, a) {
  const L = Math.hypot(x1 - x0, y1 - y0); if (L < 4) return; const ux = (x1 - x0) / L, uy = (y1 - y0) / L;
  g.globalAlpha = a; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 - ux * 12, y1 - uy * 12); g.stroke();
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - ux * 20 - uy * 11, y1 - uy * 20 + ux * 11); g.lineTo(x1 - ux * 20 + uy * 11, y1 - uy * 20 - ux * 11); g.closePath(); g.fill();
}
const fmt = n => Math.round(n).toLocaleString('en-US');

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, ek, P, e, V: Q } = c, V = (x, y, z) => new THREE.Vector3(x, y, z);
  const at = (n, x, y, z) => proj(V(x + P[n].d.x * ek, y + P[n].d.y * ek, z + P[n].d.z * ek));
  // title
  card(t, [
    { id: 't1', font: `800 76px ${SANS}`, col: INK, text: 'HOW A HYDRAULIC', y: 250, d: .1 },
    { id: 't2', font: `800 76px ${SANS}`, col: INK, text: 'PRESS CRUSHES ANYTHING', y: 342, d: .2 },
    { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · SCHEMATIC MODEL', y: 398, d: .4 },
  ], 0, T.apart - .1);
  if (t < T.apart) { g.globalAlpha = fade(t, .1, .5) * (1 - fade(t, T.apart - .4, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 150, 80 * eo(seg(t, .1, .7)), 6); }
  // v02: the parts, exploded
  const lift = T.lift - 1.1;
  label(t, { id: 'fr', t0: T.frame - .1, t1: lift, a: at('uprightL', -Q.XU, 4.4, .25), ly: 520, idx: '01', name: 'H-frame', spec: 'takes the 20 t reaction', side: 'R', lx: 120 });
  label(t, { id: 'pu', t0: T.frame + .55, t1: lift, a: at('pump', Q.PX, 3.1, 0), ly: 560, idx: '02', name: 'Hand pump', spec: '', side: 'L', lx: 1000 });
  label(t, { id: 'rs', t0: T.frame + 1.2, t1: lift, a: at('res', Q.PX + .5, 2.0, .2), ly: 1180, idx: '03', name: 'Oil reservoir', spec: '', side: 'L', lx: 1000 });
  label(t, { id: 'cy', t0: T.cyl, t1: lift, a: at('cyl', -.3, 4.6, 0), ly: 1180, idx: '04', name: 'Main cylinder', spec: 'big piston = the ram', side: 'R', lx: 80 });
  // v03: pump + check valves
  label(t, { id: 'sp', t0: T.lift + .5, t1: T.cv1 - .1, a: at('pump', Q.PX, Q.PP0 + .13, 0), ly: 560, idx: '05', name: 'Small piston', spec: 'driven by the handle', side: 'L', lx: 980 });
  label(t, { id: 'c1', t0: T.cv1, t1: T.push + .1, a: at('cv', Q.cvIn.x, Q.cvIn.y, 0), ly: 1180, idx: '06', name: 'Check valve 1', spec: 'reservoir → pump only', side: 'L', lx: 980 });
  label(t, { id: 'c2', t0: T.cv2 - .1, t1: T.back + .6, a: at('cv', Q.cvOut.x, Q.cvOut.y, 0), ly: 1180, idx: '07', name: 'Check valve 2', spec: 'pump → cylinder only', side: 'R', lx: 100 });
  // v04: ram
  label(t, { id: 'rm', t0: T.ram - .3, t1: T.pascal + .2, a: proj(V(0, Q.ramTip - e + .4, .32)), ly: 1150, idx: '08', name: 'The ram', spec: 'oil stacks above it', side: 'R', lx: 140 });
  // v05: Pascal — equal arrows on every wall of the trapped oil
  const pk = fade(t, T.equal - .2, .4) * (1 - fade(t, T.small - .3, .3));
  if (pk > 0) {
    const pul = .8 + .2 * Math.sin(t * 6), L = .32 * pul, pts = [];
    const oy0 = Q.CYT - .02, oy1 = Q.RAM0 - e;   // oil column in the cylinder
    for (const y of [lerp(oy0, oy1, .3), lerp(oy0, oy1, .75)]) for (const s of [-1, 1]) pts.push([V(s * (Q.PR - .05), y, .1), V(s, 0, 0)]);
    pts.push([V(0, oy1 + .02, .1), V(0, -1, 0)], [V(.2, oy1 + .02, .1), V(0, -1, 0)], [V(-.2, oy1 + .02, .1), V(0, -1, 0)]);
    pts.push([V(Q.PX, Q.PP0 - .02, .05), V(0, 1, 0)]);
    for (const y of [Q.PB + .08, Q.PB + .22]) for (const s of [-1, 1]) pts.push([V(Q.PX + s * .09, y, .05), V(s, 0, 0)]);
    for (const [p, n] of pts) { const [x0, y0] = proj(p), [x1, y1] = proj(p.clone().addScaledVector(n, L)); arrow(x0, y0, x1, y1, ACC, pk); }
    g.globalAlpha = 1;
  }
  card(t, [{ id: 'pa1', font: `800 72px ${SANS}`, col: ACC, text: "PASCAL'S LAW", y: 260, d: 0 }, { id: 'pa2', font: `500 32px ${MONO}`, col: INK, text: 'same pressure everywhere in the oil', y: 318, d: .5 }], T.pascal, T.fpa - .05);
  card(t, [{ id: 'fpa', font: `800 120px ${SANS}`, col: INK, text: 'F = P × A', y: 330, d: 0 }, { id: 'fpb', font: `500 30px ${MONO}`, col: DIM, text: 'force = pressure × area', y: 388, d: .25 }], T.fpa - .05, T.small - .05);
  // v06: the two areas
  label(t, { id: 'aS', t0: T.small, t1: T.hand - .1, a: proj(V(Q.PX, Q.PP0 - .02, 0)), ly: 1180, idx: 'PUMP PISTON', name: '0.15 in²', spec: '⌀ ≈ 7/16 in', side: 'L', lx: 1000 });
  label(t, { id: 'aB', t0: T.big - .1, t1: T.hand - .1, a: proj(V(0, Q.RAM0 - e + .01, 0)), ly: 560, idx: 'RAM', name: '4 in²', spec: '⌀ ≈ 2¼ in', side: 'R', lx: 80 });
  card(t, [{ id: 'x26', font: `800 130px ${SANS}`, col: ACC, text: '× 26', y: 340, d: 0 }, { id: 'x26b', font: `500 30px ${MONO}`, col: INK, text: '4 ÷ 0.15 ≈ 26 times the area', y: 398, d: .25 }], T.x26 - .1, T.hand - .1);
  // v07: the numbers chain
  panel(t, T.hand, T.catch - .1, [
    { t: T.hand + .2, text: 'hand on handle   ≈ 90 lb' },
    { t: T.f1500, text: 'on pump piston   1,500 lb' },
    { t: T.psi, text: '÷ 0.15 in²  =  10,000 psi', col: ACC },
    { t: T.f40k, text: '× 4 in²  =  40,000 lb' },
    { t: T.tons, text: '= 20 TONS', big: true, col: ACC },
  ], 170, { id: 'ch', w: 800 });
  // v08: stroke counter
  if (t > T.catch - .1 && t < T.gauge - .1) {
    const n = c.strokes;
    panel(t, T.mm - .3, T.gauge, [
      { t: T.mm - .3, text: `pump strokes   ${String(n).padStart(3)}` },
      { t: T.mm - .3, text: `ram travel     ≈ ${(n * .96).toFixed(1)} mm`, col: ACC },
      { t: T.trade, text: '26× the force · 1/26 the travel' },
    ], 200, { id: 'st', w: 800 });
  }
  // v09: gauge + release valve
  label(t, { id: 'ga', t0: T.gauge, t1: T.rel + .1, a: at('gauge', Q.GP.x, Q.GP.y, Q.GP.z + .05), ly: 560, idx: '09', name: 'Pressure gauge', spec: '0–10,000 psi', side: 'L', lx: 960 });
  label(t, { id: 'rv', t0: T.rel, t1: T.can - .1, a: at('rel', Q.PX + .18, Q.PB - .07, .46), ly: 1180, idx: '10', name: 'Release valve', spec: 'oil → reservoir, ram retracts', side: 'R', lx: 80 });
  // v10: live force readout on the can
  if (t > T.can + .2 && t < T.next) {
    const k = fade(t, T.can + .2, .3) * (1 - fade(t, T.next - .3, .3)), F = c.force;
    g.globalAlpha = k; g.fillStyle = 'rgba(14,15,17,.8)'; g.fillRect(Wd / 2 - 330, 170, 660, 250); g.fillStyle = ACC; g.fillRect(Wd / 2 - 330, 170, 6, 250);
    g.textAlign = 'center'; g.font = `500 28px ${MONO}`; g.fillStyle = DIM; g.fillText('FORCE ON THE CAN', Wd / 2, 222);
    g.font = `800 112px ${SANS}`; g.fillStyle = F > 180 && t < T.buckle + .6 ? ACC : INK; g.fillText(`${fmt(F)} lb`, Wd / 2, 338);
    g.font = `500 28px ${MONO}`; g.fillStyle = INK; g.fillText(`${fmt(c.psi)} psi in the oil · max 10,000`, Wd / 2, 392);
    g.textAlign = 'left';
    if (k > .99) texts.push({ id: 'force', text: 'FORCE', x0: Wd / 2 - 300, y0: 190, x1: Wd / 2 + 300, y1: 400 });
    if (t > T.half - .1) { const k2 = fade(t, T.half - .1, .3) * (1 - fade(t, T.next - .3, .3)); g.globalAlpha = k2; g.font = `600 32px ${MONO}`; g.textAlign = 'center'; g.fillStyle = 'rgba(14,15,17,.78)'; g.fillRect(Wd / 2 - 330, 432, 660, 56); g.fillStyle = ACC; g.fillText('200 lb ÷ 40,000 lb ≈ 0.5%', Wd / 2, 471); g.textAlign = 'left'; }
    g.globalAlpha = 1;
  }
  card(t, [{ id: 'n1', font: `800 80px ${SANS}`, col: INK, text: 'WHAT SHOULD WE', y: 270, d: 0 }, { id: 'n2', font: `800 80px ${SANS}`, col: ACC, text: 'TAKE APART NEXT?', y: 360, d: .15 }], T.next - .1, T.congrats - .1);
  card(t, [{ id: 'e1', font: `800 84px ${SANS}`, col: INK, text: 'THE HYDRAULIC PRESS', y: 290, d: .05 }, { id: 'e2', font: `500 30px ${MONO}`, col: ACC, text: 'F = P × A · 90 lb in, 20 tons out', y: 346, d: .3 }, { id: 'e3', font: `500 24px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 392, d: .5 }], T.congrats - .1, 99);
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
