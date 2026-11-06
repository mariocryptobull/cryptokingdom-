// How Plastic Parts Are Made (injection molding) — Exploded Teardown, 1080×1920. render(t) is a pure function of t.
// Units: metres. Machine axis = world X (clamp on −X, injection unit on +X), Y up. Illustrative model, not CAD.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, eio, eo, track } from '/core/lib.js';
import { initOverlay, drawOverlay, overlayTexts, makeCues } from './overlay.js';

const W = 1080, H = 1920;
const Q = new URLSearchParams(location.search);
const SSAA = +(Q.get('ssaa') || 1);
const TL = await (await fetch('timeline.json')).json();
const VDUR = await (await fetch('voice/dur.json')).json();
const DUR = TL.dur;
const CUES = makeCues(TL, VDUR);
const cue = (id, i) => CUES.find(c => c.id === id && c.i === i).t0 + .04;   // when a caption chunk starts being spoken

// ---------- key times (tied to the narration) ----------
const T = {
  machineIn: 6.6,
  explode: cue('v02', 1) + .3,
  pellets: cue('v03', 0), hopper: cue('v03', 1), barrel: cue('v03', 2),
  screw: cue('v04', 0), spin: cue('v04', 2), plunge: cue('v04', 4) + .25,
  nozzle: cue('v05', 1), sprue: cue('v05', 2), runner: cue('v05', 3), gate: cue('v05', 4), cavity: cue('v05', 5),
  assemble: 34.5, clamp: cue('v06', 1),
  cool: cue('v07', 1), water: cue('v07', 2),
  open: cue('v08', 0) + .1, eject: cue('v08', 1) + .2,
  show: 49.6, cycle: cue('v09', 1), cav: cue('v09', 3),
  montage: 58.8, card: cue('v10', 2),
};
window.T = T;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, .1, 300);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, ao: false });
post.bloom.strength = .5; post.bloom.radius = .5; post.bloom.threshold = 2.2;
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
scene.environmentIntensity = .45; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff1e2', 1.7);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 60 });
key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 5, 16, 5); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .5, 16, 16); scene.add(top);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .22));

const ACC = '#ff6b3d', PLASTIC = '#1fa5a0';
const M = {
  body: new THREE.MeshPhysicalMaterial({ color: '#d7dadc', roughness: .4, metalness: .2, clearcoat: .5, clearcoatRoughness: .3 }),
  dark: new THREE.MeshPhysicalMaterial({ color: '#3a3e44', roughness: .5, metalness: .4, clearcoat: .2 }),
  steel: new THREE.MeshStandardMaterial({ color: '#c3c7cc', roughness: .2, metalness: 1 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#e4e7ea', roughness: .08, metalness: 1 }),
  mold: new THREE.MeshPhysicalMaterial({ color: '#9aa1a8', roughness: .28, metalness: .9, transparent: true }),
  moldB: new THREE.MeshPhysicalMaterial({ color: '#8c939b', roughness: .3, metalness: .9, transparent: true }),
  recess: new THREE.MeshStandardMaterial({ color: '#2b2f34', roughness: .4, metalness: .8 }),
  barrel: new THREE.MeshPhysicalMaterial({ color: '#b9c0c6', roughness: .25, metalness: .7, transparent: true, opacity: .32, depthWrite: false }),
  heater: new THREE.MeshStandardMaterial({ color: '#4a3a30', roughness: .5, metalness: .6, emissive: '#ff5a1f', emissiveIntensity: 0 }),
  screw: new THREE.MeshStandardMaterial({ color: '#d2d6da', roughness: .18, metalness: 1 }),
  melt: new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff7a2a', emissiveIntensity: 4 }),
  plastic: new THREE.MeshPhysicalMaterial({ color: PLASTIC, roughness: .35, clearcoat: .6, clearcoatRoughness: .3 }),
  water: new THREE.MeshStandardMaterial({ color: '#0b2a3a', emissive: '#3fc8ff', emissiveIntensity: 0, transparent: true }),
  cap1: new THREE.MeshPhysicalMaterial({ color: '#e8e4da', roughness: .4, clearcoat: .4 }),
  case1: new THREE.MeshPhysicalMaterial({ color: '#2d3a55', roughness: .35, clearcoat: .7 }),
  key1: new THREE.MeshPhysicalMaterial({ color: '#d9d4c9', roughness: .6, sheen: .3 }),
};
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const cylX = (r, len, mat, x = 0, y = 0, z = 0, seg = 32, r2) => { const g = new THREE.CylinderGeometry(r2 ?? r, r, len, seg); g.rotateZ(Math.PI / 2); const m = sh(new THREE.Mesh(g, mat)); m.position.set(x, y, z); return m; };
const cylY = (r, len, mat, x = 0, y = 0, z = 0, seg = 32, r2) => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(r2 ?? r, r, len, seg), mat)); m.position.set(x, y, z); return m; };

// ---------- groups: assembled anchor A, exploded target E (a vertical column), optional exploded yaw ----------
const CY = 1.45;     // machine centreline height
const OPEN = .7;     // mold opening stroke
const G = {};
function grp(k, A, E, yaw = 0) { const g = new THREE.Group(); scene.add(g); G[k] = { g, A: new THREE.Vector3(...A), E: new THREE.Vector3(...E), yaw }; return g; }
const bed = grp('bed', [0, 0, 0], [0, 0, 0]);
const clampU = grp('clamp', [-1.0, CY, 0], [-.35, 2.5, 0]);
const moldB = grp('moldB', [-.48, CY, 0], [-.05, 4.05, 0], -2.4);
const moldA = grp('moldA', [-.12, CY, 0], [.05, 5.35, 0], .75);
const nozzle = grp('nozzle', [.45, CY, 0], [.15, 6.45, 0]);
const barrel = grp('barrel', [1.53, CY, 0], [.2, 7.35, 0]);
const screwG = grp('screw', [1.6, CY, 0], [.25, 8.3, 0]);
const hopper = grp('hopper', [2.25, CY + .17, 0], [.55, 9.05, 0]);

// bed
bed.add(box(5.8, .9, 1.25, M.body, .1, .45, 0));
bed.add(box(5.9, .06, 1.3, M.dark, .1, .93, 0));
bed.add(box(5.6, .12, 1.0, M.dark, .1, .06, 0));
bed.add(box(.8, .5, .04, M.dark, 1.8, .55, .64));                 // control panel
bed.add(box(.6, .3, .02, new THREE.MeshStandardMaterial({ color: '#111', emissive: '#7fe0a8', emissiveIntensity: .8 }), 1.8, .62, .665));
// clamping unit (local to anchor x = −1.0): rear platen, clamp cylinder, tie bars, stationary platen
clampU.add(box(.26, 1.3, 1.3, M.dark, -1.05, 0, 0));
clampU.add(cylX(.3, .9, M.body, -1.65, 0, 0));
clampU.add(cylX(.12, .6, M.chrome, -.65, 0, 0));
for (const y of [-.52, .52]) for (const z of [-.52, .52]) clampU.add(cylX(.045, 2.5, M.chrome, 0, y, z, 20));
clampU.add(box(.28, 1.3, 1.3, M.dark, 1.2, 0, 0));
clampU.add(cylX(.09, .3, M.steel, 1.2, 0, 0));
// mold A (stationary half, cavity side). Local x: −0.18 = parting face. Cavities at (y, z) = (±.22, ±.22)
const CAV = [[.22, .22], [.22, -.22], [-.22, .22], [-.22, -.22]];
const FACE = -.18;
moldA.add(box(.36, 1.0, 1.0, M.mold, 0, 0, 0));
moldA.add(cylX(.05, .37, M.recess, 0, 0, 0, 20));                  // sprue bushing
const meltA = { sprue: null, runners: [], gates: [], cav: [] };
{
  for (const [y, z] of CAV) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .004, 40), M.recess); d.rotation.z = Math.PI / 2; d.position.set(FACE - .002, y, z); moldA.add(d);
    const len = Math.hypot(y, z) - .13, ang = Math.atan2(y, z);
    const r = new THREE.Mesh(new THREE.BoxGeometry(.004, .034, 1), M.recess); r.position.set(FACE - .002, y * len / 2 / Math.hypot(y, z), z * len / 2 / Math.hypot(y, z)); r.rotation.x = -ang; r.scale.z = len - .03; moldA.add(r);
    // melt versions (start hidden)
    const mc = new THREE.Mesh(new THREE.CylinderGeometry(.128, .128, .006, 40), M.melt); mc.rotation.z = Math.PI / 2; mc.position.set(FACE - .005, y, z); mc.scale.set(0, 1, 0); moldA.add(mc); meltA.cav.push(mc);
    const piv = new THREE.Group(); piv.position.set(FACE - .005, 0, 0); piv.rotation.x = -ang; moldA.add(piv);
    const mr = new THREE.Mesh(new THREE.BoxGeometry(.006, .03, 1), M.melt); mr.position.z = .5; const rp = new THREE.Group(); rp.add(mr); rp.scale.set(1, 1, .0001); piv.add(rp); meltA.runners.push({ rp, len: len - .03 });
    const gt = new THREE.Mesh(new THREE.BoxGeometry(.006, .014, .03), M.melt); gt.position.z = len - .015; gt.visible = false; piv.add(gt); meltA.gates.push(gt);
  }
  const ms = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .006, 24), M.melt); ms.rotation.z = Math.PI / 2; ms.position.set(FACE - .006, 0, 0); ms.scale.set(0, 1, 0); moldA.add(ms); meltA.sprue = ms;
}
// cooling channels inside A and B (glow when cooling)
const water = [];
for (const grpM of [moldA, moldB]) for (const y of [-.38, 0.0, .38]) { const w = cylX(.03, 1.02, M.water, 0, y, 0, 12); w.rotation.y = Math.PI / 2; grpM.add(w); water.push(w); }
// mold B (moving half, core side) + moving platen + ejector system. Local x: +0.18 = parting face
moldB.add(box(.36, 1.0, 1.0, M.moldB, 0, 0, 0));
moldB.add(box(.22, 1.2, 1.2, M.dark, -.29, 0, 0));
for (const [y, z] of CAV) moldB.add(cylX(.1, .05, M.steel, .2, y, z, 32));       // cores
const ejector = new THREE.Group(); moldB.add(ejector);
for (const [y, z] of CAV) ejector.add(cylX(.018, .5, M.chrome, -.03, y * .6, z * .6, 12));
ejector.add(cylX(.02, .5, M.chrome, -.03, 0, 0, 12));
ejector.add(box(.05, .7, .7, M.dark, -.27, 0, 0));
// the shot: 4 caps + runners + sprue stub (rides on B's cores after the mold opens)
const shot = new THREE.Group(); scene.add(shot);
function makeShot(mat) {
  const s = new THREE.Group();
  for (const [y, z] of CAV) {
    const cap = new THREE.Group(); cap.position.set(0, y, z);
    cap.add(cylX(.13, .1, mat, .0, 0, 0, 40));
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; const r = box(.09, .012, .012, mat, 0, Math.cos(a) * .132, Math.sin(a) * .132); cap.add(r); }
    s.add(cap);
    const len = Math.hypot(y, z) - .13, ang = Math.atan2(y, z);
    const piv = new THREE.Group(); piv.rotation.x = -ang; s.add(piv);
    const r = box(.03, .03, len, mat, -.035, 0, len / 2); piv.add(r);
  }
  s.add(cylX(.04, .25, mat, -.16, 0, 0, 20, .03));
  return s;
}
shot.add(makeShot(M.plastic));
// nozzle (local) — tip toward −x
nozzle.add(cylX(.1, .22, M.steel, 0, 0, 0, 32, .05));
nozzle.add(cylX(.05, .06, M.chrome, -.13, 0, 0, 24, .035));
// barrel (local x −0.97..+0.97) + heater bands + drive
barrel.add(cylX(.17, 1.94, M.barrel, 0, 0, 0, 48));
const heaters = [];
for (const x of [-.7, -.35, 0, .35, .7]) { const h = cylX(.2, .18, M.heater, x, 0, 0, 48); barrel.add(h); heaters.push(h); }
barrel.add(box(.55, .6, .6, M.body, 1.25, 0, 0));
barrel.add(cylX(.22, .3, M.dark, 1.65, 0, 0));
barrel.add(box(.3, .1, .3, M.dark, .72, .2, 0));      // feed throat
// screw (local x −1.0..+1.0): core + helical flight; spins about x
const screw = new THREE.Group(); screwG.add(screw);
screw.add(cylX(.075, 2.0, M.screw, 0, 0, 0, 24));
screw.add(cylX(.075, .12, M.screw, -1.05, 0, 0, 24, .04));
{
  const pts = []; const turns = 12, len = 1.9;
  for (let i = 0; i <= turns * 40; i++) { const u = i / (turns * 40), a = u * turns * Math.PI * 2; pts.push(new THREE.Vector3(-len / 2 + u * len, Math.cos(a) * .115, Math.sin(a) * .115)); }
  screw.add(sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 900, .035, 8), M.screw)));
}
// hopper (local: bottom at y 0)
{
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(.42, .09, .55, 40, 1, true), M.body); cone.material = M.body.clone(); cone.material.side = THREE.DoubleSide; cone.position.y = .45; sh(cone); hopper.add(cone);
  hopper.add(cylY(.09, .18, M.body, 0, .09, 0, 24));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.42, .025, 10, 48), M.dark); rim.rotation.x = Math.PI / 2; rim.position.y = .73; hopper.add(rim);
  const fill = new THREE.Mesh(new THREE.CylinderGeometry(.38, .1, .4, 40), M.plastic); fill.position.y = .48; hopper.add(fill);   // pellets inside
}
// pellets falling (instanced, deterministic)
const NP = 46;
const pellets = new THREE.InstancedMesh(new THREE.SphereGeometry(.028, 8, 6), M.plastic, NP); scene.add(pellets);
const PS = [...Array(NP)].map((_, i) => ({ ph: (i * .6180339) % 1, dx: ((i * 37) % 11 - 5) * .012, dz: ((i * 53) % 9 - 4) * .012 }));
// melt blobs (barrel tip → nozzle → sprue)
const NB = 16, blobs = [...Array(NB)].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(.045, 12, 8), M.melt); scene.add(m); return m; });
// hook products
const prod = new THREE.Group(); prod.position.set(0, 14, 0); scene.add(prod);
const P1 = new THREE.Group(), P2 = new THREE.Group(), P3 = new THREE.Group();
{
  const rs = (w, h, r) => { const s = new THREE.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return s; };
  const cs = rs(.75, 1.5, .14); const hole = new THREE.Path(); hole.absarc(-.2, .55, .09, 0, Math.PI * 2, true); cs.holes.push(hole);
  P1.add(sh(new THREE.Mesh(new THREE.ExtrudeGeometry(cs, { depth: .08, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 4 }), M.case1)));
  P1.position.set(-.55, .1, 0); P1.rotation.set(.2, .5, .15);
  const cap = cylY(.28, .26, M.cap1, 0, 0, 0, 48); P2.add(cap);
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; P2.add(box(.02, .22, .02, M.cap1, Math.cos(a) * .285, 0, Math.sin(a) * .285)); }
  P2.position.set(.55, .55, .1); P2.rotation.set(.9, 0, .3);
  const kg = new THREE.ExtrudeGeometry(rs(.42, .42, .07), { depth: .22, bevelEnabled: true, bevelThickness: .05, bevelSize: .04, bevelSegments: 5 }); kg.rotateX(-Math.PI / 2);
  P3.add(sh(new THREE.Mesh(kg, M.key1))); P3.position.set(.5, -.45, .2); P3.rotation.set(.5, .6, 0);
  prod.add(P1, P2, P3);
}
const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.ShadowMaterial({ color: '#000', opacity: .35 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
// bin + piled shots for the montage
const bin = new THREE.Group(); bin.position.set(-.5, 0, 1.05); scene.add(bin);
bin.add(box(1.1, .04, .7, M.dark, 0, .02, 0)); for (const [x, z, sx, sz] of [[-.55, 0, .04, .7], [.55, 0, .04, .7], [0, -.35, 1.1, .04], [0, .35, 1.1, .04]]) bin.add(box(sx, .35, sz, M.dark, x, .175, z));
const piles = [0, 1, 2].map(i => { const s = makeShot(M.plastic); s.scale.setScalar(.8); scene.add(s); return s; });

// ---------- motion ----------
const pop = x => 1 - Math.pow(1 - ss(x), 3);
const ORDER = ['hopper', 'screw', 'barrel', 'nozzle', 'moldA', 'moldB', 'clamp'];
const explodeE = t => ORDER.map((k, i) => [k, pop(seg(t, T.explode + i * .14, T.explode + i * .14 + 1.6)) * (1 - eio(seg(t, T.assemble + (6 - i) * .12, T.assemble + (6 - i) * .12 + 1.0)))]);
const openAmt = t => {   // mold B stroke: open while apart, closes on "clamp", opens on "open", montage cycles
  let o = 1 - eio(seg(t, T.clamp - .1, T.clamp + .45));
  o += eio(seg(t, T.open, T.open + .8));
  if (t > T.montage) { const k = (t - T.montage) / 1.35; const ph = k % 1, n = Math.floor(k); if (n < 3) o = ph < .25 ? 1 - eio(ph / .25) : ph < .6 ? 0 : eio((ph - .6) / .25); else o = 1; }
  return clamp(o);
};
const ejectAmt = t => {
  let e = ss(seg(t, T.eject, T.eject + .3)) * (1 - ss(seg(t, T.show + .5, T.show + 1.2)));
  if (t > T.montage) { const k = (t - T.montage) / 1.35, ph = k % 1; e = (Math.floor(k) < 3 && ph > .85) ? Math.sin((ph - .85) / .15 * Math.PI) : 0; }
  return e;
};
function place(k, t, e) {
  const o = G[k]; o.g.position.lerpVectors(o.A, o.E, e); o.g.rotation.y = o.yaw * e;
  if (k === 'moldB') o.g.position.x -= OPEN * openAmt(t) * (1 - e);
  o.g.position.y += e * e * .04 * Math.sin(t * 2.1 + ORDER.indexOf(k)) * (1 - seg(t, 27.6, 28.2));
}
function screwState(t) {
  const spin = clamp(seg(t, T.spin - .3, T.spin + .3) - seg(t, T.plunge - .2, T.plunge));
  let a = 0; for (let x = T.spin - .3; x < Math.min(t, T.plunge); x += 1 / 48) a += clamp(seg(x, T.spin - .3, T.spin + .3) - seg(x, T.plunge - .2, T.plunge)) * 6.5 / 48;
  const fwd = eo(seg(t, T.plunge, T.plunge + .25)) * (1 - eio(seg(t, T.assemble, T.assemble + .8)));
  return { a, fwd, spin };
}

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, -12, 6, 6.8, 0, 14.0, 0],
  [5.6, 6, 8, 6.2, 0, 14.0, 0],
  [7.2, -36, 14, 15, .2, 1.5, 0],
  [T.explode, -32, 13, 16, .1, 2.3, 0],
  [T.explode + 2.2, -30, 8, 26, 0, 5.2, 0],
  [T.pellets - .2, -30, 8, 26, 0, 5.2, 0],
  [T.hopper + .4, -24, 10, 8.6, .35, 8.4, 0],
  [T.screw + .2, -20, 8, 7.4, .2, 8.0, 0],
  [T.plunge + .6, -14, 7, 7.6, .15, 7.9, 0],
  [T.nozzle, -30, 10, 10.5, .05, 6.4, 0],
  [T.sprue + .3, -44, 4, 4.0, .02, 5.35, 0],
  [T.assemble - .1, -48, 4, 3.8, .02, 5.35, 0],
  [T.assemble + 1.3, -62, 12, 7.2, -.45, 1.5, 0],
  [T.cool - .3, -52, 12, 6.6, -.35, 1.5, 0],
  [T.cool + .6, -40, 18, 5.4, -.3, 1.45, 0],
  [T.open - .3, -32, 16, 5.6, -.3, 1.45, 0],
  [T.open + .5, 12, 12, 5.2, -.75, 1.45, 0],
  [T.show, 4, 12, 5.0, -.8, 1.7, 0],
  [T.show + 1.4, 0, 10, 3.0, -.7, 2.75, .9],
  [T.montage - .3, -20, 10, 3.0, -.7, 2.75, .9],
  [T.montage + .9, -36, 16, 14, .1, 1.2, .3],
  [DUR, -28, 15, 13, .1, 1.2, .3],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz] = camTrack(t);
  const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A));
  camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 200; post.dof.maxCoc = 10;
  const la = A - .9;
  key.position.set(tx + 16 * Math.sin(la), ty + 18, tz + 16 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 14 * Math.sin(A + Math.PI * .85), ty + 4, tz + 14 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz);
  top.position.set(tx, ty + 12, tz); top.lookAt(tx, ty, tz);
}

// ---------- events for the mixer ----------
const EV = [];
ORDER.forEach((k, i) => EV.push({ t: +(T.explode + i * .14).toFixed(3), type: 'lift', layer: k }));
ORDER.forEach((k, i) => EV.push({ t: +(T.assemble + (6 - i) * .12 + 1.0).toFixed(3), type: 'land', layer: k }));
EV.push({ t: T.pellets, type: 'pellets' }, { t: T.spin, type: 'spin' }, { t: T.plunge, type: 'plunge' }, { t: T.nozzle, type: 'inject' });
EV.push({ t: T.clamp + .45, type: 'clamp' }, { t: T.water, type: 'water' }, { t: T.open, type: 'open' }, { t: T.eject, type: 'eject' });
for (let n = 0; n < 3; n++) { const t0 = T.montage + n * 1.35; EV.push({ t: +(t0 + .33).toFixed(2), type: 'clamp' }, { t: +(t0 + .55).toFixed(2), type: 'inject' }, { t: +(t0 + .82).toFixed(2), type: 'open' }, { t: +(t0 + 1.2).toFixed(2), type: 'drop' }); }
EV.push({ t: T.card, type: 'card' });
for (const lt of [T.explode + 2.0, T.explode + 2.7, T.hopper, T.barrel, T.screw + .2, T.nozzle, T.sprue + .1, T.runner + .2, T.gate + .05, T.cavity + .1, T.clamp + .1, T.water, T.eject, T.show + 1.5, T.cycle - .2, T.cav - .2]) EV.push({ t: +lt.toFixed(2), type: 'label' });
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay(CUES);
const wp = (obj, v) => obj.localToWorld(v.clone());
window.render = t => {
  // product hook
  prod.visible = t < 7.0;
  P1.rotation.y = .5 + t * .35; P2.rotation.y = t * .5; P3.rotation.y = .6 - t * .4;
  prod.position.y = 14 + Math.sin(t * 1.3) * .03;
  // groups
  const ex = Object.fromEntries(explodeE(t));
  for (const k of ORDER) place(k, t, ex[k]);
  place('bed', t, 0);
  // screw
  const s = screwState(t); screw.rotation.x = s.a; screw.position.x = -.26 * s.fwd;
  // heaters
  M.heater.emissiveIntensity = 2.6 * seg(t, T.barrel - .4, T.barrel + .4) * (1 - seg(t, T.cool, T.cool + 1)) + (t > T.montage ? 1.6 : 0);
  // pellets: fall from the hopper outlet into the barrel throat (exploded column), while pellets play
  const pk = seg(t, T.pellets - .2, T.pellets + .3) * (1 - seg(t, T.screw + 1.5, T.screw + 2.2));
  pellets.visible = pk > .01;
  if (pellets.visible) {
    const top = wp(hopper, new THREE.Vector3(0, 0, 0)), bot = wp(barrel, new THREE.Vector3(.72, .2, 0)), d = new THREE.Object3D();
    PS.forEach((p, i) => { const u = (p.ph + t * .7) % 1; d.position.set(lerp(top.x, bot.x, u) + p.dx, lerp(top.y, bot.y, u * u), p.dz); d.scale.setScalar(pk); d.updateMatrix(); pellets.setMatrixAt(i, d.matrix); });
    pellets.instanceMatrix.needsUpdate = true;
  }
  // melt blobs barrel tip → nozzle → sprue (during the nozzle/sprue lines)
  const bk = seg(t, T.nozzle - .2, T.nozzle + .2) * (1 - seg(t, T.runner + .4, T.runner + .9));
  const path = [wp(barrel, new THREE.Vector3(-.9, 0, 0)), wp(nozzle, new THREE.Vector3(.08, 0, 0)), wp(nozzle, new THREE.Vector3(-.16, 0, 0)), wp(moldA, new THREE.Vector3(.2, 0, 0)), wp(moldA, new THREE.Vector3(FACE, 0, 0))];
  blobs.forEach((m, i) => {
    m.visible = bk > .01; if (!m.visible) return;
    let u = ((i / NB + t * .55) % 1) * (path.length - 1); const j = Math.min(path.length - 2, Math.floor(u)); m.position.lerpVectors(path[j], path[j + 1], u - j); m.scale.setScalar(bk);
  });
  // melt fill on mold A's face
  const fS = eo(seg(t, T.sprue, T.sprue + .5)), fR = seg(t, T.runner, T.runner + .9), fG = t > T.gate, fC = eo(seg(t, T.cavity - .15, T.cavity + .9));
  const meltOn = t < T.assemble + .3;
  meltA.sprue.scale.set(fS, 1, fS); meltA.sprue.visible = meltOn;
  meltA.runners.forEach(r => { r.rp.scale.z = Math.max(.0001, fR * r.len); r.rp.visible = meltOn; });
  meltA.gates.forEach(g => g.visible = fG && meltOn);
  meltA.cav.forEach(c => { c.scale.set(fC, 1, fC); c.visible = meltOn; });
  // mold transparency while cooling (see the channels and the part inside)
  const see = seg(t, T.cool - .4, T.cool + .4) * (1 - seg(t, T.open - .4, T.open));
  M.mold.opacity = 1 - .62 * see; M.moldB.opacity = 1 - .62 * see; M.mold.depthWrite = see < .05; M.moldB.depthWrite = see < .05;
  M.water.emissiveIntensity = 3.2 * seg(t, T.water - .3, T.water + .3) * (1 - seg(t, T.open - .3, T.open)) * (.75 + .25 * Math.sin(t * 6));
  // the shot: glowing melt inside the closed mold → cools to plastic → rides B open → ejected → showcase
  const inMold = t > T.assemble + .3 && t < T.show + 1.6;
  shot.visible = inMold || (t >= T.show + 1.6 && t < T.montage + .2);
  const cool = seg(t, T.water, T.water + 4.2);
  shot.traverse(o => { if (o.isMesh) { o.material = cool < 1 ? meltMix(cool) : M.plastic; } });
  if (shot.visible) {
    const bFace = wp(moldB, new THREE.Vector3(.23, 0, 0));
    const ej = .12 * ejectAmt(t);
    const pos = new THREE.Vector3(bFace.x + ej, CY, 0);
    const fly = eio(seg(t, T.show, T.show + 1.4));
    const showPos = new THREE.Vector3(-.7, 2.75, .9);
    shot.position.lerpVectors(pos, showPos, fly);
    shot.rotation.set(0, lerp(0, -.9, fly), 0); if (fly > 0) shot.rotation.y += (t - T.show) * .35 * fly;
    shot.rotation.x = .25 * fly;
  }
  ejector.position.x = .12 * ejectAmt(t);
  // montage: three fast cycles, each dropping a shot into the bin
  piles.forEach((p, n) => {
    const tDrop = T.montage + n * 1.35 + 1.0, u = seg(t, tDrop, tDrop + .55);
    p.visible = t > tDrop;
    const start = new THREE.Vector3(-.35, CY - .1, 0), end = new THREE.Vector3(-.5 + (n - 1) * .28, .2 + n * .06, 1.05);
    p.position.set(lerp(start.x, end.x, u), lerp(start.y, end.y, u) + Math.sin(u * Math.PI) * .25 - 0, lerp(start.z, end.z, u));
    p.rotation.set(u * 2.2 + n, u * 1.3, u * .8);
  });
  bin.visible = t > T.montage - .5;
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, wp, G: { moldA, moldB, barrel, screw: screwG, hopper, nozzle, clampU, shot }, FACE, CAV, ex, ej: ejector });
};
const meltCache = new Map();
function meltMix(k) {
  const q = Math.round(k * 20) / 20; if (meltCache.has(q)) return meltCache.get(q);
  const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#2a1408').lerp(new THREE.Color(PLASTIC), q), roughness: .35, clearcoat: .6, emissive: '#ff7a2a', emissiveIntensity: 4 * (1 - q) ** 1.5 });
  meltCache.set(q, m); return m;
}
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
