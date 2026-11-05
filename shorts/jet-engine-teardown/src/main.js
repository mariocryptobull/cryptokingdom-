// How a Jet Engine Works — Exploded Teardown, 1080×1920. A schematic two-spool high-bypass turbofan on a display plinth,
// shown as a cutaway (the near half of the nacelle and core cowl lifts off), exploded along its axis, then run with
// air-flow particles: blue bypass stream around the core, core stream that heats from blue to orange.
// Units: model units (schematic, not to scale). X = engine axis (air flows +x, intake on the left), Y up, Z toward camera.
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
  q2: cue('v01', 1), apart: cue('v01', 2), turbofan: cue('v02', 0), every: cue('v02', 1), grab: cue('v02', 2), back: cue('v02', 3),
  fan: cue('v03', 0), most: cue('v03', 1), never: cue('v03', 2), around: cue('v03', 3), bypass: cue('v03', 4), thrust: cue('v03', 5),
  core: cue('v04', 0), squeeze: cue('v04', 1), stage: cue('v04', 2), ratio: cue('v04', 3),
  comb: cue('v05', 0), fuel: cue('v05', 1), burn: cue('v05', 2), torch: cue('v05', 3),
  turb: cue('v06', 0), spins: cue('v06', 1), shaft: cue('v06', 2), drive: cue('v06', 3),
  nozzle: cue('v07', 0), goback: cue('v07', 1), fwd: cue('v07', 2), newton: cue('v07', 3),
  cycle: cue('v08', 0), allat: cue('v08', 1), cfm: cue('v09', 0), five: cue('v09', 1), ratio5: cue('v09', 2), lbf: cue('v09', 4),
  congrats: cue('v10', 0), card: cue('v10', 1),
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
post.bloom.strength = .5; post.bloom.radius = .5; post.bloom.threshold = 1.6;
post.vig.uniforms.amt.value = .34; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .06;
{
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createRadialGradient(560, 860, 80, 540, 960, 1500); gr.addColorStop(0, '#33363b'); gr.addColorStop(.45, '#212327'); gr.addColorStop(1, '#0c0d0f');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = .6; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff1e2', 1.7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 80 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 5, 16, 5); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .6, 14, 14); scene.add(top);
const glow = new THREE.PointLight('#ff8a3a', 0, 4, 1.6); scene.add(glow);   // combustor light
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .25));

// ---------- materials ----------
const M = {
  base: new THREE.MeshPhysicalMaterial({ color: '#202226', roughness: .75, metalness: .1 }),
  nacelle: new THREE.MeshPhysicalMaterial({ color: '#cfccc5', roughness: .5, metalness: .1, clearcoat: .3, side: THREE.DoubleSide }),
  cowl: new THREE.MeshPhysicalMaterial({ color: '#c9cdd2', roughness: .3, metalness: .6, clearcoat: .4, side: THREE.DoubleSide }),
  cut: new THREE.MeshPhysicalMaterial({ color: '#e0582c', roughness: .7, side: THREE.DoubleSide }),
  spinner: new THREE.MeshPhysicalMaterial({ color: '#d9dde1', roughness: .2, metalness: .9, clearcoat: .6 }),
  fan: new THREE.MeshPhysicalMaterial({ color: '#9aa3ad', roughness: .28, metalness: 1, clearcoat: .3, side: THREE.DoubleSide }),
  cmp: new THREE.MeshPhysicalMaterial({ color: '#b9c0c8', roughness: .25, metalness: 1, side: THREE.DoubleSide }),
  stator: new THREE.MeshStandardMaterial({ color: '#6b737c', roughness: .4, metalness: .8, side: THREE.DoubleSide }),
  drum: new THREE.MeshStandardMaterial({ color: '#4a5056', roughness: .4, metalness: .8 }),
  liner: new THREE.MeshPhysicalMaterial({ color: '#c8b49a', roughness: .4, metalness: .7, side: THREE.DoubleSide }),
  inj: new THREE.MeshStandardMaterial({ color: '#d4d8dc', roughness: .15, metalness: 1 }),
  turb: new THREE.MeshPhysicalMaterial({ color: '#b38a5e', roughness: .3, metalness: 1, side: THREE.DoubleSide }),
  plug: new THREE.MeshPhysicalMaterial({ color: '#8c7a68', roughness: .35, metalness: .9 }),
  shaft: new THREE.MeshStandardMaterial({ color: '#d4d8dc', roughness: .15, metalness: 1 }),
  shaftHP: new THREE.MeshStandardMaterial({ color: '#2f6fe0', roughness: .3, metalness: .5 }),
  flame: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, .8, .2), transparent: true, opacity: .5, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }),
};
for (const k of ['fan', 'cmp', 'liner', 'turb', 'shaft', 'shaftHP', 'plug', 'inj']) { M[k].emissive = new THREE.Color('#ff6b3d'); M[k].emissiveIntensity = 0; }
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
// lathe around the x axis from a profile of [r, x] points. part: 'full' | 'back' (z ≤ 0) | 'front' (z ≥ 0)
const latheG = (pts, part = 'full', segs = 72) => { const phi = part === 'back' ? Math.PI / 2 : part === 'front' ? -Math.PI / 2 : 0, len = part === 'full' ? Math.PI * 2 : Math.PI;
  const g = new THREE.LatheGeometry(pts.map(([r, x]) => new THREE.Vector2(r, x)), segs, phi, len); g.rotateZ(-Math.PI / 2); return g; };
const lathe = (pts, mat, part, segs) => sh(new THREE.Mesh(latheG(pts, part, segs), mat));
// section cap (the cut face of a closed profile) at z = 0, top and bottom
const caps = (pts, mat) => { const s = new THREE.Shape(pts.map(([r, x]) => new THREE.Vector2(x, r))); const a = new THREE.ShapeGeometry(s), b = new THREE.ShapeGeometry(s); b.scale(1, -1, 1); return sh(new THREE.Mesh(mergeGeometries([a, b]), mat)); };
const cylX = (r1, r2, len, mat, seg = 32) => { const g = new THREE.CylinderGeometry(r1, r2, len, seg); g.rotateZ(Math.PI / 2); return sh(new THREE.Mesh(g, mat)); };
// ring of blades: n blades from rHub to rTip, chord along x, pitched toward the tangential direction, twisted along span
function bladeRing(n, rHub, rTip, chord, thick, pitch, twist = 0, segs = 1) {
  const geos = [];
  for (let k = 0; k < n; k++) for (let s = 0; s < segs; s++) {
    const r0 = lerp(rHub, rTip, s / segs), r1 = lerp(rHub, rTip, (s + 1) / segs);
    const g = new THREE.BoxGeometry(chord * (1 - .15 * s / segs), r1 - r0 + .004, thick);
    g.rotateY(pitch + twist * (s + .5) / segs); g.translate(0, (r0 + r1) / 2, 0); g.rotateX(k * Math.PI * 2 / n); geos.push(g);
  }
  return mergeGeometries(geos);
}

// ---------- dimensions ----------
const CY = 2.25;   // engine axis height above the plinth
scene.add(box(8.0, .12, 2.6, M.base, -.3, .06, -.2));
const eng = new THREE.Group(); eng.position.y = CY; scene.add(eng);
const P = {};   // sections: { g, dx } exploded spread along x
const part = (name, dx) => { const g = new THREE.Group(); eng.add(g); P[name] = { g, dx }; return g; };

// nacelle (closed profile: inlet lip → outer skin → trailing edge → inner duct wall)
const NAC = [[1.31, -3.15], [1.40, -3.13], [1.47, -3.0], [1.50, -2.6], [1.48, -1.6], [1.41, -.9], [1.33, -.42], [1.30, -.42], [1.27, -.9], [1.27, -2.0], [1.28, -2.75], [1.27, -3.02], [1.31, -3.15]];
// core cowl / core casing (outer cowl skin, then the inner gas-path wall back to front)
const COWL = [[.625, -2.15], [.67, -2.0], [.72, -1.6], [.74, -1.1], [.74, .3], [.71, .9], [.63, 1.62], [.60, 1.62], [.60, 1.45], [.50, .66], [.53, .58], [.53, 0], [.42, -.12], [.55, -1.45], [.61, -1.65], [.62, -2.1], [.625, -2.15]];
// lid: near halves, lifted off after the hook
const lid = new THREE.Group(); eng.add(lid);
lid.add(lathe(NAC, M.nacelle, 'front'), lathe(COWL, M.cowl, 'front'));

// fan section: spinner, 24 wide-chord blades, nacelle back half
const fanP = part('fan', -1.75);
const nacBack = lathe(NAC, M.nacelle, 'back'); fanP.add(nacBack, caps(NAC, M.cut));
const FANX = -2.42;
const fanSpin = new THREE.Group(); fanSpin.position.x = FANX; fanP.add(fanSpin);
fanSpin.add(sh(new THREE.Mesh(bladeRing(24, .3, 1.24, .36, .024, .55, .55, 4), M.fan)));
fanSpin.add(lathe([[0, -.55], [.1, -.47], [.22, -.3], [.31, -.1], [.33, .08], [.33, .2], [0, .2]], M.spinner, 'full', 48));
// booster (low-pressure compressor): 3 stages
const lpcP = part('lpc', -1.05);
const lpcSpin = new THREE.Group(); lpcP.add(lpcSpin);
[-2.02, -1.87, -1.72].forEach((x, i) => { const r = sh(new THREE.Mesh(bladeRing(34, .32, .58 - i * .01, .07, .012, .6), M.cmp)); r.position.x = x; lpcSpin.add(r);
  const s = sh(new THREE.Mesh(bladeRing(38, .32, .585 - i * .01, .05, .01, -.45), M.stator)); s.position.x = x + .07; lpcP.add(s); });
{ const d = cylX(.31, .31, .44, M.drum); d.position.x = -1.86; lpcSpin.add(d); }
// high-pressure compressor: 9 stages, annulus shrinking toward the back
const hpcP = part('hpc', -.4);
const hpcSpin = new THREE.Group(); hpcP.add(hpcSpin);
const HPCX = []; for (let i = 0; i < 9; i++) HPCX.push(-1.4 + i * .145);
HPCX.forEach((x, i) => { const u = i / 8, tip = lerp(.53, .41, u), hub = lerp(.28, .315, u);
  const r = sh(new THREE.Mesh(bladeRing(36, hub, tip, .06, .01, .62), M.cmp)); r.position.x = x; hpcSpin.add(r);
  const s = sh(new THREE.Mesh(bladeRing(40, hub, tip + .005, .045, .009, -.5), M.stator)); s.position.x = x + .065; hpcP.add(s); });
{ const g = new THREE.CylinderGeometry(.315, .28, 1.3, 32); g.rotateZ(Math.PI / 2); const d = sh(new THREE.Mesh(g, M.drum)); d.position.x = -.82; hpcSpin.add(d); }
// combustor: annular liner (back half), ring of fuel injectors, flame ring
const combP = part('comb', .35);
combP.add(lathe([[.33, .57], [.33, .08], [.38, -.05], [.48, -.05], [.52, .08], [.52, .57]], M.liner, 'back', 56));
const INJ = []; for (let k = 0; k < 20; k++) { const a = k * Math.PI * 2 / 20; const m = cylX(.018, .03, .14, M.inj, 10); m.position.set(-.08, Math.cos(a) * .43, Math.sin(a) * .43); combP.add(m); INJ.push(m); }
const flame = new THREE.Mesh(new THREE.TorusGeometry(.43, .055, 12, 64), M.flame); flame.rotation.y = Math.PI / 2; flame.scale.set(1, 1, 4.2); flame.position.x = .26; combP.add(flame);
const flame2 = new THREE.Mesh(new THREE.TorusGeometry(.43, .03, 10, 64), M.flame); flame2.rotation.y = Math.PI / 2; flame2.scale.set(1, 1, 2.5); flame2.position.x = .08; combP.add(flame2);
// high-pressure turbine: 1 stage (on the HP spool with the compressor)
const hptP = part('hpt', .95);
const hptSpin = new THREE.Group(); hptP.add(hptSpin);
{ const v = sh(new THREE.Mesh(bladeRing(36, .3, .49, .06, .012, .55), M.stator)); v.position.x = .62; hptP.add(v);
  const r = sh(new THREE.Mesh(bladeRing(44, .3, .48, .07, .012, -.75), M.turb)); r.position.x = .72; hptSpin.add(r);
  const d = cylX(.3, .3, .1, M.drum); d.position.x = .72; hptSpin.add(d); }
// low-pressure turbine: 4 stages, growing (drives the fan and booster)
const lptP = part('lpt', 1.5);
const lptSpin = new THREE.Group(); lptP.add(lptSpin);
[.9, 1.07, 1.24, 1.41].forEach((x, i) => { const tip = .51 + i * .03;
  const v = sh(new THREE.Mesh(bladeRing(40, .32, tip + .005, .05, .01, .5), M.stator)); v.position.x = x - .065; lptP.add(v);
  const r = sh(new THREE.Mesh(bladeRing(48, .32, tip, .06, .011, -.65), M.turb)); r.position.x = x; lptSpin.add(r); });
{ const d = cylX(.32, .32, .62, M.drum); d.position.x = 1.15; lptSpin.add(d); }
// exhaust plug
const plugP = part('plug', 2.1);
plugP.add(lathe([[0, 2.45], [.08, 2.32], [.2, 2.0], [.3, 1.66], [.32, 1.5], [0, 1.5]], M.plug, 'full', 48));
// core cowl back half (slides back during the explode so the parts read in front of it)
const cowlP = part('cowl', 0);
cowlP.add(lathe(COWL, M.cowl, 'back'), caps(COWL, M.cut));
// shafts: LP (fan ↔ LPT) inside HP (HPC ↔ HPT); stretched between their sections in the exploded view
const lpShaft = cylX(.07, .07, 1, M.shaft, 16); eng.add(lpShaft);
const hpShaft = cylX(.15, .15, 1, M.shaftHP, 24); eng.add(hpShaft);

// ---------- air-flow particles ----------
const tab = k => x => { if (x <= k[0][0]) return k[0][1]; for (let i = 1; i < k.length; i++) if (x <= k[i][0]) return lerp(k[i - 1][1], k[i][1], (x - k[i - 1][0]) / (k[i][0] - k[i - 1][0])); return k[k.length - 1][1]; };
const XA = -4.6, XB = 4.6;
const coreHub = tab([[XA, .12], [-2.95, .12], [-2.45, .34], [-2.0, .33], [-1.45, .29], [-.15, .32], [0, .35], [.55, .35], [.65, .31], [1.45, .33], [2.4, .08], [XB, .08]]);
const coreTip = tab([[XA, .58], [-2.15, .58], [-1.65, .56], [-1.45, .51], [-.15, .40], [0, .5], [.55, .5], [.65, .47], [1.45, .59], [1.62, .58], [2.4, .52], [XB, .55]]);
const bypIn = tab([[XA, .66], [-2.15, .66], [-1.6, .76], [-1.1, .78], [.3, .78], [.9, .75], [1.62, .66], [XB, .68]]);
const bypOut = tab([[XA, 1.24], [-2.5, 1.24], [-.42, 1.24], [1.0, 1.18], [XB, 1.12]]);
const vCore = tab([[XA, 1.0], [-2.4, .9], [-2.0, .75], [-1.45, .62], [-.15, .3], [0, .38], [.55, .7], [.65, 1.5], [1.45, 2.3], [2.4, 2.9], [XB, 3.1]]);
const vByp = tab([[XA, 1.0], [-2.5, 1.0], [-2.3, 1.55], [-.42, 1.65], [1.0, 1.8], [XB, 1.9]]);
function path(v) { const N = 800, xs = [], ts = []; let Tt = 0; for (let i = 0; i <= N; i++) { const x = XA + (XB - XA) * i / N; xs.push(x); ts.push(Tt); Tt += (XB - XA) / N / v(x); } return { xs, ts, T: Tt }; }
const xAt = (p, tau) => { let lo = 0, hi = p.ts.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p.ts[m] <= tau) lo = m; else hi = m; } return lerp(p.xs[lo], p.xs[hi], (tau - p.ts[lo]) / (p.ts[hi] - p.ts[lo])); };
const PC = path(vCore), PB = path(vByp);
const cols = (k => x => { let i = 1; while (i < k.length - 1 && x > k[i][0]) i++; const [x0, c0] = k[i - 1], [x1, c1] = k[i]; return new THREE.Color(c0).lerp(new THREE.Color(c1), clamp((x - x0) / (x1 - x0))); });
const coreCol = cols([[XA, '#7cc6ff'], [-1.45, '#a9dcff'], [-.15, '#f4f8ff'], [.05, '#ffd27a'], [.5, '#ff9a30'], [.9, '#ff6a2e'], [2.4, '#ff7a45'], [XB, '#b56a52']]);
const bypCol = cols([[XA, '#6fc0ff'], [XB, '#4da8f5']]);
function stream(n, P, rIn, rOut, col, seed) {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 1, depthWrite: false, toneMapped: false });
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), mat, n); im.frustumCulled = false; scene.add(im);
  let r = seed; const R = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const ps = [...Array(n)].map(() => ({ ph: R(), q: .08 + .84 * R(), a: Math.PI + .12 + (Math.PI - .24) * R() }));
  return { im, mat, ps, P, rIn, rOut, col };
}
const SC = stream(300, PC, coreHub, coreTip, coreCol, 7), SB = stream(300, PB, bypIn, bypOut, bypCol, 13);
const dm = new THREE.Object3D(), cc = new THREE.Color();
function updStream(S, t, k, rate, size) {
  S.mat.opacity = k; S.im.visible = k > .01;
  if (!S.im.visible) return;
  S.ps.forEach((p, i) => {
    const tau = ((p.ph * S.P.T + t * rate) % S.P.T + S.P.T) % S.P.T, x = xAt(S.P, tau);
    const r = lerp(S.rIn(x), S.rOut(x), p.q), v = S === SC ? vCore(x) : vByp(x);
    const edge = ss(seg(x, XA, XA + .8)) * (1 - ss(seg(x, XB - 1.2, XB)));
    dm.position.set(x, CY + Math.cos(p.a) * r, Math.sin(p.a) * r);
    const s = size * edge; dm.scale.set(s * (1 + 1.6 * v), s * .7, s * .7); dm.updateMatrix(); S.im.setMatrixAt(i, dm.matrix);
    cc.copy(S.col(x)).multiplyScalar(1.15); S.im.setColorAt(i, cc);
  });
  S.im.instanceMatrix.needsUpdate = true; S.im.instanceColor.needsUpdate = true;
}

// ---------- motion ----------
const pop = x => 1 - Math.pow(1 - ss(x), 3);
const lidK = t => eio(seg(t, T.apart - .15, T.apart + .95));
const explK = t => pop(seg(t, T.apart + .45, T.apart + 1.7)) * (1 - eio(seg(t, T.grab - .7, T.grab + .5)));
// flow intensity [bypass, core]
const flowTrack = track([
  [0, [.75, .75]], [T.apart - .2, [.75, .75]], [T.apart + .3, [0, 0]], [T.grab + .2, [0, 0]], [T.grab + .8, [1, 1]],
  [T.never - .1, [1, 1]], [T.never + .5, [1, .12]], [T.core - .2, [1, .12]], [T.core + .4, [.22, 1]],
  [T.nozzle - .2, [.22, 1]], [T.nozzle + .4, [1, 1]], [DUR, [1, 1]],
]);
// part highlights: [fan, compressor, combustor, turbine, shaft, plug/nozzle]
const HL = (a, b, i) => ({ a, b, i });
const HLS = [HL(T.fan, T.never, 0), HL(T.squeeze, T.comb, 1), HL(T.fuel, T.turb, 2), HL(T.turb, T.shaft, 3), HL(T.shaft, T.nozzle, 4), HL(T.nozzle, T.goback + .6, 5)];
const PH = t => { if (t < T.cycle - .1 || t > T.cfm - .3) return -1; return Math.floor(((t - T.cycle) / ((T.cfm - .4 - T.cycle) / 4)) * 4) % 4; };
function hl(t) {
  const h = [0, 0, 0, 0, 0, 0];
  for (const s of HLS) h[s.i] = Math.max(h[s.i], ss(seg(t, s.a, s.a + .3)) * (1 - ss(seg(t, s.b - .3, s.b))));
  const ph = PH(t); if (ph >= 0) { const m = [[0], [1], [2], [3, 5]][ph]; for (const i of m) h[i] = Math.max(h[i], 1); }
  return h;
}

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, -38, 10, 17, -1.0, CY + .1, 0],
  [T.apart - .3, -30, 12, 18, -.7, CY + .1, 0],
  [T.apart + 1.7, -12, 16, 31, .1, CY + .2, 0],
  [T.grab - .4, -8, 18, 31.5, .1, CY + .2, 0],
  [T.grab + 1.0, 8, 12, 26, -.3, CY, 0],
  [T.fan + .7, -32, 10, 13, -2.0, CY, 0],
  [T.never + .3, -20, 10, 19, -1.2, CY, 0],
  [T.bypass + .3, -8, 9, 22, -.5, CY, 0],
  [T.core + .5, 6, 8, 11, -1.0, CY, 0],
  [T.ratio + .6, 12, 8, 10.5, -.7, CY, 0],
  [T.comb + .7, 18, 9, 9.5, .1, CY, 0],
  [T.torch + .8, 24, 9, 9.5, .25, CY, 0],
  [T.turb + .7, 22, 8, 10, .8, CY, 0],
  [T.shaft + .5, 8, 10, 21, -.3, CY, 0],
  [T.nozzle + .5, 28, 8, 12.5, 1.2, CY, 0],
  [T.fwd + .6, 8, 10, 25, .2, CY + .4, 0],
  [T.cycle + .5, 12, 13, 24, -.2, CY, 0],
  [T.cfm + .2, -16, 11, 19, -1.7, CY, 0],
  [T.ratio5 + .6, -6, 9, 23, -.4, CY, 0],
  [T.congrats, 14, 16, 22, -.2, CY + .2, 0],
  [DUR, 22, 20, 24, -.2, CY + .3, 0],
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
const EV = [{ t: 0, type: 'spool' }, { t: T.apart, type: 'lift' }, { t: T.apart + .5, type: 'spread' }, { t: T.grab - .1, type: 'land' }, { t: T.grab + .4, type: 'inhale' },
  { t: T.fan + .2, type: 'label' }, { t: T.bypass + .1, type: 'label' }, { t: T.squeeze + .2, type: 'label' }, { t: T.fuel, type: 'ignite' }, { t: T.comb + .2, type: 'label' },
  { t: T.turb + .2, type: 'label' }, { t: T.shaft + .2, type: 'label' }, { t: T.nozzle + .2, type: 'label' }, { t: T.goback, type: 'blast' },
  { t: T.cfm - .1, type: 'card' }, { t: T.card, type: 'card' }];
{ const step = (T.cfm - .4 - T.cycle) / 4; for (let i = 0; i < 4; i++) EV.push({ t: +(T.cycle + i * step).toFixed(2), type: ['tick', 'tick', 'ignite', 'blast'][i] }); }
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
window.render = t => {
  const lk = lidK(t), ek = explK(t);
  lid.position.set(0, 1.6 * lk, 5.5 * lk); lid.visible = lk < .999;
  for (const n of Object.keys(P)) P[n].g.position.x = P[n].dx * ek;
  P.cowl.g.position.z = -1.3 * ek;
  // shafts stretch between their sections
  const px = n => P[n].dx * ek;
  { const a = FANX + .1 + px('fan'), b = 1.45 + px('lpt'); lpShaft.scale.y = b - a; lpShaft.position.x = (a + b) / 2; }
  { const a = -1.45 + px('hpc'), b = .76 + px('hpt'); hpShaft.scale.y = b - a; hpShaft.position.x = (a + b) / 2; hpShaft.visible = ek < .02; }
  // spools (constant speeds, slow enough to read at 24 fps)
  const lp = t * 1.55, hp = t * 2.3;
  fanSpin.rotation.x = lp; lpcSpin.rotation.x = lp; lptSpin.rotation.x = lp; hpcSpin.rotation.x = hp; hptSpin.rotation.x = hp;
  // highlights
  const h = hl(t), em = (m, k, base = 0) => { m.emissiveIntensity = base + .32 * k * (.8 + .2 * Math.sin(t * 7)); };
  em(M.fan, h[0]); em(M.cmp, h[1]); em(M.liner, h[2]); em(M.turb, h[3], .05); em(M.shaft, h[4]); em(M.shaftHP, h[4]); em(M.plug, h[5]);
  M.inj.emissive.set('#59d4ff'); M.inj.emissiveIntensity = (t > T.fuel - .1 && t < T.burn + .6) ? .8 : 0;
  // flame: always lit while running, flares when the combustor is named
  const fl = .3 + .35 * h[2] + .08 * Math.sin(t * 23) + .05 * Math.sin(t * 37);
  M.flame.opacity = clamp(fl, 0, 1); flame.scale.z = 3.2 * (1 + .2 * h[2]); flame2.visible = true;
  glow.position.set(.26 + px('comb'), CY, .3); glow.intensity = .8 + 1.5 * h[2];
  // flow
  const [fb, fc] = flowTrack(t), vis = 1 - clamp(ek * 30);
  updStream(SB, t, fb * vis, 1.5, .028); updStream(SC, t, fc * vis, 1.5, .026);
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, CY, ek, P, FANX, ph: PH(t) });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
