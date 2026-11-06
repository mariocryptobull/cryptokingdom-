// What's inside a military recon drone? — Exploded Teardown, 1080×1920. A generic, schematic small fixed-wing recon
// drone (no real product, no logos) is pulled apart in a studio, then reassembled and flown over a schematic map to show
// where analysis software sits. Units: metres-ish (schematic). X = nose direction, Y up, Z = right wing toward camera.
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
const CUES = []; for (const v of TL.vo) { const d = VDUR[v.id]; const n = v.chunks.map(c => c.replace(/[^A-Za-z0-9]/g, '').length + 2), tot = n.reduce((a, b) => a + b, 0); let t = v.t; v.chunks.forEach((c, i) => { CUES.push({ id: v.id, i, t }); t += d * n[i] / tot; }); }
const cue = (id, i) => CUES.find(c => c.id === id && c.i === i).t;
const end = id => TL.vo.find(v => v.id === id).t + VDUR[id];
const T = {
  apart: cue('v01', 2), air: cue('v02', 0), hand: cue('v02', 1), kilo: cue('v02', 2),
  motor: cue('v03', 0), batt: cue('v03', 2), fc: cue('v04', 0), imu: cue('v04', 2), gps: cue('v04', 3),
  auto: cue('v05', 0), way: cue('v05', 1), manual: cue('v05', 3), link: cue('v06', 0), km: cue('v06', 2),
  nose: cue('v07', 0), turret: cue('v07', 1), eoir: cue('v07', 2), v07e: end('v07'),
  pal: cue('v08', 0), notdrone: cue('v08', 1), soft: cue('v08', 2),
  maven: cue('v09', 0), fuse: cue('v09', 2), flag: cue('v09', 3), map: cue('v09', 4),
  next: cue('v10', 0), congrats: cue('v11', 0), card: cue('v11', 1),
};
T.re = T.v07e + .05;            // reassemble during the musical break
T.fly = T.pal - .2;             // flight over the map starts on the drop
window.T = T;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, .05, 200);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, ao: false });
post.bloom.strength = .45; post.bloom.radius = .5; post.bloom.threshold = 2.0;
post.vig.uniforms.amt.value = .34; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .06;
{
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createRadialGradient(560, 860, 80, 540, 960, 1500); gr.addColorStop(0, '#34373b'); gr.addColorStop(.45, '#222427'); gr.addColorStop(1, '#0d0e10');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = .55; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff1e2', 1.7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: .5, far: 40 }); key.shadow.bias = -.0004; key.shadow.normalBias = .01; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 5, 8, 3); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .5, 6, 6); scene.add(top);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .25));

// ---------- materials ----------
const M = {
  skin: new THREE.MeshPhysicalMaterial({ color: '#7d8670', roughness: .55, clearcoat: .3, side: THREE.DoubleSide }),   // matte olive composite
  skin2: new THREE.MeshPhysicalMaterial({ color: '#6b735f', roughness: .6, clearcoat: .2, side: THREE.DoubleSide }),
  inner: new THREE.MeshStandardMaterial({ color: '#2a2c2f', roughness: .8, side: THREE.BackSide }),
  dark: new THREE.MeshStandardMaterial({ color: '#25272b', roughness: .5, metalness: .4 }),
  steel: new THREE.MeshStandardMaterial({ color: '#8b9198', roughness: .3, metalness: .9 }),
  copper: new THREE.MeshStandardMaterial({ color: '#c27a3e', roughness: .35, metalness: .9 }),
  prop: new THREE.MeshPhysicalMaterial({ color: '#1b1c1f', roughness: .4, clearcoat: .6 }),
  batt: new THREE.MeshPhysicalMaterial({ color: '#2f6fe0', roughness: .45, clearcoat: .5 }),
  pcb: new THREE.MeshPhysicalMaterial({ color: '#1f7a4a', roughness: .5, clearcoat: .4 }),
  chip: new THREE.MeshStandardMaterial({ color: '#141518', roughness: .4 }),
  gold: new THREE.MeshStandardMaterial({ color: '#d8b04a', roughness: .3, metalness: 1 }),
  white: new THREE.MeshPhysicalMaterial({ color: '#efece4', roughness: .5 }),
  radio: new THREE.MeshPhysicalMaterial({ color: '#d9dde1', roughness: .35, metalness: .6 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#0d1a24', roughness: .05, metalness: .2, clearcoat: 1 }),
  orange: new THREE.MeshPhysicalMaterial({ color: '#ff6b3d', roughness: .5 }),
  model: new THREE.MeshPhysicalMaterial({ color: '#efece4', roughness: .65 }),
};
const glowMats = ['skin', 'skin2', 'batt', 'pcb', 'copper', 'radio', 'dark', 'chip', 'white'];
for (const k of glowMats) { M[k] = M[k].clone(); M[k].emissive = new THREE.Color('#ff6b3d'); M[k].emissiveIntensity = 0; }
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const cylX = (r1, r2, len, mat, segs = 28) => { const g = new THREE.CylinderGeometry(r1, r2, len, segs); g.rotateZ(-Math.PI / 2); return sh(new THREE.Mesh(g, mat)); };

// ---------- the drone: parts with an explode offset ----------
const drone = new THREE.Group(); scene.add(drone);
const P = {};
const part = (name, ex, mats = []) => { const g = new THREE.Group(); drone.add(g); P[name] = { g, ex: new THREE.Vector3(...ex), mats }; return g; };
// fuselage: lathe profile, split into top and bottom halves
const prof = []; for (let i = 0; i <= 40; i++) { const u = i / 40, x = lerp(-.46, .44, u); let r = .066; if (u > .82) r = .066 * Math.sqrt(Math.max(0, 1 - Math.pow((u - .82) / .18, 2)) * .85 + .15); if (u < .45) r = lerp(.026, .066, ss(u / .45)); prof.push(new THREE.Vector2(r, x)); }
const halfLathe = (p0, mat) => { const g = new THREE.LatheGeometry(prof, 40, p0, Math.PI); g.rotateZ(-Math.PI / 2); const m = sh(new THREE.Mesh(g, mat)); const inn = new THREE.Mesh(g, M.inner); inn.scale.setScalar(.985); const gg = new THREE.Group(); gg.add(m, inn); return gg; };
const fTop = part('fTop', [0, .28, 0], ['skin']); fTop.add(halfLathe(Math.PI, M.skin));
const fBot = part('fBot', [0, -.22, -.12], ['skin']); fBot.add(halfLathe(0, M.skin));
// wing: tapered airfoil-ish extrusion along z, high-mounted
const wingGeo = (() => { const s = new THREE.Shape(); s.moveTo(.11, 0); s.bezierCurveTo(.09, .018, .02, .024, -.04, .016); s.lineTo(-.11, .002); s.lineTo(-.11, -.002); s.bezierCurveTo(-.02, -.006, .08, -.008, .11, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: .7, bevelEnabled: false, curveSegments: 12 });
  const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) { const z = pos.getZ(i), k = 1 - .35 * z / .7; pos.setX(i, pos.getX(i) * k - .02 * z / .7); pos.setY(i, pos.getY(i) * k + .05 * z / .7); } g.computeVertexNormals(); return g; })();
const wing = part('wing', [0, .62, 0], ['skin2']);
for (const s of [1, -1]) { const m = sh(new THREE.Mesh(wingGeo, M.skin2)); m.scale.z = s; m.position.set(.05, .07, 0); wing.add(m); }
wing.add(box(.1, .02, .05, M.skin, .05, .065, 0));
// tail: horizontal stabiliser + fin
const tail = part('tail', [-.42, .06, 0], ['skin2']);
tail.add(box(.1, .008, .4, M.skin2, -.42, .005, 0));
{ const s = new THREE.Shape(); s.moveTo(-.36, 0); s.lineTo(-.47, 0); s.lineTo(-.48, .13); s.lineTo(-.43, .13); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: .008, bevelEnabled: false }); g.translate(0, .01, -.004); tail.add(sh(new THREE.Mesh(g, M.skin2))); }
// motor + propeller (tractor, at the nose)
const motorP = part('motor', [.42, 0, 0], ['copper']);
{ const can = cylX(.034, .034, .05, M.copper); can.position.x = .47; motorP.add(can); const shaft = cylX(.006, .006, .06, M.steel); shaft.position.x = .52; motorP.add(shaft); }
const prop = new THREE.Group(); prop.position.x = .54; motorP.add(prop);
{ const sp = new THREE.Mesh(new THREE.ConeGeometry(.022, .05, 20).rotateZ(-Math.PI / 2), M.dark); sp.position.x = .02; prop.add(sh(sp));
  for (const s of [1, -1]) { const b = box(.012, .19, .03, M.prop, 0, s * .1, 0); b.rotation.y = s * .25; prop.add(b); } }
// battery pack
const battP = part('batt', [-.02, -.06, .44], ['batt']);
{ battP.add(box(.28, .056, .066, M.batt, -.06, -.012, 0)); battP.add(box(.01, .03, .03, M.dark, -.205, -.012, 0)); battP.add(box(.12, .057, .067, M.white, -.06, -.012, 0)); }
// flight controller (PCB with IMU chip) + GPS puck
const fcP = part('fc', [.1, .2, .34], ['pcb']);
const imu = box(.026, .008, .026, M.chip, .14, .044, .0);
{ fcP.add(box(.13, .006, .07, M.pcb, .13, .036, 0)); fcP.add(imu); fcP.add(box(.03, .007, .02, M.chip, .1, .043, -.018)); fcP.add(box(.02, .006, .015, M.gold, .09, .042, .02)); fcP.add(box(.012, .01, .05, M.dark, .07, .044, 0)); }
const gpsP = part('gps', [-.16, .36, .2], ['white']);
{ gpsP.add(box(.05, .01, .05, M.white, -.2, .05, 0)); gpsP.add(box(.03, .004, .03, M.gold, -.2, .057, 0)); }
// radio datalink module + antennas
const radioP = part('radio', [-.18, .04, .4], ['radio']);
{ radioP.add(box(.08, .03, .05, M.radio, -.3, .01, 0)); for (const z of [-.03, .03]) { const a = sh(new THREE.Mesh(new THREE.CylinderGeometry(.003, .003, .12, 6), M.dark)); a.position.set(-.32, -.06, z); radioP.add(a); } }
const antTip = new THREE.Object3D(); antTip.position.set(-.32, -.12, .03); radioP.add(antTip);
// gimbal camera turret under the nose: yoke + ball (+z of ball = lens direction)
const gimP = part('gimbal', [.14, -.42, .08], ['dark']);
const ball = new THREE.Group(); ball.position.set(.3, -.1, 0); gimP.add(ball);
{ gimP.add(box(.05, .03, .05, M.dark, .3, -.055, 0)); const sp = sh(new THREE.Mesh(new THREE.SphereGeometry(.042, 28, 20), M.dark)); ball.add(sp);
  for (const [x, r] of [[-.012, .015], [.016, .011]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .01, 20).rotateX(Math.PI / 2), M.glass); l.position.set(x, 0, .039); ball.add(l); } }
const lens = new THREE.Object3D(); lens.position.set(0, 0, .05); ball.add(lens);
drone.traverse(o => { if (o.isMesh) { o.castShadow = true; } });

// ---------- studio floor (shadow catcher) ----------
const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: .35, transparent: true })); floor.position.y = -.72; floor.receiveShadow = true; scene.add(floor);

// ---------- schematic map (for the software section) ----------
const MAPY = -1.6, MAPS = 14;
const mapTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 2048; const g = c.getContext('2d'); let r = 7; const Rn = () => (r = (r * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#3b3f43'; g.fillRect(0, 0, 2048, 2048);
  for (let i = 0; i < 90; i++) { g.fillStyle = Rn() > .5 ? '#434a3d' : '#46484b'; g.fillRect(Rn() * 2048, Rn() * 2048, 80 + Rn() * 260, 80 + Rn() * 260); }
  g.strokeStyle = '#2c4a5c'; g.lineWidth = 46; g.beginPath(); g.moveTo(-50, 1600); g.bezierCurveTo(500, 1350, 900, 1900, 1400, 1500); g.bezierCurveTo(1700, 1270, 1900, 1400, 2100, 1250); g.stroke();
  g.strokeStyle = '#6a6e73'; g.lineWidth = 22; for (const y of [560, 1024, 1300]) { g.beginPath(); g.moveTo(0, y); g.lineTo(2048, y + 60); g.stroke(); } for (const x of [700, 1024, 1500]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x - 80, 2048); g.stroke(); }
  g.strokeStyle = 'rgba(160,200,220,.12)'; g.lineWidth = 2; for (let k = 0; k <= 2048; k += 128) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 2048); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(2048, k); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
const mapMat = new THREE.MeshStandardMaterial({ map: mapTex, roughness: .95, transparent: true, opacity: 0 });
const mapG = new THREE.Group(); scene.add(mapG);
const mapPlane = new THREE.Mesh(new THREE.PlaneGeometry(MAPS, MAPS).rotateX(-Math.PI / 2), mapMat); mapPlane.position.y = MAPY; mapPlane.receiveShadow = true; mapG.add(mapPlane);
// simple blocks + a few generic vehicles near the centre
const blockMat = new THREE.MeshStandardMaterial({ color: '#8d9096', roughness: .8, transparent: true, opacity: 0 });
const vehMat = new THREE.MeshStandardMaterial({ color: '#e9e4d6', roughness: .6, transparent: true, opacity: 0 });
{ let r = 31; const Rn = () => (r = (r * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) { const x = (Rn() - .5) * 10, z = (Rn() - .5) * 10; if (Math.hypot(x, z) < 1.0) continue; const h = .04 + Rn() * .14; const b = new THREE.Mesh(new THREE.BoxGeometry(.18 + Rn() * .25, h, .18 + Rn() * .25), blockMat); b.position.set(x, MAPY + h / 2, z); sh(b); mapG.add(b); } }
const VEH = [[-.25, .02], [.32, -.18], [.08, .38]].map(([x, z], i) => { const v = sh(new THREE.Mesh(new THREE.BoxGeometry(.11, .045, .055), vehMat)); v.position.set(x, MAPY + .023, z); v.rotation.y = i * .9; mapG.add(v); return v; });
const TGT = new THREE.Vector3(0, MAPY, .05);
// sensor footprint: cone from the lens to the ground + ellipse
const coneMat = new THREE.MeshBasicMaterial({ color: '#59d4ff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
const cone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 32, 1, true).translate(0, -.5, 0).rotateX(-Math.PI / 2), coneMat); scene.add(cone);   // apex at origin, opens toward +z... after lookAt
const foot = new THREE.Mesh(new THREE.RingGeometry(.52, .56, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#59d4ff', transparent: true, opacity: 0, depthWrite: false })); foot.position.copy(TGT).y += .005; scene.add(foot);

// ---------- motion ----------
const explK = t => eio(seg(t, T.apart - .1, T.apart + 1.3)) * (1 - eio(seg(t, T.re, T.re + 1.2)));
const flyK = t => eio(seg(t, T.fly - .3, T.fly + 1.6));
const FLYR = 1.5, FLYW = .17;
const flight = t => { const a = (t - T.fly) * FLYW + 2.2; return { p: new THREE.Vector3(FLYR * Math.cos(a), 0, FLYR * Math.sin(a)), a }; };
// part highlights [part, t0, t1]
const HL = [['fTop', T.air, T.motor], ['fBot', T.air, T.motor], ['wing', T.air, T.motor], ['tail', T.air, T.motor], ['motor', T.motor, T.batt], ['batt', T.batt, T.fc],
  ['fc', T.fc, T.auto], ['gps', T.gps, T.auto], ['fc', T.auto, T.link], ['radio', T.link, T.nose], ['gimbal', T.nose, T.re]];

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, 32, 16, 5.0, .05, -.05, 0],
  [T.apart, 36, 20, 5.5, .02, 0, .05],
  [T.apart + 1.6, 40, 22, 7.0, 0, 0, .1],
  [T.kilo + .5, 30, 24, 7.6, 0, 0, .1],
  [T.motor + .5, 64, 14, 4.2, .45, 0, .05],
  [T.batt + .6, 24, 18, 4.3, -.08, -.02, .35],
  [T.fc + .6, 34, 32, 4.1, .12, .12, .3],
  [T.gps + .3, 22, 34, 4.3, -.05, .2, .25],
  [T.auto + .6, 28, 26, 6.4, 0, .05, .1],
  [T.link + .5, 12, 14, 4.5, -.35, .02, .35],
  [T.km, 18, 16, 5.0, -.3, 0, .3],
  [T.nose + .5, 50, 4, 4.1, .38, -.38, .1],
  [T.eoir + .5, 58, 2, 3.6, .42, -.45, .12],
  [T.re + .6, 40, 18, 5.0, .05, -.05, 0],
  [T.fly + 1.8, 30, 50, 7.0, 0, -1.25, 0],
  [T.maven + .5, 20, 64, 6.6, 0, -1.5, -.3],
  [T.map + .8, 10, 72, 6.8, 0, -1.55, -.3],
  [T.next, 4, 60, 7.0, 0, -1.3, -.2],
  [DUR, -12, 42, 7.6, 0, -1.1, -.1],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t, off) {
  let [az, el, dist, tx, ty, tz] = camTrack(t); tx += off.x; ty += off.y; tz += off.z; const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 60; post.dof.maxCoc = 8;
  const la = A - .9; key.position.set(tx + 8 * Math.sin(la), ty + 10, tz + 8 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 6 * Math.sin(A + Math.PI * .85), ty + 2.5, tz + 6 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 6, tz); top.lookAt(tx, ty, tz);
}

// ---------- events (foley) ----------
const EV = [{ t: T.apart, type: 'lift' }, { t: T.apart + .25, type: 'spread' }];
for (const k of ['air', 'motor', 'batt', 'fc', 'gps', 'auto', 'link', 'turret']) EV.push({ t: T[k] + .2, type: 'label' });
EV.push({ t: T.motor + .1, type: 'whir' });
for (let k = 0; k < 4; k++) EV.push({ t: +(T.way + .35 + k * .45).toFixed(2), type: 'pin' });
for (let k = 0; k < 3; k++) EV.push({ t: +(T.link + .3 + k * .8).toFixed(2), type: 'ping' });
EV.push({ t: T.re + 1.05, type: 'land' }, { t: T.fly + .2, type: 'fly' });
for (let k = 0; k < 3; k++) EV.push({ t: +(T.flag + .25 + k * .35).toFixed(2), type: 'pin' });
EV.push({ t: T.maven, type: 'card' }, { t: T.next, type: 'card' }, { t: T.card, type: 'card' });
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR; window.FLY = [T.fly, DUR];

// ---------- live sensor feed (rendered from the turret into a small canvas each frame) ----------
const FW = 520, FH = 300;
const feedCam = new THREE.PerspectiveCamera(16, FW / FH, .05, 100);
const feed = document.createElement('canvas'); feed.width = FW; feed.height = FH; const fg = feed.getContext('2d');

// ---------- frame ----------
await initOverlay({ VDUR, TL });
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const wp = o => o.getWorldPosition(new THREE.Vector3());
window.render = t => {
  const ek = explK(t), fk = flyK(t);
  for (const n of Object.keys(P)) P[n].g.position.copy(P[n].ex).multiplyScalar(ek);
  // highlights
  for (const k of glowMats) M[k].emissiveIntensity = 0;
  for (const [n, a, b] of HL) if (t > a && t < b) { const k = ss(seg(t, a, a + .3)) * (1 - ss(seg(t, b - .3, b))); for (const m of P[n].mats) M[m].emissiveIntensity = Math.max(M[m].emissiveIntensity, (.12 + .06 * Math.sin(t * 6)) * k); }
  M.chip.emissiveIntensity = (t > T.imu - .1 && t < T.auto) ? .5 + .3 * Math.sin(t * 9) : 0;
  // studio pose: slow turn + gentle hover; flight pose: circle the map
  const hov = new THREE.Vector3(0, .02 * Math.sin(t * 1.3), 0);
  const studioYaw = -.35 + .12 * Math.sin(t * .35);
  const { p, a } = flight(t);
  drone.position.copy(hov).lerp(p, fk);
  const yaw = Math.atan2(-Math.cos(a), -Math.sin(a));
  drone.rotation.order = 'YXZ';
  drone.rotation.y = lerp(studioYaw, yaw, fk); drone.rotation.x = lerp(.0, -.32, fk); drone.rotation.z = lerp(.04 * Math.sin(t * .9), -.03, fk);
  // propeller: idle → fast; blur by spinning fast
  { let r = 0; for (let x = 0; x < t; x += 1 / 48) r += (x > T.motor - .2 && x < T.batt ? 3 : x > T.re ? 9 : .4) / 48; prop.rotation.x = r * 6; }
  // turret: scans in the studio, tracks the target in flight
  if (fk > .01) { ball.lookAt(TGT); } else ball.rotation.set(0, Math.PI / 2 + .5 * Math.sin(t * .8), 0);
  if (t > T.nose && t < T.re) ball.rotation.set(.3 * Math.sin(t * 1.4), Math.PI / 2 + .8 * Math.sin(t * .9), 0);
  // map + footprint
  const mk = ss(seg(t, T.fly - .2, T.fly + 1.2));
  mapMat.opacity = blockMat.opacity = mk; vehMat.opacity = mk; mapG.visible = mk > .01; floor.material.opacity = .35 * (1 - mk);
  scene.environmentIntensity = .55;
  drone.updateMatrixWorld(true);
  const lp = wp(lens), ck = ss(seg(t, T.fly + 1.2, T.fly + 2.2));
  cone.visible = foot.visible = ck > .01;
  if (cone.visible) { const L = lp.distanceTo(TGT); cone.position.copy(lp); cone.lookAt(TGT); cone.scale.set(.55, .55, L); coneMat.opacity = .1 * ck; foot.material.opacity = .8 * ck; }
  setCamera(t, drone.position.clone().setY(0).multiplyScalar(.3 * fk));
  // sensor feed: render from the lens, then copy into the feed canvas (thermal look applied in the overlay)
  const feedOn = t > T.maven - .2 && t < T.next;
  if (feedOn) {
    feedCam.position.copy(lp); feedCam.lookAt(TGT); feedCam.updateMatrixWorld();
    const hide = [cone, foot, drone]; hide.forEach(o => o.userData.v = o.visible); hide.forEach(o => o.visible = false);
    renderer.setRenderTarget(null); renderer.setViewport(0, 0, FW, FH); renderer.setScissor(0, 0, FW, FH); renderer.setScissorTest(true);
    renderer.render(scene, feedCam); fg.drawImage(renderer.domElement, 0, H - FH, FW, FH, 0, 0, FW, FH);
    renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
    hide.forEach(o => o.visible = o.userData.v);
  }
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, P, wp, ek, fk, feed: feedOn ? feed : null, feedCam, VEH, TGT, antTip, imu, ball, lp });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
