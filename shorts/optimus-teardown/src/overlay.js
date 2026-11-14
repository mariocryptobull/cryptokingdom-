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

const wp = (o, x = 0, y = 0, z = 0) => o.localToWorld(new THREE.Vector3(x, y, z));
function pill(t, text, x, y, t0, t1, col = ACC) {
  const a = fade(t, t0, .3) * (1 - fade(t, t1 - .3, .3)); if (a <= 0) return;
  g.globalAlpha = a; g.font = `600 26px ${MONO}`; const w = g.measureText(text).width + 32;
  g.fillStyle = col; g.beginPath(); g.roundRect(x - w / 2, y - 30, w, 44, 22); g.fill();
  g.fillStyle = '#111'; g.textAlign = 'center'; g.fillText(text, x, y + 1); g.textAlign = 'left';
}
export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, bot, prs, ghost } = c, J = bot.J;
  // hook
  card(t, [
    { id: 'h1', font: `800 92px ${SANS}`, col: INK, text: 'HOW WILL ROBOTS', y: 280, d: .05 },
    { id: 'h2', font: `800 92px ${SANS}`, col: ACC, text: 'RISE TO POWER?', y: 380, d: .25 },
  ], 0, T.this);
  // reveal
  card(t, [
    { id: 'o1', font: `800 110px ${SANS}`, col: INK, text: 'OPTIMUS', y: 290, d: 0 },
    { id: 'o2', font: `500 28px ${MONO}`, col: DIM, text: "TESLA'S HUMANOID · SCHEMATIC MODEL", y: 345, d: .25 },
  ], T.optimus - .1, T.rule + .1);
  card(t, [
    { id: 'w1', font: `800 84px ${SANS}`, col: INK, text: 'NOT TO RULE.', y: 280, d: 0 },
    { id: 'w2', font: `800 84px ${SANS}`, col: ACC, text: 'TO WORK.', y: 372, d: .9 },
  ], T.rule + .1, T.inside - .1);
  // actuators
  card(t, [
    { id: 'a1', font: `800 120px ${SANS}`, col: INK, text: '28 ACTUATORS', y: 300, d: 0 },
    { id: 'a2', font: `500 28px ${MONO}`, col: DIM, text: 'BODY · 6 DESIGNS · AI DAY 2022', y: 356, d: .3 },
  ], T.act28 - .1, T.rot2 - .1);
  if (t > T.rotary - .1 && t < T.rot2) { const a = fade(t, T.rotary - .1, .3) * (1 - fade(t, T.rot2 - .3, .3)); g.globalAlpha = a; g.font = `700 40px ${SANS}`; g.textAlign = 'center';
    g.fillStyle = '#3d8bff'; g.beginPath(); g.arc(Wd / 2 - 250, 432, 13, 0, 7); g.fill(); g.fillStyle = INK; g.fillText('3 rotary', Wd / 2 - 150, 446);
    if (t > T.linear - .1) { g.globalAlpha = a * fade(t, T.linear - .1, .3); g.fillStyle = ACC; g.beginPath(); g.arc(Wd / 2 + 60, 432, 13, 0, 7); g.fill(); g.fillStyle = INK; g.fillText('3 linear', Wd / 2 + 160, 446); }
    g.textAlign = 'left'; }
  label(t, { id: 'rot', t0: T.rot2 + .1, t1: T.lin2 + .1, a: proj(wp(J.shL)), ly: 520, idx: 'ROTARY', name: 'Rotary actuator', spec: 'twists a joint', side: 'R', lx: 120 });
  label(t, { id: 'lin', t0: T.lin2 + .1, t1: T.prs0 + .1, a: proj(wp(J.hipL, .03, -.2, -.03)), ly: 1180, idx: 'LINEAR', name: 'Linear actuator', spec: 'pushes, like a muscle', side: 'R', lx: 120 });
  label(t, { id: 'prs', t0: T.prs + .1, t1: T.hands - .2, a: proj(wp(prs, 0, .1, .07)), ly: 520, idx: 'INSIDE', name: 'Planetary roller screw', spec: 'rollers orbit a screw', side: 'R', lx: 110 });
  card(t, [
    { id: 'p1', font: `800 96px ${SANS}`, col: ACC, text: '~500 kg PIANO', y: 1200, d: 0 },
    { id: 'p2', font: `500 28px ${MONO}`, col: INK, text: 'LIFTED BY ONE LINEAR ACTUATOR · AI DAY 2022', y: 1252, d: .25 },
  ], T.piano - .1, T.hands - .1);
  // hands
  card(t, [
    { id: 'd1', font: `800 140px ${SANS}`, col: INK, text: '22 DoF', y: 310, d: 0 },
    { id: 'd2', font: `500 28px ${MONO}`, col: DIM, text: 'PER HAND · LATEST PUBLIC HAND (2024)', y: 366, d: .3 },
  ], T.dof - .1, T.power - .1);
  if (t > T.double - .1 && t < T.power) { const a = fade(t, T.double - .1, .3) * (1 - fade(t, T.power - .3, .3)); g.globalAlpha = a; g.textAlign = 'center'; g.font = `700 54px ${SANS}`; g.fillStyle = DIM; g.fillText('11', Wd / 2 - 110, 1590); g.fillStyle = INK; g.fillText('→', Wd / 2, 1590); g.fillStyle = ACC; g.fillText('22', Wd / 2 + 110, 1590);
    g.font = `500 24px ${MONO}`; g.fillStyle = DIM; g.fillText('GEN 1–2 HANDS        NEW HAND', Wd / 2, 1632); g.textAlign = 'left'; }
  // battery / sensors / computer
  label(t, { id: 'bat', t0: T.kwh, t1: T.eyes - .1, a: proj(wp(bot.batt, 0, 0, .07)), ly: 1150, idx: 'POWER', name: 'Battery pack', spec: '2.3 kWh · 52 V · in the torso', side: 'R', lx: 110 });
  label(t, { id: 'cam', t0: T.cams, t1: T.brain + .1, a: proj(wp(J.head, .035, .11, .08)), ly: 560, idx: 'EYES', name: 'Autopilot cameras', spec: 'vision only', side: 'R', lx: 120 });
  label(t, { id: 'fsd', t0: T.fsd - .05, t1: T.learn - .2, a: proj(wp(bot.comp, .04, 0, .02)), ly: 1150, idx: 'BRAIN', name: 'FSD computer', spec: "Tesla's self-driving chip", side: 'R', lx: 110 });
  // learning
  if (ghost.root.visible) { const a = fade(t, T.show - .1, .3) * (1 - fade(t, T.sim + .3, .3)); if (a > 0) { const [x, y] = proj(wp(ghost.J.head, 0, .32, 0)); pill(t, 'HUMAN DEMO', x, y, T.show - .1, T.sim + .3, '#59d4ff'); const [x2, y2] = proj(wp(J.head, 0, .32, 0)); pill(t, 'OPTIMUS COPIES', x2, y2, T.show + .4, T.sim + .3); } }
  card(t, [
    { id: 's1', font: `800 96px ${SANS}`, col: '#59d4ff', text: 'SIMULATION', y: 300, d: 0 },
    { id: 's2', font: `500 28px ${MONO}`, col: INK, text: 'PRACTICE IN SOFTWARE → REAL BODY', y: 352, d: .25 },
  ], T.sim - .1, T.plan - .1);
  // plan
  if (t > T.plan - .1 && t < T.goals) { const a = fade(t, T.plan - .1, .3) * (1 - fade(t, T.goals - .3, .3));
    g.globalAlpha = a; g.textAlign = 'center'; g.font = `500 28px ${MONO}`; g.fillStyle = DIM; g.fillText("TESLA'S STATED PLAN", Wd / 2, 230);
    const steps = [['FACTORIES', T.fact], ['COMPANIES', T.comp], ['HOMES', T.homes]];
    steps.forEach(([s, ts], i) => { const k = fade(t, ts - .1, .3); const on = t > ts - .1 && (i === 2 || t < steps[i + 1][1] - .1); g.globalAlpha = a * (.25 + .75 * k); g.font = `800 64px ${SANS}`; g.fillStyle = on ? ACC : INK; g.fillText(s, Wd / 2, 320 + i * 86); if (i < 2) { g.font = `500 30px ${MONO}`; g.fillStyle = DIM; g.fillText('↓', Wd / 2, 350 + i * 86); } });
    g.globalAlpha = a * fade(t, T.homes + .3, .3); pill(t, 'LATER', Wd / 2 + 210, 488, T.homes + .3, T.goals, '#f1efe9'); g.textAlign = 'left'; }
  // goals
  card(t, [
    { id: 'g1', font: `800 110px ${SANS}`, col: INK, text: '20,000 / WEEK', y: 300, d: 0 },
    { id: 'g2', font: `500 28px ${MONO}`, col: DIM, text: 'FREMONT LINE DESIGN RATE · NOT YET REACHED', y: 352, d: .25 },
  ], T.line - .1, T.price - .1);
  card(t, [
    { id: 'g3', font: `800 120px ${SANS}`, col: INK, text: '$20–30K', y: 300, d: 0 },
    { id: 'g4', font: `500 28px ${MONO}`, col: DIM, text: "MUSK'S PRICE TARGET · NOT ON SALE", y: 352, d: .25 },
  ], T.price - .1, T.course - .1);
  pill(t, 'GOAL', Wd / 2, 160, T.line - .1, T.course - .1);
  // closer + end
  card(t, [
    { id: 'e1', font: `800 80px ${SANS}`, col: INK, text: 'WHAT SHOULD WE', y: 280, d: .05 },
    { id: 'e2', font: `800 80px ${SANS}`, col: ACC, text: 'TAKE APART NEXT?', y: 370, d: .2 },
    { id: 'e3', font: `500 26px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 424, d: .5 },
  ], T.next - .1, 999);
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
