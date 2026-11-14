// How AI data centers use water — Exploded Teardown, 1080×1920. A schematic cutaway data hall (front wall removed) with GPU racks,
// a chiller, rooftop evaporative cooling towers and their vapour plume, a river intake, and a distant power plant.
// Units: model units (schematic, not to scale). Y up, Z toward camera.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, eio, eo, track, hash } from '/core/lib.js';
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
  hook: cue('v01', 0), dc: cue('v02', 0), hot: cue('v02', 2), drink: cue('v02', 3),
  racks: cue('v03', 0), kw: cue('v03', 1), air: cue('v04', 0), chip: cue('v04', 1),
  plates: cue('v05', 0), flow: cue('v05', 2), away: cue('v05', 3),
  chiller: cue('v06', 0), chiller2: cue('v06', 1), roof: cue('v06', 2),
  towers: cue('v07', 0), lost: cue('v07', 1), evap: cue('v07', 2),
  much: cue('v08', 0), wue: cue('v08', 1), aws: cue('v08', 3), ms: cue('v08', 4),
  half: cue('v09', 0), plants: cue('v09', 1), hidden: cue('v09', 2), x12: cue('v09', 3),
  prompt: cue('v10', 0), drops: cue('v10', 2), big: cue('v11', 0), gal: cue('v11', 1),
  fixes: cue('v12', 0), closed: cue('v12', 1), dry: cue('v12', 3), climate: cue('v12', 4),
  closer: cue('v13', 0), billions: cue('v13', 2), adds: cue('v13', 3), next: cue('v14', 0),
};
window.T = T;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, .2, 400);
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
Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 90 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 5, 16, 5); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .5, 14, 14); scene.add(top);
const hallLight = new THREE.PointLight('#9fd0ff', 1.6, 3.0, 1.6); hallLight.position.set(-.6, 1.6, .4); scene.add(hallLight);
const hotLight = new THREE.PointLight('#ff7a3d', 0, 4, 1.8); scene.add(hotLight);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .25));

// ---------- materials ----------
const M = {
  base: new THREE.MeshPhysicalMaterial({ color: '#2b2e33', roughness: .5, metalness: .3, clearcoat: .2 }),
  pad: new THREE.MeshPhysicalMaterial({ color: '#8d8a83', roughness: .9 }),
  model: new THREE.MeshPhysicalMaterial({ color: '#f1efe9', roughness: .6 }),
  wall: new THREE.MeshPhysicalMaterial({ color: '#e6e3dc', roughness: .7, side: THREE.DoubleSide }),
  floor: new THREE.MeshPhysicalMaterial({ color: '#5d6168', roughness: .6 }),
  rack: new THREE.MeshPhysicalMaterial({ color: '#202327', roughness: .45, metalness: .4, clearcoat: .3 }),
  tray: new THREE.MeshPhysicalMaterial({ color: '#2d3238', roughness: .5, metalness: .5 }),
  board: new THREE.MeshPhysicalMaterial({ color: '#1f4a3a', roughness: .6 }),
  chip: new THREE.MeshPhysicalMaterial({ color: '#3b3d42', roughness: .3, metalness: .6, emissive: '#ff5a1f', emissiveIntensity: 0 }),
  copper: new THREE.MeshPhysicalMaterial({ color: '#d48a52', roughness: .3, metalness: 1, clearcoat: .4 }),
  led: new THREE.MeshStandardMaterial({ color: '#111', emissive: '#59d4ff', emissiveIntensity: 2.2 }),
  cold: new THREE.MeshPhysicalMaterial({ color: '#2f7fe8', roughness: .35, clearcoat: .6, emissive: '#2f7fe8', emissiveIntensity: .05 }),
  warm: new THREE.MeshPhysicalMaterial({ color: '#ff6b3d', roughness: .35, clearcoat: .6, emissive: '#ff6b3d', emissiveIntensity: .05 }),
  raw: new THREE.MeshPhysicalMaterial({ color: '#7cc8ff', roughness: .3, clearcoat: .6, emissive: '#7cc8ff', emissiveIntensity: .05 }),
  steel: new THREE.MeshStandardMaterial({ color: '#59606a', roughness: .45, metalness: .7, side: THREE.DoubleSide }),
  chillerM: new THREE.MeshPhysicalMaterial({ color: '#d9dde1', roughness: .4, metalness: .4, clearcoat: .5 }),
  tower: new THREE.MeshPhysicalMaterial({ color: '#c9cdd2', roughness: .5, metalness: .2 }),
  louver: new THREE.MeshStandardMaterial({ color: '#3a3f46', roughness: .6 }),
  fan: new THREE.MeshStandardMaterial({ color: '#2a2d31', roughness: .4, metalness: .6 }),
  dry: new THREE.MeshPhysicalMaterial({ color: '#9fb4c8', roughness: .4, metalness: .5, clearcoat: .4 }),
  water: new THREE.MeshPhysicalMaterial({ color: '#2a6fb0', roughness: .08, metalness: .1, clearcoat: 1, emissive: '#1a4f88', emissiveIntensity: .25 }),
  plant: new THREE.MeshPhysicalMaterial({ color: '#b9b5ad', roughness: .8 }),
  dot: new THREE.MeshBasicMaterial({ color: '#bfe6ff' }),
  dotW: new THREE.MeshBasicMaterial({ color: '#ffb08a' }),
  dotC: new THREE.MeshBasicMaterial({ color: '#8fd0ff' }),
};
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const boxG = (sx, sy, sz, x, y, z) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);
const merged = (geos, mat) => sh(new THREE.Mesh(mergeGeometries(geos), mat));
const cyl = (r1, r2, h, mat, seg = 32) => sh(new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat));
const path3 = pts => { const p = new THREE.CurvePath(); for (let i = 0; i < pts.length - 1; i++) p.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i]), new THREE.Vector3(...pts[i + 1]))); return p; };
const pipe = (pts, r, mat) => { const c = path3(pts); const m = sh(new THREE.Mesh(new THREE.TubeGeometry(c, 24 * (pts.length - 1), r, 12), mat)); scene.add(m); return { c, m, len: c.getLength() }; };

// ---------- site: slab, pad, river ----------
const FL = .2;
scene.add(box(10.6, .2, 6.2, M.base, 0, .1, .3));
scene.add(box(10.4, .02, 4.0, M.pad, 0, FL + .01, -.6));
const river = box(10.4, .06, 1.2, M.water, 0, FL - .01, 2.4); scene.add(river);
// banks
scene.add(box(10.4, .05, .12, M.pad, 0, FL + .015, 1.75)); scene.add(box(10.4, .05, .12, M.pad, 0, FL + .015, 3.05));

// ---------- data hall (front wall cut away) ----------
const HX0 = -3.2, HX1 = 1.8, HZ0 = -1.9, HZ1 = 1.0, HH = 2.2;
const hall = new THREE.Group(); scene.add(hall);
hall.add(box(HX1 - HX0, .04, HZ1 - HZ0, M.floor, (HX0 + HX1) / 2, FL + .04, (HZ0 + HZ1) / 2));
hall.add(box(HX1 - HX0, HH, .1, M.wall, (HX0 + HX1) / 2, FL + HH / 2, HZ0));
hall.add(box(.1, HH, HZ1 - HZ0, M.wall, HX0, FL + HH / 2, (HZ0 + HZ1) / 2));
hall.add(box(.1, HH, HZ1 - HZ0, M.wall, HX1, FL + HH / 2, (HZ0 + HZ1) / 2));
const roofY = FL + HH;
hall.add(box(HX1 - HX0 + .2, .14, HZ1 - HZ0 + .2, M.model, (HX0 + HX1) / 2, roofY + .07, (HZ0 + HZ1) / 2));
hall.add(box(HX1 - HX0, .12, .1, M.wall, (HX0 + HX1) / 2, FL + .06, HZ1));   // front curb
// rack rows
const RW = .48, RHt = 1.4, RD = .6, RX0 = -2.75, RDX = .62, ROWS = [-1.1, .2];
const rackGeo = (() => { const g = [boxG(RW, RHt, RD, 0, RHt / 2, 0)]; return mergeGeometries(g); })();
const ledGeo = (() => { const g = []; for (let k = 0; k < 6; k++) g.push(boxG(RW * .7, .012, .01, 0, .2 + k * .2, RD / 2 + .006)); return mergeGeometries(g); })();
const HERO = { row: 1, i: 3 };
const racks = [];
for (let r = 0; r < 2; r++) for (let i = 0; i < 7; i++) {
  if (r === HERO.row && i === HERO.i) continue;
  const x = RX0 + i * RDX, z = ROWS[r];
  const m = sh(new THREE.Mesh(rackGeo, M.rack)); m.position.set(x, FL + .04, z); hall.add(m);
  const l = new THREE.Mesh(ledGeo, M.led); l.position.copy(m.position); hall.add(l); racks.push(m);
}
const heroHome = new THREE.Vector3(RX0 + HERO.i * RDX, FL + .04, ROWS[HERO.row]);

// ---------- hero rack (lifts out and explodes) ----------
const hero = new THREE.Group(); scene.add(hero);
const heroFrame = new THREE.Group(); hero.add(heroFrame);
{ const g = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.push(boxG(.04, RHt, .04, sx * (RW / 2 - .02), RHt / 2, sz * (RD / 2 - .02)));
  g.push(boxG(RW, .04, RD, 0, .02, 0), boxG(RW, .04, RD, 0, RHt - .02, 0)); heroFrame.add(merged(g, M.rack)); }
const manS = sh(new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, RHt - .1, 10), M.cold)); manS.position.set(-.12, RHt / 2, -RD / 2 + .04); heroFrame.add(manS);
const manR = sh(new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, RHt - .1, 10), M.warm)); manR.position.set(.12, RHt / 2, -RD / 2 + .04); heroFrame.add(manR);
const NT = 6, trays = [];
const chipPos = [[-.11, -.1], [.11, -.1], [-.11, .1], [.11, .1]];
for (let k = 0; k < NT; k++) {
  const g = new THREE.Group(); hero.add(g);
  g.add(box(RW - .06, .05, RD - .06, M.tray, 0, 0, 0));
  g.add(box(RW - .1, .006, RD - .12, M.board, 0, .028, .02));
  g.add(box(RW - .06, .04, .01, M.led, 0, 0, RD / 2 - .025));
  const chips = [], plates = [];
  for (const [cx, cz] of chipPos) {
    const c = box(.085, .012, .085, M.chip, cx, .037, cz + .02); g.add(c); chips.push(c);
    const p = new THREE.Group(); p.position.set(cx, .05, cz + .02); g.add(p);
    p.add(box(.1, .018, .1, M.copper, 0, 0, 0));
    for (let j = -2; j <= 2; j++) p.add(box(.008, .006, .08, M.steel, j * .016, .012, 0));
    plates.push(p);
  }
  // hoses: supply (blue) along the left, return (orange) along the right
  const hs = box(.012, .012, RD - .12, M.cold, -.2, .05, .02); g.add(hs);
  const hr = box(.012, .012, RD - .12, M.warm, .2, .05, .02); g.add(hr);
  for (const [cx, cz] of chipPos) { g.add(box(Math.abs(-.2 - cx) - .05, .01, .01, cx < 0 ? M.cold : M.warm, cx < 0 ? (cx - .2) / 2 - .02 : (cx + .2) / 2 + .02, .05, cz + .02)); }
  trays.push({ g, chips, plates });
}
// coolant dots on the top tray (in from the left hose, through each plate, out to the right)
const trayDots = [...Array(24)].map((_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(.011, 8, 6), i % 2 ? M.dotC : M.dotW); trays[NT - 1].g.add(m); return m; });

// ---------- chiller + chilled-water loop ----------
const CH = { x0: 2.45, x1: 3.95, z0: -1.25, z1: .35, y1: FL + .95 };
const chiller = new THREE.Group(); scene.add(chiller);
chiller.add(box(CH.x1 - CH.x0, CH.y1 - FL, CH.z1 - CH.z0, M.chillerM, (CH.x0 + CH.x1) / 2, (FL + CH.y1) / 2, (CH.z0 + CH.z1) / 2));
{ const g = []; for (let k = 0; k < 9; k++) g.push(boxG(.02, .55, .015, CH.x0 + .2 + k * .14, FL + .45, CH.z1 + .008)); chiller.add(merged(g, M.louver)); }
for (const x of [CH.x0 + .45, CH.x1 - .45]) { const d = cyl(.3, .3, .08, M.fan); d.position.set(x, CH.y1 + .04, (CH.z0 + CH.z1) / 2); chiller.add(d); }
const loopS = pipe([[-2.8, 2.0, -.55], [CH.x0 - .25, 2.0, -.55], [CH.x0 - .25, .62, -.55], [CH.x0, .62, -.55]], .045, M.cold);
const loopR = pipe([[CH.x0, .82, -.25], [CH.x0 - .12, .82, -.25], [CH.x0 - .12, 1.88, -.25], [-2.8, 1.88, -.25]], .045, M.warm);
// drops from the overhead headers to each rack row (visual only)
{ const g = []; for (let i = 0; i < 7; i++) { const x = RX0 + i * RDX; g.push(boxG(.02, .4, .02, x - .06, 1.84, -.55), boxG(.02, .3, .02, x + .06, 1.78, -.25)); } hall.add(merged(g, M.steel)); }

// ---------- rooftop cooling towers (evaporative) and dry coolers (the fix) ----------
const TOW = [-2.3, -.75, .8].map(x => new THREE.Vector3(x, roofY + .14, -.65));
const towers = TOW.map(p => {
  const g = new THREE.Group(); g.position.copy(p); scene.add(g);
  g.add(box(1.1, .75, 1.1, M.tower, 0, .375, 0));
  { const lg = []; for (let k = 0; k < 6; k++) { lg.push(boxG(1.0, .03, .01, 0, .12 + k * .09, .556)); lg.push(boxG(.01, .03, 1.0, .556, .12 + k * .09, 0)); } g.add(merged(lg, M.louver)); }
  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(.42, .46, .28, 32, 1, true), M.tower); shroud.position.y = .89; g.add(sh(shroud));
  const fan = new THREE.Group(); fan.position.y = .85; g.add(fan);
  for (let k = 0; k < 4; k++) { const b = box(.72, .012, .1, M.fan); b.rotation.y = k * Math.PI / 4; b.rotation.x = .25; fan.add(b); }
  fan.add(cyl(.07, .07, .05, M.fan, 16));
  return { g, fan };
});
const dries = TOW.map(p => {
  const g = new THREE.Group(); g.position.copy(p); g.position.y += 0; scene.add(g);
  g.add(box(1.2, .36, 1.0, M.dry, 0, .18, 0));
  const fans = [];
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) { const s = cyl(.2, .2, .05, M.fan, 24); s.position.set(-.28 + a * .56, .385, -.23 + b * .46); g.add(s); const f = new THREE.Group(); f.position.set(-.28 + a * .56, .42, -.23 + b * .46); for (let k = 0; k < 3; k++) { const bl = box(.34, .008, .06, M.steel); bl.rotation.y = k * Math.PI / 3; f.add(bl); } g.add(f); fans.push(f); }
  g.scale.setScalar(.001); g.visible = false; return { g, fans };
});
// condenser loop: chiller ↔ towers (orange up, blue back)
const condR = pipe([[CH.x1 - .3, CH.y1, -.95], [CH.x1 - .3, roofY + .5, -.95], [CH.x1 - .3, roofY + .5, -1.45], [-2.3, roofY + .5, -1.45]], .045, M.warm);
const condS = pipe([[-2.3, roofY + .3, -1.3], [CH.x1 - .55, roofY + .3, -1.3], [CH.x1 - .55, roofY + .3, -.75], [CH.x1 - .55, CH.y1, -.75]], .045, M.cold);
{ const g = []; for (const p of TOW) g.push(boxG(.03, .3, .03, p.x, roofY + .35, -1.37)); scene.add(merged(g, M.steel)); }
// make-up water: river → towers
const intake = pipe([[4.55, FL + .02, 2.2], [4.55, FL + .2, 2.2], [4.55, FL + .2, -1.65], [4.55, roofY + .72, -1.65], [-2.3, roofY + .72, -1.65]], .04, M.raw);
{ const p = box(.4, .3, .4, M.steel, 4.55, FL + .15, 1.55); scene.add(p); }

// ---------- power plant (distant) ----------
const PP = new THREE.Vector3(8.5, 0, -10);
const plant = new THREE.Group(); plant.position.copy(PP); scene.add(plant);
plant.add(box(9, .2, 7, M.pad, 0, .1, 0));
{ const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20, y = u * 4.6; const r = 1.0 + .9 * Math.pow(Math.abs(u - .72) / .72, 1.6) * (u < .72 ? 1 : .55); pts.push(new THREE.Vector2(r, y)); }
  const tw = sh(new THREE.Mesh(new THREE.LatheGeometry(pts, 48), new THREE.MeshPhysicalMaterial({ color: '#d6d2ca', roughness: .85, side: THREE.DoubleSide }))); tw.position.set(-1.6, .2, 0); plant.add(tw); }
plant.add(box(2.6, 1.6, 2.0, M.plant, 2.0, 1.0, .6)); plant.add(box(1.6, 2.4, 1.4, M.plant, 2.2, 1.4, -1.6));
{ const s = cyl(.22, .3, 4.2, M.plant, 20); s.position.set(3.4, 2.3, -1.6); plant.add(s); }
// pylons + lines toward the site
const pyl = []; for (const p of [[5.6, -6.2], [6.8, -3.4]]) { const g = new THREE.Group(); g.position.set(p[0], FL, p[1]); scene.add(g); g.add(box(.08, 2.8, .08, M.steel, 0, 1.4, 0)); g.add(box(.9, .05, .05, M.steel, 0, 2.6, 0)); pyl.push(g); }
{ const pts = [new THREE.Vector3(PP.x + 2.2, 2.6, PP.z - 1.6), new THREE.Vector3(5.6, FL + 2.6, -6.2), new THREE.Vector3(6.8, FL + 2.6, -3.4), new THREE.Vector3(HX1, roofY, HZ0)];
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(pts).getPoints(60)), new THREE.LineBasicMaterial({ color: '#9aa1aa' }))); }

// ---------- plume sprites (soft puffs, positioned deterministically from t) ----------
const puff = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.5, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
function plume(src, n, o) {
  const s = [...Array(n)].map(() => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, color: o.col || '#ffffff', transparent: true, depthWrite: false, opacity: 0 })); scene.add(sp); return sp; });
  return { s, src, ...o };
}
const plumes = TOW.map(p => plume(new THREE.Vector3(p.x, p.y + 1.0, p.z), 26, { rise: 3.2, drift: .9, size0: .35, size1: 1.6, rate: .16, alpha: .55 }));
const plantPlume = plume(new THREE.Vector3(PP.x - 1.6, 4.8, PP.z), 34, { rise: 7, drift: 2.2, size0: 1.6, size1: 4.5, rate: .07, alpha: .6 });
const heatHaze = plume(new THREE.Vector3(0, 0, 0), 18, { rise: 1.2, drift: .2, size0: .2, size1: .7, rate: .5, alpha: .35, col: '#ff7a3d' });
function drawPlume(P, t, k, at) {
  const src = at || P.src;
  P.s.forEach((sp, i) => {
    const u = ((i / P.s.length) + t * P.rate + hash(i) * .05) % 1;
    const w = Math.sin(i * 2.3 + t * .6) * .15 * u;
    sp.position.set(src.x + (hash(i + 7) - .5) * .3 + P.drift * u * u + w, src.y + P.rise * Math.pow(u, .8), src.z + (hash(i + 3) - .5) * .3 + w);
    const sz = lerp(P.size0, P.size1, u); sp.scale.set(sz, sz, 1);
    sp.material.opacity = k * P.alpha * Math.min(1, u * 6) * Math.pow(1 - u, 1.3); sp.visible = k > .005;
  });
}
// flow dots along pipes
function dots(p, n, mat, r = .03) { return { p, d: [...Array(n)].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat); scene.add(m); return m; }) }; }
const FD = [dots(loopS, 22, M.dotC), dots(loopR, 22, M.dotW), dots(condR, 26, M.dotW), dots(condS, 26, M.dotC), dots(intake, 30, M.dot, .035)];
function drawDots(D, t, k, speed = .5) { D.d.forEach((m, i) => { const u = ((i / D.d.length) + t * speed / D.p.len) % 1; m.position.copy(D.p.c.getPointAt(u)); m.visible = k > .5; }); }
// snow (cool-climate siting)
const SN = 260, snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SN * 3), 3));
const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: '#ffffff', size: .06, transparent: true, opacity: 0, depthWrite: false })); scene.add(snow);

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const LIFT = new THREE.Vector3(-.5, 3.0, 1.9), HS = 1.9;            // hero rack: lifted position + scale
const trayY = (k, sp) => .15 + k * (.22 + .26 * sp);                  // tray local y with spread 0..1
const topTray = new THREE.Vector3(LIFT.x, LIFT.y + trayY(NT - 1, 1) * HS, LIFT.z + .5 * HS);
const CAMK = [
  [0.0, 30, 28, 27, .4, 1.9, -.4],
  [T.dc, 32, 22, 23, .3, 1.6, -.2],
  [T.hot, 26, 12, 12, -.6, 1.2, .2],
  [T.racks + .2, 22, 10, 10, -.8, 1.3, .3],
  [T.kw + .6, 18, 14, 13, -.5, 3.2, .8],
  [T.air + .9, 16, 14, 13.5, -.5, 4.3, 1.4],
  [T.chip + .9, 22, 38, 4.2, topTray.x, topTray.y, topTray.z],
  [T.flow, 30, 44, 3.6, topTray.x, topTray.y, topTray.z],
  [T.away + .6, 36, 40, 4.0, topTray.x, topTray.y, topTray.z],
  [T.chiller + .9, 44, 16, 11, 2.0, 1.2, -.3],
  [T.roof, 40, 20, 11.5, 1.6, 1.8, -.5],
  [T.towers + .8, 30, 22, 10.5, -.5, 3.0, -.7],
  [T.evap + .8, 24, 18, 12, -.6, 3.6, -.7],
  [T.wue + .5, 34, 20, 23, .3, 2.4, -.4],
  [T.ms + 1.2, 38, 20, 24, .4, 2.3, -.4],
  [T.plants + .6, -22, 14, 34, 4.0, 3.2, -4.8],
  [T.x12 + 1.2, -30, 16, 36, 4.0, 3.4, -4.8],
  [T.prompt + .6, 30, 24, 21, .2, 2.0, -.3],
  [T.big + .6, 26, 26, 24, .4, 2.2, -.5],
  [T.fixes + .4, 30, 22, 20, .2, 2.2, -.5],
  [T.dry + .5, 24, 26, 12.5, -.6, 2.9, -.6],
  [T.climate + .8, 34, 24, 22, .4, 2.0, -.4],
  [T.closer + 1.5, 32, 26, 27, .5, 2.0, -.4],
  [T.next, 28, 28, 29, .5, 2.0, -.4],
  [DUR, 24, 30, 31, .5, 2.0, -.4],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz] = camTrack(t); const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 240; post.dof.maxCoc = 10;
  const la = A - .9; key.position.set(tx + 16 * Math.sin(la), ty + 18, tz + 16 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 12 * Math.sin(A + Math.PI * .85), ty + 4, tz + 12 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 12, tz); top.lookAt(tx, ty, tz);
}

// ---------- events (foley) ----------
const EV = [{ t: T.hook + .05, type: 'drill' }, { t: T.racks + .6, type: 'lift' }, { t: T.air + .1, type: 'spread' }, { t: T.kw, type: 'buzz' },
  { t: T.plates + .1, type: 'clunk' }, { t: T.flow, type: 'hydraulic' }, { t: T.chiller + .1, type: 'land' }, { t: T.chiller2, type: 'label' }, { t: T.towers, type: 'label' },
  { t: T.evap, type: 'hydraulic' }, { t: T.aws, type: 'pins' }, { t: T.ms, type: 'pins' }, { t: T.plants, type: 'lift' }, { t: T.x12, type: 'card' },
  { t: T.drops, type: 'coin' }, { t: T.gal, type: 'card' }, { t: T.closed, type: 'clunk' }, { t: T.dry, type: 'clunk' }, { t: T.climate, type: 'spread' }, { t: T.next, type: 'card' }];
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
const V = new THREE.Vector3();
window.render = t => {
  // hero rack: lift out, explode trays, slide top tray, lift cold plates
  const lift = eio(seg(t, T.racks + .5, T.racks + 2.0)) * (1 - eio(seg(t, T.chiller - .5, T.chiller + .7)));
  const spread = eo(seg(t, T.air - .1, T.air + 1.1)) * (1 - eio(seg(t, T.chiller - .7, T.chiller + .3)));
  const slide = eio(seg(t, T.chip - .2, T.chip + .9)) * (1 - eio(seg(t, T.chiller - .9, T.chiller)));
  const plateUp = eio(seg(t, T.plates + .1, T.plates + .7)) * (1 - eio(seg(t, T.flow - .4, T.flow + .1)));
  hero.position.lerpVectors(heroHome, LIFT, lift); hero.scale.setScalar(lerp(1, HS, lift));
  trays.forEach((tr, k) => { tr.g.position.set(0, trayY(k, spread), k === NT - 1 ? .5 * slide : 0); tr.plates.forEach(p => { p.position.y = .05 + .14 * plateUp; }); });
  // heat: chips glow hot from "run so hot"; dimmer once coolant flows
  const hot = seg(t, T.hot - .2, T.hot + .5), cooled = seg(t, T.flow, T.away + .5);
  M.chip.emissiveIntensity = hot * (2.2 - 1.4 * cooled) * (.85 + .15 * Math.sin(t * 7));
  M.led.emissive.set(hot > 0 && cooled < 1 ? '#ffb070' : '#59d4ff'); M.led.emissiveIntensity = 2.2;
  hotLight.position.copy(hero.position).add(V.set(0, .9 * hero.scale.x, .4)); hotLight.intensity = hot * (1 - cooled * .7) * 3 * (1 - seg(t, T.chiller - .5, T.chiller));
  drawPlume(heatHaze, t, env2(t, T.air - .2, T.chip + .6) * (lift > .5 ? 1 : 0), V.copy(hero.position).add(new THREE.Vector3(0, trayY(NT - 1, spread) * hero.scale.x, 0)));
  // coolant dots on the top tray
  const tdk = seg(t, T.flow - .3, T.flow) * (1 - seg(t, T.chiller - .6, T.chiller - .3));
  trayDots.forEach((m, i) => { const ci = i % 4, u = ((i / 24) * 3 + t * .9) % 1, [cx, cz] = chipPos[ci]; const zz = cz + .02;
    let x; if (u < .5) x = lerp(-.2, cx, u / .5); else x = lerp(cx, .2, (u - .5) / .5); m.material = u < .5 ? M.dotC : M.dotW; m.position.set(x, .05 + (Math.abs(x - cx) < .05 ? .02 : 0), zz); m.visible = tdk > .5; });
  // loops: chilled water from "dumps its heat into a chiller", condenser water from "up to the roof"; on during the summary shots too
  const loopOn = (t > T.flow && t < T.chiller - .6) ? 0 : (t > T.chiller - .3 ? 1 : (t < T.racks ? 1 : 0));
  const condOn = t > T.roof - .3 || t < T.racks ? 1 : 0;
  drawDots(FD[0], t, loopOn); drawDots(FD[1], t, loopOn); drawDots(FD[2], t, condOn); drawDots(FD[3], t, condOn);
  const evapK = 1 - seg(t, T.closed + .2, T.dry + .3);   // the fixes stop the evaporation
  drawDots(FD[4], t, (t < T.racks || (t > T.drink - .2 && t < T.racks + .4) || t > T.towers - .3) && evapK > .5 ? 1 : 0, .7);
  M.cold.emissiveIntensity = .05 + .5 * envK(t, T.chiller2 - .3, T.towers) + .4 * envK(t, T.closed - .1, T.dry);
  M.warm.emissiveIntensity = .05 + .5 * envK(t, T.chiller - .2, T.towers) + .4 * envK(t, T.closed - .1, T.dry);
  M.raw.emissiveIntensity = .05 + .6 * envK(t, T.drink - .2, T.racks + .3) + .5 * envK(t, T.lost - .2, T.much);
  // towers → dry coolers
  const swap = eio(seg(t, T.dry - .1, T.dry + .9));
  towers.forEach((tw, i) => { tw.g.scale.setScalar(Math.max(.001, 1 - swap)); tw.g.visible = swap < .99; tw.fan.rotation.y = t * 9 + i; });
  dries.forEach((d, i) => { const s = eo(seg(t, T.dry + .2 + i * .12, T.dry + .9 + i * .12)); d.g.scale.setScalar(Math.max(.001, s)); d.g.visible = s > .001; d.fans.forEach((f, j) => f.rotation.y = t * 10 + j); });
  // plumes: tower vapour (big during "water is lost"), power-plant plume always
  const pk = (.75 + .35 * envK(t, T.lost - .2, T.much + 1)) * evapK;
  plumes.forEach((p, i) => drawPlume(p, t + i * 1.7, pk));
  drawPlume(plantPlume, t, 1);
  // river level drops a touch during the hook question, then recovers
  river.scale.y = 1 - .6 * envK(t, .3, T.dc + 1.0); river.position.y = FL - .01 - .015 * envK(t, .3, T.dc + 1.0);
  M.water.emissiveIntensity = .25 + .1 * Math.sin(t * 2);
  // snow for cool-climate siting
  const sk = seg(t, T.climate - .1, T.climate + .6);
  { const a = snowGeo.attributes.position.array; for (let i = 0; i < SN; i++) { const u = (hash(i) + t * (.08 + .05 * hash(i + 9))) % 1; a[i * 3] = -5 + 10 * hash(i + 1) + .2 * Math.sin(t + i); a[i * 3 + 1] = 6.5 - 6.3 * u; a[i * 3 + 2] = -2.5 + 5.5 * hash(i + 2); } snowGeo.attributes.position.needsUpdate = true; snow.material.opacity = .9 * sk; snow.visible = sk > 0; }
  M.pad.color.set('#8d8a83').lerp(new THREE.Color('#d9dde2'), .7 * sk);
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, hero, trays, topTray, TOW, CH, PP, roofY, FL, HX1, NT, trayY, spread, lift });
};
function envK(t, a, b) { return Math.min(seg(t, a, a + .4), 1 - seg(t, b - .4, b)); }
function env2(t, a, b) { return envK(t, a, b); }
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
