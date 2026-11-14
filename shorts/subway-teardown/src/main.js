// How NYC's Subway Became One — Exploded Teardown, 1080×1920. A physical map model; each rival system is its own acrylic plate.
// Units: model units (schematic map, not to scale). X east, Y up, Z south.
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
// caption chunks → cue times (same split as the overlay)
const CUES = []; for (let li = 0; li < TL.vo.length; li++) { const v = TL.vo[li], d = VDUR[v.id]; const n = v.chunks.map(c => c.replace(/[^A-Za-z0-9]/g, '').length + 2), tot = n.reduce((a, b) => a + b, 0); let t = v.t; v.chunks.forEach((c, i) => { CUES.push({ id: v.id, i, t }); t += d * n[i] / tot; }); }
const cue = (id, i) => CUES.find(c => c.id === id && c.i === i).t;
const T = {
  split: cue('v01', 2), irt: cue('v02', 0), bmt: cue('v03', 0), ind: cue('v04', 0), fares: cue('v05', 0), dup: cue('v05', 1), noConn: cue('v05', 2), nickel: cue('v05', 3),
  unify: cue('v06', 0) + .3, one: cue('v06', 2), transfers: cue('v07', 0), mta: cue('v07', 1), ibx: cue('v08', 0), ibxPlate: cue('v08', 1), stations: cue('v09', 0), review: cue('v10', 0), congrats: cue('v11', 0), card: cue('v11', 2),
};

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
Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 60 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 5, 16, 5); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .5, 14, 14); scene.add(top);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .22));

const COL = { irt: '#e8402e', bmt: '#f2b81f', ind: '#2f6fe0', ibx: '#a24ae0' };
const M = {
  tile: new THREE.MeshPhysicalMaterial({ color: '#2b2e33', roughness: .5, metalness: .3, clearcoat: .2 }),
  water: new THREE.MeshPhysicalMaterial({ color: '#1d3a55', roughness: .12, metalness: .1, clearcoat: 1, clearcoatRoughness: .08 }),
  land: new THREE.MeshPhysicalMaterial({ color: '#d9d4c6', roughness: .75 }),
  region: new THREE.MeshPhysicalMaterial({ color: '#8f9a86', roughness: .8 }),
  model: new THREE.MeshPhysicalMaterial({ color: '#f1efe9', roughness: .6 }),
  acrylic: new THREE.MeshPhysicalMaterial({ color: '#dfe8f0', roughness: .05, metalness: 0, transparent: true, opacity: .16, clearcoat: 1, depthWrite: false }),
  edge: new THREE.MeshStandardMaterial({ color: '#cfe0ee', roughness: .2, metalness: .3, transparent: true, opacity: .55 }),
  coin: new THREE.MeshStandardMaterial({ color: '#c9ccd1', roughness: .25, metalness: 1 }),
  pin: new THREE.MeshPhysicalMaterial({ color: '#f1efe9', roughness: .3, clearcoat: .6 }),
  steel: new THREE.MeshStandardMaterial({ color: '#c3c7cc', roughness: .2, metalness: 1 }),
};
for (const k of Object.keys(COL)) M[k] = new THREE.MeshPhysicalMaterial({ color: COL[k], roughness: .35, clearcoat: .6, emissive: COL[k], emissiveIntensity: .25 });
M.ibx.transparent = true; M.ibx.opacity = .85;
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)); m.position.set(x, y, z); return m; };

// ---------- the map model ----------
const CX = 1.1, CZ = -.4, TW = 5.0, TD = 7.2;     // tile centre and size
const model = new THREE.Group(); scene.add(model);
model.add(box(TW + .3, .16, TD + .3, M.tile, CX, .08, CZ));
model.add(box(TW, .02, TD, M.water, CX, .17, CZ));
const ext = (pts, depth, mat, y) => { const s = new THREE.Shape(); s.moveTo(pts[0][0], -pts[0][1]); for (const p of pts.slice(1)) s.lineTo(p[0], -p[1]); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: .008, bevelSize: .008, bevelSegments: 2 }); g.rotateX(-Math.PI / 2); const m = sh(new THREE.Mesh(g, mat)); m.position.y = y; return m; };
const clip = pts => pts.map(([x, z]) => [clamp(x, CX - TW / 2, CX + TW / 2), clamp(z, CZ - TD / 2, CZ + TD / 2)]);
const BORO = {
  Manhattan: [[-.15, -2.3], [.15, -2.25], [.35, -1.2], [.45, -.2], [.3, .9], [.05, 1.2], [-.15, .95], [-.2, -.2], [-.3, -1.3]],
  Bronx: [[-.1, -2.6], [.3, -3.3], [1.5, -3.4], [2.1, -2.7], [1.2, -2.15], [.4, -2.3]],
  Queens: [[.75, -1.95], [2.75, -2.05], [3.2, -.6], [2.95, .55], [1.65, .65], [1.0, .28], [.68, -.6]],
  Brooklyn: [[.48, .62], [1.0, .38], [1.65, .78], [2.95, .66], [2.7, 1.95], [1.45, 2.55], [.5, 2.35], [.22, 1.6]],
};
const REGION = {
  mainland: [[-12, -14], [-.55, -14], [-.5, -3.6], [-.45, -2.6], [-.55, -1.3], [-.6, .2], [-.55, 1.4], [-.9, 2.2], [-1.5, 2.6], [-12, 3.0]],
  north: [[-.4, -14], [14, -14], [14, -3.6], [2.4, -3.0], [1.6, -3.55], [.4, -3.5], [-.35, -3.0]],
  longIsland: [[3.05, -1.4], [14, -2.6], [14, 1.9], [3.0, 1.75], [3.3, .3], [3.4, -.6]],
  staten: [[-1.2, 2.75], [-.35, 2.55], [-.15, 3.2], [-.55, 3.85], [-1.35, 3.6]],
};
const MAPY = .18;
for (const p of Object.values(REGION)) model.add(ext(clip(p), .03, M.region, MAPY));
for (const p of Object.values(BORO)) model.add(ext(p, .05, M.land, MAPY));
// white architectural-model blocks
{
  const inside = (pts, x, z) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
  const H0 = { Manhattan: [.06, .42], Bronx: [.03, .1], Queens: [.025, .09], Brooklyn: [.025, .1] };
  let r = 4242; const R = () => (r = (r * 16807) % 2147483647) / 2147483647; const geos = [];
  for (const [k, pts] of Object.entries(BORO)) {
    const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]), step = k === 'Manhattan' ? .1 : .15;
    for (let x = Math.min(...xs); x < Math.max(...xs); x += step) for (let z = Math.min(...zs); z < Math.max(...zs); z += step) {
      const jx = x + (R() - .5) * .04, jz = z + (R() - .5) * .04; if (!inside(pts, jx, jz) || R() < .4) continue;
      const [h0, h1] = H0[k]; const hgt = h0 + (h1 - h0) * Math.pow(R(), 1.8) * (k === 'Manhattan' ? (1.1 - Math.abs(jz + .4) / 2.2) : 1);
      const sz = step * (.45 + R() * .3); const g = new THREE.BoxGeometry(sz, Math.max(hgt, .02), sz); g.translate(jx, MAPY + .05 + Math.max(hgt, .02) / 2, jz); geos.push(g);
    }
  }
  model.add(sh(new THREE.Mesh(mergeGeometries(geos), M.model)));
}
// ---------- network plates ----------
const LINES = {
  irt: [[[.05, 1.0], [.15, .2], [.2, -.8], [.1, -1.8], [.2, -2.4], [.6, -2.95]], [[.05, 1.0], [.5, 1.1], [.95, 1.4], [1.45, 1.65]]],
  bmt: [[[.1, .7], [.6, .9], [1.3, 1.3], [1.85, 2.15]], [[.25, -.1], [.9, -.42], [1.6, -.9], [2.25, -1.25]], [[.6, .92], [1.9, 1.02], [2.45, .72]]],
  ind: [[[-.02, 1.05], [-.06, .2], [-.02, -.9], [.03, -2.0]], [[.18, -.42], [1.0, -.82], [2.0, -.52], [2.75, -.42]], [[.3, .97], [.8, 1.55], [1.12, 2.25]]],
  ibx: [[[.62, 2.05], [1.2, 1.62], [1.68, 1.12], [1.92, .6], [1.82, .02], [1.52, -.6], [1.3, -1.12]]],
};
const PL = {};
for (const [k, paths] of Object.entries(LINES)) {
  const g = new THREE.Group(); scene.add(g);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(TW, .025, TD), M.acrylic.clone()); plate.position.set(CX, 0, CZ); g.add(plate);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(TW, .025, TD)), new THREE.LineBasicMaterial({ color: k === 'ibx' ? COL.ibx : '#e6eef5', transparent: true, opacity: .9 })); edges.position.set(CX, 0, CZ); g.add(edges);
  const curves = paths.map(p => new THREE.CatmullRomCurve3(p.map(([x, z]) => new THREE.Vector3(x, .03, z)), false, 'catmullrom', .2));
  const tubes = curves.map(c => { const m = sh(new THREE.Mesh(new THREE.TubeGeometry(c, 80, .035, 8), M[k])); g.add(m); return m; });
  const trains = curves.map(() => { const tr = new THREE.Group(); for (let i = 0; i < 3; i++) tr.add(sh(new THREE.Mesh(new THREE.BoxGeometry(.11, .06, .06), M.steel)).translateX(-i * .12)); tr.children.forEach(c => c.position.y = .07); g.add(tr); return tr; });
  PL[k] = { g, plate, edges, curves, tubes, trains };
}
const ibxStations = PL.ibx.curves[0] && [...Array(18)].map((_, i) => { const p = PL.ibx.curves[0].getPointAt(i / 17); const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .08, 16), M.pin)); m.position.set(p.x, .07, p.z); PL.ibx.g.add(m); return m; });
// problem props: nickel coins (machined) and transfer pins
const coins = [[.35, -1.4], [1.95, 1.75], [2.4, -.9]].map(([x, z]) => { const c = sh(new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .03, 48), M.coin)); c.position.set(x, 0, z); scene.add(c); return c; });
const pins = [[.06, 1.0], [.12, .72], [.22, -.2], [.62, .92], [.3, .97]].map(([x, z]) => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .16, 16), M.pin)); m.position.set(x, 0, z); scene.add(m); return m; });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: '#000', opacity: .35 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

// ---------- motion ----------
const BASE = MAPY + .3;                                  // assembled plate height (just above the tallest towers)
const EXP = { irt: 1.25, bmt: 2.05, ind: 2.85 };          // exploded heights, chronological bottom → top
const pop = x => 1 - Math.pow(1 - ss(x), 3);
// all three hang apart for the hero shot, then the story walks through them in order (IRT → BMT → IND)
const later = (k0, t) => t < T.irt - .3 ? 1 - seg(t, T.irt - .8, T.irt - .3) : pop(seg(t, T[k0] - .4, T[k0] + .6));
const reveal = { irt: t => 1, bmt: t => later('bmt', t), ind: t => later('ind', t) };
const splitK = t => pop(seg(t, T.split - .2, T.split + 1.4));
const unifyK = t => eio(seg(t, T.unify, T.unify + 1.6));
function plateY(k, t) {
  const sp = splitK(t), u = unifyK(t);
  const y = lerp(BASE + { irt: 0, bmt: .03, ind: .06 }[k], EXP[k], sp);
  return lerp(y, BASE + .02, u) + (1 - u) * sp * .02 * Math.sin(t * 2 + EXP[k]);
}
const ibxK = t => eo(seg(t, T.ibxPlate - .2, T.ibxPlate + 1.4));

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, -18, 34, 9.5, CX, .5, CZ],
  [T.split - .2, -10, 30, 10, CX, .8, CZ],
  [T.split + 1.6, -6, 18, 13, CX, 1.7, CZ],
  [T.irt + .6, -20, 30, 6.4, .5, 1.3, -.6],
  [T.bmt + .6, 14, 30, 6.6, 1.5, 2.1, .4],
  [T.ind + .5, -8, 22, 9.0, 1.2, 2.6, -.6],
  [T.dup, -32, 8, 8.4, .1, 2.0, -.5],
  [T.noConn + .6, -40, 22, 9.5, CX, 1.9, CZ],
  [T.nickel + .5, -14, 18, 12, CX, 1.8, CZ],
  [T.unify + .2, -8, 22, 12, CX, 1.4, CZ],
  [T.one + .5, -2, 40, 9.4, CX, .5, CZ],
  [T.mta + .6, 12, 42, 9.0, CX, .5, CZ],
  [T.ibxPlate, 20, 26, 8.8, 1.4, 1.2, .2],
  [T.stations + 1.2, 34, 30, 6.8, 1.5, 1.3, .3],
  [T.review + 1.0, 8, 30, 10, CX, 1.0, CZ],
  [T.congrats, -6, 26, 11.5, CX, 1.0, CZ],
  [DUR, -14, 28, 11, CX, 1.0, CZ],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) {
  const [az, el, dist, tx, ty, tz] = camTrack(t); const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 240; post.dof.maxCoc = 10;
  const la = A - .9; key.position.set(tx + 14 * Math.sin(la), ty + 16, tz + 14 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 12 * Math.sin(A + Math.PI * .85), ty + 4, tz + 12 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz); top.position.set(tx, ty + 12, tz); top.lookAt(tx, ty, tz);
}

// ---------- events ----------
const EV = [{ t: T.split, type: 'lift' }, { t: T.irt, type: 'label' }, { t: T.bmt, type: 'label' }, { t: T.ind, type: 'label' }, { t: T.noConn, type: 'buzz' }, { t: T.nickel, type: 'coin' },
  { t: T.unify + 1.6, type: 'land' }, { t: T.transfers, type: 'pins' }, { t: T.mta, type: 'label' }, { t: T.ibxPlate, type: 'lift' }, { t: T.stations, type: 'pins' }, { t: T.review, type: 'label' }, { t: T.card, type: 'card' }];
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VO: null, VDUR, TL });
window.render = t => {
  const u = unifyK(t);
  for (const k of ['irt', 'bmt', 'ind']) {
    const P = PL[k], rv = reveal[k](t);
    P.g.position.y = plateY(k, t); P.g.visible = rv > .01;
    P.g.scale.setScalar(1); P.plate.material.opacity = .09 * rv * (k === 'irt' ? 1 : 1 - u); P.edges.material.opacity = .9 * rv * (k === 'irt' ? 1 : 1 - u);
    P.tubes.forEach(m => { m.visible = rv > .01; });
    // duplicate-route flash on the Manhattan trunks
    const flash = (k !== 'bmt' && t > T.dup && t < T.noConn) ? (Math.sin(t * 12) > 0 ? 1.4 : .25) : .25;
    M[k].emissiveIntensity = flash + (t > T.one && t < T.one + 1.2 ? 1.2 * (1 - (t - T.one) / 1.2) : 0);
    P.trains.forEach((tr, i) => { const on = rv > .99; tr.visible = on; if (!on) return; const c = P.curves[i], uu = ((t * .06 + i * .37 + (k === 'bmt' ? .2 : k === 'ind' ? .45 : 0)) % 1); const p = c.getPointAt(uu), q = c.getPointAt(Math.min(uu + .01, 1)); tr.position.copy(p); tr.rotation.y = Math.atan2(-(q.z - p.z), q.x - p.x); });
  }
  // IBX: a ghosted plate that lowers in above the unified network, stations appear one by one
  const ik = ibxK(t); PL.ibx.g.visible = ik > .01; PL.ibx.g.position.y = lerp(4.2, BASE + .75, ik); PL.ibx.plate.material.opacity = .08 * ik; PL.ibx.edges.material.opacity = .9 * ik; M.ibx.opacity = .85 * ik; M.ibx.emissiveIntensity = .35 + .25 * Math.sin(t * 3);
  PL.ibx.tubes.forEach(m => m.visible = ik > .01);
  ibxStations.forEach((s, i) => { const k = seg(t, T.stations + i * .06, T.stations + i * .06 + .25); s.visible = k > .01; s.scale.set(1, Math.max(eo(k), .01), 1); });
  PL.ibx.trains.forEach(tr => tr.visible = false);
  // coins hover over each company's plate during the nickel line
  coins.forEach((c, i) => { const k = seg(t, T.nickel + i * .2, T.nickel + i * .2 + .4) * (1 - seg(t, T.unify - .3, T.unify + .2)); c.visible = k > .01; const pk = ['irt', 'bmt', 'ind'][i]; c.position.y = plateY(pk, t) + .45 + Math.sin(t * 2 + i) * .03; c.rotation.set(Math.PI / 2 * .85, t * 1.5 + i, 0); c.scale.setScalar(Math.max(eo(k), .01)); });
  // transfer pins rise at the junctions once unified
  pins.forEach((m, i) => { const k = seg(t, T.transfers + i * .15, T.transfers + i * .15 + .35); m.visible = k > .01; m.position.y = BASE + .02 + .08 * eo(k); m.scale.set(1, Math.max(eo(k), .01), 1); });
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, CX, CZ, plateY, BASE, ibxY: PL.ibx.g.position.y, ik });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
