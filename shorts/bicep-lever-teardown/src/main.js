// Your Bicep Is a Lever (and It's Losing) — Exploded Teardown, 1080×1920. A stylised mechanical arm in side view:
// humerus = frame, radius/ulna = twin beams, elbow = pivot pin, biceps = linear actuator + tendon strap, hand = gripper, hex dumbbell.
// Units: 1 model unit = 10 cm. Elbow pivot at the origin, X forward, Y up, Z toward camera. Forearm angle θ: 0 = hanging, 90° = level.
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
const vend = id => TL.vo.find(v => v.id === id).t + VDUR[id];
const T = {
  lever: cue('v01', 0), losing: cue('v01', 2),
  apart: cue('v02', 0), frame: cue('v02', 2), beam: cue('v02', 3), pivot: cue('v02', 4),
  act: cue('v03', 0), tendon: cue('v03', 1), ins: cue('v03', 2),
  db: cue('v04', 0), db35: cue('v04', 1), pel: cue('v04', 2), cls: cue('v04', 3),
  bal: cue('v05', 0), kg: cue('v05', 1), at35: cue('v05', 2), nm: cue('v05', 3),
  lev4: cue('v06', 0), pull: cue('v06', 1), n860: cue('v06', 2), nine: cue('v06', 3),
  real: cue('v07', 0), r710: cue('v07', 1), why: cue('v07', 2),
  speed: cue('v08', 0), cm1: cue('v08', 1), cm9: cue('v08', 2), small: cue('v08', 3), range: cue('v08', 4),
  load: cue('v09', 0), curl: cue('v09', 1), down: cue('v09', 2), notq: cue('v09', 3),
  d90: cue('v10', 0), level: cue('v10', 1), longest: cue('v10', 2), stick: cue('v10', 3),
  past: cue('v11', 0), drops: cue('v11', 1),
  pay: cue('v12', 0), pay2: cue('v12', 1), next: cue('v13', 0), congrats: cue('v14', 0), card: cue('v14', 1),
};
T.end11 = vend('v11'); T.end08 = vend('v08');
window.T = T;

// ---------- geometry constants (model units, 1 = 10 cm) ----------
const L = 3.5;            // elbow → centre of grip: 35 cm
const D = 0.4;            // elbow → biceps insertion along the forearm: 4 cm
const OFF = -0.05;        // insertion bracket sits between the twin beams
const B0 = new THREE.Vector2(0.4, 2.95);   // actuator origin on the frame (front of the "shoulder")
const HUM = 3.2;          // frame length
const WN = 98.1;          // 10 kg dumbbell, N
const BARREL = 1.5, STRAP = 0.55;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, .2, 300);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, ao: false });
post.bloom.strength = .45; post.bloom.radius = .5; post.bloom.threshold = 2.0;
post.vig.uniforms.amt.value = .34; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .1;
{
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createRadialGradient(560, 900, 80, 540, 960, 1500); gr.addColorStop(0, '#36383c'); gr.addColorStop(.45, '#222427'); gr.addColorStop(1, '#0d0e10');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // faint engineering grid
  g.strokeStyle = 'rgba(241,239,233,.035)'; g.lineWidth = 1; for (let x = 0; x <= W; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y <= H; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = .45; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff1e2', 1.7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 60 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 5, 12, 5); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .6, 10, 10); scene.add(top);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .25));

// ---------- materials ----------
const M = {
  base: new THREE.MeshPhysicalMaterial({ color: '#2b2e33', roughness: .5, metalness: .3, clearcoat: .2 }),
  frame: new THREE.MeshPhysicalMaterial({ color: '#b9bec4', roughness: .5, metalness: .45, clearcoat: .1 }),
  beam: new THREE.MeshPhysicalMaterial({ color: '#555c64', roughness: .38, metalness: .75, clearcoat: .3 }),
  yellow: new THREE.MeshPhysicalMaterial({ color: '#f2c230', roughness: .4, clearcoat: .5, emissive: '#ff6b3d', emissiveIntensity: 0 }),
  blue: new THREE.MeshPhysicalMaterial({ color: '#2f6fe0', roughness: .4, clearcoat: .5 }),
  barrel: new THREE.MeshPhysicalMaterial({ color: '#ff6b3d', roughness: .35, clearcoat: .7, emissive: '#ff6b3d', emissiveIntensity: 0 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#d4d8dc', roughness: .15, metalness: 1, emissive: '#59d4ff', emissiveIntensity: 0 }),
  strap: new THREE.MeshPhysicalMaterial({ color: '#efe6d2', roughness: .7, sheen: .6, emissive: '#59d4ff', emissiveIntensity: 0 }),
  iron: new THREE.MeshPhysicalMaterial({ color: '#2a2c30', roughness: .55, metalness: .5, clearcoat: .3 }),
  bolt: new THREE.MeshStandardMaterial({ color: '#9aa0a6', roughness: .3, metalness: 1 }),
};
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const cylZ = (r, len, mat, x = 0, y = 0, z = 0, seg = 28) => { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateX(Math.PI / 2); const m = sh(new THREE.Mesh(g, mat)); m.position.set(x, y, z); return m; };

// ---------- stand ----------
scene.add(box(.16, 1.3, 1.1, M.base, -.86, HUM, -.4));                            // wall plate the shoulder bolts to
for (const y of [-.45, .45]) for (const z of [-.8, 0]) scene.add(cylZ(.05, .06, M.bolt, -.78, HUM + y, z + .0 + (z ? 0 : 0)).rotateY(Math.PI / 2));

// ---------- parts: each a group with an explode offset ----------
const P = {};
const part = (name, E) => { const g = new THREE.Group(); scene.add(g); P[name] = { g, E: new THREE.Vector3(...E) }; return g; };
// humerus = frame: box tube, shoulder hub, actuator bracket, elbow clevis lug
const frame = part('frame', [-1.1, 1.3, 0]);
frame.add(box(.36, HUM - .1, .3, M.frame, 0, HUM / 2 + .05, 0));
frame.add(box(.44, .06, .34, M.yellow, 0, 1.0, 0), box(.44, .06, .34, M.yellow, 0, 2.2, 0));
frame.add(cylZ(.32, .62, M.blue, 0, HUM, 0, 40)); frame.add(cylZ(.14, .7, M.bolt, 0, HUM, 0));
frame.add(box(.75, .3, .3, M.frame, -.42, HUM, -.4));                               // shoulder mount into the column
frame.add(box(.36, .22, .22, M.frame, .22, B0.y, 0));                               // actuator bracket
frame.add(cylZ(.18, .3, M.frame, 0, 0, 0, 32));                                     // elbow lug
for (const y of [.6, 1.6, 2.6]) for (const z of [-.16, .16]) frame.add(cylZ(.03, .04, M.bolt, .12, y, z * 1.0 + (z > 0 ? .0 : 0)));
// elbow pivot pin + yellow bearing caps
const pin = part('pin', [-.4, -1.5, 2.0]);
pin.add(cylZ(.085, 1.0, M.bolt, 0, 0, 0, 24)); pin.add(cylZ(.2, .07, M.yellow, 0, 0, .43, 32)); pin.add(cylZ(.2, .07, M.yellow, 0, 0, -.43, 32));
// forearm: twin beams (radius + ulna), end plates, insertion bracket, gripper hand. Built along local +x (θ = 90°).
const fore = part('fore', [1.3, -1.6, 0]);
for (const z of [-.24, .24]) { fore.add(box(3.1, .16, .1, M.beam, 1.55, 0, z)); fore.add(cylZ(.2, .1, M.beam, 0, 0, z, 32)); }
fore.add(box(.12, .22, .58, M.yellow, 1.2, 0, 0), box(.12, .22, .58, M.yellow, 2.3, 0, 0));
const insB = box(.18, .16, .58, M.blue, D, OFF - .02, 0); fore.add(insB);
fore.add(cylZ(.05, .66, M.bolt, D, OFF, 0));
const hand = new THREE.Group(); hand.position.x = L; fore.add(hand);                  // gripper around the dumbbell handle
hand.add(box(.55, .3, .5, M.frame, -.42, 0, 0));
{ const ring = sh(new THREE.Mesh(new THREE.TorusGeometry(.16, .06, 12, 32), M.blue)); hand.add(ring); }
// actuator: barrel, rod, tendon strap (oriented each frame between the frame bracket and the insertion)
const act = part('act', [1.9, .8, 0]);
const barrel = sh(new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, BARREL, 32).translate(0, -BARREL / 2, 0), M.barrel)); act.add(barrel);
const capT = sh(new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .12, 32).translate(0, -.06, 0), M.yellow)); act.add(capT);
const capB = sh(new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .1, 32), M.yellow)); act.add(capB);
const rod = sh(new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, 1, 20).translate(0, -.5, 0), M.chrome)); act.add(rod);
const strap = sh(new THREE.Mesh(new THREE.BoxGeometry(.1, 1, .26).translate(0, -.5, 0), M.strap)); act.add(strap);
const eye = cylZ(.07, .34, M.bolt); act.add(eye);
// dumbbell: hex plates on a chrome handle (axis along z)
const db = new THREE.Group(); scene.add(db);
db.add(cylZ(.07, 1.1, M.chrome, 0, 0, 0, 20));
for (const z of [-.42, .42]) { const p = cylZ(.45, .16, M.iron, 0, 0, z, 6); p.rotation.z = Math.PI / 6; db.add(p); db.add(cylZ(.2, .2, M.bolt, 0, 0, z * 1.18, 20)); }

// ---------- motion ----------
const DEG = Math.PI / 180;
const pop = x => 1 - Math.pow(1 - ss(x), 3);
// explode: v02 apart → reassemble by the insertion line; brief re-explode on "take apart next?"
const explK = t => pop(seg(t, T.apart - .1, T.apart + 1.2)) * (1 - eio(seg(t, T.tendon - .3, T.tendon + 1.0))) + .55 * eio(seg(t, T.next - .2, T.next + .9)) * (1 - eio(seg(t, T.congrats + .2, T.congrats + 1.3)));
// actuator stays out a beat longer so the v03 label lands on it alone
const actK = t => Math.max(explK(t), pop(seg(t, T.apart - .1, T.apart + 1.2)) * (1 - eio(seg(t, T.tendon - .1, T.tendon + 1.1))));
// forearm angle θ (degrees)
const curl = (t, t0, per, lo, hi) => lo + (hi - lo) * (.5 - .5 * Math.cos(2 * Math.PI * (t - t0) / per));
function theta(t) {
  const keys = [];
  if (t < T.apart + .2) return lerp(curl(t, 0, 2.6, 80, 128), 90, eio(seg(t, T.apart - .6, T.apart + .2)));      // hook: reps
  if (t < T.speed) return 90;                                                                                       // hold level for the torque balance
  if (t < T.small) { const k = eio(seg(t, T.cm1, T.cm1 + 1.4)); return lerp(90, 76, k) + (t > T.cm9 + .6 ? 0 : 0); } // 14° = 1 cm of actuator travel
  if (t < T.load) return curl(t, T.small, 3.2, 76, 132) * 1 + 0;                                                    // full range
  if (t < T.d90) return lerp(curl(T.load, T.small, 3.2, 76, 138), 4, eio(seg(t, T.load, T.notq - .1)));            // straight down
  if (t < T.past) return lerp(4, 90, eio(seg(t, T.d90 - .1, T.level)));                                             // up to level and hold
  if (t < T.pay - .3) return lerp(90, 135, eio(seg(t, T.past, T.drops + .6)));                                      // past it
  if (t < T.next) return lerp(135, 90, eio(seg(t, T.pay - .3, T.pay + .7)));
  return 90;
}
// biceps line of action and moment arm (pure geometry, units: model)
const uvec = th => new THREE.Vector2(Math.sin(th * DEG), -Math.cos(th * DEG));
const insertion = th => { const u = uvec(th); return new THREE.Vector2(D * u.x - OFF * u.y, D * u.y + OFF * u.x); };
function mech(th) {
  const I = insertion(th), d = new THREE.Vector2().subVectors(I, B0), len = d.length(); d.normalize();
  // biceps moment arm: smooth curve through typical measured values (≈1.5 cm straight, peak ≈4 cm near 90–100°); see FACTS.md
  const r = .4 - .25 * Math.pow((th - 95) / 95, 2);
  const tq = WN * L * .1 * Math.sin(th * DEG);                       // N·m (forearm weight ignored)
  const F = r > 1e-4 ? tq / (r * .1) : 0;
  return { I, len, r, tq, F, ratio: F / WN };
}
window.mech = mech;
// dumbbell presence: in hand during the hook, flies off on "apart", lands back on "the dumbbell sits"
const dbOff = t => (t < T.apart + 1.5 ? seg(t, T.apart, T.apart + .9) : 1 - eo(seg(t, T.db - .1, T.db + .55)));

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, 24, 8, 23, 1.3, 1.2, 0],
  [T.losing + .4, 20, 6, 23.5, 1.3, 1.2, 0],
  [T.apart + 1.2, 26, 8, 26.5, 1.0, 1.05, 0],
  [T.pivot + .4, 30, 9, 26, .9, 1.0, 0],
  [T.tendon + .6, 22, 6, 19.5, 1.5, .9, 0],
  [T.db35 + .3, 16, 5, 18.5, 1.6, .85, 0],
  [T.cls + .6, 14, 5, 18.5, 1.6, .85, 0],
  [T.nine + .4, 12, 4, 18.5, 1.6, .85, 0],
  [T.speed + .2, 14, 5, 18.5, 1.6, .85, 0],
  [T.small, 16, 5, 22, 1.5, .4, 0],
  [T.load + .2, 18, 6, 30, 1.3, -.3, 0],
  [T.notq + .4, 16, 6, 32, 1.3, -.6, 0],
  [T.stick, 12, 5, 30, 1.3, -.3, 0],
  [T.drops + .5, 16, 6, 30, 1.2, -.3, 0],
  [T.pay + .6, 20, 7, 24, 1.4, .2, 0],
  [T.next + .8, 28, 9, 26, 1.0, .5, 0],
  [T.card, 24, 8, 24, 1.3, .2, 0],
  [DUR, 20, 8, 25, 1.3, .2, 0],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz] = camTrack(t); const A = az * DEG, E = el * DEG;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 200; post.dof.maxCoc = 8;
  const la = A - .9; key.position.set(tx + 14 * Math.sin(la), ty + 16, tz + 14 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 12 * Math.sin(A + Math.PI * .85), ty + 4, tz + 12 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 12, tz); top.lookAt(tx, ty, tz);
}

// ---------- events ----------
const EV = [
  { t: 1.3, type: 'hydraulic' }, { t: T.apart, type: 'spread' }, { t: T.apart + .05, type: 'lift' },
  { t: T.frame, type: 'label' }, { t: T.beam, type: 'label' }, { t: T.pivot, type: 'label' }, { t: T.act, type: 'label' },
  { t: T.tendon + .5, type: 'clunk' }, { t: T.tendon + .9, type: 'clunk' }, { t: T.ins, type: 'label' },
  { t: T.db + .45, type: 'land' }, { t: T.pel, type: 'label' }, { t: T.pel + .45, type: 'label' }, { t: T.pel + .9, type: 'label' },
  { t: T.kg, type: 'label' }, { t: T.nm, type: 'label' }, { t: T.pull, type: 'hydraulic' }, { t: T.n860, type: 'label' },
  { t: T.r710, type: 'card' }, { t: T.cm1, type: 'hydraulic' }, { t: T.small, type: 'hydraulic' },
  { t: T.load, type: 'hydraulic' }, { t: T.d90 - .1, type: 'hydraulic' }, { t: T.stick, type: 'clunk' }, { t: T.past, type: 'hydraulic' },
  { t: T.pay, type: 'card' }, { t: T.next, type: 'spread' }, { t: T.next + .1, type: 'card' }, { t: T.congrats + .3, type: 'clunk' }, { t: T.card, type: 'card' },
];
window.EV = EV.map(e => ({ ...e, t: +e.t.toFixed(2) })).sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
const up = new THREE.Vector3(0, 1, 0), tmpQ = new THREE.Quaternion();
window.render = t => {
  const ek = explK(t), ak = actK(t), th = theta(t), m = mech(th);
  for (const n of ['frame', 'pin', 'fore']) P[n].g.position.copy(P[n].E).multiplyScalar(ek);
  fore.rotation.z = (th - 90) * DEG;
  // actuator: from the frame bracket to the insertion, offset as one piece while exploded
  const off = P.act.E.clone().multiplyScalar(ak);
  const A3 = new THREE.Vector3(B0.x, B0.y, 0), I3 = new THREE.Vector3(m.I.x, m.I.y, 0);
  const dir = new THREE.Vector3().subVectors(I3, A3).normalize(), len = A3.distanceTo(I3);
  act.position.copy(A3).add(off); act.quaternion.copy(tmpQ.setFromUnitVectors(up, dir.clone().negate()));
  const rodLen = Math.max(.1, len - BARREL - STRAP + .25);
  capB.position.y = -BARREL; rod.position.y = -BARREL + .25; rod.scale.y = rodLen; strap.position.y = -(len - STRAP); strap.scale.y = STRAP; eye.position.y = -len;
  eye.rotation.set(0, 0, 0); eye.quaternion.premultiply(new THREE.Quaternion()); // eye pin axis stays along local z
  // dumbbell rides the hand, or flies off/lands
  const u = uvec(th), Hx = u.x * L, Hy = u.y * L, fo = P.fore.g.position, off2 = dbOff(t);
  db.position.set(Hx + fo.x + off2 * 1.6, Hy + fo.y + off2 * 6.5, fo.z + off2 * .2); db.rotation.z = off2 * .9; db.visible = off2 < .999;
  // highlights
  const hl = (a, b) => (t > a && t < b) ? .5 + .5 * Math.sin(t * 7) : 0;
  M.barrel.emissiveIntensity = .25 * hl(T.act, T.tendon + .2) + (t > T.pull && t < T.real ? .18 : 0);
  M.strap.emissiveIntensity = .4 * hl(T.tendon, T.db - .1); M.yellow.emissiveIntensity = .25 * hl(T.pivot, T.act);
  M.chrome.emissiveIntensity = (t > T.cm1 && t < T.small) ? .35 : 0;
  setCamera(t);
  post.composer.render();
  const w3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  drawOverlay(t, camera, { W, H, T, th, m, ek, ak, L, D, WN,
    pivot: w3(fo.x, fo.y, 0), ins: w3(m.I.x + fo.x, m.I.y + fo.y, .3), hand: w3(Hx + fo.x, Hy + fo.y, .45), A: w3(B0.x, B0.y, .3).add(off),
    frameMid: w3(-1.1 * ek + .18, 1.9 + 1.3 * ek, .15), beamMid: w3(fo.x + u.x * 1.8, fo.y + u.y * 1.8 - .08, .3), pinPt: w3(P.pin.g.position.x, P.pin.g.position.y, P.pin.g.position.z + .45),
    actMid: A3.clone().add(off).addScaledVector(dir, .9), mech, uvec, insertion });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
