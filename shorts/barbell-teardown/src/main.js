// What's Inside an Olympic Barbell? — Exploded Teardown, 1080×1920.
// A schematic IWF men's bar (20 kg, 2.2 m, 28 mm shaft, 50 mm sleeves), no brand marks. Units: 1 = 10 cm (dm).
// X = bar axis (centre at 0, ends at ±11), Y up, Z toward camera. Bar axis floats at Y0 over a dark floor.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, eio, eo, track, monotone } from '/core/lib.js';
import { initOverlay, drawOverlay, overlayTexts } from './overlay.js';

const W = 1080, H = 1920;
const Q = new URLSearchParams(location.search);
const SSAA = +(Q.get('ssaa') || 1);
const TL = await (await fetch('timeline.json')).json();
const VDUR = await (await fetch('voice/dur.json')).json();
const DUR = TL.dur;
const CUES = []; for (const v of TL.vo) { const d = VDUR[v.id]; const n = v.chunks.map(c => c.replace(/[^A-Za-z0-9]/g, '').length + 2), tot = n.reduce((a, b) => a + b, 0); let t = v.t; v.chunks.forEach((c, i) => { CUES.push({ id: v.id, i, t }); t += d * n[i] / tot; }); }
const cue = (id, i) => CUES.find(c => c.id === id && c.i === i).t;
const T = {
  apart: cue('v01', 2), comp: cue('v02', 0), kg: cue('v02', 1), len: cue('v02', 2),
  shaft: cue('v03', 0), dia: cue('v03', 1), psi: cue('v03', 2), tears: cue('v04', 0), yld: cue('v04', 1), springs: cue('v04', 2),
  knurl: cue('v05', 0), points: cue('v05', 1), bite: cue('v05', 2), rings: cue('v06', 0), ck: cue('v06', 1), shoulders: cue('v06', 2),
  sleeves: cue('v07', 0), bush: cue('v07', 1), needle: cue('v07', 2),
  snatch: cue('v08', 0), flips: cue('v08', 1), split: cue('v08', 2), spinsl: cue('v08', 3), stay: cue('v08', 4),
  snap: cue('v09', 0), caps: cue('v09', 1), collars: cue('v09', 2),
  load: cue('v10', 0), dip: cue('v10', 1), store: cue('v10', 2), snap2: cue('v10', 3),
  payoff: cue('v11', 0), spring: cue('v11', 1), next: cue('v12', 0), congrats: cue('v13', 0), card: cue('v13', 1),
};
T.v11 = TL.vo.find(v => v.id === 'v11').t;
window.T = T;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, .05, 400);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, ao: false });
post.bloom.strength = .4; post.bloom.radius = .5; post.bloom.threshold = 2.0;
post.vig.uniforms.amt.value = .34; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .1;
{
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createRadialGradient(560, 860, 80, 540, 960, 1500); gr.addColorStop(0, '#34363a'); gr.addColorStop(.45, '#222427'); gr.addColorStop(1, '#0d0e10');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = .6; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff1e2', 1.7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 90 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 5, 16, 5); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .6, 14, 14); scene.add(top);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .22));

// ---------- bend (whip): every bar material is deformed in world space, y += A · w(|x|) ----------
const Y0 = 4, HALF = 11;
const U = { uA: { value: 0 }, uG: { value: 0 }, uP: { value: 2 } };
const bendW = (x, G = U.uG.value, P = U.uP.value) => Math.pow(Math.max(0, Math.abs(x) - G) / (HALF - G), P);
const bendY = x => U.uA.value * bendW(x);
const bendVert = s => {
  Object.assign(s.uniforms, U);
  s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uA, uG, uP;')
    .replace('#include <project_vertex>', `vec4 bwp = modelMatrix * vec4(transformed, 1.0);
bwp.y += uA * pow(max(0.0, abs(bwp.x) - uG) / (${HALF.toFixed(1)} - uG), uP);
vec4 mvPosition = viewMatrix * bwp; gl_Position = projectionMatrix * mvPosition;`);
};
const bendable = m => { m.onBeforeCompile = bendVert; return m; };

// ---------- materials ----------
const M = {
  floor: new THREE.MeshPhysicalMaterial({ color: '#1d1e21', roughness: .85 }),
  shaft: new THREE.MeshPhysicalMaterial({ color: '#d2d5d9', roughness: .3, metalness: 1 }),
  steel: bendable(new THREE.MeshPhysicalMaterial({ color: '#c3c7cc', roughness: .22, metalness: 1, side: THREE.DoubleSide })),
  bore: bendable(new THREE.MeshStandardMaterial({ color: '#6c7076', roughness: .5, metalness: 1, side: THREE.DoubleSide })),
  dark: bendable(new THREE.MeshPhysicalMaterial({ color: '#2c3036', roughness: .35, metalness: .9 })),
  needle: bendable(new THREE.MeshStandardMaterial({ color: '#e8ebee', roughness: .12, metalness: 1, emissive: '#59d4ff', emissiveIntensity: 0 })),
  cage: bendable(new THREE.MeshPhysicalMaterial({ color: '#3a3f46', roughness: .4, metalness: .8 })),
  bronze: bendable(new THREE.MeshPhysicalMaterial({ color: '#c08a4a', roughness: .3, metalness: 1, emissive: '#ff6b3d', emissiveIntensity: 0 })),
  rubber: bendable(new THREE.MeshPhysicalMaterial({ color: '#c3302b', roughness: .62, clearcoat: .15 })),
  white: bendable(new THREE.MeshPhysicalMaterial({ color: '#f1efe9', roughness: .6 })),
  collar: bendable(new THREE.MeshPhysicalMaterial({ color: '#2f6fe0', roughness: .4, clearcoat: .5 })),
  ring: bendable(new THREE.MeshPhysicalMaterial({ color: '#202327', roughness: .3, metalness: .9, emissive: '#ff6b3d', emissiveIntensity: 0 })),
  cut: new THREE.MeshPhysicalMaterial({ color: '#b9bec4', roughness: .55, metalness: .9, emissive: '#ff6b3d', emissiveIntensity: .0 }),
  hand: bendable(new THREE.MeshPhysicalMaterial({ color: '#f1efe9', roughness: .7, transparent: true, opacity: .0, depthWrite: false })),
  stripe: bendable(new THREE.MeshStandardMaterial({ color: '#ff6b3d', roughness: .5, emissive: '#ff6b3d', emissiveIntensity: .6 })),
  glow: bendable(new THREE.MeshBasicMaterial({ color: '#ff6b3d', transparent: true, opacity: 0, depthWrite: false })),
};
// shaft: procedural diamond knurl (object space, so it turns with the shaft) + bend
const KN = { uKn: { value: 1 }, uHi: { value: 0 }, uCk: { value: 0 } };
M.shaft.onBeforeCompile = s => {
  bendVert(s); Object.assign(s.uniforms, KN);
  s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
  s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vObj; uniform float uKn, uHi, uCk;
float knMask(float x){ float a = abs(x);
  float c = 1.0 - smoothstep(0.58, 0.62, a);                        // centre knurl
  float m = smoothstep(2.08, 2.12, a) * (1.0 - smoothstep(6.18, 6.22, a)); // main knurl
  float r = 1.0 - smoothstep(0.03, 0.05, abs(a - 4.55));               // smooth ring = IWF mark (910 mm apart)
  return max(c, m * (1.0 - r)); }
float tri(float s){ return 1.0 - 2.0 * abs(fract(s) - 0.5); }
float knH(vec3 p){ float u = p.x * 80.0, v = atan(p.z, p.y) / 6.2831853 * 70.0; return min(tri(u + v), tri(u - v)); }`)
    .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `vec4 diffuseColor = vec4( diffuse, opacity );
float km = knMask(vObj.x) * uKn; float kfade = 1.0 - smoothstep(0.25, 0.7, fwidth(vObj.x * 80.0));
float ringm = 1.0 - smoothstep(0.03, 0.05, abs(abs(vObj.x) - 4.55)); float ckm = 1.0 - smoothstep(0.58, 0.62, abs(vObj.x));
diffuseColor.rgb *= mix(1.0, mix(0.62, 0.55 + 0.6 * knH(vObj), kfade), km);`)
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, mix(0.62, 0.45, kfade), km);')
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{ float h = knH(vObj) * km * kfade * 0.0016; vec2 dH = vec2(dFdx(h), dFdy(h));
  vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition); vec3 r1 = cross(sy, normal), r2 = cross(normal, sx); float det = dot(sx, r1);
  vec3 gr = sign(det) * (dH.x * r1 + dH.y * r2); normal = normalize(abs(det) * normal - gr); }`)
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, .42, .24) * (uHi * ringm * 1.4 + uCk * ckm * km * .5);');
};
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const axisX = g => g.rotateZ(-Math.PI / 2);   // geometry built along +Y → along +X
const cylX = (r, len, mat, x = 0, seg = 40, open = false) => { const g = axisX(new THREE.CylinderGeometry(r, r, len, seg, 1, open)); g.translate(x, 0, 0); return sh(new THREE.Mesh(g, mat)); };
const lathe = (pts, mat, seg = 64) => sh(new THREE.Mesh(axisX(new THREE.LatheGeometry(pts.map(([r, x]) => new THREE.Vector2(r, x)), seg)), mat));

// ---------- floor ----------
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), M.floor); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

// ---------- the bar ----------
const bar = new THREE.Group(); bar.position.y = Y0; scene.add(bar);
// shaft (turns as one piece): knurled grip section, journals running into the sleeves
const shaftG = new THREE.Group(); bar.add(shaftG);
shaftG.add(cylX(.14, 13.1, M.shaft, 0, 72));
shaftG.add(cylX(.125, 21.8, M.bore, 0, 32));
const stripe = sh(new THREE.Mesh(new THREE.BoxGeometry(12.6, .012, .03), M.stripe)); stripe.position.set(0, .137, 0); stripe.rotation.x = 0; shaftG.add(stripe);   // reference line for the turnover demo
const ckGlow = new THREE.Mesh(axisX(new THREE.CylinderGeometry(.19, .19, 1.2, 40, 1, true)), M.glow); bar.add(ckGlow);
// cross-section slice (shown during v03)
const slice = sh(new THREE.Mesh(axisX(new THREE.CylinderGeometry(.14, .14, .03, 48)), M.cut)); bar.add(slice);
// ghost hands (whip demo)
const hands = [-1, 1].map(s => { const m = new THREE.Mesh(axisX(new THREE.CapsuleGeometry(.24, .5, 6, 16)), M.hand); m.position.x = s * 2.6; bar.add(m); return m; });

// one sleeve end (built for the +x side, mirrored for −x)
function makeEnd(s) {
  const g = new THREE.Group(); g.scale.x = s; bar.add(g);
  const P = {};
  // sleeve with its inner collar (one part), hollow bore
  P.sleeve = new THREE.Group(); g.add(P.sleeve);
  P.sleeve.add(lathe([[.15, 6.55], [.36, 6.55], [.39, 6.58], [.39, 6.82], [.36, 6.85], [.25, 6.85], [.25, 10.98], [.235, 11.0], [.15, 11.0], [.15, 6.55]], M.steel));
  { const geos = []; for (let k = 0; k < 6; k++) geos.push(axisX(new THREE.TorusGeometry(.25, .004, 6, 48)).translate(7.2 + k * .6, 0, 0)); P.sleeve.add(sh(new THREE.Mesh(mergeGeometries(geos), M.bore))); }   // turned grooves
  P.sleeve.add(cylX(.15, 4.4, M.bore, 8.78, 32, true));
  // needle bearings: two packs on the journal (stay put when the sleeve slides off)
  P.needles = [];
  for (const x of [7.3, 10.3]) {
    const pk = new THREE.Group(); pk.position.x = x; g.add(pk); P.needles.push(pk);
    pk.add(cylX(.15, .05, M.cage, -.14, 32)); pk.add(cylX(.15, .05, M.cage, .14, 32));
    const geos = []; for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2; geos.push(axisX(new THREE.CylinderGeometry(.011, .011, .24, 8)).translate(0, Math.cos(a) * .137, Math.sin(a) * .137)); }
    pk.add(sh(new THREE.Mesh(mergeGeometries(geos), M.needle)));
  }
  // the alternative: bronze bushings (shown floating beside the journal)
  P.bush = new THREE.Group(); g.add(P.bush);
  for (const x of [7.3, 10.3]) P.bush.add(lathe([[.126, x - .28], [.15, x - .28], [.15, x + .28], [.126, x + .28], [.126, x - .28]], M.bronze, 40));
  // snap ring (C-shape) and end cap
  P.snap = new THREE.Group(); P.snap.position.x = 10.93; g.add(P.snap);
  { const tg = new THREE.TorusGeometry(.14, .016, 8, 48, Math.PI * 2 - .7); tg.rotateY(Math.PI / 2); P.snap.add(sh(new THREE.Mesh(tg, M.ring)));
    for (const a of [-.35, .35]) { const lug = sh(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .03, 12).rotateZ(Math.PI / 2), M.ring)); lug.position.set(0, -Math.cos(a) * .14, Math.sin(a) * .14 * 1.6); P.snap.add(lug); } }
  P.cap = new THREE.Group(); P.cap.position.x = 11.0; g.add(P.cap);
  P.cap.add(lathe([[0, 0], [.22, 0], [.235, .015], [.235, .045], [.2, .06], [.06, .065], [0, .07]], M.dark));
  // plates: 25 kg bumpers (Ø450 mm, red), no markings beyond a plain white index tab
  P.plates = [];
  for (let k = 0; k < 4; k++) {
    const p = new THREE.Group(); g.add(p); P.plates.push(p);
    p.add(lathe([[.45, -.31], [2.12, -.31], [2.22, -.27], [2.25, -.18], [2.25, .18], [2.22, .27], [2.12, .31], [.45, .31], [.45, -.31]], M.rubber, 72));
    p.add(lathe([[.255, -.33], [.46, -.33], [.46, .33], [.255, .33], [.255, -.33]], M.steel, 48));
    const tab = sh(new THREE.Mesh(new THREE.BoxGeometry(.03, .5, .22), M.white)); tab.position.set(.315, 1.55, 0); p.add(tab);
  }
  // spring/clamp collar
  P.collar = new THREE.Group(); g.add(P.collar);
  P.collar.add(lathe([[.255, -.17], [.38, -.17], [.38, .17], [.255, .17], [.255, -.17]], M.collar, 48));
  { const lv = sh(new THREE.Mesh(new THREE.BoxGeometry(.12, .5, .1), M.dark)); lv.position.set(0, .55, 0); lv.rotation.x = .25; P.collar.add(lv); }
  return { g, P };
}
const ends = [makeEnd(1), makeEnd(-1)];
const RE = ends[0].P;

// ---------- motion ----------
const ekK = t => eio(seg(t, T.sleeves - .25, T.sleeves + 1.1)) * (1 - eio(seg(t, T.snatch - .9, T.snatch + .1)));   // sleeve teardown
const hwK = t => eio(seg(t, T.snap - .2, T.snap + .9)) * (1 - eio(seg(t, T.load - .7, T.load + .1)));               // end hardware teardown
const nPl = t => t < T.snatch - .5 ? 0 : t < T.load ? 1 : 4;
const plateIn = (t, k) => { const t0 = k === 0 ? T.snatch - .5 : T.load + .1 + (k - 1) * .32; return eo(seg(t, t0, t0 + .55)); };
// whip: centre path for the jerk (dip, drive), ends respond as a damped oscillator to the centre's acceleration
const yPath = monotone([[T.load, 0], [T.dip + .15, 0], [T.store - .1, -.55], [T.snap2 + .15, .95], [T.payoff - .6, .95], [T.payoff + 1.6, 0], [DUR + 1, 0]]);
const WH = (() => {
  const dt = 1 / 240, t0 = T.load, n = Math.ceil((DUR + 1 - t0) / dt), A = new Float32Array(n);
  const acc = t => (yPath(t + dt) - 2 * yPath(t) + yPath(t - dt)) / (dt * dt);
  const w = 2 * Math.PI * 1.7, z = .13; let x = 0, v = 0, mn = 0;
  for (let i = 0; i < n; i++) { const t = t0 + i * dt; const a = -w * w * x - 2 * z * w * v - acc(t); v += a * dt; x += v * dt; A[i] = x; mn = Math.min(mn, x); }
  const k = 1.4 / -mn; for (let i = 0; i < n; i++) A[i] *= k;
  return t => { const f = (t - t0) / dt; if (f <= 0) return 0; const i = Math.min(n - 2, Math.floor(f)); return lerp(A[i], A[i + 1], f - i); };
})();
window.WH = WH;
const bend4 = t => { if (t < T.yld - .3 || t > T.knurl) return 0; const ts = T.springs + .15; if (t < ts) return -1.0 * eio(seg(t, T.yld - .2, T.yld + .9)); const u = t - ts; return -1.0 * Math.exp(-3 * u) * Math.cos(2 * Math.PI * 1.8 * u); };
function bendAt(t) {
  if (t < T.load) { U.uA.value = bend4(t); U.uG.value = 0; U.uP.value = 2; }
  else { U.uA.value = WH(t); U.uG.value = 2.6; U.uP.value = 1.6; }
}
// shaft turnover (wrists flip): two half-turns while sleeves and plates stay still
const shaftRot = t => -Math.PI * (eio(seg(t, T.flips, T.flips + .9)) + eio(seg(t, T.spinsl, T.spinsl + .9)));
// sleeve spin: while exploded (v07) and in the hero shots at the end
const sleeveSpin = t => { let a = 0; for (let x = 0; x < t; x += 1 / 48) a += ((x > T.sleeves + 1 && x < T.snatch - .9) ? 2.4 : (x > T.payoff ? 1.6 : 0)) / 48; return a; };

// ---------- camera: [t, az°, el°, dist, tx, ty, tz, roll°] ----------
const CAMK = [
  [0.0, 46, 16, 52, 0, 4.4, 0, 0],
  [T.apart + .4, 40, 12, 46, 0, 4.2, 0, 0],
  [T.comp + .5, 0, 8, 47, 0, 4, 0, 90],
  [T.len + .9, 4, 10, 47, 0, 4, 0, 90],
  [T.shaft + .7, 25, 10, 4.6, 3, 4.15, 0, 0],
  [T.psi + .8, 38, 14, 5.0, 3, 4.35, 0, 0],
  [T.tears + .7, 62, 10, 40, 0, 4, 0, 0],
  [T.springs + 1.2, 60, 10, 40, 0, 4, 0, 0],
  [T.knurl + .5, 14, 8, 1.7, 3.2, 4, 0, 0],
  [T.bite + .4, 34, 16, 1.45, 3.35, 4, 0, 0],
  [T.rings + .6, 0, 72, 25, 0, 4, 0, 90],
  [T.shoulders + .3, 0, 64, 13, 0, 4, 0, 90],
  [T.sleeves + .9, 12, 12, 30, 12.6, 4, 0, 90],
  [T.bush + .2, 16, 12, 22, 11.4, 4, 0, 90],
  [T.needle + .6, 20, 14, 10, 8.8, 4, 0, 90],
  [T.snatch + .5, 52, 12, 19, 6.2, 4, 0, 0],
  [T.stay + .5, 46, 12, 18, 6.0, 4, 0, 0],
  [T.snap + .7, 28, 10, 21, 11.8, 4, 0, 90],
  [T.collars + .8, 30, 12, 21, 11.4, 4, 0, 90],
  [T.load + .9, 30, 8, 36, 5.6, 4.2, 0, 0],
  [T.snap2 + .8, 28, 8, 36, 5.6, 4.6, 0, 0],
  [T.payoff + .5, 44, 16, 58, 0, 4.0, 0, 0],
  [T.next + .5, 40, 18, 60, 0, 3.8, 0, 0],
  [DUR, 34, 20, 64, 0, 3.8, 0, 0],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz, roll] = camTrack(t); const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.up.set(0, 1, 0);
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.rotateZ(roll * Math.PI / 180); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 26 * dist; post.dof.maxCoc = 10;
  const la = A - .9; key.position.set(tx + 16 * Math.sin(la), ty + 18, tz + 16 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 12 * Math.sin(A + Math.PI * .85), ty + 4, tz + 12 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 12, tz); top.lookAt(tx, ty, tz);
  return dist;
}

// ---------- events (sound) ----------
const EV = [{ t: T.apart, type: 'lift' }, { t: T.kg, type: 'label' }, { t: T.len, type: 'label' }, { t: T.dia, type: 'lift' }, { t: T.psi, type: 'label' },
  { t: T.yld, type: 'creak' }, { t: T.springs + .15, type: 'twang' }, { t: T.points, type: 'label' }, { t: T.rings, type: 'label' }, { t: T.ck, type: 'label' },
  { t: T.sleeves - .2, type: 'spread' }, { t: T.sleeves + .9, type: 'spin' }, { t: T.bush, type: 'label' }, { t: T.needle, type: 'label' }, { t: T.snatch - .1, type: 'land' },
  { t: T.snatch - .5 + .5, type: 'clunk' }, { t: T.flips, type: 'spin' }, { t: T.spinsl, type: 'spin' },
  { t: T.snap - .15, type: 'spread' }, { t: T.snap + .3, type: 'label' }, { t: T.caps, type: 'label' }, { t: T.collars, type: 'label' }, { t: T.load - .2, type: 'land' },
  { t: T.store - .1, type: 'whip' }, { t: T.snap2, type: 'twang' }, { t: T.payoff + .3, type: 'spin' }, { t: T.next, type: 'card' }, { t: T.card, type: 'card' }];
for (let k = 1; k < 4; k++) EV.push({ t: +(T.load + .1 + (k - 1) * .32 + .5).toFixed(2), type: 'clunk' });
window.EV = EV.map(e => ({ ...e, t: +e.t.toFixed(2) })).sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
window.render = t => {
  const ek = ekK(t), hk = hwK(t), n = nPl(t);
  bendAt(t);
  bar.position.y = Y0 + (t >= T.load ? yPath(t) : 0);
  shaftG.rotation.x = shaftRot(t);
  stripe.visible = t > T.snatch - .3 && t < T.snap;
  const spin = sleeveSpin(t);
  for (const { P } of ends) {
    P.sleeve.position.x = 5.6 * ek; P.sleeve.rotation.x = spin;
    P.snap.position.x = 10.93 + 7.2 * ek + 2.6 * hk; P.cap.position.x = 11.0 + 8.4 * ek + 4.0 * hk; P.cap.rotation.x = spin; P.snap.rotation.z = 1.2 * hk; P.cap.rotation.z = 1.2 * hk; P.snap.scale.setScalar(1 + 1.6 * hk); P.cap.scale.setScalar(1 + 1.4 * hk);
    P.needles.forEach(pk => pk.rotation.x = spin * .5);
    const bk = ss(seg(t, T.bush - .1, T.bush + .4)) * (1 - ss(seg(t, T.snatch - 1, T.snatch - .5)));
    P.bush.visible = bk > .01; P.bush.position.set(0, 1.1 * bk, 0); P.bush.scale.setScalar(Math.max(bk, .01));
    P.plates.forEach((p, k) => { const pin = plateIn(t, k); p.visible = k < n && pin > 0; p.position.x = lerp(19, 6.9 + .31 + k * .62, pin) + 5.6 * ek; p.rotation.x = spin; });
    const cx = 6.9 + n * .62 + .17, cin = n ? eo(seg(t, (n === 1 ? T.snatch - .1 : T.load + 1.2), (n === 1 ? T.snatch + .4 : T.load + 1.7))) : 0;
    P.collar.visible = n > 0 && cin > 0; P.collar.position.x = lerp(17, cx, cin) + 4.4 * hk; P.collar.rotation.x = spin;
  }
  M.needle.emissiveIntensity = (t > T.needle && t < T.snatch - .8) ? .25 + .2 * Math.sin(t * 6) : 0;
  M.bronze.emissiveIntensity = (t > T.bush && t < T.needle) ? .12 + .08 * Math.sin(t * 6) : 0;
  M.ring.emissiveIntensity = (t > T.snap + .2 && t < T.caps) ? .5 : 0;
  KN.uHi.value = (t > T.rings - .1 && t < T.ck) ? .6 + .4 * Math.sin(t * 6) : 0;
  KN.uCk.value = (t > T.ck && t < T.sleeves - .3) ? .6 + .4 * Math.sin(t * 6) : 0;
  ckGlow.visible = false;
  // cross-section slice rises out of the shaft
  const sk = eio(seg(t, T.dia - .3, T.dia + .5)) * (1 - eio(seg(t, T.tears - .2, T.tears + .4)));
  slice.visible = sk > .005; slice.position.set(3, .9 * sk, 0); slice.scale.setScalar(1 + 1.0 * sk); slice.rotation.y = -.5 * sk; M.cut.emissiveIntensity = .04 * sk;
  M.hand.opacity = .28 * ss(seg(t, T.load + .3, T.dip)) * (1 - ss(seg(t, T.payoff - .5, T.payoff + .3))); hands.forEach(h => h.visible = M.hand.opacity > .01);
  const dist = setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, Y0: bar.position.y, bendY, RE, ek, hk, n, WH, yPath });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
