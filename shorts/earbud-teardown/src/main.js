// What's inside an AirPod? — Exploded Teardown, 1080×1920. A generic AirPods-style earbud (schematic, no logos) at 100:1,
// cracked along its glue seam; the internals fly out into a vertical column, then it reassembles for noise cancellation.
// Units: model units. Y up, Z toward camera. Assembled bud: head centre HC, stem down to y ≈ -2.9.
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
const CUES = []; for (let li = 0; li < TL.vo.length; li++) { const v = TL.vo[li], d = VDUR[v.id]; const n = v.chunks.map(c => c.replace(/[^A-Za-z0-9]/g, '').length + 2), tot = n.reduce((a, b) => a + b, 0); let t = v.t; v.chunks.forEach((c, i) => { CUES.push({ id: v.id, i, t }); t += d * n[i] / tot; }); }
const cue = (id, i) => CUES.find(c => c.id === id && c.i === i).t;
const T = {
  hook: cue('v01', 0), scale: cue('v01', 1), open: cue('v02', 0), out: cue('v02', 1),
  batt: cue('v03', 0), cell: cue('v03', 1), mah: cue('v03', 3), chip: cue('v04', 0), ant: cue('v04', 2),
  spk: cue('v05', 0), coil: cue('v05', 1), pulse: cue('v05', 2), push: cue('v05', 3),
  mics: cue('v06', 0), vent: cue('v06', 2), force: cue('v07', 0), skin: cue('v07', 2),
  anc: cue('v08', 0), hear: cue('v08', 1), flip: cue('v08', 2), plays: cue('v08', 3), cancel: cue('v08', 4),
  rate: cue('v09', 0), glue: cue('v10', 0), glued: cue('v10', 1), zero: cue('v10', 2), next: cue('v11', 0),
  congrats: cue('v12', 0), card: cue('v12', 1),
};
window.T = T;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, .2, 300);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, ao: false });
post.bloom.strength = .5; post.bloom.radius = .5; post.bloom.threshold = 1.6;
post.vig.uniforms.amt.value = .34; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .06;
{
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createRadialGradient(540, 980, 80, 540, 960, 1500); gr.addColorStop(0, '#363a40'); gr.addColorStop(.45, '#212429'); gr.addColorStop(1, '#0c0d10');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = .6; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff4e8', 1.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 80 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 5, 16, 5); scene.add(rim);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .3));

// ---------- materials ----------
const em = (m, c = '#ff6b3d') => { m.emissive = new THREE.Color(c); m.emissiveIntensity = 0; return m; };
const M = {
  shell: em(new THREE.MeshPhysicalMaterial({ color: '#f4f3ef', roughness: .28, clearcoat: 1, clearcoatRoughness: .15, side: THREE.DoubleSide })),
  shellIn: new THREE.MeshPhysicalMaterial({ color: '#d8d6d0', roughness: .6, side: THREE.BackSide }),
  tip: new THREE.MeshPhysicalMaterial({ color: '#e9e8e3', roughness: .55, transmission: .25, thickness: .2, side: THREE.DoubleSide }),
  mesh: em(new THREE.MeshStandardMaterial({ color: '#2b2d31', roughness: .7, metalness: .3 })),
  cell: new THREE.MeshStandardMaterial({ color: '#c9ccd0', roughness: .22, metalness: 1 }),
  cellTop: new THREE.MeshStandardMaterial({ color: '#9aa0a6', roughness: .35, metalness: 1 }),
  wrap: new THREE.MeshPhysicalMaterial({ color: '#2f6fe0', roughness: .45, clearcoat: .4 }),
  pcb: new THREE.MeshPhysicalMaterial({ color: '#1f5a3c', roughness: .5, clearcoat: .4 }),
  chip: em(new THREE.MeshPhysicalMaterial({ color: '#141518', roughness: .3, clearcoat: .6 })),
  gold: em(new THREE.MeshStandardMaterial({ color: '#d9a441', roughness: .3, metalness: 1 }), '#ffb347'),
  flex: em(new THREE.MeshPhysicalMaterial({ color: '#c97a1e', roughness: .45, clearcoat: .5 }), '#ffb347'),
  steel: new THREE.MeshStandardMaterial({ color: '#5a6067', roughness: .35, metalness: .9 }),
  magnet: new THREE.MeshStandardMaterial({ color: '#34373c', roughness: .4, metalness: .6 }),
  copper: em(new THREE.MeshStandardMaterial({ color: '#c46a32', roughness: .3, metalness: 1 })),
  dia: em(new THREE.MeshPhysicalMaterial({ color: '#e6e3dc', roughness: .35, clearcoat: .8, side: THREE.DoubleSide })),
  black: em(new THREE.MeshPhysicalMaterial({ color: '#0e0f11', roughness: .15, clearcoat: 1 })),
  silver: em(new THREE.MeshStandardMaterial({ color: '#c3c7cc', roughness: .25, metalness: 1 })),
  glue: em(new THREE.MeshStandardMaterial({ color: '#e8d9b8', roughness: .6, transparent: true, opacity: 0 })),
  base: new THREE.MeshPhysicalMaterial({ color: '#2b2e33', roughness: .5, metalness: .3, clearcoat: .2 }),
};
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = sh(new THREE.Mesh(g, m)); o.position.set(x, y, z); return o; };
const cyl = (r1, r2, h, m, y = 0, seg = 40, open = false) => mesh(new THREE.CylinderGeometry(r1, r2, h, seg, 1, open), m, 0, y, 0);

// ---------- geometry of the assembled bud ----------
const HC = new THREE.Vector3(0, 1.45, 0), HR = new THREE.Vector3(1.15, 1.1, 1.05);   // head centre / radii
const SR = .31, ST = .7, SB = -2.6;                                                    // stem radius, top, bottom
const ND = new THREE.Vector3(-.5, .12, .86).normalize();                               // nozzle (sound) direction, toward the ear
const at = (k, dir = ND) => HC.clone().addScaledVector(dir, k);
const EXP_TILT = new THREE.Euler(.95, 0, 0);    // exploded parts: face tilted toward the camera
const qAxis = v => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());
const qBasis = (x, y) => { const X = x.clone().normalize(), Y = y.clone().normalize(), Z = new THREE.Vector3().crossVectors(X, Y); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); };
const qE = e => new THREE.Quaternion().setFromEuler(e);
const EXPAX = new THREE.Vector3(0, 1, 0).applyEuler(EXP_TILT);   // world axis of exploded discs

const bud = new THREE.Group(); scene.add(bud);
const P = {};
// part: local +Y is its face normal / axis. asm/exp: { p, q, s }. delay staggers the fly-out.
function part(name, build, asm, exp, delay = 0) { const g = new THREE.Group(); build(g); bud.add(g); P[name] = { g, asm: { s: 1, ...asm }, exp: { s: 1, q: qE(EXP_TILT), ...exp }, delay }; return g; }

// shell halves (x<0 and x>0), split on the glue seam
function shellHalf(sign) {
  return g => {
    const ps = sign > 0 ? Math.PI / 2 : -Math.PI / 2;
    const head = new THREE.SphereGeometry(1, 64, 40, ps, Math.PI); head.scale(HR.x, HR.y, HR.z); head.translate(HC.x, HC.y, HC.z);
    g.add(mesh(head, M.shell));
    const ts = sign > 0 ? 0 : Math.PI;
    const stem = new THREE.CylinderGeometry(SR, SR * 1.04, ST - SB, 40, 1, true, ts, Math.PI); stem.translate(0, (ST + SB) / 2, 0); g.add(mesh(stem, M.shell));
    const cap = new THREE.SphereGeometry(SR * 1.04, 32, 16, ps, Math.PI, Math.PI / 2, Math.PI / 2); cap.translate(0, SB, 0); g.add(mesh(cap, M.shell));
    // neck fillet between head and stem
    const neck = new THREE.CylinderGeometry(SR * 1.0, .62, .9, 40, 1, true, ts, Math.PI); neck.translate(0, ST + .25, 0); g.add(mesh(neck, M.shell));
  };
}
const SHX = 3.6;
part('shellL', shellHalf(-1), { p: new THREE.Vector3(), q: new THREE.Quaternion() }, { p: new THREE.Vector3(-SHX, 2.4, -.6), q: qE(new THREE.Euler(0, -.75, .12)) });
part('shellR', shellHalf(1), { p: new THREE.Vector3(), q: new THREE.Quaternion() }, { p: new THREE.Vector3(SHX, 2.4, -.6), q: qE(new THREE.Euler(0, .75, -.12)) });
// glue seam: a bead around the head and down both sides of the stem (fades away when the halves part)
const glue = new THREE.Group(); bud.add(glue);
{ const tor = new THREE.TorusGeometry(1, .045, 8, 96); tor.rotateY(Math.PI / 2); tor.scale(1, HR.y + .02, HR.z + .02); tor.translate(HC.x, HC.y, HC.z); glue.add(mesh(tor, M.glue));
  for (const z of [-1, 1]) glue.add(mesh(new THREE.BoxGeometry(.06, ST - SB + .3, .06), M.glue, 0, (ST + SB) / 2 + .1, z * (SR + .02))); }

// ear tip + nozzle grille
part('tip', g => {
  const prof = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI / 2; prof.push(new THREE.Vector2(.21 + .52 * Math.cos(a), -.12 + .5 * Math.sin(a))); }
  prof.push(new THREE.Vector2(.2, .36));
  g.add(mesh(new THREE.LatheGeometry(prof, 48), M.tip));
  g.add(cyl(.28, .3, .5, M.shell, -.08)); g.add(cyl(.205, .205, .02, M.mesh, .35)); g.add(cyl(.21, .23, .45, M.shell, .12));
}, { p: at(1.12), q: qAxis(ND) }, { p: new THREE.Vector3(0, 8.0, 0) }, .25);

// speaker driver: magnet assembly, voice coil, diaphragm (assembled behind the nozzle)
part('magnet', g => {
  const cup = new THREE.LatheGeometry([new THREE.Vector2(.22 + .1, -.16), new THREE.Vector2(.52, -.16), new THREE.Vector2(.52, .12), new THREE.Vector2(.31, .12), new THREE.Vector2(.31, -.16)].map(v => v), 48);
  g.add(mesh(cup, M.steel)); g.add(cyl(.5, .5, .04, M.steel, -.18)); g.add(cyl(.21, .21, .3, M.magnet, -.02)); g.add(cyl(.2, .2, .04, M.steel, .14));
}, { p: at(.2), q: qAxis(ND), s: .95 }, { p: new THREE.Vector3(0, 4.6, 0), s: 1.25 }, .1);
part('coil', g => {
  const c = new THREE.CylinderGeometry(.26, .26, .2, 48, 6, true); g.add(mesh(c, M.copper));
  for (let i = 0; i < 9; i++) { const r = new THREE.TorusGeometry(.262, .012, 6, 48); r.rotateX(Math.PI / 2); g.add(mesh(r, M.copper, 0, -.09 + i * .0225, 0)); }
  const l1 = new THREE.TorusGeometry(.18, .008, 6, 24, 1.2); g.add(mesh(l1, M.gold, .2, .02, 0));
}, { p: at(.4), q: qAxis(ND), s: .95 }, { p: new THREE.Vector3(0, 5.5, 0), s: 1.25 }, .15);
part('dia', g => {
  const dome = new THREE.SphereGeometry(.3, 40, 12, 0, Math.PI * 2, 0, .9); dome.scale(1, .5, 1); dome.translate(0, -.09, 0); g.add(mesh(dome, M.dia));
  const sur = new THREE.TorusGeometry(.41, .05, 10, 64); sur.rotateX(Math.PI / 2); sur.scale(1, .6, 1); g.add(mesh(sur, M.dia, 0, -.04, 0));
  g.add(mesh(new THREE.RingGeometry(.26, .5, 64).rotateX(-Math.PI / 2), M.dia, 0, -.06, 0));
  const fr = new THREE.TorusGeometry(.52, .025, 8, 64); fr.rotateX(Math.PI / 2); g.add(mesh(fr, M.steel, 0, -.07, 0));
}, { p: at(.55), q: qAxis(ND), s: .95 }, { p: new THREE.Vector3(0, 6.4, 0), s: 1.25 }, .2);

// battery: lithium-ion button cell
const BATT_ASM = HC.clone().add(new THREE.Vector3(.18, -.05, -.38));
part('batt', g => {
  g.add(cyl(.45, .45, .26, M.cell, 0, 64)); g.add(cyl(.33, .33, .03, M.cellTop, .14, 64));
  const lip = new THREE.TorusGeometry(.44, .015, 6, 64); lip.rotateX(Math.PI / 2); g.add(mesh(lip, M.cellTop, 0, .125, 0));
  g.add(mesh(new THREE.BoxGeometry(.5, .012, .1), M.gold, .55, .1, 0));
}, { p: BATT_ASM, q: qAxis(new THREE.Vector3(.35, .25, -.9)) }, { p: new THREE.Vector3(0, 3.2, 0), s: 1.3 }, 0);

// flat parts: local X = length, local Y = face normal
const STEM_Q = qBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1));
part('board', g => {
  g.add(mesh(new THREE.BoxGeometry(1.15, .04, .36), M.pcb));
  g.add(mesh(new THREE.BoxGeometry(.34, .06, .26), M.chip, -.15, .05, 0));
  g.add(mesh(new THREE.BoxGeometry(.16, .05, .16), M.chip, .25, .045, .02));
  for (let i = 0; i < 6; i++) g.add(mesh(new THREE.BoxGeometry(.05, .03, .03), M.silver, .38 + (i % 3) * .07, .035, -.1 + Math.floor(i / 3) * .07));
  for (let i = 0; i < 8; i++) g.add(mesh(new THREE.BoxGeometry(.012, .005, .26), M.gold, -.5 + i * .02, .023, 0));
}, { p: new THREE.Vector3(0, .1, 0), q: STEM_Q }, { p: new THREE.Vector3(0, 1.75, 0), s: 1.6 }, .05);
part('ant', g => {
  g.add(mesh(new THREE.BoxGeometry(1.2, .02, .13), M.flex));
  g.add(mesh(new THREE.BoxGeometry(1.0, .025, .04), M.gold, -.04, .012, 0));
  g.add(mesh(new THREE.BoxGeometry(.04, .025, .1), M.gold, .46, .012, 0));
}, { p: new THREE.Vector3(.0, -1.1, -.12), q: STEM_Q }, { p: new THREE.Vector3(0, .65, 0), s: 1.45 }, .1);
part('skin', g => {
  g.add(mesh(new THREE.BoxGeometry(.36, .05, .22), M.black));
  for (const x of [-.08, .08]) g.add(mesh(new THREE.CylinderGeometry(.045, .045, .02, 20), M.silver, x, .03, 0));
}, { p: HC.clone().addScaledVector(new THREE.Vector3(-.55, -.35, .76).normalize(), 1.0), q: qAxis(new THREE.Vector3(-.55, -.35, .76)) }, { p: new THREE.Vector3(0, -.4, 0), s: 2.0 }, .2);
part('force', g => {
  g.add(mesh(new THREE.BoxGeometry(.78, .02, .14), M.silver));
  for (let i = 0; i < 6; i++) g.add(mesh(new THREE.BoxGeometry(.06, .025, .1), M.flex, -.3 + i * .12, .01, 0));
}, { p: new THREE.Vector3(0, -.6, .2), q: STEM_Q }, { p: new THREE.Vector3(0, -1.3, 0), s: 1.5 }, .15);
const VENT_DIR = new THREE.Vector3(.55, .45, -.7).normalize();
part('vent', g => {
  const r = new THREE.TorusGeometry(.17, .03, 8, 32); r.rotateX(Math.PI / 2); g.add(mesh(r, M.steel));
  g.add(cyl(.16, .16, .02, M.mesh, 0, 32));
}, { p: HC.clone().add(new THREE.Vector3(VENT_DIR.x * HR.x, VENT_DIR.y * HR.y, VENT_DIR.z * HR.z).multiplyScalar(1.0)), q: qAxis(VENT_DIR) }, { p: new THREE.Vector3(0, -2.3, 0), s: 2.4 }, .2);
// two beamforming mics: one on top of the head, one at the stem tip
const mic = g => { g.add(cyl(.12, .12, .14, M.silver, -.07, 32)); g.add(cyl(.1, .1, .02, M.mesh, .005, 32)); };
const MIC1_DIR = new THREE.Vector3(.3, .9, -.3).normalize();
part('mic1', mic, { p: HC.clone().add(new THREE.Vector3(MIC1_DIR.x * HR.x, MIC1_DIR.y * HR.y, MIC1_DIR.z * HR.z)), q: qAxis(MIC1_DIR) }, { p: new THREE.Vector3(-.5, -3.45, 0), s: 2.2 }, .25);
part('mic2', mic, { p: new THREE.Vector3(0, SB - SR * 1.04 + .01, 0), q: qAxis(new THREE.Vector3(0, -1, 0)) }, { p: new THREE.Vector3(.5, -3.45, 0), s: 2.2 }, .3);

// pedestal under the assembled bud
const ped = mesh(new THREE.CylinderGeometry(2.2, 2.4, .2, 64), M.base, 0, SB - .62, 0); scene.add(ped);

// ---------- motion ----------
const pop = x => 1 - Math.pow(1 - ss(x), 3);
const explK = (t, d = 0) => pop(seg(t, T.open + .35 + d, T.open + 1.75 + d)) * (1 - eio(seg(t, T.anc - 1.1 + d * .5, T.anc + .4 + d * .5)));
const dmK = t => eio(seg(t, T.coil + .2, T.coil + 1.1));   // coil + diaphragm drop onto the magnet
const vib = t => (t > T.push - .1 && t < T.mics + .3) ? Math.sin((t - T.push) * 2 * Math.PI * 4.5) * ss(seg(t, T.push - .1, T.push + .3)) * (1 - ss(seg(t, T.mics - .2, T.mics + .3))) : 0;
const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3();
function placeParts(t) {
  for (const n of Object.keys(P)) {
    const p = P[n], k = explK(t, p.delay), lift = Math.sin(Math.PI * k) * .6;
    const ep = p.exp.p.clone();
    if (n === 'coil') ep.lerp(P.magnet.exp.p.clone().addScaledVector(EXPAX, .12), dmK(t)).addScaledVector(EXPAX, vib(t) * .07);
    if (n === 'dia') ep.lerp(P.magnet.exp.p.clone().addScaledVector(EXPAX, .3), dmK(t)).addScaledVector(EXPAX, vib(t) * .07);
    p.g.position.lerpVectors(p.asm.p, ep, k); p.g.position.z += lift * (n.startsWith('shell') ? -1 : 1);
    if (n.startsWith('shell')) p.g.position.sub(p.asm.p);   // shells are built in place (asm.p = origin)
    tmpQ.slerpQuaternions(p.asm.q, p.exp.q, k); p.g.quaternion.copy(tmpQ);
    p.g.scale.setScalar(lerp(p.asm.s, p.exp.s, k));
  }
}

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, 28, 6, 15, 0, .95, 0],
  [T.scale, 18, 8, 14.5, 0, .9, 0],
  [T.open + .2, 8, 6, 15, 0, 1.0, 0],
  [T.out + 1.0, 0, 6, 30, 0, 2.4, 0],
  [T.batt + .6, 0, 6, 29, 0, 2.4, 0],
  [T.cell + .3, 6, 8, 7.4, 0, 3.6, 0],
  [T.chip + .5, 4, 8, 7.6, 0, 1.6, 0],
  [T.ant + .6, 2, 8, 7.6, 0, 1.15, 0],
  [T.spk + .6, 10, 8, 9.5, 0, 5.6, 0],
  [T.pulse + .2, 14, 8, 7.0, 0, 4.85, 0],
  [T.mics - .3, 12, 8, 7.2, 0, 4.85, 0],
  [T.mics + .7, 0, 8, 7.6, 0, -2.85, 0],
  [T.force - .2, 0, 8, 7.6, 0, -2.65, 0],
  [T.force + .6, -4, 8, 7.4, 0, -.85, 0],
  [T.anc - .2, 12, 8, 19, 0, 1.2, 0],
  [T.hear + .4, 22, 7, 22.4, 0, 1.3, 0],
  [T.glue, 28, 6, 22.4, 0, 1.3, 0],
  [T.glued + .3, 24, 4, 15.5, 0, .6, 0],
  [T.next, 36, 6, 16, 0, .5, 0],
  [T.congrats, 20, 8, 17, 0, .5, 0],
  [DUR, -10, 10, 18, 0, .6, 0],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz] = camTrack(t); const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 200; post.dof.maxCoc = 8;
  const la = A - .9; key.position.set(tx + 14 * Math.sin(la), ty + 16, tz + 14 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 12 * Math.sin(A + Math.PI * .85), ty + 4, tz + 12 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz);
}

// ---------- events (foley) ----------
const EV = [{ t: T.scale, type: 'lift' }, { t: T.open + .15, type: 'crack' }, { t: T.open + .4, type: 'spread' },
  { t: T.cell, type: 'label' }, { t: T.mah, type: 'card' }, { t: T.chip + .2, type: 'label' }, { t: T.ant + .2, type: 'label' },
  { t: T.spk + .2, type: 'label' }, { t: T.coil + 1.0, type: 'clunk' }, { t: T.push, type: 'buzz' },
  { t: T.mics + .2, type: 'label' }, { t: T.vent + .2, type: 'label' }, { t: T.force + .2, type: 'label' }, { t: T.skin + .2, type: 'label' },
  { t: T.anc - .3, type: 'land' }, { t: T.glued, type: 'crack' }, { t: T.zero, type: 'card' }, { t: T.next, type: 'card' }, { t: T.card, type: 'card' }];
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
const wp = n => P[n].g.getWorldPosition(new THREE.Vector3());
const pulse = (t, a, b, f = 5) => (t > a && t < b) ? (.55 + .45 * Math.sin((t - a) * f)) * ss(seg(t, a, a + .3)) * (1 - ss(seg(t, b - .3, b))) : 0;
window.render = t => {
  placeParts(t);
  // the whole bud turns slowly while assembled
  const ek = explK(t);
  bud.rotation.y = (1 - ek) * (t < T.open ? .35 * Math.sin(t * .5) : 0);
  // glue seam: visible only while closed; glows on "glued"
  M.glue.opacity = 1 - ss(seg(t, T.open + .2, T.open + .6)) * (1 - ss(seg(t, T.anc, T.anc + .5)));
  glue.visible = M.glue.opacity > .01;
  M.glue.emissiveIntensity = 3.2 * (pulse(t, T.open - .2, T.open + .5, 9) + pulse(t, T.glue + .2, T.next - .2, 4));
  M.shell.emissiveIntensity = 0;
  M.cell.emissive = M.cell.emissive || new THREE.Color();
  M.chip.emissiveIntensity = .5 * pulse(t, T.chip, T.ant);
  M.flex.emissiveIntensity = .6 * pulse(t, T.ant, T.spk - .2, 8); M.gold.emissiveIntensity = .5 * pulse(t, T.ant, T.spk - .2, 8);
  M.copper.emissiveIntensity = .5 * pulse(t, T.pulse, T.mics, 9);
  M.dia.emissiveIntensity = .12 * pulse(t, T.push, T.mics, 9);
  M.mesh.emissiveIntensity = .9 * (pulse(t, T.mics, T.vent + .5, 6) + pulse(t, T.hear, T.flip + .4, 7)) + .7 * pulse(t, T.plays, T.rate + .6, 7);
  M.silver.emissiveIntensity = .25 * pulse(t, T.force, T.anc - .6, 6);
  M.black.emissiveIntensity = .5 * pulse(t, T.skin, T.anc - .6, 6);
  ped.position.y = SB - .62 - 6 * ss(seg(t, T.open, T.open + 1.2)) * (1 - ss(seg(t, T.anc - 1, T.anc + .3)));
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, wp, EXPAX, vib, ND, ek });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
