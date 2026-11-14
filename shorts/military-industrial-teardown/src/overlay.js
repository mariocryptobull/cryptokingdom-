// Marks layer: anchored labels, tags, year cards, quote, captions, hook and end cards. 1080×1920.
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
const V = (x, y, z) => new THREE.Vector3(x, y, z);

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

// small centred tag floating above a 3D point (name + optional spec), k = visibility 0..1
function tag(id, k, p, name, spec, up = 0, nameCol = INK) {
  if (k <= .01) return;
  const [x0, y, z] = proj(p); if (z > 1) return;
  const yy = y - up + (1 - k) * 10;
  g.font = `800 34px ${SANS}`; let hw = g.measureText(name).width / 2; if (spec) { g.font = `500 25px ${MONO}`; hw = Math.max(hw, g.measureText(spec).width / 2); }
  const x = clamp(x0, hw + 24, Wd - hw - 24);
  g.globalAlpha = k; g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 12;
  g.fillStyle = nameCol; g.font = `800 34px ${SANS}`; g.fillText(name, x, yy);
  let w = g.measureText(name).width;
  if (spec) { g.fillStyle = DIM; g.font = `500 25px ${MONO}`; g.fillText(spec, x, yy + 32); w = Math.max(w, g.measureText(spec).width); }
  g.shadowBlur = 0; g.textAlign = 'left';
  if (k > .99) texts.push({ id, text: name + (spec ? ' ' + spec : ''), x0: Math.max(0, x - w / 2), y0: yy - 34, x1: Math.min(Wd, x + w / 2), y1: yy + (spec ? 38 : 8) });
}

function card(t, items, t0, t1) {
  for (const it of items) {
    const a = fade(t, t0 + it.d, .4) * (1 - fade(t, t1 - .3, .3)); if (a <= 0) continue;
    g.globalAlpha = a; g.font = it.font; g.fillStyle = it.col; g.textAlign = 'center';
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 12;
    const w0 = g.measureText(it.text).width, s = Math.min(1, 980 / w0);
    g.save(); g.translate(Wd / 2, it.y + (1 - a) * 12); g.scale(s, s); g.fillText(it.text, 0, 0); g.restore(); g.shadowBlur = 0;
    const w = w0 * s;
    if (a > .99) texts.push({ id: it.id, text: it.text, x0: Wd / 2 - w / 2, y0: it.y - 70, x1: Wd / 2 + w / 2, y1: it.y + 14 });
    g.textAlign = 'left';
  }
}
const big = (id, a, b, t0, t1, col = ACC) => [{ id: id + 'a', font: `800 96px ${SANS}`, col, text: a, y: 300, d: 0 }, { id: id + 'b', font: `500 30px ${MONO}`, col: INK, text: b, y: 352, d: .2 }];

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, P, ek, JY, TOP, B, SP, BX, bars, sups, sk, K, BARV, mk, jetRoot } = c;
  // hook
  card(t, [
    { id: 'h1', font: `800 92px ${SANS}`, col: INK, text: 'WHO REALLY PROFITS', y: 280, d: 0 },
    { id: 'h2', font: `800 92px ${SANS}`, col: ACC, text: 'FROM WAR?', y: 380, d: .12 },
  ], -1, T.mic - .05);
  card(t, [
    { id: 'r1', font: `800 80px ${SANS}`, col: INK, text: 'THE MILITARY-', y: 270, d: 0 },
    { id: 'r2', font: `800 80px ${SANS}`, col: INK, text: 'INDUSTRIAL COMPLEX', y: 356, d: .1 },
    { id: 'r3', font: `500 26px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · SCHEMATIC MODEL', y: 410, d: .3 },
  ], T.mic, T.y1961 - .05);
  // the triangle's three corners
  const trk = K.tri(t) * fade(t, T.mic + .5, .4) * (t < T.ww2 ? 1 : fade(t, T.closer + .6, .4));
  tag('tg', trk, B.gov.clone().setY(TOP + .75), 'GOVERNMENT', 'budgets', 0);
  tag('ti', trk, B.ind.clone().setY(TOP + .75), 'INDUSTRY', 'builds', 0);
  tag('tm', trk, B.mil.clone().setY(TOP + .6), 'MILITARY', 'buys', 0);
  card(t, big('y61', '1961', 'EISENHOWER · FAREWELL ADDRESS'), T.y1961, T.quote - .05);
  if (t > T.ike && t < T.quote) { const k = fade(t, T.star, .3) * (1 - fade(t, T.quote - .3, .3)); g.globalAlpha = k; g.font = `600 30px ${MONO}`; g.textAlign = 'center'; g.fillStyle = 'rgba(14,15,17,.78)'; g.fillRect(Wd / 2 - 330, 1210, 660, 52); g.fillStyle = INK; g.fillText('5-STAR GENERAL · PRESIDENT 1953–61', Wd / 2, 1246); g.textAlign = 'left'; }
  // the quote (verbatim, with ellipses)
  card(t, [
    { id: 'q1', font: `600 46px ${SANS}`, col: INK, text: '“…guard against the acquisition', y: 250, d: 0 },
    { id: 'q2', font: `600 46px ${SANS}`, col: INK, text: 'of unwarranted influence … by the', y: 312, d: .08 },
    { id: 'q3', font: `800 52px ${SANS}`, col: ACC, text: 'military-industrial complex.”', y: 378, d: .16 },
    { id: 'q4', font: `500 24px ${MONO}`, col: DIM, text: 'DWIGHT D. EISENHOWER · 17 JANUARY 1961', y: 428, d: .3 },
  ], T.quote - .1, T.ww2 - .05);
  // WWII
  card(t, big('ww', '1941–45', 'WORLD WAR II · CAR PLANTS BUILD BOMBERS'), T.ww2, T.willow - .05);
  card(t, big('wr', 'WILLOW RUN', 'FORD · ~1 B-24 PER HOUR AT ITS 1944 PEAK', 0, 0, INK), T.willow, T.cold - .05);
  if (t > T.ww2 && t < T.cold) { const k = K.ww(t) * fade(t, T.plants, .4); tag('wb', k, V(1.6, TOP + .45, 0), 'BOMBERS OUT', 'schematic B-24s', 0); tag('wp', k, V(-.75, TOP + .85, 0), 'CAR PLANT', 'converted 1941', 0); }
  // Cold War spin-offs
  card(t, big('cw', '1947–91', 'COLD WAR ARMS RACE · MILITARY R&D SPIN-OFFS'), T.cold, T.today - .05);
  tag('ar', (t > T.cold && t < T.spin) ? fade(t, T.cold + .3, .3) * (1 - fade(t, T.spin - .25, .2)) : 0, V(0, TOP + 1.95, 0), 'ARMS RACE', 'missiles, bombs, budgets', 0);
  const SPN = [['JET ENGINE', 'wartime military push'], ['SATELLITE', 'Sputnik 1957, on a missile'], ['GPS', 'US military, from 1978'], ['ARPANET', 'Pentagon-funded, 1969']];
  SP.forEach((p, i) => tag('sp' + i, K.spin(t, i) * fade(t, [T.jetEng, T.sat, T.gps, T.arpa][i] + .2, .3), p.clone().setY(TOP + [0, 0, 1.5, 1.15][i]).add(V(0, 0, i < 2 ? .5 : 0)), SPN[i][0], SPN[i][1], i < 2 ? -50 : 0));
  // spending, then contractors
  card(t, big('sp', '$2.9 TRILLION', 'WORLD MILITARY SPENDING · 2025 · SIPRI'), T.trillion - .1, T.contracts - .05);
  card(t, big('tp', '$679 BILLION', 'SIPRI TOP 100 ARMS REVENUE · 2024'), T.b679 - .1, T.explode - .05);
  if (K.bars(t) > .01) {
    const A = [['UNITED STATES', '$954B'], ['CHINA', '$336B'], ['RUSSIA', '$190B']], Bn = [['TOP 100 TOTAL', '$679B'], ['#1 LOCKHEED MARTIN', '$64.7B'], ['', '']];
    bars.forEach((b, i) => { const h = b.visible ? b.scale.y : 0; const L = mk < .5 ? A[i] : Bn[i]; if (!L[0]) return; const k = K.bars(t) * (1 - Math.abs(mk - .5) * 0 ) * (mk > .2 && mk < .8 ? 0 : 1) * fade(t, T.spend + .3 + i * .15, .3);
      tag('bar' + i, k, V(BX[i], TOP + h + .12, 0), L[1], L[0], 30, ACC); });
  }
  // the jet, exploded
  if (ek > .05) {
    const jp = n => { const v = P[n].dir.clone().multiplyScalar(ek); return v; };
    const W2 = (x, y, z, n) => { const v = jp(n).add(V(x, y, z)); jetRoot.localToWorld(v.multiplyScalar(1)); return proj(v); };
    label(t, { id: 'en', t0: T.engine, t1: T.climate - .2, a: W2(-1.0, 0, .2, 'engine'), ly: 1210, idx: '01', name: 'Engine', spec: 'turbofan', side: 'R', lx: 120 });
    label(t, { id: 'ra', t0: T.radar, t1: T.climate - .2, a: W2(1.03, .1, .1, 'radar'), ly: 560, idx: '02', name: 'Radar', spec: 'in the nose', side: 'L', lx: 960 });
    label(t, { id: 'wi', t0: T.wings, t1: T.climate - .2, a: W2(-.6, 0, 1.0, 'wingR'), ly: 1080, idx: '03', name: 'Wings', spec: '', side: 'L', lx: 960 });
    label(t, { id: 'ci', t0: T.chips, t1: T.climate - .2, a: W2(.35, .0, .1, 'chips'), ly: 600, idx: '04', name: 'Chips', spec: 'avionics', side: 'R', lx: 120 });
  }
  card(t, big('jt', 'ONE FIGHTER JET', 'GENERIC SCHEMATIC · NOT A REAL AIRCRAFT', 0, 0, INK), T.explode, T.f35 - .05);
  card(t, big('f35', '1,900+ SUPPLIERS', 'F-35 PROGRAM · 48 US STATES · 10 COUNTRIES'), T.f35, T.climate - .05);
  // supplier lines to the jet
  if (sk > .01) {
    const [jx, jy] = proj(V(0, JY, 0)); g.strokeStyle = ACC; g.lineWidth = 1.5;
    sups.forEach(s => { if (!s.visible || s.scale.x < .3) return; const [x, y] = proj(s.position.clone().setY(TOP + .1)); g.globalAlpha = .4 * Math.min(1, s.scale.x) * (1 - fade(t, T.climate + .2, .6)); g.beginPath(); g.moveTo(x, y); g.lineTo(jx, jy); g.stroke(); });
  }
  // emissions
  card(t, big('em', '~5.5% OF EMISSIONS', 'GLOBAL MILITARY FOOTPRINT · ESTIMATE (SGR/CEOBS)'), T.pct - .1, T.voluntary - .05);
  card(t, big('vo', 'REPORTING: VOLUNTARY', 'MILITARY EMISSIONS · PARIS AGREEMENT', 0, 0, INK), T.voluntary - .05, T.race - .05);
  // drones
  card(t, big('dr', 'DRONES + AI', 'THE NEW ARMS RACE', 0, 0, INK), T.race, T.ukr - .05);
  card(t, big('uk', '~4 MILLION DRONES', 'UKRAINE · BUILT IN 2025 · ANALYST ESTIMATE'), T.ukr, T.closer - .05);
  // closer
  card(t, big('sm', 'SAME MACHINE', 'ALSO GAVE US GPS + THE INTERNET', 0, 0, INK), T.closer, T.steer - .05);
  card(t, big('st', 'WHO’S STEERING IT?', 'EISENHOWER’S QUESTION, 1961 → TODAY'), T.steer, T.next - .05);
  card(t, [{ id: 'e1', font: `800 84px ${SANS}`, col: INK, text: 'WHAT SHOULD WE', y: 270, d: 0 }, { id: 'e2', font: `800 84px ${SANS}`, col: ACC, text: 'TAKE APART NEXT?', y: 362, d: .1 }, { id: 'e3', font: `500 26px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 414, d: .35 }], T.next - .05, 99);
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
