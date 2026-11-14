// Wetware — Exploded Teardown, 1080×1920. A schematic biocomputer: a white housing over a culture well where living neurons
// sit on a microelectrode array (MEA), a silicon board under it, and a life-support tray (pumps, filter, gas mixing, heater).
// Schematic model: no brand marks, not to scale. Y up, unit centred on the origin.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, eio, eo, track, hash, mulberry } from '/core/lib.js';
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
  reveal: cue('v02', 0), yousee: cue('v02', 1), neurons: cue('v02', 2), alive: cue('v02', 3),
  stem: cue('v03', 1), grown: cue('v03', 2), mea: cue('v04', 0), mea59: cue('v04', 1),
  sil: cue('v05', 0), pin: cue('v05', 1), pout: cue('v05', 2), body: cue('v06', 0), box: cue('v06', 1),
  pump: cue('v07', 0), filt: cue('v07', 1), gas: cue('v07', 2), heat: cue('v07', 3), life: cue('v08', 0),
  learn: cue('v09', 0), dish: cue('v09', 1), pong: cue('v09', 3), hit: cue('v10', 0), miss: cue('v10', 2), rally: cue('v10', 3),
  dishb: cue('v11', 0), cl1: cue('v11', 1), price: cue('v11', 2), rent: cue('v12', 0), fs: cue('v12', 1), org: cue('v12', 2),
  why: cue('v13', 0), brain: cue('v13', 1), dc: cue('v13', 3), claim: cue('v14', 0), unproven: cue('v14', 2),
  course: cue('v15', 0), yet: cue('v15', 2), first: cue('v15', 3), grownb: cue('v15', 4), next: cue('v16', 0),
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
post.bloom.strength = .55; post.bloom.radius = .55; post.bloom.threshold = 1.4;
post.vig.uniforms.amt.value = .34; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .02;
{
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createRadialGradient(560, 900, 80, 540, 960, 1500); gr.addColorStop(0, '#2c3238'); gr.addColorStop(.45, '#1c2024'); gr.addColorStop(1, '#0b0c0e');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = .55; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff4ea', 1.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 80 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#cfe6ff', 5, 16, 5); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .5, 14, 14); scene.add(top);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#14161a', .25));
const wellLight = new THREE.PointLight('#8fe9ff', 0, 3, 1.5); scene.add(wellLight);

// ---------- materials ----------
const M = {
  floor: new THREE.MeshPhysicalMaterial({ color: '#202328', roughness: .55, metalness: .1 }),
  shell: new THREE.MeshPhysicalMaterial({ color: '#eceae5', roughness: .35, clearcoat: .6, clearcoatRoughness: .2 }),
  shellDk: new THREE.MeshPhysicalMaterial({ color: '#3a3e44', roughness: .5, metalness: .3 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#e8f4ff', roughness: .05, transmission: .9, thickness: .05, transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false }),
  accent: new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#59d4ff', emissiveIntensity: 1.6 }),
  pcb: new THREE.MeshPhysicalMaterial({ color: '#1f5a43', roughness: .5, clearcoat: .5 }),
  ic: new THREE.MeshPhysicalMaterial({ color: '#16181b', roughness: .35, clearcoat: .4 }),
  gold: new THREE.MeshStandardMaterial({ color: '#e0b04a', roughness: .25, metalness: 1 }),
  silicon: new THREE.MeshPhysicalMaterial({ color: '#2a2f3a', roughness: .2, metalness: .6, clearcoat: 1, iridescence: .6, iridescenceIOR: 1.6 }),
  mglass: new THREE.MeshPhysicalMaterial({ color: '#dfe8ee', roughness: .1, transmission: .6, thickness: .05, transparent: true, opacity: .8 }),
  heater: new THREE.MeshStandardMaterial({ color: '#a7aeb6', roughness: .35, metalness: .9, emissive: '#ff6b3d', emissiveIntensity: 0 }),
  medium: new THREE.MeshPhysicalMaterial({ color: '#ff9fb4', roughness: .1, transmission: .5, transparent: true, opacity: .32, depthWrite: false }),
  ringPl: new THREE.MeshPhysicalMaterial({ color: '#f4f8fb', roughness: .05, transmission: .85, thickness: .05, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false }),
  pump: new THREE.MeshPhysicalMaterial({ color: '#d7dbe0', roughness: .3, metalness: .7 }),
  rotor: new THREE.MeshPhysicalMaterial({ color: '#2f6fe0', roughness: .4, clearcoat: .5 }),
  filter: new THREE.MeshPhysicalMaterial({ color: '#fff3d6', roughness: .4, transmission: .4, transparent: true, opacity: .85 }),
  gas: new THREE.MeshPhysicalMaterial({ color: '#2f6fe0', roughness: .3, clearcoat: .7 }),
  tube: new THREE.MeshPhysicalMaterial({ color: '#f2f6f8', roughness: .1, transmission: .7, transparent: true, opacity: .6, depthWrite: false }),
  nutri: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7d9a').multiplyScalar(1.6) }),
  waste: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffbf3d').multiplyScalar(1.5) }),
  bubble: new THREE.MeshBasicMaterial({ color: new THREE.Color('#9fe3ff').multiplyScalar(1.4) }),
  neurite: new THREE.MeshBasicMaterial({ color: new THREE.Color('#6fdcff').multiplyScalar(1.1), transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }),
  glow: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  organoid: new THREE.MeshPhysicalMaterial({ color: '#f2d3c8', roughness: .55, sheen: .5, sheenColor: '#ffd6e0', sheenRoughness: .6, emissive: '#ff7d9a', emissiveIntensity: 0 }),
  rack: new THREE.MeshPhysicalMaterial({ color: '#2a2e34', roughness: .45, metalness: .5 }),
  led: new THREE.MeshBasicMaterial({ color: new THREE.Color('#59d4ff').multiplyScalar(2) }),
};
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const rbox = (sx, sy, sz, r, mat) => { // rounded box via extruded rounded rect (XZ), height y
  const s = new THREE.Shape(), a = sx / 2 - r, b = sz / 2 - r;
  s.moveTo(-a, -sz / 2); s.lineTo(a, -sz / 2); s.absarc(a, -b, r, -Math.PI / 2, 0); s.lineTo(sx / 2, b); s.absarc(a, b, r, 0, Math.PI / 2); s.lineTo(-a, sz / 2); s.absarc(-a, b, r, Math.PI / 2, Math.PI); s.lineTo(-sx / 2, -b); s.absarc(-a, -b, r, Math.PI, Math.PI * 1.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: sy, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 3, curveSegments: 10 }); g.rotateX(-Math.PI / 2); g.translate(0, -sy / 2, 0); return sh(new THREE.Mesh(g, mat)); };
const cyl = (r, h, mat, seg = 32) => sh(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat));

// ---------- floor ----------
{ const f = new THREE.Mesh(new THREE.CircleGeometry(40, 64), M.floor); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; scene.add(f); }

// ---------- the unit ----------
const unit = new THREE.Group(); scene.add(unit);
const L = {};   // layers: { g, y0 (assembled), dy (exploded extra) }
const layer = (name, y0, dy) => { const g = new THREE.Group(); g.position.y = y0; unit.add(g); L[name] = { g, y0, dy }; return g; };
// base + life-support tray
const base = layer('base', 0, 0);
{ const b = rbox(3.2, .3, 2.4, .25, M.shell); b.position.y = .17; base.add(b);
  const strip = box(2.6, .03, .02, M.accent, 0, .22, 1.215); base.add(strip); }
const tray = layer('tray', .32, 0);
const PUMP = [new THREE.Vector3(-1.0, 0, .45), new THREE.Vector3(-1.0, 0, -.45)];
const pumpRotors = [];
for (const p of PUMP) { const b = cyl(.24, .34, M.pump); b.position.set(p.x, .17, p.z); tray.add(b); const r = new THREE.Group(); r.position.set(p.x, .38, p.z); tray.add(r);
  r.add(cyl(.17, .06, M.rotor)); for (let k = 0; k < 3; k++) { const rl = cyl(.04, .08, M.pump, 12); rl.position.set(Math.cos(k * 2.09) * .12, .02, Math.sin(k * 2.09) * .12); r.add(rl); } pumpRotors.push(r); }
const FILT = new THREE.Vector3(1.0, 0, .45);
{ const f = cyl(.19, .5, M.filter); f.position.set(FILT.x, .25, FILT.z); tray.add(f); for (let k = 0; k < 6; k++) { const rb = cyl(.2, .015, M.pump); rb.position.set(FILT.x, .05 + k * .08, FILT.z); tray.add(rb); }
  const cap = cyl(.13, .06, M.pump); cap.position.set(FILT.x, .53, FILT.z); tray.add(cap); }
const GAS = new THREE.Vector3(1.0, 0, -.45);
{ const g = new THREE.Mesh(new THREE.CapsuleGeometry(.16, .55, 8, 24), M.gas); g.rotation.z = Math.PI / 2; g.position.set(GAS.x, .2, GAS.z); tray.add(sh(g));
  const v = cyl(.05, .14, M.pump, 12); v.position.set(GAS.x - .1, .38, GAS.z); tray.add(v); }
// silicon board
const pcbL = layer('pcb', .78, .9);
{ pcbL.add(box(2.2, .06, 1.7, M.pcb)); pcbL.add(box(.5, .05, .5, M.ic, -.6, .05, -.35)); pcbL.add(box(.36, .05, .3, M.ic, .65, .05, -.4)); pcbL.add(box(.3, .05, .22, M.ic, .7, .05, .45));
  const geos = []; for (let k = 0; k < 14; k++) geos.push(new THREE.BoxGeometry(.02, .005, .9).translate(-.5 + k * .075, .033, .2)); for (let k = 0; k < 8; k++) geos.push(new THREE.BoxGeometry(.7, .005, .02).translate(.35, .033, -.1 + k * .06));
  pcbL.add(sh(new THREE.Mesh(mergeGeometries(geos), M.gold))); }
// heater plate
const heatL = layer('heat', .9, 1.6);
heatL.add(box(1.4, .05, 1.4, M.heater));
// MEA chip + culture well
const meaL = layer('mea', .96, 2.3);
const EPOS = [];
{ meaL.add(box(1.25, .04, 1.25, M.mglass, 0, .02, 0)); meaL.add(box(.68, .012, .68, M.silicon, 0, .046, 0));
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { if ((i === 0 || i === 7) && (j === 0 || j === 7)) continue; EPOS.push([-.28 + i * .08, -.28 + j * .08]); }
  EPOS.splice(EPOS.findIndex(p => Math.abs(p[0] - .04) < .01 && Math.abs(p[1] - .04) < .01), 1);   // 59: one site is the reference
  const eg = []; for (const [x, z] of EPOS) eg.push(new THREE.CylinderGeometry(.016, .016, .006, 12).translate(x, .055, z));
  // fan-out traces to the pads at the chip edge
  for (let k = 0; k < 28; k++) { const s = k % 4, n = Math.floor(k / 4), off = -.42 + n * .14; const pts = [[off, -.6], [off * .6, .6]]; void pts;
    const w = .006; const ang = s * Math.PI / 2; const g = new THREE.BoxGeometry(.24, .003, w).translate(.5, .05, off * .9); g.rotateY(ang); eg.push(g); const pad = new THREE.BoxGeometry(.05, .004, .04).translate(.6, .05, off * .9); pad.rotateY(ang); eg.push(pad); }
  meaL.add(sh(new THREE.Mesh(mergeGeometries(eg), M.gold)));
  const well = new THREE.Mesh(new THREE.CylinderGeometry(.44, .44, .22, 48, 1, true), M.ringPl); well.position.y = .15; meaL.add(well);
  const wr = new THREE.Mesh(new THREE.TorusGeometry(.44, .012, 8, 48), M.ringPl); wr.rotation.x = Math.PI / 2; wr.position.y = .26; meaL.add(wr); }
const medium = new THREE.Mesh(new THREE.CylinderGeometry(.43, .43, .14, 48), M.medium); medium.position.y = .12; meaL.add(medium);
// electrode glow (pulses in)
const eGlow = new THREE.InstancedMesh(new THREE.CircleGeometry(.03, 16).rotateX(-Math.PI / 2), M.glow.clone(), EPOS.length);
eGlow.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(EPOS.length * 3), 3); meaL.add(eGlow);
{ const m = new THREE.Matrix4(); EPOS.forEach(([x, z], i) => { m.makeTranslation(x, .06, z); eGlow.setMatrixAt(i, m); }); }
// neurons
const neurL = layer('neur', 1.03, 0);
const NN = 96, rnd = mulberry(7), NP = [];
while (NP.length < NN) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * .37; const p = new THREE.Vector3(Math.cos(a) * r, .005 + rnd() * .04, Math.sin(a) * r); if (NP.every(q => q.distanceTo(p) > .05)) NP.push(p); }
const soma = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.018, 2), new THREE.MeshBasicMaterial({ color: '#ffffff' }), NN);
soma.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NN * 3), 3); neurL.add(soma);
const halo = new THREE.InstancedMesh(new THREE.PlaneGeometry(.11, .11), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, map: (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })() }), NN);
halo.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NN * 3), 3); neurL.add(halo);
// neurites: each soma links to its 3 nearest neighbours with a gently curved thin tube; ordered by distance from the centre (growth order)
const EDGES = [];
{ const seen = new Set(); NP.forEach((p, i) => { NP.map((q, j) => [q.distanceTo(p), j]).filter(x => x[1] !== i).sort((a, b) => a[0] - b[0]).slice(0, 3).forEach(([d, j]) => { const k = i < j ? i + '_' + j : j + '_' + i; if (seen.has(k) || d > .16) return; seen.add(k); EDGES.push([i, j]); }); }); }
const neuriteMeshes = EDGES.map(([i, j], n) => { const a = NP[i], b = NP[j], m = a.clone().lerp(b, .5); m.y += .015; m.x += (hash(n) - .5) * .03; m.z += (hash(n + 9) - .5) * .03;
  const g = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, b), 10, .0035, 5); const mesh = new THREE.Mesh(g, M.neurite); neurL.add(mesh); return { mesh, n: g.index.count, d: Math.min(a.length(), b.length()) }; });
// spike beams between electrodes and the lifted neuron layer
const beams = [...Array(14)].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, 1, 6), M.glow.clone()); m.material.color.set('#ff6b3d'); meaL.add(m); m.visible = false; return m; });
// housing lid (hollow shell with a glass window over the well)
const lidL = layer('lid', 0, 16);
{ const Hh = 1.25, y = .32 + Hh / 2, t = .07;
  lidL.add(box(3.2, Hh, t, M.shell, 0, y, -1.2 + t / 2)); lidL.add(box(t, Hh, 2.4, M.shell, -1.6 + t / 2, y, 0)); lidL.add(box(t, Hh, 2.4, M.shell, 1.6 - t / 2, y, 0));
  lidL.add(box(3.2, Hh, t, M.shell, 0, y, 1.2 - t / 2));
  const ty = .32 + Hh + .04; lidL.add(box(3.2, .08, .75, M.shell, 0, ty, .825)); lidL.add(box(3.2, .08, .75, M.shell, 0, ty, -.825)); lidL.add(box(1.0, .08, .9, M.shell, -1.1, ty, 0)); lidL.add(box(1.0, .08, .9, M.shell, 1.1, ty, 0));
  const gl = new THREE.Mesh(new THREE.BoxGeometry(1.2, .02, .9), M.glass); gl.position.y = ty; lidL.add(gl);
  lidL.add(box(1.8, .03, .02, M.accent, 0, .55, 1.205)); }
// tubes (rebuilt per frame: they stretch while the stack is exploded)
const tubeMeshes = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), M.tube); unit.add(m); return m; });
const FLOWN = 10;
const flow = [M.nutri, M.waste, M.bubble].map(mat => [...Array(FLOWN)].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(.028, 10, 8), mat); unit.add(m); return m; }));

// ---------- organoid platform (rented mini-brains) ----------
const orgP = new THREE.Group(); scene.add(orgP); orgP.position.set(0, 3.3, -.6); orgP.rotation.y = -.35;
const orgs = []; const OPL = new THREE.MeshStandardMaterial({ color: '#c9ced3', roughness: .8 }), OSI = new THREE.MeshStandardMaterial({ color: '#3a4250', roughness: .6, metalness: .2 });
{ const b = rbox(2.4, .25, 2.4, .2, new THREE.MeshPhysicalMaterial({ color: '#8e9298', roughness: .7 })); b.position.y = .13; orgP.add(b);
  for (let k = 0; k < 4; k++) { const cx = (k % 2 - .5) * 1.1, cz = (Math.floor(k / 2) - .5) * 1.1; const pl = box(.9, .04, .9, OPL, cx, .28, cz); orgP.add(pl); const mg = box(.5, .01, .5, OSI, cx, .305, cz); orgP.add(mg);
    for (let j = 0; j < 4; j++) { const g = new THREE.IcosahedronGeometry(.11, 4); const p = g.attributes.position; for (let v = 0; v < p.count; v++) { const x = p.getX(v), y = p.getY(v), z = p.getZ(v); const n = 1 + .12 * Math.sin(x * 40 + k) * Math.sin(y * 37 + j) * Math.sin(z * 43); p.setXYZ(v, x * n, y * n, z * n); } g.computeVertexNormals();
      const o = sh(new THREE.Mesh(g, M.organoid)); o.position.set(cx + (j % 2 - .5) * .24, .4, cz + (Math.floor(j / 2) - .5) * .24); orgP.add(o); orgs.push(o); } } }

// ---------- data-centre racks (the power comparison) ----------
const racks = new THREE.Group(); scene.add(racks); racks.position.set(0, 0, -5.5);
{ for (let k = 0; k < 9; k++) { const r = box(1.0, 4.2, 1.2, M.rack, (k - 4) * 1.15, 2.1, 0); racks.add(r);
    const leds = []; for (let j = 0; j < 14; j++) leds.push(new THREE.BoxGeometry(.6, .03, .02).translate((k - 4) * 1.15, .4 + j * .26, .61)); racks.add(new THREE.Mesh(mergeGeometries(leds), M.led)); } }

// ---------- motion ----------
const lidK = t => eio(seg(t, T.reveal - .1, T.reveal + 1.5)) * (1 - eio(seg(t, T.yet - .3, T.yet + 1.4))) * (t < T.course ? 1 : 1);
const explK = t => eio(seg(t, T.body - .1, T.body + 1.2)) * (1 - eio(seg(t, T.learn - .5, T.learn + .7)));
const neurLift = t => .7 * eio(seg(t, T.mea - .1, T.mea + .9)) * (1 - eio(seg(t, T.body - .1, T.body + .8)));
const neuriteK = t => t < T.stem - .4 ? 1 : 1 - seg(t, T.stem - .4, T.stem - .1) + eio(seg(t, T.grown - .1, T.grown + 1.8));
const rentK = t => eio(seg(t, T.rent - .1, T.rent + 1.3)) * (1 - eio(seg(t, T.why - .1, T.why + 1.2)));
const rackK = t => eio(seg(t, T.why, T.why + 1.6)) * (1 - eio(seg(t, T.course - .4, T.course + 1.2)));
// Pong game state (drawn by the overlay; the chip answers it)
function pong(t) {
  const t0 = T.pong - .3, t1 = T.dishb - .1; if (t < t0 || t > t1) return null;
  const P = 1.25, u = (t - t0) / P, n = Math.floor(u), f = u - n;   // one wall-to-paddle pass per P seconds
  const missAt = new Set([1, 4]);                                     // two misses, then it rallies
  const bx = (n % 2 === 0) ? f : 1 - f;                               // 0 = paddle side (left), 1 = wall
  const by = .5 + .38 * Math.sin(u * 2.1 + .6);
  const target = by, miss = missAt.has(n) && n % 2 === 0;
  return { bx, by, pad: miss ? target + (.32 * (1 - f)) * (hash(n) > .5 ? 1 : -1) + .25 : target, n, f, missNow: miss && f > .9, hitNow: !miss && n % 2 === 0 && f > .9, missAt, P, t0 };
}
window.PONG = pong;

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, 22, 20, 14, 0, 1.4, 0],
  [T.reveal, 26, 24, 10.5, 0, 1.7, 0],
  [T.neurons + .2, 30, 50, 4.4, 0, 1.25, 0],
  [T.alive + .8, 36, 58, 3.2, 0, 1.12, 0],
  [T.grown + 1.2, 44, 55, 3.6, 0, 1.12, 0],
  [T.mea + .8, 32, 30, 4.6, 0, 1.55, 0],
  [T.pout + .5, 26, 24, 4.4, 0, 1.5, 0],
  [T.body + 1.2, 28, 16, 13.5, 0, 3.4, 0],
  [T.pump + .5, 40, 22, 6.5, -.4, 1.2, 0],
  [T.gas + .3, 18, 22, 6.5, .6, 1.2, 0],
  [T.heat + .6, 30, 18, 8.5, 0, 2.7, 0],
  [T.life + .4, 24, 16, 13.5, 0, 3.4, 0],
  [T.learn + 1.0, 20, 22, 10, 0, 2.1, 0],
  [T.rally + .5, 14, 26, 9.5, 0, 2.0, 0],
  [T.cl1 + .5, -22, 20, 9, 0, 1.8, 0],
  [T.rent + 1.3, -6, 16, 13, 0, 2.5, 0],
  [T.org + .8, 4, 20, 12.5, 0, 2.7, 0],
  [T.why + 1.6, 0, 12, 20, 0, 4.2, -1.5],
  [T.claim + .5, 6, 14, 18, 0, 3.6, -1],
  [T.course + 1.4, 20, 22, 10.5, 0, 2.2, 0],
  [T.next, 26, 24, 10.5, 0, 2.0, 0],
  [DUR, 30, 26, 11.5, 0, 2.0, 0],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz] = camTrack(t); const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 200; post.dof.maxCoc = 8;
  const la = A - .9; key.position.set(tx + 14 * Math.sin(la), ty + 16, tz + 14 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 12 * Math.sin(A + Math.PI * .85), ty + 4, tz + 12 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 12, tz); top.lookAt(tx, ty, tz);
}

// ---------- events ----------
const EV = [{ t: T.reveal, type: 'lift' }, { t: T.neurons, type: 'spikes' }, { t: T.grown, type: 'grow' }, { t: T.mea, type: 'lift' }, { t: T.mea59, type: 'label' },
  { t: T.pin, type: 'pins' }, { t: T.pout, type: 'spikes' }, { t: T.body, type: 'spread' }, { t: T.pump, type: 'pump' }, { t: T.filt, type: 'label' }, { t: T.gas, type: 'gas' }, { t: T.heat, type: 'label' },
  { t: T.life, type: 'card' }, { t: T.learn - .3, type: 'land' }, { t: T.cl1, type: 'card' }, { t: T.rent + .1, type: 'spread' }, { t: T.org, type: 'label' }, { t: T.why + .1, type: 'hum' },
  { t: T.claim, type: 'card' }, { t: T.yet - .1, type: 'land' }, { t: T.next, type: 'card' }];
{ const t0 = T.pong - .3, P = 1.25; for (let n = 0; t0 + (n + 1) * P < T.dishb - .1; n++) if (n % 2 === 0) EV.push({ t: +(t0 + (n + .95) * P).toFixed(2), type: (n === 4 || n === 1) ? 'noise' : 'blip' }); }
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3(), col = new THREE.Color();
const flowCurve = (a, b, up) => new THREE.CatmullRomCurve3([a, a.clone().add(new THREE.Vector3(0, up, 0)), b.clone().add(new THREE.Vector3(0, up * .8, 0)), b]);
const spikeLevel = (i, t) => { const s = Math.floor(t * 9 + hash(i) * 50), f = t * 9 + hash(i) * 50 - s; return hash(i * 31 + s) > .9 ? Math.exp(-f * 3) : 0; };
window.render = t => {
  const lk = lidK(t), ek = explK(t), nl = neurLift(t), rk = rentK(t), kk = rackK(t);
  for (const n of Object.keys(L)) L[n].g.position.y = L[n].y0 + L[n].dy * (n === 'lid' ? lk : ek);
  L.neur.g.position.y = L.mea.g.position.y + .07 + nl + (L.mea.dy * 0);
  unit.rotation.y = .3 * rk;
  // pumps spin, heater glows during its line
  pumpRotors.forEach((r, i) => r.rotation.y = t * (2.2 + i * .4));
  M.heater.emissiveIntensity = .3 * (seg(t, T.heat - .1, T.heat + .4) * (1 - seg(t, T.life + .6, T.life + 1.1)));
  // tubes + flow: pump → well (nutrients), well → filter (waste), gas → well (bubbles)
  const wy = L.mea.g.position.y + .2;
  const ends = [[new THREE.Vector3(PUMP[0].x, L.tray.g.position.y + .42, PUMP[0].z), new THREE.Vector3(-.3, wy, .3)], [new THREE.Vector3(.3, wy, .3), new THREE.Vector3(FILT.x, L.tray.g.position.y + .56, FILT.z)], [new THREE.Vector3(GAS.x - .1, L.tray.g.position.y + .45, GAS.z), new THREE.Vector3(.3, wy, -.3)]];
  ends.forEach(([a, b], k) => { const c = flowCurve(a, b, .25 + .2 * ek); tubeMeshes[k].geometry.dispose(); tubeMeshes[k].geometry = new THREE.TubeGeometry(c, 40, .035, 8);
    const on = (lk > .5 || ek > .1) && t < T.rent + 1;
    const emph = k === 0 ? seg(t, T.pump - .2, T.pump + .3) : k === 1 ? seg(t, T.filt - .2, T.filt + .3) : seg(t, T.gas - .2, T.gas + .3);
    flow[k].forEach((m, i) => { const u = (i / FLOWN + t * (.25 + .25 * emph)) % 1; m.position.copy(c.getPointAt(u)); m.visible = on; m.scale.setScalar(.7 + .6 * emph * (1 - seg(t, T.life + .5, T.life + 1))); }); });
  // neurons: grow, spike; electrodes pulse (in) during "pulses in", neuron spikes (out) everywhere they're shown
  const gk = neuriteK(t);
  neuriteMeshes.forEach(e => { const k = clamp(gk * 1.6 - e.d * 1.6); e.mesh.geometry.setDrawRange(0, Math.floor(e.n * k / 6) * 6); });
  const stemLook = seg(t, T.stem - .4, T.stem - .1) * (1 - seg(t, T.grown + .2, T.grown + 1.2));
  const spikeOn = t > T.neurons - .2 ? 1 : .25;
  const pongS = pong(t), pinK = env(t, T.pin - .1, T.body), outK = env(t, T.pout - .1, T.body);
  NP.forEach((p, i) => { const s = spikeLevel(i, t) * spikeOn * (1 - stemLook * .8) * (1 + outK * 1.5);
    const sc = 1 + stemLook * .15 + s * .5; tmpM.compose(p, tmpQ.identity(), tmpS.setScalar(sc)); soma.setMatrixAt(i, tmpM);
    col.setRGB(.55 + 1.6 * s, .9 + 1.4 * s, 1.1 + 1.0 * s); if (stemLook > 0) col.lerp(new THREE.Color(.9, .9, .85), stemLook * .7); soma.setColorAt(i, col);
    tmpQ.copy(camera.quaternion); const pq = unit.getWorldQuaternion(new THREE.Quaternion()).invert(); tmpQ.premultiply(pq);
    tmpM.compose(p, tmpQ, tmpS.setScalar(.6 + 1.6 * s)); halo.setMatrixAt(i, tmpM); col.setRGB(.15 + .9 * s, .45 + .9 * s, .6 + .7 * s); halo.setColorAt(i, col); });
  soma.instanceMatrix.needsUpdate = halo.instanceMatrix.needsUpdate = soma.instanceColor.needsUpdate = halo.instanceColor.needsUpdate = true;
  // electrode pulses
  EPOS.forEach(([x, z], i) => { let v = 0;
    if (pinK > 0) { const s = Math.floor(t * 4 + hash(i) * 7); v = pinK * (hash(i * 13 + s) > .75 ? 1 : .08); }
    if (pongS) { const row = Math.round(pongS.by * 7), r = Math.round((z + .28) / .08); const hitRow = Math.abs(r - row) <= 1 && x < 0;
      v = Math.max(v, hitRow ? .8 * (.6 + .4 * Math.sin(t * 20)) : 0); const noise = pongS.missAt.has(pongS.n - 1) && pongS.n % 2 === 1 && pongS.f < .5; if (noise) v = Math.max(v, hash(i * 7 + Math.floor(t * 20)) > .5 ? 1 : 0); }
    col.setRGB(1.6 * v, .55 * v, .25 * v); eGlow.setColorAt(i, col); });
  eGlow.instanceColor.needsUpdate = true;
  beams.forEach((b, k) => { const on = (pinK + outK) > 0 && nl > .3; b.visible = on; if (!on) return; const e = EPOS[(k * 7 + Math.floor(t * 3)) % EPOS.length], up = k % 2 === 0;
    const h = nl + .02, ph = ((t * 2.2 + k * .37) % 1); b.position.set(e[0], .06 + h / 2, e[1]); b.scale.set(1, h, 1); b.material.color.set(up ? '#ff6b3d' : '#59d4ff').multiplyScalar(1.4 * Math.sin(Math.PI * ph) * (up ? pinK : outK)); });
  wellLight.position.set(unit.position.x, L.mea.g.position.y + .5, .2); wellLight.intensity = (lk > .3 || ek > .1) ? .8 : .4;
  M.accent.emissiveIntensity = 1.4 + .3 * Math.sin(t * 2);
  // organoids rise in on the right while the unit slides left
  orgP.position.y = 3.3 + 7 * (1 - rk); orgP.visible = rk > .01;
  orgs.forEach((o, i) => { o.scale.setScalar(.2 + .8 * eo(seg(t, T.fs + i * .05, T.fs + .5 + i * .05))); });
  M.organoid.emissiveIntensity = .25 + .25 * Math.sin(t * 5);
  racks.position.y = -4.6 * (1 - kk); racks.visible = kk > .01;
  M.led.color.set('#59d4ff').multiplyScalar(1.4 + .8 * Math.sin(t * 7));
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, L, unit, EPOS, NP, pongS, rk, kk, orgP, racks, ek, lk, PUMP, FILT, GAS, DUR });
};
function env(t, a, b, fi = .3, fo = .3) { return Math.min(seg(t, a, a + fi), 1 - seg(t, b - fo, b)); }
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
