// How a Tunnel Boring Machine Works — Exploded Teardown, 1080×1920. A cutaway block of city ground (street on top,
// strata below, the back half of the ground kept so the bore is visible) with a schematic TBM boring through bedrock.
// Units: model units (schematic, not to scale). X = tunnel axis (machine moves +x), Y up, Z toward camera.
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
  tbm: cue('v01', 2), rise: cue('v02', 0), factory: cue('v02', 1), drill: cue('v02', 2), site: cue('v02', 3),
  cut: cue('v03', 0), discs: cue('v03', 2), soft: cue('v04', 0), face: cue('v04', 1),
  shield: cue('v05', 0), shield2: cue('v05', 1), muck: cue('v06', 0), screw: cue('v06', 2), belt: cue('v06', 3),
  clever: cue('v07', 0), erector: cue('v07', 1), ring: cue('v07', 2), push: cue('v08', 0), steer: cue('v08', 3),
  cycle: cue('v09', 0), repeat: cue('v09', 1), sas: cue('v10', 0), len: cue('v10', 1), pace: cue('v10', 2),
  congrats: cue('v11', 0), card: cue('v11', 1),
};
T.down = T.clever - .9;   // reassemble and sink back into the bore just before "Now the clever part"
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
Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 80 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 5, 16, 5); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .5, 14, 14); scene.add(top);
const work = new THREE.PointLight('#ffd39a', 0, 6, 1.6); scene.add(work);   // warm work light inside the bore
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .22));

// ---------- materials ----------
const strata = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .92, side: THREE.DoubleSide });
strata.onBeforeCompile = s => {
  s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWp;
float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 strataCol(vec3 p){
  float y = p.y + .05 * sin(p.x * 1.7) + .03 * sin(p.x * 4.1 + p.z * 2.0);
  vec3 c = y > 3.75 ? vec3(.40,.28,.18) : y > 3.0 ? vec3(.58,.45,.30) : y > 2.35 ? vec3(.66,.58,.44) : vec3(.36,.35,.35);
  float n = hh(floor(p.xy * 22.0) + floor(p.z * 22.0));
  c *= .9 + .2 * n;
  if (y <= 2.35) { float f = hh(floor(p.xy * 40.0)); c = mix(c, vec3(.78,.76,.72), step(.94, f) * .7); c *= .92 + .1 * sin(p.y * 30.0 + p.x * 3.0); }
  if (abs(y - 3.75) < .015 || abs(y - 3.0) < .015 || abs(y - 2.35) < .015) c *= .7;
  return c;
}`).replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * strataCol(vWp), opacity );');
};
const M = {
  base: new THREE.MeshPhysicalMaterial({ color: '#2b2e33', roughness: .5, metalness: .3, clearcoat: .2 }),
  road: new THREE.MeshPhysicalMaterial({ color: '#2e3034', roughness: .8 }),
  paint: new THREE.MeshStandardMaterial({ color: '#e9e4d6', roughness: .6 }),
  walk: new THREE.MeshPhysicalMaterial({ color: '#a9a69e', roughness: .85 }),
  model: new THREE.MeshPhysicalMaterial({ color: '#f1efe9', roughness: .6 }),
  head: new THREE.MeshPhysicalMaterial({ color: '#e3a62c', roughness: .35, metalness: .4, clearcoat: .6 }),
  disc: new THREE.MeshStandardMaterial({ color: '#3a3d42', roughness: .3, metalness: 1 }),
  shell: new THREE.MeshPhysicalMaterial({ color: '#d9dde1', roughness: .35, metalness: .6, clearcoat: .5, side: THREE.DoubleSide }),
  steel: new THREE.MeshStandardMaterial({ color: '#4a5056', roughness: .45, metalness: .7, side: THREE.DoubleSide }),
  chrome: new THREE.MeshStandardMaterial({ color: '#d4d8dc', roughness: .15, metalness: 1 }),
  yellow: new THREE.MeshPhysicalMaterial({ color: '#f2c230', roughness: .4, clearcoat: .5 }),
  blue: new THREE.MeshPhysicalMaterial({ color: '#2f6fe0', roughness: .4, clearcoat: .5 }),
  ring: new THREE.MeshPhysicalMaterial({ color: '#cfcac0', roughness: .8 }),
  ringNew: new THREE.MeshPhysicalMaterial({ color: '#e7e2d6', roughness: .7, emissive: '#ff6b3d', emissiveIntensity: 0 }),
  belt: new THREE.MeshStandardMaterial({ color: '#1e1f22', roughness: .9 }),
  muck: new THREE.MeshPhysicalMaterial({ color: '#7d746a', roughness: .95 }),
  chamber: new THREE.MeshPhysicalMaterial({ color: '#8a6a45', roughness: .7, transparent: true, opacity: .0, emissive: '#ff6b3d', emissiveIntensity: .0, depthWrite: false }),
  rail: new THREE.MeshStandardMaterial({ color: '#c3c7cc', roughness: .2, metalness: 1 }),
  vest: new THREE.MeshPhysicalMaterial({ color: '#ff7a1a', roughness: .5 }),
  skin: new THREE.MeshPhysicalMaterial({ color: '#f1efe9', roughness: .6 }),
};
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const boxG = (sx, sy, sz, x, y, z) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);
const merged = (geos, mat) => { const ni = geos.some(g => !g.index); return sh(new THREE.Mesh(mergeGeometries(ni ? geos.map(g => g.index ? g.toNonIndexed() : g) : geos), mat)); };
// axis-along-x cylinder helpers (half = back half only, z ≤ 0, for the cutaway)
const cylX = (r1, r2, len, mat, half = false, seg = 40) => { const g = new THREE.CylinderGeometry(r1, r2, len, seg, 1, true, half ? Math.PI / 2 : 0, half ? Math.PI : Math.PI * 2); g.rotateZ(Math.PI / 2); return sh(new THREE.Mesh(g, mat)); };
const solidCylX = (r, len, mat, seg = 24) => { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateZ(Math.PI / 2); return sh(new THREE.Mesh(g, mat)); };

// ---------- dimensions ----------
const GY = 4.2, CY = 1.5, R = .9, X0 = -4.6, X1 = 4.6, ZB = -1.8, RW = .3;   // surface, axis height, bore radius, block ends, ring width
const F0 = 1.2;                                                            // face position at the start

// ---------- base + street lid ----------
scene.add(box(9.8, .16, 4.2, M.base, 0, .08, 0));
const lid = new THREE.Group(); scene.add(lid);
lid.add(box(X1 - X0, .22, 3.6, M.walk, 0, GY + .11, 0));
lid.add(box(X1 - X0, .01, 1.5, M.road, 0, GY + .225, .1));
{ const geos = []; for (let x = X0 + .2; x < X1; x += .6) geos.push(boxG(.3, .004, .025, x + .15, GY + .232, .1)); lid.add(merged(geos, M.paint)); }
{ let r = 99; const Rn = () => (r = (r * 16807) % 2147483647) / 2147483647; const geos = [];
  for (const [z0, s] of [[-.85, -1], [1.05, 1]]) for (let x = X0 + .05; x < X1 - .2;) { const w = .35 + Rn() * .5, h = s > 0 ? .1 + Rn() * .15 : .25 + Math.pow(Rn(), 1.6) * .8, d = .4 + Rn() * .2; geos.push(boxG(w - .05, h, d, x + w / 2, GY + .22 + h / 2, z0 + s * d / 2)); x += w; }
  lid.add(merged(geos, M.model)); }
// a few model cars on the street (the city carries on above)
const cars = [...Array(4)].map((_, i) => { const c = box(.28, .1, .14, M.model, 0, GY + .28, i % 2 ? .45 : -.2); scene.add(c); return c; });

// ---------- ground: bored section (with the half-pipe groove) and solid rock ahead of the face ----------
const groove = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(-ZB, 0); s.lineTo(-ZB, GY); s.lineTo(0, GY); s.lineTo(0, CY + R + .03); s.absarc(0, CY, R + .03, Math.PI / 2, -Math.PI / 2, true); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 40 }); g.rotateY(Math.PI / 2); return sh(new THREE.Mesh(g, strata)); })();
scene.add(groove);
const solid = sh(new THREE.Mesh(new THREE.BoxGeometry(1, GY, -ZB).translate(.5, GY / 2, ZB / 2), strata)); scene.add(solid);

// ---------- lining rings (back half, 3 segments each) ----------
const ringGeo = (() => { const geos = []; for (let k = 0; k < 3; k++) { const a0 = Math.PI / 2 - k * Math.PI / 3 - .02, a1 = Math.PI / 2 - (k + 1) * Math.PI / 3 + .02; const s = new THREE.Shape(); s.absarc(0, 0, R, a0, a1, true); s.absarc(0, 0, R - .1, a1, a0, false); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: RW - .015, bevelEnabled: false, curveSegments: 16 }); g.rotateY(Math.PI / 2); geos.push(g); } return mergeGeometries(geos); })();
const segGeo = k => { const a0 = Math.PI / 2 - k * Math.PI / 3 - .02, a1 = Math.PI / 2 - (k + 1) * Math.PI / 3 + .02; const s = new THREE.Shape(); s.absarc(0, 0, R, a0, a1, true); s.absarc(0, 0, R - .1, a1, a0, false); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: RW - .015, bevelEnabled: false, curveSegments: 16 }); g.rotateY(Math.PI / 2); return g; };
const MAXR = 40;
const rings = [...Array(MAXR)].map(() => { const m = sh(new THREE.Mesh(ringGeo, M.ring)); m.position.y = CY; scene.add(m); return m; });
// the ring being built (3 segments placed by the erector)
const newSegs = [0, 1, 2].map(k => { const m = sh(new THREE.Mesh(segGeo(k), M.ringNew)); scene.add(m); return m; });
// rails on the tunnel floor (front half, visible)
const railsG = new THREE.Group(); scene.add(railsG);
for (const z of [.18, .42]) railsG.add(box(1, .025, .025, M.rail, .5, CY - R + .16, z));

// ---------- the TBM (local x: 0 = face, negative = behind) ----------
const tbm = new THREE.Group(); scene.add(tbm);
const P = {};   // parts: { g, dx } exploded spread along x
const part = (name, dx) => { const g = new THREE.Group(); tbm.add(g); P[name] = { g, dx }; return g; };
// cutterhead: rim, hub, 6 spokes, disc cutters
const head = part('head', 1.7);
const headSpin = new THREE.Group(); head.add(headSpin); headSpin.position.x = -.06;
{ const rim = new THREE.Mesh(new THREE.TorusGeometry(R - .05, .05, 10, 48), M.head); rim.rotation.y = Math.PI / 2; headSpin.add(sh(rim));
  headSpin.add(solidCylX(.2, .14, M.head));
  for (let k = 0; k < 6; k++) { const s = box(.1, R - .12, .14, M.head, 0, (R - .12) / 2 + .1, 0); const g = new THREE.Group(); g.rotation.x = k * Math.PI / 3; g.add(s); headSpin.add(g); }
  const back = cylX(R - .02, R - .02, .02, M.steel); back.position.x = -.07; headSpin.add(back);
  const plate = new THREE.Mesh(new THREE.CircleGeometry(R - .06, 48), new THREE.MeshPhysicalMaterial({ color: '#b8862a', roughness: .5, metalness: .4, side: THREE.DoubleSide })); plate.rotation.y = Math.PI / 2; plate.position.x = -.07; headSpin.add(sh(plate)); }
const discs = [];
{ for (let k = 0; k < 6; k++) for (let j = 0; j < 4; j++) { const r = .22 + j * .17 + (k % 2) * .06; const a = k * Math.PI / 3 + j * .12; const d = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .03, 20), M.disc); d.rotation.z = Math.PI / 2; d.rotation.x = a; d.position.set(.09, Math.cos(a) * r, Math.sin(a) * r); headSpin.add(sh(d)); discs.push(d); } }
// excavation chamber (pressurized face) + bulkhead + drive motors
const chamberPart = part('chamber', 1.05);
const chamber = cylX(R - .03, R - .03, .26, M.chamber); chamber.material = M.chamber; chamber.position.x = -.25; chamberPart.add(chamber);
const chamberFill = new THREE.Mesh(new THREE.CylinderGeometry(R - .04, R - .04, .24, 40).rotateZ(Math.PI / 2), M.chamber); chamberFill.position.x = -.25; chamberPart.add(chamberFill);
const drive = part('drive', .55);
{ const bh = new THREE.Mesh(new THREE.CircleGeometry(R - .02, 48), M.steel); bh.rotation.y = Math.PI / 2; bh.position.x = -.4; drive.add(sh(bh));
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + .2; const m = box(.24, .12, .12, M.blue, -.55, Math.cos(a) * .55, Math.sin(a) * .55); drive.add(m); }
  const hub = solidCylX(.3, .2, M.steel); hub.position.x = -.55; drive.add(hub); }
// front shield (back half shell)
const fshield = part('fshield', 0);
{ const s = cylX(R, R, 1.05, M.shell, true); s.position.x = -.62; fshield.add(s); const band = cylX(R + .01, R + .01, .06, M.yellow, true); band.position.x = -.12; fshield.add(band); }
// screw conveyor: inclined tube from the chamber floor up and back
const screwPart = part('screw', -.25);
const screwA = new THREE.Vector3(-.45, -.62, -.18), screwB = new THREE.Vector3(-2.75, .05, -.18);
{ const c = new THREE.LineCurve3(screwA, screwB); const tube = sh(new THREE.Mesh(new THREE.TubeGeometry(c, 8, .12, 16), new THREE.MeshPhysicalMaterial({ color: '#f2c230', roughness: .4, clearcoat: .5, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false }))); screwPart.add(tube);
  const L = screwA.distanceTo(screwB), pts = []; for (let i = 0; i <= 200; i++) { const u = i / 200, a = u * L * 28; pts.push(new THREE.Vector3(0, Math.cos(a) * .085, Math.sin(a) * .085)); }
  const helix = sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => p.clone().setX(0))), 400, .018, 6), M.chrome)); // placeholder overwritten below
  const hp = pts.map((p, i) => { const u = i / 200; return new THREE.Vector3().lerpVectors(screwA, screwB, u).add(new THREE.Vector3(0, p.y, p.z)); });
  helix.geometry.dispose(); helix.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp), 400, .016, 6); screwPart.add(helix); }
// thrust rams: 10 around the circumference, rods stretch to the last ring
const ramPart = part('rams', -.7);
const rams = [];
for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + (k + .5) * Math.PI / 10 * 2; if (Math.sin(a) > .25) continue; const g = new THREE.Group(); g.position.set(-1.7, Math.cos(a) * (R - .14), Math.sin(a) * (R - .14)); ramPart.add(g);
  const barrel = solidCylX(.045, .32, M.yellow, 12); barrel.position.x = -.16; g.add(barrel); const rod = solidCylX(.025, 1, M.chrome, 10); g.add(rod); const shoe = box(.04, .1, .1, M.steel); g.add(shoe); rams.push({ g, rod, shoe }); }
// segment erector: ring beam + rotating arm
const erPart = part('erector', -1.2);
const erArm = new THREE.Group(); erArm.position.x = -2.0; erPart.add(erArm);
{ const rb = new THREE.Mesh(new THREE.TorusGeometry(.5, .04, 8, 40), M.blue); rb.rotation.y = Math.PI / 2; rb.position.x = -2.0; erPart.add(sh(rb));
  erArm.add(box(.1, .55, .1, M.blue, 0, .3, 0)); erArm.add(box(.16, .08, .3, M.steel, 0, .6, 0)); }
// tail shield
const tshield = part('tshield', -1.7);
{ const s = cylX(R - .005, R - .005, 1.15, M.shell, true); s.position.x = -1.85; tshield.add(s); }
// trailing gear: 3 gantries with tanks, cabinets, belt conveyor, two tiny workers
const gear = part('gear', -2.4);
const BELT0 = -2.75, BELT1 = -6.2, BELTY = .2;
{ const geos = [];
  for (const x of [-3.2, -4.25, -5.3]) { for (const dz of [-.45, .45]) for (const dx of [-.4, .4]) geos.push(boxG(.05, 1.15, .05, x + dx, -.18, dz)); geos.push(boxG(.9, .05, .95, x, .4, 0), boxG(.9, .05, .95, x, -.2, 0)); }
  gear.add(merged(geos, M.steel));
  for (const x of [-3.2, -4.25, -5.3]) { const tk = solidCylX(.13, .6, M.blue); tk.position.set(x, -.05, -.3); gear.add(tk); gear.add(box(.3, .3, .25, M.yellow, x + .2, -.48, -.3)); gear.add(box(.25, .2, .2, M.shell, x - .2, .55, -.25)); }
  gear.add(box(BELT0 - BELT1, .03, .16, M.belt, (BELT0 + BELT1) / 2, BELTY, -.18));
  for (const [x, z] of [[-3.7, .25], [-4.9, .2]]) { gear.add(box(.06, .14, .05, M.vest, x, -.47, z)); gear.add(box(.05, .05, .05, M.skin, x, -.37, z)); gear.add(box(.06, .02, .06, M.yellow, x, -.33, z)); } }
// muck particles along screw → belt
const MUCKN = 46;
const muck = [...Array(MUCKN)].map((_, i) => { const m = sh(new THREE.Mesh(new THREE.DodecahedronGeometry(.035 + (i % 3) * .008, 0), M.muck)); tbm.add(m); return m; });
const muckPath = u => u < .45 ? new THREE.Vector3().lerpVectors(screwA, screwB, u / .45) : new THREE.Vector3(lerp(BELT0, BELT1 - 2, (u - .45) / .55), BELTY + .04, -.18);

// ---------- motion ----------
const pop = x => 1 - Math.pow(1 - ss(x), 3);
const riseK = t => eio(seg(t, T.rise - .1, T.rise + 1.6)) * (1 - eio(seg(t, T.down, T.down + 1.5)));
const explK = t => pop(seg(t, T.factory - .2, T.factory + 1.2)) * (1 - eio(seg(t, T.down - .2, T.down + 1.0)));
const LIFT = 4.5;
// ring cycle: ring builds (3 segments), then rams push the machine forward one ring width.
// one slow cycle during v07/v08, then 4 fast cycles in the time-lapse
const CYC = [{ build: [T.ring - .2, T.push - .1], push: [T.push + .2, T.push + 2.0] }];
{ const t0 = T.cycle - .1, step = (T.sas - .4 - t0) / 4; for (let i = 0; i < 4; i++) CYC.push({ build: [t0 + i * step, t0 + i * step + step * .5], push: [t0 + i * step + step * .55, t0 + (i + 1) * step - .05] }); }
const INTRO_ADV = .45;   // the machine is already boring during the hook
function cycleState(t) {
  let F = F0 + INTRO_ADV * eio(seg(t, .2, T.rise - .2)), rings = 0, build = 0, pushing = 0;
  for (const c of CYC) { if (t >= c.build[1]) rings++; else if (t > c.build[0]) build = seg(t, c.build[0], c.build[1]); const p = eio(seg(t, c.push[0], c.push[1])); F += RW * p; if (p > 0 && p < 1) pushing = 1; }
  return { F, rings, build, pushing };
}
const RING0 = F0 + INTRO_ADV - 2.0;     // front of the last completed ring when the slow cycle starts
const cutting = t => (t < T.rise - .2) || (t > T.cut - .3 && t < T.down) || (t > T.push && t < T.congrats);

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, 20, 32, 17, 0, 3.4, 0],
  [T.tbm, 24, 14, 13, .4, 2.2, 0],
  [T.rise + .2, 28, 14, 13.5, .4, 2.6, 0],
  [T.factory + 1.3, 30, 16, 22, 0, 5.2, 0],
  [T.site + .6, 34, 18, 22, -.8, 5.4, 0],
  [T.cut + .5, 62, 8, 7.5, 3.6, 5.95, 0],
  [T.discs + .8, 74, 6, 6.6, 3.6, 5.95, 0],
  [T.soft + .6, 52, 10, 8.0, 2.9, 5.95, 0],
  [T.shield + .6, 36, 10, 9.5, 1.6, 5.85, 0],
  [T.muck + .4, 28, 12, 10, .6, 5.85, 0],
  [T.belt + .6, 18, 12, 12, -.8, 5.85, 0],
  [T.down + 1.6, 22, 12, 11.5, .6, 2.4, 0],
  [T.erector + .4, 18, 8, 8.2, -.4, 1.6, 0],
  [T.ring + 1.4, 16, 6, 7.8, -.5, 1.5, 0],
  [T.push + 1.2, 26, 8, 7.6, .3, 1.6, 0],
  [T.steer + .6, 40, 10, 8.0, .4, 1.6, 0],
  [T.cycle + .5, 22, 18, 13, .6, 2.3, 0],
  [T.sas, 20, 20, 14.5, .8, 2.6, 0],
  [T.congrats, 18, 24, 17, .6, 3.0, 0],
  [DUR, 14, 26, 18.5, .6, 3.2, 0],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz] = camTrack(t); const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 240; post.dof.maxCoc = 10;
  const la = A - .9; key.position.set(tx + 14 * Math.sin(la), ty + 16, tz + 14 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 12 * Math.sin(A + Math.PI * .85), ty + 4, tz + 12 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 12, tz); top.lookAt(tx, ty, tz);
}

// ---------- events ----------
const EV = [{ t: T.tbm, type: 'drill' }, { t: T.rise, type: 'lift' }, { t: T.factory + .2, type: 'spread' }, { t: T.cut, type: 'drill' }, { t: T.discs, type: 'label' }, { t: T.face, type: 'label' },
  { t: T.shield2, type: 'label' }, { t: T.screw, type: 'label' }, { t: T.belt, type: 'label' }, { t: T.down + 1.4, type: 'land' }];
for (const c of CYC) { for (let k = 0; k < 3; k++) EV.push({ t: +(lerp(c.build[0], c.build[1], (k + 1) / 3) - .02).toFixed(2), type: 'clunk' }); EV.push({ t: +c.push[0].toFixed(2), type: 'hydraulic' }); }
EV.push({ t: T.sas, type: 'card' }, { t: T.card, type: 'card' });
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
const tmp = new THREE.Vector3();
window.render = t => {
  const st = cycleState(t), F = st.F, rk = riseK(t), ek = explK(t);
  // ground follows the face
  groove.position.x = X0; groove.scale.x = Math.max(F - .02 - X0, .01);
  solid.position.x = F - .02; solid.scale.x = Math.max(X1 - F + .02, .01);
  railsG.position.x = X0; railsG.scale.x = Math.max(F - 2.6 - X0, .01);
  // machine position: lifted above the city and exploded along x during the teardown section
  tbm.position.set(F, CY + LIFT * rk, 0);
  for (const n of Object.keys(P)) P[n].g.position.x = P[n].dx * ek;
  { let a = 0; for (let x = 0; x < t; x += 1 / 48) a += (.3 + 2.1 * (cutting(x) ? 1 : 0)) / 48; headSpin.rotation.x = a; }
  // disc cutters glow when they bite
  M.disc.emissive = M.disc.emissive || new THREE.Color(); M.disc.emissive.set('#ff6b3d'); M.disc.emissiveIntensity = (t > T.discs - .2 && t < T.soft) ? .5 + .4 * Math.sin(t * 9) : 0;
  // pressurized face chamber
  const fk = seg(t, T.face - .2, T.face + .4) * (1 - seg(t, T.shield, T.shield + .5));
  M.chamber.opacity = .75 * fk; M.chamber.emissiveIntensity = .25 * fk; chamber.visible = chamberFill.visible = fk > .01;
  // shields highlight
  M.shell.emissive.set('#ff6b3d'); M.shell.emissiveIntensity = (t > T.shield2 - .1 && t < T.muck) ? .12 + .08 * Math.sin(t * 6) : 0;
  // muck flow
  const flowOn = (t > T.muck - .2 && t < T.down) || (t < T.rise - .3) || (t > T.push && t < T.congrats + 1);
  muck.forEach((m, i) => { const u = ((i / MUCKN) + (flowOn ? t * .09 : 0)) % 1; const p = muckPath(u); m.position.copy(p); m.visible = flowOn; m.rotation.set(t * 2 + i, t * 3 + i * .7, 0); });
  // rings: completed rings behind the shield; the new ring is assembled segment by segment
  const nRings = Math.min(MAXR, Math.floor((RING0 - X0) / RW + 1e-6) + st.rings);
  rings.forEach((m, i) => { m.visible = i < nRings; m.position.x = X0 + i * RW; });
  const ringFront = X0 + nRings * RW, b = st.build;
  newSegs.forEach((m, k) => { const p = ss(clamp(b * 3 - k)); m.visible = b > 0 && p > 0; if (!m.visible) return; m.position.set(ringFront, CY, 0); m.scale.setScalar(lerp(.55, 1, p)); m.rotation.x = (1 - p) * .9; });
  M.ringNew.emissiveIntensity = .25 * (b > 0 ? 1 : 0);
  // erector arm swings to the segment being set
  const curSeg = Math.min(2, Math.floor(b * 3)); erArm.rotation.x = b > 0 ? -(curSeg + .5) * Math.PI / 3 * ss(clamp(b * 3 - curSeg)) : Math.sin(t * .5) * .2;
  // rams: from the machine to the face of the last ring
  const lastRingFront = (b > 0 ? ringFront + RW : ringFront);
  rams.forEach(r => { const xr = F + P.rams.g.position.x - 1.7; const len = rk > .01 || ek > .01 ? .25 : clamp(xr - lastRingFront, .05, 1.2); r.rod.scale.y = len; r.rod.position.x = -len / 2; r.shoe.position.x = -len; });
  M.chrome.emissive = M.chrome.emissive || new THREE.Color(); M.chrome.emissive.set('#59d4ff'); M.chrome.emissiveIntensity = st.pushing ? .35 : 0;
  // work light rides with the machine inside the bore
  work.position.set(F - 3.5, CY + .3, .3); work.intensity = rk < .5 ? 2.2 : 0;
  // cars keep moving on the street (nothing up top notices)
  cars.forEach((c, i) => { c.position.x = X0 + ((t * (.5 + i * .12) + i * 2.3) % (X1 - X0 - .4)) + .2; });
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, F, CY, R, LIFT, rk, ek, P, ringFront, st, GY });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
