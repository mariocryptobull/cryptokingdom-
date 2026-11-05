// How an Elevator Works — Exploded Teardown, 1080×1920. A cutaway hoistway (back wall kept, front open) with a schematic
// traction elevator: machine on top (sheave + gearless motor + governor), car and counterweight on hoist ropes, guide rails,
// governor rope loop, safety brakes and pit buffers. Units: model units (schematic, not to scale). X across, Y up, Z toward camera.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, eio, eo, ei, track } from '/core/lib.js';
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
  floors: cue('v01', 1), apart: cue('v01', 2), trac: cue('v02', 0), car: cue('v02', 1), ropes: cue('v02', 2),
  top: cue('v03', 0), sheave: cue('v03', 1), motor: cue('v03', 2), fric: cue('v03', 3),
  cwt: cue('v04', 0), cwt2: cue('v04', 1), weighs: cue('v04', 2), load: cue('v04', 3),
  never: cue('v05', 0), diff: cue('v05', 2), rails: cue('v06', 0), rails2: cue('v06', 1), track: cue('v06', 2),
  codes: cue('v07', 0), three: cue('v07', 1), margin: cue('v07', 3),
  what: cue('v08', 0), fall: cue('v08', 1), gov: cue('v08', 2), trip: cue('v08', 3),
  grab: cue('v09', 0), yank: cue('v09', 1), bite: cue('v09', 2), stop: cue('v09', 3),
  otis: cue('v10', 0), stood: cue('v10', 1), cut: cue('v10', 2), held: cue('v10', 3),
  congrats: cue('v11', 0), card: cue('v11', 1),
};
T.down = T.top - .9;   // reassemble just before "Up top"
window.T = T;

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
  const gr = g.createRadialGradient(560, 860, 80, 540, 960, 1500); gr.addColorStop(0, '#34363a'); gr.addColorStop(.45, '#222427'); gr.addColorStop(1, '#0d0e10');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = .5; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff1e2', 1.6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 90 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 5, 16, 6); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .5, 14, 14); scene.add(top);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .25));

// ---------- materials ----------
const M = {
  base: new THREE.MeshPhysicalMaterial({ color: '#2b2e33', roughness: .5, metalness: .3, clearcoat: .2 }),
  wall: new THREE.MeshPhysicalMaterial({ color: '#8f8a82', roughness: .9 }),
  slab: new THREE.MeshPhysicalMaterial({ color: '#a9a69e', roughness: .85 }),
  door: new THREE.MeshPhysicalMaterial({ color: '#c3c7cc', roughness: .3, metalness: .7 }),
  model: new THREE.MeshPhysicalMaterial({ color: '#f1efe9', roughness: .6 }),
  cab: new THREE.MeshPhysicalMaterial({ color: '#efe9de', roughness: .45, clearcoat: .3, side: THREE.DoubleSide }),
  floor: new THREE.MeshPhysicalMaterial({ color: '#3b3a38', roughness: .7 }),
  lamp: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff2d8', emissiveIntensity: 1.6 }),
  sheave: new THREE.MeshPhysicalMaterial({ color: '#e3a62c', roughness: .35, metalness: .4, clearcoat: .6 }),
  groove: new THREE.MeshStandardMaterial({ color: '#2a2c30', roughness: .4, metalness: .8 }),
  steel: new THREE.MeshStandardMaterial({ color: '#4a5056', roughness: .45, metalness: .7, side: THREE.DoubleSide }),
  dark: new THREE.MeshStandardMaterial({ color: '#33363b', roughness: .5, metalness: .6 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#d4d8dc', roughness: .15, metalness: 1 }),
  rail: new THREE.MeshStandardMaterial({ color: '#8d939a', roughness: .5, metalness: .55 }),
  yellow: new THREE.MeshPhysicalMaterial({ color: '#f2c230', roughness: .4, clearcoat: .5 }),
  blue: new THREE.MeshPhysicalMaterial({ color: '#2f6fe0', roughness: .4, clearcoat: .5 }),
  rope: new THREE.MeshStandardMaterial({ color: '#b9bec4', roughness: .35, metalness: .9 }),
  grope: new THREE.MeshStandardMaterial({ color: '#d9c48a', roughness: .4, metalness: .6 }),
  safety: new THREE.MeshPhysicalMaterial({ color: '#ff7a1a', roughness: .4, clearcoat: .4 }),
  fill: new THREE.MeshStandardMaterial({ color: '#3a3d42', roughness: .5, metalness: .5 }),
};
for (const k of ['rope', 'safety', 'rail', 'sheave', 'fill', 'grope']) M[k].emissive = new THREE.Color('#ff6b3d');
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const boxG = (sx, sy, sz, x, y, z) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);
const merged = (geos, mat) => sh(new THREE.Mesh(mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g)), mat));
const cylZ = (r, len, mat, seg = 40) => { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateX(Math.PI / 2); return sh(new THREE.Mesh(g, mat)); };
const cylY = (r, len, mat, seg = 20) => sh(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat));

// ---------- dimensions ----------
const SX0 = -3.0, SX1 = 2.4, ZB = -1.3, HS = 13;        // shaft x range, back wall z, shaft top (machine room floor)
const CX = -.7, CW = 1.6, CD = 1.6, CH = 2.2;            // car centre x, width, depth, cab height
const WX = 1.35, WW = .5, WH = 1.7, WD = .32;            // counterweight centre x, width, height, depth
const SR = (WX - CX) / 2, SCX = (WX + CX) / 2, SCY = 14.6; // traction sheave radius and centre
const RZ = [-.18, -.06, .06, .18];                       // hoist ropes (4)
const GX = -2.15, GR = .3, GY = 13.95, GTY = .55;         // governor sheave x, radius, height; tension sheave height
const RAIL = [-1.62, .22], WRAIL = [WX - .34, WX + .34];
const LAND = [1, 4, 7, 10];
const KW = 11.2 + 1;                                     // rope length constant: cwt bottom = KW - car floor

// ---------- shaft ----------
scene.add(box(SX1 - SX0 + 2.6, .16, 3.2, M.base, (SX0 + SX1) / 2, -.08, 0));
scene.add(box(SX1 - SX0 + .4, HS + .3, .2, M.wall, (SX0 + SX1) / 2, (HS + .3) / 2, ZB - .1));
{ const geos = [];
  for (const y of [...LAND, HS]) { geos.push(boxG(1.1, .26, 2.8, SX0 - .55, y - .13, 0), boxG(1.1, .26, 2.8, SX1 + .55, y - .13, 0)); }
  geos.push(boxG(.2, HS, .5, SX0 - .1, HS / 2, ZB + .25)); geos.push(boxG(.2, HS, .5, SX1 + .1, HS / 2, ZB + .25));
  scene.add(merged(geos, M.slab)); }
// machine-room floor with rope holes (two slabs leaving gaps), plus landing doors on the back wall
scene.add(box(SX1 - SX0, .3, 2.6, M.slab, (SX0 + SX1) / 2, HS + .15, 0));
{ const geos = []; for (const y of LAND) { geos.push(boxG(.5, 1.9, .04, CX - .27, y + .95, ZB + .02), boxG(.5, 1.9, .04, CX + .27, y + .95, ZB + .02)); }
  scene.add(merged(geos, M.door));
  const fr = []; for (const y of LAND) fr.push(boxG(1.2, .08, .06, CX, y + 1.94, ZB + .03), boxG(.06, 1.98, .06, CX - .58, y + .99, ZB + .03), boxG(.06, 1.98, .06, CX + .58, y + .99, ZB + .03));
  scene.add(merged(fr, M.steel)); }
// pit buffers (spring buffers under car and counterweight)
const buffers = new THREE.Group(); scene.add(buffers);
for (const x of [CX - .4, CX + .4]) { buffers.add(cylY(.12, .35, M.yellow).translateX(x).translateY(.175)); buffers.add(cylY(.08, .1, M.dark).translateX(x).translateY(.4)); }
buffers.add(cylY(.11, .3, M.yellow).translateX(WX).translateY(.15));

// ---------- guide rails (T-rails with brackets) ----------
const rails = new THREE.Group(); scene.add(rails);
{ const geos = [];
  for (const x of [...RAIL, ...WRAIL]) { const s = Math.sign(x - (x < 1 ? CX : WX)); geos.push(boxG(.04, HS, .14, x, HS / 2, 0), boxG(.12, HS, .03, x + s * .05, HS / 2, 0));
    for (let y = 1.2; y < HS; y += 2.4) geos.push(boxG(.08, .08, -ZB, x + s * .05, y, ZB / 2)); }
  rails.add(merged(geos, M.rail)); }

// ---------- machine on top: gearless motor + traction sheave + deflector-free 1:1 roping + brake ----------
const machine = new THREE.Group(); scene.add(machine);
const sheave = new THREE.Group(); sheave.position.set(SCX, SCY, 0); machine.add(sheave);
{ sheave.add(cylZ(SR, .5, M.sheave, 64));
  for (const z of RZ) { const g = new THREE.Mesh(new THREE.TorusGeometry(SR + .005, .022, 8, 64), M.groove); g.position.z = z; sheave.add(g); }
  for (let k = 0; k < 6; k++) { const s = box(.08, SR * 1.7, .04, M.dark, 0, 0, .27); s.rotation.z = k * Math.PI / 3; sheave.add(s); }
  sheave.add(cylZ(.16, .6, M.chrome)); }
// rope wrap over the top half of the sheave (static, rotates visually with the sheave grooves)
{ const geos = []; for (const z of RZ) { const g = new THREE.TorusGeometry(SR + .02, .02, 6, 48, Math.PI); g.translate(0, 0, z); geos.push(g); } const wrap = sh(new THREE.Mesh(mergeGeometries(geos), M.rope)); wrap.position.set(SCX, SCY, 0); machine.add(wrap); }
const motor = new THREE.Group(); machine.add(motor);
{ const m = cylZ(.78, .9, M.blue, 48); m.position.set(SCX, SCY, -.75); motor.add(m);
  for (let k = 0; k < 10; k++) { const f = box(.04, .04, .86, M.dark); const a = k / 10 * Math.PI * 2; f.position.set(SCX + Math.cos(a) * .79, SCY + Math.sin(a) * .79, -.75); motor.add(f); }
  const cap = cylZ(.5, .06, M.dark); cap.position.set(SCX, SCY, -1.22); motor.add(cap);
  const brake = cylZ(.26, .12, M.dark); brake.position.set(SCX, SCY, .33); motor.add(brake);
  motor.add(box(2.6, .14, 1.9, M.steel, SCX, HS + .37, -.3));
  motor.add(box(.3, SCY - HS - .4, .3, M.steel, SCX - .6, (SCY + HS + .4) / 2, -.75), box(.3, SCY - HS - .4, .3, M.steel, SCX + .6, (SCY + HS + .4) / 2, -.75));
  motor.add(box(.5, .6, .4, M.model, SCX + 1.45, HS + .74, -.75)); }  // drive cabinet
// governor: sheave with flyweights on a stand
const govG = new THREE.Group(); scene.add(govG);
const gov = new THREE.Group(); gov.position.set(GX, GY, 0); govG.add(gov);
const fly = [];
{ gov.add(cylZ(GR, .1, M.yellow, 40)); const gro = new THREE.Mesh(new THREE.TorusGeometry(GR + .005, .018, 6, 40), M.groove); gov.add(gro);
  for (const s of [-1, 1]) { const arm = new THREE.Group(); arm.position.z = .08; gov.add(arm); const w = box(.07, .2, .06, M.safety, 0, s * .12, 0); arm.add(w); fly.push({ arm, s }); }
  govG.add(box(.1, GY - HS - .3, .1, M.steel, GX, (GY + HS + .3) / 2, -.12));
  const t = new THREE.Mesh(new THREE.TorusGeometry(GR + .02, .018, 6, 32, Math.PI), M.grope); t.position.set(GX, GY, 0); govG.add(t);
  const jaw = box(.16, .12, .14, M.safety, GX + GR, GY - .32, 0); jaw.name = 'jaw'; govG.add(jaw); }
const jaw = govG.getObjectByName('jaw');
const tens = new THREE.Group(); tens.position.set(GX, GTY, 0); scene.add(tens);
{ tens.add(cylZ(GR, .08, M.yellow, 32)); const b = new THREE.Mesh(new THREE.TorusGeometry(GR + .02, .018, 6, 32, Math.PI), M.grope); b.rotation.z = Math.PI; tens.add(b); scene.add(box(.4, .12, .3, M.steel, GX, .25, 0)); }
const govRope = [GX - GR - .02, GX + GR + .02].map(x => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, 1, 6), M.grope)); m.position.set(x, (GY + GTY) / 2, 0); m.scale.y = GY - GTY; scene.add(m); return m; });

// ---------- car: sling (crosshead, stiles, plank), cab, guide shoes, safeties, passengers ----------
const car = new THREE.Group(); scene.add(car);
const carIn = new THREE.Group(); car.add(carIn);
{ const geos = [boxG(CW + .3, .16, .16, 0, CH + .3, 0), boxG(CW + .3, .16, .3, 0, -.12, 0)];
  for (const s of [-1, 1]) geos.push(boxG(.12, CH + .55, .16, s * (CW / 2 + .08), CH / 2 + .1, 0));
  carIn.add(merged(geos, M.steel));
  carIn.add(box(CW, .06, CD, M.floor, 0, .03, 0), box(CW, .06, CD, M.cab, 0, CH, 0), box(CW, CH, .05, M.cab, 0, CH / 2, -CD / 2 + .025));
  for (const s of [-1, 1]) carIn.add(box(.05, CH, CD, M.cab, s * (CW / 2 - .025), CH / 2, 0));
  carIn.add(box(CW * .6, .02, CD * .5, M.lamp, 0, CH - .04, 0));
  carIn.add(box(.12, .5, .04, M.dark, CW / 2 - .2, 1.15, CD / 2 - .06).rotateY(-Math.PI / 2));
  // passengers
  for (const [x, z, h] of [[-.4, -.2, 1.25], [.1, .25, 1.15], [.45, -.35, 1.3]]) { carIn.add(box(.24, h, .16, M.model, x, .06 + h / 2, z)); const hd = sh(new THREE.Mesh(new THREE.SphereGeometry(.11, 16, 12), M.model)); hd.position.set(x, .06 + h + .13, z); carIn.add(hd); }
  // rope hitch on the crosshead
  carIn.add(box(.2, .12, .5, M.dark, 0, CH + .44, 0));
  // guide shoes top and bottom on both rails
  for (const x of [RAIL[0] - CX, RAIL[1] - CX]) for (const y of [-.12, CH + .3]) carIn.add(box(.14, .14, .22, M.dark, x - Math.sign(x) * .02, y, 0)); }
const safeties = [RAIL[0] - CX, RAIL[1] - CX].map(x => { const g = new THREE.Group(); g.position.set(x, -.32, 0); carIn.add(g);
  for (const z of [-.11, .11]) { const w = box(.1, .2, .06, M.safety, -Math.sign(x) * .05, 0, z); g.add(w); }
  g.add(box(.08, .26, .3, M.steel, -Math.sign(x) * .12, 0, 0)); return g; });
// safety linkage: arm from the governor rope to the safety wedges, along the crosshead
const linkArm = new THREE.Group(); linkArm.position.set(GX + GR + .02 - CX, CH + .3, 0); carIn.add(linkArm);
linkArm.add(box(.5, .06, .06, M.safety, .25, 0, 0));
carIn.add(box(.06, CH + .62, .06, M.safety, RAIL[0] - CX + .14, CH / 2, .14));

// ---------- counterweight ----------
const cwt = new THREE.Group(); scene.add(cwt);
{ const geos = [boxG(WW + .14, .12, WD + .04, 0, WH + .06, 0), boxG(WW + .14, .12, WD + .04, 0, -.06, 0)];
  for (const s of [-1, 1]) geos.push(boxG(.07, WH + .24, WD, s * (WW / 2 + .04), WH / 2, 0));
  cwt.add(merged(geos, M.steel));
  const fg = []; for (let k = 0; k < 9; k++) fg.push(boxG(WW - .02, WH / 9 - .025, WD - .04, 0, (k + .5) * WH / 9, 0)); cwt.add(merged(fg, M.fill));
  cwt.add(box(.18, .12, .5, M.dark, 0, WH + .18, 0));
  for (const x of [WRAIL[0] - WX, WRAIL[1] - WX]) for (const y of [0, WH]) cwt.add(box(.1, .12, .2, M.dark, x - Math.sign(x) * .03, y, 0)); }

// ---------- hoist ropes (car side and counterweight side) ----------
const ropeMesh = () => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1, 6), M.rope)); scene.add(m); return m; };
const ropesCar = RZ.map(ropeMesh), ropesCwt = RZ.map(ropeMesh);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
const span = (m, a, b) => { _d.subVectors(b, a); const L = _d.length(); m.position.addVectors(a, b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(UP, _d.normalize()); m.scale.set(1, Math.max(L, .001), 1); };
// rope stubs left dangling after the Otis cut
const stubs = RZ.map(() => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1, 6), M.rope)); m.visible = false; scene.add(m); return m; });

const lstubs = RZ.map(() => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1, 6), M.rope)); m.visible = false; scene.add(m); return m; });
const spark = new THREE.Mesh(new THREE.SphereGeometry(.35, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffd2a0', transparent: true, opacity: 0, depthWrite: false })); scene.add(spark);
// ---------- motion ----------
// car floor height: eased moves between keys [t, y]
const pop = x => 1 - Math.pow(1 - ss(x), 3);
const explK = t => pop(seg(t, T.apart - .2, T.apart + 1.1)) * (1 - eio(seg(t, T.down - .1, T.down + .9)));
const MOVES = [
  [0, 1.0], [T.apart - .3, 4.6], [T.top + .3, 4.6], [T.cwt - .3, 8.6], [T.cwt + .2, 8.6], [T.never - .2, 4.0], [T.rails + .2, 4.0], [T.codes, 8.0], [T.three + .3, 8.0], [T.what + .4, 9.4], [T.fall - .1, 9.4],
];
const FALL0 = T.fall - .1, FALL1 = T.stop + .2, FALLD = 4.7;
function carY(t) {
  if (t >= FALL0) {
    if (t < T.otis + .4) { const u = seg(t, FALL0, FALL1), s = u < .82 ? .86 * Math.pow(u / .82, 2) : .86 + .14 * eo((u - .82) / .18); return 9.4 - FALLD * s; }
    const yb = 9.4 - FALLD;
    // reset slightly and hang; rope cut → drops a few inches, safeties catch
    const drop = .32 * ei(seg(t, T.cut + .15, T.cut + .45));
    const back = eio(seg(t, T.congrats + 1.5, DUR - .8));
    return yb - drop + back * (5.2 + drop);
  }
  for (let i = 0; i < MOVES.length - 1; i++) { const [t0, y0] = MOVES[i], [t1, y1] = MOVES[i + 1]; if (t < t1) return lerp(y0, y1, eio(seg(t, t0, t1))); }
  return MOVES[MOVES.length - 1][1];
}
// counterweight bottom: hangs off the other side; after the rope cut it drops onto its buffer, then is restored
const ropeCut = t => t > T.cut + .1 && t < T.congrats;
function cwtY(t, yc) {
  const hang = KW - yc;
  if (t < T.cut + .1) return hang;
  if (t < T.congrats + .3) { const u = seg(t, T.cut + .1, T.cut + 1.0); return lerp(hang, .32, ei(u)); }
  return lerp(.32, hang, eio(seg(t, T.congrats + .3, T.congrats + 1.5)));
}
const ropesBack = t => ss(seg(t, T.congrats, T.congrats + .3));

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, 24, 12, 47, -.3, 9.7, 0],
  [T.apart, 26, 11, 45, -.3, 9.6, 0],
  [T.trac + .4, 32, 10, 40, 0, 9.2, .8],
  [T.ropes + 1.2, 30, 10, 37, -.2, 9.4, .8],
  [T.top + .5, 22, 8, 11.5, .1, 14.2, 0],
  [T.motor + .8, 40, 14, 10.5, .2, 14.1, -.2],
  [T.fric + 1.2, 18, 6, 9, .2, 13.8, 0],
  [T.cwt + .6, 34, 8, 13, .9, 5.4, 0],
  [T.load + .6, 40, 8, 13.5, .8, 7.6, 0],
  [T.never + .6, 26, 8, 15, -.1, 6.4, 0],
  [T.diff + 1.0, 24, 8, 16, 0, 6.8, 0],
  [T.rails + .8, 44, 8, 26, -.2, 7.4, 0],
  [T.track + .8, 50, 8, 28, -.2, 7.6, 0],
  [T.codes + .6, 28, 4, 14, -.3, 11.4, 0],
  [T.margin + .6, 22, 4, 12, -.3, 11.8, 0],
  [T.what + .6, 24, 8, 18, -.6, 10.6, 0],
  [T.gov + .2, 14, 6, 9.5, -1.3, 13.4, 0],
  [T.grab + .2, 12, 6, 9.0, -1.4, 13.2, 0],
  [T.yank + .4, 20, 6, 12, -.9, 6.6, 0],
  [T.stop + .6, 26, 6, 11, -.8, 5.2, 0],
  [T.otis + .8, 28, 8, 19, -.2, 8.4, 0],
  [T.cut + .3, 26, 6, 19, -.1, 8.0, 0],
  [T.held + 1.0, 24, 6, 17, -.2, 7.0, 0],
  [T.congrats + .3, 24, 10, 36, -.2, 9.4, 0],
  [DUR, 22, 12, 47, -.3, 10.6, 0],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz] = camTrack(t); const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 200; post.dof.maxCoc = 8;
  const la = A - .9; key.position.set(tx + 16 * Math.sin(la), ty + 14, tz + 16 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 12 * Math.sin(A + Math.PI * .85), ty + 4, tz + 12 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 12, tz); top.lookAt(tx, ty, tz);
}

// ---------- events (sound) ----------
const EV = [{ t: T.apart + .1, type: 'lift' }, { t: T.apart + .25, type: 'spread' }, { t: T.down + .8, type: 'land' },
  { t: T.sheave, type: 'label' }, { t: T.motor, type: 'label' }, { t: T.cwt2, type: 'label' }, { t: T.rails2, type: 'label' }, { t: T.three, type: 'label' }, { t: T.gov, type: 'label' },
  { t: T.never + .4, type: 'chime' }, { t: T.rails - .3, type: 'chime' },
  { t: T.trip, type: 'clunk' }, { t: T.grab + .1, type: 'clunk' }, { t: T.bite, type: 'clamp' },
  { t: T.otis, type: 'card' }, { t: T.cut + .1, type: 'snap' }, { t: T.cut + .45, type: 'clamp' }, { t: T.cut + 1.0, type: 'land' }, { t: T.congrats, type: 'lift' }, { t: T.card, type: 'card' }];
// motor hum spans (car moving on its ropes), for the mix
for (const [a, b] of [[0, T.apart - .3], [T.top + .3, T.cwt - .3], [T.cwt + .2, T.never - .2], [T.rails + .2, T.codes], [T.three + .3, T.what + .4], [T.congrats + 1.5, DUR - .8]]) EV.push({ t: +a.toFixed(2), type: 'hum', d: +(b - a).toFixed(2) });
EV.push({ t: +FALL0.toFixed(2), type: 'fall', d: +(T.bite - FALL0).toFixed(2) });
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
const P = new THREE.Vector3();
const vAt = t => (carY(t) - carY(t - .04)) / .04;
window.render = t => {
  const ek = explK(t), yc = carY(t), yw = cwtY(t, yc);
  // exploded layout: machine up, governor up-left, car toward camera, counterweight right
  const ex = { mach: 1.1 * ek, gov: 1.1 * ek, govx: -.5 * ek, carz: 2.3 * ek, carx: -.2 * ek, cwtx: 1.2 * ek, cwtz: .6 * ek, rails: .0 };
  machine.position.y = ex.mach; govG.position.set(ex.govx, ex.gov, 0);
  car.position.set(CX + ex.carx, yc, ex.carz); cwt.position.set(WX + ex.cwtx, yw, ex.cwtz);
  // sheave turns with the ropes (1:1 roping): rope travel / radius
  const cutting = ropeCut(t);
  sheave.rotation.z = ((cutting ? carY(T.cut) : yc) - 1) / SR;
  // governor turns with the car until the jaws grab the rope
  const gripped = (t > T.grab && t < T.otis + .4) || (t > T.cut + .2 && t < T.congrats);
  const ygov = gripped ? carY(t > T.grab && t < T.otis + .4 ? T.grab : T.cut + .2) : yc;
  gov.rotation.z = -ygov / GR; tens.rotation.z = -ygov / GR;
  const v = Math.abs(vAt(t)), flyOut = gripped ? .9 : clamp(v / 2.2) * .9;
  fly.forEach(f => { f.arm.rotation.z = f.s * flyOut * .9; });
  const trip = t > T.trip && t < T.otis + .4 ? 1 : 0;
  jaw.position.x = GX + GR + .02 + (trip || gripped ? .02 : .12); M.safety.emissiveIntensity = 0;
  // safeties engage: wedges glow + linkage tilts
  const eng = Math.max(seg(t, T.yank, T.yank + .4) * (1 - seg(t, T.otis, T.otis + .5)), seg(t, T.cut + .3, T.cut + .45) * (1 - seg(t, T.congrats, T.congrats + .6)));
  linkArm.rotation.z = .5 * eng;
  safeties.forEach(s => { s.children.forEach((c, i) => { if (i < 2) c.position.y = .1 * eng; }); });
  M.safety.emissiveIntensity = eng > .05 ? .35 + .3 * eng * (t > T.bite && t < T.bite + .6 || t > T.cut + .4 && t < T.cut + 1.0 ? 1 : .4) : (trip ? .25 : 0);
  // highlights
  M.sheave.emissiveIntensity = (t > T.sheave && t < T.cwt - .2) ? .08 + .06 * Math.sin(t * 6) : 0;
  M.fill.emissiveIntensity = (t > T.cwt2 - .1 && t < T.never + .2) ? .15 + .1 * Math.sin(t * 6) : 0;
  M.rail.emissiveIntensity = (t > T.rails2 - .1 && t < T.codes - .2) ? .12 + .08 * Math.sin(t * 6) : 0;
  M.rope.emissiveIntensity = (t > T.three - .1 && t < T.what) || (t > T.ropes && t < T.top - .4) ? .2 + .12 * Math.sin(t * 6) : 0;
  M.grope.emissiveIntensity = (t > T.gov - .1 && t < T.bite) ? .2 + .12 * Math.sin(t * 6) : 0;
  // hoist ropes: sheave tangent points → car hitch / counterweight hitch
  const rb = ropesBack(t), cut = cutting || (t >= T.congrats && rb < .5);
  RZ.forEach((z, i) => {
    _a.set(CX, SCY + ex.mach, z); _b.set(CX + ex.carx, yc + CH + .5, z + ex.carz); span(ropesCar[i], _a, _b); ropesCar[i].visible = !cut;
    _a.set(WX, SCY + ex.mach, z); _b.set(WX + ex.cwtx, yw + WH + .24, z + ex.cwtz); span(ropesCwt[i], _a, _b); ropesCwt[i].visible = !cut;
    // stubs after the cut: short dangling ends from the sheave and the car
    stubs[i].visible = cut; lstubs[i].visible = cut; if (cut) { const sw = .06 * Math.sin(t * 4 + i) * Math.exp(-(t - T.cut) * .6); _a.set(CX, SCY, z); _b.set(CX + sw, SCY - 2.2, z); span(stubs[i], _a, _b);
      _a.set(CX + ex.carx, yc + CH + .5, z + ex.carz); _b.set(CX - sw, yc + CH + 1.9, z); span(lstubs[i], _a, _b); }
  });
  { const k = Math.max(0, 1 - Math.abs(t - T.cut - .15) / .25); spark.material.opacity = k; spark.visible = k > 0; spark.scale.setScalar(.4 + 1.2 * k); spark.position.set(CX, (SCY - 2.2 + carY(T.cut) + CH + 1.9) / 2, 0); spark.material.color.setRGB(4, 2.6, 1.4); }
  // governor rope: the side tied to the car is pinned while gripped (visual only: both runs stay straight)
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, CX, CH, CW, WX, WH, SCX, SCY, SR, GX, GR, GY, RAIL, HS, yc, yw, ek, ex, eng, trip, DUR });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
