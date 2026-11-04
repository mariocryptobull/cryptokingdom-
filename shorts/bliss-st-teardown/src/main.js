// How 46 St–Bliss St was built — Exploded Teardown, 1080×1920. A studio model of one stretch of the 1917 concrete
// viaduct over Queens Boulevard. Each construction layer is its own piece; the stack explodes, then rebuilds in order.
// Units: model units (schematic, not to scale). X along the viaduct, Y up, Z across the boulevard.
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
  explode: cue('v02', 0), dual: cue('v02', 1), beauty: cue('v03', 0), chose: cue('v03', 3),
  footings: cue('v04', 0), piers: cue('v04', 1), clock: cue('v04', 3),
  arches: cue('v05', 0), girders: cue('v05', 1), tracks: cue('v05', 2),
  station: cue('v06', 0), platforms: cue('v06', 1), canopies: cue('v06', 2), house: cue('v06', 3),
  open: cue('v07', 0), train: cue('v07', 1),
  ext: cue('v08', 0), water: cue('v08', 2), crumble: cue('v08', 4),
  rebuild: cue('v09', 0), tons: cue('v09', 2), canopy2: cue('v09', 3), glass: cue('v09', 4),
  cbtc: cue('v10', 0), now: cue('v10', 2), temp: cue('v10', 3), elev: cue('v10', 4),
  nograve: cue('v11', 0), congrats: cue('v11', 1), card: cue('v11', 2),
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
post.bloom.strength = .4; post.bloom.radius = .5; post.bloom.threshold = 2.2;
post.vig.uniforms.amt.value = .34; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .1;
{
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createRadialGradient(560, 860, 80, 540, 960, 1500); gr.addColorStop(0, '#34363a'); gr.addColorStop(.45, '#222427'); gr.addColorStop(1, '#0d0e10');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = .45; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff1e2', 1.6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 70 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 5, 16, 5); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .5, 14, 14); scene.add(top);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .22));

// ---------- materials ----------
const canvasTex = (w, h, draw, rep = [1, 1]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 4; return t; };
const tileTex = canvasTex(64, 16, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#d8b23a' : '#2f7a55'; g.fillRect(i * 8, 0, 8, h); } g.fillStyle = '#e9e2d0'; g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2); }, [18, 1]);
const roadTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2e3034'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .05})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); } });
const glassTex = canvasTex(64, 32, (g, w, h) => { const P = ['#e8402e', '#f2b81f', '#2f6fe0', '#3fae6a', '#a24ae0', '#ff8a3d']; for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { g.fillStyle = P[(x * 7 + y * 3) / 8 % P.length | 0]; g.fillRect(x, y, 8, 8); } g.strokeStyle = '#1b1b1b'; g.lineWidth = 1; for (let x = 0; x <= w; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }, [1, 1]);
const M = {
  base: new THREE.MeshPhysicalMaterial({ color: '#2b2e33', roughness: .5, metalness: .3, clearcoat: .2 }),
  road: new THREE.MeshPhysicalMaterial({ map: roadTex, roughness: .8 }),
  paint: new THREE.MeshStandardMaterial({ color: '#e9e4d6', roughness: .6 }),
  walk: new THREE.MeshPhysicalMaterial({ color: '#a9a69e', roughness: .85 }),
  model: new THREE.MeshPhysicalMaterial({ color: '#f1efe9', roughness: .6 }),
  conc: new THREE.MeshPhysicalMaterial({ color: '#d6cfc2', roughness: .85 }),
  footing: new THREE.MeshPhysicalMaterial({ color: '#b9b2a6', roughness: .9 }),
  steel: new THREE.MeshStandardMaterial({ color: '#4a5056', roughness: .45, metalness: .7 }),
  rail: new THREE.MeshStandardMaterial({ color: '#c3c7cc', roughness: .2, metalness: 1 }),
  tie: new THREE.MeshStandardMaterial({ color: '#4b3a2c', roughness: .8 }),
  tile: new THREE.MeshPhysicalMaterial({ map: tileTex, roughness: .35, clearcoat: .6 }),
  plat: new THREE.MeshPhysicalMaterial({ color: '#c4bdb0', roughness: .8 }),
  edge: new THREE.MeshPhysicalMaterial({ color: '#f2c230', roughness: .5, emissive: '#f2c230', emissiveIntensity: .1 }),
  canopyOld: new THREE.MeshPhysicalMaterial({ color: '#2f5d4a', roughness: .5, clearcoat: .3 }),
  canopyNew: new THREE.MeshPhysicalMaterial({ color: '#8e979f', roughness: .3, metalness: .6, clearcoat: .5 }),
  house: new THREE.MeshPhysicalMaterial({ color: '#c9c1b2', roughness: .8 }),
  window: new THREE.MeshPhysicalMaterial({ color: '#2a3a48', roughness: .1, metalness: .2, emissive: '#ffd9a0', emissiveIntensity: .25, clearcoat: 1 }),
  wood: new THREE.MeshPhysicalMaterial({ color: '#b0855a', roughness: .75, transparent: true, opacity: .9 }),
  body: new THREE.MeshStandardMaterial({ color: '#c9ccd1', roughness: .25, metalness: 1 }),
  purple: new THREE.MeshPhysicalMaterial({ color: '#a24ae0', roughness: .35, emissive: '#a24ae0', emissiveIntensity: .35 }),
  glass: new THREE.MeshPhysicalMaterial({ map: glassTex, roughness: .2, transparent: true, opacity: .92, emissive: '#ffffff', emissiveMap: glassTex, emissiveIntensity: .45 }),
  elevGlass: new THREE.MeshPhysicalMaterial({ color: '#cfe6f2', roughness: .05, transparent: true, opacity: .28, clearcoat: 1, depthWrite: false }),
  ply: new THREE.MeshPhysicalMaterial({ color: '#c99e62', roughness: .8 }),
  orange: new THREE.MeshPhysicalMaterial({ color: '#ff6b1a', roughness: .5, emissive: '#ff6b1a', emissiveIntensity: .2 }),
  cbtc: new THREE.MeshPhysicalMaterial({ color: '#59d4ff', roughness: .3, emissive: '#59d4ff', emissiveIntensity: .6 }),
  water: new THREE.MeshPhysicalMaterial({ color: '#6fb6e8', roughness: .05, transparent: true, opacity: .8, emissive: '#2f6fa0', emissiveIntensity: .3 }),
};
const CONC0 = new THREE.Color('#d6cfc2'), CONC_OLD = new THREE.Color('#77695a');
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const boxG = (sx, sy, sz, x, y, z) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);
const merged = (geos, mat) => { const ni = geos.some(g => !g.index); return sh(new THREE.Mesh(mergeGeometries(ni ? geos.map(g => g.index ? g.toNonIndexed() : g) : geos), mat)); };

// ---------- dimensions ----------
const G0 = .17;                              // road surface
const BENTS = [-3.0, -1.8, -.6, .6, 1.8, 3.0], PZ = .74, LEN = 7.4;
const DECK = G0 + 1.12, DW = 2.2;           // deck underside
const TRK = [-.42, 0, .42];                  // tracks (z): local, express, local
const PLZ = .88, PLW = .34;                  // side platforms

// ---------- boulevard base (always assembled) ----------
const base = new THREE.Group(); scene.add(base);
base.add(box(9.6, .16, 6.4, M.base, 0, .08, 0));
base.add(box(9.2, .012, 4.6, M.road, 0, G0 - .006, 0));
{
  const lines = []; for (const z of [-1.55, -1.0, 1.0, 1.55]) for (let x = -4.4; x < 4.4; x += .6) lines.push(boxG(.3, .004, .025, x + .15, G0 + .002, z));
  for (const z of [-1.2, 1.2]) lines.push(boxG(9.2, .004, .02, 0, G0 + .002, z));
  base.add(merged(lines, M.paint));
  base.add(box(9.2, .04, .5, M.walk, 0, G0 + .02, -2.55), box(9.2, .04, .5, M.walk, 0, G0 + .02, 2.55));
  let r = 777; const R = () => (r = (r * 16807) % 2147483647) / 2147483647; const geos = [];
  for (const s of [-1, 1]) for (let x = -4.5; x < 4.5;) { const w = .35 + R() * .5, h = s > 0 ? .08 + R() * .1 : .25 + Math.pow(R(), 1.6) * .9, d = .35 + R() * .1; geos.push(boxG(w - .04, h, d, x + w / 2, G0 + h / 2, s * (2.8 + d / 2) + s * .02)); x += w; }
  base.add(merged(geos, M.model));
}
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: '#000', opacity: .35 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

// ---------- layers (each assembles into place; `off` = height in the exploded stack) ----------
const L = {};
const layer = (name, off) => { const g = new THREE.Group(); scene.add(g); L[name] = { g, off }; return g; };
// footings
{ const g = layer('footings', .5); const geos = []; for (const x of BENTS) for (const z of [-PZ, PZ]) geos.push(boxG(.42, .08, .42, x, G0 + .04, z)); g.add(merged(geos, M.footing)); }
// piers (+ wooden formwork for the pour)
const pierCols = [], forms = [];
{
  const g = layer('piers', 1.3);
  for (const x of BENTS) for (const z of [-PZ, PZ]) {
    const c = new THREE.Group(); c.position.set(x, G0 + .08, z); g.add(c);
    c.add(box(.2, .62, .2, M.conc, 0, .31, 0)); c.add(box(.26, .06, .26, M.conc, 0, .65, 0)); pierCols.push(c);
    const f = new THREE.Group(); f.position.set(x, G0 + .08, z); g.add(f);
    for (const [dx, dz, sx, sz] of [[.13, 0, .025, .28], [-.13, 0, .025, .28], [0, .13, .28, .025], [0, -.13, .28, .025]]) f.add(box(sx, .7, sz, M.wood, dx, .35, dz));
    forms.push(f);
  }
}
// arches: spandrel panels along both pier lines + cross arches at each bent, tile band on the fascia
const archMeshes = [];
{
  const g = layer('arches', 2.2), spring = G0 + .55, top = DECK;
  const arch = (half, r, y0, y1) => { const s = new THREE.Shape(); s.moveTo(-half, y0); s.lineTo(-r, y0); s.absarc(0, y0, r, Math.PI, 0, true); s.lineTo(half, y0); s.lineTo(half, y1); s.lineTo(-half, y1); s.closePath(); return s; };
  const geos = [];
  for (let i = 0; i < BENTS.length - 1; i++) { const xm = (BENTS[i] + BENTS[i + 1]) / 2; for (const z of [-PZ, PZ]) { const ge = new THREE.ExtrudeGeometry(arch(.6, .47, spring, top), { depth: .16, bevelEnabled: false, curveSegments: 16 }); ge.translate(xm, 0, z - .08); geos.push(ge); } }
  for (const x of BENTS) { const ge = new THREE.ExtrudeGeometry(arch(PZ + .1, PZ - .1, G0 + .42, top), { depth: .18, bevelEnabled: false, curveSegments: 16 }); ge.rotateY(Math.PI / 2); ge.translate(x - .09, 0, 0); geos.push(ge); }
  for (const xe of [-3.6, 3.6]) { geos.push(boxG(.2, top - G0 - .1, .18, xe - Math.sign(xe) * .0, G0 + (top - G0 - .1) / 2 + .1, -PZ), boxG(.2, top - G0 - .1, .18, xe, G0 + (top - G0 - .1) / 2 + .1, PZ)); }
  const a = merged(geos, M.conc); g.add(a); archMeshes.push(a);
  for (const z of [-PZ - .085, PZ + .085]) { const tb = box(7.2, .07, .006, M.tile, 0, top - .07, z); g.add(tb); }
}
// steel girders: four longitudinal lines + cross girders
{
  const g = layer('girders', 3.1), y = DECK + .05, geos = [];
  for (const z of [-.66, -.22, .22, .66]) { geos.push(boxG(LEN, .1, .012, 0, y, z), boxG(LEN, .012, .07, 0, y + .05, z), boxG(LEN, .012, .07, 0, y - .05, z)); }
  for (const x of BENTS) geos.push(boxG(.05, .09, 1.5, x, y, 0));
  g.add(merged(geos, M.steel));
}
// deck slab + parapets + fascia tile band
{ const g = layer('deck', 3.7); g.add(box(LEN, .08, DW, M.conc, 0, DECK + .14, 0)); for (const s of [-1, 1]) { g.add(box(LEN, .06, .04, M.conc, 0, DECK + .21, s * (DW / 2 - .02))); g.add(box(LEN, .05, .006, M.tile, 0, DECK + .14, s * (DW / 2 + .003))); } }
// tracks
const RAIL_Y = DECK + .18 + .035;
{ const g = layer('tracks', 4.25), r = [], ti = []; for (const z of TRK) { for (const dz of [-.075, .075]) r.push(boxG(LEN, .025, .018, 0, RAIL_Y, z + dz)); for (let x = -3.6; x <= 3.6; x += .14) ti.push(boxG(.05, .02, .24, x, RAIL_Y - .022, z)); } g.add(merged(r, M.rail), merged(ti, M.tie)); }
// platforms (scaled along x for the 1950s extension)
const plats = [];
{ const g = layer('platforms', 4.75); for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.set(0, 0, s * PLZ); g.add(p); p.add(box(1, .1, PLW, M.plat, 0, DECK + .23, 0)); p.add(box(1, .012, .04, M.edge, 0, DECK + .286, -s * (PLW / 2 - .02))); plats.push(p); } }
// canopies (old green 1917 → new 1990s) + stained-glass windscreens
const canopies = { old: [], neu: [] }, glass = [];
{
  const g = layer('canopies', 5.3);
  for (const kind of ['old', 'neu']) for (const s of [-1, 1]) {
    const c = new THREE.Group(); c.position.set(0, 0, s * PLZ); g.add(c);
    const mat = kind === 'old' ? M.canopyOld : M.canopyNew;
    for (let x = -1.5; x <= 1.5; x += .5) c.add(box(.025, .34, .025, mat, x, DECK + .45, s * .06));
    if (kind === 'old') { for (const d of [-1, 1]) { const r = box(3.4, .015, .22, mat, 0, DECK + .66, d * .09); r.rotation.x = d * .32; c.add(r); } }
    else { const r = box(3.5, .02, .4, mat, 0, DECK + .64, 0); r.rotation.x = -s * .12; c.add(r); }
    canopies[kind].push(c);
  }
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const p = box(.42, .2, .008, M.glass, -1.05 + i * .7, DECK + .38, s * (PLZ + PLW / 2 + .01)); g.add(p); glass.push(p); }
}
// station house inside the centre arch
{ const g = layer('house', 0); g.add(box(.82, .44, 1.1, M.house, 0, G0 + .22, 0)); g.add(box(.9, .04, 1.18, M.conc, 0, G0 + .46, 0));
  for (const s of [-1, 1]) { for (const dx of [-.24, 0, .24]) g.add(box(.14, .16, .01, M.window, dx, G0 + .26, s * .556)); g.add(box(.18, .26, .012, M.steel, .0, G0 + .13, s * .557).translateX(.3)); } L.house.slide = 2.6; }

// ---------- train (7 line): silver cars, purple stripe ----------
const train = new THREE.Group(); scene.add(train);
const cars = [];
for (let i = 0; i < 5; i++) { const c = new THREE.Group(); c.position.x = -i * .74; train.add(c); c.add(box(.7, .2, .2, M.body, 0, RAIL_Y + .13, 0)); c.add(box(.702, .03, .202, M.purple, 0, RAIL_Y + .15, 0)); for (const dx of [-.24, 0, .24]) c.add(box(.1, .06, .204, M.window, dx, RAIL_Y + .17, 0)); cars.push(c); }

// ---------- later props ----------
const drips = [...Array(26)].map((_, i) => { const m = sh(new THREE.Mesh(new THREE.SphereGeometry(.025, 10, 8), M.water)); scene.add(m); return m; });
const debris = [...Array(14)].map(() => { const m = sh(new THREE.Mesh(new THREE.DodecahedronGeometry(.035, 0), M.conc)); scene.add(m); return m; });
const transp = [...Array(9)].map((_, i) => { const m = box(.08, .015, .05, M.cbtc, -3.2 + i * .8, RAIL_Y - .01, 0); scene.add(m); return m; });
const pulse = box(.5, .02, .03, M.cbtc, 0, RAIL_Y + .02, 0); scene.add(pulse);
const temp = new THREE.Group(); scene.add(temp);
{ temp.add(box(2.4, .05, .3, M.ply, .4, DECK + .25, PLZ + .32)); for (let x = -.7; x <= 1.5; x += .55) { temp.add(box(.03, DECK + .25 - G0, .03, M.orange, x, (DECK + .25 + G0) / 2, PLZ + .45)); } temp.add(box(2.4, .1, .015, M.orange, .4, DECK + .33, PLZ + .47)); }
const elevs = [];
for (const s of [-1, 1]) { const e = new THREE.Group(); e.position.set(2.15, G0, s * (PLZ + .1)); scene.add(e); const h = DECK + .3 - G0; e.add(box(.3, h, .3, M.elevGlass, 0, h / 2, 0)); const fr = []; for (const dx of [-.15, .15]) for (const dz of [-.15, .15]) fr.push(boxG(.025, h, .025, dx, h / 2, dz)); fr.push(boxG(.32, .03, .32, 0, h, 0)); e.add(merged(fr, M.steel)); e.add(box(.22, .26, .22, M.body, 0, .3, 0)); elevs.push(e); }

// ---------- motion ----------
const pop = x => 1 - Math.pow(1 - ss(x), 3);
const explodeK = t => pop(seg(t, T.explode - .1, T.explode + 1.5));
const LAND = { footings: T.footings + .1, piers: T.piers, arches: T.arches + .1, girders: T.girders, deck: T.girders + .7, tracks: T.tracks, platforms: T.platforms, canopies: T.canopies, house: T.house };
const landK = (n, t) => eio(seg(t, LAND[n], LAND[n] + .85));
const layerY = (n, t) => L[n].off * explodeK(t) * (1 - landK(n, t)) + (1 - landK(n, t)) * explodeK(t) * .03 * Math.sin(t * 2 + L[n].off);
const pourK = t => ss(seg(t, T.piers + .7, T.clock + .6));
const decayK = t => ss(seg(t, T.water, T.crumble + .8)) * (1 - ss(seg(t, T.tons - .2, T.tons + .8)));
const extK = t => eio(seg(t, T.ext + .2, T.ext + 1.6));
const tempK = t => eo(seg(t, T.temp - .1, T.temp + .9));
const elevK = t => eio(seg(t, T.elev - .1, T.elev + 1.4));

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CY = G0 + .8;
const CAMK = [
  [0.0, 38, 20, 12.5, 0, CY, 0],
  [T.explode - .3, 30, 18, 12.5, 0, CY, 0],
  [T.explode + 1.6, 26, 14, 25, 0, 3.3, 0],
  [T.chose + .8, 20, 12, 24, 0, 3.2, 0],
  [T.footings + .2, 30, 22, 15, 0, 2.0, 0],
  [T.clock + .6, 36, 18, 10.5, -.9, 1.0, .2],
  [T.arches + .8, 40, 14, 13, 0, 1.9, 0],
  [T.tracks + 1.0, 30, 22, 12, 0, 2.2, 0],
  [T.platforms + .6, 22, 26, 8.6, 0, 1.7, .2],
  [T.house + .4, 52, 8, 8.4, 0, .9, 0],
  [T.open + .6, 26, 14, 8.4, .2, 1.4, .3],
  [T.ext + 1.2, 18, 30, 9.6, 0, 1.4, 0],
  [T.water + .6, 40, 6, 7.4, -.4, 1.0, 0],
  [T.crumble + .8, 48, 4, 7.6, -.2, .9, 0],
  [T.tons + .6, 30, 18, 9.4, 0, 1.3, 0],
  [T.glass + .8, 14, 16, 7.6, -.4, 1.6, .6],
  [T.cbtc + 1.2, 30, 32, 8.4, 0, 1.6, 0],
  [T.temp + .4, 22, 14, 8.6, .8, 1.3, .6],
  [T.elev + 1.4, 34, 12, 8.2, 1.4, 1.1, .4],
  [T.congrats, 30, 22, 11.5, 0, 1.2, 0],
  [DUR, 22, 20, 12.5, 0, 1.2, 0],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz] = camTrack(t); const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 240; post.dof.maxCoc = 10;
  const la = A - .9; key.position.set(tx + 14 * Math.sin(la), ty + 16, tz + 14 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 12 * Math.sin(A + Math.PI * .85), ty + 4, tz + 12 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 12, tz); top.lookAt(tx, ty, tz);
}

// ---------- events (for the mix) ----------
const EV = [{ t: T.explode, type: 'lift' }, { t: T.dual, type: 'card' }, { t: T.chose, type: 'label' }];
for (const n of Object.keys(LAND)) EV.push({ t: +(LAND[n] + .85).toFixed(2), type: 'land' });
EV.push({ t: T.piers + .7, type: 'pour' }, { t: T.open, type: 'card' }, { t: T.train - .6, type: 'train' }, { t: T.ext + .2, type: 'slide' }, { t: T.water, type: 'drip' }, { t: T.crumble, type: 'crack' },
  { t: T.rebuild, type: 'label' }, { t: T.tons, type: 'land' }, { t: T.canopy2, type: 'land' }, { t: T.glass, type: 'chime' }, { t: T.cbtc, type: 'beep' }, { t: T.temp, type: 'land' }, { t: T.elev, type: 'slide' }, { t: T.card, type: 'card' });
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
window.render = t => {
  for (const n of Object.keys(L)) { const l = L[n]; if (n === 'house') { const k = explodeK(t) * (1 - landK('house', t)); l.g.position.set(0, 0, -l.slide * k); continue; } l.g.position.y = layerY(n, t); }
  // pour: forms land empty, concrete rises inside, forms lift away
  const pk = pourK(t), formOut = ss(seg(t, T.clock + .7, T.clock + 1.4));
  const pre = t < T.explode + .2;
  pierCols.forEach(c => { c.visible = pre || t >= T.piers + .7; c.scale.y = pre ? 1 : Math.max(pk, .001); });
  forms.forEach(f => { const on = t > T.explode + .2 && formOut < 1; f.visible = on; f.position.y = G0 + .08 + formOut * .9; M.wood.opacity = .9 * (1 - formOut); });
  // platforms stretch in the 1950s
  const pl = 3.2 + 1.6 * extK(t); plats.forEach(p => p.scale.x = pl);
  // canopies swap during the rebuild; stained glass appears
  const sw = eio(seg(t, T.canopy2 - .1, T.canopy2 + .7));
  canopies.old.forEach(c => { c.visible = sw < .99; c.position.y = sw * 2.2; });
  canopies.neu.forEach(c => { c.visible = sw > .01; c.position.y = (1 - sw) * 2.2; });
  const gk = eo(seg(t, T.glass - .1, T.glass + .6)); glass.forEach((p, i) => { const k = clamp(gk * 1.6 - i * .15); p.visible = k > .01; p.scale.set(Math.max(k, .01), Math.max(k, .01), 1); });
  // decay: concrete darkens and stains, water drips through the track bed, chunks fall; the rebuild flashes it clean
  const dk = decayK(t), flash = Math.max(0, 1 - Math.abs(t - T.tons - .3) / .5);
  M.conc.color.copy(CONC0).lerp(CONC_OLD, dk); M.conc.emissive.setRGB(flash * .25, flash * .22, flash * .18);
  drips.forEach((d, i) => { const on = t > T.water - .2 && t < T.tons; d.visible = on; if (!on) return; const x = -3 + (i * 2.37 % 6), z = ((i * 1.31) % 1.6) - .8, ph = ((t - T.water) * .9 + i * .13) % 1; d.position.set(x, DECK + .1 - ph * (DECK - G0), z); d.scale.set(1, 1.6, 1); });
  debris.forEach((d, i) => { const t0 = T.crumble - .2 + i * .09, k = seg(t, t0, t0 + .7); d.visible = k > 0 && k < 1 && t < T.tons; if (!d.visible) return; const x = -2.6 + (i * 1.71 % 5.2), z = i % 2 ? PZ + .1 : -PZ - .1; d.position.set(x, DECK - .05 - k * k * (DECK - G0 - .05), z); d.rotation.set(k * 6, k * 4, 0); });
  // train: rolls in at the opening, leaves for the extension, runs again under CBTC and for the outro
  let tx; const z = TRK[2];
  if (t < T.ext + .4) tx = lerp(-9, 1.6, eo(seg(t, T.train - .9, T.train + 2.2)));
  else if (t < T.cbtc) tx = 1.6 + 12 * ss(seg(t, T.ext + .4, T.ext + 2.6));
  else tx = -6 + ((t - T.cbtc) * 1.6) % 13;
  train.position.set(tx, 0, t < T.cbtc ? z : TRK[1]);
  cars.forEach(c => { const x = tx + c.position.x; c.visible = x > -3.4 && x < 3.4 && t > T.train - 1; });
  // CBTC transponders + pulse
  const ck = seg(t, T.cbtc - .1, T.cbtc + .5) * (1 - seg(t, T.now, T.now + .5));
  transp.forEach((m, i) => { m.visible = ck > .01; M.cbtc.emissiveIntensity = .6 + .8 * (Math.sin(t * 8 - i) > .6 ? 1 : 0); });
  pulse.visible = ck > .01; pulse.position.x = -3.4 + ((t - T.cbtc) * 3) % 6.8;
  // today: temporary platform + elevators
  const tk = tempK(t); temp.visible = tk > .01; temp.position.y = (1 - tk) * 1.6; temp.scale.setScalar(Math.max(tk, .01));
  const ek = elevK(t); elevs.forEach(e => { e.visible = ek > .01; e.scale.y = Math.max(ek, .01); });
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, G0, DECK, RAIL_Y, PLZ, PZ, layerY, explodeK, ek });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
