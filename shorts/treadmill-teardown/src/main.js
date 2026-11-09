// How a Treadmill Knows Your Speed — Exploded Teardown, 1080×1920. A schematic home treadmill (no brand) that
// explodes vertically into its layers, then reassembles to show the speed sensor, foot-strike control, incline and key.
// Units: model units (schematic, not to scale). X = along the deck (runner faces +x), Y up, Z toward camera (left side).
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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
const T = {
  counts: cue('v01', 2), apart: cue('v01', 3),
  motor: cue('v02', 1), drive: cue('v02', 2), roller: cue('v02', 3),
  belt: cue('v03', 0), deck: cue('v03', 2), cush: cue('v03', 3),
  clever: cue('v04', 0), magnet: cue('v04', 1), pulse: cue('v04', 2),
  formula: cue('v05', 0), example: cue('v05', 2), mph: cue('v05', 3),
  strike: cue('v06', 0), ctrl: cue('v06', 1), dip: cue('v06', 4),
  incline: cue('v07', 0), key: cue('v07', 2),
  why: cue('v08', 0), air: cue('v08', 1), study: cue('v08', 3),
  next: cue('v09', 0), congrats: cue('v10', 0), card: cue('v10', 1),
};
T.down = T.clever - .2;          // reassemble as the sensor beat starts
T.slow0 = T.magnet - .3; T.slow1 = T.strike - .3;   // slow-motion belt for the pulse beat
T.inc0 = T.incline + .1; T.inc1 = T.key - .1;       // deck tilts up
T.keyOut = T.key + 1.0;          // key pulled → belt coasts to a stop
T.restart = T.why + .3;          // belt back on, 1% grade
window.T = T;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, .05, 100);
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
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = .5; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff1e2', 1.7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: .5, far: 40 }); key.shadow.bias = -.0004; key.shadow.normalBias = .01; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 2.2, 6, 2); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .3, 5, 5); scene.add(top);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .25));

// ---------- materials ----------
const M = {
  floor: new THREE.MeshPhysicalMaterial({ color: '#26282c', roughness: .85, metalness: 0 }),
  frame: new THREE.MeshPhysicalMaterial({ color: '#3b4048', roughness: .4, metalness: .6, clearcoat: .4 }),
  hood: new THREE.MeshPhysicalMaterial({ color: '#e9e7e2', roughness: .35, clearcoat: .6, side: THREE.DoubleSide }),
  cons: new THREE.MeshPhysicalMaterial({ color: '#d8d6d1', roughness: .7 }),
  postT: new THREE.MeshPhysicalMaterial({ color: '#3b4048', roughness: .4, metalness: .6, clearcoat: .4, transparent: true }),
  hoodT: new THREE.MeshPhysicalMaterial({ color: '#e9e7e2', roughness: .55, clearcoat: .15, side: THREE.DoubleSide, transparent: true }),
  rubber: new THREE.MeshStandardMaterial({ color: '#17181b', roughness: .85 }),
  beltMark: new THREE.MeshStandardMaterial({ color: '#5b5f66', roughness: .7 }),
  deck: new THREE.MeshPhysicalMaterial({ color: '#c9a36b', roughness: .25, clearcoat: 1, clearcoatRoughness: .08 }),
  cush: new THREE.MeshPhysicalMaterial({ color: '#ff6b3d', roughness: .7 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#d4d8dc', roughness: .15, metalness: 1 }),
  steel: new THREE.MeshStandardMaterial({ color: '#7a8088', roughness: .35, metalness: .8 }),
  dark: new THREE.MeshStandardMaterial({ color: '#2a2c30', roughness: .4, metalness: .7 }),
  motor: new THREE.MeshPhysicalMaterial({ color: '#2f6fe0', roughness: .4, clearcoat: .5 }),
  copper: new THREE.MeshStandardMaterial({ color: '#c47a3a', roughness: .35, metalness: .9 }),
  pcb: new THREE.MeshPhysicalMaterial({ color: '#1f7a4a', roughness: .5, emissive: '#59d4ff', emissiveIntensity: 0 }),
  chip: new THREE.MeshStandardMaterial({ color: '#111214', roughness: .5 }),
  yellow: new THREE.MeshPhysicalMaterial({ color: '#f2c230', roughness: .4, clearcoat: .5 }),
  magnet: new THREE.MeshPhysicalMaterial({ color: '#e8402a', roughness: .4, emissive: '#ff6b3d', emissiveIntensity: 0 }),
  sensor: new THREE.MeshPhysicalMaterial({ color: '#202226', roughness: .4, emissive: '#59d4ff', emissiveIntensity: 0 }),
  screen: new THREE.MeshBasicMaterial({ color: '#b0b0b0', toneMapped: false }),
  keyRed: new THREE.MeshPhysicalMaterial({ color: '#e0322a', roughness: .4, clearcoat: .5 }),
  shoe: new THREE.MeshPhysicalMaterial({ color: '#f1efe9', roughness: .6 }),
  sole: new THREE.MeshPhysicalMaterial({ color: '#ff6b3d', roughness: .6 }),
};
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const cylZ = (r, len, mat, x = 0, y = 0, z = 0, seg = 32) => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2), mat)); m.position.set(x, y, z); return m; };

// ---------- dimensions ----------
const XR = -.92, XF = .92, RY = .2, RR = .05, BRO = .058, BRI = .052, BW = .56;   // rollers + belt
const XM = 1.2, MR = .07, PZ = .345, PR = .065, MPR = .024;                         // motor, pulleys
const PIV = new THREE.Vector3(-1.0, .04, 0);                                       // tilt pivot (rear feet)
const VBELT = .9;            // model belt speed (units/s) at "5.2 mph"

// ---------- floor ----------
{ const f = sh(new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, .06, 64), M.floor)); f.position.set(.2, -.03, 0); scene.add(f); }

// ---------- machine: tilt group (pivot at rear feet) → layer groups with explode offsets ----------
const tilt = new THREE.Group(); tilt.position.copy(PIV); scene.add(tilt);
const body = new THREE.Group(); body.position.copy(PIV).negate(); tilt.add(body);
const P = {};
const part = (name, dx, dy, dz = 0) => { const g = new THREE.Group(); body.add(g); P[name] = { g, d: new THREE.Vector3(dx, dy, dz) }; return g; };
const anchor = (g, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); g.add(o); return o; };
const A = {};   // label anchors

// frame: side rails, rear feet, front cross bar, lift bracket
const frame = part('frame', 0, 0);
for (const z of [-.36, .36]) { frame.add(box(2.1, .09, .05, M.frame, .02, .14, z)); frame.add(box(.08, .1, .06, M.rubber, -.98, .05, z)); }
frame.add(box(.05, .06, .76, M.frame, 1.05, .14, 0)); frame.add(box(.45, .05, .06, M.frame, 1.27, .14, 0));
const nut = box(.08, .06, .1, M.yellow, 1.47, .14, 0); frame.add(nut);
A.frame = anchor(frame, -.4, .14, .38);
// uprights + console + safety key ride with the frame (they tilt with it)
const cons = part('console', 0, .35);
{ const geos = []; for (const z of [-.36, .36]) { const g = new THREE.CylinderGeometry(.025, .03, 1.1, 12); const m = new THREE.Matrix4().makeRotationZ(.18).setPosition(1.0 - .1, .14 + .55, z); g.applyMatrix4(m); geos.push(g); }
  cons.add(sh(new THREE.Mesh(mergeGeometries(geos), M.postT))); }
const consBox = new THREE.Group(); consBox.position.set(.8, 1.27, 0); consBox.rotation.z = -.5; cons.add(consBox);
consBox.add(box(.12, .26, .86, M.cons)); consBox.add(box(.02, .7, .04, M.frame, -.03, -.01, .44)); consBox.add(box(.02, .7, .04, M.frame, -.03, -.01, -.44));
const scrCv = document.createElement('canvas'); scrCv.width = 512; scrCv.height = 160; const scrG = scrCv.getContext('2d');
const scrTex = new THREE.CanvasTexture(scrCv); scrTex.colorSpace = THREE.SRGBColorSpace; M.screen.map = scrTex;
{ const s = new THREE.Mesh(new THREE.PlaneGeometry(.5, .16), M.screen); s.rotation.y = Math.PI / 2; s.position.set(-.061, .01, .02); consBox.add(s); }
// safety key: magnet clip on the console + cord
const keyG = new THREE.Group(); keyG.position.set(-.07, -.07, .34); consBox.add(keyG);
keyG.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .025, 24).rotateZ(Math.PI / 2), M.keyRed)));
keyG.add(box(.015, .09, .025, M.keyRed, -.02, -.06, 0));
const cord = sh(new THREE.Mesh(new THREE.TorusGeometry(.05, .006, 6, 24, Math.PI * 1.6), M.rubber)); cord.rotation.y = Math.PI / 2; cord.position.set(-.03, -.14, 0); keyG.add(cord);
A.key = anchor(keyG, 0, 0, 0); A.console = anchor(consBox, -.06, .1, 0);

// cushions on the rails
const cushG = part('cush', 0, .14);
for (const x of [-.6, -.1, .4]) for (const z of [-.33, .33]) cushG.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(.03, .034, .04, 16), M.cush)).translateX(x).translateY(.205).translateZ(z));
A.cush = anchor(cushG, .4, .21, .33);
// deck board (lubricated)
const deckG = part('deck', 0, .3);
deckG.add(box(1.74, .022, .66, M.deck, 0, .236, 0));
A.deck = anchor(deckG, -.3, .247, .2);
// rollers + pulley + magnet (front), rear roller
const rollG = part('rollers', 0, .5);
const front = new THREE.Group(); front.position.set(XF, RY, 0); rollG.add(front);
const rear = new THREE.Group(); rear.position.set(XR, RY, 0); rollG.add(rear);
for (const r of [front, rear]) { r.add(cylZ(RR, .64, M.steel)); r.add(cylZ(.012, .74, M.chrome)); for (let k = 0; k < 4; k++) { const s = box(.004, .004, .64, M.dark); s.position.set(Math.cos(k * Math.PI / 2) * RR, Math.sin(k * Math.PI / 2) * RR, 0); r.add(s); } }
front.add(cylZ(PR, .03, M.dark, 0, 0, PZ, 40)); front.add(cylZ(PR - .012, .032, M.steel, 0, 0, PZ, 40));
for (let k = 0; k < 4; k++) { const s = box(.008, PR * 2 - .02, .034, M.dark); s.rotation.z = k * Math.PI / 4; s.position.z = PZ; front.add(s); }
const magnet = box(.022, .016, .02, M.magnet, 0, PR - .022, PZ + .018); front.add(magnet);
// speed sensor: fixed on a bracket next to the pulley (rides with the roller layer when exploded)
const SA = Math.PI * .35;   // sensor angle around the pulley (from +x, CCW)
const sensorG = new THREE.Group(); rollG.add(sensorG);
{ const sx = XF + Math.cos(SA) * (PR + .028), sy = RY + Math.sin(SA) * (PR + .028);
  const s = box(.03, .03, .03, M.sensor, sx, sy, PZ + .018); s.rotation.z = SA; sensorG.add(s);
  const br = box(.012, .14, .012, M.frame, sx + .005, sy - .07, PZ + .018); sensorG.add(br);
  A.sensor = anchor(sensorG, sx, sy, PZ + .03); }
A.magnet = anchor(magnet, 0, 0, .012); A.roller = anchor(rollG, XF, RY + RR, .3); A.rear = anchor(rollG, XR, RY + RR, .3);
// motor + flywheel + motor pulley
const motG = part('motor', .2, .5);
motG.add(cylZ(MR, .22, M.motor, XM, RY, 0)); motG.add(cylZ(MR + .006, .02, M.dark, XM, RY, .1)); motG.add(cylZ(MR + .006, .02, M.dark, XM, RY, -.1));
for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; motG.add(box(.01, .01, .2, M.dark, XM + Math.cos(a) * (MR + .003), RY + Math.sin(a) * (MR + .003), 0)); }
motG.add(cylZ(.012, .46, M.chrome, XM, RY, .16));
const fly = new THREE.Group(); fly.position.set(XM, RY, .27); motG.add(fly);
fly.add(cylZ(.115, .035, M.dark, 0, 0, 0, 48)); fly.add(cylZ(.095, .038, M.steel, 0, 0, 0, 48));
for (let k = 0; k < 5; k++) { const s = box(.016, .1, .04, M.dark, 0, 0, 0); s.rotation.z = k * Math.PI * 2 / 5; s.translateY(.05); fly.add(s); }
fly.add(box(.02, .02, .042, M.yellow, .085, 0, 0));
const mp = new THREE.Group(); mp.position.set(XM, RY, PZ); motG.add(mp); mp.add(cylZ(MPR, .03, M.chrome, 0, 0, 0, 24)); mp.add(box(.006, .006, .032, M.dark, MPR - .004, 0, 0));
motG.add(box(.16, .03, .2, M.frame, XM, RY - MR - .02, 0));
A.motor = anchor(motG, XM, RY + MR, 0); A.fly = anchor(fly, 0, .1, .02);
// drive belt (poly-V): hull of the two pulleys
const driveG = part('drive', .1, .5, .0);
{ const pts = []; for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; pts.push([XF + Math.cos(a) * (PR + .004), RY + Math.sin(a) * (PR + .004)], [XM + Math.cos(a) * (MPR + .004), RY + Math.sin(a) * (MPR + .004)]); }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = []; for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of pts.slice().reverse()) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  const hull = lo.slice(0, -1).concat(hi.slice(0, -1)).map(p => new THREE.Vector3(p[0], p[1], PZ));
  driveG.add(sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hull, true), 200, .007, 6, true), M.rubber))); }
A.drive = anchor(driveG, (XF + XM) / 2, RY + .045, PZ);
// controller board (motor control board)
const ctrlG = part('ctrl', .35, .3, -.35);
ctrlG.add(box(.24, .012, .18, M.pcb, 1.22, .07, -.2));
for (const [x, z, s] of [[1.15, -.24, .04], [1.25, -.15, .05], [1.3, -.25, .03], [1.18, -.14, .025]]) ctrlG.add(box(s, .02, s, M.chip, x, .086, z));
ctrlG.add(cylZ(.018, .04, M.copper, 1.3, .1, -.14)); ctrlG.add(box(.05, .05, .02, M.dark, 1.12, .1, -.28));
A.ctrl = anchor(ctrlG, 1.22, .09, -.12);
// incline: lift motor on the floor + lead screw (fixed to the floor, not tilted)
const liftG = new THREE.Group(); scene.add(liftG);
liftG.add(box(.16, .1, .16, M.motor, 1.47, .05, 0)); liftG.add(cylZ(.06, .02, M.dark, 1.47, .05, .085));
const screw = new THREE.Group(); screw.position.set(1.47, .1, 0); liftG.add(screw);
{ screw.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .44, 10).translate(0, .22, 0), M.chrome)));
  const pts = []; for (let i = 0; i <= 220; i++) { const u = i / 220, a = u * Math.PI * 2 * 22; pts.push(new THREE.Vector3(Math.cos(a) * .016, u * .42 + .01, Math.sin(a) * .016)); }
  screw.add(sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 440, .004, 4), M.steel))); }
A.lift = anchor(liftG, 1.47, .3, .03);
// hood over the motor
const hoodG = part('hood', .55, .95);
{ const s = new THREE.Shape(); s.moveTo(.95, .1); s.lineTo(1.42, .1); s.lineTo(1.42, .27); s.quadraticCurveTo(1.4, .37, 1.25, .38); s.lineTo(.98, .36); s.quadraticCurveTo(.95, .35, .95, .3); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: .78, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 2 }); g.translate(0, 0, -.39); hoodG.add(sh(new THREE.Mesh(g, M.hoodT))); }
A.hood = anchor(hoodG, 1.2, .38, .2);
// running belt: stadium loop + moving marks
const beltG = part('belt', 0, .78);
{ const s = new THREE.Shape(); s.absarc(XF, RY, BRO, -Math.PI / 2, Math.PI / 2, false); s.absarc(XR, RY, BRO, Math.PI / 2, Math.PI * 1.5, false); s.closePath();
  const hole = new THREE.Path(); hole.absarc(XF, RY, BRI, -Math.PI / 2, Math.PI / 2, false); hole.absarc(XR, RY, BRI, Math.PI / 2, Math.PI * 1.5, false); hole.closePath(); s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: BW, bevelEnabled: false, curveSegments: 24 }); g.translate(0, 0, -BW / 2); beltG.add(sh(new THREE.Mesh(g, M.rubber))); }
const LTOP = XF - XR, LP = 2 * LTOP + 2 * Math.PI * BRO;
const beltPt = s => { s = ((s % LP) + LP) % LP;   // top run front→rear, rear arc, bottom run rear→front, front arc
  if (s < LTOP) return [XF - s, RY + BRO, 0]; s -= LTOP;
  if (s < Math.PI * BRO) { const a = Math.PI / 2 + s / BRO; return [XR + Math.cos(a) * BRO, RY + Math.sin(a) * BRO, a - Math.PI / 2]; } s -= Math.PI * BRO;
  if (s < LTOP) return [XR + s, RY - BRO, Math.PI]; s -= LTOP; const a = -Math.PI / 2 + s / BRO; return [XF + Math.cos(a) * BRO, RY + Math.sin(a) * BRO, a + Math.PI / 2]; };
const marks = [...Array(12)].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(.035, .003, BW - .02), M.beltMark); beltG.add(m); return m; });
A.belt = anchor(beltG, -.2, RY + BRO, .26);
// shoes for the foot-strike beat (world space, ride on the tilt group)
const shoes = [0, 1].map(i => { const g = new THREE.Group(); g.add(box(.26, .05, .1, M.shoe, 0, .045, 0)); g.add(box(.27, .022, .105, M.sole, 0, .011, 0)); g.add(box(.1, .05, .09, M.shoe, -.06, .09, 0)); body.add(g); g.visible = false; return g; });

// ---------- belt speed, phase (integrated), pulses ----------
const keyK = t => seg(t, T.keyOut, T.keyOut + 1.4);   // 0 → 1 as the belt coasts down
function vBelt(t) {
  let v = VBELT * ss(seg(t, .1, .9));
  if (t > T.slow0 - .4 && t < T.slow1 + .4) v *= lerp(1, .32, ss(seg(t, T.slow0 - .4, T.slow0)) * (1 - ss(seg(t, T.slow1, T.slow1 + .4))));
  v *= 1 - ss(keyK(t)) * (1 - ss(seg(t, T.restart, T.restart + 1.2)));
  return v * (1 - dipK(t));
}
// foot strikes during v06: alternate feet, 2.6 strikes/s
const STRIKES = []; for (let t = T.strike + .5; t < T.incline - .3; t += .385) STRIKES.push(t);
function dipK(t) { let d = 0; for (const s of STRIKES) { const u = t - s; if (u >= 0 && u < .5) d = Math.max(d, .07 * Math.sin(Math.PI * Math.min(1, u / .08) / 2) * Math.exp(-u / .1)); } return d; }
function current(t) { let c = .35; for (const s of STRIKES) { const u = t - s - .03; if (u >= 0 && u < .6) c = Math.max(c, .35 + .55 * Math.exp(-u / .12) * Math.min(1, u / .03)); } return c; }
const DT = 1 / 240, NS = Math.ceil((DUR + 1) / DT); const POS = new Float32Array(NS + 1);
for (let i = 0; i < NS; i++) POS[i + 1] = POS[i] + vBelt(i * DT) * DT;
const beltPos = t => { const f = clamp(t, 0, DUR) / DT, i = Math.floor(f); return lerp(POS[i], POS[Math.min(NS, i + 1)], f - i); };
// a pulse whenever the magnet passes the sensor: roller angle θ = s / RR (CCW), magnet starts at +y
const magAng = t => Math.PI / 2 + beltPos(t) / RR;
const pulseAt = t => { const d = ((magAng(t) - SA) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); return d < .35 || d > Math.PI * 2 - .12; };
window.SPEED = { vBelt, current, pulseAt, beltPos, STRIKES, VBELT };

// ---------- motion ----------
const explK = t => eio(seg(t, T.apart - .1, T.apart + 1.3)) * (1 - eio(seg(t, T.down - 1.2, T.down)));
const incK = t => { const up = eio(seg(t, T.inc0, T.inc1)), back = eio(seg(t, T.restart - .2, T.restart + 1.2)); return lerp(up * .1, .01, back); };   // grade (rise/run)

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, 34, 16, 7.6, .25, .55, 0],
  [T.apart, 30, 16, 8.6, .25, .65, 0],
  [T.motor + .2, 26, 14, 9.4, .35, .95, 0],
  [T.drive + .2, 32, 12, 5.6, 1.0, .75, 0],
  [T.roller + .5, 26, 12, 6.4, .7, .75, 0],
  [T.belt + .3, 20, 16, 9, .15, .95, 0],
  [T.cush + .5, 18, 14, 8, 0, .6, 0],
  [T.down + .2, 22, 14, 7.2, .35, .5, 0],
  [T.magnet + .4, -28, 8, 1.5, XF, .21, .34],
  [T.mph + .8, -18, 10, 1.8, XF, .22, .34],
  [T.strike + .7, 30, 12, 6.6, .5, .5, 0],
  [T.incline - .1, 40, 8, 6.4, .7, .5, 0],
  [T.inc1, 36, 8, 6.8, .7, .55, 0],
  [T.key + .9, 34, 8, 4.4, .75, 1.05, .1],
  [T.why + .4, 30, 14, 7.4, .25, .55, 0],
  [T.next, 28, 18, 8, .25, .6, 0],
  [DUR, 20, 22, 9, .25, .65, 0],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz] = camTrack(t); const Az = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(Az), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(Az)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 240; post.dof.maxCoc = 10;
  const la = Az - .9; key.position.set(tx + 6 * Math.sin(la), ty + 7, tz + 6 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 5 * Math.sin(Az + Math.PI * .85), ty + 2, tz + 5 * Math.cos(Az + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 5, tz); top.lookAt(tx, ty, tz);
}

// ---------- events (foley) ----------
const EV = [{ t: .1, type: 'motor_on' }, { t: T.apart, type: 'lift' }, { t: T.apart + .3, type: 'spread' },
  { t: T.motor + .3, type: 'label' }, { t: T.drive + .3, type: 'label' }, { t: T.roller + .3, type: 'label' }, { t: T.belt + .3, type: 'label' }, { t: T.deck + .3, type: 'label' }, { t: T.cush + .3, type: 'label' },
  { t: T.down - .05, type: 'land' }, { t: T.ctrl + .3, type: 'label' }, { t: T.incline + .3, type: 'label' }, { t: T.inc0, type: 'whir' },
  { t: T.keyOut, type: 'keypull' }, { t: T.keyOut, type: 'motor_off' }, { t: T.restart, type: 'motor_on' }, { t: T.restart + .2, type: 'whir_short' },
  { t: T.next, type: 'card' }, { t: T.card, type: 'card' }];
for (const s of STRIKES) EV.push({ t: +s.toFixed(3), type: 'step' });
{ let prev = false; for (let t = T.slow0; t < T.slow1; t += 1 / 120) { const p = pulseAt(t); if (p && !prev) EV.push({ t: +t.toFixed(3), type: 'tick' }); prev = p; } }
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- console screen ----------
function drawScreen(t) {
  const g = scrG; g.fillStyle = '#0c1a14'; g.fillRect(0, 0, 512, 160);
  const on = vBelt(t) > .02 || t < T.keyOut, v = vBelt(t) / VBELT * 5.2;
  g.fillStyle = '#7dffb0'; g.font = '700 92px "JBMono", monospace'; g.textAlign = 'left'; g.fillText(on ? (Math.round(v * 10) / 10).toFixed(1) : '--.-', 24, 112);
  g.font = '500 30px "JBMono", monospace'; g.fillText('MPH', 270, 112);
  g.fillStyle = '#ffcf6b'; g.font = '700 40px "JBMono", monospace'; g.fillText((incK(t) * 100).toFixed(0) + '%', 380, 70); g.font = '500 22px "JBMono", monospace'; g.fillText('INCL', 380, 112);
  if (t > T.keyOut && t < T.restart) { g.fillStyle = '#ff6b3d'; g.font = '700 26px "JBMono", monospace'; g.fillText('KEY', 380, 145); }
  scrTex.needsUpdate = true;
}

// ---------- frame ----------
await initOverlay({ VDUR, TL });
const tmp = new THREE.Vector3();
window.render = t => {
  const ek = explK(t), grade = incK(t);
  tilt.rotation.z = Math.atan(grade);
  for (const n of Object.keys(P)) P[n].g.position.copy(P[n].d).multiplyScalar(ek);
  // lead screw spins while the grade changes; the nut sits where the frame meets the screw
  screw.rotation.y = grade * 300;
  // belt + rollers + motor
  const s = beltPos(t);
  marks.forEach((m, i) => { const [x, y, a] = beltPt(s + i * LP / marks.length); m.position.set(x, y, 0); m.rotation.z = -a; });
  const th = s / RR; front.rotation.z = th; rear.rotation.z = th;
  const thm = th * PR / MPR; fly.rotation.z = thm; mp.rotation.z = thm;
  // sensor + magnet glow when a pulse fires (pulse beat), controller glows with current (foot-strike beat)
  const pb = (t > T.magnet - .2 && t < T.strike) ? 1 : 0, pon = pulseAt(t);
  M.sensor.emissiveIntensity = pb * (pon ? 2.2 : .15); M.magnet.emissiveIntensity = pb * .5;
  const cb = env01(t, T.ctrl - .2, T.incline), hb = Math.max(cb, env01(t, T.magnet - .6, T.strike));
  M.hoodT.opacity = 1 - .8 * hb; M.hoodT.depthWrite = hb < .05;
  { const pk = env01(t, T.magnet - .6, T.strike); M.postT.opacity = 1 - .85 * pk; M.postT.depthWrite = pk < .05; }
  M.pcb.emissiveIntensity = cb * (current(t) - .3) * 1.2;
  // shoes during the foot-strike beat
  const shoeOn = t > T.strike - .1 && t < T.incline - .1;
  shoes.forEach((g, i) => { g.visible = shoeOn; if (!shoeOn) return;
    const per = .77, ph = ((t - (T.strike + .5) - i * .385) % per + per) % per;   // stance .3 s then swing
    const stance = ph < .3, u = stance ? ph / .3 : (ph - .3) / (per - .3);
    const x = stance ? lerp(.45, .45 - .3 * .9, u) : lerp(.45 - .27, .45, u), y = stance ? 0 : Math.sin(Math.PI * u) * .22;
    g.position.set(x, RY + BRO + .001 + y, i ? -.12 : .12); g.rotation.z = stance ? 0 : Math.sin(Math.PI * u) * .25; });
  // safety key: pulled out on its cord
  const kk = eo(seg(t, T.keyOut - .15, T.keyOut + .25)) * (1 - ss(seg(t, T.restart - .4, T.restart)));
  keyG.position.set(-.07 - .32 * kk, -.07 - .12 * kk, .34 + .1 * kk); keyG.rotation.x = kk * .8;
  drawScreen(t);
  setCamera(t);
  post.composer.render();
  const wp = o => o.getWorldPosition(tmp).clone();
  drawOverlay(t, camera, { W, H, T, A, wp, ek, grade, vBelt, current, pulseAt, VBELT, STRIKES });
};
function env01(t, a, b) { return ss(seg(t, a, a + .3)) * (1 - ss(seg(t, b - .3, b))); }
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
