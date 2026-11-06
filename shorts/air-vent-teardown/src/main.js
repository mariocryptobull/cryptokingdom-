// How Air Flows Through a Vent — Exploded Teardown, 1080×1920. A cutaway room (front open) with the attic on top:
// furnace blower → round sheet-metal trunk (narrows, widens, side takeoff) → elbow → branch → ceiling diffuser → room.
// Air is shown as particle streams coloured by speed (slow = cool blue, fast = warm orange), schematic, not to scale.
// Units: model units (≈ metres). X right, Y up, Z toward camera. Everything is a pure function of t (frames render out of order).
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, eio, eo, track, mulberry, vnoise, spring } from '/core/lib.js';
import { initOverlay, drawOverlay, overlayTexts, speedCol } from './overlay.js';

const W = 1080, H = 1920;
const Q = new URLSearchParams(location.search);
const SSAA = +(Q.get('ssaa') || 1);
const TL = await (await fetch('timeline.json')).json();
const VDUR = await (await fetch('voice/dur.json')).json();
const DUR = TL.dur;
const CUES = []; for (let li = 0; li < TL.vo.length; li++) { const v = TL.vo[li], d = VDUR[v.id]; const n = v.chunks.map(c => c.replace(/[^A-Za-z0-9]/g, '').length + 2), tot = n.reduce((a, b) => a + b, 0); let t = v.t; v.chunks.forEach((c, i) => { CUES.push({ id: v.id, i, t }); t += d * n[i] / tot; }); }
const cue = (id, i) => CUES.find(c => c.id === id && c.i === i).t;
const T = {
  hook: cue('v01', 0), follow: cue('v01', 2), blower: cue('v02', 0), fling: cue('v02', 1), dp: cue('v02', 2), house: cue('v02', 4),
  trunk: cue('v03', 0), narrow: cue('v03', 2), widen: cue('v03', 4), recover: cue('v03', 5),
  fric: cue('v04', 0), branch: cue('v04', 2), diff: cue('v05', 0), vanes: cue('v05', 1), side: cue('v05', 2),
  drag: cue('v06', 0), gap: cue('v06', 1), drop: cue('v06', 2), pull: cue('v06', 3), coanda: cue('v06', 5),
  turb: cue('v07', 0), mix: cue('v07', 2), throw: cue('v07', 3), reach: cue('v08', 0), draft: cue('v08', 1), warm: cue('v08', 3), cool: cue('v08', 4),
  why: cue('v09', 0), next: cue('v10', 0), congrats: cue('v11', 0), card: cue('v11', 1),
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
post.bloom.strength = .5; post.bloom.radius = .45; post.bloom.threshold = .9;
post.vig.uniforms.amt.value = .34; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .06;
{
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createRadialGradient(560, 860, 80, 540, 960, 1500); gr.addColorStop(0, '#34363a'); gr.addColorStop(.45, '#222427'); gr.addColorStop(1, '#0d0e10');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = .5; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff1e2', 1.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 80 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 4, 16, 5); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .5, 14, 14); scene.add(top);
const roomLight = new THREE.PointLight('#cfe0ff', 3.0, 7, 1.4); roomLight.position.set(0, 1.4, 1.2); scene.add(roomLight);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .25));

// ---------- materials ----------
const M = {
  base: new THREE.MeshPhysicalMaterial({ color: '#2b2e33', roughness: .5, metalness: .3, clearcoat: .2 }),
  floor: new THREE.MeshPhysicalMaterial({ color: '#6b5a48', roughness: .85 }),
  wall: new THREE.MeshPhysicalMaterial({ color: '#4a5059', roughness: .85 }),
  ceil: new THREE.MeshPhysicalMaterial({ color: '#555b64', roughness: .85 }),
  model: new THREE.MeshPhysicalMaterial({ color: '#f1efe9', roughness: .6 }),
  attic: new THREE.MeshPhysicalMaterial({ color: '#d8d2c4', roughness: .9 }),
  galv: new THREE.MeshPhysicalMaterial({ color: '#b9c1c9', roughness: .32, metalness: .85, clearcoat: .3, side: THREE.DoubleSide }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#cfe6ff', roughness: .1, metalness: 0, transparent: true, opacity: .10, depthWrite: false, side: THREE.DoubleSide }),
  flange: new THREE.MeshStandardMaterial({ color: '#8d959e', roughness: .3, metalness: 1 }),
  steel: new THREE.MeshStandardMaterial({ color: '#4a5056', roughness: .45, metalness: .7, side: THREE.DoubleSide }),
  orange: new THREE.MeshPhysicalMaterial({ color: '#ff7a3d', roughness: .4, clearcoat: .5, emissive: '#ff6b3d', emissiveIntensity: 0 }),
  blue: new THREE.MeshPhysicalMaterial({ color: '#2f6fe0', roughness: .4, clearcoat: .5 }),
  vane: new THREE.MeshPhysicalMaterial({ color: '#f4f2ec', roughness: .4, clearcoat: .4, side: THREE.DoubleSide, emissive: '#ff6b3d', emissiveIntensity: 0 }),
  gap: new THREE.MeshBasicMaterial({ color: '#59d4ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
  skin: new THREE.MeshPhysicalMaterial({ color: '#f1efe9', roughness: .6 }),
};
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };

// ---------- dimensions ----------
const CEIL = 2.6, SLAB = 2.74, RX0 = -2.6, RX1 = 2.6, RZ0 = -1.8, RZ1 = 1.6;   // room
const BX = -3.4, BY = 3.3, Z0 = -.2, BR = .5;                                       // blower wheel centre, scroll outer radius
const DY = BY + .385, XO = -2.8, XT = -.7, XE = .3, ER = .35, DX = XE + ER;          // duct axis height, outlet, takeoff, elbow start, diffuser x
const RW = .26, RN = .2, RB = .225, RS = .19;                                       // wide trunk, narrow throat, branch, side takeoff radii
const VW = 900, VB = 600, VBL = 1100, V0 = 650;                                      // ft/min: trunk, branch, blower, diffuser outlet
const ductR = x => x < -1.9 ? RW : x < -1.55 ? lerp(RW, RN, ss(seg(x, -1.9, -1.55))) : x < -1.05 ? RN : x < -.7 ? lerp(RN, RW, ss(seg(x, -1.05, -.7))) : x < -.25 ? RW : x < .05 ? lerp(RW, RB, ss(seg(x, -.25, .05))) : RB;
const ductV = (x, r) => (x < -.4 ? VW : VW * .5) * (RW / r) ** 2;   // continuity: same flow, A·v constant (half the flow after the takeoff)
const PX = 1.75, PZ = .45;   // person

// ---------- room shell, attic floor ----------
scene.add(box(RX1 - (-4.3) + .3, .16, RZ1 - RZ0 + .5, M.base, (RX1 - 4.3) / 2, -.1, (RZ0 + RZ1) / 2));
scene.add(box(RX1 - RX0, .06, RZ1 - RZ0, M.floor, 0, -.03, (RZ0 + RZ1) / 2));
scene.add(box(RX1 - RX0 + .12, CEIL, .1, M.wall, 0, CEIL / 2, RZ0 - .05));
scene.add(box(.1, CEIL, RZ1 - RZ0, M.wall, RX0 - .05, CEIL / 2, (RZ0 + RZ1) / 2));
scene.add(box(.1, CEIL, RZ1 - RZ0, M.wall, RX1 + .05, CEIL / 2, (RZ0 + RZ1) / 2));
// rug + skirting for scale
scene.add(box(2.0, .01, 1.4, new THREE.MeshPhysicalMaterial({ color: '#7a3b2e', roughness: .95 }), 1.3, .005, .2));
// ceiling slab with a square hole for the diffuser: underside layer (room colour) + attic floor (light)
const attic = new THREE.Group(); scene.add(attic);
{ const HX = .27, ax0 = -4.3, ax1 = RX1 + .1, z0 = RZ0 - .1, z1 = RZ1;
  for (const [y0, y1, mat] of [[CEIL, SLAB - .04, M.ceil], [SLAB - .04, SLAB, M.attic]]) {
    const y = (y0 + y1) / 2, h = y1 - y0;
    attic.add(box(DX - HX - ax0, h, z1 - z0, mat, (ax0 + DX - HX) / 2, y, (z0 + z1) / 2));
    attic.add(box(ax1 - DX - HX, h, z1 - z0, mat, (DX + HX + ax1) / 2, y, (z0 + z1) / 2));
    attic.add(box(2 * HX, h, Z0 - HX - z0, mat, DX, y, (z0 + Z0 - HX) / 2));
    attic.add(box(2 * HX, h, z1 - Z0 - HX, mat, DX, y, (Z0 + HX + z1) / 2));
  }
  // a few joists on the attic floor for scale
  const geos = []; for (let x = -1.8; x < 2.5; x += .6) if (Math.abs(x - DX) > .35) geos.push(new THREE.BoxGeometry(.05, .1, z1 - z0).translate(x, SLAB + .05, (z0 + z1) / 2));
  attic.add(sh(new THREE.Mesh(mergeGeometries(geos), new THREE.MeshPhysicalMaterial({ color: '#c9a77a', roughness: .8 })))); }
// low-pressure gap highlight (under the ceiling, along the −x jet)
const gapBand = new THREE.Mesh(new THREE.BoxGeometry(2.2, .07, .7), M.gap); gapBand.position.set(DX - .45 - 1.1, CEIL - .045, Z0); scene.add(gapBand);

// ---------- blower cabinet + wheel + scroll ----------
const cab = new THREE.Group(); scene.add(cab);
const CX0 = -4.05, CX1 = XO, CY0 = SLAB, CY1 = 4.15, CZ0 = -.78, CZ1 = .38;
cab.add(box(CX1 - CX0, CY1 - CY0, .04, M.model, (CX0 + CX1) / 2, (CY0 + CY1) / 2, CZ0 + .02));
cab.add(box(CX1 - CX0, .04, CZ1 - CZ0, M.model, (CX0 + CX1) / 2, CY1 - .02, (CZ0 + CZ1) / 2));
cab.add(box(CX1 - CX0, .04, CZ1 - CZ0, M.model, (CX0 + CX1) / 2, CY0 + .02, (CZ0 + CZ1) / 2));
cab.add(box(.04, CY1 - CY0, CZ1 - CZ0, M.model, CX0 + .02, (CY0 + CY1) / 2, (CZ0 + CZ1) / 2));
{ // right panel with the outlet: two pieces around the duct
  const hy = DY - RW - .02 - CY0, hy2 = CY1 - (DY + RW + .02);
  cab.add(box(.04, hy, CZ1 - CZ0, M.model, CX1 - .02, CY0 + hy / 2, (CZ0 + CZ1) / 2));
  cab.add(box(.04, hy2, CZ1 - CZ0, M.model, CX1 - .02, CY1 - hy2 / 2, (CZ0 + CZ1) / 2)); }
// return-air filter slot + motor (schematic)
cab.add(box(.06, .9, .9, M.blue, CX0 + .12, (CY0 + CY1) / 2 - .05, (CZ0 + CZ1) / 2));
const front = box(CX1 - CX0, CY1 - CY0, .04, M.model, 0, 0, 0); scene.add(front);   // removable front panel (exploded off)
const frontHome = new THREE.Vector3((CX0 + CX1) / 2, (CY0 + CY1) / 2, CZ1 - .02);
{ // scroll housing: spiral band (extruded along z) + back plate
  const s = new THREE.Shape(), n = 80, rIn = .27, th = .025, pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n, a = Math.PI / 2 + (1 - u) * 2 * Math.PI * .92, r = lerp(rIn, BR, u); pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
  pts.push([CX1 - BX - .02, BR]);
  const outer = pts.map(([x, y], i) => { if (i === pts.length - 1) return [x, y + th]; const l = Math.hypot(x, y); return [x + x / l * th, y + y / l * th]; });
  s.moveTo(pts[0][0], pts[0][1]); for (const p of pts) s.lineTo(p[0], p[1]); for (let i = outer.length - 1; i >= 0; i--) s.lineTo(outer[i][0], outer[i][1]); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: .5, bevelEnabled: false, curveSegments: 4 }); g.translate(BX, BY, Z0 - .25);
  cab.add(sh(new THREE.Mesh(g, M.steel)));
  const plate = new THREE.Mesh(new THREE.CircleGeometry(BR + .03, 48), M.steel); plate.position.set(BX, BY, Z0 - .26); cab.add(sh(plate)); }
const wheel = new THREE.Group(); wheel.position.set(BX, BY, Z0); cab.add(wheel);
{ const geos = []; for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2; const g = new THREE.BoxGeometry(.012, .07, .44); g.rotateZ(a + .45); g.translate(Math.cos(a) * .23, Math.sin(a) * .23, 0); geos.push(g); }
  wheel.add(sh(new THREE.Mesh(mergeGeometries(geos), M.orange)));
  for (const z of [-.22, .22]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.23, .012, 6, 48), M.flange); r.position.z = z; wheel.add(r); }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .46, 16).rotateX(Math.PI / 2), M.flange); wheel.add(hub);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(.23, 36), M.steel); disc.position.z = -.2; wheel.add(disc); }
const motor = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .22, 20).rotateX(Math.PI / 2), M.blue); motor.position.set(BX, BY, Z0 + .38); cab.add(sh(motor));

// ---------- duct centrelines (shared by geometry and particles) ----------
// sample: { p, t (tangent), r1, r2, v }
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function frame(t) {   // n1, n2 perpendicular to tangent t
  let n1; if (Math.abs(t.z) > .01) n1 = V3(0, 1, 0); else n1 = V3(-t.y, t.x, 0).normalize();
  const n2 = new THREE.Vector3().crossVectors(t, n1).normalize(); return [n1, n2];
}
function finish(list) { for (let i = 0; i < list.length; i++) { const a = list[Math.max(0, i - 1)].p, b = list[Math.min(list.length - 1, i + 1)].p; list[i].t = b.clone().sub(a).normalize(); [list[i].n1, list[i].n2] = frame(list[i].t); } return list; }
const blowerPath = (() => { const L = [], n = 70;   // spiral out from the wheel eye to the scroll outlet at the top
  for (let i = 0; i <= n; i++) { const u = i / n, a = Math.PI / 2 + (1 - u) * 2.2 * Math.PI, r = lerp(.1, DY - BY, u); L.push({ p: V3(BX + Math.cos(a) * r, BY + Math.sin(a) * r, Z0), r1: .03 + .06 * u, r2: .2, v: VBL }); }
  return L; })();
const trunkA = (() => { const L = []; for (let x = BX + .05; x <= XT + 1e-6; x += .04) { const r = x < XO ? lerp(.12, RW, seg(x, BX, XO)) : ductR(x); L.push({ p: V3(x, DY, Z0), r1: r * .78, r2: x < XO ? .2 : r * .78, v: x < XO ? lerp(VBL, VW, seg(x, BX, XO)) : ductV(x, r) }); } return L; })();
const pathS0 = finish([...blowerPath, ...trunkA]);
const pathA1 = finish((() => { const L = [];
  for (let x = XT + .04; x <= XE; x += .04) { const r = ductR(x); L.push({ p: V3(x, DY, Z0), r1: r * .78, r2: r * .78, v: ductV(x, r) }); }
  for (let i = 1; i <= 16; i++) { const a = i / 16 * Math.PI / 2; L.push({ p: V3(XE + Math.sin(a) * ER, DY - ER + Math.cos(a) * ER, Z0), r1: RB * .78, r2: RB * .78, v: VB }); }
  for (let y = DY - ER - .04; y >= CEIL + .06; y -= .04) L.push({ p: V3(DX, y, Z0), r1: RB * .7, r2: RB * .7, v: VB * (1 + .1 * seg(y, SLAB, CEIL)) });
  return L; })());
const pathB1 = finish((() => { const L = [], c = V3(XT, DY, Z0 - ER);
  for (let i = 1; i <= 14; i++) { const a = i / 14 * Math.PI / 2; L.push({ p: V3(XT + Math.sin(a) * ER, DY, Z0 - ER + Math.cos(a) * ER), r1: RS * .75, r2: RS * .75, v: ductV(0, RS) }); }
  for (let z = Z0 - ER - .05; z >= RZ0 - .4; z -= .05) L.push({ p: V3(XT + ER, DY, z), r1: RS * .75, r2: RS * .75, v: ductV(0, RS) });
  return L; })());

// ---------- duct geometry ----------
function sweep(list, a0, a1, segs = 28) {
  const pos = [], idx = []; const rows = list.length;
  for (const s of list) { const r = s.R + .002; for (let j = 0; j <= segs; j++) { const a = lerp(a0, a1, j / segs); pos.push(...s.p.clone().addScaledVector(s.n1, Math.cos(a) * r).addScaledVector(s.n2, Math.sin(a) * r).toArray()); } }
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < segs; j++) { const a = i * (segs + 1) + j, b = a + segs + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const ductG = new THREE.Group(); scene.add(ductG);
{ const main = finish([...trunkA.filter(s => s.p.x >= XO - .01), ...pathA1].map(s => ({ p: s.p, R: (s.p.y > DY - .01 && s.p.x <= XE + .01) ? ductR(s.p.x) : RB })));
  ductG.add(sh(new THREE.Mesh(sweep(main, Math.PI, 2 * Math.PI), M.galv)));
  const gl = new THREE.Mesh(sweep(main, 0, Math.PI), M.glass); gl.renderOrder = 1; ductG.add(gl);
  const side = finish(pathB1.map(s => ({ p: s.p, R: RS })));
  ductG.add(sh(new THREE.Mesh(sweep(side, -Math.PI * .1, Math.PI * 1.1), M.galv)));
  const sg = new THREE.Mesh(sweep(side, Math.PI * 1.1, Math.PI * 1.9), M.glass); sg.renderOrder = 1; ductG.add(sg);
  // flanges at the joints
  for (const x of [XO + .02, -1.9, -1.55, -1.05, -.7, -.25, .05]) { const r = ductR(x) + .012; const f = new THREE.Mesh(new THREE.TorusGeometry(r, .014, 6, 40), M.flange); f.rotation.y = Math.PI / 2; f.position.set(x, DY, Z0); ductG.add(sh(f)); }
  for (const y of [DY - ER - .02, SLAB + .04]) { const f = new THREE.Mesh(new THREE.TorusGeometry(RB + .012, .014, 6, 40), M.flange); f.rotation.x = Math.PI / 2; f.position.set(DX, y, Z0); ductG.add(sh(f)); }
  // hangers
  for (const x of [-2.2, -.9, .2]) { ductG.add(box(.02, .5, .02, M.flange, x, DY + RW + .25, Z0)); }
  // the elbow highlight ring (pressure loss)
}
const elbowGlow = new THREE.Mesh(new THREE.TorusGeometry(ER, RB + .03, 10, 24, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff6b3d', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
elbowGlow.position.set(XE, DY - ER, Z0); scene.add(elbowGlow);

// ---------- ceiling diffuser (square cone diffuser: face plate + 3 nested angled vane rings) ----------
const diff = new THREE.Group(); diff.position.set(DX, 0, Z0); scene.add(diff);
const vanes = [];
{ const plate = new THREE.Shape(); plate.moveTo(-.36, -.36); plate.lineTo(.36, -.36); plate.lineTo(.36, .36); plate.lineTo(-.36, .36); plate.closePath();
  const hole = new THREE.Path(); hole.moveTo(-.25, -.25); hole.lineTo(-.25, .25); hole.lineTo(.25, .25); hole.lineTo(.25, -.25); hole.closePath(); plate.holes.push(hole);
  const pg = new THREE.ExtrudeGeometry(plate, { depth: .025, bevelEnabled: false }); pg.rotateX(Math.PI / 2); pg.translate(0, CEIL, 0);
  const pm = sh(new THREE.Mesh(pg, M.vane)); diff.add(pm); vanes.push({ m: pm, k: -1 });
  for (let k = 0; k < 3; k++) { const wTop = .24 - k * .065, wBot = wTop + .07, h = .055; const g = new THREE.CylinderGeometry(wTop * Math.SQRT2, wBot * Math.SQRT2, h, 4, 1, true); g.rotateY(Math.PI / 4);
    const m = sh(new THREE.Mesh(g, M.vane)); const y = CEIL - .035 - k * .03; m.position.y = y; diff.add(m); vanes.push({ m, k, y }); }
  const cap = sh(new THREE.Mesh(new THREE.BoxGeometry(.2, .012, .2), M.vane)); cap.position.y = CEIL - .14; diff.add(cap); vanes.push({ m: cap, k: 3, y: CEIL - .14 }); }

// ---------- person (schematic figure) ----------
const person = new THREE.Group(); person.position.set(PX, 0, PZ); scene.add(person);
{ person.add(box(.13, .8, .13, M.skin, -.08, .4, 0), box(.13, .8, .13, M.skin, .08, .4, 0), box(.36, .62, .2, M.skin, 0, 1.12, 0), box(.09, .58, .09, M.skin, -.24, 1.12, 0), box(.09, .58, .09, M.skin, .24, 1.12, 0));
  const head = sh(new THREE.Mesh(new THREE.SphereGeometry(.12, 20, 14), M.skin)); head.position.y = 1.58; person.add(head); }

// ---------- particles ----------
// visual speed: compressed so 50 ft/min still drifts and 1,500 ft/min doesn't strobe
const U = v => .62 * Math.pow(v / 900, .55);
function timeTable(list) { const tt = [0]; for (let i = 1; i < list.length; i++) { const ds = list[i].p.distanceTo(list[i - 1].p); tt.push(tt[i - 1] + ds / U((list[i].v + list[i - 1].v) / 2)); } return tt; }
const TT = { S0: timeTable(pathS0), A1: timeTable(pathA1), B1: timeTable(pathB1) };
const last = a => a[a.length - 1];
function lookup(tt, tau) { let lo = 0, hi = tt.length - 1; if (tau <= 0) return [0, 0]; if (tau >= tt[hi]) return [hi - 1, 1]; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tt[m] <= tau) lo = m; else hi = m; } return [lo, (tau - tt[lo]) / (tt[lo + 1] - tt[lo])]; }
const tmpP = new THREE.Vector3();
function ductPos(list, tt, tau, a, b, out) {
  const [i, f] = lookup(tt, tau), s0 = list[i], s1 = list[i + 1];
  const r1 = lerp(s0.r1, s1.r1, f), r2 = lerp(s0.r2, s1.r2, f);
  out.lerpVectors(s0.p, s1.p, f).addScaledVector(s0.n1, a * r1).addScaledVector(s0.n2, b * r2);
  return lerp(s0.v, s1.v, f);
}
// jet in the (ρ, y) half-plane of direction φ: down the neck, through the vanes, out along the ceiling, down the far wall
const R0 = .33, RHO50 = R0 * Math.pow(V0 / 50, 1 / 1.2);   // ρ where the ceiling jet has slowed to 50 ft/min
const jetV = rho => rho <= R0 ? V0 : V0 * Math.pow(R0 / rho, 1.2);
function wallDist(phi) { const c = Math.cos(phi), s = Math.sin(phi); let d = 9; if (c > 1e-3) d = Math.min(d, (RX1 - DX) / c); if (c < -1e-3) d = Math.min(d, (RX0 - DX) / c); if (s < -1e-3) d = Math.min(d, (RZ0 - Z0) / s); if (s > 1e-3) d = Math.min(d, (RZ1 + .2 - Z0) / s); return d; }
function jetTable(phi) {
  const L = [], add = (rho, y, v) => L.push({ rho, y, v });
  add(.04, CEIL + .05, VB); add(.08, CEIL - .02, V0); add(.18, CEIL - .07, V0); add(R0, CEIL - .075, V0);
  const rw = Math.min(wallDist(phi), 3.6) - .12, front = Math.sin(phi) > .5;
  for (let rho = R0 + .05; rho < rw; rho += .05) add(rho, CEIL - .075 + .045 * ss(seg(rho, R0, .7)), jetV(rho));
  const vw = Math.max(30, jetV(rw));
  if (!front) { for (let i = 1; i <= 8; i++) { const a = i / 8 * Math.PI / 2; add(rw + Math.sin(a) * .1, CEIL - .03 - .1 + Math.cos(a) * .1 - .1 * (1 - Math.cos(a)), vw); }
    for (let y = CEIL - .25; y > .5; y -= .08) add(rw + .1, y, Math.max(25, vw * .8)); }
  const tt = [0]; for (let i = 1; i < L.length; i++) { const ds = Math.hypot(L[i].rho - L[i - 1].rho, L[i].y - L[i - 1].y); tt.push(tt[i - 1] + ds / U((L[i].v + L[i - 1].v) / 2)); }
  return { L, tt, rw, front };
}
const rnd = mulberry(7);
const disk = () => { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * .85; return [Math.cos(a) * r, Math.sin(a) * r]; };
const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
const PS = [];
const NA = 1500, NB = 380, NC = 420;
for (let i = 0; i < NA; i++) { const phi = (Math.floor(rnd() * 4) * Math.PI / 2) + gauss() * .42; const J = jetTable(phi); const [a, b] = disk();
  PS.push({ kind: 'A', a, b, phi, J, ph: rnd(), tot: last(TT.S0) + last(TT.A1) + last(J.tt), w: rnd() * 6.28, sz: .8 + rnd() * .4 }); }
for (let i = 0; i < NB; i++) { const [a, b] = disk(); PS.push({ kind: 'B', a, b, ph: rnd(), tot: last(TT.S0) + last(TT.B1), sz: .8 + rnd() * .4 }); }
// slow room circulation: across the floor from the walls toward the person, then up in the warm plume
for (let i = 0; i < NC; i++) { const side = rnd(); let s0;
  if (side < .4) s0 = V3(RX0 + .15, .35 + rnd() * .3, RZ0 + .2 + rnd() * 3); else if (side < .75) s0 = V3(RX1 - .15, .35 + rnd() * .3, RZ0 + .2 + rnd() * 3); else s0 = V3(-2 + rnd() * 4, .35 + rnd() * .3, RZ0 + .15);
  const f = V3(PX + gauss() * .35, .08, PZ + gauss() * .35), up = V3(PX + gauss() * .25, 2.35, PZ + gauss() * .25);
  const list = []; for (let k = 0; k <= 20; k++) list.push({ p: s0.clone().lerp(f, k / 20), v: 32 }); for (let k = 1; k <= 30; k++) { const u = k / 30; list.push({ p: V3(lerp(f.x, up.x, u) + .12 * Math.sin(u * 7 + i), lerp(f.y, up.y, u), lerp(f.z, up.z, u) + .1 * Math.cos(u * 5 + i)), v: 26 }); }
  PS.push({ kind: 'C', list, tt: timeTable(list), ph: rnd(), tot: 0, sz: .7 + rnd() * .3 }); PS[PS.length - 1].tot = last(PS[PS.length - 1].tt); }
const TRAIL = [0, .07, .14], NP = PS.length * TRAIL.length;
const pGeo = new THREE.BufferGeometry();
const aPos = new Float32Array(NP * 3), aCol = new Float32Array(NP * 3), aA = new Float32Array(NP), aS = new Float32Array(NP);
pGeo.setAttribute('position', new THREE.BufferAttribute(aPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(aCol, 3));
pGeo.setAttribute('alpha', new THREE.BufferAttribute(aA, 1)); pGeo.setAttribute('size', new THREE.BufferAttribute(aS, 1));
const pMat = new THREE.ShaderMaterial({
  uniforms: { scale: { value: H / (2 * Math.tan(15 * Math.PI / 180)) } },
  vertexShader: `attribute float alpha; attribute float size; attribute vec3 color; varying vec3 vC; varying float vA; uniform float scale;
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(size * scale / -mv.z, 1.5, 26.0); vC = color; vA = alpha; }`,
  fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord - .5; float r = length(d) * 2.0; if (r > 1.0) discard; float k = smoothstep(1.0, .0, r); gl_FragColor = vec4(vC * (1.0 + .6 * k * k), vA * k); }`,
  transparent: true, depthWrite: false, toneMapped: false,
});
const points = new THREE.Points(pGeo, pMat); points.frustumCulled = false; points.renderOrder = 2; scene.add(points);
const colTmp = [0, 0, 0];

// ---------- motion ----------
const panelK = t => eio(seg(t, T.blower - .1, T.blower + 1.0)) * (1 - eio(seg(t, T.congrats - .2, T.congrats + 1.0)));
const diffK = t => eio(seg(t, T.vanes - .3, T.vanes + .7)) * (1 - eio(seg(t, T.drag - .9, T.drag - .1)));
// Coandă demo: the jet sags away from the ceiling (gap opens), then gets pulled back up against it
const coK = t => ss(seg(t, T.gap - .2, T.drop + .4)) * (1 - clamp(spring(t - T.pull - .1, 5, .45)));
const gapK = t => ss(seg(t, T.gap - .3, T.gap + .3)) * (1 - ss(seg(t, T.coanda + .6, T.turb)));

function jetPos(P, J, tau, t, out) {
  const [i, f] = lookup(J.tt, tau), s0 = J.L[i], s1 = J.L[i + 1];
  let rho = lerp(s0.rho, s1.rho, f), y = lerp(s0.y, s1.y, f); const v = lerp(s0.v, s1.v, f);
  const d = rho - R0, along = rho > R0 ? 1 : 0;
  // jet thickens as it spreads; the lower half of the particle disc fills the jet below the ceiling
  const spread = (.02 + .07 * Math.max(0, d)) * along;
  y -= Math.abs(P.b) * spread * 1.2; let perp = P.a * spread * .8;
  // turbulence: eddies grow along the throw
  const A = .2 * ss(seg(rho, .9, Math.max(1.3, J.rw))) * along;
  if (A > 0) { y += A * (.5 * Math.sin(tau * 2.1 + P.w) - .55); perp += A * Math.cos(tau * 1.6 + P.w * 1.3); rho += A * .3 * Math.sin(tau * 1.3 + P.w); }
  // Coandă: without the low-pressure gap the jet would sag into the room
  const ck = coK(t); if (ck > 0 && d > 0) y -= ck * Math.min(1.6, .32 * d + .16 * d * d);
  y = Math.max(.05, y);
  const c = Math.cos(P.phi), s = Math.sin(P.phi);
  out.set(DX + c * rho - s * perp, y, Z0 + s * rho + c * perp);
  return v;
}
function particle(P, t, lag, out) {   // → [speed, alpha]
  let tau = ((t - lag + P.ph * P.tot) % P.tot + P.tot) % P.tot;
  if (P.kind === 'C') { const [i, f] = lookup(P.tt, tau); out.lerpVectors(P.list[i].p, P.list[i + 1].p, f); const u = tau / P.tot; return [P.list[i].v, .4 * ss(seg(u, 0, .12)) * (1 - ss(seg(u, .8, 1)))]; }
  const t0 = last(TT.S0);
  if (tau < t0) return [ductPos(pathS0, TT.S0, tau, P.a, P.b, out), ss(seg(tau, 0, .5))];
  tau -= t0;
  if (P.kind === 'B') { const v = ductPos(pathB1, TT.B1, tau, P.a, P.b, out); return [v, 1 - ss(seg(tau / last(TT.B1), .45, .95))]; }
  const t1 = last(TT.A1);
  if (tau < t1) return [ductPos(pathA1, TT.A1, tau, P.a, P.b, out), 1];
  tau -= t1; const J = P.J, u = tau / last(J.tt);
  return [jetPos(P, J, tau, t, out), J.front ? 1 - ss(seg(u, .35, .8)) : 1 - ss(seg(u, .72, 1))];
}

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, 20, 1, 10.0, .1, 2.2, 0],
  [T.follow, 24, 4, 12.5, -.3, 2.4, 0],
  [T.blower + .4, 24, 12, 6.2, -3.3, 3.35, -.1],
  [T.dp + .4, 18, 10, 5.6, -3.2, 3.4, -.1],
  [T.house, 16, 12, 7.5, -2.6, 3.5, -.1],
  [T.trunk + .5, 12, 12, 5.8, -2.1, 3.6, -.1],
  [T.narrow + .8, 10, 10, 5.0, -1.35, 3.6, -.1],
  [T.recover + .4, 14, 12, 5.4, -.7, 3.55, -.1],
  [T.fric + .3, 24, 14, 5.6, -.1, 3.35, -.1],
  [T.branch + .6, 30, 12, 5.4, .45, 3.1, -.1],
  [T.diff + .2, 22, -2, 5.2, .6, 2.55, -.1],
  [T.vanes + .9, 18, -10, 4.4, .65, 2.35, -.15],
  [T.side + .6, 14, -6, 5.4, .3, 2.4, -.1],
  [T.drag + .6, 6, -2, 7.6, -.6, 2.3, -.1],
  [T.pull + .4, 6, -2, 7.4, -.65, 2.25, -.1],
  [T.coanda + .4, 8, 0, 8.2, -.6, 2.25, -.1],
  [T.turb + .8, 14, 3, 11.0, -.4, 1.85, 0],
  [T.throw + .6, 12, 4, 15.5, -.7, 1.9, 0],
  [T.reach - .15, 12, 4, 15.5, -.7, 1.9, 0],
  [T.reach + 1.1, 20, 4, 8.5, 1.3, 1.4, .1],
  [T.warm + .6, 18, 6, 10.0, 1.2, 1.5, .1],
  [T.why + .6, 24, 8, 17.0, -.9, 2.3, 0],
  [T.next, 22, 10, 18.0, -.9, 2.4, 0],
  [T.congrats, 18, 12, 18.5, -.85, 2.5, 0],
  [DUR, 12, 13, 19.5, -.8, 2.55, 0],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz] = camTrack(t); const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 200; post.dof.maxCoc = 8;
  const la = A - .9; key.position.set(tx + 14 * Math.sin(la), ty + 16, tz + 14 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 12 * Math.sin(A + Math.PI * .85), ty + 4, tz + 12 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 12, tz); top.lookAt(tx, ty, tz);
}

// ---------- events (sound) ----------
const EV = [{ t: .3, type: 'air' }, { t: T.blower, type: 'lift' }, { t: T.fling, type: 'hum' }, { t: T.dp, type: 'label' }, { t: T.trunk + .1, type: 'label' }, { t: T.narrow, type: 'air' }, { t: T.widen, type: 'label' },
  { t: T.fric, type: 'label' }, { t: T.branch, type: 'label' }, { t: T.vanes - .3, type: 'spread' }, { t: T.drag - .9, type: 'land' }, { t: T.gap, type: 'label' }, { t: T.pull + .1, type: 'air' }, { t: T.coanda, type: 'card' },
  { t: T.turb, type: 'air' }, { t: T.throw, type: 'label' }, { t: T.reach, type: 'label' }, { t: T.warm, type: 'label' }, { t: T.next, type: 'card' }, { t: T.congrats - .2, type: 'land' }, { t: T.card, type: 'card' }];
window.EV = EV.map(e => ({ t: +e.t.toFixed(2), type: e.type })).sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
window.render = t => {
  // blower front panel lifts off (exploded) and returns at the end
  const pk = panelK(t); front.position.set(frontHome.x - .2 * pk, frontHome.y + 1.0 * pk, frontHome.z + 1.6 * pk); front.rotation.set(-.5 * pk, .35 * pk, 0);
  { let a = 0; for (let x = 0; x < t; x += 1 / 48) a += (6 + 4 * seg(x, T.blower, T.fling)) / 48; wheel.rotation.z = -a; }
  M.orange.emissiveIntensity = (t > T.fling - .2 && t < T.trunk) ? .25 + .15 * Math.sin(t * 8) : 0;
  // diffuser explodes downward to show the vanes
  const dk = diffK(t); vanes.forEach(o => { if (o.k < 0) { o.m.position.y = -.08 * dk; return; } o.m.position.y = o.y - (o.k + 1) * .2 * dk; });
  M.vane.emissiveIntensity = (t > T.vanes && t < T.drag - .5) ? .12 + .06 * Math.sin(t * 7) : 0;
  elbowGlow.material.opacity = (t > T.fric - .1 && t < T.branch + .2) ? (.35 + .2 * Math.sin(t * 8)) * ss(seg(t, T.fric - .1, T.fric + .3)) * (1 - ss(seg(t, T.branch - .2, T.branch + .2))) : 0;
  M.gap.opacity = .22 * gapK(t) * (.8 + .2 * Math.sin(t * 6));
  // particles
  const tmp = tmpP;
  let n = 0;
  for (const P of PS) for (let k = 0; k < TRAIL.length; k++, n++) {
    const [v, al] = particle(P, t, TRAIL[k], tmp);
    aPos[n * 3] = tmp.x; aPos[n * 3 + 1] = tmp.y; aPos[n * 3 + 2] = tmp.z;
    speedCol(v, colTmp); aCol[n * 3] = colTmp[0]; aCol[n * 3 + 1] = colTmp[1]; aCol[n * 3 + 2] = colTmp[2];
    aA[n] = al * (1 - k * .32) * (P.kind === 'C' ? 1 : .92); aS[n] = (P.kind === 'A' ? .04 : .032) * P.sz * (1 - k * .22);
  }
  pGeo.attributes.position.needsUpdate = pGeo.attributes.color.needsUpdate = pGeo.attributes.alpha.needsUpdate = pGeo.attributes.size.needsUpdate = true;
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, DX, DY, Z0, CEIL, SLAB, BX, BY, ER, XE, RHO50, PX, PZ, RX0, RX1, XT, dk });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
