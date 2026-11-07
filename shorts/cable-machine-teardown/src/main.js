// Why 50 lb on the cable machine feels lighter — Exploded Teardown, 1080×1920.
// One side of a cable station (schematic, roughly to scale in metres): weight stack on two guide rods, selector pin,
// head plate carrying a movable pulley, a fixed anchor, three fixed pulleys and a handle. The cable lies in the z = 0 plane
// (x right, y up, z toward camera). In 2:1 the stack hangs from the movable pulley, so the handle travels 2× the stack.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, eio, eo, track } from '/core/lib.js';
import { initOverlay, drawOverlay, overlayTexts } from './overlay.js';

const W = 1080, H = 1920;
const Q = new URLSearchParams(location.search);
const SSAA = +(Q.get('ssaa') || 1);
const TL = await (await fetch('timeline.json')).json();
const VDUR = await (await fetch('voice/dur.json')).json();
const DUR = TL.dur;
const CUES = []; for (let li = 0; li < TL.vo.length; li++) { const v = TL.vo[li], d = VDUR[v.id]; const n = v.chunks.map(c => c.replace(/[^A-Za-z0-9]/g, '').length + 2), tot = n.reduce((a, b) => a + b, 0); let t = v.t; v.chunks.forEach((c, i) => { CUES.push({ id: v.id, i, t }); t += d * n[i] / tot; }); }
const cue = (id, i) => CUES.find(c => c.id === id && c.i === i).t;
const vend = id => { const v = TL.vo.find(x => x.id === id); return v.t + VDUR[id]; };
const T = {
  apart: cue('v01', 3), stack: cue('v02', 0), rods: cue('v02', 1), pin: cue('v02', 2), pin2: cue('v02', 3),
  cable: cue('v03', 0), pulleys: cue('v03', 1), handle: cue('v03', 2),
  one: cue('v04', 0), one2: cue('v04', 1), fifty: cue('v04', 2), fifty2: cue('v04', 3),
  but: cue('v05', 0), movable: cue('v05', 1), strands: cue('v05', 2), share: cue('v05', 3),
  half: cue('v06', 0), feel: cue('v06', 1), price: cue('v06', 2), rises: cue('v06', 3), e06: vend('v06'),
  fd: cue('v07', 0), four: cue('v07', 1), quarter: cue('v07', 2), e07: vend('v07'),
  real: cue('v08', 0), fric: cue('v08', 1), lifting: cue('v08', 2), lowering: cue('v08', 3), e08: vend('v08'),
  stretch: cue('v09', 0), mm: cue('v09', 1), e09: vend('v09'),
  pay: cue('v10', 0), pay2: cue('v10', 1), pull30: cue('v10', 2), let20: cue('v10', 3), e10: vend('v10'),
  next: cue('v11', 0), congrats: cue('v12', 0), card: cue('v12', 1),
};
T.asm = T.one - .9;   // reassemble just before "Tie the cable straight…"
window.T = T;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, .1, 100);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, ao: false });
post.bloom.strength = .45; post.bloom.radius = .5; post.bloom.threshold = 2.0;
post.vig.uniforms.amt.value = .34; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .1;
{
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createRadialGradient(560, 900, 80, 540, 960, 1500); gr.addColorStop(0, '#34363a'); gr.addColorStop(.45, '#222427'); gr.addColorStop(1, '#0d0e10');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = .55; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff1e2', 1.6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: .5, far: 30 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 5, 6, 3); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .6, 6, 6); scene.add(top);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .25));

// ---------- materials ----------
const M = {
  base: new THREE.MeshPhysicalMaterial({ color: '#2b2e33', roughness: .5, metalness: .3, clearcoat: .2 }),
  frame: new THREE.MeshPhysicalMaterial({ color: '#3a3e44', roughness: .45, metalness: .5, clearcoat: .4 }),
  plate: new THREE.MeshPhysicalMaterial({ color: '#25272b', roughness: .4, metalness: .6, clearcoat: .3 }),
  head: new THREE.MeshPhysicalMaterial({ color: '#e3a62c', roughness: .35, metalness: .4, clearcoat: .6 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#d4d8dc', roughness: .15, metalness: 1 }),
  sheave: new THREE.MeshPhysicalMaterial({ color: '#c9ccd0', roughness: .3, metalness: .8, clearcoat: .4, emissive: '#ff6b3d', emissiveIntensity: 0 }),
  moving: new THREE.MeshPhysicalMaterial({ color: '#2f6fe0', roughness: .35, metalness: .3, clearcoat: .6, emissive: '#2f6fe0', emissiveIntensity: 0 }),
  steel: new THREE.MeshStandardMaterial({ color: '#4a5056', roughness: .45, metalness: .7 }),
  cable: new THREE.MeshPhysicalMaterial({ color: '#16171a', roughness: .35, clearcoat: .8, emissive: '#59d4ff', emissiveIntensity: 0 }),
  bead: new THREE.MeshBasicMaterial({ color: '#ff8a5c' }),
  grip: new THREE.MeshPhysicalMaterial({ color: '#1b1c1f', roughness: .8 }),
  pin: new THREE.MeshPhysicalMaterial({ color: '#ff6b3d', roughness: .35, clearcoat: .6 }),
};
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const cyl = (r, h, mat, x = 0, y = 0, z = 0, seg = 24) => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat)); m.position.set(x, y, z); return m; };

// ---------- dimensions ----------
const R = .06;                       // sheave radius (≈4.7 in)
const NPL = 10, PH = .05, PG = .006, PW = .40, PD = .20, PY0 = .10, PIN = 5;   // plates: index 0 = bottom (100 lb) … 9 = top (10 lb); pin under index 5 = "50"
const plateY = i => PY0 + i * (PH + PG) + PH / 2;
const STOP = PY0 + NPL * (PH + PG);  // top of stack at rest
const HEADY = STOP + .02;            // head plate centre
const MY0 = HEADY + .12;             // movable pulley centre at rest
const P1 = new THREE.Vector3(2 * R, 2.24, 0), P2 = new THREE.Vector3(1.0, 2.24, 0), P3 = new THREE.Vector3(1.0 + 2 * R, 1.05, 0);
const AY = 2.30;                     // anchor height (on the top beam)
const L0 = .14, LMAX = .3048;        // handle rest offset; full stack lift = 1 ft
const RODX = .15;

// ---------- frame ----------
const frame = new THREE.Group(); scene.add(frame);
scene.add(box(1.9, .05, .7, M.base, .45, .025, -.05));
frame.add(box(.08, 2.42, .08, M.frame, -.34, 1.21, -.16), box(.08, 2.42, .08, M.frame, .34, 1.21, -.16));
frame.add(box(1.62, .09, .1, M.frame, .44, 2.39, -.13));
frame.add(box(.09, 2.42, .09, M.frame, 1.21, 1.21, -.14));
frame.add(box(.08, .06, .12, M.steel, -R, AY + .02, -.05));        // anchor block
const anchorEye = new THREE.Mesh(new THREE.TorusGeometry(.022, .007, 8, 20), M.chrome); anchorEye.position.set(-R, AY - .01, 0); frame.add(sh(anchorEye));
// guide rods (own group so they can explode separately)
const rods = new THREE.Group(); scene.add(rods);
for (const s of [-1, 1]) rods.add(cyl(.012, 2.2, M.chrome, s * RODX, 1.16, 0, 16));
rods.add(box(.5, .04, .1, M.steel, 0, 2.27, 0));   // rod top tie

// ---------- weight stack (plates with numbers on the front face) ----------
const numTex = n => { const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#25272b'; g.fillRect(0, 0, 512, 64); g.fillStyle = '#d8d4c8'; g.font = '700 40px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 256, 34); g.fillStyle = '#111'; g.fillRect(150, 26, 18, 14); g.fillRect(344, 26, 18, 14); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const plates = [];
for (let i = 0; i < NPL; i++) {
  const lb = (NPL - i) * 10, front = new THREE.MeshPhysicalMaterial({ map: numTex(lb), roughness: .45, metalness: .4, clearcoat: .3 });
  const m = sh(new THREE.Mesh(new THREE.BoxGeometry(PW, PH, PD), [M.plate, M.plate, M.plate, M.plate, front, M.plate]));
  scene.add(m); plates.push({ m, lb, i });
}
// head plate + selector stem + movable pulley bracket (they all ride with the lifted plates)
const headG = new THREE.Group(); scene.add(headG);
headG.add(box(PW, .04, PD, M.head, 0, 0, 0));
headG.add(cyl(.011, STOP - plateY(PIN) + .02, M.chrome, 0, -(STOP - plateY(PIN)) / 2, .0, 12));   // stem down through the stack
const attach = box(.03, .03, .03, M.steel, R, .035, 0); headG.add(attach);                         // 1:1 cable end
const mvG = new THREE.Group(); headG.add(mvG);
mvG.add(box(.02, .14, .07, M.head, 0, .06, -.04));
const sheaveGeo = (() => { const g = new THREE.CylinderGeometry(R, R, .028, 40); g.rotateX(Math.PI / 2); return g; })();
const sheaveRim = (() => { const g = new THREE.TorusGeometry(R - .004, .007, 8, 40); return g; })();
const mkSheave = mat => { const g = new THREE.Group(); g.add(sh(new THREE.Mesh(sheaveGeo, mat))); for (const z of [-.016, .016]) { const r = sh(new THREE.Mesh(sheaveRim, mat)); r.position.z = z; g.add(r); } const hub = cyl(.016, .05, M.steel); hub.rotation.x = Math.PI / 2; g.add(hub); const sp = []; for (let k = 0; k < 4; k++) { const s = box(.008, R * 1.6, .03, M.steel); s.rotation.z = k * Math.PI / 4; g.add(s); sp.push(s); } return g; };
const mvSheave = mkSheave(M.moving); mvSheave.position.y = MY0 - HEADY; mvG.add(mvSheave);
// selector pin (along z, through the plate marked 50)
const pinG = new THREE.Group(); scene.add(pinG);
{ const shaft = cyl(.009, .26, M.chrome); shaft.rotation.x = Math.PI / 2; shaft.position.z = .0; pinG.add(shaft);
  const knob = cyl(.03, .04, M.pin); knob.rotation.x = Math.PI / 2; knob.position.z = .14; pinG.add(knob);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.03, .007, 8, 24), M.pin); ring.position.set(0, -.045, .16); ring.rotation.x = .3; pinG.add(sh(ring)); }

// ---------- fixed pulleys ----------
const fixed = [P1, P2, P3].map((p, k) => { const g = new THREE.Group(); g.add(mkSheave(M.sheave)); const br = box(.02, .16, .1, M.steel, 0, k === 2 ? -.02 : .06, -.05); g.add(br); scene.add(g); return { g, p }; });
const carriage = box(.14, .22, .12, M.frame, 1.21, P3.y, -.06); frame.add(carriage);
// handle (D-handle)
const handle = new THREE.Group(); scene.add(handle);
{ const ring = new THREE.Mesh(new THREE.TorusGeometry(.065, .011, 10, 30, Math.PI * 1.25), M.chrome); ring.rotation.z = -Math.PI * .625 + Math.PI / 2; ring.position.x = .06; handle.add(sh(ring));
  const grip = cyl(.018, .12, M.grip, .118, 0, 0); handle.add(grip); const clip = cyl(.012, .03, M.steel); clip.rotation.z = Math.PI / 2; clip.position.x = .005; handle.add(clip); }

// ---------- cable ----------
class Poly extends THREE.Curve { constructor(p) { super(); this.p = p; this.c = [0]; for (let i = 1; i < p.length; i++) this.c.push(this.c[i - 1] + p[i].distanceTo(p[i - 1])); this.L = this.c[this.c.length - 1]; }
  getPoint(u, o = new THREE.Vector3()) { const s = u * this.L; let i = 1; while (i < this.c.length - 1 && this.c[i] < s) i++; const a = this.c[i - 1], b = this.c[i]; return o.lerpVectors(this.p[i - 1], this.p[i], b > a ? (s - a) / (b - a) : 0); } }
const cableMesh = sh(new THREE.Mesh(new THREE.BufferGeometry(), M.cable)); scene.add(cableMesh);
const BEADN = 34, beads = [...Array(BEADN)].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(.011, 10, 8), M.bead); scene.add(m); return m; });
const arc = (out, c, a0, a1, n = 12) => { for (let k = 0; k <= n; k++) { const a = lerp(a0, a1, k / n); out.push(new THREE.Vector3(c.x + R * Math.cos(a), c.y + R * Math.sin(a), c.z)); } };

// ---------- motion ----------
const pop = x => 1 - Math.pow(1 - ss(x), 3);
const explK = t => pop(seg(t, T.stack - .3, T.stack + 1.0)) * (1 - eio(seg(t, T.asm, T.asm + 1.0)));
// reps: [start, end] windows; the handle comes out, holds, goes back
const REPS = [[.5, 3.6], [T.fifty - .2, T.but - .1], [T.price - .3, T.e06 + .2], [T.four, T.e07 - .1], [T.lifting - .3, T.lifting - .3 + (T.lowering + .1 - T.lifting + .3) / .55], [T.pull30 - .3, T.pull30 - .3 + (T.let20 + .1 - T.pull30 + .3) / .55]];
const repK = (t, a, b) => { const u = seg(t, a, b); return u < .42 ? eio(u / .42) : u < .55 ? 1 : 1 - eio((u - .55) / .45); };
const lift = t => { let v = 0; for (const [a, b] of REPS) if (t > a && t < b) v = Math.max(v, repK(t, a, b)); return v * LMAX; };
const ratioAt = t => (t >= T.one - .5 && t < T.movable) ? 1 : 2;             // 1:1 demo during v04
const mvPop = t => t < T.one - .5 ? 1 : t < T.movable ? 0 : back1(seg(t, T.movable, T.movable + .6));
function back1(x) { x = clamp(x) - 1; return 1 + x * x * (2.6 * x + 1.6); }

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, 16, 8, 8.5, .8, 1.3, 0],
  [T.apart, 22, 9, 8.3, .75, 1.3, 0],
  [T.stack + 1.0, 36, 12, 7.6, .55, 1.4, 0],
  [T.rods + .6, 40, 12, 7.0, .3, 1.35, 0],
  [T.pin + .5, 42, 10, 5.4, .25, 1.15, 0],
  [T.cable, 34, 11, 7.6, .6, 1.45, 0],
  [T.pulleys + .5, 26, 14, 6.6, .7, 1.7, 0],
  [T.asm + 1.1, 12, 6, 9.0, .98, 1.3, 0],
  [T.fifty2, 10, 6, 9.0, .98, 1.3, 0],
  [T.movable + .3, 16, 7, 5.0, .25, .95, 0],
  [T.share, 14, 6, 5.4, .3, 1.05, 0],
  [T.feel, 8, 5, 9.0, .98, 1.3, 0],
  [T.e07, 12, 6, 9.0, .98, 1.3, 0],
  [T.fric, 20, 8, 8.9, .98, 1.35, 0],
  [T.e08, 16, 7, 9.0, .98, 1.32, 0],
  [T.stretch + .6, 18, 12, 6.4, .6, 1.6, 0],
  [T.e09, 14, 10, 6.8, .7, 1.5, 0],
  [T.pay + .4, 8, 5, 9.0, .98, 1.3, 0],
  [T.e10, 8, 5, 9.0, .98, 1.3, 0],
  [T.next + .6, 14, 8, 9.3, .9, 1.35, 0],
  [DUR, 20, 12, 9.8, .82, 1.4, 0],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz] = camTrack(t); const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 200; post.dof.maxCoc = 8;
  const la = A - .9; key.position.set(tx + 6 * Math.sin(la), ty + 7, tz + 6 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 5 * Math.sin(A + Math.PI * .85), ty + 2, tz + 5 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 5, tz); top.lookAt(tx, ty, tz);
}

// ---------- events (foley) ----------
const EV = [{ t: T.stack - .2, type: 'spread' }, { t: T.stack + .3, type: 'label' }, { t: T.rods + .2, type: 'label' }, { t: T.pin + .2, type: 'label' }, { t: T.cable + .2, type: 'label' },
  { t: T.pulleys + .2, type: 'label' }, { t: T.asm + .9, type: 'land' }, { t: T.movable, type: 'clunk' }, { t: T.fric + .2, type: 'label' }, { t: T.mm + .2, type: 'label' },
  { t: T.next, type: 'card' }, { t: T.card, type: 'card' }];
for (const [a, b] of REPS) { EV.push({ t: +(a + .05).toFixed(2), type: 'lift' }); EV.push({ t: +(b - .05).toFixed(2), type: 'clunk' }); }
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
let prevLift = 0;
window.render = t => {
  const ek = explK(t), ratio = ratioAt(t), mp = clamp(mvPop(t), 0, 1.3);
  const h = lift(t);                                   // stack rise
  const vel = (lift(t + .02) - lift(t - .02)) / .04;   // + lifting, − lowering
  // exploded offsets
  frame.position.set(0, 0, -.55 * ek);
  rods.position.set(0, 0, -.3 * ek); rods.children.forEach((c, k) => { if (k < 2) c.position.x = (k ? 1 : -1) * (RODX + .2 * ek); });
  const spread = .075 * ek;
  plates.forEach(({ m, i }) => { const up = i >= PIN ? h : 0; m.position.set(-.05 * ek, plateY(i) + up + i * spread, 0); });
  const headLift = h + NPL * spread + .35 * ek;
  headG.position.set(-.05 * ek, HEADY + headLift, .25 * ek);
  mvG.visible = mp > .01; mvG.scale.setScalar(Math.max(mp, .001));
  attach.visible = ratio === 1;
  pinG.position.set(.0 + .32 * ek, plateY(PIN) - PH / 2 - PG / 2 + h + PIN * spread - .001, .02 + .5 * ek); pinG.position.y = plateY(PIN) + h + PIN * spread;
  fixed.forEach(({ g, p }, k) => g.position.set(p.x, p.y + (k === 0 ? .1 : 0) * ek, p.z + .35 * ek));
  // pulley spin from cable feed (handle feed = ratio · h)
  const feed = ratio * h;
  fixed.forEach(({ g }) => { g.children[0].rotation.z = -feed / R; });
  mvSheave.rotation.z = h / R;
  // cable path
  const MC = new THREE.Vector3().setFromMatrixPosition(mvSheave.matrixWorld); headG.updateMatrixWorld(true); MC.setFromMatrixPosition(mvSheave.matrixWorld);
  const F = fixed.map(f => f.g.position);
  const pts = [];
  const handleL = L0 + feed;
  if (ratio === 2 && mp > .5) {
    pts.push(new THREE.Vector3(MC.x - R, AY - .01, frame.position.z * .0 + MC.z * 0 + frame.position.z));
    arc(pts, MC, Math.PI, 2 * Math.PI);
  } else {
    const a = new THREE.Vector3().setFromMatrixPosition(attach.matrixWorld); pts.push(new THREE.Vector3(F[0].x - R, a.y, a.z));
  }
  arc(pts, F[0], Math.PI, Math.PI / 2); arc(pts, F[1], Math.PI / 2, 0); arc(pts, F[2], Math.PI, 1.5 * Math.PI);
  const HP = new THREE.Vector3(F[2].x + handleL, F[2].y - R, F[2].z); pts.push(HP);
  const curve = new Poly(pts);
  cableMesh.geometry.dispose(); cableMesh.geometry = new THREE.TubeGeometry(curve, 360, .0065, 8, false);
  handle.position.copy(HP);
  // beads mark fixed points of cable material (arc length from the start end is material coordinate)
  const beadOn = (t > T.price - .5 && t < T.e07) || (t > T.lifting - .3 && t < T.e08) || (t < 3.8) || (t > T.pay2 - .6 && t < T.next);
  const bk = beadOn ? 1 : 0;
  beads.forEach((b, i) => { const s = .09 + i * .13; b.visible = bk > 0 && s < curve.L - .02; if (b.visible) curve.getPoint(s / curve.L, b.position); });
  // highlights
  M.sheave.emissiveIntensity = (t > T.fric - .1 && t < T.e08 + .2) ? .35 + .25 * Math.sin(t * 7) : (t > T.pulleys && t < T.handle) ? .3 : 0;
  M.moving.emissiveIntensity = (t > T.movable && t < T.share + 1) ? .35 + .2 * Math.sin(t * 6) : 0;
  M.cable.emissiveIntensity = (t > T.cable - .1 && t < T.pulleys) || (t > T.stretch - .1 && t < T.e09) ? .5 + .3 * Math.sin(t * 6) : 0;
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, h, vel, ratio, ek, MC, F, HP, plates, pinG, headG, R, AY, STOP, PIN, plateY, frameZ: frame.position.z, rodsZ: rods.position.z, LMAX });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
