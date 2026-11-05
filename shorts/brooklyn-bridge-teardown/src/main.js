// How the Brooklyn Bridge was built — Exploded Teardown, 1080×1920. A studio model of the bridge over a cutaway East River.
// Each construction layer is its own piece; the stack explodes, then rebuilds in order: caissons, towers, anchorages,
// cables, suspenders + stays, deck. Units: model units (schematic, not to scale). X along the bridge (Manhattan −x,
// Brooklyn +x), Y up (water surface = 0), Z across the bridge.
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
  explode: cue('v02', 0), designer: cue('v02', 1), son: cue('v02', 3),
  caisson: cue('v03', 0), boxes: cue('v03', 1), sink: cue('v03', 2), dug: cue('v03', 3), air: cue('v03', 4),
  bk44: cue('v04', 0), mh78: cue('v04', 1), bends: cue('v04', 2), bed: cue('v04', 3),
  emily: cue('v05', 0), orders: cue('v05', 1), towers: cue('v05', 2), rose: cue('v05', 3),
  shore: cue('v06', 0), anch: cue('v06', 1), tons: cue('v06', 2), chains: cue('v06', 3),
  y77: cue('v07', 0), wheels: cue('v07', 1), across: cue('v07', 2), four: cue('v07', 3), strands: cue('v07', 4),
  susp: cue('v08', 0), stays: cue('v08', 1), deck: cue('v08', 2), hung: cue('v08', 3),
  open: cue('v09', 0), opened: cue('v09', 1), first: cue('v09', 2), crowd: cue('v09', 3),
  trains: cue('v10', 0), y44: cue('v10', 1), y21: cue('v10', 2), bike: cue('v10', 4),
  congrats: cue('v11', 0), card: cue('v11', 1),
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
Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 80 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 5, 16, 5); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .5, 14, 14); scene.add(top);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .22));

// ---------- materials ----------
const canvasTex = (w, h, draw, rep = [1, 1]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 4; return t; };
const stoneTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#c4bcad'; g.fillRect(0, 0, w, h); let r = 9; const R = () => (r = (r * 16807) % 2147483647) / 2147483647;
  for (let y = 0; y < h; y += 16) { for (let x = (y / 16 % 2) * 12; x < w; x += 24) { g.fillStyle = `rgba(${R() > .5 ? 255 : 60},${R() > .5 ? 250 : 55},240,${R() * .07})`; g.fillRect(x, y, 24, 16); } g.fillStyle = 'rgba(70,60,50,.35)'; g.fillRect(0, y, w, 1.5); for (let x = (y / 16 % 2) * 12; x < w; x += 24) g.fillRect(x, y, 1.2, 16); } }, [1, 1]);
const roadTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2e3034'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .05})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); } });
const woodTex = canvasTex(128, 32, (g, w, h) => { g.fillStyle = '#b4875a'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 4) { g.fillStyle = `rgba(40,25,10,${.15 + (y % 8 ? .1 : 0)})`; g.fillRect(0, y, w, 1); } }, [3, 1]);
const M = {
  base: new THREE.MeshPhysicalMaterial({ color: '#2b2e33', roughness: .5, metalness: .3, clearcoat: .2 }),
  land: new THREE.MeshPhysicalMaterial({ color: '#cfc8ba', roughness: .85 }),
  landTop: new THREE.MeshPhysicalMaterial({ color: '#8f9a7c', roughness: .9 }),
  model: new THREE.MeshPhysicalMaterial({ color: '#f1efe9', roughness: .6 }),
  sed: new THREE.MeshPhysicalMaterial({ color: '#5a4632', roughness: .9, transparent: true, opacity: .6, depthWrite: false }),
  water: new THREE.MeshPhysicalMaterial({ color: '#4f8fc0', roughness: .08, transparent: true, opacity: .3, depthWrite: false }),
  waterTop: new THREE.MeshPhysicalMaterial({ color: '#3f78a6', roughness: .65, metalness: 0, transparent: true, opacity: .45, depthWrite: false, clearcoat: .2 }),
  stone: new THREE.MeshPhysicalMaterial({ map: stoneTex, color: '#e6dfd2', roughness: .85 }),
  stoneDark: new THREE.MeshPhysicalMaterial({ color: '#a39a8a', roughness: .9 }),
  wood: new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: .8 }),
  steel: new THREE.MeshStandardMaterial({ color: '#4a5056', roughness: .45, metalness: .7 }),
  cable: new THREE.MeshStandardMaterial({ color: '#d9d6cf', roughness: .35, metalness: .6 }),
  wire: new THREE.MeshStandardMaterial({ color: '#ff8a3d', roughness: .3, metalness: .4, emissive: '#ff6b1a', emissiveIntensity: .6 }),
  hanger: new THREE.MeshStandardMaterial({ color: '#cfd2d6', roughness: .35, metalness: .7 }),
  road: new THREE.MeshPhysicalMaterial({ map: roadTex, roughness: .8 }),
  plank: new THREE.MeshPhysicalMaterial({ color: '#b0855a', roughness: .75 }),
  paint: new THREE.MeshStandardMaterial({ color: '#e9e4d6', roughness: .6 }),
  bike: new THREE.MeshPhysicalMaterial({ color: '#3fae6a', roughness: .5, emissive: '#3fae6a', emissiveIntensity: .25 }),
  lamp: new THREE.MeshPhysicalMaterial({ color: '#ffb35a', emissive: '#ff9a3d', emissiveIntensity: 3 }),
  red: new THREE.MeshPhysicalMaterial({ color: '#e8402e', emissive: '#e8402e', emissiveIntensity: 1.2 }),
  car: new THREE.MeshPhysicalMaterial({ color: '#b5502f', roughness: .5, clearcoat: .4 }),
  window: new THREE.MeshPhysicalMaterial({ color: '#2a3a48', roughness: .1, metalness: .2, emissive: '#ffd9a0', emissiveIntensity: .3, clearcoat: 1 }),
  orange: new THREE.MeshPhysicalMaterial({ color: '#ff6b1a', roughness: .5, emissive: '#ff6b1a', emissiveIntensity: .5 }),
};
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };
const boxG = (sx, sy, sz, x, y, z) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);
const merged = (geos, mat) => { const ni = geos.some(g => !g.index); return sh(new THREE.Mesh(mergeGeometries(ni ? geos.map(g => g.index ? g.toNonIndexed() : g) : geos), mat)); };
// a thin rod between two points (non-indexed so merged rods can be revealed one by one with drawRange)
const rodG = (a, b, r) => { const d = new THREE.Vector3().subVectors(b, a), L = d.length(); const g = new THREE.CylinderGeometry(r, r, L, 5, 1, true).toNonIndexed(); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); return g; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- dimensions ----------
const SHORE = 3.9, TX = 2.5, AX = 4.85, LAND_Y = .12;
const DECK = 1.0, TOPY = 2.62, SADDLE = TOPY - .02, SAG = DECK + .14;
const TW = .75;                                   // tower half-width (z)
const CZ = [-.63, -.15, .15, .63];                // the four cables
const BED = -.5, BOT = -1.5;
const CB = { 1: -1.02, [-1]: -1.42 };             // caisson cutting-edge depth: Brooklyn (+x) 44 ft, Manhattan (−x) 78 ft
const CH = .3;                                    // caisson height
// main cable path (one cable plane), anchorage → tower → mid-span → tower → anchorage
const cableY = x => { const ax = Math.abs(x); if (ax <= TX) return SAG + (SADDLE - SAG) * (x / TX) ** 2; const u = (ax - TX) / (AX - TX); return lerp(SADDLE, DECK + .14, u) - .16 * 4 * u * (1 - u); };

// ---------- base: East River cutaway + both shores (always assembled) ----------
const base = new THREE.Group(); scene.add(base);
base.add(box(13.6, .1, 3.6, M.base, 0, BOT - .05, 0));
for (const s of [-1, 1]) {
  const L0 = SHORE, L1 = 6.7, cx = s * (L0 + L1) / 2, w = L1 - L0;
  base.add(box(w, LAND_Y - BOT - .03, 3.4, M.land, cx, (LAND_Y - .03 + BOT) / 2, 0), box(w, .03, 3.4, M.landTop, cx, LAND_Y - .015, 0));
}
{ const sed = new THREE.Mesh(new THREE.BoxGeometry(2 * SHORE, BED - BOT, 3.4), M.sed); sed.position.y = (BED + BOT) / 2; sed.renderOrder = 2; base.add(sed);
  const wat = new THREE.Mesh(new THREE.BoxGeometry(2 * SHORE, -BED, 3.4), M.water); wat.position.y = BED / 2; wat.renderOrder = 3; base.add(wat);
  const wt = new THREE.Mesh(new THREE.PlaneGeometry(2 * SHORE, 3.4), M.waterTop); wt.rotation.x = -Math.PI / 2; wt.position.y = -.002; wt.renderOrder = 4; base.add(wt);
  for (const sx of [-1, 1]) base.add(box(.02, -BOT, 3.4, new THREE.MeshPhysicalMaterial({ color: '#3a2e22', roughness: .9 }), sx * (SHORE - .011), BOT / 2, 0));
  // bedrock line under the sediment
  base.add(box(2 * SHORE, .12, 3.4, M.stoneDark, 0, BOT + .06, 0)); }
{ // city blocks on both shores, kept away from the bridge approach
  let r = 777; const R = () => (r = (r * 16807) % 2147483647) / 2147483647; const geos = [];
  for (const s of [-1, 1]) for (const zs of [-1, 1]) if (!(s > 0 && zs > 0)) for (let x = SHORE + .25; x < 6.5;) { const w = .3 + R() * .4, h = .12 + Math.pow(R(), 1.5) * (s < 0 ? .9 : .45), d = .5 + R() * .4; geos.push(boxG(w - .05, h, d, s * (x + w / 2), LAND_Y + h / 2, zs * (1.05 + d / 2 + R() * .2))); x += w; }
  base.add(merged(geos, M.model));
}
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: '#000', opacity: .35 })); floor.rotation.x = -Math.PI / 2; floor.position.y = BOT - .1; floor.receiveShadow = true; scene.add(floor);

// ---------- layers (each assembles into place; `off` = height in the exploded stack) ----------
const L = {};
const layer = (name, off) => { const g = new THREE.Group(); scene.add(g); L[name] = { g, off }; return g; };

// 01 caissons: open-bottomed timber boxes; workers dig inside by lamplight in compressed air
const caissons = {}, diggers = [];
{
  const g = layer('caissons', 2.0);
  for (const s of [1, -1]) {
    const c = new THREE.Group(); g.add(c); caissons[s] = c;
    const cx = .95, cz = 1.7, wt = .07;
    c.add(box(cx, .13, cz, M.wood, 0, CH - .065, 0));                                        // thick timber roof
    for (const d of [-1, 1]) { if (d < 0) c.add(box(cx, CH - .13, wt, M.wood, 0, (CH - .13) / 2, d * (cz / 2 - wt / 2))); c.add(box(wt, CH - .13, cz, M.wood, d * (cx / 2 - wt / 2), (CH - .13) / 2, 0)); }
    for (let i = 0; i < 3; i++) { const l = box(.03, .03, .03, M.lamp, -.25 + i * .25, CH - .16, 0); l.castShadow = false; c.add(l); }
    for (let i = 0; i < 6; i++) { const p = new THREE.Group(); const b = sh(new THREE.Mesh(new THREE.CapsuleGeometry(.022, .06, 4, 8), M.model)); b.position.y = .055; const hd = sh(new THREE.Mesh(new THREE.SphereGeometry(.018, 10, 8), M.model)); hd.position.y = .12; p.add(b, hd); p.position.set(-.3 + (i % 3) * .3, .0, i < 3 ? -.35 : .35); c.add(p); diggers.push({ p, s, i, hd }); }
    // supply shafts up through the roof (air lock)
    for (const z of [-.4, .4]) c.add(box(.08, .5, .08, M.steel, .25, CH + .25, z));
  }
}
// 02 towers: substructure from the caisson roof to the waterline, then the granite towers with two pointed arches
const towerMeshes = [];
{
  const g = layer('towers', 3.2);
  const sp = DECK + .62, at = DECK + .98, hw = .17;
  const s = new THREE.Shape(); s.moveTo(-TW, 0); s.lineTo(TW, 0); s.lineTo(TW, TOPY); s.lineTo(-TW, TOPY); s.closePath();
  for (const c of [-.375, .375]) { const h = new THREE.Path(); h.moveTo(c - hw, DECK - .08); h.lineTo(c + hw, DECK - .08); h.lineTo(c + hw, sp); h.quadraticCurveTo(c + hw, at - .12, c, at); h.quadraticCurveTo(c - hw, at - .12, c - hw, sp); h.closePath(); s.holes.push(h); }
  const tg = new THREE.ExtrudeGeometry(s, { depth: .46, bevelEnabled: false, curveSegments: 10 }); tg.rotateY(Math.PI / 2);
  const uv = tg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.6, uv.getY(i) * 1.6);
  for (const sx of [1, -1]) {
    const x = sx * TX, ctop = CB[sx] + CH;
    const t = sh(new THREE.Mesh(tg, M.stone)); t.position.set(x - .23, 0, 0); g.add(t); towerMeshes.push(t);
    g.add(box(.62, -ctop + .04, 1.66, M.stone, x, ctop / 2 + .02, 0));                       // masonry under the water
    g.add(box(.56, .07, 1.62, M.stone, x, TOPY + .035, 0), box(.52, .05, 1.58, M.stoneDark, x, TOPY - .18, 0));   // cornice + string course
    for (const z of CZ) g.add(box(.16, .06, .1, M.steel, x, TOPY + .1, z));                  // cable saddles
  }
}
// 03 anchorages: sloped stone blocks behind each shore; eyebar chains run down inside to the anchor plates
{
  const g = layer('anchorages', 2.2);
  const s = new THREE.Shape(); s.moveTo(0, LAND_Y); s.lineTo(1.3, LAND_Y); s.lineTo(1.3, DECK + .02); s.lineTo(.12, DECK + .3); s.lineTo(0, DECK + .3); s.closePath();
  for (const sx of [1, -1]) {
    const ge = new THREE.ExtrudeGeometry(s, { depth: 1.7, bevelEnabled: false }); ge.translate(0, 0, -.85); if (sx < 0) ge.scale(-1, 1, 1);
    const uv = ge.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.6, uv.getY(i) * 1.6);
    const m = sh(new THREE.Mesh(ge, M.stone)); m.position.x = sx * (AX - .05); g.add(m);
    if (sx < 0) m.geometry.computeVertexNormals();
    g.add(box(.08, .04, 1.72, M.stoneDark, sx * (AX + .01), DECK + .32, 0));
  }
}
// 04 main cables: one tube per cable, revealed along its length as the wire is spun
const cablePts = []; for (let i = 0; i <= 160; i++) { const x = -AX + 2 * AX * i / 160; cablePts.push(V(x, cableY(x), 0)); }
const cablePath = new THREE.CatmullRomCurve3(cablePts);
const cables = [];
{
  const g = layer('cables', 0);
  for (const z of CZ) { const ge = new THREE.TubeGeometry(cablePath, 320, .019, 8, false); const m = sh(new THREE.Mesh(ge, M.cable)); m.position.z = z; g.add(m); cables.push(m); }
}
const TUBE_IDX = cables[0].geometry.index.count;
// the spinning wheel + its running wire
const wheel = new THREE.Group(); scene.add(wheel);
{ const w = sh(new THREE.Mesh(new THREE.TorusGeometry(.07, .012, 8, 24), M.steel)); const hub = box(.02, .02, .02, M.orange); for (let i = 0; i < 3; i++) { const sp = box(.004, .13, .004, M.steel); sp.rotation.z = i * Math.PI / 3; wheel.add(sp); } wheel.add(w, hub); }
const runWire = sh(new THREE.Mesh(new THREE.TubeGeometry(cablePath, 320, .008, 5, false), M.wire)); scene.add(runWire);
// 05 suspenders (vertical, cable → deck) and 06 diagonal stays (tower → deck)
const hangerRods = [], stayRods = [];
for (const z of CZ) for (let x = -AX + .2; x < AX - .1; x += .16) { if (Math.abs(Math.abs(x) - TX) < .3) continue; const y = cableY(x); hangerRods.push({ k: Math.abs(Math.abs(x) - TX), g: rodG(V(x, DECK + .1, z), V(x, y, z), .005) }); }
for (const sx of [-1, 1]) for (const z of CZ) for (const dir of [-1, 1]) for (let i = 1; i <= 9; i++) { const xd = sx * TX + dir * (.3 + i * .16); if (Math.abs(xd) > AX - .2) continue; stayRods.push({ k: i, g: rodG(V(xd, DECK + .1, z), V(sx * TX + dir * .2, SADDLE - .06 - i * .05, z), .005) }); }
hangerRods.sort((a, b) => a.k - b.k); stayRods.sort((a, b) => a.k - b.k);
const hangers = merged(hangerRods.map(h => h.g), M.hanger); scene.add(hangers);
const stays = merged(stayRods.map(h => h.g), M.hanger); scene.add(stays);
const HN = hangers.geometry.attributes.position.count, SN = stays.geometry.attributes.position.count;
// 07 deck: stiffening trusses, two roadways, two railway tracks, raised promenade in the middle
const RZ = [-.47, .47], TRZ = [-.27, .27];
{
  const g = layer('deck', 3.2), len = 2 * AX - .1, geos = [], tr = [], pr = [], ln = [];
  for (const z of [-.62, -.37, -.17, .17, .37, .62]) { tr.push(boxG(len, .018, .018, 0, DECK + .1, z), boxG(len, .022, .022, 0, DECK - .07, z)); for (let x = -AX + .1; x < AX; x += .16) tr.push(boxG(.01, .17, .01, x, DECK + .015, z)); }
  for (let x = -AX + .1; x < AX; x += .32) tr.push(boxG(.015, .015, 1.26, x, DECK - .07, 0));
  for (const z of RZ) geos.push(boxG(len, .025, .26, 0, DECK - .045, z));
  for (const z of TRZ) { pr.push(boxG(len, .02, .17, 0, DECK - .05, z)); for (const dz of [-.035, .035]) tr.push(boxG(len, .012, .01, 0, DECK - .033, z + dz)); }
  pr.push(boxG(len, .015, .28, 0, DECK + .11, 0)); for (const z of [-.14, .14]) tr.push(boxG(len, .03, .006, 0, DECK + .13, z));
  for (const z of RZ) for (let x = -AX + .2; x < AX; x += .3) ln.push(boxG(.14, .004, .012, x, DECK - .03, z));
  g.add(merged(geos, M.road), merged(tr, M.steel), merged(pr, M.plank), merged(ln, M.paint));
}

// ---------- traffic: opening-day crowd, trains (1883–1944), cars + bikes today ----------
const VM = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: .55, clearcoat: .2 });
const person = (c, s = 1) => { const p = new THREE.Group(); const b = sh(new THREE.Mesh(new THREE.CapsuleGeometry(.018 * s, .05 * s, 4, 8), VM(c))); b.position.y = .045 * s; const hd = sh(new THREE.Mesh(new THREE.SphereGeometry(.014 * s, 10, 8), VM('#8a6a52'))); hd.position.y = .1 * s; p.add(b, hd); return p; };
const crowd = [];
{ const C = ['#2b2b30', '#3a4a6a', '#5a4a3a', '#1d1f24', '#6a2e2e', '#4a5a4a', '#e0d6c4', '#2f3a55'];
  for (let i = 0; i < 110; i++) { const p = person(C[i % C.length]); scene.add(p); const lane = i % 5; const z = [0, -.06, .06, -.47, .47][lane] + ((i * .37) % .1 - .05) * (lane > 2 ? 1.6 : .4); const y = lane < 3 ? DECK + .118 : DECK - .032; crowd.push({ p, z, y, x0: AX + .25 + (i * 1.618 % 1) * .6 + Math.floor(i / 5) * .12, v: .62 + (i % 7) * .03 }); } }
const emily = person('#ff6b3d', 1.15); scene.add(emily);
const carriage = new THREE.Group(); scene.add(carriage);
{ carriage.add(box(.16, .07, .09, VM('#1d1f24'), 0, .08, 0), box(.1, .05, .1, VM('#1d1f24'), -.02, .14, 0)); for (const dx of [-.05, .05]) for (const dz of [-.05, .05]) { const w = sh(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .01, 12), M.steel)); w.rotation.x = Math.PI / 2; w.position.set(dx, .03, dz); carriage.add(w); }
  const horse = box(.12, .05, .035, VM('#5a3a24'), -.16, .085, 0); carriage.add(horse, box(.035, .05, .03, VM('#5a3a24'), -.23, .115, 0)); }
const fireworks = [];
{ const P = ['#ff6b3d', '#f2c230', '#ffffff', '#59d4ff', '#e8402e'];
  for (let k = 0; k < 7; k++) { const n = 60, pos = new Float32Array(n * 3), dirs = []; for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = Math.sqrt(1 - u * u); dirs.push(V(r * Math.cos(a), u, r * Math.sin(a))); }
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const c = new THREE.Color(P[k % P.length]).multiplyScalar(3);
    const mt = new THREE.PointsMaterial({ color: c, size: .07, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); const pts = new THREE.Points(ge, mt); scene.add(pts);
    fireworks.push({ pts, dirs, c: V((k % 3 - 1) * 1.3 + (k % 2) * .4, TOPY - .3 + (k % 3) * .25, -.6 - (k % 2) * .5), t0: k * .55 }); } }
const trainCars = [];
for (const [zi, z] of TRZ.entries()) for (let i = 0; i < 4; i++) { const c = new THREE.Group(); c.add(box(.3, .085, .08, M.car, 0, .05, 0)); for (const dx of [-.1, 0, .1]) c.add(box(.05, .03, .082, M.window, dx, .065, 0)); c.add(box(.31, .012, .085, VM('#2b2b30'), 0, .097, 0)); scene.add(c); trainCars.push({ c, z, dir: zi ? 1 : -1, off: i * .33 }); }
const traffic = [];
{ const C = ['#e8402e', '#f2c230', '#2f6fe0', '#f1efe9', '#1d1f24', '#3fae6a', '#9aa0a8'];
  for (let i = 0; i < 16; i++) { const z = RZ[i % 2] + (i % 4 < 2 ? -.06 : .06), c = box(.13, .05, .07, VM(C[i % C.length]), 0, 0, 0); c.position.y = DECK - .006; scene.add(c); traffic.push({ c, z, dir: z < 0 ? 1 : -1, ph: i * .137, v: .07 }); } }
const BZ = .565;                                   // the 2021 two-way bike lane: the inner lane of the Manhattan-bound roadway
const bikeLane = box(2 * AX - .1, .006, .085, M.bike, 0, DECK - .028, BZ); bikeLane.castShadow = false; scene.add(bikeLane);
const cyclists = [];
for (let i = 0; i < 8; i++) { const p = new THREE.Group(); p.add(box(.06, .012, .006, M.steel, 0, .02, 0)); const r = person(['#ff6b3d', '#f2c230', '#2f6fe0', '#f1efe9'][i % 4], .8); r.position.y = .02; p.add(r); scene.add(p); cyclists.push({ p, dir: i % 2 ? 1 : -1, ph: i * .19, z: BZ + (i % 2 ? .02 : -.02) }); }

// ---------- motion ----------
const pop = x => 1 - Math.pow(1 - ss(x), 3);
const explodeK = t => pop(seg(t, T.explode - .1, T.explode + 1.5));
const LAND = { caissons: T.caisson + .1, towers: T.towers - .1, anchorages: T.anch - .1, deck: T.deck };
const landK = (n, t) => eio(seg(t, LAND[n], LAND[n] + .85));
const layerY = (n, t) => L[n].off * explodeK(t) * (1 - landK(n, t)) + (1 - landK(n, t)) * explodeK(t) * .03 * Math.sin(t * 2 + L[n].off);
// caissons land on the riverbed, then sink as the men dig: Brooklyn to 44 ft, Manhattan to 78 ft
const sinkK = (s, t) => s > 0 ? eio(seg(t, T.sink, T.bk44 + .9)) : eio(seg(t, T.sink + .3, T.mh78 + 1.0));
const caissonY = (s, t) => lerp(BED, CB[s], sinkK(s, t));
const spinK = t => seg(t, T.wheels - .1, T.four - .2);              // the wheel runs anchorage → anchorage
const cableK = t => t < T.explode ? 1 - eo(seg(t, T.explode - .2, T.explode + .6)) : ss(seg(t, T.wheels, T.four + .1));
const hangK = t => t < T.explode ? 1 - eo(seg(t, T.explode - .2, T.explode + .6)) : eo(seg(t, T.susp - .1, T.stays + .2));
const stayK = t => t < T.explode ? 1 - eo(seg(t, T.explode - .2, T.explode + .6)) : eo(seg(t, T.stays - .1, T.deck));

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, 60, 22, 22, 0, 1.0, 0],
  [T.explode - .3, 57, 21, 22, 0, 1.0, 0],
  [T.explode + 1.6, 54, 16, 29, 0, 2.6, 0],
  [T.son + .6, 50, 15, 28, 0, 2.4, 0],
  [T.boxes + .4, -22, 12, 7.5, 2.5, -.55, 0],
  [T.bk44 + .5, -18, 10, 7, 2.5, -.75, 0],
  [T.mh78 + .9, 22, 10, 7.5, -2.5, -.95, 0],
  [T.bed + .6, 8, 12, 13.5, -.6, -.4, 0],
  [T.towers + 1.0, 50, 12, 15, .8, 1.3, 0],
  [T.anch + .2, 62, 14, 12, 2.6, 1.0, 0],
  [T.chains + .6, 66, 18, 11, 3.6, .9, 0],
  [T.wheels + .6, 58, 16, 15, 1.2, 1.4, 0],
  [T.four + .4, 64, 14, 16.5, 0, 1.6, 0],
  [T.strands + 1.0, 70, 10, 8, 3.2, 2.2, 0],
  [T.stays + .6, 58, 14, 13, 1.4, 1.6, 0],
  [T.hung + 1.0, 62, 16, 16, 0, 1.4, 0],
  [T.opened + .3, 50, 14, 15, .6, 1.8, 0],
  [T.first + .6, 4, 40, 4.6, 3.8, DECK, 0],
  [T.crowd + 1.4, 2, 42, 5.2, 3.2, DECK, 0],
  [T.trains + .4, 30, 42, 8.5, .6, DECK, 0],
  [T.y44 + .8, 22, 45, 6.5, .2, DECK, 0],
  [T.bike + 1.0, 20, 42, 5, 0, DECK, .2],
  [T.congrats + .4, 64, 16, 16.5, 0, 1.2, 0],
  [DUR, 58, 15, 18, 0, 1.2, 0],
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
const EV = [{ t: T.explode, type: 'lift' }, { t: T.explode + .05, type: 'card' }, { t: T.designer, type: 'label' }, { t: T.son, type: 'label' }];
for (const n of Object.keys(LAND)) EV.push({ t: +(LAND[n] + .85).toFixed(2), type: 'land' });
EV.push({ t: T.sink, type: 'sink' }, { t: T.air, type: 'hiss' }, { t: T.bk44 + .7, type: 'land' }, { t: T.mh78 + .8, type: 'land' }, { t: T.bends, type: 'buzz' }, { t: T.bed, type: 'label' },
  { t: T.emily, type: 'label' }, { t: T.tons, type: 'label' }, { t: T.y77, type: 'card' }, { t: T.wheels, type: 'spin' }, { t: T.four, type: 'pins' }, { t: T.strands, type: 'label' },
  { t: T.susp, type: 'pins' }, { t: T.stays, type: 'pins' }, { t: T.open, type: 'card' }, { t: T.opened, type: 'fireworks' }, { t: T.first, type: 'label' }, { t: T.crowd, type: 'crowd' },
  { t: T.trains - .2, type: 'train' }, { t: T.y21, type: 'card' }, { t: T.bike, type: 'chime' }, { t: T.card, type: 'card' });
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
const pre = t => t < T.explode + .2;
window.render = t => {
  for (const n of Object.keys(L)) L[n].g.position.y = L[n].off ? layerY(n, t) : 0;
  // caissons: in the stack they float; once landed they sit on the riverbed and sink; the towers ride on top
  for (const s of [1, -1]) { const c = caissons[s]; c.position.set(s * TX, (pre(t) ? CB[s] : caissonY(s, t)), 0); }
  const air = seg(t, T.dug - .3, T.dug + .2) * (1 - seg(t, T.bed + .5, T.bed + 1.2));
  diggers.forEach(d => { d.p.visible = air > .01; d.p.rotation.z = Math.sin(t * 7 + d.i) * .25 * air; d.hd.material = (t > T.bends && t < T.bed + 1.2 && d.i % 3 === 1) ? M.red : M.model; });
  // cable spinning: the wheel runs out with the glowing working wire; the four cables thicken behind it
  const sk = spinK(t), wOn = t > T.wheels - .2 && t < T.four + .3;
  wheel.visible = wOn; runWire.visible = wOn || (t > T.four && t < T.four + .6);
  if (wOn) { const u = clamp(sk), p = cablePath.getPoint(u); wheel.position.set(p.x, p.y + .07, CZ[3] + .1); wheel.rotation.z = -t * 9; runWire.position.z = CZ[3] + .1; runWire.geometry.setDrawRange(0, Math.floor(TUBE_IDX * u / 6) * 6); }
  const ck = cableK(t); cables.forEach((m, i) => { const k = clamp(ck * 1.3 - i * .1); m.visible = k > .001; m.geometry.setDrawRange(0, Math.floor(TUBE_IDX * k / 6) * 6); });
  M.cable.emissive.setRGB(...(t > T.four && t < T.strands + 1 ? [.25, .12, .04] : [0, 0, 0]).map(v => v * (.5 + .5 * Math.sin(t * 6))));
  const hk = hangK(t), stk = stayK(t);
  hangers.visible = hk > .001; hangers.geometry.setDrawRange(0, Math.floor(HN * hk / 3) * 3);
  stays.visible = stk > .001; stays.geometry.setDrawRange(0, Math.floor(SN * stk / 3) * 3);
  // opening day: Emily Roebling's carriage leads, the crowd follows from Brooklyn toward Manhattan; fireworks over the towers
  const crowdT = t - T.first + .4, onDay = t > T.open && t < T.trains + .3, fade = 1 - seg(t, T.trains - .3, T.trains + .3);
  const ex = AX + .3 - Math.max(0, crowdT) * .55; carriage.visible = emily.visible = onDay && ex < AX + .2;
  carriage.position.set(ex - .12, DECK - .03, -.47); carriage.rotation.y = Math.PI; emily.position.set(ex, DECK - .03, -.47 + .1);
  crowd.forEach(c => { const x = c.x0 - Math.max(0, t - T.first - .3) * c.v; c.p.visible = onDay && x < AX + .1 && x > -AX && fade > .5; c.p.position.set(x, c.y + Math.abs(Math.sin(t * 9 + c.x0 * 5)) * .006, c.z); });
  fireworks.forEach(f => { const u = (t - T.opened - f.t0) / 1.6; f.pts.visible = u > 0 && u < 1; if (!f.pts.visible) return; const p = f.pts.geometry.attributes.position; const r = eo(u) * .55; f.dirs.forEach((d, i) => p.setXYZ(i, f.c.x + d.x * r, f.c.y + d.y * r - u * u * .3, f.c.z + d.z * r)); p.needsUpdate = true; f.pts.material.opacity = 1 - u * u; });
  // trains shuttle across until 1944, then fade; car traffic runs from then on; the bike lane paints in for 2021
  const trOn = t > T.trains - .4 && t < T.y21 + .2, trA = seg(t, T.trains - .4, T.trains) * (1 - seg(t, T.y44 + .9, T.y21));
  trainCars.forEach(tc => { const u = ((t - T.trains) * .9 * tc.dir + tc.off + 10) % 1, x = (tc.dir > 0 ? u : 1 - u) * (2 * AX - .4) - AX + .2; tc.c.visible = trOn && trA > .05; tc.c.position.set(x, DECK - .04, tc.z); tc.c.scale.setScalar(Math.max(trA, .01)); });
  const trafK = t > T.y44 + .6;
  traffic.forEach(c => { const u = ((t * c.v * c.dir + c.ph) % 1 + 1) % 1, x = u * (2 * AX - .4) - AX + .2; c.c.visible = (trafK || t < T.explode - .3) && !(t > T.y21 && Math.abs(c.z - BZ) < .05); c.c.position.x = x; c.c.position.z = c.z; });
  const bk = eo(seg(t, T.y21 + .2, T.bike + .3)); bikeLane.visible = bk > .01; bikeLane.scale.x = Math.max(bk, .01); bikeLane.position.x = -AX + .05 + (AX - .05) * bk;
  cyclists.forEach(c => { const u = ((t * .12 * c.dir + c.ph) % 1 + 1) % 1, x = u * (2 * AX - .4) - AX + .2; c.p.visible = bk > .9; c.p.position.set(x, DECK - .025, c.z); c.p.rotation.y = c.dir > 0 ? 0 : Math.PI; });
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, DECK, TX, AX, TOPY, CZ, CB, BED, layerY, caissonY, cableY, sinkK, pre });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
