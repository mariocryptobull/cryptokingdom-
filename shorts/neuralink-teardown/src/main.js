// Neuralink — Exploded Teardown, 1080×1920. A cutaway wedge of head (scalp, skull, dura, cortex) with a schematic
// N1-style implant flush in the skull, its threads in the cortex, an R1-style insertion robot, and the devices it talks to.
// Schematic model, not to scale, no logos. Units: model units. Head arc centre at (0,-6,0); cut face at z = 0.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, eio, eo, track, hash } from '/core/lib.js';
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
  neura: cue('v01', 1), coin: cue('v01', 2), listens: cue('v01', 3),
  apart: cue('v02', 0), kase: cue('v02', 1), battery: cue('v02', 2), wireless: cue('v02', 3),
  chip: cue('v03', 0), signals: cue('v03', 1),
  threads: cue('v04', 0), hair: cue('v04', 1), electrodes: cue('v04', 2),
  robot: cue('v05', 0), insert: cue('v05', 1), vessels: cue('v05', 2),
  how: cue('v06', 0), think: cue('v06', 1), fire: cue('v06', 2),
  spikes: cue('v07', 0), send: cue('v07', 1), bt: cue('v07', 2),
  decode: cue('v08', 0), cursor: cue('v08', 1),
  y24: cue('v09', 0), first: cue('v09', 1), chess: cue('v09', 4),
  y26: cue('v10', 0), n21: cue('v10', 1), arm: cue('v10', 2), speech: cue('v10', 3),
  goal: cue('v11', 0), phones: cue('v11', 1), musk: cue('v11', 2), tesla: cue('v11', 3),
  next: cue('v12', 0),
};
T.insEnd = T.how - .45;          // last thread in
T.drop = [T.insEnd - .1, T.insEnd + .8];   // implant settles back into the skull
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
post.bloom.strength = .5; post.bloom.radius = .5; post.bloom.threshold = 1.6;
post.vig.uniforms.amt.value = .34; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .06;
{
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createRadialGradient(560, 860, 80, 540, 960, 1500); gr.addColorStop(0, '#33363b'); gr.addColorStop(.45, '#212328'); gr.addColorStop(1, '#0c0d10');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = .55; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff1e2', 1.6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 60 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 2.5, 10, 4); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .3, 10, 10); scene.add(top);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .25));

// ---------- materials ----------
const CEN = -6;   // y of the head-arc centre
const brainMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .75, clearcoat: .15, side: THREE.DoubleSide });
brainMat.onBeforeCompile = s => {
  s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWp;
float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 brainCol(vec3 p){
  float r = length(vec2(p.x, p.y + 6.0)), a = atan(p.x, p.y + 6.0);
  float surf = 6.0 - 0.13 * pow(max(0.0, sin(a * 46.0 + 1.3)), 6.0) * step(0.09, abs(a));
  float gm = smoothstep(surf - 0.30, surf - 0.25, r);
  vec3 c = mix(vec3(.93,.88,.84), vec3(.80,.62,.62), gm);
  c *= .95 + .08 * hh(floor(p.xy * 60.0) + floor(p.z * 60.0));
  return c;
}`).replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * brainCol(vWp), opacity );');
};
const M = {
  base: new THREE.MeshPhysicalMaterial({ color: '#2b2e33', roughness: .5, metalness: .3, clearcoat: .2 }),
  bone: new THREE.MeshPhysicalMaterial({ color: '#ece4d2', roughness: .8, side: THREE.DoubleSide }),
  scalp: new THREE.MeshPhysicalMaterial({ color: '#c99a80', roughness: .7, side: THREE.DoubleSide }),
  dura: new THREE.MeshPhysicalMaterial({ color: '#b9a39b', roughness: .55, side: THREE.DoubleSide }),
  vessel: new THREE.MeshPhysicalMaterial({ color: '#9c3b3b', roughness: .45, clearcoat: .4 }),
  ti: new THREE.MeshPhysicalMaterial({ color: '#a9aeb4', roughness: .42, metalness: .85, clearcoat: .1 }),
  lid: new THREE.MeshPhysicalMaterial({ color: '#d4d7db', roughness: .62, metalness: .15 }),
  pcb: new THREE.MeshPhysicalMaterial({ color: '#1d3a2e', roughness: .5, clearcoat: .4 }),
  chip: new THREE.MeshPhysicalMaterial({ color: '#16171a', roughness: .3, metalness: .4, emissive: '#59d4ff', emissiveIntensity: 0 }),
  comp: new THREE.MeshStandardMaterial({ color: '#8d9298', roughness: .4, metalness: .8 }),
  batt: new THREE.MeshPhysicalMaterial({ color: '#b8bcc1', roughness: .45, metalness: .85 }),
  battBand: new THREE.MeshPhysicalMaterial({ color: '#ff6b3d', roughness: .4, emissive: '#ff6b3d', emissiveIntensity: 0 }),
  coil: new THREE.MeshStandardMaterial({ color: '#c87533', roughness: .3, metalness: 1, emissive: '#ffb066', emissiveIntensity: 0 }),
  thread: new THREE.MeshStandardMaterial({ color: '#e9d9a8', roughness: .4, metalness: .2, emissive: '#ffcf70', emissiveIntensity: .15 }),
  model: new THREE.MeshPhysicalMaterial({ color: '#ecebe6', roughness: .68, clearcoat: .05 }),
  dark: new THREE.MeshPhysicalMaterial({ color: '#2a2c30', roughness: .55, clearcoat: .1 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#d4d8dc', roughness: .15, metalness: 1 }),
  blue: new THREE.MeshPhysicalMaterial({ color: '#2f6fe0', roughness: .4, clearcoat: .5 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#1a1d22', roughness: .1, metalness: .2, clearcoat: 1 }),
  neuron: new THREE.MeshPhysicalMaterial({ color: '#7b5c8c', roughness: .5 }),
  light: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 2), toneMapped: true }),
  cup: new THREE.MeshPhysicalMaterial({ color: '#ff6b3d', roughness: .5, clearcoat: .4 }),
};
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const cyl = (r, h, mat, x = 0, y = 0, z = 0, seg = 40) => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat)); m.position.set(x, y, z); return m; };

// ---------- head wedge ----------
const TM = .46;                                  // half angle of the wedge
const cortexR = a => 6.0 - .13 * Math.pow(Math.max(0, Math.sin(a * 46 + 1.3)), 6) * (Math.abs(a) >= .09 ? 1 : 0);
const ysurf = x => { const a = Math.asin(x / 6); return cortexR(a) * Math.cos(a) + CEN; };
const DEPTH = 2.6;
const sector = (r0, r1, a0, a1, rf) => {   // annular sector in the xy plane, centre (0, CEN); rf = outer radius fn
  const s = new THREE.Shape(), N = 160;
  for (let i = 0; i <= N; i++) { const a = lerp(a0, a1, i / N), r = rf ? rf(a) : r1; const p = [r * Math.sin(a), r * Math.cos(a) + CEN]; i ? s.lineTo(...p) : s.moveTo(...p); }
  for (let i = N; i >= 0; i--) { const a = lerp(a0, a1, i / N); s.lineTo(r0 * Math.sin(a), r0 * Math.cos(a) + CEN); }
  return s;
};
const ext = (shape, z0, z1, mat) => { const g = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: 1 }); g.translate(0, 0, z0); return sh(new THREE.Mesh(g, mat)); };
scene.add(ext(sector(4.4, 0, -TM, TM, cortexR), -DEPTH, 0, brainMat));
// shells with a hole (x in ±HOLE, z in [-HZ, 0]) where the implant sits
const HOLE = .52, HZ = .55;
for (const [r0, r1, mat] of [[6.0, 6.07, M.dura], [6.07, 6.38, M.bone], [6.38, 6.6, M.scalp]]) {
  const an = Math.asin(HOLE / ((r0 + r1) / 2));
  scene.add(ext(sector(r0, r1, -TM, -an), -DEPTH, 0, mat), ext(sector(r0, r1, an, TM), -DEPTH, 0, mat), ext(sector(r0, r1, -an, an), -DEPTH, -HZ, mat));
}
scene.add(box(5.2, .14, DEPTH + .4, M.base, 0, -2.25, -DEPTH / 2));
// surface blood vessels in the hole (the robot avoids them)
const VES = [-.23, .11, .34];
for (const vx of VES) { const pts = []; for (let i = 0; i <= 12; i++) { const z = -HZ - .2 + (HZ + .2) * i / 12; pts.push(new THREE.Vector3(vx + .025 * Math.sin(i * 1.3 + vx * 9), ysurf(vx) + .012, z)); } scene.add(sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .014, 6), M.vessel))); }

// ---------- implant (local origin = underside centre) ----------
const implant = new THREE.Group(); scene.add(implant);
const IP = {};
const ipart = (name, y, dy) => { const g = new THREE.Group(); g.position.y = y; implant.add(g); IP[name] = { g, y, dy }; return g; };
const R0 = .5;
{ const g = ipart('base', 0, 0);   // titanium cup with a floor; threads leave through the underside
  g.add(cyl(R0, .03, M.ti, 0, .015)); const wall = sh(new THREE.Mesh(new THREE.CylinderGeometry(R0, R0 - .02, .26, 48, 1, true), M.ti)); wall.position.y = .13; g.add(wall);
  const inner = sh(new THREE.Mesh(new THREE.CylinderGeometry(R0 - .03, R0 - .03, .25, 48, 1, true), M.ti)); inner.material = M.ti; inner.scale.set(1, 1, 1); inner.position.y = .14; g.add(inner);
  const rimT = sh(new THREE.Mesh(new THREE.TorusGeometry(R0 - .015, .016, 8, 48), M.ti)); rimT.rotation.x = Math.PI / 2; rimT.position.y = .26; g.add(rimT);
  g.add(cyl(.12, .03, M.dark, 0, -.005)); }
{ const g = ipart('chip', .07, .55);
  g.add(cyl(R0 - .05, .025, M.pcb)); g.add(box(.2, .035, .2, M.chip, 0, .03, 0));
  for (let k = 0; k < 10; k++) { const a = k * .63 + .3, r = .28 + .06 * (k % 2); g.add(box(.05, .02, .03, M.comp, r * Math.cos(a), .022, r * Math.sin(a))); } }
{ const g = ipart('battery', .13, 1.0);
  g.add(cyl(.36, .085, M.batt)); g.add(cyl(.362, .02, M.battBand, 0, -.015)); }
{ const g = ipart('coil', .2, 1.42);
  for (let k = 0; k < 3; k++) { const c = sh(new THREE.Mesh(new THREE.TorusGeometry(.42 - k * .035, .012, 8, 64), M.coil)); c.rotation.x = Math.PI / 2; g.add(c); } }
{ const g = ipart('lid', .27, 1.82);
  g.add(cyl(R0, .05, M.lid)); const d = sh(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.lid)); d.scale.set(R0 - .01, .05, R0 - .01); d.position.y = .025; g.add(d); }

// ---------- threads + electrodes ----------
const NT = 64, NE = 16;
const TH = [...Array(NT)].map((_, k) => {
  // insertion x: spread under the hole, skipping the vessels
  let xi = -.44 + .88 * (k + .5) / NT; for (const v of VES) if (Math.abs(xi - v) < .03) xi += (xi < v ? -.02 : .02);
  return { ax: -.32 + .64 * k / (NT - 1), xi, d: .17 + .11 * hash(k * 3.1), z: .012 + .03 * hash(k + 9.7), wob: hash(k * 7.7) - .5 };
});
const threadMeshes = TH.map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), M.thread); m.castShadow = false; scene.add(m); return m; });
const elec = new THREE.InstancedMesh(new THREE.SphereGeometry(.0085, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), NT * NE); scene.add(elec);
const ECOL = new THREE.Color('#e8b54a');
const curves = [];
const v = (x, y, z) => new THREE.Vector3(x, y, z);
function threadCurve(k, A, p) {   // A = anchor world pos; p: 0 hanging from the implant, 1 inserted
  const th = TH[k], s = (th.ax / .32);
  const hang = [A, v(A.x + .14 * s, A.y - .2, th.z), v(A.x + .34 * s + .04 * th.wob, A.y - .38, th.z), v(A.x + .38 * s + .04 * th.wob, A.y - .38 - th.d * 1.1, th.z)];
  const ys = ysurf(th.xi);
  const ins = [A, v(lerp(A.x, th.xi, .5) + .05 * s, lerp(A.y, ys, .5) + .02, th.z), v(th.xi, ys + .004, th.z), v(th.xi, ys - th.d, th.z)];
  return new THREE.CatmullRomCurve3(hang.map((q, i) => q.clone().lerp(ins[i], p)));
}

// ---------- R1-style insertion robot (schematic gantry) ----------
const robot = new THREE.Group(); scene.add(robot);
const RX = 1.7, RZ = -1.3, RY = 2.3;
robot.add(box(.3, RY + 2.2, .3, M.model, RX, RY - (RY + 2.2) / 2 + .15, RZ));
robot.add(box(.5, .08, .5, M.dark, RX, -2.1, RZ));
const armZ = box(.16, .16, 1, M.model); robot.add(armZ);      // along z from the column
const armX = box(1, .14, .14, M.model); robot.add(armX);      // along x to the carriage
const carriage = new THREE.Group(); robot.add(carriage);
const mast = box(.08, 1, .08, M.chrome); carriage.add(mast);
const head = new THREE.Group(); carriage.add(head);
head.add(box(.24, .2, .2, M.model, 0, .1, 0)); head.add(box(.08, .06, .06, M.blue, .08, .03, .1)); head.add(box(.06, .02, .02, M.light, .08, .03, .132));
const needle = sh(new THREE.Mesh(new THREE.CylinderGeometry(.005, .002, .3, 6), M.chrome)); needle.position.y = -.15; head.add(needle);

// ---------- neurons ----------
const NN = 18;
const neurons = [...Array(NN)].map((_, i) => {
  const x = -.42 + .84 * (i + .5) / NN + .02 * (hash(i * 5.3) - .5), y = ysurf(x) - .07 - .22 * hash(i * 2.9), z = .055;
  const mat = new THREE.MeshPhysicalMaterial({ color: '#8a6aa0', roughness: .5, emissive: '#59d4ff', emissiveIntensity: 0 });
  const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  const soma = new THREE.Mesh(new THREE.ConeGeometry(.014, .034, 8), mat); g.add(soma);
  const ap = new THREE.Mesh(new THREE.CylinderGeometry(.003, .004, .1, 5), mat); ap.position.y = .065; g.add(ap);
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.0025, .003, .05, 5), mat); b.position.set(s * .018, -.026, 0); b.rotation.z = s * .9; g.add(b); }
  const fires = []; let t = hash(i * 1.7) * .6; while (t < 40) { fires.push(t); t += .35 + .9 * hash(t * 13.1 + i); }
  return { g, mat, x, y, fires };
});
const FIRE0 = T.fire - .35, FIRE1 = T.y24;
const fireAmt = (n, t) => { if (t < FIRE0 || t > FIRE1) return 0; const lt = t - FIRE0; let a = 0; for (const f of n.fires) { const d = lt - f; if (d >= 0 && d < .18) a = Math.max(a, 1 - d / .18); } return a; };
window.FIRES = () => { const out = []; for (const n of neurons) for (const f of n.fires) { const t = FIRE0 + f; if (t < FIRE1) out.push(t); } return out.sort((a, b) => a - b); };
// nearest electrode thread for each neuron
neurons.forEach(n => { let best = 0, bd = 9; TH.forEach((th, k) => { const d = Math.abs(th.xi - n.x); if (d < bd) { bd = d; best = k; } }); n.k = best; });

// pulses up the threads (v07)
const NP = 28;
const pulses = [...Array(NP)].map((_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(.014, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(.8, 2.0, 2.4) })); scene.add(m); return { m, k: (i * 23 + 5) % NT, t0: T.spikes - .2 + i * .19 }; });

// ---------- devices ----------
const mkScreen = (cw, chh, w, h) => { const c = document.createElement('canvas'); c.width = cw; c.height = chh; const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); return { c, g: c.getContext('2d'), tex, m }; };
const laptop = new THREE.Group(); scene.add(laptop);
const LW = 1.3, LH = .8;
laptop.add(box(LW, .035, .86, M.model, 0, 0, .43));
laptop.add(box(LW * .9, .004, .4, M.dark, 0, .02, .3));
const lid = new THREE.Group(); lid.rotation.x = -.22; laptop.add(lid);
lid.add(box(LW, LH + .06, .025, M.model, 0, (LH + .06) / 2, -.0125));
const LS = mkScreen(832, 512, LW - .06, LH - .02); LS.m.position.set(0, (LH + .06) / 2, .002); lid.add(LS.m);
const phone = new THREE.Group(); scene.add(phone);
phone.add(box(.4, .8, .04, M.dark));
const PS = mkScreen(240, 480, .36, .72); PS.m.position.z = .021; phone.add(PS.m);
// assistive robotic arm (schematic) with a cup
const arm = new THREE.Group(); scene.add(arm);
arm.add(cyl(.42, .04, M.dark, 0, 0, 0)); arm.add(cyl(.1, .1, M.model, 0, .07, -.15));
const a1 = new THREE.Group(); a1.position.set(0, .12, -.15); arm.add(a1);
a1.add(box(.07, .42, .07, M.model, 0, .21, 0)); const a2 = new THREE.Group(); a2.position.y = .42; a1.add(a2);
a2.add(cyl(.05, .08, M.blue, 0, 0, 0)); a2.add(box(.06, .34, .06, M.model, 0, .17, 0)); const a3 = new THREE.Group(); a3.position.y = .34; a2.add(a3);
a3.add(box(.12, .04, .05, M.dark, 0, 0, 0)); a3.add(box(.02, .08, .04, M.chrome, -.05, -.05, 0)); a3.add(box(.02, .08, .04, M.chrome, .05, -.05, 0));
const cup = new THREE.Group(); arm.add(cup); { const c = sh(new THREE.Mesh(new THREE.CylinderGeometry(.045, .038, .1, 20), M.cup)); c.position.y = .05; cup.add(c); }
// generic car (schematic, no brand)
const car = new THREE.Group(); scene.add(car);
{ const body = new THREE.Shape(); const P = [[-.7, .08], [.7, .08], [.72, .2], [.62, .27], [.25, .3], [.08, .46], [-.38, .46], [-.6, .3], [-.72, .26]]; body.moveTo(...P[0]); P.slice(1).forEach(p => body.lineTo(...p)); body.closePath();
  const g = new THREE.ExtrudeGeometry(body, { depth: .56, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 3 }); g.translate(0, 0, -.28); car.add(sh(new THREE.Mesh(g, M.model)));
  const win = new THREE.Shape(); [[-.33, .32], [.05, .32], [.07, .43], [-.33, .43]].forEach((p, i) => i ? win.lineTo(...p) : win.moveTo(...p)); win.closePath();
  for (const z of [.31, -.31]) { const wg = new THREE.Mesh(new THREE.ShapeGeometry(win), M.glass); wg.position.z = z; if (z < 0) wg.rotation.y = Math.PI, wg.position.x = -.26 * 0; car.add(wg); }
  for (const [x, z] of [[-.45, .29], [.45, .29], [-.45, -.29], [.45, -.29]]) { const w = sh(new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .08, 24), M.dark)); w.rotation.x = Math.PI / 2; w.position.set(x, .1, z); car.add(w); } }
const headl = new THREE.MeshBasicMaterial({ color: new THREE.Color(.25, .25, .25) });
for (const z of [.2, -.2]) car.add(box(.03, .04, .1, headl, .735, .21, z));

// ---------- motion ----------
const pop = x => 1 - Math.pow(1 - ss(x), 3);
const explK = t => pop(seg(t, T.apart, T.apart + 1.4)) * (1 - eio(seg(t, T.robot - .4, T.robot + .6)));
const liftK = t => eio(seg(t, T.apart - .2, T.apart + 1.0));
// implant path: in the skull → lifted (teardown) → parked left (robot works) → back into the skull
const HOME = v(0, .075, 0), LIFTP = v(0, 1.75, 0), PARK = v(-1.25, 1.35, .1);
function implantPos(t) {
  const p = HOME.clone().lerp(LIFTP, liftK(t));
  p.lerp(PARK, eio(seg(t, T.robot - .4, T.robot + .5)));
  p.lerp(HOME, eio(seg(t, T.drop[0], T.drop[1])));
  return p;
}
// thread insertion schedule: 6 slow, then the rest in a sweep
const INS0 = T.insert - .35, SLOW = .33, FAST = (T.insEnd - INS0 - 6 * SLOW) / (NT - 6);
const order = TH.map((th, k) => k).sort((a, b) => TH[a].xi - TH[b].xi);
const insT = []; order.forEach((k, j) => { insT[k] = INS0 + (j < 6 ? j * SLOW : 6 * SLOW + (j - 6) * FAST); });
const insDur = k => (insT[k] < INS0 + 6 * SLOW ? SLOW * .8 : FAST * 3);
function insP(t, k) {
  if (t < T.apart) return 1;
  if (t < T.robot) return 1 - eio(seg(t, T.apart, T.apart + 1.0));
  return eio(seg(t, insT[k], insT[k] + insDur(k)));
}
const robotIn = t => pop(seg(t, T.robot - .3, T.robot + .8)) * (1 - eio(seg(t, T.insEnd + .1, T.insEnd + 1.1)));
function robotTarget(t) {   // which thread the head is over + dip depth
  let j = 0; for (let i = 0; i < NT; i++) if (t >= insT[order[i]] - .05) j = i;
  const k = order[j], th = TH[k], lt = t - insT[k], d = insDur(k);
  const dip = t < INS0 - .05 ? 0 : Math.sin(Math.PI * clamp(lt / Math.max(d, .06))) ;
  const nx = j + 1 < NT ? TH[order[j + 1]].xi : th.xi;
  const x = lerp(th.xi, nx, ss(seg(lt, d * .6, d * 1.0)));
  return { x, z: th.z, dip: t > T.insEnd + .2 ? 0 : dip, k };
}
// devices
const lapIn = t => pop(seg(t, T.send - .4, T.send + .5));
const LAP0 = v(1.75, 1.15, .35), LAP1 = v(.2, 1.95, -.6);
const armIn = t => pop(seg(t, T.arm - .5, T.arm + .4)) * (1 - eio(seg(t, T.goal - .2, T.goal + .5)));
const phoneIn = t => pop(seg(t, T.phones - .3, T.phones + .6));
const carIn = t => pop(seg(t, T.tesla - .9, T.tesla + .1));

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, 24, 26, 15, 0, -.1, 0],
  [T.coin + .3, 22, 20, 8, 0, .25, 0],
  [T.apart + .2, 24, 16, 7.5, 0, .9, 0],
  [T.kase + .9, 26, 12, 9.4, 0, 2.55, 0],
  [T.wireless + .6, 30, 12, 8.8, 0, 2.6, 0],
  [T.chip + .7, 34, 16, 5.6, 0, 2.2, 0],
  [T.signals + .6, 36, 16, 5.8, 0, 2.05, 0],
  [T.threads + .6, 24, 8, 5.2, 0, 1.45, 0],
  [T.electrodes + .6, 18, 6, 4.6, 0, 1.4, 0],
  [T.robot + .7, 18, 26, 6.6, -.1, .6, 0],
  [T.insert + .6, 14, 22, 4.6, 0, .2, 0],
  [T.vessels + .6, 12, 26, 4.2, .05, .1, 0],
  [T.how + .5, 8, 10, 4.2, 0, .0, 0],
  [T.think + .4, 4, 4, 1.9, 0, -.12, 0],
  [T.fire + .8, 2, 3, 1.75, 0, -.13, 0],
  [T.spikes + .6, 10, 8, 3.2, .1, .1, 0],
  [T.send + .5, 22, 12, 7.2, .85, .75, 0],
  [T.bt + .8, 24, 12, 7.4, .9, .8, 0],
  [T.decode + .4, 16, 6, 4.4, 1.6, 1.45, .35],
  [T.y24 + .2, 12, 6, 4.2, 1.65, 1.5, .35],
  [T.chess + .4, 10, 6, 4.0, 1.7, 1.5, .35],
  [T.y26 + .3, 14, 12, 8.4, .15, 1.05, .4],
  [T.speech + .3, 18, 14, 8.8, .15, 1.0, .4],
  [T.goal + .8, 16, 14, 10.5, .05, 1.0, .3],
  [T.tesla + .8, 12, 14, 10.8, .05, 1.0, .3],
  [T.next + .3, 14, 18, 12.5, 0, .9, 0],
  [DUR, 12, 20, 13.5, 0, .9, 0],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz] = camTrack(t); const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz);
  camera.near = Math.max(.02, dist * .02); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 240; post.dof.maxCoc = 8;
  const la = A - .9; key.position.set(tx + 10 * Math.sin(la), ty + 12, tz + 10 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 9 * Math.sin(A + Math.PI * .85), ty + 3, tz + 9 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 9, tz); top.lookAt(tx, ty, tz);
}

// ---------- events (foley) ----------
const EV = [{ t: T.apart + .05, type: 'lift' }, { t: T.apart + .4, type: 'spread' }, { t: T.kase + .2, type: 'label' }, { t: T.battery + .2, type: 'label' }, { t: T.wireless + .1, type: 'hum' },
  { t: T.chip + .2, type: 'label' }, { t: T.threads + .2, type: 'label' }, { t: T.electrodes + .2, type: 'label' }, { t: T.robot - .3, type: 'servo' }, { t: T.drop[1] - .1, type: 'land' }];
for (let j = 0; j < 6; j++) EV.push({ t: +(insT[order[j]] + SLOW * .4).toFixed(2), type: 'tick' });
EV.push({ t: +(INS0 + 6 * SLOW).toFixed(2), type: 'sweep', d: +(T.insEnd - INS0 - 6 * SLOW).toFixed(2) });
for (const f of window.FIRES()) if (f > T.fire - .4 && f < T.decode) EV.push({ t: +f.toFixed(3), type: 'spike' });
for (let i = 0; i < 4; i++) EV.push({ t: +(T.bt + i * .45).toFixed(2), type: 'beep' });
EV.push({ t: T.cursor + .3, type: 'label' }, { t: T.y24, type: 'card' }, { t: T.n21, type: 'card' }, { t: T.arm + .2, type: 'servo' }, { t: T.goal, type: 'card' }, { t: T.tesla + .3, type: 'beep' }, { t: T.next, type: 'card' });
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- screens ----------
function drawLaptop(t) {
  const { g, c } = LS; const w = c.width, h = c.height;
  g.fillStyle = '#0f1216'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1a1f26'; g.fillRect(0, 0, w, 40); g.fillStyle = '#59d4ff'; g.beginPath(); g.arc(24, 20, 7, 0, 7); g.fill();
  g.font = '600 20px "JBMono", monospace'; g.fillStyle = '#c9d2dc'; g.fillText('implant · connected', 40, 27);
  if (t < T.decode - .2) {   // raw channel activity
    g.fillStyle = '#7f8b98'; g.fillText('incoming spikes', 24, 80);
    for (let r = 0; r < 16; r++) for (let i = 0; i < 60; i++) { const tt = t * 3 - i * .05; if (hash(Math.floor(tt * 20) * 7.1 + r * 13.3) > .9) { g.fillStyle = '#59d4ff'; g.fillRect(780 - i * 12.5, 100 + r * 24, 3, 16); } }
    return;
  }
  if (t < T.y24 - .2) {      // cursor task: targets on a grid
    const n = 6, cs = 74, ox = (w - n * cs) / 2, oy = 70;
    g.strokeStyle = '#26303a'; g.lineWidth = 2; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(ox + i * cs, oy); g.lineTo(ox + i * cs, oy + n * cs); g.stroke(); g.beginPath(); g.moveTo(ox, oy + i * cs); g.lineTo(ox + n * cs, oy + i * cs); g.stroke(); }
    const lt = t - T.decode + .2, step = 1.1, i = Math.floor(lt / step), u = ss(seg(lt - i * step, 0, .75));
    const cell = j => [ox + (Math.floor(hash(j * 3.3) * n) + .5) * cs, oy + (Math.floor(hash(j * 5.9) * n) + .5) * cs];
    const [x0, y0] = i > 0 ? cell(i - 1) : [w / 2, oy + n * cs / 2], [x1, y1] = cell(i);
    g.fillStyle = u > .98 ? '#ff6b3d' : '#2f6fe0'; g.fillRect(x1 - cs / 2 + 4, y1 - cs / 2 + 4, cs - 8, cs - 8);
    const cx = lerp(x0, x1, u) + 6 * Math.sin(lt * 7) * (1 - u), cy = lerp(y0, y1, u);
    drawCursor(g, cx, cy, 1.3); return;
  }
  // chess
  const n = 8, cs = 54, ox = (w - n * cs) / 2, oy = 56;
  for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) { g.fillStyle = (r + q) % 2 ? '#6b7a5a' : '#dfe3cf'; g.fillRect(ox + q * cs, oy + r * cs, cs, cs); }
  const P = [[0, 0, 'b'], [2, 0, 'b'], [4, 0, 'b'], [7, 0, 'b'], [1, 1, 'b'], [3, 1, 'b'], [5, 2, 'b'], [6, 1, 'b'], [0, 6, 'w'], [2, 6, 'w'], [3, 6, 'w'], [5, 6, 'w'], [7, 7, 'w'], [4, 7, 'w'], [1, 7, 'w'], [6, 5, 'w']];
  const lt = t - T.y24, mv = ss(seg(lt, 2.2, 3.4)), from = [6, 5], to = [4, 3];
  for (const [q, r, s] of P) { let x = ox + (q + .5) * cs, y = oy + (r + .5) * cs; if (q === from[0] && r === from[1]) { x = lerp(x, ox + (to[0] + .5) * cs, mv); y = lerp(y, oy + (to[1] + .5) * cs, mv); }
    g.fillStyle = s === 'w' ? '#f7f5ee' : '#24262a'; g.strokeStyle = s === 'w' ? '#24262a' : '#9aa0a8'; g.lineWidth = 2;
    g.beginPath(); g.arc(x, y + 6, 15, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(x, y - 10, 9, 0, 7); g.fill(); g.stroke(); }
  const cu = ss(seg(lt, .8, 2.1)); const sx = ox + (from[0] + .5) * cs, sy = oy + (from[1] + .5) * cs;
  const cx = mv > 0 ? lerp(sx, ox + (to[0] + .5) * cs, mv) : lerp(w - 60, sx, cu), cy = mv > 0 ? lerp(sy, oy + (to[1] + .5) * cs, mv) : lerp(h - 40, sy, cu);
  drawCursor(g, cx + 6, cy + 6, 1.2);
}
function drawCursor(g, x, y, s) { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = '#ffffff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 26); g.lineTo(7, 20); g.lineTo(12, 31); g.lineTo(17, 29); g.lineTo(12, 18); g.lineTo(21, 18); g.closePath(); g.fill(); g.stroke(); g.restore(); }
function drawPhone(t) {
  const { g, c } = PS; const w = c.width, h = c.height;
  g.fillStyle = '#0f1216'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 12; i++) { const q = i % 3, r = Math.floor(i / 3); g.fillStyle = ['#2f6fe0', '#ff6b3d', '#e8b54a', '#59d4ff'][i % 4]; g.globalAlpha = .85; g.beginPath(); g.roundRect(30 + q * 66, 70 + r * 80, 48, 48, 12); g.fill(); }
  g.globalAlpha = 1; const lt = t - T.phones, j = Math.floor(lt / 1.2) % 12, u = ss(seg(lt % 1.2, 0, .7)), j0 = (j + 11) % 12;
  const px = k => 54 + (k % 3) * 66, py = k => 94 + Math.floor(k / 3) * 80;
  g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.roundRect(px(j) - 30, py(j) - 30, 60, 60, 14); g.stroke();
  drawCursor(g, lerp(px(j0), px(j), u), lerp(py(j0), py(j), u), 1);
}

// ---------- frame ----------
await initOverlay({ VDUR, TL });
const tmp = new THREE.Vector3(), dummy = new THREE.Object3D(), col = new THREE.Color();
window.render = t => {
  const ek = explK(t);
  // implant
  const ipos = implantPos(t); implant.position.copy(ipos);
  for (const n of Object.keys(IP)) IP[n].g.position.y = IP[n].y + IP[n].dy * ek;
  M.coil.emissiveIntensity = (t > T.wireless - .1 && t < T.chip) ? .6 + .4 * Math.sin(t * 10) : 0;
  M.battBand.emissiveIntensity = (t > T.battery && t < T.chip) ? .8 : 0;
  const chipGlow = (t > T.chip && t < T.threads) ? .9 + .5 * Math.sin(t * 8) : (t > T.spikes + .3 && t < T.decode + 1) ? 1.2 + .6 * Math.sin(t * 14) : 0;
  M.chip.emissiveIntensity = chipGlow;
  // threads
  const A0 = ipos.clone().add(new THREE.Vector3(0, IP.base.g.position.y - .005, 0));
  M.thread.emissiveIntensity = (t > T.threads - .2 && t < T.robot) ? .5 : .15;
  for (let k = 0; k < NT; k++) {
    const A = v(A0.x + TH[k].ax, A0.y, TH[k].z), cv = threadCurve(k, A, insP(t, k)); curves[k] = cv;
    const m = threadMeshes[k]; m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(cv, 22, .0042, 4);
  }
  // electrodes: dim gold, flash cyan when a nearby neuron fires
  const elOn = t > T.electrodes - .3 && t < T.robot;
  for (let k = 0; k < NT; k++) for (let j = 0; j < NE; j++) {
    const u = .7 + .3 * j / (NE - 1); curves[k].getPoint(u, tmp); dummy.position.copy(tmp); dummy.updateMatrix(); elec.setMatrixAt(k * NE + j, dummy.matrix);
    col.copy(ECOL).multiplyScalar(elOn ? 1.6 + .6 * Math.sin(t * 9 - j * .5) : 1); elec.setColorAt(k * NE + j, col);
  }
  for (const n of neurons) { const a = fireAmt(n, t); if (a > 0) for (let j = 0; j < NE; j++) for (const kk of [n.k - 1, n.k, n.k + 1]) if (kk >= 0 && kk < NT) { const idx = kk * NE + j; elec.getColorAt(idx, col); col.lerp(new THREE.Color(.7, 1.9, 2.3), a); elec.setColorAt(idx, col); } }
  elec.instanceMatrix.needsUpdate = true; elec.instanceColor.needsUpdate = true;
  // neurons
  const nv = seg(t, T.how - .2, T.how + .5) * (1 - seg(t, T.y24 - .3, T.y24 + .3));
  for (const n of neurons) { n.g.visible = nv > .01; n.g.scale.setScalar(Math.max(.001, nv)); const a = fireAmt(n, t); n.mat.emissiveIntensity = a * 2.2; n.mat.emissive.set('#59d4ff'); }
  // pulses up the threads
  for (const p of pulses) { const u = seg(t, p.t0, p.t0 + .7); p.m.visible = u > 0 && u < 1 && t < T.decode + .6; if (p.m.visible) { curves[p.k].getPoint(1 - u, tmp); p.m.position.copy(tmp); } }
  // robot
  const ri = robotIn(t); robot.visible = ri > .01; robot.position.set(3.2 * (1 - ri), 2.5 * (1 - ri), 0);
  if (robot.visible) {
    const rt = robotTarget(t), hx = rt.x, hz = rt.z, ys = ysurf(hx), headY = ys + .34 - .3 * rt.dip;
    armZ.position.set(RX, RY, (RZ + hz) / 2); armZ.scale.z = Math.abs(hz - RZ) + .1;
    armX.position.set((RX + hx) / 2, RY, hz); armX.scale.x = Math.abs(RX - hx) + .1;
    carriage.position.set(hx, 0, hz); mast.scale.y = RY - headY - .1; mast.position.y = (RY + headY + .2) / 2; head.position.y = headY;
  }
  // devices
  const li = lapIn(t), lm = eio(seg(t, T.goal - .3, T.goal + .8)); laptop.visible = li > .01;
  laptop.position.copy(LAP0).lerp(LAP1, lm); laptop.rotation.set(.12, -.32 + .2 * lm, 0); laptop.scale.setScalar(Math.max(.001, li * (1 - .15 * lm)));
  if (laptop.visible) { drawLaptop(t); LS.tex.needsUpdate = true; }
  const ai = armIn(t); arm.visible = ai > .01; arm.position.set(-.55, 1.05, .9); arm.scale.setScalar(Math.max(.001, ai * 1.35)); arm.rotation.y = .5;
  if (arm.visible) { const lt = t - T.arm - .4, reach = ss(seg(lt, 0, 1.2)), lift = ss(seg(lt, 1.4, 2.4));
    a1.rotation.x = .55 * reach - .25 * lift; a2.rotation.x = 1.0 * reach - .3 * lift; a3.rotation.x = .4 * reach;
    a3.updateWorldMatrix(true, false); const tip = new THREE.Vector3(0, -.08, 0).applyMatrix4(a3.matrixWorld); arm.worldToLocal(tip);
    if (lift > 0) cup.position.set(tip.x, tip.y - .05, tip.z); else cup.position.set(0, .02, tip.z * 0 + .26);
    cup.position.y = Math.max(cup.position.y, .02); }
  const pi = phoneIn(t); phone.visible = pi > .01; phone.position.set(-1.15, 1.45, .75); phone.rotation.set(-.05, .35, .08); phone.scale.setScalar(Math.max(.001, pi));
  if (phone.visible) { drawPhone(t); PS.tex.needsUpdate = true; }
  const ci = carIn(t); car.visible = ci > .01; car.position.set(1.05, 1.0 + .25 * (1 - ci), 1.1); car.rotation.y = -.75; car.scale.setScalar(Math.max(.001, ci * .78));
  const hl = seg(t, T.tesla + .3, T.tesla + .6); headl.color.setRGB(.25 + 1.6 * hl, .25 + 1.5 * hl, .25 + 1.2 * hl);
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, head, ipos, IP, ek, curves, neurons, fireAmt, laptop, phone, car, arm, LW, LH, lid });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
