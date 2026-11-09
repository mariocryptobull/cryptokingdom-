// How a Hydraulic Press Works — Exploded Teardown, 1080×1920. A schematic 20-ton H-frame shop press: frame, inverted
// cylinder (ram), separate hand pump on an oil reservoir, two check valves, hose, gauge and release valve. Cut-away
// shells (back half only) show the oil. Units: model units (schematic, not to scale). Y up, Z toward camera.
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
const CUES = []; for (const v of TL.vo) { const d = VDUR[v.id]; const n = v.chunks.map(c => c.replace(/[^A-Za-z0-9]/g, '').length + 2), tot = n.reduce((a, b) => a + b, 0); let t = v.t; v.chunks.forEach((c, i) => { CUES.push({ id: v.id, i, t }); t += d * n[i] / tot; }); }
const cue = (id, i) => CUES.find(c => c.id === id && c.i === i).t;
const vEnd = id => { const v = TL.vo.find(v => v.id === id); return v.t + VDUR[id]; };
const T = {
  arm: cue('v01', 2), oil: cue('v01', 3),
  apart: cue('v02', 0), frame: cue('v02', 2), cyl: cue('v02', 3),
  lift: cue('v03', 0), cv1: cue('v03', 2), push: cue('v03', 3), cv2: cue('v03', 4),
  back: cue('v04', 0), stack: cue('v04', 1), ram: cue('v04', 3),
  pascal: cue('v05', 0), equal: cue('v05', 2), fpa: cue('v05', 3),
  small: cue('v06', 0), big: cue('v06', 2), x26: cue('v06', 3),
  hand: cue('v07', 0), f1500: cue('v07', 1), psi: cue('v07', 3), f40k: cue('v07', 4), tons: cue('v07', 5),
  catch: cue('v08', 0), mm: cue('v08', 1), trade: cue('v08', 3),
  gauge: cue('v09', 0), rel: cue('v09', 1), drain: cue('v09', 2),
  can: cue('v10', 0), buckle: cue('v10', 1), half: cue('v10', 2), v10e: vEnd('v10'),
  next: cue('v11', 0), congrats: cue('v12', 0), card: cue('v12', 1),
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
post.vig.uniforms.amt.value = .34; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .1;
{
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createRadialGradient(560, 860, 80, 540, 960, 1500); gr.addColorStop(0, '#34363a'); gr.addColorStop(.45, '#222427'); gr.addColorStop(1, '#0d0e10');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = .55; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff1e2', 1.7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 80 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 3, 16, 5); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .6, 14, 14); scene.add(top);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .25));

// ---------- materials ----------
const M = {
  base: new THREE.MeshPhysicalMaterial({ color: '#2b2e33', roughness: .5, metalness: .3, clearcoat: .2 }),
  frame: new THREE.MeshPhysicalMaterial({ color: '#e14b2a', roughness: .38, metalness: .2, clearcoat: .6 }),
  steel: new THREE.MeshStandardMaterial({ color: '#4a5056', roughness: .45, metalness: .7, side: THREE.DoubleSide }),
  shell: new THREE.MeshPhysicalMaterial({ color: '#d9dde1', roughness: .35, metalness: .6, clearcoat: .5, side: THREE.DoubleSide }),
  chrome: new THREE.MeshStandardMaterial({ color: '#d4d8dc', roughness: .12, metalness: 1, emissive: '#59d4ff', emissiveIntensity: 0 }),
  chromeS: new THREE.MeshStandardMaterial({ color: '#d4d8dc', roughness: .12, metalness: 1, emissive: '#59d4ff', emissiveIntensity: 0 }),
  oil: new THREE.MeshPhysicalMaterial({ color: '#e0a21c', roughness: .15, clearcoat: 1, transmission: 0, emissive: '#ff9a1a', emissiveIntensity: .15 }),
  hose: new THREE.MeshPhysicalMaterial({ color: '#1d1e21', roughness: .55, clearcoat: .3 }),
  black: new THREE.MeshStandardMaterial({ color: '#16171a', roughness: .5, metalness: .3 }),
  brass: new THREE.MeshStandardMaterial({ color: '#c99a3c', roughness: .3, metalness: 1 }),
  ball: new THREE.MeshStandardMaterial({ color: '#eef2f5', roughness: .05, metalness: 1, emissive: '#ff6b3d', emissiveIntensity: 0 }),
  can: new THREE.MeshPhysicalMaterial({ color: '#2a8fd6', roughness: .3, metalness: .75, clearcoat: .8 }),
  canEnd: new THREE.MeshStandardMaterial({ color: '#c8ccd0', roughness: .25, metalness: 1 }),
  face: new THREE.MeshBasicMaterial({ color: '#59d4ff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
  faceO: new THREE.MeshBasicMaterial({ color: '#ff6b3d', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
};
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const cylY = (r, h, mat, x = 0, y = 0, z = 0, seg = 32) => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat)); m.position.set(x, y, z); return m; };
// back-half (z ≤ 0) open shell along y — the cut-away
const halfY = (r, h, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40, 1, true, Math.PI / 2, Math.PI), mat)); m.position.set(x, y, z); return m; };
const halfDiscY = (r, mat, x, y, z) => { const m = sh(new THREE.Mesh(new THREE.CircleGeometry(r, 40, 0, Math.PI), mat)); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); return m; };

// ---------- parts with explode offsets ----------
const P = {};
const part = (name, dx, dy, dz) => { const g = new THREE.Group(); scene.add(g); P[name] = { g, d: new THREE.Vector3(dx, dy, dz) }; return g; };

// floor plate
scene.add(box(7.4, .14, 3.2, M.base, .9, .07, 0));
// ---------- frame: two uprights, top beam, bed (bolster), feet ----------
const XU = 1.45, YB = 2.15, BEDT = YB + .2;   // upright x, bed centre, bed top
const uL = part('uprightL', -.7, 0, 0), uR = part('uprightR', .7, 0, 0), beam = part('beam', 0, 1.3, 0), bed = part('bed', 0, -.55, 0), feet = part('feet', 0, -.9, 0);
for (const [g, s] of [[uL, -1], [uR, 1]]) {
  for (const dz of [-.22, .22]) g.add(box(.22, 5.55, .1, M.frame, s * XU, 2.98, dz));
  g.add(box(.08, 5.55, .34, M.frame, s * XU, 2.98, 0));
  for (let y = 1.6; y < 4.6; y += .42) { const h = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .6, 12), M.black); h.rotation.x = Math.PI / 2; h.position.set(s * XU, y, 0); g.add(h); }
}
beam.add(box(3.25, .48, .2, M.frame, 0, 5.5, -.2)); beam.add(box(3.25, .48, .2, M.frame, 0, 5.5, .2)); beam.add(box(3.25, .06, .6, M.frame, 0, 5.77, 0));
bed.add(box(2.7, .4, .14, M.frame, 0, YB, -.24)); bed.add(box(2.7, .4, .14, M.frame, 0, YB, .24));
bed.add(box(1.2, .05, .7, M.steel, 0, BEDT + .025, 0));   // press plate on the bed
for (const s of [-1, 1]) { const pin = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .9, 12), M.chrome); pin.rotation.x = Math.PI / 2; pin.position.set(s * XU, YB - .3, 0); bed.add(sh(pin)); }
for (const s of [-1, 1]) feet.add(box(.5, .12, 1.7, M.frame, s * XU, .2, 0));

// ---------- main cylinder (inverted, hangs under the beam) ----------
const CYT = 5.26, CYB = 3.95, CR = .44, PR = .4;   // cylinder top/bottom, outer radius, bore
const cylG = part('cyl', 0, .35, .9);
cylG.add(halfY(CR, CYT - CYB, M.shell, 0, (CYT + CYB) / 2, 0));
cylG.add(box(1.0, .12, .9, M.steel, 0, CYT + .06, 0));   // mounting flange
cylG.add(halfDiscY(CR, M.steel, 0, CYB + .001, 0));
{ const g = new THREE.TorusGeometry(CR, .03, 8, 40, Math.PI); g.rotateX(Math.PI / 2); g.rotateY(Math.PI); for (const y of [CYT - .02, CYB + .03]) { const m = new THREE.Mesh(g, M.steel); m.position.y = y; cylG.add(m); } }
// oil column above the piston (scaled with ram travel)
const oilCol = sh(new THREE.Mesh(new THREE.CylinderGeometry(PR - .005, PR - .005, 1, 40).translate(0, -.5, 0), M.oil)); oilCol.position.y = CYT - .01; cylG.add(oilCol);
// ram: piston head + chrome rod + saddle
const ramG = part('ram', 0, -.45, .9);
const ramMov = new THREE.Group(); ramG.add(ramMov);
const RAM0 = CYT - .14;   // piston top at e = 0
const pistonHead = cylY(PR - .01, .12, M.steel, 0, RAM0 - .06, 0); ramMov.add(pistonHead);
const ramFace = new THREE.Mesh(new THREE.CircleGeometry(PR - .02, 40), M.face); ramFace.rotation.x = -Math.PI / 2; ramFace.position.y = RAM0 + .005; ramMov.add(ramFace);
const ROD = 1.35; ramMov.add(cylY(.31, ROD, M.chrome, 0, RAM0 - .12 - ROD / 2, 0, 40));
const SAD = RAM0 - .12 - ROD;   // saddle top at e = 0
ramMov.add(cylY(.36, .1, M.steel, 0, SAD - .05, 0, 40));
const ramTip = SAD - .1;        // lowest point of the ram at e = 0

// ---------- reservoir (horizontal tank), pump body, small piston, handle ----------
const PX = 2.35, RY = 2.15, RR = .26, PB = 2.48, PT = 3.25, PBR = .11;   // pump x, reservoir y, radius, pump bore bottom/top, bore radius
const resG = part('res', .9, -.8, 0);
{ const s = new THREE.Mesh(new THREE.CylinderGeometry(RR, RR, 1.3, 40, 1, true, Math.PI / 2, Math.PI), M.shell); s.rotation.z = Math.PI / 2; s.position.set(PX + .3, RY, 0); resG.add(sh(s));
  for (const x of [PX - .35, PX + .95]) { const c = new THREE.Mesh(new THREE.CircleGeometry(RR, 40), M.steel); c.rotation.y = Math.PI / 2; c.position.set(x, RY, 0); resG.add(c); }
  for (const x of [PX - .2, PX + .8]) resG.add(box(.12, RY - .35 - .14, .4, M.steel, x, (RY - .35 + .14) / 2 + .07, 0)); }
const resOil = sh(new THREE.Mesh(new THREE.CylinderGeometry(RR - .02, RR - .02, 1.26, 40).rotateZ(Math.PI / 2), M.oil)); resOil.position.set(PX + .3, RY - .04, 0); resOil.scale.set(1, .82, .82); resG.add(resOil);
const pumpG = part('pump', 1.0, .55, 0);
pumpG.add(halfY(PBR + .05, PT - PB, M.shell, PX, (PT + PB) / 2, 0));
pumpG.add(box(.5, .14, .5, M.steel, PX, PB - .07, 0));
const pumpOil = sh(new THREE.Mesh(new THREE.CylinderGeometry(PBR, PBR, 1, 24).translate(0, .5, 0), M.oil)); pumpOil.position.set(PX, PB, 0); pumpG.add(pumpOil);
const pMov = new THREE.Group(); pumpG.add(pMov);
const PP0 = 2.82;   // small piston bottom at mid-stroke
pMov.add(cylY(PBR - .005, .14, M.steel, PX, PP0 + .07, 0)); pMov.add(cylY(.045, .7, M.chromeS, PX, PP0 + .14 + .35, 0, 16));
const pumpFace = new THREE.Mesh(new THREE.CircleGeometry(PBR - .01, 24), M.faceO); pumpFace.rotation.x = Math.PI / 2; pumpFace.position.set(PX, PP0 - .004, 0); pMov.add(pumpFace);
// handle: pivot on a post behind the piston, lever reaching out to +x
const HPX = PX - .32, HPY = 3.72;
pumpG.add(box(.08, HPY - PT + .1, .08, M.steel, HPX, (HPY + PT) / 2, -.12));
const handle = new THREE.Group(); handle.position.set(HPX, HPY, 0); pumpG.add(handle);
handle.add(box(1.75, .07, .07, M.steel, .87, 0, 0)); handle.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .34, 16).rotateZ(Math.PI / 2), M.black)).translateX(1.75));
// check valves: inlet (reservoir → pump) and outlet (pump → hose); ball in a small housing
const cvG = part('cv', .2, .1, 1.0);
const cvIn = new THREE.Vector3(PX, PB - .2, 0), cvOut = new THREE.Vector3(PX - .3, PB + .06, 0);
const balls = [];
for (const c of [cvIn, cvOut]) {
  const hs = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .2, 24, 1, true, Math.PI / 2, Math.PI), M.brass); hs.position.copy(c); if (c === cvOut) hs.rotation.z = Math.PI / 2; cvG.add(sh(hs));
  const seat = new THREE.Mesh(new THREE.TorusGeometry(.045, .015, 8, 20), M.brass); seat.position.copy(c); if (c === cvOut) seat.rotation.y = Math.PI / 2; else seat.rotation.x = Math.PI / 2; cvG.add(seat);
  const b = sh(new THREE.Mesh(new THREE.SphereGeometry(.045, 20, 14), M.ball)); b.position.copy(c); cvG.add(b); balls.push({ b, c, ax: c === cvOut ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(0, 1, 0) });
}
// release valve: T-knob on the pump block, front
const relG = part('rel', 1.4, -.1, .7);
relG.add(cylY(.04, .25, M.brass, PX + .18, PB - .07, .32).rotateX(Math.PI / 2));
const relKnob = new THREE.Group(); relKnob.position.set(PX + .18, PB - .07, .46); relG.add(relKnob);
relKnob.add(box(.32, .06, .06, M.black)); relKnob.add(box(.06, .06, .06, M.brass));
// hose + gauge
const hoseG = part('hose', 0, 0, 0);
const hoseCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(PX - .4, PB + .06, 0), new THREE.Vector3(PX - .62, PB + .2, .1), new THREE.Vector3(1.95, 3.4, .25), new THREE.Vector3(1.9, 5.3, .32), new THREE.Vector3(1.75, 6.05, .25), new THREE.Vector3(.9, 6.15, .1), new THREE.Vector3(.12, 5.95, 0), new THREE.Vector3(0, 5.6, 0)]);
hoseG.add(sh(new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 160, .055, 12), M.hose)));
const gaugeG = part('gauge', .25, .55, .9);
const GP = hoseCurve.getPoint(.26).add(new THREE.Vector3(-.05, 0, .12));
const gaugeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#f4f2ec'; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill(); g.lineCap = 'round';
  for (let i = 0; i <= 50; i++) { const a = (-225 + 270 * i / 50) * Math.PI / 180, big = i % 5 === 0; g.strokeStyle = i >= 40 ? '#d23a1e' : '#222'; g.lineWidth = big ? 7 : 3; const r0 = big ? 180 : 200; g.beginPath(); g.moveTo(256 + Math.cos(a) * r0, 256 + Math.sin(a) * r0); g.lineTo(256 + Math.cos(a) * 228, 256 + Math.sin(a) * 228); g.stroke(); }
  g.fillStyle = '#222'; g.font = '700 46px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i <= 10; i += 2) { const a = (-225 + 27 * i) * Math.PI / 180; g.fillText(String(i), 256 + Math.cos(a) * 138, 256 + Math.sin(a) * 138); }
  g.font = '500 30px Inter, sans-serif'; g.fillText('PSI ×1000', 256, 380);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const gaugeFace = new THREE.Group(); gaugeFace.position.copy(GP); gaugeFace.rotation.y = .35; gaugeG.add(gaugeFace);
gaugeFace.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(.26, .26, .1, 40).rotateX(Math.PI / 2), M.steel)).translateZ(-.02));
{ const f = new THREE.Mesh(new THREE.CircleGeometry(.23, 48), new THREE.MeshStandardMaterial({ map: gaugeTex, roughness: .4 })); f.position.z = .035; gaugeFace.add(f); }
const needle = new THREE.Group(); needle.position.z = .045; gaugeFace.add(needle);
needle.add(new THREE.Mesh(new THREE.BoxGeometry(.012, .19, .01).translate(0, .08, 0), new THREE.MeshBasicMaterial({ color: '#d23a1e' })));
needle.add(new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .02, 16).rotateX(Math.PI / 2), M.black));
gaugeFace.add(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .2, 12).rotateX(Math.PI / 2), M.brass).translateZ(-.15));
// oil droplets travelling the hose
const DROPS = 34;
const drops = [...Array(DROPS)].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), M.oil); hoseG.add(m); return m; });

// ---------- soda can (plain, no branding) ----------
const CANR = .19, CANH = .69;
const canGeo = new THREE.CylinderGeometry(CANR, CANR, CANH, 64, 40, false);
canGeo.translate(0, CANH / 2, 0);
const canBase = canGeo.attributes.position.array.slice();
const can = sh(new THREE.Mesh(canGeo, M.can)); can.position.set(0, BEDT + .05, 0); bed.add(can);
const canRims = [0, 1].map(k => { const m = new THREE.Mesh(new THREE.TorusGeometry(CANR - .02, .018, 8, 40), M.canEnd); m.rotation.x = Math.PI / 2; bed.add(m); return m; });
function crushCan(c) {
  const p = canGeo.attributes.position.array, hk = 1 - .86 * c;
  for (let i = 0; i < p.length; i += 3) {
    const x = canBase[i], y = canBase[i + 1], z = canBase[i + 2], r = Math.hypot(x, z), th = Math.atan2(z, x), u = y / CANH;
    const fold = c > 0 ? c * (.32 + .22 * Math.sin(u * Math.PI * 9 + 3 * th) + .08 * Math.sin(5 * th + u * 20)) * Math.sin(Math.PI * clamp(u * 1.08)) : 0;
    const k = r > 1e-4 ? (r + CANR * fold * (r / CANR)) / r : 1;
    p[i] = x * k; p[i + 1] = y * hk + (c > 0 ? .012 * c * Math.sin(th * 3 + u * 40) * u * (1 - u) * 4 : 0); p[i + 2] = z * k;
  }
  canGeo.attributes.position.needsUpdate = true; canGeo.computeVertexNormals();
  canRims[0].position.set(0, BEDT + .07, 0); canRims[1].position.set(0, BEDT + .05 + CANH * hk - .01, 0);
}

// ---------- motion ----------
const pop = x => 1 - Math.pow(1 - ss(x), 3);
const explK = t => pop(seg(t, T.apart + .1, T.apart + 1.3)) * (1 - eio(seg(t, T.lift - 1.1, T.lift - .1)));
// pumping windows: [t0, t1, strokes/s]
const PUMPS = [[.6, T.oil + 1.2, 1.3], [T.back, T.ram + .4, 1.2], [T.mm - .3, T.trade + 1.2, 1.5], [T.can - .1, T.v10e + .6, 2.4]];
function handleA(t) {   // −1 = down, +1 = up
  // the slow demo stroke in v03: lift during "Lift the handle", push during "Push down"
  if (t > T.lift - .3 && t < T.back) return lerp(-1, 1, ss(seg(t, T.lift, T.lift + 1.4))) - 2 * ss(seg(t, T.push, T.push + 1.2));
  for (const [a, b, f] of PUMPS) if (t > a && t < b) { const k = ss(seg(t, a, a + .3)) * (1 - ss(seg(t, b - .3, b))); return -1 + 2 * k * (.5 - .5 * Math.cos(2 * Math.PI * f * (t - a))); }
  return -1;
}
// ram travel e (model units, + = down). Can top touches at E_TOUCH.
const E_TOUCH = (ramTip - (BEDT + .05 + CANH)), E_FLAT = ramTip - (BEDT + .05 + CANH * .14);
function ramE(t) {
  let e = .14 * ss(seg(t, .6, T.oil + 1.2)) + .1 * ss(seg(t, T.back, T.ram + .4)) + .03 * seg(t, T.mm - .3, T.trade + 1.2);
  e -= .2 * eio(seg(t, T.rel + .2, T.drain + 1.0));
  e += (E_TOUCH - .07) * eio(seg(t, T.can - .1, T.buckle - .15));
  e += (E_FLAT - E_TOUCH) * crushK(t);
  e -= .28 * eio(seg(t, T.next - .2, T.next + 1.2));
  return e;
}
const crushK = t => eio(seg(t, T.buckle + .05, T.v10e + .5));
// force on the can (lbf): ramps to ~200 at the buckle, drops while it folds, stiffens when flat
function canForce(t) {
  const a = T.buckle - .15, b = T.buckle + .05, c = T.v10e + .5;
  if (t < a) return 0;
  if (t < b) return 205 * ss(seg(t, a, b));
  if (t < c) { const u = seg(t, b, c); return 205 - 95 * ss(seg(u, 0, .15)) + 22 * Math.sin(u * 30) * (1 - u) + 600 * Math.pow(seg(u, .8, 1), 2); }
  return 695 * (1 - ss(seg(t, T.next - .2, T.next + .4)));
}
window.canForce = canForce;
const stack = t => eio(seg(t, T.stack, T.ram + .4));   // flow emphasis
const strokesV08 = t => Math.max(0, Math.floor((t - (T.mm - .3)) * 1.5 + .5));

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, 18, 8, 17.5, 1.15, 3.2, 0],
  [T.oil, 26, 8, 16.5, 1.1, 3.2, 0],
  [T.apart + .4, 24, 8, 18, 1.2, 3.3, 0],
  [T.frame + .6, 20, 9, 24.5, 1.5, 3.2, 0],
  [T.cyl + .8, 22, 9, 24.5, 1.5, 3.2, 0],
  [T.lift - .2, 26, 10, 7.8, 2.4, 2.85, 0],
  [T.cv1 + .4, 20, 6, 6.6, 2.3, 2.6, 0],
  [T.cv2 + .6, 14, 6, 6.8, 2.25, 2.6, 0],
  [T.stack + .3, 16, 8, 14, 1.3, 3.75, 0],
  [T.ram + .6, 14, 8, 14, .9, 3.9, 0],
  [T.pascal + .4, 12, 8, 18, 1.2, 3.4, 0],
  [T.fpa + .6, 14, 8, 18, 1.2, 3.4, 0],
  [T.small + .6, 10, 6, 17.5, 1.2, 3.4, 0],
  [T.x26 + .6, 10, 6, 17.5, 1.2, 3.4, 0],
  [T.hand + .6, 16, 8, 18, 1.25, 3.3, 0],
  [T.tons + .6, 20, 8, 18, 1.2, 3.3, 0],
  [T.catch + .4, 18, 8, 12.5, .6, 3.5, 0],
  [T.trade + .6, 22, 8, 12.0, .6, 3.45, 0],
  [T.gauge + .4, 40, 6, 7.8, 2.15, 2.95, 0],
  [T.drain + .4, 36, 6, 8.2, 2.2, 2.8, 0],
  [T.can + .2, 20, 8, 9.5, .2, 3.15, 0],
  [T.buckle, 24, 6, 7.8, .1, 3.0, 0],
  [T.v10e + .6, 30, 6, 7.4, .1, 2.95, 0],
  [T.next + .6, 24, 8, 14, .8, 3.3, 0],
  [DUR, 18, 10, 17.5, 1.1, 3.35, 0],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  let [az, el, dist, tx, ty, tz] = camTrack(t);
  // tiny shake when the can gives way
  const sk = Math.exp(-Math.max(0, t - T.buckle) * 6) * (t > T.buckle ? 1 : 0); ty += .03 * sk * Math.sin(t * 70);
  const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 240; post.dof.maxCoc = 10;
  const la = A - .9; key.position.set(tx + 14 * Math.sin(la), ty + 16, tz + 14 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 12 * Math.sin(A + Math.PI * .85), ty + 4, tz + 12 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 12, tz); top.lookAt(tx, ty, tz);
}

// ---------- events (foley) ----------
const EV = [{ t: T.apart + .1, type: 'lift' }, { t: T.lift - 1.0, type: 'land' }];
for (const k of ['frame', 'cyl', 'cv1', 'cv2', 'ram', 'small', 'big', 'gauge', 'rel']) EV.push({ t: T[k] + .2, type: 'label' });
{ // a pump clack at the bottom of every down-stroke (sampled from the handle motion)
  let prev = handleA(0), dir = 0;
  for (let t = 1 / 48; t < DUR; t += 1 / 48) { const a = handleA(t), d = Math.sign(a - prev); if (dir < 0 && d > 0 && a < -.6) EV.push({ t: +t.toFixed(2), type: 'pump' }); if (d) dir = d; prev = a; }
}
EV.push({ t: T.cv1 + .1, type: 'valve' }, { t: T.cv2 + .1, type: 'valve' });
EV.push({ t: T.rel + .2, type: 'release' });
EV.push({ t: T.buckle - .05, type: 'crunch' }, { t: T.v10e + .3, type: 'crunch2' });
EV.push({ t: T.fpa, type: 'card' }, { t: T.x26, type: 'card' }, { t: T.tons, type: 'card' }, { t: T.next, type: 'card' }, { t: T.card, type: 'card' });
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
window.render = t => {
  const ek = explK(t);
  for (const n of Object.keys(P)) P[n].g.position.copy(P[n].d).multiplyScalar(ek);
  P.hose.g.visible = ek < .05;
  // ram + oil column
  const e = ramE(t); ramMov.position.y = -e; oilCol.scale.y = Math.max(.14 + e, .02);
  // pump: handle angle drives the small piston
  const a = handleA(t), a2 = handleA(t + 1 / 48), vel = a2 - a;
  handle.rotation.z = .2 * a; pMov.position.y = .13 * a; pumpOil.scale.y = Math.max(PP0 - PB + .13 * a, .02);
  // check valves: inlet opens on the up-stroke, outlet on the down-stroke (closed while releasing)
  const open = [vel > .004 ? 1 : 0, vel < -.004 ? 1 : 0];
  balls.forEach((o, i) => { o.b.position.copy(o.c).addScaledVector(o.ax, .05 * open[i]); });
  M.ball.emissiveIntensity = (t > T.cv1 - .3 && t < T.back + .5) ? .6 : 0;
  // reservoir level drops a touch as oil moves to the cylinder
  resOil.scale.y = resOil.scale.z = .82 - .25 * clamp(e / 1.1);
  // release valve knob turns
  relKnob.rotation.z = -1.6 * eio(seg(t, T.rel, T.rel + .6)) * (1 - eio(seg(t, T.drain + 1.2, T.drain + 1.8)));
  // hose droplets: drift toward the cylinder when pumping, back when releasing
  let flow = 0; for (let x = 0; x < t; x += 1 / 24) { const v = handleA(x + 1 / 24) - handleA(x); flow += Math.max(0, -v) * .5; if (x > T.rel && x < T.drain + 1.0) flow -= .06; }
  drops.forEach((m, i) => { const u = (((i / DROPS) + flow * .1) % 1 + 1) % 1; m.position.copy(hoseCurve.getPoint(u)); m.visible = (t > T.back - .3 && t < T.pascal + .2) || (t > T.rel && t < T.drain + 1.2); });
  // oil glow: Pascal section
  const pk = seg(t, T.pascal - .2, T.pascal + .5) * (1 - seg(t, T.catch - .4, T.catch + .2));
  M.oil.emissiveIntensity = .15 + .55 * pk * (.8 + .2 * Math.sin(t * 5));
  M.face.opacity = .65 * ss(seg(t, T.big - .2, T.big + .3)) * (1 - ss(seg(t, T.catch - .4, T.catch)));
  M.faceO.opacity = .8 * ss(seg(t, T.small, T.small + .4)) * (1 - ss(seg(t, T.catch - .4, T.catch)));
  M.chrome.emissiveIntensity = (t > T.f40k - .1 && t < T.catch) ? .3 : 0;
  // gauge needle (pressure = force on the can / 4 in²)
  const psi = canForce(t) / 4; needle.rotation.z = (135 - 270 * clamp(psi / 10000)) * Math.PI / 180;
  crushCan(crushK(t));
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, ek, P, e, psi, force: canForce(t), strokes: strokesV08(t), V: { PX, PB, PP0, CYT, PR, RAM0, GP, BEDT, CANH, HPX, HPY, XU, cvIn, cvOut, ramTip } });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
