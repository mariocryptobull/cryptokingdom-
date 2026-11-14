// The Military-Industrial Complex — Exploded Teardown, 1080×1920. A dark display plinth; a generic schematic fighter jet
// hovers over it, and each chapter builds its own small model on the plinth (iron triangle, WWII bomber line, Cold War
// spin-offs, spending bars, supplier web, emissions, drone swarm). Schematic only: no real aircraft, logos or insignia.
// Units: model units. Jet nose points +x, Y up, Z toward the camera at az 0.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, eio, eo, ei, track, mulberry } from '/core/lib.js';
import { initOverlay, drawOverlay, overlayTexts } from './overlay.js';

const W = 1080, H = 1920;
const Q = new URLSearchParams(location.search);
const SSAA = +(Q.get('ssaa') || 1);
const TL = await (await fetch('timeline.json')).json();
const VDUR = await (await fetch('voice/dur.json')).json();
const DUR = TL.dur;
const CUES = []; for (let li = 0; li < TL.vo.length; li++) { const v = TL.vo[li], d = VDUR[v.id]; const n = v.chunks.map(c => c.replace(/[^A-Za-z0-9]/g, '').length + 2), tot = n.reduce((a, b) => a + b, 0); let t = v.t; v.chunks.forEach((c, i) => { CUES.push({ id: v.id, i, t, d: d * n[i] / tot }); t += d * n[i] / tot; }); }
const cue = (id, i) => CUES.find(c => c.id === id && c.i === i).t;
const mid = (id, i, f) => { const c = CUES.find(c => c.id === id && c.i === i); return c.t + c.d * f; };
const T = {
  hook: cue('v01', 0), mic: cue('v02', 1), you: cue('v02', 2), y1961: cue('v02', 3), general: cue('v02', 4),
  ike: cue('v03', 0), star: cue('v03', 1), farewell: cue('v03', 2), quote: cue('v03', 3),
  ww2: cue('v04', 0), war2: cue('v04', 1), plants: cue('v04', 2), willow: cue('v04', 3), b24: cue('v04', 4),
  cold: cue('v05', 0), spin: cue('v05', 1), jetEng: cue('v05', 2), sat: mid('v05', 2, .55), gps: cue('v05', 3), arpa: cue('v05', 4),
  today: cue('v06', 0), spend: cue('v06', 1), trillion: cue('v06', 2), record: cue('v06', 3),
  contracts: cue('v07', 0), top100: cue('v07', 1), b679: cue('v07', 2), lockheed: cue('v07', 3),
  explode: cue('v08', 0), engine: cue('v08', 1), radar: mid('v08', 1, .5), wings: cue('v08', 2), chips: mid('v08', 2, .5), f35: cue('v08', 3), sup: cue('v08', 4),
  climate: cue('v09', 0), pct: cue('v09', 1), estimate: cue('v09', 3), voluntary: cue('v09', 4),
  race: cue('v10', 0), drones: cue('v10', 1), ukr: cue('v10', 2), m4: cue('v10', 3),
  closer: cue('v11', 0), gpsnet: cue('v11', 1), stands: cue('v11', 2), steer: cue('v11', 3), next: cue('v12', 0),
};
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
post.vig.uniforms.amt.value = .36; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .06;
{
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createRadialGradient(560, 900, 80, 540, 960, 1500); gr.addColorStop(0, '#33363b'); gr.addColorStop(.45, '#212327'); gr.addColorStop(1, '#0c0d0f');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = .55; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff1e2', 1.7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 60 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 5, 12, 4); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .6, 10, 10); scene.add(top);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .25));

// ---------- materials ----------
const M = {
  base: new THREE.MeshPhysicalMaterial({ color: '#2a2d32', roughness: .5, metalness: .3, clearcoat: .2 }),
  top: new THREE.MeshPhysicalMaterial({ color: '#3a3e44', roughness: .7 }),
  model: new THREE.MeshPhysicalMaterial({ color: '#eceae4', roughness: .6 }),
  hull: new THREE.MeshPhysicalMaterial({ color: '#c9ced3', roughness: .38, metalness: .45, clearcoat: .5 }),
  dark: new THREE.MeshStandardMaterial({ color: '#2f3338', roughness: .45, metalness: .7 }),
  steel: new THREE.MeshStandardMaterial({ color: '#59616a', roughness: .4, metalness: .8 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#d4d8dc', roughness: .15, metalness: 1 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#1b2430', roughness: .05, metalness: .2, clearcoat: 1 }),
  radar: new THREE.MeshPhysicalMaterial({ color: '#2f6fe0', roughness: .35, clearcoat: .5, emissive: '#2f6fe0', emissiveIntensity: .15 }),
  pcb: new THREE.MeshPhysicalMaterial({ color: '#1f7a4a', roughness: .5 }),
  chip: new THREE.MeshStandardMaterial({ color: '#141518', roughness: .3, metalness: .6 }),
  acc: new THREE.MeshPhysicalMaterial({ color: '#ff6b3d', roughness: .4, clearcoat: .5, emissive: '#ff6b3d', emissiveIntensity: .25 }),
  gold: new THREE.MeshStandardMaterial({ color: '#e3b341', roughness: .25, metalness: 1 }),
  bar: new THREE.MeshPhysicalMaterial({ color: '#e3a62c', roughness: .35, metalness: .4, clearcoat: .6 }),
  bar2: new THREE.MeshPhysicalMaterial({ color: '#c9cdd2', roughness: .5, metalness: .4 }),
  panel: new THREE.MeshStandardMaterial({ color: '#23407a', roughness: .3, metalness: .6, emissive: '#1a3a80', emissiveIntensity: .2 }),
  smoke: new THREE.MeshStandardMaterial({ color: '#7a7a78', roughness: 1, transparent: true, opacity: .6, depthWrite: false }),
  rotor: new THREE.MeshStandardMaterial({ color: '#111', roughness: .6, transparent: true, opacity: .45, side: THREE.DoubleSide, depthWrite: false }),
  eye: new THREE.MeshStandardMaterial({ color: '#ff3b2f', emissive: '#ff3b2f', emissiveIntensity: 2.5 }),
  signal: new THREE.MeshBasicMaterial({ color: '#59d4ff', transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false }),
};
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const boxG = (sx, sy, sz, x, y, z) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);
const merged = (geos, mat) => sh(new THREE.Mesh(mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g)), mat));
const cylX = (r1, r2, len, mat, seg = 32) => { const g = new THREE.CylinderGeometry(r1, r2, len, seg); g.rotateZ(Math.PI / 2); return sh(new THREE.Mesh(g, mat)); };
const lathe = (pts, mat, seg = 40) => { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); g.rotateZ(-Math.PI / 2); return sh(new THREE.Mesh(g, mat)); };
const pop = x => 1 - Math.pow(1 - ss(x), 3);
const show = (t, a, b, d = .45) => pop(seg(t, a, a + d)) * (1 - ss(seg(t, b - d, b)));
const setK = (o, k) => { o.visible = k > .002; o.scale.setScalar(Math.max(k, .002)); };
const TOP = .25;   // plinth top

// ---------- plinth ----------
scene.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.75, .22, 72).translate(0, .11, 0), M.base)));
scene.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, .03, 72).translate(0, .235, 0), M.top)));
{ const r = new THREE.Mesh(new THREE.TorusGeometry(2.55, .012, 6, 96), M.acc); r.rotation.x = Math.PI / 2; r.position.y = .22; scene.add(r); }

// ---------- the jet (generic schematic fighter; parts explode along their own axes) ----------
const jetRoot = new THREE.Group(); scene.add(jetRoot);
const post_ = box(.06, 1, .06, M.steel); scene.add(post_);
const jet = new THREE.Group(); jetRoot.add(jet);
const P = {};
const part = (name, dir) => { const g = new THREE.Group(); jet.add(g); P[name] = { g, dir: new THREE.Vector3(...dir) }; return g; };
const fus = part('fus', [0, 0, 0]);
{ const body = lathe([[0, -1.62], [.2, -1.6], [.26, -1.2], [.3, -.3], [.28, .5], [.22, 1.0], [0, 1.0]], M.hull); body.scale.set(1, .9, 1.15); fus.add(body);
  for (const s of [-1, 1]) { const intake = box(.55, .2, .14, M.hull, -.1, -.04, s * .33); fus.add(intake); fus.add(box(.02, .16, .1, M.dark, .18, -.04, s * .33)); }
  fus.add(box(1.1, .06, .2, M.hull, -.3, .26, 0)); }   // dorsal spine
const nose = part('nose', [1.5, 0, 0]);
{ const n = lathe([[0, 1.0], [.22, 1.0], [.17, 1.3], [.08, 1.6], [0, 1.78]], M.hull); n.scale.set(1, .9, 1.15); nose.add(n); }
const radar = part('radar', [.75, 0, 0]);
{ const d = cylX(.19, .19, .04, M.radar); d.position.x = 1.03; radar.add(d); const h = cylX(.05, .05, .12, M.steel); h.position.x = .96; radar.add(h); }
const canopy = part('canopy', [0, .85, 0]);
{ const c = sh(new THREE.Mesh(new THREE.SphereGeometry(.2, 32, 16), M.glass)); c.scale.set(2.1, .95, .95); c.position.set(.62, .2, 0); canopy.add(c); }
const wingShape = s => { const sh2 = new THREE.Shape(); sh2.moveTo(.35, s * .28); sh2.lineTo(-.95, s * 1.4); sh2.lineTo(-1.18, s * 1.4); sh2.lineTo(-1.22, s * .28); sh2.closePath(); return sh2; };
const stabShape = s => { const sh2 = new THREE.Shape(); sh2.moveTo(-1.2, s * .24); sh2.lineTo(-1.55, s * .78); sh2.lineTo(-1.68, s * .78); sh2.lineTo(-1.68, s * .24); sh2.closePath(); return sh2; };
for (const [name, s] of [['wingR', 1], ['wingL', -1]]) {
  const g = part(name, [0, 0, s * 1.15]);
  for (const shp of [wingShape(s), stabShape(s)]) { const geo = new THREE.ExtrudeGeometry(shp, { depth: .045, bevelEnabled: false }); geo.rotateX(Math.PI / 2); const m = sh(new THREE.Mesh(geo, M.hull)); m.position.y = -.02; g.add(m); }
  const tip = box(.3, .03, .03, M.acc, -1.06, -.04, s * 1.4); g.add(tip);
}
const tails = part('tails', [0, .95, 0]);
for (const s of [-1, 1]) { const shp = new THREE.Shape(); shp.moveTo(-.95, 0); shp.lineTo(-1.42, .78); shp.lineTo(-1.62, .78); shp.lineTo(-1.58, 0); shp.closePath(); const geo = new THREE.ExtrudeGeometry(shp, { depth: .04, bevelEnabled: false }); const m = sh(new THREE.Mesh(geo, M.hull)); m.position.set(0, .18, s * .2 - .02); m.rotation.x = -s * .32; tails.add(m); }
const engine = part('engine', [-1.55, -.1, 0]);
{ const c = cylX(.2, .2, 1.25, M.steel); c.position.x = -.95; engine.add(c);
  const fan = cylX(.21, .21, .05, M.chrome); fan.position.x = -.3; engine.add(fan);
  for (let k = 0; k < 6; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(.2, .012, 6, 32), M.dark); r.rotation.y = Math.PI / 2; r.position.x = -.45 - k * .16; engine.add(r); }
  const nz = cylX(.15, .2, .32, M.dark); nz.position.x = -1.75; engine.add(nz); }
const chips = part('chips', [0, -1.0, 0]);
for (let k = 0; k < 3; k++) { const b = box(.34, .018, .26, M.pcb, .35, -.06 + k * .07, 0); chips.add(b); for (let j = 0; j < 3; j++) chips.add(box(.06, .012, .06, M.chip, .25 + j * .1, -.045 + k * .07, (j % 2 ? .06 : -.06))); }
const JY = 1.75;   // hover height

// ---------- iron triangle: government · industry · military ----------
const tri = new THREE.Group(); scene.add(tri);
const B = { gov: new THREE.Vector3(0, TOP, -1.75), ind: new THREE.Vector3(1.6, TOP, .95), mil: new THREE.Vector3(-1.6, TOP, .95) };
const triParts = {};
{ const g = new THREE.Group(); g.position.copy(B.gov); tri.add(g); triParts.gov = g;
  g.add(box(.9, .08, .6, M.model, 0, .04, 0)); g.add(box(.78, .06, .5, M.model, 0, .4, 0));
  for (let k = 0; k < 6; k++) g.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .3, 10).translate(-.3 + k * .12, .23, .22), M.model)));
  g.add(box(.6, .28, .3, M.model, 0, .22, -.05));
  const dome = sh(new THREE.Mesh(new THREE.SphereGeometry(.2, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.model)); dome.position.y = .48; g.add(dome);
  g.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .06, 32).translate(0, .46, 0), M.model))); }
{ const g = new THREE.Group(); g.position.copy(B.ind); g.rotation.y = -.6; tri.add(g); triParts.ind = g;
  g.add(box(.85, .3, .55, M.model, 0, .15, 0));
  for (let k = 0; k < 4; k++) { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(.21, 0); s.lineTo(.21, .14); s.closePath(); const geo = new THREE.ExtrudeGeometry(s, { depth: .55, bevelEnabled: false }); const m = sh(new THREE.Mesh(geo, M.model)); m.position.set(-.425 + k * .21, .3, -.275); g.add(m); }
  g.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(.045, .055, .55, 12).translate(.32, .55, -.15), M.model))); }
{ const g = new THREE.Group(); g.position.copy(B.mil); g.rotation.y = .6; tri.add(g); triParts.mil = g;
  const hg = new THREE.CylinderGeometry(.3, .3, .8, 32, 1, false, 0, Math.PI); hg.rotateZ(Math.PI / 2); const h = sh(new THREE.Mesh(hg, M.model)); g.add(h);
  g.add(box(.1, .45, .1, M.model, .38, .22, .2)); g.add(box(.2, .08, .2, M.glass, .38, .48, .2)); }
// money loop between the three
const loop = new THREE.CatmullRomCurve3([B.gov.clone().add(new THREE.Vector3(0, .9, 0)), new THREE.Vector3(1.1, 1.0, -.5), B.ind.clone().add(new THREE.Vector3(0, .75, 0)), new THREE.Vector3(0, .7, 1.4), B.mil.clone().add(new THREE.Vector3(0, .75, 0)), new THREE.Vector3(-1.1, 1.0, -.5)], true);
const coins = [...Array(22)].map(() => { const c = sh(new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .02, 20), M.gold)); scene.add(c); return c; });

// ---------- WWII: car plant turned bomber plant ----------
const ww = new THREE.Group(); scene.add(ww);
{ ww.add(box(2.3, .38, 1.0, M.model, -.75, TOP + .19, 0));
  for (let k = 0; k < 9; k++) { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(.255, 0); s.lineTo(.255, .16); s.closePath(); const geo = new THREE.ExtrudeGeometry(s, { depth: 1.0, bevelEnabled: false }); const m = sh(new THREE.Mesh(geo, M.model)); m.position.set(-1.9 + k * .255, TOP + .38, -.5); ww.add(m); }
  ww.add(box(.02, .26, .6, M.dark, .41, TOP + .14, 0));
  ww.add(box(2.0, .01, .5, M.dark, 1.4, TOP + .005, 0)); }
const bomberGeo = (() => { const geos = [];
  const f = new THREE.CylinderGeometry(.06, .045, .9, 12); f.rotateZ(Math.PI / 2); geos.push(f);
  geos.push(new THREE.SphereGeometry(.06, 12, 8).translate(.45, 0, 0));
  geos.push(boxG(.14, .015, 1.15, .05, .03, 0));
  for (const z of [-.42, -.2, .2, .42]) { const e = new THREE.CylinderGeometry(.03, .03, .14, 10); e.rotateZ(Math.PI / 2); geos.push(e.translate(.1, .02, z)); }
  geos.push(boxG(.09, .012, .34, -.4, .03, 0));
  for (const z of [-.16, .16]) geos.push(boxG(.08, .14, .012, -.42, .09, z));
  return mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g)); })();
const bombers = [...Array(4)].map(() => { const m = sh(new THREE.Mesh(bomberGeo, M.hull)); m.scale.setScalar(.9); ww.add(m); return m; });

// ---------- Cold War spin-offs ----------
const sats = [];
const makeSat = (big = 1) => { const g = new THREE.Group();
  g.add(box(.22, .22, .22, M.gold)); for (const s of [-1, 1]) { g.add(box(.02, .02, .14, M.steel, 0, 0, s * .18)); g.add(box(.2, .012, .38, M.panel, 0, 0, s * .44)); }
  const dish = sh(new THREE.Mesh(new THREE.ConeGeometry(.09, .06, 20, 1, true), M.chrome)); dish.position.y = -.15; dish.rotation.x = Math.PI; g.add(dish);
  g.scale.setScalar(big); return g; };
const SP = [new THREE.Vector3(-.95, TOP, .9), new THREE.Vector3(.95, TOP, .9), new THREE.Vector3(-.95, TOP, -.9), new THREE.Vector3(.95, TOP, -.9)];
const spin = SP.map(p => { const g = new THREE.Group(); g.position.copy(p); scene.add(g); g.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(.42, .46, .12, 40).translate(0, .06, 0), M.dark))); return g; });
{ const e = new THREE.Group(); e.position.y = .55; spin[0].add(e);   // jet engine
  const c = cylX(.22, .18, .8, M.steel); e.add(c); const fan = cylX(.235, .235, .06, M.chrome); fan.position.x = .38; e.add(fan);
  const nz = cylX(.13, .17, .2, M.dark); nz.position.x = -.48; e.add(nz);
  for (let k = 0; k < 4; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(.215, .012, 6, 32), M.acc); r.rotation.y = Math.PI / 2; r.position.x = .2 - k * .18; e.add(r); }
  e.rotation.y = .5; spin[0].userData.spinner = fan; }
{ const s = makeSat(1.1); s.position.y = .75; spin[1].add(s); spin[1].userData.sat = s;   // satellite on a launch stand
  spin[1].add(sh(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .5, 8).translate(0, .37, 0), M.steel))); }
{ const s = makeSat(1.0); s.position.y = .95; spin[2].add(s); spin[2].userData.sat = s;   // GPS: satellite + signal cones to the ground
  const rings = [...Array(3)].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(.2, .01, 6, 40), M.signal); r.rotation.x = Math.PI / 2; spin[2].add(r); return r; }); spin[2].userData.rings = rings;
  spin[2].add(box(.07, .02, .07, M.acc, 0, .13, 0)); }
{ const nodes = [[-.25, .45, -.1], [.25, .55, .15], [0, .8, -.05], [.1, .35, .25], [-.15, .75, .22]].map(p => new THREE.Vector3(...p));   // ARPANET: nodes and links
  for (const p of nodes) { const n = sh(new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 10), M.acc)); n.position.copy(p); spin[3].add(n); }
  for (const [a, b] of [[0, 1], [1, 2], [2, 0], [0, 3], [3, 1], [2, 4], [4, 0]]) { const A = nodes[a], Bv = nodes[b], L = A.distanceTo(Bv); const c = sh(new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, L, 6), M.chrome)); c.position.copy(A).add(Bv).multiplyScalar(.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize()); spin[3].add(c); } }

// arms-race missile on the centre pad: stands at 'Cold War', launches on 'spin-offs'
const missile = new THREE.Group(); scene.add(missile);
{ missile.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, 1.3, 24).translate(0, .65, 0), M.hull)));
  missile.add(sh(new THREE.Mesh(new THREE.ConeGeometry(.11, .32, 24).translate(0, 1.46, 0), M.acc)));
  for (let k = 0; k < 4; k++) { const f = box(.02, .26, .2, M.dark, 0, .13, 0); const g2 = new THREE.Group(); g2.rotation.y = k * Math.PI / 2; f.position.z = .17; g2.add(f); missile.add(g2); }
  missile.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(.06, .1, .14, 16).translate(0, -.04, 0), M.dark))); }
const pad = sh(new THREE.Mesh(new THREE.CylinderGeometry(.3, .34, .08, 32).translate(0, TOP + .04, 0), M.dark)); scene.add(pad);
const flame = new THREE.Mesh(new THREE.ConeGeometry(.09, .5, 16).translate(0, -.3, 0).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: '#ffb35a' })); missile.add(flame); flame.position.y = -.1;

// ---------- spending bars ----------
const BX = [-1.15, 0, 1.15];
const bars = BX.map((x, i) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(.62, 1, .62).translate(0, .5, 0), i ? M.bar2 : M.bar)); m.position.set(x, TOP, 0); scene.add(m); return m; });
const BARV = { a: [954, 336, 190], b: [679, 64.7, 0] }, BS = 1 / 340;

// ---------- supplier web: small factories scattered over the plinth ----------
const rnd = mulberry(7);
const sups = [...Array(64)].map(() => { const a = rnd() * Math.PI * 2, r = 1.0 + Math.sqrt(rnd()) * 1.35; const g = new THREE.Group(); g.position.set(Math.cos(a) * r, TOP, Math.sin(a) * r); g.rotation.y = rnd() * 3;
  const w = .1 + rnd() * .08; g.add(box(w, .07, w * .7, M.model, 0, .035, 0)); g.add(box(.02, .1, .02, M.model, w * .3, .1, 0)); g.userData.d = rnd(); scene.add(g); return g; });

// ---------- smoke (emissions) ----------
const smokeGeo = new THREE.SphereGeometry(1, 12, 8);
const smoke = [...Array(70)].map((_, i) => { const m = new THREE.Mesh(smokeGeo, M.smoke); m.userData = { src: i % 5 === 0 ? -1 : (i * 7) % sups.length, ph: (i * .137) % 1, dx: (rnd() - .5) * .3, dz: (rnd() - .5) * .3 }; scene.add(m); return m; });

// ---------- drone swarm ----------
const droneBody = mergeGeometries([boxG(.1, .035, .1, 0, 0, 0), boxG(.36, .016, .022, 0, 0, 0).rotateY(Math.PI / 4), boxG(.36, .016, .022, 0, 0, 0).rotateY(-Math.PI / 4)].map(g => g.toNonIndexed()));
const rotorGeo = mergeGeometries([[.127, .127], [.127, -.127], [-.127, .127], [-.127, -.127]].map(([x, z]) => new THREE.CircleGeometry(.07, 16).rotateX(-Math.PI / 2).translate(x, .025, z)));
const drones = [...Array(34)].map((_, i) => { const g = new THREE.Group(); g.add(sh(new THREE.Mesh(droneBody, M.dark))); g.add(new THREE.Mesh(rotorGeo, M.rotor)); const e = new THREE.Mesh(new THREE.SphereGeometry(.018, 8, 6), M.eye); e.position.set(.05, 0, 0); g.add(e);
  g.userData = { r: 1.5 + (i % 4) * .32, y: 1.0 + ((i * 5) % 7) * .32, a: i * 2.399, w: (.5 + (i % 3) * .12) * (i % 2 ? 1 : -1) }; scene.add(g); return g; });

// ---------- GPS constellation for the closer ----------
const gpsSats = [0, 1, 2].map(() => { const s = makeSat(.9); scene.add(s); return s; });

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, 60, 6, 10, -.1, 1.75, 0],
  [T.mic - .2, 50, 12, 10.5, 0, 1.6, 0],
  [T.mic + 1.4, 30, 24, 16.5, 0, 1.15, 0],
  [T.ike, 20, 20, 15.5, 0, 1.25, 0],
  [T.ww2 - .2, 14, 16, 13.5, 0, 1.4, 0],
  [T.ww2 + .9, 18, 20, 15, -.25, .7, 0],
  [T.cold - .2, 26, 18, 14.5, .1, .7, 0],
  [T.cold + .8, 18, 26, 13.5, 0, .9, 0],
  [T.jetEng + .2, 12, 30, 15.5, -.25, .2, 0],
  [T.today - .2, 10, 28, 11.0, 0, .6, 0],
  [T.today + .8, 12, 12, 13.5, 0, 1.55, 0],
  [T.contracts + .6, 14, 12, 13, 0, 1.3, 0],
  [T.explode - .2, 30, 16, 12, 0, 1.6, 0],
  [T.engine + .3, 36, 20, 17.5, 0, 1.65, 0],
  [T.chips + .6, 30, 22, 17.5, 0, 1.6, 0],
  [T.f35 + .5, 24, 34, 15.5, 0, 1.2, 0],
  [T.climate + .3, 20, 30, 15.5, 0, 1.5, 0],
  [T.voluntary, 14, 20, 16, 0, 2.0, 0],
  [T.race + .5, 48, 14, 15, 0, 1.75, 0],
  [T.closer - .2, 60, 12, 14, 0, 1.6, 0],
  [T.steer, 24, 18, 17, 0, 1.6, 0],
  [DUR, 14, 24, 19, 0, 1.8, 0],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz] = camTrack(t); const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 240; post.dof.maxCoc = 10;
  const la = A - .9; key.position.set(tx + 12 * Math.sin(la), ty + 14, tz + 12 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 10 * Math.sin(A + Math.PI * .85), ty + 4, tz + 10 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 10, tz); top.lookAt(tx, ty, tz);
}

// ---------- section windows ----------
const K = {
  jet: t => Math.max(show(t, -1, T.ww2 - .1), show(t, T.explode - .45, 999)),
  tri: t => Math.max(show(t, T.mic - .1, T.ww2 - .1), show(t, T.closer + .1, 999)),
  ww: t => show(t, T.ww2, T.cold - .05),
  spin: (t, i) => show(t, [T.jetEng, T.sat, T.gps, T.arpa][i] - .1, T.today - .05),
  bars: t => show(t, T.today, T.explode - .1),
  sup: t => show(t, T.f35 - .1, T.race + .2, .5),
  smoke: t => show(t, T.climate, T.race + .3, .6),
  drones: t => show(t, T.race - .1, T.closer + .6, .6),
  gps: t => show(t, T.gpsnet, 999),
};
const explK = t => eo(seg(t, T.explode + .1, T.explode + 1.0)) * (1 - eio(seg(t, T.climate - .4, T.climate + .6)));

// ---------- events (foley) ----------
const EV = [{ t: T.hook + .05, type: 'flyby' }, { t: T.mic - .05, type: 'lift' }, { t: T.mic + .5, type: 'coin' }, { t: T.y1961, type: 'card' }, { t: T.quote, type: 'label' },
  { t: T.ww2, type: 'lift' }, { t: T.plants, type: 'clunk' }, { t: T.willow, type: 'clunk' }, { t: T.b24, type: 'clunk' },
  { t: T.cold - .05, type: 'card' }, { t: T.spin - .1, type: 'launch' }, { t: T.jetEng - .1, type: 'land' }, { t: T.sat - .1, type: 'land' }, { t: T.gps - .1, type: 'land' }, { t: T.arpa - .1, type: 'land' },
  { t: T.today, type: 'lift' }, { t: T.trillion, type: 'coin' }, { t: T.top100, type: 'lift' }, { t: T.b679, type: 'coin' },
  { t: T.explode - .4, type: 'lift' }, { t: T.explode + .1, type: 'spread' }, { t: T.engine, type: 'label' }, { t: T.radar, type: 'label' }, { t: T.wings, type: 'label' }, { t: T.chips, type: 'label' },
  { t: T.f35, type: 'pins' }, { t: T.sup, type: 'pins' }, { t: T.climate - .3, type: 'land' }, { t: T.pct, type: 'hiss' }, { t: T.voluntary, type: 'card' },
  { t: T.race - .1, type: 'buzz' }, { t: T.drones, type: 'swarm' }, { t: T.m4, type: 'card' }, { t: T.closer + .1, type: 'lift' }, { t: T.gpsnet, type: 'ping' }, { t: T.steer, type: 'card' }, { t: T.next, type: 'card' }];
window.EV = EV.map(e => ({ ...e, t: +e.t.toFixed(2) })).sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
const tmp = new THREE.Vector3();
window.render = t => {
  // jet: hovers, slowly banks; explodes along each part's axis
  const jk = K.jet(t), ek = explK(t);
  setK(jetRoot, jk); jetRoot.position.set(0, JY, 0);
  jet.rotation.set(.08 * Math.sin(t * .7), .18 * Math.sin(t * .23), .05 * Math.sin(t * .5));
  for (const n in P) P[n].g.position.copy(P[n].dir).multiplyScalar(ek);
  post_.visible = jk > .01; post_.scale.set(1, (JY - TOP - .2) * jk, 1); post_.position.set(0, TOP + (JY - TOP - .2) * jk / 2, 0);
  M.acc.emissiveIntensity = .25;
  // iron triangle + money loop
  const tk = K.tri(t); setK(tri, tk); tri.position.y = TOP * (1 - tk) * 0;
  coins.forEach((c, i) => { const u = (i / coins.length + t * .06) % 1; c.position.copy(loop.getPointAt(u)); c.rotation.set(Math.PI / 2, t * 3 + i, 0); setK(c, tk * (t > T.mic + .3 ? 1 : 0)); });
  // WWII line: bombers roll out of the plant
  const wk = K.ww(t); setK(ww, wk);
  bombers.forEach((b, i) => { const u = ((t - T.ww2) * .32 + i / 4) % 1; b.position.set(lerp(.1, 2.4, u), TOP + .1, 0); b.rotation.y = 0; b.scale.setScalar(.9 * ss(seg(u, 0, .12)) * (1 - ss(seg(u, .85, 1)))); b.visible = u > .01 && u < .99; });
  // arms-race missile
  { const mk2 = show(t, T.cold - .1, T.jetEng + .6), up = ei(seg(t, T.spin - .1, T.jetEng + .5)); setK(missile, mk2 > .002 ? 1 : 0); missile.visible = mk2 > .01 && up < .99;
    missile.position.set(0, TOP + .08 + 9 * up, 0); missile.scale.setScalar(Math.max(.002, mk2)); flame.visible = up > 0; flame.scale.set(1, 1 + .3 * Math.sin(t * 40), 1);
    setK(pad, show(t, T.cold - .1, T.today - .05)); }
  // spin-offs
  spin.forEach((g, i) => setK(g, K.spin(t, i)));
  spin[0].userData.spinner.rotation.x = t * 8;
  spin[1].userData.sat.rotation.y = t * .6; spin[2].userData.sat.rotation.y = -t * .5; spin[2].userData.sat.position.y = .95 + .04 * Math.sin(t * 2);
  spin[2].userData.rings.forEach((r, k) => { const u = (t * .7 + k / 3) % 1; r.position.y = lerp(.85, .2, u); r.scale.setScalar(lerp(.6, 1.9, u)); });
  M.signal.opacity = .5;
  // bars: countries (v06) morph into the arms makers (v07)
  const bk = K.bars(t), mk = eio(seg(t, T.top100 - .2, T.top100 + .8));
  bars.forEach((b, i) => { const h = lerp(BARV.a[i], BARV.b[i], mk) * BS * eo(seg(t, T.today + .1 + i * .15, T.spend + .9 + i * .15)); b.visible = bk > .002 && h > .003; b.scale.set(bk, Math.max(h, .003) * bk, bk); });
  // suppliers pop in, staggered
  const sk = K.sup(t);
  sups.forEach(s => { const k = sk * pop(seg(t, T.f35 + s.userData.d * 1.6, T.f35 + s.userData.d * 1.6 + .35)); setK(s, k); });
  // smoke
  const smk = K.smoke(t);
  smoke.forEach(m => { const d = m.userData, a = (t * .28 + d.ph) % 1; if (smk < .01) { m.visible = false; return; }
    if (d.src < 0) tmp.set(-1.9, JY + .05, 0); else tmp.copy(sups[d.src].position).setY(TOP + .15);
    m.position.set(tmp.x + d.dx * a * 2, tmp.y + a * 1.9, tmp.z + d.dz * a * 2); m.visible = true; m.scale.setScalar(Math.max(.002, smk * (.05 + .22 * a) * (1 - ss(seg(a, .75, 1))))); });
  // drones circle the jet
  const dk = K.drones(t);
  drones.forEach((g, i) => { const d = g.userData, a = d.a + t * d.w, inK = eo(seg(t, T.race - .1 + (i % 9) * .08, T.race + .9 + (i % 9) * .08)), outK = ss(seg(t, T.closer + (i % 9) * .05, T.closer + .9));
    const r = d.r + 3 * (1 - inK) + 3 * outK; g.position.set(Math.cos(a) * r, d.y + .1 * Math.sin(t * 2 + i) + 1.5 * outK, Math.sin(a) * r); g.rotation.set(.15, -a + (d.w > 0 ? -Math.PI / 2 : Math.PI / 2), 0); setK(g, dk); });
  // GPS satellites orbit above
  const gk = K.gps(t);
  gpsSats.forEach((s, i) => { const a = i * 2.094 + t * .35; s.position.set(Math.cos(a) * 2.0, 3.35 + .15 * Math.sin(a * 2), Math.sin(a) * 2.0); s.rotation.y = -a; setK(s, gk * .9); });
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, P, ek, JY, TOP, B, SP, BX, bars, sups, sk, jk, K, BARV, mk, jetRoot });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
