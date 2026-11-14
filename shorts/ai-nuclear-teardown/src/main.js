// Why AI is restarting nuclear plants — Exploded Teardown, 1080×1920.
// A schematic island plant (one pressurized-water reactor unit) beside a river, a grid line across the water to a data center.
// Units: schematic model units, not to scale. Y up, Z toward the default camera, X to the right.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, eio, eo, track, mulberry } from '/core/lib.js';
import { initOverlay, drawOverlay, overlayTexts } from './overlay.js';

const W = 1080, H = 1920;
const Q = new URLSearchParams(location.search);
const SSAA = +(Q.get('ssaa') || 1);
const TL = await (await fetch('timeline.json')).json();
const VDUR = await (await fetch('voice/dur.json')).json();
const DUR = TL.dur;
const CUES = []; for (const v of TL.vo) { const d = VDUR[v.id]; const n = v.chunks.map(c => c.replace(/[^A-Za-z0-9]/g, '').length + 2), tot = n.reduce((a, b) => a + b, 0); let t = v.t; v.chunks.forEach((c, i) => { CUES.push({ id: v.id, i, t }); t += d * n[i] / tot; }); }
const cue = (id, i = 0) => CUES.find(c => c.id === id && c.i === i).t;
const T = {
  hook: cue('v01'), reveal: cue('v02'), tmi: cue('v02', 0), worst: cue('v02', 2), alive: cue('v02', 4),
  deal: cue('v03'), deal2: cue('v03', 1), unit1: cue('v03', 2), why: cue('v04'), apart: cue('v04', 1),
  fuel: cue('v05'), split: cue('v05', 1), heat: cue('v05', 2), crod: cue('v06'), slide: cue('v06', 2),
  vessel: cue('v07'), loop: cue('v08'), sg: cue('v08', 1), loop2: cue('v08', 2), turb: cue('v09'), gen: cue('v09', 1),
  tower: cue('v10'), chain: cue('v11'), gpus: cue('v11', 1), mw: cue('v12'), now: cue('v13'), chart: cue('v14'), y28: cue('v14', 2),
  smr: cue('v15'), goog: cue('v15', 2), amzn: cue('v15', 3), catch: cue('v16'), cost: cue('v16', 1), years: cue('v16', 2), waste: cue('v16', 3),
  close: cue('v17'), past: cue('v17', 2), end: cue('v18'),
};
T.re = T.mw - .5;   // reassemble as the stats card lands
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
post.bloom.strength = .5; post.bloom.radius = .5; post.bloom.threshold = 1.6;
post.vig.uniforms.amt.value = .36; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .1;
{
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createRadialGradient(560, 820, 80, 540, 960, 1500); gr.addColorStop(0, '#33373d'); gr.addColorStop(.45, '#212428'); gr.addColorStop(1, '#0c0d0f');
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
const core = new THREE.PointLight('#ff8a3d', 0, 3.5, 1.6); scene.add(core);   // glow of the reactor core
const hemi = new THREE.HemisphereLight('#c9d3e0', '#1a1712', .22); scene.add(hemi);

// ---------- materials ----------
const M = {
  base: new THREE.MeshPhysicalMaterial({ color: '#2b2e33', roughness: .5, metalness: .3, clearcoat: .2 }),
  water: new THREE.MeshPhysicalMaterial({ color: '#2a4d63', roughness: .4, metalness: .1, clearcoat: .3, transparent: true, opacity: .92 }),
  land: new THREE.MeshPhysicalMaterial({ color: '#7d8a6a', roughness: .95 }),
  pad: new THREE.MeshPhysicalMaterial({ color: '#b9b6ad', roughness: .9 }),
  model: new THREE.MeshPhysicalMaterial({ color: '#f1efe9', roughness: .6 }),
  concrete: new THREE.MeshPhysicalMaterial({ color: '#e4e0d6', roughness: .85, side: THREE.DoubleSide }),
  shell: new THREE.MeshPhysicalMaterial({ color: '#eceae4', roughness: .55, side: THREE.DoubleSide, transparent: true, opacity: 1 }),
  hall: new THREE.MeshPhysicalMaterial({ color: '#d7dade', roughness: .6, side: THREE.DoubleSide, transparent: true, opacity: 1 }),
  steel: new THREE.MeshStandardMaterial({ color: '#4a5056', roughness: .45, metalness: .7, side: THREE.DoubleSide }),
  vessel: new THREE.MeshPhysicalMaterial({ color: '#9aa3ab', roughness: .3, metalness: .8, clearcoat: .5, side: THREE.DoubleSide, emissive: '#ff6b3d', emissiveIntensity: 0 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#d4d8dc', roughness: .15, metalness: 1 }),
  fuel: new THREE.MeshPhysicalMaterial({ color: '#7a6a58', roughness: .4, metalness: .5, emissive: '#ff7a2a', emissiveIntensity: 0 }),
  pellet: new THREE.MeshPhysicalMaterial({ color: '#3b3a3c', roughness: .5, metalness: .3, emissive: '#ff7a2a', emissiveIntensity: .0 }),
  rod: new THREE.MeshStandardMaterial({ color: '#1d1f23', roughness: .35, metalness: .8, emissive: '#59d4ff', emissiveIntensity: 0 }),
  hot: new THREE.MeshPhysicalMaterial({ color: '#d2452f', roughness: .35, clearcoat: .5, emissive: '#ff4a2a', emissiveIntensity: 0 }),
  cold: new THREE.MeshPhysicalMaterial({ color: '#2f6fe0', roughness: .35, clearcoat: .5, emissive: '#3a8bff', emissiveIntensity: 0 }),
  steam: new THREE.MeshPhysicalMaterial({ color: '#c9ccd2', roughness: .3, metalness: .4, clearcoat: .5, emissive: '#ffffff', emissiveIntensity: 0 }),
  sg: new THREE.MeshPhysicalMaterial({ color: '#f2c230', roughness: .4, clearcoat: .5, emissive: '#ff6b3d', emissiveIntensity: 0 }),
  turb: new THREE.MeshStandardMaterial({ color: '#c3c7cc', roughness: .25, metalness: 1, emissive: '#ffffff', emissiveIntensity: 0 }),
  gen: new THREE.MeshPhysicalMaterial({ color: '#2f6fe0', roughness: .4, clearcoat: .5, emissive: '#59d4ff', emissiveIntensity: 0 }),
  yellow: new THREE.MeshPhysicalMaterial({ color: '#f2c230', roughness: .4, clearcoat: .5 }),
  dark: new THREE.MeshStandardMaterial({ color: '#1e1f22', roughness: .8 }),
  wire: new THREE.MeshStandardMaterial({ color: '#2a2c30', roughness: .5, metalness: .6, emissive: '#59d4ff', emissiveIntensity: 0 }),
  glass: new THREE.MeshStandardMaterial({ color: '#1b2430', roughness: .2, metalness: .3, emissive: '#ffd39a', emissiveIntensity: 0, transparent: true }),
  rack: new THREE.MeshStandardMaterial({ color: '#16181b', roughness: .5, metalness: .4 }),
  led: new THREE.MeshStandardMaterial({ color: '#0b0c0e', emissive: '#59d4ff', emissiveIntensity: 0 }),
  cask: new THREE.MeshPhysicalMaterial({ color: '#a8acb0', roughness: .5, metalness: .4, emissive: '#ff6b3d', emissiveIntensity: 0 }),
  smr: new THREE.MeshPhysicalMaterial({ color: '#f1efe9', roughness: .55, transparent: true, opacity: 1 }),
  smrDome: new THREE.MeshPhysicalMaterial({ color: '#ff6b3d', roughness: .4, clearcoat: .6, transparent: true, opacity: 1 }),
};
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const boxG = (sx, sy, sz, x, y, z) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);
const cylY = (r1, r2, h, mat, x, y, z, seg = 32, open = false, t0 = 0, tl = Math.PI * 2) => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg, 1, open, t0, tl), mat)); m.position.set(x, y, z); return m; };
const cylX = (r, len, mat, seg = 32) => { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateZ(Math.PI / 2); return sh(new THREE.Mesh(g, mat)); };
const tube = (pts, r, mat, n = 64) => { const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))); const m = sh(new THREE.Mesh(new THREE.TubeGeometry(c, n, r, 12), mat)); m.userData.curve = c; return m; };
const merged = (geos, mat) => sh(new THREE.Mesh(mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g)), mat));
const rnd = mulberry(7);

// ---------- ground: river, island, far bank with the data center ----------
const BY = .3;   // top of the island slab
scene.add(box(15.5, .16, 9.4, M.base, 1.4, .08, -.6));
scene.add(box(15.2, .06, 9.1, M.water, 1.4, .19, -.6));
{ const s = new THREE.Shape(); const pts = [[-4.2, 1.9], [-4.3, -.6], [-3.9, -3.6], [-1.5, -4.1], [2.2, -4.0], [3.4, -3.0], [3.3, .2], [3.0, 2.1], [-.4, 2.6], [-3.4, 2.4]];
  s.moveTo(pts[0][0], -pts[0][1]); for (const p of pts.slice(1)) s.lineTo(p[0], -p[1]); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: .14, bevelEnabled: true, bevelThickness: .03, bevelSize: .06, bevelSegments: 2 }); g.rotateX(-Math.PI / 2); g.translate(0, .16, 0);
  scene.add(sh(new THREE.Mesh(g, M.land))); }
{ const s = new THREE.Shape(); const pts = [[4.3, 2.4], [4.2, -3.6], [8.6, -3.8], [8.7, 2.4]];
  s.moveTo(pts[0][0], -pts[0][1]); for (const p of pts.slice(1)) s.lineTo(p[0], -p[1]); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: .14, bevelEnabled: true, bevelThickness: .03, bevelSize: .06, bevelSegments: 2 }); g.rotateX(-Math.PI / 2); g.translate(0, .16, 0);
  scene.add(sh(new THREE.Mesh(g, M.land))); }
scene.add(box(6.0, .02, 3.6, M.pad, -.4, BY + .01, .1));      // plant pad
scene.add(box(3.4, .02, 2.6, M.pad, 6.1, BY + .01, .4));      // data-center pad
scene.add(box(3.4, .02, 1.5, M.pad, 6.1, BY + .01, -1.9));    // future SMR pad

// ---------- reactor building: containment (lifts off), vessel, core, control rods, steam generator, loops ----------
const CX = -2.25, CZ = .55, CR = 1.1, CH = 2.0;
const contain = new THREE.Group(); scene.add(contain);
contain.add(cylY(CR, CR, CH, M.shell, CX, BY + CH / 2, CZ, 64, true));
{ const d = sh(new THREE.Mesh(new THREE.SphereGeometry(CR, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), M.shell)); d.position.set(CX, BY + CH, CZ); contain.add(d); }
{ const geos = []; for (let k = 0; k < 7; k++) geos.push(new THREE.TorusGeometry(CR + .005, .012, 6, 64).rotateX(Math.PI / 2).translate(CX, BY + .25 + k * .26, CZ)); contain.add(merged(geos, M.steel)); }
contain.add(box(.4, .02, .4, M.steel, CX, BY + CH + CR - .02, CZ));
// reactor pressure vessel (front wedge cut away so the core is visible)
const VX = CX - .38, VZ = CZ + .1, VR = .36, VY0 = BY + .25, VH = 1.15;
const VC = new THREE.Vector3(VX, VY0 + VH / 2, VZ);
const vesselG = new THREE.Group(); scene.add(vesselG);
vesselG.add(cylY(VR, VR, VH, M.vessel, VX, VY0 + VH / 2, VZ, 48, true, Math.PI / 3.2, Math.PI * 2 - Math.PI / 1.6));
{ const b = sh(new THREE.Mesh(new THREE.SphereGeometry(VR, 48, 16, Math.PI / 3.2, Math.PI * 2 - Math.PI / 1.6, Math.PI / 2, Math.PI / 2), M.vessel)); b.position.set(VX, VY0, VZ); vesselG.add(b); }
vesselG.add(cylY(VR + .07, VR + .07, .06, M.steel, VX, VY0 + VH - .03, VZ, 48));   // flange
const lid = new THREE.Group(); scene.add(lid);
{ const h = sh(new THREE.Mesh(new THREE.SphereGeometry(VR + .04, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.vessel)); h.position.set(VX, VY0 + VH + .01, VZ); lid.add(h);
  lid.add(cylY(VR + .07, VR + .07, .05, M.steel, VX, VY0 + VH + .02, VZ, 48)); }
// core: fuel rods
const fuelRods = []; const CORE_Y = VY0 + .1, CORE_H = .62;
{ for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { const x = i * .075, z = j * .075; if (x * x + z * z > .27 * .27) continue; const m = cylY(.025, .025, CORE_H, M.fuel, VX + x, CORE_Y + CORE_H / 2, VZ + z, 10); scene.add(m); fuelRods.push(m); } }
// control rods: 4 rods + drive shafts through the lid; they ride down between the fuel rods
const crods = new THREE.Group(); scene.add(crods);
{ for (const [x, z] of [[-.0375, -.0375], [.0375, .0375], [-.1125, .0375], [.1125, -.0375], [.0375, -.1125], [-.0375, .1125]]) { crods.add(cylY(.018, .018, CORE_H, M.rod, VX + x, 0, VZ + z, 10)); crods.add(cylY(.008, .008, 1.0, M.chrome, VX + x, CORE_H / 2 + .5, VZ + z, 6)); }
  crods.add(cylY(.17, .17, .03, M.rod, VX, CORE_H / 2 + .01, VZ, 24)); }
const CROD_OUT = CORE_Y + CORE_H / 2 + CORE_H * .78, CROD_IN = CORE_Y + CORE_H / 2 + .02;
// a fuel rod pulled out beside the vessel, its pellets fanned apart
const pelletG = new THREE.Group(); scene.add(pelletG);
const pellets = [...Array(9)].map((_, i) => { const m = cylY(.05, .05, .065, M.pellet, 0, 0, 0, 20); pelletG.add(m); return m; });
const sheath = cylY(.056, .056, 1, M.chrome, 0, 0, 0, 20, true); sheath.material = new THREE.MeshPhysicalMaterial({ color: '#cfd4da', roughness: .2, metalness: .9, transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false }); pelletG.add(sheath);
// steam generator
const SGX = CX + .45, SGZ = CZ - .2, SGY0 = BY + .2, SGH = 1.55;
scene.add(cylY(.24, .24, SGH, M.sg, SGX, SGY0 + SGH / 2, SGZ, 32));
{ const d = sh(new THREE.Mesh(new THREE.SphereGeometry(.24, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.sg)); d.position.set(SGX, SGY0 + SGH, SGZ); scene.add(d);
  const b = sh(new THREE.Mesh(new THREE.SphereGeometry(.24, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.sg)); b.position.set(SGX, SGY0, SGZ); scene.add(b); }
// reactor coolant pump
scene.add(cylY(.1, .1, .22, M.steel, VX + .45, BY + .2, VZ + .35, 20));
// primary loop: hot leg (vessel → SG top half), cold leg (SG bottom → pump → vessel)
const hotLeg = tube([[VX + VR - .02, VY0 + VH * .78, VZ], [VX + .58, VY0 + VH * .82, VZ - .1], [SGX - .05, SGY0 + SGH * .6, SGZ + .2], [SGX, SGY0 + SGH * .55, SGZ + .1]], .05, M.hot);
const coldLeg = tube([[SGX, SGY0 + .02, SGZ + .12], [SGX - .1, BY + .22, VZ + .3], [VX + .45, BY + .2, VZ + .35], [VX + .2, VY0 + .35, VZ + .25], [VX + VR - .1, VY0 + .45, VZ + .12]], .045, M.cold);
scene.add(hotLeg, coldLeg);
// secondary loop: steam line SG → turbine, feedwater condenser → SG
const TX0 = .05, TX1 = 1.55, TY = BY + .55, TZ = .55;    // turbine axis
const steamLine = tube([[SGX, SGY0 + SGH + .22, SGZ], [SGX + .1, SGY0 + SGH + .5, SGZ], [CX + CR + .3, SGY0 + SGH + .4, SGZ + .1], [TX0 - .5, TY + .7, TZ - .1], [TX0 - .05, TY + .02, TZ]], .055, M.steam);
const feedLine = tube([[TX0 + .6, BY + .12, TZ - .45], [-.4, BY + .1, TZ - .45], [CX + CR + .2, BY + .14, SGZ - .3], [SGX + .1, SGY0 + .4, SGZ - .2]], .04, M.cold);
scene.add(steamLine, feedLine);

// ---------- turbine hall: hall shell (lifts off), turbine rotor, generator, condenser ----------
const hallShell = new THREE.Group(); scene.add(hallShell);
{ const x0 = -.4, x1 = 2.65, z0 = -.25, z1 = 1.25, h = 1.35; const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  hallShell.add(box(x1 - x0, .06, z1 - z0, M.hall, cx, BY + h, cz));
  hallShell.add(box(x1 - x0, h, .05, M.hall, cx, BY + h / 2, z0));
  hallShell.add(box(x1 - x0, h, .05, M.hall, cx, BY + h / 2, z1));
  hallShell.add(box(.05, h, z1 - z0, M.hall, x0, BY + h / 2, cz));
  hallShell.add(box(.05, h, z1 - z0, M.hall, x1, BY + h / 2, cz));
  const geos = []; for (let k = 0; k < 9; k++) geos.push(boxG(.18, .1, .02, x0 + .25 + k * .33, BY + h - .25, z1 + .03)); hallShell.add(merged(geos, M.glass)); }
const rotor = new THREE.Group(); rotor.position.set(0, TY, TZ); scene.add(rotor);
{ const shaft = cylX(.04, TX1 - TX0 + 1.0, M.chrome, 12); shaft.position.x = (TX0 + TX1 + 1.0) / 2; rotor.add(shaft);
  for (let k = 0; k < 9; k++) { const x = TX0 + .08 + k * .17, r = .16 + k * .028; const geos = []; for (let b = 0; b < 14; b++) { const a = b * Math.PI * 2 / 14; const g = new THREE.BoxGeometry(.035, r, .05).translate(0, r / 2 + .04, 0); g.rotateY(.5); g.rotateX(a); g.translate(x, 0, 0); geos.push(g); }
    rotor.add(merged(geos, M.turb)); const d = cylX(.07, .04, M.steel, 16); d.position.x = x; rotor.add(d); } }
// turbine casing (back half only, so the blades show)
{ const g = new THREE.CylinderGeometry(.48, .3, TX1 - TX0 + .1, 40, 1, true, Math.PI, Math.PI); g.rotateZ(Math.PI / 2); const m = sh(new THREE.Mesh(g, M.steel)); m.position.set((TX0 + TX1) / 2, TY, TZ); scene.add(m); }
const GX0 = 1.8, GX1 = 2.45;
const genBody = cylX(.27, GX1 - GX0, M.gen, 40); genBody.position.set((GX0 + GX1) / 2, TY, TZ); scene.add(genBody);
const genFan = new THREE.Group(); genFan.position.set(GX1 + .03, TY, TZ); scene.add(genFan);
{ for (let b = 0; b < 6; b++) { const m = box(.02, .2, .05, M.chrome, 0, .1, 0); const g = new THREE.Group(); g.rotation.x = b * Math.PI / 3; g.add(m); genFan.add(g); } }
scene.add(box(1.5, .3, .7, M.steel, (TX0 + TX1) / 2, BY + .15, TZ - .05));   // condenser
for (const x of [TX0 + .3, TX1 - .2, GX0 + .3]) scene.add(box(.3, TY - BY - .2, .3, M.dark, x, BY + (TY - BY - .2) / 2, TZ));   // pedestals
// main transformer + switchyard
const XF = new THREE.Vector3(3.0, BY, 1.25);
scene.add(box(.4, .35, .3, M.steel, XF.x, BY + .175, XF.z));
for (let k = 0; k < 3; k++) scene.add(cylY(.025, .025, .25, M.model, XF.x - .12 + k * .12, BY + .47, XF.z, 8));
// cooling-water line condenser → towers
const cwLine = tube([[TX0 + .2, BY + .1, TZ - .45], [.2, BY + .1, -.9], [.15, BY + .1, -1.8]], .045, M.cold);
scene.add(cwLine);

// ---------- cooling towers + steam plumes ----------
const TOWERS = [[-.75, -2.35], [1.25, -2.55]], TWH = 2.7;
const towerMats = [];
for (const [x, z] of TOWERS) {
  const prof = [[1.0, 0], [.92, .35], [.76, 1.1], [.66, 1.8], [.64, 2.1], [.67, 2.45], [.7, TWH]].map(p => new THREE.Vector2(p[0], p[1]));
  const g = new THREE.LatheGeometry(prof, 64); const m = sh(new THREE.Mesh(g, M.concrete)); m.position.set(x, BY, z); scene.add(m);
  const legs = []; for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12; legs.push(boxG(.04, .18, .04, x + Math.cos(a) * .98, BY + .02, z + Math.sin(a) * .98)); } scene.add(merged(legs, M.concrete));
}
const puffTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.5, 'rgba(240,242,246,.5)'); gr.addColorStop(1, 'rgba(240,242,246,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const PUFFN = 26;
const puffs = [];
TOWERS.forEach(([x, z], ti) => { for (let i = 0; i < PUFFN; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0, color: '#f4f5f7' })); scene.add(s); puffs.push({ s, x, z, ph: (i / PUFFN) + rnd() * .03, sx: rnd() - .5, sz: rnd() - .5, ti }); } });

// ---------- dry casks (spent fuel stored on site) ----------
const casks = [];
for (let i = 0; i < 6; i++) { const m = cylY(.15, .15, .48, M.cask, -3.45 + (i % 3) * .4, BY + .26, -1.0 - Math.floor(i / 3) * .42, 24); scene.add(m); casks.push(m); }
scene.add(box(1.35, .04, .9, M.pad, -3.05, BY + .02, -1.2));

// ---------- grid line: pylons + catenary wires to the data center ----------
const pylon = (x, z, h = 1.5) => { const g = new THREE.Group(); const geos = [];
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const b = new THREE.BoxGeometry(.025, h, .025); const p = b.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / h + .5; p.setX(i, p.getX(i) + dx * lerp(.12, .03, y)); p.setZ(i, p.getZ(i) + dz * lerp(.12, .03, y)); } b.translate(0, h / 2, 0); geos.push(b); }
  geos.push(boxG(.025, .025, .6, 0, h - .1, 0), boxG(.025, .025, .45, 0, h - .35, 0));
  const m = merged(geos, M.steel); m.position.set(x, BY, z); g.add(m); scene.add(g); return { x, z, h }; };
const PY = [pylon(3.55, 1.1), pylon(4.75, 1.1)];
const DC = { x: 6.1, z: .55, w: 2.4, d: 1.6, h: .7 };
const wireEnds = [];
for (const dz of [-.27, .27]) {
  const pts = [[XF.x + .05, BY + .6, XF.z + dz * .3], [PY[0].x, BY + PY[0].h - .12, PY[0].z + dz], [PY[1].x, BY + PY[1].h - .12, PY[1].z + dz], [DC.x - DC.w / 2 - .02, BY + .55, DC.z + .4 + dz * .4]];
  const all = []; for (let s = 0; s < 3; s++) { const a = new THREE.Vector3(...pts[s]), b = new THREE.Vector3(...pts[s + 1]); const sag = .12 * a.distanceTo(b); for (let i = 0; i <= 16; i++) { const u = i / 16; if (s && !i) continue; all.push(new THREE.Vector3().lerpVectors(a, b, u).add(new THREE.Vector3(0, -sag * 4 * u * (1 - u), 0))); } }
  const c = new THREE.CatmullRomCurve3(all); scene.add(sh(new THREE.Mesh(new THREE.TubeGeometry(c, 160, .009, 6), M.wire))); wireEnds.push(c);
}

// ---------- data center: shell (roof lifts) + rack rows with blinking LEDs ----------
const dcRoof = new THREE.Group(); scene.add(dcRoof);
scene.add(box(DC.w, DC.h, .05, M.model, DC.x, BY + DC.h / 2, DC.z - DC.d / 2));
scene.add(box(.05, DC.h, DC.d, M.model, DC.x - DC.w / 2, BY + DC.h / 2, DC.z));
scene.add(box(.05, DC.h, DC.d, M.model, DC.x + DC.w / 2, BY + DC.h / 2, DC.z));
scene.add(box(DC.w, DC.h * .35, .05, M.model, DC.x, BY + DC.h * .175, DC.z + DC.d / 2));
dcRoof.add(box(DC.w + .06, .06, DC.d + .06, M.model, DC.x, BY + DC.h + .03, DC.z));
{ const geos = []; for (let k = 0; k < 6; k++) geos.push(boxG(.22, .1, .16, DC.x - DC.w / 2 + .3 + k * .36, BY + DC.h + .11, DC.z - .3)); dcRoof.add(merged(geos, M.steel)); }
const ledTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 64, 128); const r = mulberry(3); for (let y = 6; y < 124; y += 7) for (let x = 6; x < 60; x += 9) { if (r() < .55) { g.fillStyle = r() < .8 ? '#59d4ff' : '#7dff9a'; g.fillRect(x, y, 4, 2); } } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
M.led.emissiveMap = ledTex; M.led.map = ledTex;
{ const rg = [], lg = []; for (let row = 0; row < 3; row++) for (let k = 0; k < 9; k++) { const x = DC.x - DC.w / 2 + .22 + k * .245, z = DC.z - .5 + row * .45, h = .5; rg.push(boxG(.2, h, .16, x, BY + h / 2, z)); lg.push(new THREE.PlaneGeometry(.18, h - .06).translate(x, BY + h / 2, z + .081)); }
  scene.add(merged(rg, M.rack)); scene.add(new THREE.Mesh(mergeGeometries(lg), M.led)); }
// chillers beside the data center
for (let k = 0; k < 3; k++) scene.add(box(.3, .22, .3, M.steel, DC.x + DC.w / 2 + .3, BY + .11, DC.z - .5 + k * .45));

// ---------- small modular reactors (plans): rise from the far pad ----------
const smrs = [0, 1, 2].map(k => { const g = new THREE.Group(); g.position.set(5.2 + k * .9, BY, -1.9); scene.add(g);
  g.add(cylY(.26, .26, .45, M.smr, 0, .225, 0, 32)); const d = sh(new THREE.Mesh(new THREE.SphereGeometry(.26, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.smrDome)); d.position.y = .45; g.add(d);
  g.add(box(.3, .2, .25, M.smr, .3, .1, .1)); return g; });

// ---------- flow particles ----------
const dots = (n, r, mat) => [...Array(n)].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat); scene.add(m); return m; });
const pHot = new THREE.MeshBasicMaterial({ color: '#ff6a3a' }), pCold = new THREE.MeshBasicMaterial({ color: '#6fb2ff' }), pSteam = new THREE.MeshBasicMaterial({ color: '#ffffff' }), pPow = new THREE.MeshBasicMaterial({ color: '#8fe6ff' });
const flows = [
  { c: hotLeg.userData.curve, d: dots(10, .028, pHot), sp: .35 }, { c: coldLeg.userData.curve, d: dots(12, .026, pCold), sp: .3 },
  { c: steamLine.userData.curve, d: dots(16, .03, pSteam), sp: .25, sec: 1 }, { c: feedLine.userData.curve, d: dots(12, .024, pCold), sp: .22, sec: 1 },
  { c: cwLine.userData.curve, d: dots(8, .024, pCold), sp: .3, cw: 1 },
  { c: wireEnds[0], d: dots(14, .03, pPow), sp: .22, pw: 1 }, { c: wireEnds[1], d: dots(14, .03, pPow), sp: .22, pw: 1 },
];

// ---------- motion ----------
const explK = t => eio(seg(t, T.apart - .1, T.apart + 1.3)) * (1 - eio(seg(t, T.re, T.re + 1.4)));
const aliveK = t => ss(seg(t, T.alive - .2, T.alive + 1.4));
// camera: [t, az°, el°, dist, tx, ty, tz]
const CAMK = [
  [0.0, 8, 9, 17, -.6, 1.7, -1.0],
  [T.reveal - .2, 14, 11, 16.0, -.5, 1.7, -.9],
  [T.worst + .3, 24, 18, 25, .6, 1.4, -.4],
  [T.alive + 1.0, 30, 21, 28, 1.5, 1.2, -.3],
  [T.deal + .6, 28, 18, 14, -1.6, 1.6, .2],
  [T.unit1 + .5, 24, 16, 11, -2.1, 1.6, .4],
  [T.apart + 1.4, 28, 20, 15, -1.4, 3.0, .1],
  [T.fuel + .7, 18, 14, 6.6, -2.85, 1.25, .6],
  [T.heat + .5, 26, 14, 6.0, -2.8, 1.2, .6],
  [T.crod + .5, 30, 16, 5.6, -2.6, 1.25, .6],
  [T.slide + .8, 36, 14, 5.6, -2.6, 1.2, .6],
  [T.vessel + .6, 46, 10, 6.4, -2.5, 1.05, .6],
  [T.loop + .6, 22, 20, 8.2, -2.15, 1.25, .45],
  [T.loop2 + .6, 18, 20, 9.0, -1.7, 1.35, .4],
  [T.turb + .8, 18, 16, 8.4, 1.0, 1.0, .5],
  [T.gen + .9, 24, 14, 8.0, 1.5, .95, .5],
  [T.tower + .6, 16, 9, 14.5, .3, 2.0, -2.2],
  [T.chain + .4, 24, 16, 17, 2.5, 1.4, .0],
  [T.gpus + .4, 30, 18, 14, 4.6, 1.0, .5],
  [T.mw + .8, 30, 22, 30, 1.6, 1.3, -.3],
  [T.now + .6, 34, 20, 13, 5.2, 1.0, .1],
  [T.chart + 1.0, 40, 22, 10.5, 6.0, .8, .4],
  [T.y28 + 1.0, 48, 22, 10.0, 6.1, .8, .3],
  [T.smr + .8, 28, 24, 12.5, 6.0, .9, -.9],
  [T.amzn + .8, 22, 26, 13.5, 5.9, 1.0, -1.0],
  [T.catch + .6, 26, 24, 22, 2.4, 1.3, -.4],
  [T.waste + .3, -70, 30, 8.5, -3.1, .7, -1.2],
  [T.close + 1.2, 22, 12, 28, 1.6, 1.6, -.6],
  [T.end, 30, 14, 30, 1.6, 1.6, -.6],
  [DUR, 34, 15, 31, 1.6, 1.6, -.6],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz] = camTrack(t); const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 220; post.dof.maxCoc = 9;
  const la = A - .9; key.position.set(tx + 14 * Math.sin(la), ty + 16, tz + 14 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 12 * Math.sin(A + Math.PI * .85), ty + 4, tz + 12 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 12, tz); top.lookAt(tx, ty, tz);
}

// ---------- events (foley) ----------
const EV = [{ t: T.hook + .1, type: 'drone' }, { t: T.alive, type: 'power' }, { t: T.deal + .1, type: 'card' }, { t: T.apart, type: 'lift' }, { t: T.apart + 1.2, type: 'spread' },
  { t: T.fuel + .3, type: 'label' }, { t: T.split, type: 'pins' }, { t: T.crod + .3, type: 'label' }, { t: T.slide + .1, type: 'clunk' }, { t: T.vessel + .3, type: 'label' },
  { t: T.sg + .1, type: 'label' }, { t: T.loop2, type: 'hiss' }, { t: T.turb + .1, type: 'spin' }, { t: T.gen + .2, type: 'label' }, { t: T.tower + .2, type: 'label' },
  { t: T.chain + .1, type: 'step' }, { t: T.chain + .6, type: 'step' }, { t: T.chain + 1.1, type: 'step' }, { t: T.chain + 1.6, type: 'step' }, { t: T.gpus + .1, type: 'buzz' },
  { t: T.re + .9, type: 'land' }, { t: T.mw, type: 'card' }, { t: T.chart + .2, type: 'card' }, { t: T.y28, type: 'coin' }, { t: T.smr + .2, type: 'rise' }, { t: T.goog, type: 'label' }, { t: T.amzn, type: 'label' },
  { t: T.catch, type: 'card' }, { t: T.cost, type: 'coin' }, { t: T.waste, type: 'label' }, { t: T.close + .2, type: 'drone' }, { t: T.end, type: 'card' }];
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
const crodY = t => { // control-rod height: out, slide in during "Slide them in", back out after
  const ins = eio(seg(t, T.slide - .1, T.slide + .9)) * (1 - eio(seg(t, T.vessel + .2, T.vessel + 1.2)));
  return lerp(CROD_OUT, CROD_IN, ins);
};
window.render = t => {
  const ek = explK(t), al = aliveK(t);
  // mood: dead plant in the hook, warm and lit once it is "brought back to life"
  renderer.toneMappingExposure = lerp(.72, .95, al);
  key.color.set('#9fb4d8').lerp(new THREE.Color('#fff1e2'), al); key.intensity = lerp(1.0, 1.6, al);
  post.vig.uniforms.amt.value = lerp(.5, .36, al); post.vig.uniforms.warm.value = lerp(-.05, .1, al);
  // exploded: containment and hall shells lift and ghost; the vessel head lifts; one fuel rod is pulled out
  contain.position.y = 3.4 * ek; contain.position.z = -.6 * ek; M.shell.opacity = 1 - ek; contain.visible = ek < .99; M.shell.depthWrite = ek < .5;
  hallShell.position.y = 2.6 * ek; M.hall.opacity = 1 - ek; hallShell.visible = ek < .99; M.hall.depthWrite = ek < .5; M.glass.opacity = 1 - .97 * ek;
  lid.position.y = .9 * ek;
  dcRoof.position.y = .9 * ss(seg(t, T.chain + .5, T.gpus + .4)) * (1 - ss(seg(t, T.y28 + 1.5, T.smr + .5)));
  const pk = ss(seg(t, T.fuel + .2, T.fuel + 1.2)) * (1 - ss(seg(t, T.crod - .2, T.crod + .6)));
  pelletG.visible = pk > .01;
  pelletG.position.set(VX - .62 * pk, VY0 + VH + .1 + .25 * pk, VZ + .2);
  pellets.forEach((m, i) => { m.position.set(0, (i - 4) * lerp(.066, .095, ss(seg(t, T.fuel + .9, T.fuel + 1.6)) * pk), 0); });
  sheath.scale.y = .6; sheath.position.y = 0; sheath.visible = pk > .5;
  M.pellet.emissiveIntensity = (t > T.split && t < T.crod) ? .5 + .3 * Math.sin(t * 8) : 0;
  // core heat: glows once alive; brightest on "makes heat", dims while the control rods are in
  const cy = crodY(t); crods.position.y = cy;
  const ins = (CROD_OUT - cy) / (CROD_OUT - CROD_IN);
  const heat = al * (.6 + .9 * ss(seg(t, T.split, T.heat + .5)) * (1 - ss(seg(t, T.re, T.re + 1))) ) * (1 - .8 * ins);
  M.fuel.emissiveIntensity = heat * 1.1; core.position.copy(VC); core.intensity = heat * 2.5 * (ek > .2 ? 1 : .3);
  M.rod.emissiveIntensity = (t > T.crod && t < T.vessel) ? .35 + .25 * Math.sin(t * 6) : 0;
  M.vessel.emissiveIntensity = (t > T.vessel + .1 && t < T.loop) ? .18 + .1 * Math.sin(t * 6) : 0;
  const loopHi = (t > T.loop && t < T.turb) ? 1 : 0;
  M.hot.emissiveIntensity = .15 * al + .35 * loopHi; M.cold.emissiveIntensity = .08 * al + .2 * loopHi;
  M.sg.emissiveIntensity = (t > T.sg && t < T.turb) ? .15 + .08 * Math.sin(t * 6) : 0;
  M.steam.emissiveIntensity = (t > T.loop2 && t < T.tower) ? .25 : 0;
  M.turb.emissiveIntensity = (t > T.turb && t < T.gen) ? .15 : 0;
  M.gen.emissiveIntensity = (t > T.gen && t < T.tower) ? .35 + .2 * Math.sin(t * 9) : 0;
  // turbine + generator spin (integrated so speed changes stay smooth)
  { let a = 0; for (let x = 0; x < t; x += 1 / 48) a += (al > 0 ? 9 * aliveK(x) : 0) / 48; rotor.rotation.x = a; genFan.rotation.x = a; }
  // flows
  const flowOn = al > .5;
  flows.forEach(f => { const on = flowOn && (!f.pw || true); f.d.forEach((m, i) => { const u = ((i / f.d.length) + t * f.sp) % 1; m.position.copy(f.c.getPointAt(u)); m.visible = on; m.scale.setScalar(f.pw ? (t > T.chain && t < T.mw ? 1.6 : 1) : 1); }); });
  M.wire.emissiveIntensity = al * ((t > T.chain && t < T.mw) ? .9 : .25);
  // data center: windows + LEDs come up with the plant; LEDs flare on "GPUs"
  M.glass.emissiveIntensity = al * 1.2;
  M.led.emissiveIntensity = al * (1.2 + ((t > T.gpus - .2 && t < T.mw + 1) ? 1.6 + .6 * Math.sin(t * 14) : 0));
  M.led.emissiveMap.offset.y = Math.floor(t * 6) * .07 % 1;
  // cooling tower plumes
  const plume = al * (1 + ((t > T.tower && t < T.chain) ? .4 : 0));
  puffs.forEach(p => { const u = (p.ph + t * .07) % 1; const y = BY + TWH + u * 3.0, dr = u * u * 1.4; p.s.position.set(p.x + dr + p.sx * .4 * u, y, p.z + p.sz * .4 * u + dr * .2); const sc = .7 + u * 1.8; p.s.scale.set(sc, sc, 1);
    p.s.material.opacity = Math.min(1, plume) * .55 * Math.sin(Math.PI * Math.min(1, u * 1.15)) ; p.s.visible = plume > .01; });
  // casks highlight
  M.cask.emissiveIntensity = (t > T.waste - .1 && t < T.close) ? .2 + .1 * Math.sin(t * 6) : 0;
  // small modular reactors rise (plans): translucent
  smrs.forEach((g, k) => { const r = eo(seg(t, T.smr + .3 + k * .25, T.smr + 1.1 + k * .25)) * (1 - ss(seg(t, T.catch + .2, T.catch + 1))); g.visible = r > .01; g.scale.setScalar(Math.max(.01, r)); });
  M.smr.opacity = M.smrDome.opacity = .85;
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, ek, al, VX, VY0, VH, VZ, VR, SGX, SGY0, SGH, SGZ, TX0, TX1, TY, TZ, GX0, GX1, TOWERS, TWH, BY, DC, CX, CZ, CR, CH, PY, pelletPos: pelletG.position, crodTop: cy });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
