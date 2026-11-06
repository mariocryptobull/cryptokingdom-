// How the Holland Tunnel Breathes — Exploded Teardown, 1080×1920. A cutaway block of the Hudson riverbed (land at both
// ends, river in the middle; the back half of the ground kept) with one schematic tube of the tunnel: fresh-air duct
// under the roadway, exhaust duct above the ceiling, and four ventilation buildings (two on land, two in the river).
// Units: model units (schematic, not to scale). X = tunnel axis (New Jersey −x → Manhattan +x), Y up, Z toward camera.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, eio, track, mulberry } from '/core/lib.js';
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
  hook: cue('v01', 1), ask: cue('v01', 2), open: cue('v02', 0), mile: cue('v02', 1), hudson: cue('v02', 2),
  co: cue('v03', 0), tests: cue('v03', 1), four: cue('v03', 2), holland: cue('v04', 0), singstad: cue('v04', 2),
  answer: cue('v05', 0), split: cue('v05', 1), fresh: cue('v06', 0), duct: cue('v06', 1), slots: cue('v06', 2),
  dirty: cue('v07', 0), vents: cue('v07', 1), exh: cue('v07', 2), bld: cue('v08', 0), river: cue('v08', 1), fans: cue('v08', 2), inout: cue('v08', 3),
  together: cue('v09', 0), ninety: cue('v09', 2), first: cue('v10', 0), nhl: cue('v10', 2), next: cue('v11', 0),
  congrats: cue('v12', 0), card: cue('v12', 1),
};
T.down = T.fresh - .9;   // the exploded tube settles back into the riverbed just before "Fans blow fresh air"
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
  const gr = g.createRadialGradient(560, 860, 80, 540, 960, 1500); gr.addColorStop(0, '#33373c'); gr.addColorStop(.45, '#212428'); gr.addColorStop(1, '#0c0d10');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = .5; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff1e2', 1.6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 80 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 5, 16, 5); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .5, 14, 14); scene.add(top);
const lampA = new THREE.PointLight('#ffe2b8', 1.4, 5, 1.6), lampB = new THREE.PointLight('#ffe2b8', 1.4, 5, 1.6); scene.add(lampA, lampB);   // tunnel lighting
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .24));

// ---------- dimensions ----------
const CY = 1.5, R = .9, X0 = -4.8, X1 = 4.8, ZB = -2.0;          // tube axis, tube radius, block ends, back of the block
const GL = 4.5, GB = 3.45, WY = 4.2, XS = 3.35;                    // land top, river bed, water surface, shoreline |x|
const YC = CY + .42, YRD = CY - .35;                               // ceiling slab underside, roadway top
const YF = CY - .6, YE = CY + .64, ZS = .14;                       // fresh-duct / exhaust-duct centre lines, shaft plane (just in front of the cut)
const SH = .07;                                                    // tube shell thickness

// ---------- materials ----------
const strata = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .92, side: THREE.DoubleSide });
strata.onBeforeCompile = s => {
  s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWp;
float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 strataCol(vec3 p){
  float y = p.y + .05 * sin(p.x * 1.7) + .03 * sin(p.x * 4.1 + p.z * 2.0);
  vec3 c = y > 4.05 ? vec3(.42,.30,.19) : y > 3.0 ? vec3(.37,.35,.31) : y > 2.2 ? vec3(.55,.49,.39) : vec3(.36,.35,.35);
  float n = hh(floor(p.xy * 22.0) + floor(p.z * 22.0));
  c *= .9 + .2 * n;
  if (y <= 2.2) { float f = hh(floor(p.xy * 40.0)); c = mix(c, vec3(.78,.76,.72), step(.94, f) * .7); c *= .92 + .1 * sin(p.y * 30.0 + p.x * 3.0); }
  if (y > 3.0 && y <= 4.05) { c *= .94 + .06 * sin(p.y * 70.0); }
  if (abs(y - 4.05) < .015 || abs(y - 3.0) < .015 || abs(y - 2.2) < .015) c *= .7;
  return c;
}`).replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * strataCol(vWp), opacity );');
};
const M = {
  base: new THREE.MeshPhysicalMaterial({ color: '#2b2e33', roughness: .5, metalness: .3, clearcoat: .2 }),
  walk: new THREE.MeshPhysicalMaterial({ color: '#a9a69e', roughness: .85 }),
  road: new THREE.MeshPhysicalMaterial({ color: '#34363a', roughness: .8 }),
  paint: new THREE.MeshStandardMaterial({ color: '#e9e4d6', roughness: .6 }),
  model: new THREE.MeshPhysicalMaterial({ color: '#f1efe9', roughness: .6 }),
  water: new THREE.MeshPhysicalMaterial({ color: '#2f6b8f', roughness: .15, transparent: true, opacity: .42, depthWrite: false, side: THREE.DoubleSide }),
  waterTop: new THREE.MeshPhysicalMaterial({ color: '#3d86ad', roughness: .1, clearcoat: 1, transparent: true, opacity: .55, depthWrite: false }),
  shell: new THREE.MeshPhysicalMaterial({ color: '#9aa0a6', roughness: .55, metalness: .5, side: THREE.DoubleSide }),
  tile: new THREE.MeshPhysicalMaterial({ color: '#ebe7dc', roughness: .35, clearcoat: .4, side: THREE.DoubleSide }),
  slab: new THREE.MeshPhysicalMaterial({ color: '#c9c4b8', roughness: .8, side: THREE.DoubleSide }),
  asphalt: new THREE.MeshPhysicalMaterial({ color: '#2e3034', roughness: .85 }),
  curb: new THREE.MeshPhysicalMaterial({ color: '#b9b4a8', roughness: .8 }),
  slot: new THREE.MeshStandardMaterial({ color: '#15171a', roughness: .9, emissive: '#59d4ff', emissiveIntensity: 0 }),
  port: new THREE.MeshStandardMaterial({ color: '#15171a', roughness: .9, emissive: '#ff7a3d', emissiveIntensity: 0 }),
  brick: new THREE.MeshPhysicalMaterial({ color: '#a4583f', roughness: .85 }),
  stone: new THREE.MeshPhysicalMaterial({ color: '#d8d1c2', roughness: .8 }),
  glassF: new THREE.MeshPhysicalMaterial({ color: '#59d4ff', roughness: .2, transparent: true, opacity: .22, depthWrite: false, emissive: '#59d4ff', emissiveIntensity: .08, side: THREE.DoubleSide }),
  glassE: new THREE.MeshPhysicalMaterial({ color: '#ff8a4a', roughness: .2, transparent: true, opacity: .22, depthWrite: false, emissive: '#ff8a4a', emissiveIntensity: .08, side: THREE.DoubleSide }),
  steel: new THREE.MeshStandardMaterial({ color: '#4a5056', roughness: .45, metalness: .7, side: THREE.DoubleSide }),
  bladeF: new THREE.MeshPhysicalMaterial({ color: '#2f8fd8', roughness: .35, metalness: .3, clearcoat: .5, emissive: '#59d4ff', emissiveIntensity: 0 }),
  bladeE: new THREE.MeshPhysicalMaterial({ color: '#e0652e', roughness: .35, metalness: .3, clearcoat: .5, emissive: '#ff7a3d', emissiveIntensity: 0 }),
  win: new THREE.MeshStandardMaterial({ color: '#1b1d21', roughness: .3, metalness: .4 }),
  tail: new THREE.MeshStandardMaterial({ color: '#ff3b2f', emissive: '#ff3b2f', emissiveIntensity: 2 }),
  head: new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#fff4d6', emissiveIntensity: 1.5 }),
};
const CARC = ['#f1efe9', '#e3a62c', '#2f6fe0', '#f1efe9', '#c8463a', '#f1efe9', '#7c8a96'].map(c => new THREE.MeshPhysicalMaterial({ color: c, roughness: .4, clearcoat: .6 }));
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const boxG = (sx, sy, sz, x, y, z) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);
const merged = (geos, mat) => sh(new THREE.Mesh(mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g)), mat));

// ---------- base, ground (land | riverbed | land) with the tube groove, water ----------
scene.add(box(X1 - X0 + .6, .16, -ZB + 1.4, M.base, 0, .08, ZB / 2 + .5));
const grooveGeo = (topY) => { const s = new THREE.Shape(); s.moveTo(0, .16); s.lineTo(-ZB, .16); s.lineTo(-ZB, topY); s.lineTo(0, topY); s.lineTo(0, CY + R + SH + .02); s.absarc(0, CY, R + SH + .02, Math.PI / 2, -Math.PI / 2, true); s.lineTo(0, .16);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 48 }); g.rotateY(Math.PI / 2); return g; };
const ground = new THREE.Group(); scene.add(ground);
for (const [a, b, y] of [[X0, -XS, GL], [-XS, XS, GB], [XS, X1, GL]]) { const m = sh(new THREE.Mesh(grooveGeo(y), strata)); m.position.x = a; m.scale.x = b - a; ground.add(m); }
// sloped riverbanks (a wedge of land stepping down to the bed)
for (const s of [-1, 1]) { const sh2 = new THREE.Shape(); sh2.moveTo(0, GB); sh2.lineTo(.35, GB); sh2.lineTo(0, GL); sh2.closePath(); const g = new THREE.ExtrudeGeometry(sh2, { depth: -ZB, bevelEnabled: false }); g.translate(0, 0, ZB); const m = sh(new THREE.Mesh(g, strata)); m.position.x = s * XS; m.scale.x = -s; ground.add(m); }
// water (back half) and its surface
const water = new THREE.Mesh(new THREE.BoxGeometry(2 * XS, WY - GB, -ZB).translate(0, (WY + GB) / 2, ZB / 2), M.water); scene.add(water);
const waterTop = new THREE.Mesh(new THREE.PlaneGeometry(2 * XS, -ZB, 48, 8).rotateX(-Math.PI / 2).translate(0, WY, ZB / 2), M.waterTop); scene.add(waterTop);
const wpos = waterTop.geometry.attributes.position, wbase = wpos.array.slice();
// land tops: sidewalk slab + a few model blocks (Jersey City left, Manhattan right)
{ let r = 7; const Rn = () => (r = (r * 16807) % 2147483647) / 2147483647; const geos = [];
  for (const [a, b] of [[X0, -XS], [XS, X1]]) { scene.add(box(b - a, .08, -ZB, M.walk, (a + b) / 2, GL + .04, ZB / 2));
    for (let x = a + .05; x < b - .1;) { const w = .3 + Rn() * .3, h = .25 + Math.pow(Rn(), 1.4) * (a > 0 ? 1.4 : .7), d = .35 + Rn() * .2; if (Math.abs(x + w / 2) < 4.4 && Math.abs(x + w / 2) > 3.75) { x += w; continue; } geos.push(boxG(w - .05, h, d, x + w / 2, GL + .08 + h / 2, ZB + .1 + d / 2)); x += w; } }
  scene.add(merged(geos, M.model)); }

// ---------- the tube: three layers (exhaust duct / roadway / fresh-air duct), back half only ----------
const tube = new THREE.Group(); scene.add(tube);
const gUp = new THREE.Group(), gMid = new THREE.Group(), gLow = new THREE.Group(); tube.add(gUp, gMid, gLow);
const LEN = X1 - X0;
const arc = (a0, a1, r0, r1, mat) => { const s = new THREE.Shape(); s.absarc(0, 0, r1, a1, a0, true); s.absarc(0, 0, r0, a0, a1, false); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: LEN, bevelEnabled: false, curveSegments: 40 }); g.rotateY(Math.PI / 2); g.translate(X0, CY, 0); return sh(new THREE.Mesh(g, mat)); };
const aC = Math.asin((YC - CY) / R), aR = Math.asin((YRD - .07 - CY) / R);
gUp.add(arc(aC, Math.PI / 2, R, R + SH, M.shell));
gMid.add(arc(aR, aC, R, R + SH, M.shell));
gMid.add(arc(aR + .02, aC - .02, R - .025, R, M.tile));   // white tile wall
gLow.add(arc(-Math.PI / 2, aR, R, R + SH, M.shell));
const halfW = y => Math.sqrt(Math.max(0, R * R - (y - CY) ** 2));
// ceiling slab + ceiling vents (ports)
{ const w = halfW(YC); gUp.add(box(LEN, .05, w, M.slab, 0, YC + .025, -w / 2));
  const geos = []; for (let x = X0 + .25; x < X1 - .1; x += .42) geos.push(boxG(.2, .012, .1, x, YC - .004, -.42)); gUp.add(merged(geos, M.port)); }
// roadway slab, asphalt, lane paint, curbs with the fresh-air slots, catwalk at the back
{ const w = halfW(YRD - .07); gMid.add(box(LEN, .07, w, M.slab, 0, YRD - .035, -w / 2));
  gMid.add(box(LEN, .006, w - .16, M.asphalt, 0, YRD + .003, -(w - .16) / 2));
  const geos = []; for (let x = X0 + .2; x < X1; x += .5) geos.push(boxG(.24, .004, .02, x, YRD + .008, -.33)); gMid.add(merged(geos, M.paint));
  gMid.add(box(LEN, .09, .12, M.curb, 0, YRD + .045, -w + .14));
  const sg = []; for (let x = X0 + .15; x < X1 - .05; x += .3) sg.push(boxG(.16, .035, .01, x, YRD + .04, -w + .2 + .006)); gMid.add(merged(sg, M.slot)); }
// fresh-air duct floor detail (the space under the roadway stays open)
// ---------- cars on the roadway (one-way tube, NJ → Manhattan) ----------
const cars = CARC.map((mat, i) => { const g = new THREE.Group(); gMid.add(g);
  const L = i === 4 ? .44 : .26; g.add(box(L, .085, .14, mat, 0, .06, 0)); g.add(box(L * .55, .06, .12, mat, -L * .08, .13, 0));
  g.add(box(.012, .025, .03, M.tail, -L / 2 - .004, .07, .04)); g.add(box(.012, .025, .03, M.tail, -L / 2 - .004, .07, -.04));
  g.add(box(.012, .022, .03, M.head, L / 2 + .004, .07, .04)); g.add(box(.012, .022, .03, M.head, L / 2 + .004, .07, -.04));
  g.position.set(0, YRD, i % 2 ? -.52 : -.2); return { g, L, v: .42 + (i % 3) * .06 }; });

// ---------- ventilation buildings: two on land, two in the river; each with a blower (blue) and an exhaust fan (orange) ----------
const BLD = [{ x: -4.05, land: 1 }, { x: -2.3, land: 0 }, { x: 2.3, land: 0 }, { x: 4.05, land: 1 }];
const fans = [];
for (const b of BLD) {
  b.y0 = b.land ? GL : GB - .02; b.top = b.land ? GL + 1.45 : WY + 1.4; b.fanLo = b.land ? GL + .45 : WY + .38; b.fanHi = b.top - .42;
  const g = new THREE.Group(); scene.add(g); b.g = g; const w = .9, d = .95, zc = -.3 - d / 2;
  if (!b.land) g.add(box(w + .16, WY + .1 - b.y0, d + .16, M.stone, b.x, (WY + .1 + b.y0) / 2, zc));   // pier
  const y1 = b.land ? b.y0 : WY + .1;
  g.add(box(w, b.top - y1, d, M.brick, b.x, (b.top + y1) / 2, zc));
  g.add(box(w + .06, .06, d + .06, M.stone, b.x, b.top + .03, zc));
  g.add(box(.22, .28, .22, M.brick, b.x + .2, b.top + .2, zc + .1));   // exhaust stack
  for (const [fy, mat, dir, k] of [[b.fanLo, M.bladeF, 1, 'F'], [b.fanHi, M.bladeE, -1, 'E']]) {
    const fx = b.x + (k === 'F' ? -.2 : .2);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.17, .025, 8, 32), M.steel); ring.position.set(fx, fy, -.27); g.add(sh(ring));
    const back = new THREE.Mesh(new THREE.CircleGeometry(.17, 32), M.win); back.position.set(fx, fy, -.285); g.add(back);
    const rot = new THREE.Group(); rot.position.set(fx, fy, -.26); g.add(rot);
    for (let j = 0; j < 6; j++) { const bl = box(.055, .15, .012, mat, 0, .085, 0); bl.rotation.y = .5; const a = new THREE.Group(); a.rotation.z = j * Math.PI / 3; a.add(bl); rot.add(a); }
    rot.add(box(.05, .05, .03, M.steel));
    fans.push({ rot, dir, k });
  }
  // windows
  const wg = []; for (const dy of b.land ? [.85, 1.1] : [.95]) for (const dx of [-.3, 0, .3]) if (Math.abs(dx) > .1 || dy > 1) wg.push(boxG(.12, .14, .01, b.x + dx, y1 + dy, -.295));
  if (wg.length) g.add(merged(wg, M.win));
  // shafts in the cut plane: fresh (down to the duct under the road), exhaust (up from the duct over the ceiling)
  const shaft = (x, ya, yb, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, yb - ya, 16, 1, true), mat); m.position.set(x, (ya + yb) / 2, ZS); scene.add(m); return m; };
  b.sF = shaft(b.x - .2, YF, b.fanLo, M.glassF); b.sE = shaft(b.x + .2, YE, b.fanHi, M.glassE);
}

// ---------- air particles ----------
const NP = 420, rnd = mulberry(1927);
const PT = [...Array(NP)].map((_, i) => { const xi = lerp(X0 + .25, X1 - .25, rnd()); let bi = 0; BLD.forEach((b, k) => { if (Math.abs(b.x - xi) < Math.abs(BLD[bi].x - xi)) bi = k; });
  return { xi, b: bi, zf: lerp(-.7, -.15, rnd()), zc: lerp(-.7, -.12, rnd()), dr: lerp(-.25, .25, rnd()), ph: i / NP + rnd() * .02, hz: [lerp(X0 + .2, X1 - .2, rnd()), lerp(YRD + .08, YC - .06, rnd()), lerp(-.75, -.1, rnd())], rank: rnd(), s: .8 + rnd() * .5 }; });
const air = new THREE.InstancedMesh(new THREE.SphereGeometry(.024, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), NP);
air.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(air);
const CF = new THREE.Color('#7fe0ff').multiplyScalar(1.6), CE = new THREE.Color('#ff8a4a').multiplyScalar(1.5), CH = new THREE.Color('#9c8f86'), CR = new THREE.Color('#ff4a3a').multiplyScalar(1.3);
const BRK = [0, .15, .18, .4, .44, .47, .64, .68, .71, .88, .9, .97, 1];
function pathPts(p) {
  const b = BLD[p.b], xs = b.x - .2, xe = b.x + .2, x2 = clamp(p.xi + p.dr, X0 + .1, X1 - .1), w = halfW(YRD - .07);
  return [[xs, b.fanLo - .1, ZS], [xs, YF, ZS], [xs, YF, p.zf], [p.xi, YF, p.zf], [p.xi, YRD - .04, -w + .22], [p.xi, YRD + .1, -w + .26], [x2, CY + .25, p.zc], [x2, YC - .02, -.42],
    [x2, YE, -.42], [xe, YE, -.35], [xe, YE, ZS], [xe, b.fanHi, ZS], [xe, b.top + .75, ZS + .1]];
}
PT.forEach(p => p.pts = pathPts(p));
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), v4 = new THREE.Vector3(), c4 = new THREE.Color();
function airAt(p, u) {   // → position into v4, colour into c4, scale
  let k = 0; while (k < BRK.length - 2 && u > BRK[k + 1]) k++;
  const f = (u - BRK[k]) / (BRK[k + 1] - BRK[k]), a = p.pts[k], b = p.pts[k + 1];
  v4.set(lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f));
  const mix = ss(seg(u, .5, .66)); c4.copy(CF).lerp(CE, mix);
  return u > .97 ? 1 - seg(u, .97, 1) : u < .03 ? seg(u, 0, .03) : 1;
}

// ---------- motion ----------
const LIFT = 4.6, ZL = 1.45;
const riseK = t => eio(seg(t, T.answer - .1, T.answer + 1.4)) * (1 - eio(seg(t, T.down, T.down + 1.4)));
const explK = t => (1 - Math.pow(1 - ss(seg(t, T.split - .1, T.split + 1.0)), 3)) * (1 - eio(seg(t, T.down - .3, T.down + .7)));
const fansOn = t => !(t > T.co - .2 && t < T.fresh - .3);
const flowRate = t => fansOn(t) ? (t > T.together - .1 && t < T.first + .5 ? .15 : .055) : 0;
const phaseCache = []; { let a = 0; for (let i = 0; i <= Math.ceil(DUR * 48) + 2; i++) { phaseCache.push(a); a += flowRate(i / 48) / 48; } }
const phaseAt = t => { const i = Math.floor(t * 48), f = t * 48 - i; return lerp(phaseCache[i] || 0, phaseCache[i + 1] ?? phaseCache[i] ?? 0, f); };
const fanCache = []; { let a = 0; for (let i = 0; i <= Math.ceil(DUR * 48) + 2; i++) { fanCache.push(a); a += (fansOn(i / 48) ? (t => t > T.together - .1 && t < T.first + .5 ? 16 : 7)(i / 48) : .4 * Math.max(0, 1 - (i / 48 - T.co) / 1.5)) / 48; } }
const fanAt = t => fanCache[Math.min(fanCache.length - 1, Math.round(t * 48))];

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, 24, 24, 36, 0, 2.65, -.6],
  [T.hook, 44, 14, 15, 3.0, 2.4, -.4],
  [T.ask + .6, 58, 10, 9.5, 3.8, 1.7, -.4],
  [T.open + .9, 28, 20, 36, 0, 2.65, -.6],
  [T.hudson + .8, 24, 22, 35, 0, 2.75, -.6],
  [T.co + .8, 50, 8, 8.5, 3.4, 1.6, -.4],
  [T.four + 1.5, 58, 6, 7.6, 3.7, 1.6, -.4],
  [T.holland + 1.2, 24, 18, 34, 0, 2.65, -.6],
  [T.singstad + 1.5, 20, 20, 35, 0, 2.75, -.6],
  [T.answer + 1.4, 46, 14, 16, 2.6, CY + LIFT * .8, ZL * .6],
  [T.split + 1.4, 62, 10, 11.5, 3.5, CY + LIFT, ZL - .4],
  [T.down - .2, 58, 12, 12, 3.3, CY + LIFT * .9, ZL - .4],
  [T.fresh + .4, 56, 8, 9, 3.6, 1.3, -.4],
  [T.slots + 1.0, 48, 12, 8.2, 3.4, 1.35, -.4],
  [T.dirty + .6, 56, 10, 8.6, 3.6, 1.9, -.4],
  [T.exh + 1.0, 44, 16, 11, 3.4, 2.6, -.4],
  [T.bld + 1.0, 30, 16, 18, 2.8, 3.8, -.6],
  [T.fans + .8, 34, 10, 12, 3.2, 4.6, -.6],
  [T.inout + 1.6, 28, 14, 17, 2.6, 4.1, -.6],
  [T.together + .4, 24, 20, 36, 0, 2.65, -.6],
  [T.first, 20, 18, 35, 0, 2.65, -.6],
  [T.next, 28, 22, 36, 0, 2.75, -.6],
  [DUR, 18, 26, 38, 0, 2.85, -.6],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz] = camTrack(t); const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 240; post.dof.maxCoc = 10;
  const la = A - .9; key.position.set(tx + 14 * Math.sin(la), ty + 16, tz + 14 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 12 * Math.sin(A + Math.PI * .85), ty + 4, tz + 12 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 12, tz); top.lookAt(tx, ty, tz);
}

// ---------- events (foley) ----------
const EV = [{ t: .3, type: 'fan' }, { t: T.co, type: 'stop' }, { t: T.four, type: 'label' }, { t: T.answer, type: 'lift' }, { t: T.split, type: 'spread' },
  { t: T.split + .9, type: 'label' }, { t: T.down + 1.3, type: 'land' }, { t: T.fresh, type: 'fan' }, { t: T.duct + .1, type: 'label' }, { t: T.slots + .1, type: 'label' },
  { t: T.vents + .1, type: 'label' }, { t: T.exh + .1, type: 'label' }, { t: T.bld + .3, type: 'label' }, { t: T.river + .3, type: 'label' }, { t: T.fans, type: 'card' },
  { t: T.together - .05, type: 'fan' }, { t: T.ninety, type: 'card' }, { t: T.first, type: 'card' }, { t: T.next, type: 'card' }, { t: T.card, type: 'card' }];
window.EV = EV.map(e => ({ t: +e.t.toFixed(2), type: e.type })).sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
window.render = t => {
  const rk = riseK(t), ek = explK(t);
  tube.position.set(0, LIFT * rk, ZL * rk);
  gUp.position.y = .5 * ek; gLow.position.y = -.5 * ek;
  // water ripples
  for (let i = 0; i < wpos.count; i++) { const x = wbase[i * 3], z = wbase[i * 3 + 2]; wpos.setY(i, wbase[i * 3 + 1] + .018 * Math.sin(x * 3 + t * 1.6) + .012 * Math.sin(z * 5 - t * 2.1 + x)); }
  wpos.needsUpdate = true;
  // cars (keep driving, also while lifted)
  cars.forEach((c, i) => { const span = LEN - .4; c.g.position.x = X0 + .2 + ((t * c.v + i * span / cars.length) % span); });
  // fans
  const fa = fanAt(t); fans.forEach(f => { f.rot.rotation.z = f.dir * fa; });
  const fanGlow = (k, a, b) => (t > a && t < b) ? .6 + .3 * Math.sin(t * 8) : 0;
  M.bladeF.emissiveIntensity = fanGlow('F', T.fans - .2, T.together); M.bladeE.emissiveIntensity = fanGlow('E', T.fans - .2, T.together);
  // highlights: curb slots (fresh) and ceiling vents (exhaust)
  M.slot.emissiveIntensity = (t > T.slots - .2 && t < T.dirty) ? 1.2 + .6 * Math.sin(t * 7) : 0;
  M.port.emissiveIntensity = (t > T.vents - .2 && t < T.bld) ? 1.2 + .6 * Math.sin(t * 7) : 0;
  const closeK = Math.max(seg(t, T.hook, T.ask + .4) * (1 - seg(t, T.open, T.open + .8)), seg(t, T.co - .2, T.co + .6) * (1 - seg(t, T.holland - .2, T.holland + .6)), seg(t, T.down, T.fresh) * (1 - seg(t, T.exh + .5, T.bld + .5)));
  M.glassF.opacity = M.glassE.opacity = .22 - .16 * closeK;
  const ductGlow = (t > T.duct - .2 && t < T.dirty) ? .25 : 0; M.glassF.emissiveIntensity = .08 + ductGlow; M.glassE.emissiveIntensity = .08 + ((t > T.exh - .2 && t < T.bld) ? .25 : 0);
  // air particles
  const ph = phaseAt(t), vis = 1 - rk, hazeOn = t > T.co - .1 && t < T.answer + .3;
  const flowK = Math.min(1 - seg(t, T.co - .3, T.co + .1), 1) + seg(t, T.fresh - .4, T.fresh + .2);
  const hazeN = ss(seg(t, T.co, T.four + 1.2)) * (1 - seg(t, T.answer, T.answer + .4));
  const freshOnly = t > T.fresh - .5 && t < T.dirty - .1;
  PT.forEach((p, i) => {
    let sc = 0;
    if (hazeOn && p.rank < hazeN) {
      const [hx, hy, hz] = p.hz; v4.set(X0 + .2 + ((hx - X0 - .2 + (t - T.co) * .12) % (LEN - .4)), hy + .03 * Math.sin(t * 1.3 + i), hz + .03 * Math.cos(t * 1.1 + i * .7));
      c4.copy(CH).lerp(CR, ss(seg(t, T.four - .2, T.four + .8))); sc = 1.15 * p.s * seg(t, T.co + p.rank * 4, T.co + p.rank * 4 + .4);
    } else if (!hazeOn || t > T.answer) {
      const u = ((p.ph + ph * p.s) % 1 + 1) % 1; sc = airAt(p, u) * clamp(flowK) * p.s;
      if (freshOnly && u > .64) sc = 0;
    }
    sc *= vis;
    s4.setScalar(Math.max(sc, 1e-4)); m4.compose(v4, q4, s4); air.setMatrixAt(i, m4); air.setColorAt(i, c4);
  });
  air.instanceMatrix.needsUpdate = true; air.instanceColor.needsUpdate = true;
  lampA.position.set(-1.5, CY + .3 + LIFT * rk, -.3 + ZL * rk); lampB.position.set(1.8, CY + .3 + LIFT * rk, -.3 + ZL * rk);
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, CY, R, LIFT, ZL, rk, ek, BLD, YF, YE, YRD, YC, WY, GL, XS });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
