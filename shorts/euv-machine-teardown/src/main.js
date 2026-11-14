// EUV Lithography Machine — Exploded Teardown, 1080×1920. Schematic model (not to scale, no logos):
// CO2 laser → tin-droplet source + collector → intermediate focus → illuminator mirrors → reticle (mask) → projection mirrors → wafer.
// Units: model units. X = left→right along the light path, Y up, Z toward camera.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, eio, track } from '/core/lib.js';
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
  hook: cue('v01'), reveal: cue('v02'), euv: cue('v02', 1), one: cue('v02', 2),
  tin: cue('v03'), drip: cue('v03', 1), laser: cue('v04'), rate: cue('v04', 1), plasma: cue('v05'), hot: cue('v05', 1),
  glow: cue('v06'), nm: cue('v06', 1), xuv: cue('v06', 2), vac: cue('v07'), air: cue('v07', 1), glass: cue('v07', 2),
  lens: cue('v08'), mirrors: cue('v08', 1), stack: cue('v09'), layers: cue('v09', 1), smooth: cue('v10'), germany: cue('v10', 1), bump: cue('v10', 2),
  mask: cue('v11'), wafer: cue('v11', 1), stages: cue('v12'), align: cue('v12', 1), gates: cue('v13'), g20: cue('v13', 1), hair: cue('v13', 2),
  price: cue('v14'), p150: cue('v14', 1), p400: cue('v14', 2), ship: cue('v15'), cont: cue('v15', 1), planes: cue('v15', 2),
  china: cue('v16'), never: cue('v16', 1), dutch: cue('v16', 2), us: cue('v17'), curb: cue('v17', 1),
  close: cue('v18'), whoever: cue('v18', 1), race: cue('v18', 2), next: cue('v19'),
};
T.open = T.tin - .2; T.shut = T.price - .3;
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
post.bloom.strength = .6; post.bloom.radius = .55; post.bloom.threshold = 2.0;
post.vig.uniforms.amt.value = .36; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .04;
{
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createRadialGradient(560, 900, 80, 540, 960, 1500); gr.addColorStop(0, '#2f3138'); gr.addColorStop(.45, '#1d1f25'); gr.addColorStop(1, '#0b0c10');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = .55; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff3e6', 1.6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 80 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#d9e4ff', 5, 16, 5); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .5, 14, 14); scene.add(top);
const hemi = new THREE.HemisphereLight('#c9d3e0', '#16141a', .22); scene.add(hemi);
const plasmaLight = new THREE.PointLight('#c79bff', 0, 5, 1.5); scene.add(plasmaLight);

// ---------- materials ----------
const M = {
  base: new THREE.MeshPhysicalMaterial({ color: '#25282e', roughness: .5, metalness: .3, clearcoat: .2 }),
  shellW: new THREE.MeshPhysicalMaterial({ color: '#eceae4', roughness: .55, clearcoat: .1, transparent: true }),
  trim: new THREE.MeshPhysicalMaterial({ color: '#2a2d33', roughness: .4, metalness: .5, transparent: true }),
  stripe: new THREE.MeshPhysicalMaterial({ color: '#7b5cff', roughness: .4, clearcoat: .5, transparent: true }),
  steel: new THREE.MeshStandardMaterial({ color: '#4a5058', roughness: .4, metalness: .75 }),
  dark: new THREE.MeshStandardMaterial({ color: '#2b2e34', roughness: .5, metalness: .6 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#dfe3e8', roughness: .06, metalness: 1, emissive: '#8a5cff', emissiveIntensity: 0 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#b9c6d6', roughness: .1, metalness: .1, transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide }),
  red: new THREE.MeshPhysicalMaterial({ color: '#d8432f', roughness: .4, clearcoat: .5 }),
  tin: new THREE.MeshStandardMaterial({ color: '#d7dadf', roughness: .15, metalness: 1 }),
  granite: new THREE.MeshPhysicalMaterial({ color: '#3b3d42', roughness: .7 }),
  mo: new THREE.MeshPhysicalMaterial({ color: '#4d5158', roughness: .45, metalness: .6 }),
  si: new THREE.MeshPhysicalMaterial({ color: '#b39a6c', roughness: .6, metalness: .1 }),
};
const glowMat = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const cyl = (r, h, mat, x = 0, y = 0, z = 0, s = 32) => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, s), mat)); m.position.set(x, y, z); return m; };
const UP = new THREE.Vector3(0, 1, 0);

// canvas textures: wafer (die grid) and mask (circuit pattern)
function canTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const waferTex = canTex(1024, 1024, (g, w) => {
  const gr = g.createLinearGradient(0, 0, w, w); gr.addColorStop(0, '#3b3f8f'); gr.addColorStop(.35, '#2a7f8a'); gr.addColorStop(.6, '#7a4fa8'); gr.addColorStop(1, '#2b5c9c');
  g.fillStyle = gr; g.fillRect(0, 0, w, w); g.strokeStyle = 'rgba(230,235,255,.55)'; g.lineWidth = 3;
  const n = 14, s = w / n; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, w); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 3 === 0) g.fillRect(i * s + 6, j * s + 6, s - 12, s - 12);
});
const maskTex = canTex(1024, 512, (g, w, h) => {
  g.fillStyle = '#16181f'; g.fillRect(0, 0, w, h); let r = 7; const R = () => (r = (r * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#c9cbe0'; for (let i = 0; i < 520; i++) { const x = R() * w, y = R() * h; if (R() > .5) g.fillRect(x, y, 30 + R() * 160, 4); else g.fillRect(x, y, 4, 20 + R() * 90); }
  g.strokeStyle = '#8a5cff'; g.lineWidth = 6; g.strokeRect(40, 40, w - 80, h - 80);
});

// ---------- base plinth ----------
scene.add(box(9.6, .2, 3.0, M.base, -1.1, .1, 0));

// ---------- module groups (positions are the assembled layout; explode adds offsets) ----------
const G = {};
const mod = (name, x, y, z, ex) => { const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g); G[name] = { g, home: new THREE.Vector3(x, y, z), ex: new THREE.Vector3(...ex) }; return g; };

// CO2 laser (outside the vacuum, left)
const LAS = mod('laser', -4.7, 1.45, 0, [-.6, 0, 0]);
LAS.add(box(1.2, .7, .8, M.shellW, 0, 0, 0)); LAS.add(box(1.22, .08, .82, M.red, 0, .22, 0)); LAS.add(box(.2, .2, .2, M.steel, .7, 0, 0));
for (let i = 0; i < 4; i++) LAS.add(box(.04, .4, .02, M.trim, -.4 + i * .15, -.05, .41));

// source vessel: droplet generator on top, collector mirror, catcher below
const SRC = mod('src', -2.6, 0, 0, [-.25, 0, 0]);
const P0 = new THREE.Vector3(.35, 1.45, 0);   // plasma point (local)
{ const v = sh(new THREE.Mesh(new THREE.CylinderGeometry(.85, .85, 2.3, 40, 1, true), M.glass)); v.position.set(.2, 1.45, 0); SRC.add(v); }
SRC.add(cyl(.86, .08, M.steel, .2, .32, 0, 40)); SRC.add(cyl(.86, .08, M.steel, .2, 2.58, 0, 40));
SRC.add(cyl(.12, .5, M.steel, P0.x, 2.85, 0)); SRC.add(cyl(.2, .14, M.dark, P0.x, 3.1, 0)); SRC.add(cyl(.05, .2, M.chrome, P0.x, 2.55, 0, 12));
SRC.add(cyl(.12, .3, M.dark, P0.x, .55, 0));
const collector = (() => { const pts = []; for (let i = 0; i <= 24; i++) { const r = .12 + .6 * i / 24; pts.push(new THREE.Vector2(r, .9 * r * r)); }
  const g = new THREE.LatheGeometry(pts, 64); g.rotateZ(-Math.PI / 2); const m = sh(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#e8e6f2', roughness: .05, metalness: 1, side: THREE.DoubleSide, emissive: '#8a5cff', emissiveIntensity: 0 }))); return m; })();
collector.position.set(P0.x - .55, P0.y, 0); SRC.add(collector);
const plasma = new THREE.Mesh(new THREE.SphereGeometry(.13, 24, 16), glowMat('#e2c8ff')); plasma.position.copy(P0); SRC.add(plasma);
const halo = new THREE.Mesh(new THREE.SphereGeometry(.34, 24, 16), glowMat('#8a4dff', .5)); halo.position.copy(P0); SRC.add(halo);
const DROPN = 14, drops = [...Array(DROPN)].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 8), M.tin); SRC.add(m); return m; });
// laser beam (CO2: infrared, drawn red), from laser nozzle through the collector hole to the plasma point
const laserBeam = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1, 10), glowMat('#ff3b2a', .9)); scene.add(laserBeam);
const laserCore = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1, 8), glowMat('#ffd0c0', 1)); scene.add(laserCore);

// illuminator: intermediate focus + 2 mirrors
const ILL = mod('ill', -.9, 0, 0, [0, .15, 0]);
const IF = new THREE.Vector3(0, 1.45, 0), M1p = new THREE.Vector3(.7, 2.55, 0), M2p = new THREE.Vector3(1.35, 3.2, 0);
ILL.add(box(.08, .5, .5, M.steel, IF.x, IF.y + .4, 0)); ILL.add(box(.08, .5, .5, M.steel, IF.x, IF.y - .4, 0));
// reticle stage (top) with the mask
const RS = mod('rs', 1.2, 4.0, 0, [0, .7, 0]);
RS.add(box(1.8, .16, 1.1, M.dark, 0, .12, 0)); RS.add(box(2.4, .1, 1.3, M.granite, 0, .34, 0));
const maskMesh = sh(new THREE.Mesh(new THREE.BoxGeometry(.9, .04, .7), [M.dark, M.dark, M.dark, new THREE.MeshStandardMaterial({ map: maskTex, roughness: .2, metalness: .6 }), M.dark, M.dark])); maskMesh.position.y = .02; RS.add(maskMesh);
const maskFront = new THREE.Mesh(new THREE.PlaneGeometry(.9, .7), new THREE.MeshStandardMaterial({ map: maskTex, roughness: .2, metalness: .6, side: THREE.DoubleSide })); maskFront.rotation.x = Math.PI / 2; maskFront.position.y = -.002; RS.add(maskFront);
const RMp = new THREE.Vector3(0, -.01, 0);
// projection optics column
const PO = mod('po', 1.55, 0, 0, [.55, 0, 0]);
{ const v = sh(new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, 2.5, 40, 1, true), M.glass)); v.position.set(0, 2.15, 0); PO.add(v); }
PO.add(cyl(.76, .07, M.steel, 0, .9, 0, 40)); PO.add(cyl(.76, .07, M.steel, 0, 3.4, 0, 40));
const POp = [new THREE.Vector3(.4, 3.0, 0), new THREE.Vector3(-.35, 2.45, 0), new THREE.Vector3(.4, 1.85, 0), new THREE.Vector3(-.3, 1.3, 0)];
// wafer stage (bottom)
const WS = mod('ws', 1.4, .2, 0, [0, -.05, .9]);
WS.add(box(2.2, .14, 1.6, M.granite, 0, .07, 0)); WS.add(box(1.4, .14, 1.2, M.dark, 0, .21, 0));
const wafer = sh(new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .025, 64), [new THREE.MeshStandardMaterial({ color: '#888', metalness: .8, roughness: .3 }), new THREE.MeshPhysicalMaterial({ map: waferTex, roughness: .5, metalness: .3, clearcoat: .15, iridescence: .3, envMapIntensity: .6 }), M.dark]));
wafer.position.y = .3; WS.add(wafer);
const WPp = new THREE.Vector3(0, .32, 0);
const waferStage = WS.children[1];
// mirrors (oriented each frame to bounce the beam from its previous point to its next)
const mirror = (r) => { const g = new THREE.Group(); const d = sh(new THREE.Mesh(new THREE.CylinderGeometry(r, r, .06, 40), M.chrome)); const back = sh(new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, .08, 40), M.dark)); back.position.y = -.07; g.add(d, back); scene.add(g); return g; };
const MIR = [mirror(.32), mirror(.3), mirror(.3), mirror(.26), mirror(.3), mirror(.24)];   // M1, M2, PO1..PO4

// housing (lifts off at T.open, back on at T.shut)
const HOUSE = new THREE.Group(); scene.add(HOUSE);
const hmats = [M.shellW, M.trim, M.stripe];
HOUSE.add(box(5.4, 4.3, 2.2, M.shellW, -.2, 2.4, 0));
HOUSE.add(box(5.45, .14, 2.25, M.trim, -.2, .3, 0)); HOUSE.add(box(5.45, .1, 2.25, M.trim, -.2, 4.57, 0));
HOUSE.add(box(5.42, .07, 2.22, M.stripe, -.2, 4.05, 0));
for (let i = 0; i < 5; i++) HOUSE.add(box(.04, 3.4, .02, M.trim, -2.4 + i * 1.1, 2.2, 1.11));
HOUSE.add(box(1.3, .5, .02, M.trim, 1.3, 1.0, 1.11));

// beam (EUV, violet): one cylinder per segment + the collector cone
const beamMat = glowMat('#9b6bff', .55), beamCoreMat = glowMat('#e6d6ff', .9);
const NSEG = 9;
const beams = [...Array(NSEG)].map(() => { const o = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1, 12, 1, true), beamMat); const c = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 1, 8, 1, true), beamCoreMat); scene.add(o, c); return [o, c]; });
const cone = new THREE.Mesh(new THREE.ConeGeometry(.66, 1, 40, 1, true), glowMat('#8a4dff', .22)); scene.add(cone);
function placeSeg(m, a, b, frac = 1) { const d = b.clone().sub(a); const L = d.length() * frac; if (L < 1e-4) { m.visible = false; return; } m.visible = true; m.scale.set(1, L, 1); m.position.copy(a).addScaledVector(d.normalize(), L / 2); m.quaternion.setFromUnitVectors(UP, d); }

// multilayer stack close-up: Mo/Si pairs fanning out of a mirror blank
const STACK = new THREE.Group(); scene.add(STACK);
const SL = 14; const stackLayers = [...Array(SL)].map((_, i) => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .035, 48), i % 2 ? M.si : M.mo)); STACK.add(m); return m; });
const stackBase = sh(new THREE.Mesh(new THREE.CylinderGeometry(.58, .58, .22, 48), new THREE.MeshPhysicalMaterial({ color: '#d4cfc4', roughness: .5 }))); STACK.add(stackBase);

// ---------- motion ----------
const openK = t => eio(seg(t, T.open, T.open + 1.4)) * (1 - eio(seg(t, T.shut, T.shut + 1.6)));
const explK = t => eio(seg(t, T.open + .5, T.open + 1.9)) * (1 - eio(seg(t, T.shut - .2, T.shut + 1.4)));
const laserOn = t => (t > T.laser - .1 && t < T.shut + 1.6) || t > T.close - .3;
const euvK = t => (t < T.glow ? 0 : 1);
const beamReveal = t => t < T.glow ? 0 : clamp((t - T.glow) / 2.2);   // EUV light travels the path during "it glows…"
const DROP_DT = .16, DROP_V = 2.6, DROP_Y0 = 2.45;
const hitT = k => k * DROP_DT + (DROP_Y0 - P0.y) / DROP_V;
function plasmaK(t) { let p = 0; const k1 = Math.floor((t - (DROP_Y0 - P0.y) / DROP_V) / DROP_DT); for (let k = k1; k > k1 - 4; k--) { const th = hitT(k); if (th <= t && laserOn(th)) p = Math.max(p, Math.exp(-(t - th) / .05)); } return p; }
const scanK = t => seg(t, T.stages - .2, T.stages + .3) * (1 - seg(t, T.gates - .2, T.gates + .3));

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, 34, 12, 28, -1.35, 2.1, 0],
  [T.reveal, 28, 10, 27, -1.35, 2.0, 0],
  [T.one + 1.2, 20, 12, 27, -1.35, 2.0, 0],
  [T.tin + .9, 22, 10, 13, -2.6, 1.9, 0],
  [T.drip + 1.2, 26, 8, 10, -2.6, 1.7, 0],
  [T.laser + .8, 18, 6, 12.5, -3.7, 1.6, 0],
  [T.plasma + .6, 24, 5, 8.5, -2.6, 1.6, 0],
  [T.glow + .8, 16, 8, 21, -1.2, 2.4, 0],
  [T.xuv + .5, 10, 8, 24, -1.0, 2.5, 0],
  [T.vac + 1.0, 26, 12, 23, -1.2, 2.4, 0],
  [T.lens + .4, 20, 8, 16, -.4, 2.5, 0],
  [T.mirrors + 1.0, 12, 8, 14.5, .4, 2.5, 0],
  [T.stack + .8, 12, 16, 7.0, -1.2, 5.9, 1.6],
  [T.layers + .6, 6, 12, 6.4, -1.2, 5.9, 1.6],
  [T.smooth + .6, 18, 18, 7.0, -1.2, 6.0, 1.6],
  [T.bump + .6, 22, 20, 7.4, -1.2, 6.0, 1.6],
  [T.mask + .8, 16, -6, 10, 1.4, 4.0, 0],
  [T.wafer + .8, 24, 26, 9, 1.6, .8, .6],
  [T.stages + .8, 30, 12, 17, 1.2, 2.5, .2],
  [T.align + 1.0, 34, 10, 16.5, 1.2, 2.5, .2],
  [T.gates + .4, 30, 12, 17, 1.2, 2.5, .2],
  [T.price + .9, 24, 10, 27, -1.35, 1.9, 0],
  [T.ship + 1.0, 30, 12, 31, -1.35, 4.4, 0],
  [T.china - .25, 27, 11, 31, -1.35, 4.4, 0],
  [T.china + 1.0, 20, 6, 27, -1.35, 2.0, 0],
  [T.us + 1.0, 10, 6, 27, -1.35, 2.0, 0],
  [T.close + .4, 28, 4, 24, -1.35, 2.2, 0],
  [T.race + .6, 34, 3, 22, -1.35, 2.2, 0],
  [DUR, 38, 6, 24, -1.35, 2.4, 0],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz] = camTrack(t); const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 200; post.dof.maxCoc = 8;
  const la = A - .9; key.position.set(tx + 14 * Math.sin(la), ty + 16, tz + 14 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 12 * Math.sin(A + Math.PI * .85), ty + 4, tz + 12 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 12, tz); top.lookAt(tx, ty, tz);
}

// ---------- events (foley) ----------
const EV = [{ t: T.euv, type: 'buzz' }, { t: T.open, type: 'lift' }, { t: T.open + .6, type: 'spread' }, { t: T.laser, type: 'zap' }, { t: T.plasma, type: 'pop' }, { t: T.glow + .1, type: 'hum' },
  { t: T.lens + .2, type: 'label' }, { t: T.mirrors + .1, type: 'pins' }, { t: T.stack + .4, type: 'spread' }, { t: T.germany, type: 'label' }, { t: T.mask + .2, type: 'label' }, { t: T.wafer + .2, type: 'label' },
  { t: T.stages, type: 'scan' }, { t: T.gates, type: 'label' }, { t: T.shut, type: 'lift' }, { t: T.shut + 1.5, type: 'land' }, { t: T.p150, type: 'coin' }, { t: T.cont, type: 'stack' },
  { t: T.never, type: 'card' }, { t: T.us, type: 'card' }, { t: T.close, type: 'hum' }, { t: T.next, type: 'card' }];
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
const wp = (name, v) => v.clone().add(G[name].g.position);
const tmpQ = new THREE.Quaternion();
window.render = t => {
  const ok = openK(t), ek = explK(t);
  // housing lifts and fades; modules spread
  HOUSE.position.y = 5.5 * ok; HOUSE.visible = ok < .98;
  for (const m of hmats) { m.opacity = 1 - ss(seg(ok, .15, .85)); m.depthWrite = m.opacity > .99; }
  for (const n in G) G[n].g.position.copy(G[n].home).addScaledVector(G[n].ex, ek);
  // stages scanning in opposite directions (reticle moves 4× the wafer)
  const sk = scanK(t), ph = Math.sin(t * 5.2);
  const rsX = .45 * ph * sk, wsX = -.11 * ph * sk;
  RS.children.forEach((c, i) => { if (i !== 1) c.position.x = rsX; });
  waferStage.position.x = wafer.position.x = wsX;
  // droplets
  for (let i = 0; i < DROPN; i++) {
    const k = Math.floor(t / DROP_DT) - i, t0 = k * DROP_DT, y = DROP_Y0 - (t - t0) * DROP_V, m = drops[i];
    const hit = laserOn(hitT(k)) && t >= hitT(k);
    m.visible = t > T.tin - .5 && !hit && y > .7 && k >= 0; m.position.set(P0.x, y, 0);
  }
  const hiddenP = ok < .05 && t > T.shut;
  // plasma flash
  const pk = laserOn(t) ? plasmaK(t) : 0, pg = .35 + .65 * pk;
  plasma.visible = halo.visible = laserOn(t) && !hiddenP;
  plasma.scale.setScalar(.45 + .8 * pk); plasma.material.opacity = .5 * pg; halo.scale.setScalar(.6 + 1.0 * pk); halo.material.opacity = .12 + .3 * pk;
  plasmaLight.position.copy(wp('src', P0)); plasmaLight.intensity = laserOn(t) && !hiddenP ? .6 + 2.5 * pk : 0;
  // laser beam: from the laser nozzle to the plasma point
  const la = wp('laser', new THREE.Vector3(.8, 0, 0)), lb = wp('src', P0); la.y = lb.y;
  const lOn = laserOn(t) && pk > .25;
  placeSeg(laserBeam, la, lb); placeSeg(laserCore, la, lb); laserBeam.visible = laserCore.visible = lOn;
  // EUV path (world points)
  const pts = [wp('ill', IF), wp('ill', M1p), wp('ill', M2p), wp('rs', RMp.clone().setX(rsX)), ...POp.map(p => wp('po', p)), wp('ws', WPp.clone().setX(wsX))];
  const hidden = ok < .05 && t > T.shut;
  const br = hidden ? 0 : beamReveal(t), nS = pts.length - 1, flick = .8 + .2 * Math.sin(t * 40);
  beams.forEach(([o, c], i) => { const f = clamp(br * nS - i); if (i >= nS || f <= 0) { o.visible = c.visible = false; return; } placeSeg(o, pts[i], pts[i + 1], f); placeSeg(c, pts[i], pts[i + 1], f); });
  beamMat.opacity = .5 * flick; beamCoreMat.opacity = .85 * flick;
  // collector cone: from the collector mouth to the intermediate focus
  { const a = wp('src', new THREE.Vector3(collector.position.x + .32, P0.y, 0)), b = pts[0]; const d = b.clone().sub(a); cone.visible = br > 0; cone.scale.set(1, d.length(), 1); cone.position.copy(a).addScaledVector(d, .5); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d.clone().normalize()); cone.material.opacity = .2 * flick; }
  collector.material.emissiveIntensity = br > 0 ? .25 + .25 * (t > T.lens && t < T.stack ? 1 : 0) : 0;
  // mirrors: normal bisects incoming and outgoing directions
  const chain = [pts[0], pts[1], pts[2], pts[3], pts[4], pts[5], pts[6], pts[7], pts[8]];
  const mIdx = [1, 2, 4, 5, 6, 7];
  MIR.forEach((m, j) => { const i = mIdx[j], p = chain[i], a = chain[i - 1].clone().sub(p).normalize(), b = chain[i + 1].clone().sub(p).normalize(); const n = a.add(b).normalize(); m.position.copy(p).addScaledVector(n, -.03); m.quaternion.setFromUnitVectors(UP, n); });
  const mHi = (t > T.mirrors - .2 && t < T.stack) ? 1 : 0;
  M.chrome.emissiveIntensity = mHi * (.35 + .25 * Math.sin(t * 7)) + (br > 0 ? .08 : 0);
  // multilayer stack close-up
  const stIn = ss(seg(t, T.stack - .3, T.stack + .6)) * (1 - ss(seg(t, T.mask - .5, T.mask + .1)));
  STACK.visible = stIn > .01; STACK.position.set(-1.2, 5.0 + (1 - stIn) * 2.5, 1.6); STACK.scale.setScalar(Math.max(stIn, .01));
  const fan = eio(seg(t, T.stack + .5, T.layers + .8));
  stackBase.position.y = 0; stackLayers.forEach((m, i) => { m.position.y = .13 + i * (.036 + .075 * fan); });
  STACK.rotation.y = t * .25;
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, wp, P0, IF, M1p, M2p, POp, WPp, RMp, pts, STACK, br });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
