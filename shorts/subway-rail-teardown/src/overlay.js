// Marks layer: anchored labels, dimension lines, track-circuit pulses, safety callouts, captions, cards. 1080×1920.
import * as THREE from 'three';
import { clamp, seg, ss, eo } from '/core/lib.js';

const cv = document.getElementById('ov'), g = cv.getContext('2d');
const MONO = '"JBMono", monospace', SANS = '"Inter", sans-serif';
const INK = '#f1efe9', DIM = 'rgba(241,239,233,.66)', ACC = '#ff6b3d', LINE = 'rgba(241,239,233,.78)', RED = '#ff3b30';
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
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function label(t, o) {
  const { t0, t1, a, ly, idx, name, spec, id } = o;
  const side = o.side || (a[0] > 560 ? 'L' : 'R'), lx = o.lx ?? (side === 'L' ? 470 : 610), dir = side === 'L' ? -1 : 1;
  const dl = eo(seg(t, t0, t0 + .38)), tx = fade(t, t0 + .18, .32), out = 1 - fade(t, t1 - .3, .3);
  if (dl <= 0 || out <= 0) return;
  const [ax, ay] = a, ex = lx - dir * 46, col = o.col || INK;
  g.globalAlpha = out;
  g.fillStyle = col; g.beginPath(); g.arc(ax, ay, 5, 0, 7); g.fill();
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
  if (idx) { g.fillStyle = o.idxCol || ACC; g.font = `500 24px ${MONO}`; g.fillText(idx, lx + dx, ly - 40); }
  g.fillStyle = INK; g.font = `700 44px ${SANS}`; g.fillText(name, lx + dx, ly + 4);
  let w = g.measureText(name).width;
  if (spec) { g.fillStyle = o.specCol || DIM; g.font = `${o.specCol ? 600 : 400} 26px ${MONO}`; g.fillText(spec, lx + dx, ly + 42); w = Math.max(w, g.measureText(spec).width); }
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
// dimension line between two projected points with an end-tick and a centred tag
function dim(t, t0, t1, A, B, text, col = ACC, off = -26) {
  const k = fade(t, t0, .35) * (1 - fade(t, t1 - .3, .3)); if (k <= 0) return;
  const [ax, ay] = A, [bx, by] = B, e = eo(seg(t, t0, t0 + .45));
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  g.globalAlpha = k; g.strokeStyle = col; g.lineWidth = 3;
  g.beginPath(); g.moveTo(mx + (ax - mx) * e, my + (ay - my) * e); g.lineTo(mx + (bx - mx) * e, my + (by - my) * e); g.stroke();
  const nx = -(by - ay), ny = bx - ax, nl = Math.hypot(nx, ny) || 1;
  for (const [px, py] of [[ax, ay], [bx, by]]) { g.beginPath(); g.moveTo(px + nx / nl * 12, py + ny / nl * 12); g.lineTo(px - nx / nl * 12, py - ny / nl * 12); g.stroke(); }
  g.font = `700 38px ${MONO}`; g.textAlign = 'center'; const w = g.measureText(text).width;
  g.fillStyle = 'rgba(14,15,17,.82)'; g.fillRect(mx - w / 2 - 14, my + off - 36, w + 28, 50);
  g.fillStyle = col; g.fillText(text, mx, my + off); g.textAlign = 'left'; g.globalAlpha = 1;
}
function chip(t, t0, t1, text, y, col = INK, bg = 'rgba(14,15,17,.8)', font = `700 34px ${MONO}`) {
  const k = fade(t, t0, .3) * (1 - fade(t, t1 - .3, .3)); if (k <= 0) return;
  g.globalAlpha = k; g.font = font; g.textAlign = 'center'; const w = g.measureText(text).width;
  g.fillStyle = bg; g.fillRect(Wd / 2 - w / 2 - 22, y - 40 + (1 - k) * 10, w + 44, 58);
  g.fillStyle = col; g.fillText(text, Wd / 2, y + (1 - k) * 10); g.textAlign = 'left'; g.globalAlpha = 1;
  if (k > .99) texts.push({ id: text, text, x0: Wd / 2 - w / 2, y0: y - 40, x1: Wd / 2 + w / 2, y1: y + 18 });
}
function dots(t, pts, k, col, speed = .9, n = 14) {   // pulses travelling along a projected polyline (current flow)
  if (k <= 0) return; const P = pts.map(p => proj(p)); const L = []; let tot = 0;
  for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); L.push(l); tot += l; }
  g.globalAlpha = k * .5; g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
  g.globalAlpha = k; g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 14;
  for (let j = 0; j < n; j++) { let s = ((j / n + t * speed * 120 / tot) % 1) * tot; let i = 0; while (i < L.length - 1 && s > L[i]) { s -= L[i]; i++; } const u = clamp(s / L[i]);
    g.beginPath(); g.arc(P[i][0] + (P[i + 1][0] - P[i][0]) * u, P[i][1] + (P[i + 1][1] - P[i][1]) * u, 6, 0, 7); g.fill(); }
  g.shadowBlur = 0; g.globalAlpha = 1;
}

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, ek, L, cx, RT, ZR, Z3, R3T, BOARD, TT, PB, BT, BODY1, CEIL, TX0, WR, AX, TRK, joints, SIGX, SIGZ } = c;
  const ly = n => L[n].dy * ek, lz = n => L[n].dz * ek;
  const fx = cx + TRK + AX, fz = c.FOCUS.ws.position.z;
  // hook title
  card(t, [
    { id: 't1', font: `800 84px ${SANS}`, col: INK, text: 'HOW A SUBWAY TRAIN', y: 270, d: .1 },
    { id: 't2', font: `800 84px ${SANS}`, col: INK, text: 'RIDES ITS RAILS', y: 362, d: .2 },
    { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · SCHEMATIC MODEL', y: 418, d: .4 },
  ], 0, T.rails + .2);
  if (t < T.rails + .2) { g.globalAlpha = fade(t, .1, .5) * (1 - fade(t, T.rails - .1, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 160, 80 * eo(seg(t, .1, .7)), 6); g.globalAlpha = 1; }
  // track layers
  label(t, { id: 'rr', t0: T.rails + .9, t1: T.plates - .1, a: proj(V(-2.5, RT + ly('rails'), ZR)), ly: 560, idx: '01', name: 'Running rails', spec: '~115 lb of steel per yard', side: 'R', lx: 120 });
  dim(t, T.gauge, T.plates - .1, proj(V(.6, RT + .02 + ly('rails'), -ZR + .036)), proj(V(.6, RT + .02 + ly('rails'), ZR - .036)), '4 ft 8½ in');
  label(t, { id: 'tp', t0: T.plates + .1, t1: T.third - .1, a: proj(V(-1.5, PB + ly('plates'), ZR + .1)), ly: 520, idx: '02', name: 'Tie plates', spec: 'steel, clipped to the rail', side: 'R', lx: 120 });
  label(t, { id: 'wt', t0: T.ties + .1, t1: T.third - .1, a: proj(V(-4.1, TT + ly('ties'), 1.2)), ly: 1150, idx: '03', name: 'Wood ties', spec: '', side: 'R', lx: 120 });
  label(t, { id: 'cb', t0: T.ties + .4, t1: T.third - .1, a: proj(V(4.2, TT + ly('ties'), ZR)), ly: 760, idx: '03', name: 'Concrete blocks', spec: 'in rubber boots', side: 'L', lx: 960 });
  label(t, { id: 'bl', t0: T.bed + .1, t1: T.third - .1, a: proj(V(-3.2, BT, 1.9)), ly: 1250, idx: '04', name: 'Stone ballast', spec: '', side: 'R', lx: 120 });
  label(t, { id: 'cbd', t0: T.bed + .3, t1: T.third - .1, a: proj(V(5.2, BT, 2.2)), ly: 1000, idx: '04', name: 'Concrete bed', spec: '', side: 'L', lx: 960 });
  label(t, { id: '3r', t0: T.third + .2, t1: T.down + .3, a: proj(V(1.0, R3T + ly('third'), Z3 + lz('third'))), ly: 1150, idx: '05', name: 'Third rail', spec: '625 V DC', specCol: ACC, side: 'R', lx: 120 });
  label(t, { id: 'cv', t0: T.board + .1, t1: T.down + .3, a: proj(V(2.4, BOARD + .02 + ly('board'), Z3 + .05 + lz('board'))), ly: 560, idx: '06', name: 'Cover board', spec: 'wood / fiberglass', side: 'R', lx: 120 });
  // car: shoe and motors
  label(t, { id: 'sh', t0: T.shoe + 1.2, t1: T.motors - .1, a: proj(V(cx + TRK - AX, R3T + .03, Z3)), ly: 1150, idx: '07', name: 'Contact shoe', spec: 'rides on top of the third rail', side: 'R', lx: 100 });
  label(t, { id: 'tm', t0: T.motors + .1, t1: T.wheels - .3, a: proj(V(cx + TRK + AX - .36, RT + WR + .1, .2)), ly: 560, idx: '08', name: 'Traction motor', spec: 'drives the axle', side: 'R', lx: 120 });
  // wheels: cone + flange (camera looks along -x: +z is screen-left)
  label(t, { id: 'cn', t0: T.cone + .1, t1: T.curve - .1, a: proj(V(fx, RT + .02, ZR + .05 + fz)), ly: 1150, idx: '09', name: 'Conical tread', spec: 'slope exaggerated', side: 'R', lx: 120 });
  label(t, { id: 'fl', t0: T.flange + .1, t1: T.curve - .1, a: proj(V(fx, RT - .025, ZR - .085 + fz)), ly: 560, idx: '10', name: 'Flange', spec: 'on the inside edge', side: 'R', lx: 120 });
  // curve demo: rolling radii at the two contact points
  { const k = fade(t, T.wider - .1, .3) * (1 - fade(t, T.weight - .4, .3));
    if (k > 0) { const sk = c.sk; for (const [z, col, txt, side] of [[ZR, ACC, 'bigger radius', 1], [-ZR, INK, 'smaller radius', -1]]) {
        const A = proj(V(fx, RT, z)), B = proj(V(fx, RT + WR, z)); g.globalAlpha = k; g.strokeStyle = col; g.lineWidth = side > 0 ? 6 : 3; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
        const C = proj(V(fx, RT + 2 * WR + .12, z)); g.font = `700 32px ${MONO}`; g.fillStyle = col; g.textAlign = 'center'; g.fillText(txt, A[0], C[1]); g.textAlign = 'left'; }
      chip(t, T.wider - .1, T.weight - .3, 'OUTER WHEEL ROLLS FARTHER EACH TURN', 300, ACC);
      chip(t, T.steers - .1, T.weight - .3, '→ THE AXLE STEERS INTO THE CURVE', 380, INK); g.globalAlpha = 1; } }
  // contact patch
  label(t, { id: 'cp', t0: T.patch + .2, t1: T.sig - .3, a: proj(V(fx, RT, ZR)), ly: 560, idx: '11', name: 'Contact patch', spec: 'about dime-size, per wheel', side: 'R', lx: 120 });
  // track circuit: current out along one rail, through wheels + axle, back on the other
  { const k = fade(t, T.short - .1, .3) * (1 - fade(t, T.roof - .5, .3)); const ax = cx + TRK + AX, ax2 = cx - TRK - AX, j = joints[0];
    dots(t, [V(j, RT + .01, ZR), V(ax2, RT + .01, ZR), V(ax2, RT + WR, ZR), V(ax2, RT + WR, -ZR), V(ax2, RT + .01, -ZR), V(j, RT + .01, -ZR)], k, '#59d4ff');
    label(t, { id: 'tc', t0: T.short + .2, t1: T.roof - .4, a: proj(V(ax2, RT + .05, ZR)), ly: 1150, idx: '12', name: 'Track circuit', spec: 'wheels + axle short the rails', side: 'R', lx: 120, idxCol: '#59d4ff' });
    label(t, { id: 'sg', t0: T.signal, t1: T.roof - .4, a: proj(V(SIGX, 3.5, SIGZ + .1)), ly: 560, idx: '13', name: 'Signal', spec: 'block occupied → red', side: 'R', lx: 120 }); }
  // ---------- safety segment ----------
  { const k = fade(t, T.roof - .1, .4) * (1 - fade(t, T.next - .4, .4));
    if (k > 0) { // red edge vignette
      const gr = g.createRadialGradient(Wd / 2, Hd / 2, Hd * .35, Wd / 2, Hd / 2, Hd * .75); gr.addColorStop(0, 'rgba(255,40,30,0)'); gr.addColorStop(1, 'rgba(255,40,30,.28)');
      g.globalAlpha = k; g.fillStyle = gr; g.fillRect(0, 0, Wd, Hd); g.globalAlpha = 1; }
    chip(t, T.roof, T.deaths - .2, '⚠  ROOF RIDING KILLS', 260, '#fff', RED, `800 46px ${SANS}`);
    // clearance callout at the portal
    dim(t, T.inches - .3, T.deaths - .2, proj(V(TX0 - .15, BODY1, 1.4)), proj(V(TX0 - .15, CEIL, 1.4)), 'ONLY INCHES', RED, 70);
    chip(t, T.ceil, T.deaths - .2, 'TUNNEL CEILING: INCHES ABOVE THE ROOF', 360, '#fff');
    chip(t, T.curves, T.deaths - .2, 'CURVES + HARD BRAKING THROW YOU', 440, '#fff');
    chip(t, T.below, T.deaths - .2, '625 V THIRD RAIL BELOW', 520, '#fff', 'rgba(150,20,14,.9)');
    if (t > T.below - .1 && t < T.deaths) label(t, { id: 'hv', t0: T.below, t1: T.deaths - .2, a: proj(V(2.2, R3T + .02, Z3)), ly: 1210, idx: 'DANGER', idxCol: RED, name: '625 V DC', spec: 'third rail', side: 'R', lx: 120 });
    card(t, [
      { id: 'k1', font: `900 92px ${SANS}`, col: RED, text: 'SUBWAY SURFING', y: 300, d: 0 },
      { id: 'k2', font: `900 92px ${SANS}`, col: '#fff', text: "KILLS. DON'T.", y: 400, d: .15 },
    ], T.deaths - .1, T.next - .1);
    card(t, [
      { id: 'd1', font: `700 34px ${MONO}`, col: INK, text: 'NYC subway-surfing deaths', y: 480, d: .4 },
      { id: 'd2', font: `700 40px ${MONO}`, col: ACC, text: '2023: 5 · 2024: 6 · 2025: 5+', y: 536, d: .6 },
      { id: 'd3', font: `400 24px ${MONO}`, col: DIM, text: 'NYPD / MTA figures via AP, PIX11 · 2025 as of Oct', y: 578, d: .8 },
    ], T.deaths - .1, T.next - .1);
    chip(t, T.dont - .1, T.next - .1, 'RIDE INSIDE. STAY ALIVE.', 1260, '#fff', RED, `800 46px ${SANS}`); }
  // closers
  card(t, [{ id: 'n1', font: `800 80px ${SANS}`, col: INK, text: 'WHAT SHOULD WE', y: 290, d: 0 }, { id: 'n2', font: `800 80px ${SANS}`, col: ACC, text: 'TAKE APART NEXT?', y: 380, d: .1 }, { id: 'n3', font: `500 30px ${MONO}`, col: DIM, text: 'tell us in the comments', y: 436, d: .3 }], T.next - .1, T.congrats - .05);
  card(t, [{ id: 'e1', font: `800 84px ${SANS}`, col: INK, text: 'CONGRATS!', y: 300, d: .05 }, { id: 'e2', font: `500 26px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 352, d: .4 }], T.congrats - .05, 99);
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
