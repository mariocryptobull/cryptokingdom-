// Marks layer: anchored labels, inset diagrams, cards, captions. 1080×1920.
import * as THREE from 'three';
import { clamp, seg, ss, eo, lerp } from '/core/lib.js';

const cv = document.getElementById('ov'), g = cv.getContext('2d');
const MONO = '"JBMono", monospace', SANS = '"Inter", sans-serif';
const INK = '#f1efe9', DIM = 'rgba(241,239,233,.66)', ACC = '#ff6b3d', CY = '#59d4ff', LINE = 'rgba(241,239,233,.78)';
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
    const w0 = g.measureText(it.text).width, s = Math.min(1, 980 / w0);
    g.save(); g.translate(Wd / 2, it.y + (1 - a) * 12); g.scale(s, s); g.fillText(it.text, 0, 0); g.restore(); g.shadowBlur = 0;
    const w = w0 * s;
    if (a > .99) texts.push({ id: it.id, text: it.text, x0: Wd / 2 - w / 2, y0: it.y - 70, x1: Wd / 2 + w / 2, y1: it.y + 14 });
    g.textAlign = 'left';
  }
}
const panel = (x, y, w, h, a) => { g.globalAlpha = a; g.fillStyle = 'rgba(14,15,17,.82)'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(241,239,233,.25)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2); };
const mono = (txt, x, y, col = INK, sz = 24, al = 'left', wt = 500) => { g.font = `${wt} ${sz}px ${MONO}`; g.fillStyle = col; g.textAlign = al; g.fillText(txt, x, y); g.textAlign = 'left'; };
const brackets = (x, y, w, h, col, lw = 3) => { const k = Math.min(w, h) * .3; g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) { g.moveTo(cx + sx * k, cy); g.lineTo(cx, cy); g.lineTo(cx, cy + sy * k); } g.stroke(); };

export function drawOverlay(t, cam, c) {
  CAM = cam; Wd = c.W; Hd = c.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { T, P, wp } = c;
  const at = (name, dx = 0, dy = 0, dz = 0) => { const p = new THREE.Vector3(); P[name].g.children[0].getWorldPosition(p); return proj(p.add(new THREE.Vector3(dx, dy, dz))); };
  const at3 = o => proj(wp(o));
  // title
  card(t, [
    { id: 't1', font: `800 84px ${SANS}`, col: INK, text: "WHAT'S INSIDE A", y: 270, d: .1 },
    { id: 't2', font: `800 84px ${SANS}`, col: ACC, text: 'MILITARY RECON DRONE?', y: 362, d: .2 },
    { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · GENERIC SCHEMATIC MODEL', y: 418, d: .4 },
  ], 0, T.air - .1);
  if (t < T.air) { g.globalAlpha = fade(t, .1, .5) * (1 - fade(t, T.air - .4, .3)); g.fillStyle = ACC; g.fillRect(Wd / 2 - 40, 160, 80 * eo(seg(t, .1, .7)), 6); }
  // part labels
  const wingP = new THREE.Vector3(); P.wing.g.getWorldPosition(wingP);
  label(t, { id: 'af', t0: T.air + .2, t1: T.motor - .05, a: proj(wp(P.wing.g.children[1]).add(new THREE.Vector3(.05, .09, -.45))), ly: 560, idx: '01', name: 'Airframe', spec: 'wing · fuselage · tail', side: 'R', lx: 120 });
  if (t > T.kilo && t < T.motor) { const k = win(t, T.kilo, T.motor); g.globalAlpha = k; panel(Wd / 2 - 300, 1170, 600, 120, k); mono('HAND-LAUNCHED · < 2 kg', Wd / 2, 1220, INK, 30, 'center', 600); mono('wingspan ≈ 1.4 m (e.g. RQ-11B Raven)', Wd / 2, 1262, DIM, 24, 'center'); }
  label(t, { id: 'mo', t0: T.motor + .2, t1: T.batt - .05, a: at('motor', .06, .03, 0), ly: 1150, idx: '02', name: 'Electric motor + prop', spec: 'spins one propeller', side: 'L', lx: 960 });
  label(t, { id: 'ba', t0: T.batt + .2, t1: T.fc - .05, a: at('batt', 0, .02, 0), ly: 1150, idx: '03', name: 'Battery pack', spec: 'rechargeable · ~60–90 min', side: 'R', lx: 120 });
  label(t, { id: 'fc', t0: T.fc + .2, t1: T.auto - .05, a: at3(c.imu), ly: 560, idx: '04', name: 'Flight controller', spec: 'IMU: gyros + accelerometers', side: 'R', lx: 120 });
  label(t, { id: 'gp', t0: T.gps + .1, t1: T.auto - .05, a: at('gps', 0, .02, 0), ly: 1150, idx: '05', name: 'GPS receiver', spec: 'where am I?', side: 'R', lx: 120 });
  // autopilot: waypoint inset
  if (t > T.auto - .2 && t < T.link) {
    const k = win(t, T.auto - .2, T.link); const X = 190, Y = 1040, Wb = 700, Hb = 300; panel(X, Y, Wb, Hb, k);
    mono('06 · AUTOPILOT', X + 24, Y + 42, ACC, 24); mono(t > T.manual ? 'MANUAL OVERRIDE' : 'AUTO · WAYPOINTS', X + Wb - 24, Y + 42, t > T.manual ? ACC : CY, 22, 'right');
    const WP = [[.12, .75], [.35, .3], [.62, .62], [.86, .28], [.9, .78]].map(([u, v]) => [X + 40 + u * (Wb - 80), Y + 70 + v * (Hb - 100)]);
    const pk = seg(t, T.way, T.way + 2.0); g.globalAlpha = k; g.setLineDash([10, 10]); g.strokeStyle = 'rgba(241,239,233,.6)'; g.lineWidth = 3; g.beginPath(); WP.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.setLineDash([]);
    WP.forEach(([x, y], i) => { const a = fade(t, T.way + i * .45, .2); if (a <= 0) return; g.globalAlpha = k * a; g.fillStyle = CY; g.beginPath(); g.arc(x, y, 10, 0, 7); g.fill(); mono(String(i + 1), x, y - 18, INK, 20, 'center'); });
    // little plane icon follows the route
    const u = clamp((t - T.way) / (T.link - T.way - .3)) * (WP.length - 1), i0 = Math.min(WP.length - 2, Math.floor(u)), f = u - i0;
    const [x0, y0] = WP[i0], [x1, y1] = WP[i0 + 1], px = lerp(x0, x1, f), py = lerp(y0, y1, f), ang = Math.atan2(y1 - y0, x1 - x0);
    g.globalAlpha = k; g.save(); g.translate(px, py); g.rotate(ang); g.fillStyle = INK; g.beginPath(); g.moveTo(16, 0); g.lineTo(-10, -14); g.lineTo(-4, 0); g.lineTo(-10, 14); g.closePath(); g.fill(); g.restore();
    if (k > .99) texts.push({ id: 'ap', text: 'AUTOPILOT', x0: X, y0: Y, x1: X + Wb, y1: Y + Hb });
  }
  // datalink: radio waves from the antenna + ground station
  label(t, { id: 'dl', t0: T.link + .2, t1: T.nose - .05, a: at('radio', 0, .02, 0), ly: 560, idx: '07', name: 'Radio datalink', spec: 'live video ↓ · commands ↑', side: 'R', lx: 120 });
  if (t > T.link && t < T.nose) {
    const k = win(t, T.link, T.nose); const [ax, ay] = at3(c.antTip); const gx = 250, gy = 1230;
    g.globalAlpha = k; g.strokeStyle = CY; g.lineWidth = 3;
    for (let i = 0; i < 4; i++) { const ph = ((t - T.link) * .9 + i / 4) % 1, x = lerp(ax, gx, ph), y = lerp(ay, gy, ph); g.globalAlpha = k * (1 - ph) * .9; g.beginPath(); g.arc(x, y, 18 + 30 * ph, 0, 7); g.stroke(); }
    g.globalAlpha = k; g.fillStyle = INK; g.fillRect(gx - 40, gy, 80, 46); g.fillStyle = '#0d1a24'; g.fillRect(gx - 32, gy + 6, 64, 30); g.fillStyle = INK; g.fillRect(gx - 3, gy - 40, 6, 40); g.beginPath(); g.arc(gx, gy - 44, 8, 0, 7); g.fill();
    mono('GROUND STATION', gx, gy + 86, INK, 24, 'center', 600);
    if (t > T.km) { g.globalAlpha = k * fade(t, T.km, .3); mono('≈ 10 km link', gx, gy + 120, ACC, 28, 'center', 600); }
  }
  // gimbal turret
  label(t, { id: 'gb', t0: T.turret + .1, t1: T.re, a: at3(c.ball), ly: 560, idx: '08', name: 'Gimbal camera turret', spec: 'stabilized · EO + IR', side: 'R', lx: 120 });
  if (t > T.eoir && t < T.re) { const k = win(t, T.eoir, T.re); panel(Wd / 2 - 330, 1150, 660, 110, k); mono('DAYLIGHT (EO)  +  THERMAL (IR)', Wd / 2, 1200, INK, 30, 'center', 600); mono('the turret keeps the camera on one spot', Wd / 2, 1240, DIM, 22, 'center'); }
  // software section
  card(t, [{ id: 'p1', font: `800 72px ${SANS}`, col: INK, text: 'PALANTIR ≠ DRONE MAKER', y: 280, d: .1 }, { id: 'p2', font: `600 40px ${SANS}`, col: ACC, text: 'it builds the software layer', y: 340, d: T.soft - T.pal }], T.pal - .1, T.maven - .1);
  card(t, [{ id: 'm1', font: `800 64px ${SANS}`, col: ACC, text: 'MAVEN SMART SYSTEM', y: 230, d: 0 }, { id: 'm2', font: `500 26px ${MONO}`, col: INK, text: 'Pentagon AI program · software by Palantir', y: 276, d: .25 }], T.maven - .1, T.next - .1);
  if (c.feed) {
    const k = win(t, T.maven - .2, T.next); const X = Wd / 2 - 270, Y = 320, FW = 540, FH = 312; panel(X - 10, Y - 10, FW + 20, FH + 56, k);
    g.globalAlpha = k; g.filter = 'grayscale(1) contrast(1.35) brightness(1.1)'; g.drawImage(c.feed, X, Y, FW, FH); g.filter = 'none';
    // crosshair + flagged objects in the feed
    g.strokeStyle = 'rgba(241,239,233,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X + FW / 2 - 24, Y + FH / 2); g.lineTo(X + FW / 2 + 24, Y + FH / 2); g.moveTo(X + FW / 2, Y + FH / 2 - 24); g.lineTo(X + FW / 2, Y + FH / 2 + 24); g.stroke();
    mono('● LIVE · DRONE VIDEO', X + 12, Y + FH + 34, ACC, 22, 'left', 600); mono('IR', X + FW - 12, Y + FH + 34, DIM, 22, 'right');
    if (t > T.flag) c.VEH.forEach((v, i) => { const a = fade(t, T.flag + .25 + i * .35, .2); if (a <= 0) return; v3.copy(v.position).project(c.feedCam); if (Math.abs(v3.x) > .95 || Math.abs(v3.y) > .9) return;
      const fx = X + (v3.x + 1) / 2 * FW, fy = Y + (1 - v3.y) / 2 * FH; g.globalAlpha = k * a; brackets(fx - 26, fy - 20, 52, 40, '#ffd34d', 3); mono('OBJECT?', fx, fy - 28, '#ffd34d', 18, 'center', 600); });
    if (k > .99) texts.push({ id: 'feed', text: 'DRONE VIDEO', x0: X, y0: Y, x1: X + FW, y1: Y + FH + 40 });
  }
  // other feeds flowing in (left/right chips) during "fuses drone video with other feeds"
  if (t > T.fuse - .2 && t < T.next) {
    const k = win(t, T.fuse - .2, T.next); const chips = [['DRONE VIDEO', 120], ['SATELLITE', 380], ['RADAR', 640], ['REPORTS', 900]];
    chips.forEach(([s, x], i) => { const a = k * fade(t, T.fuse + i * .2, .25); if (a <= 0) return; g.globalAlpha = a; g.fillStyle = 'rgba(14,15,17,.82)'; g.fillRect(x - 110, 720, 220, 50); g.strokeStyle = CY; g.lineWidth = 2; g.strokeRect(x - 109, 721, 218, 48); mono(s, x, 754, INK, 22, 'center', 600);
      const ph = ((t - T.fuse) * .8 + i * .25) % 1; g.globalAlpha = a * .8; g.fillStyle = CY; g.beginPath(); g.arc(lerp(x, Wd / 2, ph), lerp(770, 860, ph), 6, 0, 7); g.fill(); });
    g.globalAlpha = k * fade(t, T.fuse + .8, .3); g.fillStyle = CY; g.beginPath(); g.arc(Wd / 2, 862, 12, 0, 7); g.fill(); mono('ONE MAP', Wd / 2 + 24, 870, CY, 22, 'left', 600);
  }
  // map pins over the 3D vehicles + analyst panel
  if (t > T.map - .1 && t < T.next) {
    const k = win(t, T.map - .1, T.next);
    c.VEH.forEach((v, i) => { const a = k * fade(t, T.map + i * .25, .25); if (a <= 0) return; const [x, y] = proj(v.position); g.globalAlpha = a; g.fillStyle = '#ffd34d'; g.beginPath(); g.moveTo(x, y - 6); g.arc(x, y - 34, 16, Math.PI * .8, Math.PI * .2); g.closePath(); g.fill(); g.fillStyle = '#141518'; g.beginPath(); g.arc(x, y - 34, 6, 0, 7); g.fill(); });
    const X = 190, Y = 1530, Wb = 700, Hb = 210; panel(X, Y, Wb, Hb, k);
    mono('ANALYST REVIEW', X + 24, Y + 44, ACC, 24, 'left', 600); mono('humans decide', X + Wb - 24, Y + 44, DIM, 22, 'right');
    ['object 1 · flagged · pending', 'object 2 · flagged · pending', 'object 3 · flagged · pending'].forEach((s, i) => { g.globalAlpha = k * fade(t, T.map + .3 + i * .25, .25); mono('▸ ' + s, X + 24, Y + 94 + i * 38, INK, 24); });
  }
  // closer
  card(t, [{ id: 'n1', font: `800 80px ${SANS}`, col: INK, text: 'WHAT SHOULD WE', y: 290, d: 0 }, { id: 'n2', font: `800 80px ${SANS}`, col: ACC, text: 'TAKE APART NEXT?', y: 380, d: .1 }, { id: 'n3', font: `500 28px ${MONO}`, col: DIM, text: 'tell us in the comments', y: 436, d: .3 }], T.next - .1, T.congrats - .05);
  card(t, [{ id: 'e1', font: `800 84px ${SANS}`, col: ACC, text: 'CONGRATS!', y: 290, d: 0 }, { id: 'e2', font: `700 52px ${SANS}`, col: INK, text: "You've discovered the recon drone", y: 364, d: .2 }, { id: 'e3', font: `500 26px ${MONO}`, col: DIM, text: 'GENERIC SCHEMATIC MODEL · SOURCES IN CAPTION', y: 420, d: .5 }], T.congrats - .05, 99);
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
