// How Train Systems Operate — Exploded Teardown, 1080×1920. render(t) draws one frame; everything is a function of t.
// Units: metres. World X = along the car, Y = up, Z = across (gauge direction). Illustrative model, not CAD.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, eio, eo, track } from '/core/lib.js';
import { initOverlay, drawOverlay, overlayTexts } from './overlay.js';

const W = 1080, H = 1920;
const Q = new URLSearchParams(location.search);
const SSAA = +(Q.get('ssaa') || 2);
const TL = await (await fetch('timeline.json')).json();
const VDUR = await (await fetch('voice/dur.json')).json();
const DUR = TL.dur;
const VO = Object.fromEntries(TL.vo.map(v => [v.id, v.t]));

// ---------- key times ----------
export const T = {
  split: 2.6, splitStep: .18, splitDur: 1.7,
  pantoDip: 13.9,
  steer0: 33.6, steer1: 36.2, steerBack: 38.6,
  ptc: 45.4,
  close: 58.6, closeStep: .2, closeDur: 1.0,
};
const ORDER_UP = ['wire', 'panto', 'body', 'equip', 'motor', 'bogie', 'wheel'];      // top first
const ORDER_DOWN = ['wheel', 'bogie', 'motor', 'equip', 'body', 'panto', 'wire'];    // bottom first
const OFF = { rail: 0, wheel: 1.1, bogie: 2.2, motor: 3.2, equip: 4.6, body: 6.6, panto: 8.0, wire: 9.4 };
const UP = {}, DOWN = {};
ORDER_UP.forEach((k, i) => UP[k] = T.split + i * T.splitStep);
ORDER_DOWN.forEach((k, i) => DOWN[k] = T.close + i * T.closeStep);

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, .3, 400);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, ao: false });
post.bloom.strength = .45; post.bloom.radius = .5; post.bloom.threshold = 2.4;
post.vig.uniforms.amt.value = .34; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .1;
{
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createRadialGradient(560, 860, 80, 540, 960, 1500);
  gr.addColorStop(0, '#34363a'); gr.addColorStop(.45, '#222427'); gr.addColorStop(1, '#0d0e10');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture;
scene.environmentIntensity = .42; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff1e2', 1.7);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 });
key.shadow.bias = -.0004; key.shadow.normalBias = .03; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 5.5, 22, 6); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .5, 24, 24); scene.add(top);
const inner = new THREE.PointLight('#ffe2c4', 0, 6, 1.6); scene.add(inner);   // practical fill for the equipment stop
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .2));

const ACC = '#ff6b3d';
const M = {
  body: new THREE.MeshPhysicalMaterial({ color: '#d9dcde', roughness: .38, metalness: .25, clearcoat: .6, clearcoatRoughness: .25 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#141a20', roughness: .08, metalness: .2, clearcoat: 1 }),
  stripe: new THREE.MeshPhysicalMaterial({ color: ACC, roughness: .4, clearcoat: .5 }),
  under: new THREE.MeshStandardMaterial({ color: '#3a3d42', roughness: .6 }),
  steel: new THREE.MeshStandardMaterial({ color: '#c9ccd0', roughness: .22, metalness: 1 }),
  wheel: new THREE.MeshStandardMaterial({ color: '#8d9196', roughness: .35, metalness: 1, side: THREE.DoubleSide }),
  tread: new THREE.MeshStandardMaterial({ color: '#d4d7da', roughness: .15, metalness: 1, side: THREE.DoubleSide }),
  frame: new THREE.MeshPhysicalMaterial({ color: '#3b3f45', roughness: .5, metalness: .3, clearcoat: .2 }),
  spring: new THREE.MeshStandardMaterial({ color: '#5b6068', roughness: .4, metalness: .8 }),
  motor: new THREE.MeshPhysicalMaterial({ color: '#4f5a66', roughness: .45, metalness: .5, clearcoat: .3 }),
  copper: new THREE.MeshStandardMaterial({ color: '#b87333', roughness: .3, metalness: 1 }),
  xfmr: new THREE.MeshPhysicalMaterial({ color: '#757a80', roughness: .45, metalness: .6 }),
  cab: new THREE.MeshPhysicalMaterial({ color: '#2d3136', roughness: .5, clearcoat: .2 }),
  led: new THREE.MeshStandardMaterial({ color: '#202020', emissive: '#9fd4ff', emissiveIntensity: 0 }),
  insul: new THREE.MeshPhysicalMaterial({ color: '#8a5a3c', roughness: .25, clearcoat: .8 }),
  carbon: new THREE.MeshStandardMaterial({ color: '#1c1c1d', roughness: .8 }),
  wire: new THREE.MeshStandardMaterial({ color: '#b98a5c', roughness: .3, metalness: 1 }),
  sleeper: new THREE.MeshStandardMaterial({ color: '#6b6560', roughness: .9 }),
  rail: new THREE.MeshStandardMaterial({ color: '#9ea2a6', roughness: .3, metalness: 1 }),
  energy: new THREE.MeshStandardMaterial({ color: '#000000', emissive: ACC, emissiveIntensity: 6 }),
  sat: new THREE.MeshPhysicalMaterial({ color: '#c8b46a', roughness: .3, metalness: 1 }),
  panel: new THREE.MeshPhysicalMaterial({ color: '#1d2a44', roughness: .2, metalness: .6, clearcoat: 1, emissive: '#1a2c55', emissiveIntensity: .3 }),
  screen: new THREE.MeshStandardMaterial({ color: '#111', emissive: '#7fe0a8', emissiveIntensity: 0 }),
};
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x, y, z) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const cylZ = (r, len, mat, x, y, z, seg = 32) => { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateX(Math.PI / 2); const m = sh(new THREE.Mesh(g, mat)); m.position.set(x, y, z); return m; };
const UNIT = new THREE.CylinderGeometry(1, 1, 1, 14);
function rod(r, mat) { const m = sh(new THREE.Mesh(UNIT, mat)); m.userData.r = r; return m; }
const _d = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
function place(m, a, b) { _d.subVectors(b, a); const len = _d.length(); m.position.copy(a).add(b).multiplyScalar(.5); m.scale.set(m.userData.r, len, m.userData.r); m.quaternion.setFromUnitVectors(_up, _d.normalize()); }

const L = {}; for (const k of ['rail', 'wheel', 'bogie', 'motor', 'equip', 'body', 'panto', 'wire', 'ptc']) { L[k] = new THREE.Group(); scene.add(L[k]); }

// ---------- rail + sleepers ----------
const RAIL_TOP = .172, GAUGE = 1.435, CONTACT_Z = GAUGE / 2 + .0355;
{
  const s = new THREE.Shape();
  const P = [[-.075, 0], [.075, 0], [.075, .012], [.009, .03], [.009, .125], [.035, .135], [.036, .172], [-.036, .172], [-.035, .135], [-.009, .125], [-.009, .03], [-.075, .012]];
  s.moveTo(...P[0]); for (const p of P.slice(1)) s.lineTo(...p); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 14, bevelEnabled: false }); g.translate(0, 0, -7); g.rotateY(Math.PI / 2);
  for (const z of [-CONTACT_Z, CONTACT_Z]) { const m = sh(new THREE.Mesh(g, M.rail)); m.position.z = z; L.rail.add(m); }
  for (let x = -6.9; x <= 6.9; x += .6) L.rail.add(box(.24, .16, 2.6, M.sleeper, x, -.08, 0));
}
const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ color: '#000', opacity: .35 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -.16; floor.receiveShadow = true; scene.add(floor);

// ---------- wheelsets: conical tread (taper exaggerated for legibility) ----------
const WR = .46, WY = RAIL_TOP + WR, INNER = GAUGE / 2 - .012;
const TAPER = .13;                              // radius lost per metre of tread (illustrative)
const treadR = s => .468 - TAPER * (s - .025);  // s = distance outward from the wheel's inner face
const AXLES = [-3.1, -.9, .9, 3.1];
const wheelsets = [];
{
  const prof = [[.085, .02], [.085, .11], [.16, .12], [.38, .09], [.40, .135], [treadR(.135), .135], [treadR(.025), .025], [.49, .012], [.488, 0], [.40, 0], [.38, .04], [.16, 0], [.13, -.02], [.085, -.02]];
  const pts = prof.map(([r, s]) => new THREE.Vector2(r, s));
  const gR = new THREE.LatheGeometry(pts, 64); gR.rotateX(Math.PI / 2); gR.computeVertexNormals();
  const gL = new THREE.LatheGeometry(pts, 64); gL.rotateX(-Math.PI / 2); gL.computeVertexNormals();
  for (const x of AXLES) {
    const ws = new THREE.Group(); ws.position.set(x, WY, 0);
    const spin = new THREE.Group(); ws.add(spin);
    const r = sh(new THREE.Mesh(gR, M.wheel)); r.position.z = INNER; spin.add(r);
    const l = sh(new THREE.Mesh(gL, M.wheel)); l.position.z = -INNER; spin.add(l);
    spin.add(cylZ(.085, 2.3, M.steel, 0, 0, 0));
    for (const z of [-INNER - .14, INNER + .02]) spin.add(box(.06, .06, .12, M.frame, 0, .3, z + .06));   // balance weights show rotation
    for (const z of [-1.07, 1.07]) ws.add(box(.26, .22, .2, M.frame, 0, 0, z));                        // axle boxes
    L.wheel.add(ws); wheelsets.push({ ws, spin, x });
  }
}
// ---------- bogie frames ----------
for (const bx of [-2, 2]) {
  for (const z of [-1.07, 1.07]) L.bogie.add(box(2.9, .22, .16, M.frame, bx, WY + .27, z));
  L.bogie.add(box(.5, .22, 2.3, M.frame, bx, WY + .3, 0));
  for (const dx of [-1.1, 1.1]) for (const z of [-1.07, 1.07]) {
    const sp = cylZ(.09, .2, M.spring, bx + dx, WY + .2, z); sp.rotation.x = 0; sp.geometry = new THREE.CylinderGeometry(.09, .09, .16, 16); L.bogie.add(sp);
  }
  for (const z of [-.7, .7]) L.bogie.add(box(.3, .1, .3, M.spring, bx, WY + .45, z));   // secondary suspension pads
}
// ---------- traction motors + gearboxes (powered bogie only) ----------
const motors = [];
for (const [mx, ax] of [[-2.55, -3.1], [-1.45, -.9]]) {
  const g = new THREE.Group();
  g.add(cylZ(.26, .72, M.motor, mx, WY - .02, -.18));
  for (let i = 0; i < 6; i++) g.add(cylZ(.275, .025, M.motor, mx, WY - .02, -.48 + i * .11));
  g.add(cylZ(.18, .04, M.copper, mx, WY - .02, -.56));
  g.add(box(Math.abs(ax - mx) + .3, .5, .2, M.cab, (mx + ax) / 2, WY - .02, .38));
  const gear = cylZ(.24, .05, M.copper, ax, WY, .38, 48); g.add(gear);
  L.motor.add(g); motors.push({ g, mx, ax, gear });
}
// ---------- equipment: transformer + traction converter ----------
const FLOOR = 1.45;
{
  L.equip.add(box(1.3, 1.0, 1.1, M.xfmr, -1.0, FLOOR + .5, 0));
  for (let i = 0; i < 9; i++) L.equip.add(box(.03, .85, .22, M.xfmr, -1.55 + i * .135, FLOOR + .5, .66));
  for (const dz of [-.3, 0, .3]) { const b = cylZ(.07, .25, M.insul, -1.0, FLOOR + 1.1, dz); b.geometry = new THREE.CylinderGeometry(.06, .08, .22, 16); L.equip.add(b); }
  L.equip.add(box(1.1, 1.5, 1.0, M.cab, 1.1, FLOOR + .75, 0));
  for (let i = 0; i < 7; i++) L.equip.add(box(.8, .03, .02, M.xfmr, 1.1, FLOOR + .35 + i * .12, .51));
  L.equip.add(box(.7, .04, .02, M.led, 1.1, FLOOR + 1.3, .515));
  L.equip.add(box(.02, .04, .5, M.led, 1.655, FLOOR + 1.3, 0));
}
// ---------- body shell ----------
const ROOF = 4.05, BLEN = 7;
{
  const s = new THREE.Shape();
  s.moveTo(-1.45, FLOOR); s.lineTo(1.45, FLOOR); s.lineTo(1.5, 3.55); s.quadraticCurveTo(1.47, ROOF, .95, ROOF);
  s.lineTo(-.95, ROOF); s.quadraticCurveTo(-1.47, ROOF, -1.5, 3.55); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: BLEN, bevelEnabled: true, bevelThickness: .06, bevelSize: .05, bevelSegments: 4, curveSegments: 16 });
  g.translate(0, 0, -BLEN / 2); g.rotateY(Math.PI / 2);
  L.body.add(sh(new THREE.Mesh(g, M.body)));
  for (const z of [-1.525, 1.525]) {
    for (const x of [-2.2, -1.0, .2, 1.4, 2.6]) L.body.add(box(.9, .55, .02, M.glass, x, 3.0, z));
    L.body.add(box(BLEN - .2, .1, .02, M.stripe, 0, 2.25, z));
    L.body.add(box(BLEN - .2, .04, .02, M.stripe, 0, 2.42, z));
  }
  L.body.add(box(.02, .7, 2.1, M.glass, -3.56, 3.05, 0));
  L.body.add(box(BLEN, .35, 2.7, M.under, 0, FLOOR - .17, 0));
  // roof antenna (PTC radio), small
  L.body.add(box(.08, .25, .08, M.under, -2.7, ROOF + .14, .4));
  L.body.add(box(.3, .03, .3, M.under, -2.7, ROOF + .02, .4));
}
// ---------- pantograph ----------
const PX0 = .95, PB = ROOF + .06, PIV = new THREE.Vector3(PX0, PB + .34, 0), WIRE_Y = 5.3;
const panto = { arms: [], upper: [], head: new THREE.Group() };
{
  L.panto.add(box(1.5, .06, .9, M.under, 1.0, PB + .25, 0));
  for (const [x, z] of [[.35, -.4], [.35, .4], [1.65, -.4], [1.65, .4]]) {
    const ins = new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, .2, 16), M.insul); ins.position.set(x, PB + .11, z); sh(ins); L.panto.add(ins);
  }
  for (const z of [-.28, .28]) { const r = rod(.03, M.steel); L.panto.add(r); panto.arms.push({ r, z }); }
  for (const z of [-.08, .08]) { const r = rod(.022, M.steel); L.panto.add(r); panto.upper.push({ r, z }); }
  const bar = cylZ(.02, 1.7, M.steel, 0, 0, 0, 12); panto.head.add(bar);
  panto.head.add(box(.07, .035, 1.2, M.carbon, 0, .03, 0));
  for (const s of [-1, 1]) { const h = rod(.018, M.steel); place(h, new THREE.Vector3(0, 0, s * .85), new THREE.Vector3(0, -.18, s * 1.02)); panto.head.add(h); }
  L.panto.add(panto.head);
}
function setPanto(raise) {
  const headY = lerp(PIV.y + .35, WIRE_Y - .05, raise), H0 = new THREE.Vector3(PX0 + .05, headY, 0);
  const L1 = .56, L2 = .56;
  const dx = H0.x - PIV.x, dy = H0.y - PIV.y, d = Math.min(Math.hypot(dx, dy), L1 + L2 - .01);
  const a = Math.atan2(dy, dx), b = Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d));
  const K = new THREE.Vector3(PIV.x + L1 * Math.cos(a - b), PIV.y + L1 * Math.sin(a - b), 0);
  for (const { r, z } of panto.arms) place(r, new THREE.Vector3(PIV.x, PIV.y, z), new THREE.Vector3(K.x, K.y, z * .3));
  for (const { r, z } of panto.upper) place(r, new THREE.Vector3(K.x, K.y, z), new THREE.Vector3(H0.x, H0.y - .03, z * 3));
  panto.head.position.copy(H0);
  return H0;
}
// ---------- catenary ----------
const msgY = x => 5.85 + .5 * (x / 7) ** 2;
{
  const cw = cylZ(.012, 14, M.wire, 0, WIRE_Y, 0, 8); cw.rotation.y = Math.PI / 2; L.wire.add(cw);
  const pts = []; for (let x = -7; x <= 7.001; x += .25) pts.push(new THREE.Vector3(x, msgY(x), 0));
  L.wire.add(sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, .014, 8), M.wire)));
  for (let x = -6.3; x <= 6.31; x += .9) { const r = rod(.006, M.wire); place(r, new THREE.Vector3(x, WIRE_Y, 0), new THREE.Vector3(x, msgY(x), 0)); L.wire.add(r); }
  for (const x of [-7, 7]) {
    const arm = rod(.03, M.under); place(arm, new THREE.Vector3(x, msgY(x) + .1, -1.8), new THREE.Vector3(x, msgY(x), 0)); L.wire.add(arm);
    const ins = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, .3, 12), M.insul); ins.rotation.x = Math.PI / 2; ins.position.set(x, msgY(x) + .08, -1.6); L.wire.add(ins);
  }
}
// ---------- PTC layer: satellite, radio mast, onboard computer (fades in at the end) ----------
const PTCY = 17.2;
const ptcMats = [];
{
  const sat = new THREE.Group(); sat.position.set(2.2, PTCY + 2.6, -.5);
  sat.add(box(.7, .7, .7, M.sat, 0, 0, 0));
  for (const s of [-1, 1]) sat.add(box(1.8, .04, .7, M.panel, s * 1.35, 0, 0));
  sat.add(box(.05, .4, .05, M.steel, 0, -.55, 0));
  sat.rotation.set(.3, .6, .15); L.ptc.add(sat);
  const mast = new THREE.Group(); mast.position.set(-3.2, PTCY - 1.2, 0);
  for (const [a, b] of [[[-.35, 0, -.35], [0, 3.2, 0]], [[.35, 0, -.35], [0, 3.2, 0]], [[0, 0, .4], [0, 3.2, 0]]]) { const r = rod(.03, M.steel); place(r, new THREE.Vector3(...a), new THREE.Vector3(...b)); mast.add(r); }
  for (let i = 1; i < 6; i++) { const y = i * .5, s = .35 * (1 - y / 3.2); const r = rod(.015, M.steel); place(r, new THREE.Vector3(-s, y, -s), new THREE.Vector3(s, y, -s)); mast.add(r); }
  mast.add(box(.12, .5, .12, M.panel, 0, 3.4, 0)); L.ptc.add(mast);
  const comp = new THREE.Group(); comp.position.set(-.2, PTCY, .3);
  comp.add(box(1.0, .7, .7, M.cab, 0, 0, 0)); comp.add(box(.7, .35, .02, M.screen, 0, .05, .36));
  for (let i = 0; i < 4; i++) comp.add(box(.06, .02, .02, M.led, -.3 + i * .12, -.25, .36));
  L.ptc.add(comp);
  L.ptc.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; ptcMats.push(o.material); } });
  L.ptc.userData = { sat, mast, comp };
}
// radio wave rings from the mast top and the roof antenna
const rings = [];
for (let i = 0; i < 3; i++) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(1, .015, 8, 64), new THREE.MeshBasicMaterial({ color: '#ffd2bf', transparent: true, opacity: 0 }));
  scene.add(m); rings.push(m);
}
// ---------- energy particles ----------
const NE = 22, energy = [];
for (let i = 0; i < NE; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), M.energy); scene.add(m); energy.push(m); }

// ---------- motion ----------
const pop = x => 1 - Math.pow(1 - ss(x), 3);
const layerE = (k, t) => k === 'rail' ? 0 : pop(seg(t, UP[k], UP[k] + T.splitDur)) * (1 - eio(seg(t, DOWN[k], DOWN[k] + T.closeDur)));
const FLP = { wheel: 0, bogie: .7, motor: 1.4, equip: 2.1, body: 2.8, panto: 3.5, wire: 4.2 };
const holdStill = t => 1 - seg(t, 27.6, 28.4) * (1 - seg(t, 39.4, 40.2));      // still during the wheel macro
// the wheelsets come back down onto the rail for the steering stop
const onRail = t => eio(seg(t, 31.3, 32.5)) * (1 - eio(seg(t, 39.3, 40.3)));
const layerY = (k, t) => { const e = layerE(k, t) * (k === 'wheel' ? 1 - onRail(t) : 1); return OFF[k] * e + (k === 'rail' ? 0 : e * e * .04 * Math.sin(t * 2.2 + FLP[k]) * holdStill(t)); };

// lateral wheelset shift on the curve (exaggerated) and its return
const steer = t => .055 * (eio(seg(t, T.steer0, T.steer0 + 1.2)) - eio(seg(t, T.steerBack, T.steerBack + .9)));
// wheel rotation angle: rolling from the motor stop through the wheel stop, braking at the regen stop
function wheelAngle(t) {
  const v = tt => clamp(seg(tt, 24.4, 25.4) - seg(tt, 40.6, 44.2));   // normalized speed
  let a = 0; const dt = 1 / 48;
  for (let x = 24.4; x < Math.min(t, 44.5); x += dt) a += v(x) * 2.2 * dt;
  return a;
}

// ---------- camera: [t, az°, el°, dist, tx, ty, tz, fov] ----------
const CAMK = [
  [0.0, 28, 12, 22, 0, 2.6, 0, 30],
  [2.6, 33, 12, 24, 0, 4.2, 0, 30],
  [5.4, 42, 10, 37, 0, 8.4, 0, 30],
  [6.6, 46, 9, 36, 0, 8.6, 0, 30],
  [8.0, 52, 8, 13, .3, 14.4, 0, 30],
  [12.0, 58, 7, 11.5, .8, 13.6, 0, 30],
  [13.2, 62, 10, 9.5, 1.0, 13.0, 0, 30],
  [17.6, 68, 12, 9.8, 1.0, 12.8, 0, 30],
  [18.8, 58, 15, 10, 0, 6.9, 0, 30],
  [23.8, 42, 16, 9.4, 0, 6.8, 0, 30],
  [24.8, 26, 18, 7.6, -2.0, 3.9, 0, 30],
  [27.3, 6, 16, 7.6, -2.0, 3.7, 0, 30],
  [28.4, -48, 5, 4.4, -3.1, 1.85, .3, 30],
  [31.6, -64, 5, 4.2, -3.1, 1.8, .2, 30],
  [32.8, -90, 7, 9.0, -3.1, .85, 0, 30],
  [39.2, -90, 7, 9.0, -3.1, .85, 0, 30],
  [40.4, -70, 12, 15, -.8, 6.0, 0, 30],
  [44.6, -50, 12, 17, -.4, 7.4, 0, 30],
  [46.0, -26, 8, 34, 0, 13.0, 0, 30],
  [53.4, -8, 8, 34, 0, 13.0, 0, 30],
  [55.2, -4, 8, 39, 0, 15.8, 0, 30],
  [58.4, 12, 10, 40, 0, 8.8, 0, 30],
  [61.2, 28, 12, 22, 0, 2.7, 0, 30],
  [65.5, 36, 13, 21, 0, 2.7, 0, 30],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz, fov] = camTrack(t);
  const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A));
  camera.fov = fov; camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 260; post.dof.maxCoc = 12;
  const la = A - .9;
  key.position.set(tx + 22 * Math.sin(la), ty + 26, tz + 22 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 20 * Math.sin(A + Math.PI * .85), ty + 6, tz + 20 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz);
  top.position.set(tx, ty + 18, tz); top.lookAt(tx, ty, tz);
}

// ---------- energy path through the (moving) layers ----------
function energyPath(t, head) {
  const y = k => layerY(k, t);
  return [
    new THREE.Vector3(head.x, WIRE_Y + y('wire'), 0),
    new THREE.Vector3(head.x, head.y + y('panto'), 0),
    new THREE.Vector3(1.0, PB + .25 + y('panto'), 0),
    new THREE.Vector3(1.0, ROOF + y('body'), 0),
    new THREE.Vector3(-1.0, FLOOR + 1.1 + y('equip'), 0),
    new THREE.Vector3(-1.0, FLOOR + .5 + y('equip'), .3),
    new THREE.Vector3(1.1, FLOOR + .9 + y('equip'), .3),
    new THREE.Vector3(1.1, FLOOR + y('equip'), 0),
    new THREE.Vector3(-1.45, WY + .25 + y('motor'), -.18),
    new THREE.Vector3(-1.45, WY - .02 + y('motor'), -.18),
    new THREE.Vector3(-.9, WY + y('wheel'), .38),
  ];
}
function along(P, u) {
  const L0 = []; let tot = 0; for (let i = 1; i < P.length; i++) { const d = P[i].distanceTo(P[i - 1]); L0.push(d); tot += d; }
  let s = u * tot; for (let i = 0; i < L0.length; i++) { if (s <= L0[i]) return P[i].clone().lerp(P[i + 1], s / L0[i]); s -= L0[i]; }
  return P[P.length - 1].clone();
}

// ---------- events for the mixer ----------
const EV = [];
for (const k of ORDER_UP) EV.push({ t: UP[k], type: 'lift', layer: k });
for (const k of ORDER_DOWN) EV.push({ t: +(DOWN[k] + T.closeDur).toFixed(3), type: 'land', layer: k });
EV.push({ t: T.pantoDip, type: 'pantoDip' }, { t: T.pantoDip + .5, type: 'pantoUp' });
EV.push({ t: 32.5, type: 'land', layer: 'wheel' }, { t: 39.3, type: 'lift', layer: 'wheel' });
EV.push({ t: T.steer0, type: 'steer' }, { t: T.steerBack, type: 'steerBack' }, { t: T.ptc, type: 'ptc' });
EV.push({ t: 24.4, type: 'spinUp' }, { t: 40.6, type: 'regen' }, { t: 7.6, type: 'energy' }, { t: 27.4, type: 'energyOff' });
for (let i = 0; i < 6; i++) EV.push({ t: +(T.ptc + .8 + i * 1.6).toFixed(2), type: 'radio' });
EV.push({ t: 61.4, type: 'card' });
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VO, VDUR, TL });
const world = (k, x, y, z) => new THREE.Vector3(x, y + (k ? layerY(k, curT) : 0), z);
let curT = 0;
window.render = t => {
  curT = t;
  for (const k of Object.keys(OFF)) L[k].position.y = layerY(k, t);
  // pantograph: raised all film; a spring dip during its stop
  const dip = seg(t, T.pantoDip, T.pantoDip + .35) * (1 - eo(seg(t, T.pantoDip + .45, T.pantoDip + 1.0)));
  const head = setPanto(1 - .45 * dip);
  // wheels
  const ang = wheelAngle(t), lat = steer(t);
  for (const w of wheelsets) { w.spin.rotation.z = -ang; w.ws.position.z = lat; }
  for (const m of motors) m.gear.rotation.z = -ang;
  // lights inside the equipment while apart
  M.led.emissiveIntensity = 3.5 * clamp(layerE('equip', t) * 1.3);
  inner.intensity = 6 * seg(t, 18.2, 19.0) * (1 - seg(t, 23.8, 24.6));
  inner.position.set(0, FLOOR + 2.2 + layerY('equip', t), 1.6);
  // energy: down the chain 7.6–27.4, back up 40.6–44.4
  const fwd = seg(t, 7.6, 8.4) * (1 - seg(t, 26.8, 27.4)), rev = seg(t, 40.6, 41.2) * (1 - seg(t, 44.0, 44.6));
  const P = energyPath(t, head);
  energy.forEach((m, i) => {
    const on = Math.max(fwd, rev); m.visible = on > .01;
    if (!m.visible) return;
    const dir = rev > fwd ? -1 : 1, u = ((i / NE + dir * t * .09) % 1 + 1) % 1;
    m.position.copy(along(P, u)); m.scale.setScalar(on);
  });
  // PTC layer
  const pk = ss(seg(t, T.ptc, T.ptc + 1.4)) * (1 - ss(seg(t, 57.6, 58.6)));
  L.ptc.visible = pk > .01; for (const mt of ptcMats) mt.opacity = pk;
  L.ptc.position.y = (1 - pk) * 1.2;
  M.screen.emissiveIntensity = 2.2 * pk;
  L.ptc.userData.sat.rotation.y = .6 + t * .05;
  const antenna = new THREE.Vector3(-2.7, ROOF + .3 + layerY('body', t), .4), mastTop = new THREE.Vector3(-3.2, PTCY - 1.2 + 3.4 + L.ptc.position.y, 0);
  rings.forEach((r, i) => {
    const ph = ((t - T.ptc) * .55 + i / 3) % 1, src = i === 1 ? antenna : mastTop;
    r.visible = pk > .01 && t > T.ptc;
    r.position.copy(src); r.rotation.x = Math.PI / 2; r.scale.setScalar(.2 + ph * 3.2); r.material.opacity = pk * (1 - ph) * .8;
  });
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { world, W, H, head, layerY, lat, treadR, INNER, WY, CONTACT_Z, RAIL_TOP, antenna, mastTop, satPos: L.ptc.userData.sat.getWorldPosition(new THREE.Vector3()), compPos: L.ptc.userData.comp.getWorldPosition(new THREE.Vector3()), pk });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
