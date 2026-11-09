// How a Pedal Moves a Car — Exploded Teardown, 1080×1920. A schematic front-engine, rear-drive gas car: the body lifts off,
// then one glowing path follows the force from the gas pedal to the tyre contact patches, and a second from the brake pedal
// to the four calipers. Units: model units (schematic, not to scale). X = forward, Y up, Z toward camera (driver side).
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePost } from '/core/three/post.js';
import { lerp, seg, ss, eio, eo, track } from '/core/lib.js';
import { initOverlay, drawOverlay, overlayTexts } from './overlay.js';

const W = 1080, H = 1920;
const Q = new URLSearchParams(location.search);
const SSAA = +(Q.get('ssaa') || 1);
const TL = await (await fetch('timeline.json')).json();
const VDUR = await (await fetch('voice/dur.json')).json();
const DUR = TL.dur;
const CUES = []; for (let li = 0; li < TL.vo.length; li++) { const v = TL.vo[li], d = VDUR[v.id]; const n = v.chunks.map(c => c.replace(/[^A-Za-z0-9]/g, '').length + 2), tot = n.reduce((a, b) => a + b, 0); let t = v.t; v.chunks.forEach((c, i) => { CUES.push({ id: v.id, i, t }); t += d * n[i] / tot; }); }
const cue = (id, i) => CUES.find(c => c.id === id && c.i === i).t;
const end = id => TL.vo.find(v => v.id === id).t + VDUR[id];
const T = {
  move: cue('v01', 1), follow: cue('v01', 2), road: cue('v01', 3),
  gas: cue('v02', 0), nocable: cue('v02', 1), sensors: cue('v02', 2), ecu: cue('v02', 3),
  throttle: cue('v03', 0), air: cue('v03', 1), fuel: cue('v03', 2), afr: cue('v03', 3),
  spark: cue('v04', 0), shove: cue('v04', 1), crank: cue('v04', 2), spin: cue('v04', 3),
  gear: cue('v05', 0), mult: cue('v05', 1), x14: cue('v05', 2),
  drive: cue('v06', 0), patch: cue('v06', 1), push: cue('v06', 2), forward: cue('v06', 3), gasEnd: end('v06'),
  brake: cue('v07', 0), lever: cue('v07', 1), lb100: cue('v07', 2), lb400: cue('v07', 3),
  booster: cue('v08', 0), suction: cue('v08', 1), dbl: cue('v08', 2), lb800: cue('v08', 3),
  mc: cue('v09', 0), mc2: cue('v09', 1), fluid: cue('v09', 2), psi: cue('v09', 3),
  pascal: cue('v10', 0), every: cue('v10', 1), caliper: cue('v10', 2), clamp: cue('v10', 3),
  squeeze: cue('v11', 0), heat: cue('v11', 1),
  next: cue('v12', 0), congrats: cue('v13', 0), card: cue('v13', 1),
};
window.T = T;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, .1, 300);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, ao: false });
post.bloom.strength = .42; post.bloom.radius = .4; post.bloom.threshold = 1.6;
post.vig.uniforms.amt.value = .34; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .06;
{
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createRadialGradient(560, 860, 80, 540, 960, 1500); gr.addColorStop(0, '#34363a'); gr.addColorStop(.45, '#222427'); gr.addColorStop(1, '#0d0e10');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = .55; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff1e2', 1.6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 60 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 4, 10, 4); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .5, 10, 10); scene.add(top);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .25));

// ---------- materials ----------
const M = {
  base: new THREE.MeshPhysicalMaterial({ color: '#2b2e33', roughness: .55, metalness: .3, clearcoat: .2 }),
  road: new THREE.MeshPhysicalMaterial({ color: '#3a3c40', roughness: .85 }),
  paint: new THREE.MeshStandardMaterial({ color: '#e9e4d6', roughness: .6 }),
  body: new THREE.MeshPhysicalMaterial({ color: '#e8ecf0', roughness: .25, metalness: .1, clearcoat: .8, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: true }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#c6d6e6', roughness: .1, metalness: 0, transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false }),
  tyre: new THREE.MeshStandardMaterial({ color: '#1c1d20', roughness: .85 }),
  rimM: new THREE.MeshStandardMaterial({ color: '#c9cdd2', roughness: .25, metalness: 1 }),
  rotor: new THREE.MeshStandardMaterial({ color: '#8d9298', roughness: .35, metalness: 1, emissive: '#ff4a12', emissiveIntensity: 0 }),
  red: new THREE.MeshPhysicalMaterial({ color: '#d8432c', roughness: .35, clearcoat: .6 }),
  steel: new THREE.MeshStandardMaterial({ color: '#4a5056', roughness: .45, metalness: .7 }),
  dark: new THREE.MeshStandardMaterial({ color: '#25282c', roughness: .5, metalness: .5 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#d4d8dc', roughness: .15, metalness: 1 }),
  alu: new THREE.MeshPhysicalMaterial({ color: '#b9bec4', roughness: .35, metalness: .8, clearcoat: .3 }),
  yellow: new THREE.MeshPhysicalMaterial({ color: '#f2c230', roughness: .4, clearcoat: .5 }),
  blue: new THREE.MeshPhysicalMaterial({ color: '#2f6fe0', roughness: .4, clearcoat: .5 }),
  model: new THREE.MeshPhysicalMaterial({ color: '#f1efe9', roughness: .6 }),
  pad: new THREE.MeshStandardMaterial({ color: '#2a2b2e', roughness: .9 }),
  plug: new THREE.MeshStandardMaterial({ color: '#f1efe9', roughness: .4 }),
  ecu: new THREE.MeshPhysicalMaterial({ color: '#2b3a2f', roughness: .5, metalness: .3 }),
  led: new THREE.MeshBasicMaterial({ color: new THREE.Color(.2, 1.4, .5) }),
  fluid: new THREE.MeshPhysicalMaterial({ color: '#c99a2e', roughness: .2, transparent: true, opacity: .75 }),
  fire: new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.6, .4), transparent: true, opacity: 0, depthWrite: false }),
  patch: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.3, .35), transparent: true, opacity: 0, depthWrite: false }),
  spray: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.3, .6), transparent: true, opacity: 0, depthWrite: false }),
  airM: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 1.5, 2.2), transparent: true, opacity: 0, depthWrite: false }),
};
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const boxG = (sx, sy, sz, x, y, z) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);
const merged = (geos, mat) => sh(new THREE.Mesh(mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g)), mat));
const cylX = (r, len, mat, seg = 28, open = false) => { const g = new THREE.CylinderGeometry(r, r, len, seg, 1, open); g.rotateZ(Math.PI / 2); return sh(new THREE.Mesh(g, mat)); };
const cylY = (r, len, mat, seg = 24, open = false) => sh(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg, 1, open), mat));
const cylZ = (r, len, mat, seg = 32) => { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateX(Math.PI / 2); return sh(new THREE.Mesh(g, mat)); };

// ---------- layout ----------
const WR = .34, XF = 1.45, XR = -1.45, ZW0 = .8, ZW1 = .98, CRK = .42;   // wheel radius, axles, track (assembled/exploded), crank height
const PEDX = .3;

// ---------- ground: base plate + scrolling road marks ----------
scene.add(box(7.2, .1, 3.8, M.base, 0, -.05, 0));
scene.add(box(7.0, .012, 2.6, M.road, 0, .006, 0));
const dashes = [];
for (const z of [1.38, -1.38]) for (let i = 0; i < 12; i++) { const d = box(.32, .006, .05, M.paint, 0, .015, z); d.castShadow = false; scene.add(d); dashes.push({ d, i }); }

// ---------- body shell (lifts off) ----------
const bodyG = new THREE.Group(); scene.add(bodyG);
{
  const s = new THREE.Shape();   // side profile in (x, y)
  s.moveTo(-2.15, .3); s.lineTo(-2.2, .62); s.quadraticCurveTo(-2.15, .82, -1.9, .86); s.lineTo(-1.3, .9); s.quadraticCurveTo(-.95, 1.32, -.55, 1.36);
  s.lineTo(.35, 1.34); s.quadraticCurveTo(.7, 1.3, 1.0, .98); s.lineTo(1.85, .86); s.quadraticCurveTo(2.15, .82, 2.2, .6); s.lineTo(2.18, .3);
  // wheel arches
  s.lineTo(XF + .44, .3); s.absarc(XF, .34, .42, 0, Math.PI, false); s.lineTo(XR + .44, .3); s.absarc(XR, .34, .42, 0, Math.PI, false); s.lineTo(-2.15, .3);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1.62, bevelEnabled: true, bevelThickness: .08, bevelSize: .06, bevelSegments: 3, curveSegments: 24 }); g.translate(0, 0, -.81);
  const shell = sh(new THREE.Mesh(g, M.body)); bodyG.add(shell);
  const wg = new THREE.Shape(); wg.moveTo(-1.18, .93); wg.quadraticCurveTo(-.9, 1.27, -.55, 1.29); wg.lineTo(.33, 1.28); wg.quadraticCurveTo(.62, 1.25, .88, .97); wg.lineTo(-1.18, .93);
  for (const z of [.895, -.895]) { const m = new THREE.Mesh(new THREE.ShapeGeometry(wg), new THREE.MeshPhysicalMaterial({ color: '#1d2228', roughness: .1, metalness: .2, side: THREE.DoubleSide })); m.position.z = z; bodyG.add(m); }
}

// ---------- wheels: tyre + rim + rotor spin; caliper fixed ----------
const wheels = [];
for (const [x, sz, front] of [[XF, 1, true], [XF, -1, true], [XR, 1, false], [XR, -1, false]]) {
  const g = new THREE.Group(); scene.add(g);
  const spin = new THREE.Group(); g.add(spin);
  spin.add(cylZ(WR, .22, M.tyre, 40));
  const rimD = cylZ(.22, .225, M.rimM, 32); spin.add(rimD);
  for (let k = 0; k < 5; k++) { const s = box(.05, .2, .02, M.dark, 0, 0, sz * .118); s.geometry.translate(0, .1, 0); s.rotation.z = k * Math.PI * 2 / 5; spin.add(s); }
  spin.add(cylZ(.05, .24, M.dark, 16));
  const rotor = cylZ(.25, .028, M.rotor, 40); rotor.position.z = -sz * .2; spin.add(rotor);
  for (let k = 0; k < 6; k++) { const h = box(.03, .03, .03, M.dark); const a = k * Math.PI / 3; h.position.set(Math.cos(a) * .16, Math.sin(a) * .16, -sz * .2); spin.add(h); }
  // caliper straddling the rotor at the top-rear, with two pads
  const cal = new THREE.Group(); cal.position.set(-.155, .155, -sz * .2); cal.rotation.z = Math.PI / 4; g.add(cal);
  const body = new THREE.Mesh(mergeGeometries([boxG(.17, .06, .13, 0, .055, 0).toNonIndexed(), boxG(.17, .08, .035, 0, .0, .045).toNonIndexed(), boxG(.17, .08, .035, 0, .0, -.045).toNonIndexed()]), M.red); cal.add(sh(body));
  const pads = [1, -1].map(s => { const p = box(.14, .07, .012, M.pad, 0, 0, s * .024); cal.add(p); return { p, s }; });
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(.26, .2), M.patch); patch.rotation.x = -Math.PI / 2; patch.position.set(0, -WR + .014, 0); g.add(patch);
  wheels.push({ g, spin, sz, x, front, pads, cal });
}
const wheelZ = (sz, ek) => sz * lerp(ZW0, ZW1, ek);
const calWorld = (w, ek) => new THREE.Vector3(w.x - .155, WR + .155, wheelZ(w.sz, ek) - w.sz * .2);

// ---------- engine: inline-4, cutaway block ----------
const eng = new THREE.Group(); scene.add(eng);
const XE = 1.0, CYLX = [-.27, -.09, .09, .27].map(d => XE + d), FIRE = [0, 3, 1, 2].map(k => k * Math.PI);  // firing order 1-3-4-2 over 720°
const blockGlass = new THREE.MeshPhysicalMaterial({ color: '#b9c3cc', roughness: .2, metalness: .2, transparent: true, opacity: .2, side: THREE.DoubleSide, depthWrite: false });
eng.add(box(.82, .36, .36, blockGlass, XE, .6, 0));
eng.add(box(.82, .1, .38, M.alu, XE, .83, 0));
eng.add(box(.86, .05, .3, M.dark, XE, .905, 0));   // cam cover
const sleeves = CYLX.map(x => { const s = cylY(.078, .3, blockGlass, 24, true); s.position.set(x, .62, 0); eng.add(s); return s; });
const pistons = [], rods = [], fires = [], plugs = [];
for (const x of CYLX) {
  const p = cylY(.072, .07, M.chrome, 24); p.position.x = x; eng.add(p); pistons.push(p);
  const r = box(.025, 1, .03, M.steel); r.position.x = x; eng.add(r); rods.push(r);
  const f = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .06, 20), M.fire.clone()); f.position.set(x, .745, 0); eng.add(f); fires.push(f);
  const pl = cylY(.016, .1, M.plug, 10); pl.position.set(x, .95, -.04); eng.add(pl); plugs.push(pl);
}
const crankG = new THREE.Group(); crankG.position.set(0, CRK, 0); eng.add(crankG);
{ const sh0 = cylX(.025, 1.0, M.steel, 16); sh0.position.x = XE; crankG.add(sh0);
  const pul = cylX(.09, .04, M.dark, 32); pul.position.x = XE + .52; crankG.add(pul);
  CYLX.forEach((x, i) => { const ph = FIRE[i] % (2 * Math.PI); const w = box(.03, .1, .07, M.steel, x - .045, 0, 0); const w2 = box(.03, .1, .07, M.steel, x + .045, 0, 0); for (const q of [w, w2]) { q.geometry.translate(0, .03, 0); q.rotation.x = -ph; crankG.add(q); } const pin = cylX(.02, .1, M.chrome, 12); pin.position.set(x, .05 * Math.cos(ph), -.05 * Math.sin(ph)); crankG.add(pin); }); }
// flywheel
const fly = cylX(.17, .04, M.steel, 40); fly.position.set(XE - .47, CRK, 0); eng.add(fly);
// intake: plenum on the driver side, four runners, throttle body at the front, injectors
eng.add((() => { const m = cylX(.055, .82, M.alu, 24); m.position.set(XE, .86, .3); return m; })());
CYLX.forEach(x => { const r = box(.05, .05, .16, M.alu, x, .82, .2); eng.add(r); const inj = cylY(.012, .07, M.blue, 8); inj.position.set(x, .87, .17); eng.add(inj); });
const sprays = CYLX.map(x => { const c = new THREE.Mesh(new THREE.ConeGeometry(.03, .08, 12, 1, true), M.spray.clone()); c.position.set(x, .81, .16); c.rotation.x = Math.PI; eng.add(c); return c; });
const tb = cylX(.062, .1, M.dark, 24, true); tb.position.set(XE + .47, .86, .3); eng.add(tb);
const blade = new THREE.Mesh(new THREE.CircleGeometry(.056, 24), M.chrome); blade.position.set(XE + .47, .86, .3); blade.rotation.y = Math.PI / 2; eng.add(blade);
const tbMotor = box(.07, .07, .05, M.dark, XE + .47, .86, .39); eng.add(tbMotor);
eng.add((() => { const m = cylX(.05, .18, M.dark, 20); m.position.set(XE + .62, .86, .3); return m; })());
// air streaks into the throttle (shown while it opens)
const airLines = [...Array(6)].map((_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(.12, .006, .006), M.airM); scene.add(m); return { m, i }; });

// ---------- drivetrain: gearbox, driveshaft, differential, axles ----------
const XG0 = .5, XG1 = -.25;   // gearbox front/back
const gbGlass = blockGlass;
{ const bell = new THREE.Mesh(new THREE.CylinderGeometry(.13, .2, .2, 28, 1, true).rotateZ(Math.PI / 2), gbGlass); bell.position.set(XG0 - .1, CRK, 0); scene.add(bell);
  const cas = new THREE.Mesh(new THREE.BoxGeometry(XG0 - .2 - XG1, .2, .2), gbGlass); cas.position.set((XG0 - .2 + XG1) / 2, CRK - .02, 0); scene.add(cas); }
const gearMesh = (r, n, w) => { const geos = [new THREE.CylinderGeometry(r, r, w, 24).rotateZ(Math.PI / 2).toNonIndexed()]; for (let k = 0; k < n; k++) { const a = k * Math.PI * 2 / n; geos.push(boxG(w, .025, .02, 0, 0, 0).translate(0, r, 0).applyMatrix4(new THREE.Matrix4().makeRotationX(a)).toNonIndexed()); } return sh(new THREE.Mesh(mergeGeometries(geos), M.yellow)); };
const gIn = gearMesh(.035, 8, .04), gLay = gearMesh(.075, 16, .04), gOut = gearMesh(.075, 16, .04), gLay2 = gearMesh(.035, 8, .04);
gIn.position.set(.18, CRK, 0); gLay.position.set(.18, CRK - .11, 0); gLay2.position.set(-.05, CRK - .11, 0); gOut.position.set(-.05, CRK, 0);
scene.add(gIn, gLay, gLay2, gOut);
const inShaft = cylX(.016, XG0 - .02 - .1, M.steel, 10); inShaft.position.set((XG0 - .02 + .1) / 2, CRK, 0); scene.add(inShaft);
const layShaft = cylX(.014, .32, M.steel, 10); layShaft.position.set(.065, CRK - .11, 0); scene.add(layShaft);
const XD = XR, YD = .36;
const DS0 = new THREE.Vector3(XG1, CRK, 0), DS1 = new THREE.Vector3(XD + .14, YD, 0);
const dshaft = new THREE.Group(); scene.add(dshaft);
{ const len = DS0.distanceTo(DS1); const m = cylX(.03, len, M.chrome, 16); dshaft.add(m); dshaft.add(box(.06, .07, .02, M.dark, len / 2 - .02, 0, 0)); dshaft.add(box(.06, .07, .02, M.dark, -len / 2 + .02, 0, 0)); dshaft.add(box(.04, .02, .065, M.dark, 0, 0, 0));
  dshaft.position.copy(DS0).add(DS1).multiplyScalar(.5); dshaft.rotation.z = Math.atan2(DS0.y - DS1.y, DS0.x - DS1.x); }
const diff = new THREE.Group(); diff.position.set(XD, YD, 0); scene.add(diff);
diff.add(new THREE.Mesh(new THREE.SphereGeometry(.15, 28, 18), gbGlass));
const ringG = (() => { const geos = [new THREE.CylinderGeometry(.11, .11, .025, 32).rotateX(Math.PI / 2).toNonIndexed()]; for (let k = 0; k < 24; k++) { const a = k * Math.PI * 2 / 24; geos.push(boxG(.02, .018, .03, 0, .115, 0).applyMatrix4(new THREE.Matrix4().makeRotationZ(a)).toNonIndexed()); } return sh(new THREE.Mesh(mergeGeometries(geos), M.yellow)); })();
ringG.position.z = .04; diff.add(ringG);
const pinion = gearMesh(.03, 8, .05); pinion.position.set(.1, 0, 0); diff.add(pinion);
const axles = [1, -1].map(sz => { const a = cylZ(.022, 1, M.chrome, 12); a.position.set(XD, YD, 0); scene.add(a); return { a, sz }; });

// ---------- pedals, ECU, booster, master cylinder ----------
const pedal = (z, len, padW, mat) => { const g = new THREE.Group(); g.position.set(PEDX, .82, z); scene.add(g);
  const arm = box(.035, len, .035, M.alu, 0, -len / 2, 0); g.add(arm); const p = box(.03, .1, padW, M.dark, -.02, -len, 0); g.add(p); const tread = box(.008, .08, padW - .02, M.alu, -.037, -len, 0); g.add(tread);
  g.add(cylZ(.025, .06, M.steel, 12)); return g; };
const ZG = .3, ZB = .52;
const gasP = pedal(ZG, .44, .07, M.pad), brkP = pedal(ZB, .46, .11, M.pad);
const apps = box(.06, .07, .05, M.blue, PEDX, .82, ZG + .055); scene.add(apps);   // accelerator position sensor at the hinge
const ecu = new THREE.Group(); ecu.position.set(.85, 1.08, .64); scene.add(ecu);
ecu.add(box(.24, .06, .16, M.ecu)); for (let k = 0; k < 6; k++) ecu.add(box(.2, .012, .008, M.steel, 0, .035, -.06 + k * .024)); ecu.add(box(.03, .015, .015, M.led, .1, .035, .07));
const boost = cylX(.17, .13, M.dark, 40); boost.position.set(.62, .7, ZB); scene.add(boost);
const boostRing = cylX(.172, .02, M.chrome, 40); boostRing.position.set(.62, .7, ZB); scene.add(boostRing);
const mcGlass = new THREE.MeshPhysicalMaterial({ color: '#c6d0d8', roughness: .15, metalness: .2, transparent: true, opacity: .3, side: THREE.DoubleSide, depthWrite: false });
const mcBody = cylX(.045, .24, mcGlass, 24); mcBody.position.set(.81, .7, ZB); scene.add(mcBody);
const mcFluid = cylX(.04, .2, M.fluid, 20); mcFluid.position.set(.83, .7, ZB); scene.add(mcFluid);
const mcPiston = cylX(.042, .04, M.chrome, 20); scene.add(mcPiston);
scene.add(box(.14, .06, .08, mcGlass, .82, .78, ZB)); scene.add(box(.13, .04, .07, M.fluid, .82, .77, ZB));
const pushrod = box(1, .016, .016, M.chrome); scene.add(pushrod);
// vacuum hose from the intake to the booster
{ const c = new THREE.CatmullRomCurve3([new THREE.Vector3(.62, .8, ZB - .05), new THREE.Vector3(.62, .95, .42), new THREE.Vector3(.7, .95, .3), new THREE.Vector3(.7, .88, .3)]); scene.add(sh(new THREE.Mesh(new THREE.TubeGeometry(c, 24, .014, 8), M.dark))); }

// ---------- paths: static wires/lines + glowing reveal ----------
const glowMat = (col) => new THREE.ShaderMaterial({
  uniforms: { prog: { value: 0 }, time: { value: 0 }, col: { value: new THREE.Color(...col) }, fade: { value: 1 } }, transparent: true, depthWrite: false,
  vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform float prog, time, fade; uniform vec3 col; varying vec2 vU;
    void main(){ if (vU.x > prog || prog <= 0.0) discard; float head = smoothstep(prog - .05, prog, vU.x);
      float pulse = .5 + .5 * sin(vU.x * 90.0 - time * 7.0);
      vec3 c = col * (.7 + .4 * pulse + .9 * head); gl_FragColor = vec4(c, fade); }`,
});
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const allPaths = [];
function makePath(pts, col, r, staticMat = null, staticR = 0) {   // pts: [[x,y,z,t], ...]
  const cp = new THREE.CurvePath(); for (let i = 0; i < pts.length - 1; i++) cp.add(new THREE.LineCurve3(V(...pts[i]), V(...pts[i + 1])));
  const len = []; let L = 0; len.push(0); for (let i = 0; i < pts.length - 1; i++) { L += V(...pts[i]).distanceTo(V(...pts[i + 1])); len.push(L); }
  const n = Math.max(60, Math.round(L * 260));
  const mat = glowMat(col); const mesh = new THREE.Mesh(new THREE.TubeGeometry(cp, n, r, 10, false), mat); mesh.renderOrder = 5; scene.add(mesh);
  if (staticMat) scene.add(sh(new THREE.Mesh(new THREE.TubeGeometry(cp, n, staticR, 8, false), staticMat)));
  const head = new THREE.Mesh(new THREE.SphereGeometry(r * 1.9, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(...col).multiplyScalar(1.6), transparent: true })); scene.add(head);
  const p = { pts, u: len.map(l => l / L), mat, head, cp };
  allPaths.push(p); return p;
}
function pathProg(p, t) {
  const { pts, u } = p; if (t <= pts[0][3]) return 0; if (t >= pts[pts.length - 1][3]) return 1;
  for (let i = 0; i < pts.length - 1; i++) if (t < pts[i + 1][3]) return lerp(u[i], u[i + 1], ss(seg(t, pts[i][3], pts[i + 1][3])) * .6 + seg(t, pts[i][3], pts[i + 1][3]) * .4);
  return 1;
}
const GAS = [2.7, .85, .2], BRK = [.28, 1.3, 2.9];
const wire = new THREE.MeshStandardMaterial({ color: '#141516', roughness: .6 });
const lineM = new THREE.MeshStandardMaterial({ color: '#9aa0a6', roughness: .3, metalness: 1 });
// gas: pedal → APP sensor → ECU → throttle → intake → cylinder → crank → gearbox → driveshaft → diff
const gasMain = makePath([
  [PEDX + .02, .4, ZG, T.gas + .2], [PEDX, .82, ZG + .055, T.nocable + .5], [PEDX, 1.08, ZG + .055, T.sensors + .2], [.73, 1.08, .64, T.ecu + .3],
  [.97, 1.08, .64, T.ecu + .9], [XE + .47, 1.08, .42, T.throttle + .2], [XE + .47, .93, .39, T.throttle + .9], [XE + .47, .86, .3, T.air + .1],
  [CYLX[1], .86, .3, T.fuel + .1], [CYLX[1], .82, .12, T.afr], [CYLX[1], .66, 0, T.spark + .3], [CYLX[1], CRK, 0, T.shove + .6],
  [XG0 - .02, CRK, 0, T.spin + .2], [XG1, CRK, 0, T.x14 + .4], [DS1.x, DS1.y, 0, T.drive + 1.1], [XD, YD, 0, T.drive + 1.5],
], GAS, .022);
const gasWire = makePath([[PEDX, .82, ZG + .055, 0], [PEDX, 1.08, ZG + .055, 0], [.73, 1.08, .64, 0]], GAS, .001, wire, .009);
const gasWire2 = makePath([[.97, 1.08, .64, 0], [XE + .47, 1.08, .42, 0], [XE + .47, .93, .39, 0]], GAS, .001, wire, .009);
const gasAx = [1, -1].map(sz => makePath([[XD, YD, 0, T.drive + 1.5], [XD, YD, sz * (ZW1 + .13), T.patch + .4], [XD, .02, sz * (ZW1 + .13), T.patch + 1.1]], GAS, .022));
// brake: pad → pushrod → booster → master cylinder → four lines → calipers
const MCX = .94, MCY = .7;
const brkMain = makePath([[PEDX + .02, .37, ZB, T.brake + .3], [PEDX + .01, .7, ZB, T.lever + .9], [.55, .7, ZB, T.lb400 + .4], [.69, .7, ZB, T.dbl + .2], [MCX, MCY, ZB, T.mc2 + .6]], BRK, .022);
const C = w => calWorld(w, 1).toArray();
const routes = [
  [[MCX, MCY, ZB], [1.12, MCY, ZB], [1.12, .5, .7], C(wheels[0])],
  [[MCX, MCY, ZB], [MCX + .05, MCY, ZB], [MCX + .05, .3, .45], [1.12, .3, -.45], [1.12, .5, -.7], C(wheels[1])],
  [[MCX, MCY, ZB], [MCX, .24, ZB], [-1.0, .24, .52], [-1.25, .5, .74], C(wheels[2])],
  [[MCX, MCY, ZB], [MCX - .03, .24, .44], [-1.0, .2, .44], [-1.0, .2, -.52], [-1.25, .5, -.74], C(wheels[3])],
];
const brkLines = routes.map(r => { const n = r.length; return makePath(r.map((p, i) => [...p, lerp(T.every - .1, T.caliper + .2, i / (n - 1))]), BRK, .018, lineM, .01); });
const brkPaths = [brkMain, ...brkLines];

// ---------- motion ----------
const liftK = t => eio(seg(t, T.move - .2, T.follow + .6)) * (1 - eio(seg(t, T.next - .4, T.congrats + .2)));
const explK = t => eo(seg(t, T.follow - .2, T.road + .6)) * (1 - eio(seg(t, T.next, T.congrats + .4)));
const gasPress = t => eio(seg(t, T.gas + .1, T.gas + .7)) * (1 - eio(seg(t, T.gasEnd + .1, T.brake + .2)));
const brkPress = t => eio(seg(t, T.brake + .2, T.lever + .8)) * (1 - eio(seg(t, T.next - .3, T.next + .4)));
const throttleOpen = t => eio(seg(t, T.throttle, T.throttle + .9)) * (1 - eio(seg(t, T.gasEnd, T.brake)));
// engine speed (rad/s of crank, slowed for the eye) and road speed (wheel rad/s)
const rpm = t => 5 + 14 * throttleOpen(t);
const carV = t => ss(seg(t, T.push - .2, T.forward + 1.2)) * (1 - ss(seg(t, T.clamp - .4, T.heat + 1.4)));
const integ = (f, t) => { let a = 0; for (let x = 0; x < t; x += 1 / 48) a += f(x) / 48; return a; };
const glowFade = t => 1 - ss(seg(t, T.next - .4, T.next + .3));
const gasFade = t => Math.min(glowFade(t), 1 - .75 * ss(seg(t, T.brake - .4, T.brake + .6)));

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, 34, 20, 17.5, 0, .7, 0],
  [T.move + .3, 40, 22, 16, 0, .7, 0],
  [T.road + .4, 48, 30, 14, 0, .8, 0],
  [T.gas + .9, 24, 26, 5.2, .55, .75, .4],
  [T.sensors + .4, 30, 28, 5.2, .65, .8, .4],
  [T.ecu + .9, 44, 30, 5.4, .95, .85, .35],
  [T.air, 60, 30, 5.0, 1.15, .8, .25],
  [T.afr + .4, 40, 30, 5.0, 1.05, .7, .15],
  [T.shove + .2, 16, 22, 4.6, 1.0, .6, .05],
  [T.spin + .4, 14, 22, 5.0, .8, .55, .05],
  [T.mult + .2, 24, 26, 5.6, .1, .5, .05],
  [T.x14 + .6, 30, 28, 6.4, -.4, .45, .05],
  [T.drive + 1.2, 36, 30, 7.0, -.9, .4, .1],
  [T.patch + .6, 52, 16, 5.0, -1.45, .32, .7],
  [T.push + .6, 62, 12, 5.0, -1.45, .25, .8],
  [T.forward + .6, 46, 26, 13.5, -.1, .45, 0],
  [T.brake + .6, 12, 20, 4.4, .4, .6, .5],
  [T.lb400 + .2, 20, 22, 4.2, .45, .62, .5],
  [T.suction + .3, 40, 26, 4.2, .66, .7, .5],
  [T.mc + .4, 52, 26, 4.2, .78, .7, .5],
  [T.psi + .3, 56, 26, 4.4, .82, .68, .5],
  [T.every + .4, 40, 46, 12.5, 0, .45, 0],
  [T.caliper + .5, 38, 40, 12.0, 0, .45, 0],
  [T.clamp + .4, 72, 18, 3.6, 1.32, .44, .8],
  [T.heat + .4, 62, 14, 3.8, 1.35, .4, .82],
  [T.next + .3, 40, 22, 15.5, 0, .7, 0],
  [T.congrats, 36, 22, 16, 0, .7, 0],
  [DUR, 30, 20, 17, 0, .7, 0],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz] = camTrack(t); const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = dist < 6 ? 120 : 240; post.dof.maxCoc = 8;
  const la = A - .9; key.position.set(tx + 10 * Math.sin(la), ty + 12, tz + 10 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 9 * Math.sin(A + Math.PI * .85), ty + 3, tz + 9 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 9, tz); top.lookAt(tx, ty, tz);
}

// ---------- events (foley) ----------
const EV = [{ t: T.move - .1, type: 'lift' }, { t: T.follow, type: 'spread' }, { t: T.gas + .1, type: 'pedal' }, { t: T.sensors + .2, type: 'label' }, { t: T.ecu + .2, type: 'beep' },
  { t: T.throttle + .1, type: 'servo' }, { t: T.air, type: 'air' }, { t: T.afr, type: 'label' }, { t: T.spark, type: 'rev' }, { t: T.crank, type: 'label' },
  { t: T.gear + .1, type: 'clunk' }, { t: T.mult + .2, type: 'label' }, { t: T.patch, type: 'label' }, { t: T.push - .2, type: 'roll' },
  { t: T.brake + .2, type: 'pedal' }, { t: T.lb400, type: 'label' }, { t: T.suction, type: 'hiss' }, { t: T.lb800, type: 'label' }, { t: T.fluid, type: 'label' }, { t: T.psi, type: 'label' },
  { t: T.every, type: 'flow' }, { t: T.clamp, type: 'clamp' }, { t: T.squeeze, type: 'squeal' }, { t: T.next, type: 'card' }, { t: T.congrats, type: 'card' }];
window.EV = EV.map(e => ({ t: +e.t.toFixed(2), type: e.type })).sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
window.render = t => {
  const lk = liftK(t), ek = explK(t);
  bodyG.position.y = 2.6 * lk; M.body.opacity = lerp(.92, 0, ss(seg(lk, .12, .42))); bodyG.visible = M.body.opacity > .01;
  // wheels and road
  const wa = integ(carV, t) * 7;
  wheels.forEach((w, i) => { w.g.position.set(w.x, WR, wheelZ(w.sz, ek)); w.spin.rotation.z = -wa; });
  const roadX = integ(carV, t) * 2.4;
  dashes.forEach(({ d, i }) => { d.position.x = 3.4 - ((i * .6 + roadX) % 7.2); });
  axles.forEach(({ a, sz }) => { const L = wheelZ(sz, ek) * sz - .05; a.scale.y = L; a.position.z = sz * L / 2; a.rotation.z = 0; });
  ringG.rotation.z = -wa / 3.5; pinion.rotation.x = wa;
  // engine
  const th = integ(rpm, t);
  crankG.rotation.x = -th;
  CYLX.forEach((x, i) => {
    const ph = FIRE[i] % (2 * Math.PI), phi = th + ph, py = .05 * Math.cos(phi), pz = .05 * Math.sin(phi);
    const ytop = CRK + py + Math.sqrt(.16 * .16 - pz * pz); pistons[i].position.set(x, ytop + .03, 0);
    const pin = V(x, CRK + py, pz), top2 = V(x, ytop, 0); rods[i].position.copy(pin).add(top2).multiplyScalar(.5); rods[i].scale.y = pin.distanceTo(top2); rods[i].rotation.x = Math.atan2(top2.z - pin.z, top2.y - pin.y) * -1;
    const cyc = ((th - FIRE[i]) % (4 * Math.PI) + 4 * Math.PI) % (4 * Math.PI);
    const fk = (t > T.spark - .3 && t < T.gasEnd) ? Math.exp(-cyc * 2.2) : 0;
    fires[i].material.opacity = fk * .9; fires[i].position.y = ytop + .07; fires[i].scale.y = 1 + 1.4 * (1 - fk); plugs[i].material = fk > .3 ? M.led : M.plug;
    sprays[i].material.opacity = (t > T.fuel - .1 && t < T.gasEnd) ? .7 * Math.exp(-(((th - FIRE[i] + Math.PI * 1.1) % (4 * Math.PI) + 4 * Math.PI) % (4 * Math.PI)) * 2) : 0;
  });
  fly.rotation.x = -th;
  // gearbox: input at engine speed, layshaft, output slower
  gIn.rotation.x = -th; gLay.rotation.x = th * .47; gLay2.rotation.x = th * .47; gOut.rotation.x = -th * .22; inShaft.rotation.x = -th;
  dshaft.children.forEach(c => c.rotation.x = 0); dshaft.rotation.x = 0;
  { const q = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -wa * 3.5); dshaft.quaternion.setFromEuler(new THREE.Euler(0, 0, Math.atan2(DS0.y - DS1.y, DS0.x - DS1.x))).multiply(q); }
  // throttle blade, air streaks
  const to = throttleOpen(t); blade.rotation.set(0, Math.PI / 2, 0); blade.rotateX(0); blade.rotation.y = Math.PI / 2 - to * 1.3;
  M.airM.opacity = to * .85 * (t < T.gasEnd ? 1 : 0);
  airLines.forEach(({ m, i }) => { const u = ((t * 1.4 + i / 6) % 1); m.position.set(XE + 1.05 - u * .55, .86 + .035 * Math.sin(i * 2.1), .3 + .035 * Math.cos(i * 2.1)); m.scale.x = .6 + .8 * u; });
  // pedals
  gasP.rotation.z = -.22 * gasPress(t); const bp = brkPress(t); brkP.rotation.z = -.22 * bp;
  // pushrod from the brake arm (1/4 of the way down) to the booster
  { const a = -.22 * bp, ay = .82 - .115 * Math.cos(a); const p0 = V(PEDX + .115 * Math.sin(-a), ay, ZB), p1 = V(.555, .7, ZB);
    pushrod.position.copy(p0).add(p1).multiplyScalar(.5); pushrod.scale.x = p0.distanceTo(p1); pushrod.rotation.z = Math.atan2(p1.y - p0.y, p1.x - p0.x); }
  mcPiston.position.set(.72 + .05 * bp, .7, ZB);
  // ECU LED blinks while it is working
  M.led.color.setRGB(.2, (t > T.ecu && t < T.gasEnd) ? (1.4 + 1.2 * (Math.sin(t * 18) > 0)) : .5, .5);
  // calipers clamp + rotors heat
  const ck = ss(seg(t, T.clamp - .3, T.clamp + .3)) * (1 - ss(seg(t, T.next, T.next + .6)));
  wheels.forEach(w => w.pads.forEach(({ p, s }) => { p.position.z = s * lerp(.03, .02, ck); }));
  M.rotor.emissiveIntensity = 2.2 * ss(seg(t, T.squeeze, T.heat + 1.8)) * (1 - ss(seg(t, T.next + .3, T.congrats + .8)));
  M.patch.opacity = .85 * ss(seg(t, T.patch + .9, T.patch + 1.4)) * (1 - ss(seg(t, T.brake - .6, T.brake)));
  // glowing paths
  const gf = gasFade(t), bf = glowFade(t);
  const setP = (p, pr, f) => { p.mat.uniforms.prog.value = pr; p.mat.uniforms.time.value = t; p.mat.uniforms.fade.value = f; p.mat.visible = pr > 0 && f > .01;
    p.head.visible = pr > 0 && pr < 1 && f > .5; if (p.head.visible) p.head.position.copy(p.cp.getPointAt(Math.min(pr, .9999))); };
  for (const p of [gasMain, ...gasAx]) setP(p, pathProg(p, t), gf);
  // wire glow tubes are hidden (r≈0); the main path rides along the wires
  for (const p of [gasWire, gasWire2]) { p.mat.visible = false; p.head.visible = false; }
  for (const p of brkPaths) setP(p, pathProg(p, t), bf);
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, ek, lk, wheels, calWorld, V, XE, CYLX, CRK, ZG, ZB, PEDX, XD, YD, XG0, XG1 });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
