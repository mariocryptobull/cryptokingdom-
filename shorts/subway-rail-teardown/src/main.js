// How a Subway Train Rides Its Rails — Exploded Teardown, 1080×1920. A schematic section of New York-style subway track
// (ballasted wood-tie half, concrete-block half), third rail with cover board, and a plain schematic car (no logos).
// Units ≈ metres. X = along the track (train moves +x), Y up, Z across (toward the camera = third-rail side).
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
const CUES = []; for (const v of TL.vo) { const d = VDUR[v.id]; const n = v.chunks.map(c => c.replace(/[^A-Za-z0-9]/g, '').length + 2), tot = n.reduce((a, b) => a + b, 0); let t = v.t; v.chunks.forEach((c, i) => { CUES.push({ id: v.id, i, t }); t += d * n[i] / tot; }); }
const cue = (id, i) => CUES.find(c => c.id === id && c.i === i).t;
const T = {
  rails0: cue('v01', 1), apart: cue('v01', 2), rails: cue('v02', 0), lb: cue('v02', 1), gauge: cue('v02', 2),
  plates: cue('v03', 0), ties: cue('v03', 1), bed: cue('v03', 2), third: cue('v04', 0), volts: cue('v04', 1), board: cue('v04', 2),
  shoe: cue('v05', 0), slide: cue('v05', 1), motors: cue('v05', 2), wheels: cue('v06', 0), cone: cue('v06', 1), flange: cue('v06', 2),
  curve: cue('v07', 0), wider: cue('v07', 1), more: cue('v07', 2), steers: cue('v07', 3), weight: cue('v08', 0), patch: cue('v08', 1), dime: cue('v08', 2),
  sig: cue('v09', 0), short: cue('v09', 1), circuit: cue('v09', 2), signal: cue('v09', 3),
  roof: cue('v10', 0), ceil: cue('v10', 1), inches: cue('v10', 2), curves: cue('v10', 3), below: cue('v10', 4),
  deaths: cue('v11', 0), y25: cue('v11', 2), kills: cue('v11', 3), dont: cue('v11', 4), next: cue('v12', 0), congrats: cue('v13', 0), card: cue('v13', 1),
};
T.down = T.shoe - 1.3;      // track reassembles just before the car rolls back in
T.xray0 = T.wheels - .5; T.xray1 = T.sig - .1;   // isolate one wheelset
window.T = T;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, .05, 300);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, ao: false });
post.bloom.strength = .45; post.bloom.radius = .5; post.bloom.threshold = 1.6;
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
Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 80 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 5, 16, 5); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .5, 14, 14); scene.add(top);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .25));

// ---------- materials ----------
const M = {
  base: new THREE.MeshPhysicalMaterial({ color: '#2b2e33', roughness: .5, metalness: .3, clearcoat: .2 }),
  stone: new THREE.MeshStandardMaterial({ color: '#8b8a86', roughness: .95 }),
  ballast: new THREE.MeshStandardMaterial({ color: '#6c6a66', roughness: 1 }),
  wood: new THREE.MeshPhysicalMaterial({ color: '#5c4330', roughness: .85 }),
  conc: new THREE.MeshPhysicalMaterial({ color: '#b9b5ad', roughness: .9 }),
  block: new THREE.MeshPhysicalMaterial({ color: '#cfcbc2', roughness: .8 }),
  boot: new THREE.MeshStandardMaterial({ color: '#1d1e20', roughness: .8 }),
  plate: new THREE.MeshStandardMaterial({ color: '#3d4146', roughness: .5, metalness: .8 }),
  rail: new THREE.MeshStandardMaterial({ color: '#b9bec4', roughness: .28, metalness: 1, emissive: '#ff6b3d', emissiveIntensity: 0 }),
  third: new THREE.MeshStandardMaterial({ color: '#7d828a', roughness: .4, metalness: .9, emissive: '#ff6b3d', emissiveIntensity: 0 }),
  insul: new THREE.MeshPhysicalMaterial({ color: '#efe9da', roughness: .3, clearcoat: .8 }),
  board: new THREE.MeshPhysicalMaterial({ color: '#d9a44a', roughness: .55, clearcoat: .3 }),
  bracket: new THREE.MeshStandardMaterial({ color: '#4a5056', roughness: .45, metalness: .7 }),
  body: new THREE.MeshPhysicalMaterial({ color: '#cdd1d6', roughness: .32, metalness: .75, clearcoat: .4 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#15191e', roughness: .1, metalness: .2, clearcoat: 1 }),
  door: new THREE.MeshPhysicalMaterial({ color: '#b3b8be', roughness: .35, metalness: .7 }),
  truck: new THREE.MeshStandardMaterial({ color: '#33373c', roughness: .55, metalness: .6 }),
  wheel: new THREE.MeshStandardMaterial({ color: '#9aa0a6', roughness: .3, metalness: 1 }),
  tread: new THREE.MeshStandardMaterial({ color: '#d8dce0', roughness: .2, metalness: 1, emissive: '#ff6b3d', emissiveIntensity: 0 }),
  motor: new THREE.MeshPhysicalMaterial({ color: '#2f6fe0', roughness: .4, clearcoat: .5, emissive: '#ff6b3d', emissiveIntensity: 0 }),
  shoe: new THREE.MeshPhysicalMaterial({ color: '#f2c230', roughness: .4, clearcoat: .5, emissive: '#ff6b3d', emissiveIntensity: 0 }),
  dummy: new THREE.MeshPhysicalMaterial({ color: '#8f9296', roughness: .7 }),
  tunnel: new THREE.MeshPhysicalMaterial({ color: '#a7a39b', roughness: .9 }),
  signal: new THREE.MeshStandardMaterial({ color: '#25282c', roughness: .6, metalness: .4 }),
  lampG: new THREE.MeshBasicMaterial({ color: '#2a3a2e' }), lampR: new THREE.MeshBasicMaterial({ color: '#3a2422' }),
  patch: new THREE.MeshBasicMaterial({ color: '#ff8a4d', transparent: true, opacity: 0, depthWrite: false, depthTest: false }),
};
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const boxG = (sx, sy, sz, x, y, z) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);
const merged = (geos, mat) => sh(new THREE.Mesh(mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g)), mat));

// ---------- dimensions ----------
const X0 = -8, X1 = 8, XC = 1.5;              // track ends; ballast/wood ties for x < XC, concrete bed + blocks beyond
const BT = .3, TT = .48, PB = .505;           // bed top, tie top, rail base
const RH = .168, RT = PB + RH;                // rail height (115 lb/yd ≈ 6⅝ in), rail top
const ZR = .753;                              // rail centre (gauge 1435 mm between head inner faces)
const Z3 = 1.42, R3T = RT + .09;              // third rail centre, its top
const BOARD = R3T + .085;                     // cover board underside
const WR = .43;                                // wheel tread radius (34 in wheel)
const BODY0 = RT + 1.15, BODY1 = RT + 3.66, BL = 9, BW = 3.0;   // car body (schematic, shortened)
const TRK = 3.0, AX = 1.1;                    // truck centres ±3 from car centre, axles ±1.1 from truck centre
const CLR = .15;                              // ceiling clearance above the roof (≈ 6 in)

// ---------- exploded layers ----------
const L = {}; const layer = (n, dy, dz = 0) => { const g = new THREE.Group(); scene.add(g); L[n] = { g, dy, dz }; return g; };
scene.add(box(X1 - X0 + .6, .12, 5.2, M.base, 0, -.06, .25));
// track bed: ballast shoulder + loose stones (x < XC), concrete slab (x > XC)
const bed = layer('bed', 0);
{ const s = new THREE.Shape(); s.moveTo(-2.15, 0); s.lineTo(2.45, 0); s.lineTo(2.05, BT - .04); s.lineTo(-1.75, BT - .04); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: XC - X0, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(XC, 0, 0); bed.add(sh(new THREE.Mesh(g, M.ballast)));
  const rnd = mulberry(7), N = 3600, ig = new THREE.IcosahedronGeometry(.055, 0), im = new THREE.InstancedMesh(ig, M.stone, N); const o = new THREE.Object3D();
  for (let i = 0; i < N; i++) { const z = -1.75 + rnd() * 3.8, x = X0 + rnd() * (XC - X0 - .05); o.position.set(x, BT - .03 + rnd() * .05, z); o.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6); const k = .7 + rnd() * .8; o.scale.set(k, k * (.6 + rnd() * .4), k * (.8 + rnd() * .4)); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
  im.castShadow = im.receiveShadow = true; bed.add(im);
  bed.add(box(X1 - XC, BT, 4.2, M.conc, (X1 + XC) / 2, BT / 2, .15)); }
// ties: wood (every third one long, to carry a third-rail insulator) and twin concrete blocks in rubber boots
const ties = layer('ties', .75);
const tieXs = [], blkXs = [];
for (let x = X0 + .3; x < XC - .1; x += .6) tieXs.push(x);
for (let x = XC + .3; x < X1; x += .6) blkXs.push(x);
{ const geos = [];
  tieXs.forEach((x, i) => { const long = i % 3 === 0, z0 = -1.3, z1 = long ? 1.78 : 1.3; geos.push(boxG(.23, TT - BT, z1 - z0, x, (BT + TT) / 2, (z0 + z1) / 2)); });
  ties.add(merged(geos, M.wood));
  const bg = [], bb = [];
  blkXs.forEach(x => { for (const z of [-ZR, ZR]) { bg.push(boxG(.26, TT - BT - .02, .58, x, (BT + TT) / 2 + .01, z)); bb.push(boxG(.3, .1, .62, x, BT + .03, z)); } });
  ties.add(merged(bg, M.block)); ties.add(merged(bb, M.boot)); }
// tie plates + clips under each rail
const plates = layer('plates', 1.45);
{ const pg = [], cg = [];
  [...tieXs, ...blkXs].forEach(x => { for (const z of [-ZR, ZR]) { pg.push(boxG(.2, PB - TT, .38, x, (TT + PB) / 2, z)); for (const s of [-1, 1]) cg.push(boxG(.06, .035, .05, x, PB + .012, z + s * .1)); } });
  plates.add(merged(pg, M.plate)); plates.add(merged(cg, M.bracket)); }
// running rails: 115RE-like profile extruded along x
const railShape = (k = 1) => { const s = new THREE.Shape(), p = [[-.07, 0], [.07, 0], [.07, .012], [.012, .03], [.008, .11], [.035, .124], [.036, .168], [-.036, .168], [-.035, .124], [-.008, .11], [-.012, .03], [-.07, .012]];
  p.forEach(([a, b], i) => i ? s.lineTo(a * k, b * k) : s.moveTo(a * k, b * k)); s.closePath(); return s; };
const railGeo = (k, len) => { const g = new THREE.ExtrudeGeometry(railShape(k), { depth: len, bevelEnabled: false }); g.rotateY(Math.PI / 2); return g; };
const rails = layer('rails', 2.15);
for (const z of [-ZR, ZR]) { const m = sh(new THREE.Mesh(railGeo(1, X1 - X0), M.rail)); m.position.set(X0, PB, z); rails.add(m); }
// insulated joints (track-circuit block boundaries)
const joints = [-6, 6]; for (const x of joints) for (const z of [-ZR, ZR]) rails.add(box(.03, RH + .01, .16, M.boot, x, PB + RH / 2, z));
// third rail on insulators, cover board on brackets
const third = layer('third', 2.15, 1.0);
{ const m = sh(new THREE.Mesh(railGeo(1.05, X1 - X0), M.third)); m.position.set(X0, R3T - .168 * 1.05, Z3); third.add(m);
  const ig = [], bg = [];
  const posts = [...tieXs.filter((_, i) => i % 3 === 0), ...blkXs.filter((_, i) => i % 3 === 0)];
  posts.forEach(x => { ig.push(new THREE.CylinderGeometry(.055, .065, R3T - .176 - TT, 14).translate(x, (TT + R3T - .176) / 2, Z3)); });
  third.add(merged(ig, M.insul));
  blkXs.filter((_, i) => i % 3 === 0).forEach(x => third.add(box(.26, TT - BT, .3, M.block, x, (BT + TT) / 2, Z3)));
  const board = layer('board', 2.85, 1.3);
  board.add(box(X1 - X0, .022, .34, M.board, 0, BOARD + .011, Z3 + .05));
  posts.forEach(x => { bg.push(boxG(.05, BOARD + .03 - TT, .04, x, (TT + BOARD + .03) / 2, Z3 + .26), boxG(.05, .03, .2, x, BOARD + .02, Z3 + .17)); });
  board.add(merged(bg, M.bracket)); }

// ---------- signal (far side, at the block entrance) ----------
const SIGX = -7.0, SIGZ = 2.45;
{ const g = new THREE.Group(); g.position.set(SIGX, 0, SIGZ); g.scale.setScalar(1.5); g.rotation.y = .5; scene.add(g);
  g.add(box(.08, 2.1, .08, M.signal, 0, 1.05, 0)); g.add(box(.26, .56, .2, M.signal, 0, 2.2, 0));
  const lr = new THREE.Mesh(new THREE.CircleGeometry(.075, 20), M.lampR); lr.position.set(0, 2.33, .101); g.add(lr);
  const lg = new THREE.Mesh(new THREE.CircleGeometry(.075, 20), M.lampG); lg.position.set(0, 2.07, .101); g.add(lg); }

// ---------- the car (schematic, no logos) ----------
const car = new THREE.Group(); scene.add(car);
const body = new THREE.Group(); car.add(body);
{ body.add(box(BL, BODY1 - BODY0 - .12, BW, M.body, 0, (BODY0 + BODY1 - .12) / 2, 0));
  body.add(box(BL - .1, .12, BW - .36, M.body, 0, BODY1 - .06, 0));
  for (const s of [-1, 1]) { const z = s * (BW / 2 + .004);
    for (const x of [-3.3, -1.1, 1.1, 3.3]) { body.add(box(.95, 1.95, .01, M.door, x, BODY0 + .1 + .975, z)); body.add(box(.32, .7, .012, M.glass, x - .22, BODY0 + 1.5, z)); body.add(box(.32, .7, .012, M.glass, x + .22, BODY0 + 1.5, z)); }
    for (const x of [-2.2, 0, 2.2]) body.add(box(1.0, .72, .012, M.glass, x, BODY0 + 1.55, z)); }
  for (const s of [-1, 1]) { body.add(box(.012, .8, 1.0, M.glass, s * (BL / 2 + .004), BODY0 + 1.55, -.7)); body.add(box(.012, 1.9, .7, M.door, s * (BL / 2 + .004), BODY0 + 1.05, .45)); }
  body.add(box(BL - .4, .18, BW - .5, M.truck, 0, BODY0 - .09, 0)); }   // underframe
const trucks = [], wheelsets = [], shoes = [], motors = [];
// conical wheel: lathe profile (radius, axial) from the inner (flange) face outward; taper exaggerated for visibility
const TAPER = 1 / 6;
const wheelGeo = (() => { const p = [[.14, 0], [.47, 0], [.475, .012], [.468, .026], [.45, .036], [WR + .004, .046], [WR - TAPER * .085, .13], [WR - TAPER * .085 - .012, .142], [.14, .142]].map(([r, a]) => new THREE.Vector2(r, a));
  return new THREE.LatheGeometry(p, 64); })();
const WOFF = .075;      // axial distance from the inner face to the nominal contact point
const makeWheel = side => { const g = wheelGeo.clone(); g.rotateX(side > 0 ? Math.PI / 2 : -Math.PI / 2); const m = sh(new THREE.Mesh(g, M.tread)); m.position.z = side * (ZR - WOFF); return m; };
for (const tx of [-TRK, TRK]) {
  const tr = new THREE.Group(); tr.position.x = tx; car.add(tr); const frame = new THREE.Group(); tr.add(frame);
  for (const s of [-1, 1]) { frame.add(box(2.9, .2, .14, M.truck, 0, RT + WR + .02, s * .98)); frame.add(box(.36, .26, .2, M.truck, -AX, RT + WR, s * .98)); frame.add(box(.36, .26, .2, M.truck, AX, RT + WR, s * .98));
    for (const dx of [-.35, .35]) frame.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .3, 14), M.chrome || M.wheel)).translateX(dx).translateY(RT + WR + .26).translateZ(s * .98)); }
  frame.add(box(.4, .2, 2.0, M.truck, 0, RT + WR + .14, 0));
  // contact shoe: beam off the near side frame, paddle riding on top of the third rail
  const shoe = new THREE.Group(); frame.add(shoe);
  shoe.add(box(.08, .06, Z3 - 1.02, M.bracket, -AX, RT + WR - .05, (Z3 + 1.02) / 2 - .03));
  shoe.add(box(.06, RT + WR - .05 - R3T - .02, .06, M.bracket, -AX, (RT + WR - .05 + R3T + .02) / 2, Z3 - .05));
  shoe.add(box(.3, .025, .12, M.shoe, -AX, R3T + .0125, Z3)); shoes.push(shoe);
  for (const ax of [-AX, AX]) {
    const ws = new THREE.Group(); ws.position.set(ax, RT + WR, 0); tr.add(ws); const spin = new THREE.Group(); ws.add(spin);
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, 2.0, 18).rotateX(Math.PI / 2), M.wheel); spin.add(sh(axle));
    spin.add(makeWheel(1)); spin.add(makeWheel(-1));
    const mot = new THREE.Group(); ws.add(mot);   // traction motor + gearbox hung on the axle
    const mc = sh(new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .7, 24).rotateX(Math.PI / 2), M.motor)); mc.position.set(ax < 0 ? .36 : -.36, .02, -.08); mot.add(mc);
    mot.add(box(.3, .34, .14, M.truck, ax < 0 ? .14 : -.14, -.02, .4));
    motors.push(mc); wheelsets.push({ ws, spin, mot, frame });
  }
  trucks.push({ tr, frame });
}
// the wheelset we isolate for the wheel section: front truck, front axle
const FOCUS = wheelsets[3];
// contact-patch glow on the near rail under the focus wheel
const patch = new THREE.Mesh(new THREE.CircleGeometry(.016, 24).rotateY(Math.PI / 2), M.patch); patch.scale.set(1, .6, 1.3); scene.add(patch);

// ---------- mannequin (faceless, grey) crouched on the roof: safety segment only ----------
const dummy = new THREE.Group(); car.add(dummy); dummy.position.set(.4, BODY1, -.2); dummy.rotation.y = .5;
{ const cap = (r, a, b) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A); const m = sh(new THREE.Mesh(new THREE.CapsuleGeometry(r, d.length(), 6, 14), M.dummy)); m.position.copy(A).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); dummy.add(m); };
  for (const s of [-1, 1]) { const z = s * .13; cap(.075, [-.05, .5, z], [.3, .52, z * 1.2]); cap(.065, [.3, .52, z * 1.2], [.12, .07, z * 1.3]); cap(.06, [.12, .07, z * 1.3], [.3, .05, z * 1.3]); cap(.05, [.12, 1.0, z * 1.6], [.36, .74, z * 1.5]); cap(.045, [.36, .74, z * 1.5], [.52, .08, z * 1.4]); }
  cap(.17, [-.02, .55, 0], [.14, .98, 0]);
  const head = sh(new THREE.Mesh(new THREE.SphereGeometry(.13, 24, 16), M.dummy)); head.scale.set(1, 1.15, .95); head.position.set(.24, 1.2, 0); dummy.add(head); }

// ---------- tunnel portal (safety segment): ceiling only inches above the roof ----------
const tunnel = new THREE.Group(); scene.add(tunnel);
const TX0 = 5.0, CEIL = BODY1 + CLR;
{ tunnel.add(box(4, 5.6, .4, M.tunnel, TX0 + 2, 2.8, -2.25));                 // far wall
  tunnel.add(box(4, .5, 4.1, M.tunnel, TX0 + 2, CEIL + .25, -.2));           // ceiling slab (open on the near side)
  tunnel.add(box(.45, 1.4, 4.1, M.tunnel, TX0 + .22, CEIL + .7, -.2));      // portal lintel (cut away on the near side)
  tunnel.add(box(.45, CEIL + .01, .5, M.tunnel, TX0 + .22, (CEIL) / 2, -2.2)); }  // far jamb

// ---------- motion ----------
const explK = t => eo(seg(t, T.rails - .15, T.rails + 1.1)) * (1 - eio(seg(t, T.down, T.down + 1.1)));
const carX = t => {
  if (t < T.apart) return lerp(-7, -1.5, eo(seg(t, 0, T.apart)));
  if (t < T.shoe - 1) return lerp(-1.5, 32, ei(seg(t, T.apart, T.apart + 2.0)));
  if (t < T.sig) return lerp(-26, -3, eo(seg(t, T.shoe - 1, T.shoe + 1.4)));
  if (t < T.roof) return lerp(-3, -1.6, eio(seg(t, T.sig, T.signal + .6)));
  return lerp(-1.6, -.3, eio(seg(t, T.roof - .6, T.roof + .4)));
};
const xrayK = t => ss(seg(t, T.xray0, T.xray0 + .5)) * (1 - ss(seg(t, T.xray1 - .5, T.xray1)));
const shiftK = t => eio(seg(t, T.wider - .3, T.wider + .7)) * (1 - eio(seg(t, T.weight - .4, T.weight + .2)));
const tunK = t => eo(seg(t, T.ceil - .7, T.ceil + .5));
const dummyK = t => (t > T.roof - .05 && t < T.next - .1) ? 1 : 0;

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, 50, 16, 30, -1, 2.2, 0],
  [T.apart, 55, 18, 28, 0, 1.8, 0],
  [T.rails + 1.2, 28, 18, 22, 0, 1.7, .4],
  [T.gauge + .3, 30, 30, 17, .6, 2.0, .3],
  [T.plates + .5, 26, 18, 18, 0, 1.6, .4],
  [T.bed + .5, 34, 16, 20, 1, 1.3, .4],
  [T.third + .5, 20, 18, 14, 1.5, 2.0, 1.5],
  [T.board + .8, 24, 18, 14, 1.8, 2.2, 1.6],
  [T.down + 1.3, 30, 14, 17, 0, 1.2, .6],
  [T.shoe + 1.4, 22, 12, 9, .2, 1.0, .8],
  [T.slide + .6, 30, 14, 5.5, -1.1, .85, 1.3],
  [T.motors + .4, 18, 10, 8, .6, 1.0, .4],
  [T.wheels + .6, 70, 6, 8.5, 1.1, 1.0, 0],
  [T.cone + .4, 88, 3, 7.2, 1.1, RT + .4, 0],
  [T.flange + .6, 88, 3, 7.0, 1.1, RT + .4, 0],
  [T.steers + .4, 88, 3, 7.0, 1.1, RT + .4, 0],
  [T.patch + .3, 88, 2, 2.2, 1.1, RT + .08, ZR - .05],
  [T.dime + 1.0, 88, 2, 1.9, 1.1, RT + .06, ZR - .03],
  [T.short + .2, 14, 18, 30, -4.2, 1.8, .6],
  [T.signal + .6, 10, 16, 30, -4.6, 2.0, .8],
  [T.roof + .4, 28, 12, 30, 1.0, 3.4, 0],
  [T.inches + .6, 16, 3, 22, 2.9, 4.0, .5],
  [T.curves + .4, 30, 12, 26, 1.5, 3.2, 0],
  [T.below + .8, 26, 14, 28, 1.0, 2.8, 0],
  [T.deaths + .6, 26, 14, 30, 1.2, 2.6, 0],
  [T.next, 32, 16, 32, 1, 2.6, 0],
  [DUR, 40, 18, 34, .6, 2.4, 0],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz] = camTrack(t); const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = dist < 3 ? 60 : 240; post.dof.maxCoc = 10;
  const la = A - .9; key.position.set(tx + 14 * Math.sin(la), ty + 16, tz + 14 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 12 * Math.sin(A + Math.PI * .85), ty + 4, tz + 12 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 12, tz); top.lookAt(tx, ty, tz);
}

// ---------- events (foley) ----------
const EV = [{ t: .3, type: 'roll', d: T.apart + 1.8 }, { t: T.rails - .1, type: 'spread' }, { t: T.lb, type: 'label' }, { t: T.gauge, type: 'label' }, { t: T.plates, type: 'label' }, { t: T.ties, type: 'label' }, { t: T.bed, type: 'label' },
  { t: T.third + .2, type: 'label' }, { t: T.volts, type: 'buzz' }, { t: T.board, type: 'label' }, { t: T.down + .9, type: 'land' }, { t: T.shoe - 1, type: 'roll', d: 2.6 }, { t: T.slide, type: 'zap' }, { t: T.motors, type: 'label' },
  { t: T.cone, type: 'label' }, { t: T.flange, type: 'label' }, { t: T.wider, type: 'label' }, { t: T.patch, type: 'coin' }, { t: T.sig, type: 'roll', d: 3.2 }, { t: T.short + .3, type: 'label' }, { t: T.signal, type: 'signal' },
  { t: T.ceil - .1, type: 'land' }, { t: T.inches, type: 'alarm' }, { t: T.below, type: 'buzz' }, { t: T.kills, type: 'alarm' }, { t: T.next, type: 'card' }, { t: T.card, type: 'card' }];
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
const tmp = new THREE.Vector3();
window.render = t => {
  const ek = explK(t), xk = xrayK(t), cx = carX(t), sk = shiftK(t), tk = tunK(t);
  for (const n of Object.keys(L)) { L[n].g.position.y = L[n].dy * ek; L[n].g.position.z = L[n].dz * ek; }
  { const bk = ss(seg(t, T.shoe - .2, T.shoe + .5)) * (1 - ss(seg(t, T.wheels - .4, T.wheels + .2))); M.board.transparent = bk > 0; M.board.opacity = 1 - .8 * bk; M.board.depthWrite = bk < .5; }   // ghost the cover so the shoe shows
  car.position.x = cx; car.visible = cx < 22 && cx > -24;
  for (const w of wheelsets) w.spin.rotation.z = -cx / WR;
  // isolate the focus wheelset: hide body, frames, other wheelsets
  const iso = xk > .5;
  body.visible = !iso; for (const tr of trucks) tr.frame.visible = !iso; for (const w of wheelsets) { w.ws.visible = !iso || w === FOCUS; w.mot.visible = !iso; }
  // curve demo: wheelset slides toward the outer rail (+z), rolling on the larger radius there
  FOCUS.ws.position.z = .045 * sk; FOCUS.spin.rotation.x = 0;
  // highlights
  const pulse = .5 + .5 * Math.sin(t * 9);
  M.rail.emissiveIntensity = (t > T.lb - .1 && t < T.plates) ? .18 + .1 * pulse : 0;
  M.third.emissive.set(t > T.roof ? '#ff2a1a' : '#ff6b3d');
  M.third.emissiveIntensity = (t > T.volts - .1 && t < T.board + .3) ? .5 + .4 * pulse : (t > T.slide - .1 && t < T.motors) ? .3 + .3 * pulse : (t > T.below - .1 && t < T.next) ? .5 + .4 * pulse : 0;
  M.shoe.emissiveIntensity = (t > T.shoe && t < T.wheels - .3) ? .25 + .2 * pulse : 0;
  M.motor.emissiveIntensity = (t > T.motors - .1 && t < T.wheels - .3) ? .25 + .2 * pulse : 0;
  M.tread.emissiveIntensity = (t > T.cone - .1 && t < T.flange + .2) ? .15 + .1 * pulse : 0;
  // contact patch
  FOCUS.ws.getWorldPosition(tmp); patch.position.set(tmp.x + .02, RT, ZR); M.patch.opacity = ss(seg(t, T.patch - .2, T.patch + .3)) * (1 - ss(seg(t, T.sig - .4, T.sig))) * (.75 + .25 * pulse);
  // signal: green until the wheels short the rails, then red
  const red = t > T.short + .3 && t < T.roof;
  M.lampR.color.set(red ? '#ff3a24' : '#3a2422'); M.lampG.color.set(!red ? '#3dff7a' : '#22302a');
  // tunnel drops in for the safety segment; mannequin only there
  tunnel.visible = tk > 0; tunnel.position.y = (1 - tk) * 7;
  dummy.visible = dummyK(t) > 0; dummy.scale.setScalar(ss(seg(t, T.roof - .05, T.roof + .35)) || .001);
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, ek, L, cx, sk, FOCUS, RT, ZR, Z3, R3T, BOARD, TT, PB, BT, BODY1, CEIL, TX0, WR, AX, TRK, joints, SIGX, SIGZ, wheelsets });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
