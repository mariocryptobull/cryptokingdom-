// SpaceX Starship / Super Heavy — Exploded Teardown, 1080×1920. Schematic model, no logos, not to exact scale.
// Units: 1 = 10 m. Booster 7.2 tall, ship 5.2 tall, diameter 0.9 (V3 ≈ 124 m stack, 9 m wide). Y up, Z toward camera at az 0.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, eio, eo, ei, track, mulberry } from '/core/lib.js';
import * as O from './overlay.js';

const W = 1080, H = 1920;
const Q = new URLSearchParams(location.search);
const SSAA = +(Q.get('ssaa') || 1);
const TL = await (await fetch('timeline.json')).json();
const VDUR = await (await fetch('voice/dur.json')).json();
const DUR = TL.dur;
const CUES = []; for (const v of TL.vo) { const d = VDUR[v.id]; const n = v.chunks.map(c => c.replace(/[^A-Za-z0-9]/g, '').length + 2), tot = n.reduce((a, b) => a + b, 0); let t = v.t; v.chunks.forEach((c, i) => { CUES.push({ id: v.id, i, t }); t += d * n[i] / tot; }); }
const cue = (id, i = 0) => CUES.find(c => c.id === id && c.i === i).t;
const vend = id => { const v = TL.vo.find(x => x.id === id); return v.t + VDUR[id]; };
const T = {
  starship: cue('v01', 0), tall: cue('v01', 2), apart: cue('v01', 3),
  sh: cue('v02', 0), eng33: cue('v02', 1), thrust: cue('v02', 2),
  tanks: cue('v03', 0), lox: cue('v03', 1), ch4: cue('v03', 2),
  raptor: cue('v04', 0), ffsc: cue('v04', 1), pre: cue('v04', 2), pump: cue('v04', 3), chamber: cue('v04', 4), nozzle: cue('v04', 5),
  why: cue('v05', 0), clean: cue('v05', 1), reuse: cue('v05', 2), mars0: cue('v05', 3),
  stage: cue('v06', 0), ring: cue('v06', 1), home: cue('v06', 2), catch: cue('v06', 3),
  ship: cue('v07', 0), slvac: cue('v07', 1), tiles: cue('v07', 2), flaps: cue('v07', 3),
  f14: cue('v08', 0), orbit: cue('v08', 1), sats: cue('v08', 2), bay: cue('v08', 3),
  next: cue('v09', 0), refuel: cue('v09', 1), moon: cue('v09', 2), mars: cue('v09', 3), cargo: cue('v09', 4), city: cue('v09', 5),
  ask: cue('v10', 0), congrats: cue('v11', 0), card: cue('v11', 1),
};
window.T = T;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, .1, 400);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, ao: false });
post.bloom.strength = .55; post.bloom.radius = .5; post.bloom.threshold = .92;
post.vig.uniforms.amt.value = .34; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .06;
const gradTex = (stops, cx = 560, cy = 860) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const gr = g.createRadialGradient(cx, cy, 80, 540, 960, 1500); stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, W, H); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const BG = {
  studio: gradTex([[0, '#383b40'], [.45, '#24262a'], [1, '#0d0e10']]),
  space: gradTex([[0, '#0d1220'], [.5, '#070a12'], [1, '#020306']]),
  mars: gradTex([[0, '#4a2c22'], [.5, '#2a1813'], [1, '#100907']], 540, 500),
};
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = .55; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
const key = new THREE.DirectionalLight('#fff1e2', 1.8); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 80 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.DirectionalLight('#cfe0ff', 1.1); scene.add(rim, rim.target);
const hemi = new THREE.HemisphereLight('#c9d3e0', '#1a1712', .3); scene.add(hemi);

// ---------- textures ----------
function hexTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 260; const g = c.getContext('2d');
  g.fillStyle = '#7d8084'; g.fillRect(0, 0, 256, 260);
  const wv = 256 / 8, s = wv / Math.sqrt(3), rows = Math.round(260 / (1.5 * s)), rnd = mulberry(7);
  for (let r = -1; r <= rows + 1; r++) for (let q = -1; q <= 9; q++) {
    const cx = q * wv + (r % 2 ? wv / 2 : 0), cy = r * 260 / rows; const l = 22 + rnd() * 10;
    g.fillStyle = `rgb(${l},${l},${l + 2})`; g.beginPath();
    for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(cx + Math.cos(a) * (s - 1.3), cy + Math.sin(a) * (s - 1.3)); }
    g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const HEX = hexTexture();
function noiseTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function groundTex(base, dark, light, seed) {
  return noiseTex(1024, 1024, (g, w, h) => {
    const rnd = mulberry(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { g.fillStyle = rnd() < .5 ? dark : light; g.globalAlpha = .05 + rnd() * .08; g.beginPath(); g.arc(rnd() * w, rnd() * h, 2 + rnd() * 30, 0, 7); g.fill(); }
    for (let i = 0; i < 70; i++) { const x = rnd() * w, y = rnd() * h, r = 6 + Math.pow(rnd(), 3) * 90; g.globalAlpha = .35; g.fillStyle = dark; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.globalAlpha = .3; g.strokeStyle = light; g.lineWidth = r * .18; g.beginPath(); g.arc(x - r * .1, y - r * .1, r, 0, 7); g.stroke(); }
    g.globalAlpha = 1;
  });
}
const earthTex = noiseTex(1024, 512, (g, w, h) => {
  const rnd = mulberry(3); g.fillStyle = '#1b4a86'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) { const x = rnd() * w, y = 100 + rnd() * 312; for (let k = 0; k < 40; k++) { g.fillStyle = rnd() < .6 ? '#3f6b3b' : '#8c7a52'; g.globalAlpha = .7; g.beginPath(); g.arc(x + (rnd() - .5) * 120, y + (rnd() - .5) * 70, 8 + rnd() * 26, 0, 7); g.fill(); } }
  for (let i = 0; i < 260; i++) { g.fillStyle = '#ffffff'; g.globalAlpha = .18 + rnd() * .3; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 20 + rnd() * 70, 5 + rnd() * 14, 0, 0, 7); g.fill(); }
  g.globalAlpha = 1;
});

// ---------- materials ----------
const M = {
  steel: new THREE.MeshPhysicalMaterial({ color: '#cfd3d8', roughness: .33, metalness: .92, clearcoat: .2 }),
  steelFront: new THREE.MeshPhysicalMaterial({ color: '#cfd3d8', roughness: .33, metalness: .92, transparent: true, opacity: 1 }),
  steelDark: new THREE.MeshStandardMaterial({ color: '#5a5f66', roughness: .45, metalness: .8 }),
  weld: new THREE.MeshStandardMaterial({ color: '#8f949a', roughness: .5, metalness: .8 }),
  bell: new THREE.MeshStandardMaterial({ color: '#3c3e43', roughness: .35, metalness: .9, side: THREE.DoubleSide, emissive: '#ff6a2a', emissiveIntensity: 0 }),
  tiles: new THREE.MeshStandardMaterial({ map: HEX, roughness: .75, metalness: .05 }),
  tileFront: new THREE.MeshStandardMaterial({ map: HEX, roughness: .75, metalness: .05, transparent: true, opacity: 1 }),
  flap: new THREE.MeshStandardMaterial({ color: '#202124', roughness: .7 }),
  white: new THREE.MeshPhysicalMaterial({ color: '#eceae4', roughness: .45, clearcoat: .4 }),
  black: new THREE.MeshStandardMaterial({ color: '#0d0e10', roughness: .6 }),
  lox: new THREE.MeshPhysicalMaterial({ color: '#2f7fd6', roughness: .15, emissive: '#3aa0ff', emissiveIntensity: .35, transparent: true, opacity: 0 }),
  ch4: new THREE.MeshPhysicalMaterial({ color: '#5aa83a', roughness: .15, emissive: '#7be35a', emissiveIntensity: .3, transparent: true, opacity: 0 }),
  vent: new THREE.MeshBasicMaterial({ color: '#ff7a2a' }),
  ventIn: new THREE.MeshStandardMaterial({ color: '#16171a', roughness: .8 }),
  concrete: new THREE.MeshPhysicalMaterial({ color: '#8d8a84', roughness: .9 }),
  pad: new THREE.MeshPhysicalMaterial({ color: '#4a4a4c', roughness: .85 }),
  tower: new THREE.MeshStandardMaterial({ color: '#6b7076', roughness: .5, metalness: .7 }),
  arm: new THREE.MeshStandardMaterial({ color: '#80868d', roughness: .4, metalness: .8 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#cfe6ff', roughness: .1, transparent: true, opacity: .28, depthWrite: false, side: THREE.DoubleSide }),
  pump: new THREE.MeshPhysicalMaterial({ color: '#b9bec4', roughness: .3, metalness: .9, clearcoat: .3 }),
  turb: new THREE.MeshStandardMaterial({ color: '#7a6a52', roughness: .4, metalness: .9 }),
  preO: new THREE.MeshPhysicalMaterial({ color: '#9fb7d0', roughness: .3, metalness: .7, emissive: '#3aa0ff', emissiveIntensity: 0 }),
  preF: new THREE.MeshPhysicalMaterial({ color: '#b6c9a2', roughness: .3, metalness: .7, emissive: '#7be35a', emissiveIntensity: 0 }),
  copper: new THREE.MeshStandardMaterial({ color: '#b87333', roughness: .35, metalness: 1, side: THREE.DoubleSide }),
  core: new THREE.MeshBasicMaterial({ color: '#ffb36a', transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
  sat: new THREE.MeshStandardMaterial({ color: '#8d9299', roughness: .35, metalness: .8 }),
  panel: new THREE.MeshStandardMaterial({ color: '#1e2a44', roughness: .25, metalness: .6, emissive: '#1a2b55', emissiveIntensity: .2 }),
  dome: new THREE.MeshPhysicalMaterial({ color: '#f1efe9', roughness: .35, clearcoat: .5, emissive: '#ffcf8a', emissiveIntensity: 0 }),
};
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const mesh = (geo, mat) => sh(new THREE.Mesh(geo, mat));
const box = (sx, sy, sz, mat, x = 0, y = 0, z = 0) => { const m = mesh(new THREE.BoxGeometry(sx, sy, sz), mat); m.position.set(x, y, z); return m; };
const boxG = (sx, sy, sz, x, y, z) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);
const merged = (geos, mat) => mesh(mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g)), mat);
const FRONT = [-Math.PI / 2, Math.PI], BACK = [Math.PI / 2, Math.PI];
const cylY = (r, y0, y1, mat, th = null, seg = 64) => { const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg, 1, true, th ? th[0] : 0, th ? th[1] : Math.PI * 2).translate(0, (y0 + y1) / 2, 0); return mesh(g, mat); };
const solidY = (r, y0, y1, mat, seg = 32) => mesh(new THREE.CylinderGeometry(r, r, y1 - y0, seg).translate(0, (y0 + y1) / 2, 0), mat);
const weldRings = (r, y0, y1, step) => { const gs = []; for (let y = y0 + step; y < y1 - .02; y += step) gs.push(new THREE.TorusGeometry(r + .002, .004, 4, 64).rotateX(Math.PI / 2).translate(0, y, 0)); return gs.length ? merged(gs, M.weld) : new THREE.Group(); };
const dome = (r, y, up, mat, k = .38) => { const g = new THREE.SphereGeometry(r, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, k, 1); if (!up) g.rotateX(Math.PI); g.translate(0, y, 0); return mesh(g, mat); };
// rocket bell (exit at y = 0, throat at top)
function bellGeo(rExit, h, rThroat, half = null) {
  const pts = []; for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push(new THREE.Vector2(lerp(rExit, rThroat, Math.pow(u, .55)), u * h)); }
  pts.push(new THREE.Vector2(rThroat * 1.25, h + rThroat * .6)); pts.push(new THREE.Vector2(rThroat * .9, h + rThroat * 1.4)); pts.push(new THREE.Vector2(.001, h + rThroat * 1.6));
  return new THREE.LatheGeometry(pts, 28, half ? half[0] : 0, half ? half[1] : Math.PI * 2);
}
// glowing interior disk (seen when an engine fires)
const glowDisk = r => { const m = new THREE.Mesh(new THREE.CircleGeometry(r * .92, 20).rotateX(Math.PI / 2).translate(0, .01, 0), M.core); return m; };
// exhaust plume pointing down from y = 0
function plume(r, L) {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(r * .95, r * 2.2, L, 20, 1, true).translate(0, -L / 2, 0), new THREE.MeshBasicMaterial({ color: '#ff8a3a', transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r * .7, r * .15, L * .55, 20, 1, true).translate(0, -L * .275, 0), new THREE.MeshBasicMaterial({ color: '#fff0c8', transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  g.add(outer, core); g.userData = { outer, core }; g.visible = false; return g;
}
function setPlume(p, k, t, seed = 0) { p.visible = k > .01; if (!p.visible) return; const f = 1 + .08 * Math.sin(t * 37 + seed * 3.1) + .05 * Math.sin(t * 61 + seed); p.scale.set(1, k * f, 1); p.userData.outer.material.opacity = .55 * k; p.userData.core.material.opacity = .9 * k; }
// tiles: a lathe over the front half (+z) whose UVs are in world-ish units so hexes stay one size
function tileLathe(pts, half = FRONT, scale = .55) {
  const g = new THREE.LatheGeometry(pts, 48, half[0], half[1]);
  const uv = g.attributes.uv, pos = g.attributes.position;
  let L = 0; const acc = [0]; for (let i = 1; i < pts.length; i++) { L += pts[i].distanceTo(pts[i - 1]); acc.push(L); }
  const rMax = Math.max(...pts.map(p => p.x)), arc = rMax * half[1];
  for (let i = 0; i < uv.count; i++) { const v = uv.getY(i); const j = Math.round(v * (pts.length - 1)); uv.setXY(i, uv.getX(i) * arc / scale, acc[j] / scale); }
  return g;
}

// ================= SUPER HEAVY =================
const R = .45;
function makeBooster() {
  const g = new THREE.Group(), P = {};
  const part = n => { const p = new THREE.Group(); g.add(p); P[n] = p; return p; };
  // engines: 3 center, 10 inner ring, 20 outer ring
  const eng = part('eng'), bells = [], center = [];
  const bg = bellGeo(.055, .26, .028);
  const place = (n, r, off, list) => { for (let k = 0; k < n; k++) { const a = off + k * Math.PI * 2 / n; const b = mesh(bg, M.bell); b.position.set(Math.sin(a) * r, 0, Math.cos(a) * r); eng.add(b); bells.push(b); if (list) { const p = plume(.055, 2.2); b.add(p); const d = glowDisk(.055); b.add(d); list.push({ p, d }); } } };
  place(3, .1, .3, center); place(10, .23, 0); place(20, .375, .1);
  const engPl = []; for (const b of bells) if (!center.find(c => b.children.includes(c.p))) { const p = plume(.055, 2.6); b.add(p); engPl.push(p); }
  // aft skirt + heat shield plate
  const aft = part('aft');
  aft.add(cylY(R, .28, .9, M.steel)); aft.add(weldRings(R, .28, .9, .3));
  { const hs = mesh(new THREE.CircleGeometry(R - .005, 48).rotateX(Math.PI / 2).translate(0, .3, 0), M.steelDark); aft.add(hs); }
  // LOX tank (lower) and methane tank (upper): back half opaque + front half that fades for the cutaway
  const tank = (name, y0, y1, liq) => { const p = part(name); p.add(cylY(R, y0, y1, M.steel, BACK)); const f = cylY(R, y0, y1, M.steelFront, FRONT); p.add(f); p.add(weldRings(R, y0, y1, .3));
    p.add(dome(R - .004, y0 + .02, false, M.steelDark), dome(R - .004, y1 - .02, true, M.steelDark));
    const lq = mesh(new THREE.CylinderGeometry(R - .03, R - .03, y1 - y0 - .2, 48).translate(0, (y0 + y1) / 2 - .05, 0), liq); lq.castShadow = false; p.add(lq); return p; };
  tank('lox', .9, 4.6, M.lox); tank('ch4', 4.6, 6.2, M.ch4);
  { const dc = solidY(.05, 1.2, 4.6, M.steelDark, 12); P.lox.add(dc); }   // methane downcomer through the LOX tank
  // forward section: grid fins + catch points
  const fwd = part('fwd');
  fwd.add(cylY(R, 6.2, 6.8, M.steel)); fwd.add(dome(R - .004, 6.78, true, M.steelDark, .2));
  const fins = [];
  { const fg = []; const fw = .34, fh = .3, th = .05; fg.push(boxG(fw, .025, th, 0, 0, 0), boxG(fw, .025, th, 0, fh, 0), boxG(.025, fh, th, -fw / 2, fh / 2, 0), boxG(.025, fh, th, fw / 2, fh / 2, 0));
    for (let i = 1; i < 6; i++) { fg.push(boxG(.008, fh, th, -fw / 2 + i * fw / 6, fh / 2, 0)); fg.push(boxG(fw, .008, th, 0, i * fh / 6, 0)); }
    const finGeo = mergeGeometries(fg.map(x => x.toNonIndexed()));
    for (const a of [Math.PI / 2 + .35, Math.PI / 2 + .35 + 2.094, Math.PI / 2 + .35 + 4.189]) {
      const hinge = new THREE.Group(); hinge.position.set(Math.sin(a) * R, 6.45, Math.cos(a) * R); hinge.rotation.y = a; fwd.add(hinge);
      const fin = mesh(finGeo, M.steelDark); const piv = new THREE.Group(); piv.add(fin); fin.position.set(0, 0, .04); hinge.add(piv);
      piv.rotation.x = 0; fins.push(piv); hinge.add(box(.08, .1, .1, M.steelDark, 0, 0, .02)); } }
  for (const s of [-1, 1]) fwd.add(box(.1, .06, .09, M.steelDark, 0, 6.3, s * (R + .04)));
  // hot-staging ring: vented interstage
  const ring = part('ring');
  ring.add(cylY(R, 6.8, 6.86, M.steel), cylY(R, 7.14, 7.2, M.steel));
  { const gs = []; for (let k = 0; k < 28; k++) { const a = k * Math.PI * 2 / 28; gs.push(new THREE.BoxGeometry(.05, .28, .035).rotateY(a).translate(Math.sin(a) * (R - .01), 7.0, Math.cos(a) * (R - .01))); } ring.add(merged(gs, M.steel)); }
  const ventGlow = cylY(R - .05, 6.86, 7.14, M.vent); ring.add(ventGlow); ventGlow.castShadow = false;
  const ventCover = cylY(R - .051, 6.86, 7.14, M.ventIn); ring.add(ventCover);
  return { g, P, fins, center, engPl, ventGlow, ventCover, bells };
}
const B = makeBooster(); scene.add(B.g);
const BOFF = { eng: [-.9, 0], aft: [-.45, 0], lox: [0, 0], ch4: [.55, 0], fwd: [1.0, 0], ring: [1.45, 0] };

// ================= SHIP =================
function makeShip(o = {}) {
  const g = new THREE.Group(), P = {};
  const part = n => { const p = new THREE.Group(); g.add(p); P[n] = p; return p; };
  const body = o.white ? M.white : M.steel;
  // engines: 3 sea-level (inner) + 3 vacuum (outer, big bells)
  const sl = part('sl'), vac = part('vac'), plumes = [];
  for (let k = 0; k < 3; k++) { const a = Math.PI / 2 + k * 2.094; const b = mesh(bellGeo(.055, .28, .028), M.bell); b.position.set(Math.sin(a) * .11, .2, Math.cos(a) * .11); sl.add(b); const p = plume(.055, 1.6); b.add(p); const d = glowDisk(.055); b.add(d); plumes.push({ p, d, b }); }
  const vacBells = []; for (let k = 0; k < 3; k++) { const a = Math.PI / 2 + 1.047 + k * 2.094; const b = mesh(bellGeo(.125, .5, .03), M.bell); b.position.set(Math.sin(a) * .29, 0, Math.cos(a) * .29); b.userData.a = a; vac.add(b); vacBells.push(b); const p = plume(.125, 1.4); b.add(p); plumes.push({ p, d: null, b, vac: true }); }
  // sections
  const sec = (name, y0, y1, extra) => { const p = part(name); p.add(cylY(R, y0, y1, body)); if (!o.white) p.add(weldRings(R, y0, y1, .3));
    if (o.tiles) p.add(mesh(tileLathe([new THREE.Vector2(R + .005, y0 + .005), new THREE.Vector2(R + .005, y1 - .005)]), M.tiles)); if (extra) extra(p); return p; };
  sec('aft', .05, .62, p => { p.add(mesh(new THREE.CircleGeometry(R - .005, 48).rotateX(Math.PI / 2).translate(0, .55, 0), M.steelDark)); });
  sec('tank', .62, 3.3, p => { p.add(dome(R - .004, .64, false, M.steelDark)); p.add(dome(R - .004, 3.28, true, M.steelDark)); });
  const bay = sec('bay', 3.3, 4.3);
  // nose: ogive lathe
  const nosePts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; nosePts.push(new THREE.Vector2(Math.max(.002, R * Math.sqrt(1 - Math.pow(u, 1.9)) * (1 - .05 * u)), 4.3 + u * .95)); }
  const nose = part('nose'); nose.add(mesh(new THREE.LatheGeometry(nosePts, 48), body));
  if (o.tiles) nose.add(mesh(tileLathe(nosePts.slice(0, 19).map(p => new THREE.Vector2(p.x + .005, p.y))), M.tiles));
  if (o.white) { nose.add(cylY(R + .004, 4.45, 4.55, M.black)); }
  // payload door (back, -z): a dark slot with a hinged door
  const slot = box(.42, .07, .02, M.black, 0, 3.75, -R - .002); bay.add(slot);
  const doorPiv = new THREE.Group(); doorPiv.position.set(0, 3.79, -R - .012); bay.add(doorPiv);
  const door = box(.42, .08, .015, body, 0, -.04, 0); doorPiv.add(door);
  // flaps on ±x (aft pair on the aft/tank section, forward pair on the nose)
  const flaps = [];
  if (o.flaps) {
    const fa = new THREE.Shape(); fa.moveTo(0, 0); fa.lineTo(.3, .08); fa.lineTo(.3, .85); fa.lineTo(0, 1.0); fa.closePath();
    const ff = new THREE.Shape(); ff.moveTo(0, 0); ff.lineTo(.2, .06); ff.lineTo(.17, .42); ff.lineTo(0, .55); ff.closePath();
    const ex = s => new THREE.ExtrudeGeometry(s, { depth: .035, bevelEnabled: false }).translate(0, 0, -.0175);
    for (const [pn, sgeo, y, r] of [['aft', ex(fa), .2, R], ['nose', ex(ff), 4.32, R - .06]]) for (const s of [-1, 1]) {
      const piv = new THREE.Group(); piv.position.set(s * r, y, 0); P[pn === 'aft' ? 'flapsA' : 'flapsF'] = P[pn === 'aft' ? 'flapsA' : 'flapsF'] || part(pn === 'aft' ? 'flapsA' : 'flapsF');
      P[pn === 'aft' ? 'flapsA' : 'flapsF'].add(piv);
      const f = mesh(sgeo, M.flap); f.scale.x = s; piv.add(f); flaps.push(piv);
      piv.add(box(.03, pn === 'aft' ? .95 : .5, .06, M.steelDark, 0, pn === 'aft' ? .5 : .27, 0)); }
  }
  if (o.legs) { for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; P.aft.add(box(.05, .45, .05, M.white, Math.sin(a) * (R + .02), .02, Math.cos(a) * (R + .02))); P.aft.add(box(.1, .02, .1, M.steelDark, Math.sin(a) * (R + .02), -.2, Math.cos(a) * (R + .02))); } }
  return { g, P, plumes, flaps, doorPiv, vacBells };
}
const S = makeShip({ tiles: true, flaps: true }); scene.add(S.g);
const SOFF = { sl: [-1.15, 0], vac: [-1.15, .28], aft: [-.55, 0], flapsA: [-.55, .32], tank: [0, 0], bay: [.45, 0], nose: [.9, 0], flapsF: [.9, .3] };
const TK = makeShip({ tiles: true, flaps: true }); scene.add(TK.g);            // tanker (refueling)
const HLS = makeShip({ white: true, legs: true }); scene.add(HLS.g);          // lunar lander variant (no flaps, no tiles)
const MS = [0, 1, 2].map(() => { const s = makeShip({ tiles: true, flaps: true }); scene.add(s.g); return s; });   // Mars ships

// ================= PAD + TOWER =================
const pad = new THREE.Group(); scene.add(pad);
const Y0 = 1.05, TX = -1.75, ARMY = 8.35, CATCHY = 2.05;
pad.add(mesh(new THREE.CylinderGeometry(9, 9, .1, 64).translate(0, -.05, 0), M.pad));
{ const gs = []; for (const [x, z] of [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]]) gs.push(boxG(.2, .8, .2, x, .4, z)); gs.push(boxG(1.4, .25, 1.4, 0, .9, 0).translate(0, 0, 0)); pad.add(merged(gs, M.concrete)); }
pad.add(mesh(new THREE.TorusGeometry(.46, .05, 8, 40).rotateX(Math.PI / 2).translate(0, 1.04, 0), M.steelDark));
// tower: 4 columns, bands, X-bracing
{ const gs = [], w = .5, Ht = 14.6;
  for (const [x, z] of [[-w, -w], [w, -w], [-w, w], [w, w]]) gs.push(boxG(.09, Ht, .09, TX + x, Ht / 2, z));
  for (let y = .6; y < Ht; y += .7) { gs.push(boxG(2 * w, .05, .05, TX, y, w), boxG(2 * w, .05, .05, TX, y, -w), boxG(.05, .05, 2 * w, TX + w, y, 0), boxG(.05, .05, 2 * w, TX - w, y, 0));
    const L = Math.hypot(2 * w, .7), a = Math.atan2(.7, 2 * w);
    for (const z of [w, -w]) { gs.push(new THREE.BoxGeometry(L, .03, .03).rotateZ(a).translate(TX, y + .35, z)); gs.push(new THREE.BoxGeometry(L, .03, .03).rotateZ(-a).translate(TX, y + .35, z)); }
    for (const x of [w, -w]) { gs.push(new THREE.BoxGeometry(.03, .03, L).rotateX(-a).translate(TX + x, y + .35, 0)); } }
  gs.push(boxG(1.2, .2, 1.2, TX, Ht, 0));
  pad.add(merged(gs, M.tower)); }
// chopsticks: carriage + two arms pivoting toward the rocket
const carriage = box(.7, .5, 1.25, M.arm, TX + .45, ARMY, 0); pad.add(carriage);
const arms = [-1, 1].map(s => { const piv = new THREE.Group(); piv.position.set(TX + .75, ARMY, s * .56); pad.add(piv); piv.add(box(2.15, .16, .1, M.arm, 1.07, 0, 0)); piv.add(box(.3, .06, .14, M.steelDark, 1.75, .1, -s * .02)); return { piv, s }; });

// ================= RAPTOR (detail, big) =================
const rap = new THREE.Group(); scene.add(rap);
const RY = 0; // nozzle exit at y = 0
{ // nozzle (back half, cutaway) + copper inner + chamber
  const nzPts = []; for (let i = 0; i <= 24; i++) { const u = i / 24; nzPts.push(new THREE.Vector2(lerp(.95, .26, Math.pow(u, .5)), u * 1.9)); }
  nzPts.push(new THREE.Vector2(.36, 2.15), new THREE.Vector2(.4, 2.6), new THREE.Vector2(.48, 2.68), new THREE.Vector2(.5, 2.95), new THREE.Vector2(.001, 3.0));
  rap.add(mesh(new THREE.LatheGeometry(nzPts, 56, BACK[0], BACK[1]), M.bell));
  rap.add(mesh(new THREE.LatheGeometry(nzPts.map(p => new THREE.Vector2(Math.max(.001, p.x - .015), p.y)), 56, BACK[0], BACK[1]), M.copper));
  // front rim edges so the cut reads
  const rimG = []; for (const s of [-1, 1]) for (let i = 0; i < nzPts.length - 1; i++) { const a = nzPts[i], b = nzPts[i + 1]; const l = a.distanceTo(b); rimG.push(new THREE.BoxGeometry(.03, l, .03).rotateZ(Math.atan2(b.x - a.x, b.y - a.y) * -s).translate(s * (a.x + b.x) / 2, (a.y + b.y) / 2, 0)); }
  rap.add(merged(rimG, M.steelDark));
  for (let i = 1; i < 6; i++) { const y = i * .3, r = lerp(.95, .26, Math.pow(y / 1.9, .5)); rap.add(mesh(new THREE.TorusGeometry(r + .01, .012, 6, 40, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI).translate(0, y, 0), M.steelDark)); }
}
// combustion glow inside the chamber/nozzle
const rapCore = new THREE.Mesh(new THREE.CylinderGeometry(.3, .85, 2.4, 32, 1, true, BACK[0], BACK[1]).translate(0, 1.3, -.02), M.core); rap.add(rapCore);
const rapPlume = plume(.9, 3.2); rap.add(rapPlume);
// turbopumps + preburners on each side (x−: oxygen side, x+: fuel side)
const PX = .78;
const spinners = [];
const rapSide = (s, pre) => {
  rap.add(solidY(.27, 2.75, 3.25, M.pump).translateX(s * PX));                 // pump housing
  const tb = new THREE.Group(); tb.position.set(s * PX, 3.25, 0); rap.add(tb);
  tb.add(solidY(.24, 0, .26, M.turb)); const sp = new THREE.Group(); tb.add(sp);
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; sp.add(box(.06, .2, .02, M.steel, Math.sin(a) * .25, .13, Math.cos(a) * .25).rotateY(a + .5)); }
  spinners.push(sp);
  const p = solidY(.17, 3.51, 4.05, pre); p.translateX(s * PX); rap.add(p); rap.add(dome(.17, 4.05, true, pre, .7).translateX(s * PX));
};
rapSide(-1, M.preO); rapSide(1, M.preF);
// flow paths (inlet → pump → preburner → turbine → injector → chamber)
const pathPts = s => [[1.45, 4.5], [1.35, 3.3], [1.15, 2.9], [PX + .05, 2.95], [PX + .32, 3.15], [PX + .36, 3.7], [PX + .2, 4.25], [PX, 4.1], [PX, 3.6], [PX, 3.3], [PX - .2, 3.05], [.35, 2.92], [.05, 2.85]].map(([x, y]) => new THREE.Vector3(s * x, y, .02));
const curves = [-1, 1].map(s => new THREE.CatmullRomCurve3(pathPts(s), false, 'catmullrom', .3));
for (const c of curves) { rap.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(c.points.slice(0, 7)), 60, .07, 10), M.glass)); rap.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(c.points.slice(9)), 40, .09, 10), M.pump)); }
const HOT = 9 / 12;   // after the preburner, propellant is hot gas
const FLOWN = 34, flow = [];
for (const s of [0, 1]) for (let i = 0; i < FLOWN; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.045, 8, 6), new THREE.MeshBasicMaterial({ color: s ? '#9be86f' : '#6cc4ff' })); rap.add(m); flow.push({ m, s, i }); }
const exh = [...Array(40)].map((_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffb36a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); rap.add(m); return m; });
// small Mars for "make it on Mars"
const marsBall = mesh(new THREE.SphereGeometry(.55, 48, 32), new THREE.MeshStandardMaterial({ map: groundTex('#b5562e', '#6e2d17', '#d98a5a', 11), roughness: .9 })); scene.add(marsBall);

// ================= SPACE / MOON / MARS sets =================
const earth = new THREE.Group(); scene.add(earth);
earth.add(new THREE.Mesh(new THREE.SphereGeometry(40, 96, 64), new THREE.MeshStandardMaterial({ map: earthTex, roughness: .8 })));
earth.add(new THREE.Mesh(new THREE.SphereGeometry(40.9, 96, 64), new THREE.MeshBasicMaterial({ color: '#5aa8ff', transparent: true, opacity: .25, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })));
const stars = (() => { const rnd = mulberry(5), n = 1600, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, r = 150; p[i * 3] = Math.sqrt(1 - u * u) * Math.cos(a) * r; p[i * 3 + 1] = u * r; p[i * 3 + 2] = Math.sqrt(1 - u * u) * Math.sin(a) * r; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: .8 })); })();
scene.add(stars);
const sats = [...Array(12)].map(() => { const g = new THREE.Group(); g.add(box(.26, .018, .13, M.sat)); g.add(box(.5, .006, .12, M.panel, .36, 0, 0)); scene.add(g); return g; });
const flowBeads = [...Array(18)].map((_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? '#6cc4ff' : '#9be86f' })); scene.add(m); return m; });
function groundSet(tex) { const g = new THREE.Group(); const geo = new THREE.PlaneGeometry(80, 80, 120, 120).rotateX(-Math.PI / 2); const pos = geo.attributes.position, rnd = mulberry(9);
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), d = Math.hypot(x, z); pos.setY(i, d < 6 ? 0 : (Math.sin(x * .21) * Math.cos(z * .17) * .8 + Math.sin(x * .07 + 1) * 1.6) * clamp((d - 6) / 10)); }
  geo.computeVertexNormals(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(5, 5); g.add(sh(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: .95 })))); scene.add(g); return g; }
const moonG = groundSet(groundTex('#8d8b88', '#55534f', '#b9b6b0', 21));
const moonEarth = new THREE.Mesh(new THREE.SphereGeometry(2.2, 48, 32), new THREE.MeshStandardMaterial({ map: earthTex, roughness: .8, emissive: '#0a1830', emissiveIntensity: .4 })); moonG.add(moonEarth); moonEarth.position.set(-12, 13, -32);
const marsG = groundSet(groundTex('#b0603a', '#6b2f1a', '#d58c62', 31));
const domes = [...Array(7)].map((_, i) => { const m = mesh(new THREE.SphereGeometry(.4 + (i % 3) * .15, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.dome); marsG.add(m); return m; });
const DOMEP = [[2.2, 1.2], [3.1, .3], [1.5, 2.3], [3.6, 1.8], [-2.4, 1.6], [-3.3, .6], [2.7, -1.6]];

// ================= shots =================
// each shot: [t0, set, camera keys [t, az, el, dist, tx, ty, tz, fov]]
const sky = Y => Y;
const SH = [
  { t0: 0, set: 'pad', k: [[0, 18, -16, 7.5, 0, 3.0, 0, 42], [T.tall - .3, 22, -2, 15, 0, 6.5, 0, 36], [T.tall + 1.2, 26, 5, 31, 0, 8.4, 0, 30], [T.apart + .2, 28, 6, 31, .8, 9.0, 0, 30],
    [T.sh + 1.2, 30, 8, 25, 3.2, 9.6, 0, 30], [T.eng33 - .1, 32, -10, 12, 3, 6.5, 0, 34], [T.eng33 + 1.0, 30, -50, 5.0, 3, 4.9, 0, 40], [T.tanks - .5, 34, -45, 5.4, 3, 4.9, 0, 40],
    [T.tanks + .7, 18, 4, 15, 3, 8.8, 0, 30], [T.raptor, 12, 4, 13.5, 3, 9.2, 0, 30]] },
  { t0: T.raptor - .2, set: 'raptor', k: [[T.raptor - .2, 34, 8, 11, 0, 2.6, 0, 32], [T.pre, 24, 6, 9.6, 0, 3.0, 0, 32], [T.pump + .5, 14, 4, 9.0, 0, 3.0, 0, 32], [T.chamber, 8, 2, 9.6, 0, 2.2, 0, 32],
    [T.nozzle + .4, 10, -4, 12.5, 0, 1.0, 0, 32], [T.why, 20, 2, 13.5, 0, 1.8, 0, 32], [T.mars0 - .2, 26, 4, 13, .2, 2.4, 0, 32], [T.stage, 32, 6, 12.5, .3, 2.6, 0, 32]] },
  { t0: T.stage - .2, set: 'sky', k: [[T.stage - .2, 30, 6, 8.5, 0, 7.0, 0, 32], [T.ring, 40, 4, 7.0, 0, 7.2, 0, 32], [T.home - .1, 52, 2, 10, 0, 8.0, 0, 32]] },
  { t0: T.home - .1, set: 'pad', k: [[T.home - .1, 55, 4, 19, -.6, 9.5, 0, 30], [T.catch, 48, 6, 19, -.6, 7.4, 0, 30], [T.ship - .2, 40, 8, 18, -.6, 7.0, 0, 30]] },
  { t0: T.ship - .2, set: 'studio', k: [[T.ship - .2, 20, 6, 14.5, 0, 2.8, 0, 30], [T.slvac + .3, 18, -40, 6.5, 0, 0, 0, 36], [T.tiles - .3, 14, -30, 7.0, 0, .4, 0, 36], [T.tiles + .6, 8, 6, 12.5, 0, 2.6, 0, 30], [T.flaps + .5, 34, 8, 12, 0, 2.6, 0, 30], [T.f14, 44, 8, 12.5, 0, 2.6, 0, 30]] },
  { t0: T.f14 - .2, set: 'space', k: [[T.f14 - .2, 200, 16, 15, 0, 0, 0, 32], [T.sats, 190, 12, 11.5, .4, .6, 0, 32], [T.refuel, 184, 10, 11, .5, .7, 0, 32]] },
  { t0: T.refuel - .15, set: 'space', k: [[T.refuel - .15, 10, 14, 23, 0, -.2, 0, 32], [T.moon, 0, 10, 21, 0, -.2, 0, 32]] },
  { t0: T.moon - .1, set: 'moon', k: [[T.moon - .1, 25, 3, 14, 0, 2.8, 0, 32], [T.mars, 18, 6, 15, 0, 2.8, 0, 32]] },
  { t0: T.mars - .1, set: 'mars', k: [[T.mars - .1, 20, 10, 20, 0, 2.6, 0, 32], [T.city, 28, 14, 19, .4, 2.4, 0, 32], [T.ask - .3, 34, 16, 18, .4, 2.2, 0, 32]] },
  { t0: T.ask - .3, set: 'pad', k: [[T.ask - .3, 36, 4, 26, 0, 7.6, 0, 30], [DUR, 22, 8, 34, -.3, 7.8, 0, 30]] },
];
SH.forEach(s => { s.tr = track(s.k.map(k => [k[0], k.slice(1)])); });
const shotAt = t => { let s = SH[0]; for (const x of SH) if (t >= x.t0) s = x; return s; };

// ---------- events (foley) ----------
const EV = [{ t: T.apart, type: 'lift' }, { t: T.sh - .2, type: 'spread' }, { t: T.eng33 + .2, type: 'label' }, { t: T.thrust, type: 'roar' }, { t: T.lox, type: 'hiss' }, { t: T.ch4, type: 'label' },
  { t: T.raptor - .2, type: 'whoosh' }, { t: T.pre, type: 'label' }, { t: T.pump, type: 'spin' }, { t: T.chamber, type: 'roar' }, { t: T.why, type: 'label' }, { t: T.mars0, type: 'card' },
  { t: T.stage, type: 'roar' }, { t: T.home - .1, type: 'whoosh' }, { t: T.catch - 1.2, type: 'roar' }, { t: T.catch + .3, type: 'hydraulic' }, { t: T.catch + 1.05, type: 'clunk' },
  { t: T.ship - .2, type: 'whoosh' }, { t: T.ship + .2, type: 'spread' }, { t: T.tiles, type: 'label' }, { t: T.flaps, type: 'hydraulic' },
  { t: T.f14 - .2, type: 'whoosh' }, { t: T.f14 + .2, type: 'card' }, { t: T.next, type: 'card' }, { t: T.refuel - .15, type: 'whoosh' }, { t: T.refuel + 1.2, type: 'clunk' }, { t: T.refuel + 1.4, type: 'hiss' },
  { t: T.moon - .1, type: 'whoosh' }, { t: T.mars - .1, type: 'whoosh' }, { t: T.cargo, type: 'land' }, { t: T.city, type: 'pins' }, { t: T.ask - .3, type: 'whoosh' }, { t: T.ask, type: 'card' }, { t: T.card, type: 'card' }];
const SAT_T0 = T.sats - .3, SAT_DT = .38;
for (let i = 0; i < 10; i++) EV.push({ t: +(SAT_T0 + i * SAT_DT).toFixed(2), type: 'sat' });
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- helpers ----------
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const wp = (obj, x, y, z) => obj.localToWorld(V(x, y, z));
function resetShip(s) { s.g.visible = true; s.g.position.set(0, 0, 0); s.g.rotation.set(0, 0, 0); for (const k in s.P) { s.P[k].position.set(0, 0, 0); } s.plumes.forEach(p => { setPlume(p.p, 0, 0); if (p.d) p.d.material = M.core; }); s.flaps.forEach(f => f.rotation.set(0, 0, 0)); s.doorPiv.rotation.x = 0; shipExplode(s, 0); }
function shipExplode(s, k) { for (const n in SOFF) { if (!s.P[n]) continue; const [dy, dr] = SOFF[n]; s.P[n].position.y = dy * k; if (n === 'vac') s.vacBells.forEach(b => { b.position.x = Math.sin(b.userData.a) * (.29 + dr * k); b.position.z = Math.cos(b.userData.a) * (.29 + dr * k); }); if (n.startsWith('flaps')) s.P[n].children.forEach(p => { p.position.x = Math.sign(p.position.x) * ((n === 'flapsA' ? R : R - .06) + dr * k); }); } }
function boosterExplode(k) { for (const n in BOFF) B.P[n].position.y = BOFF[n][0] * k; }
const flick = t => .5 + .5 * Math.sin(t * 23);

// ================= frame =================
O.initOverlay({ VDUR, TL });
window.render = t => {
  const shot = shotAt(t), set = shot.set;
  // visibility per set
  pad.visible = set === 'pad'; rap.visible = set === 'raptor'; earth.visible = set === 'space'; stars.visible = set === 'space' || set === 'moon';
  moonG.visible = set === 'moon'; marsG.visible = set === 'mars'; marsBall.visible = false;
  scene.background = set === 'space' || set === 'moon' ? BG.space : set === 'mars' ? BG.mars : BG.studio;
  B.g.visible = false; S.g.visible = false; TK.g.visible = false; HLS.g.visible = false; MS.forEach(m => m.g.visible = false); sats.forEach(s => s.visible = false); flowBeads.forEach(b => b.visible = false);
  resetShip(S); S.g.visible = false;
  B.g.position.set(0, 0, 0); B.g.rotation.set(0, 0, 0); boosterExplode(0); B.fins.forEach(f => f.rotation.x = 0);
  B.center.forEach(c => setPlume(c.p, 0, t)); B.engPl.forEach(p => setPlume(p, 0, t)); M.bell.emissiveIntensity = 0; M.core.opacity = 0;
  M.vent.color.set('#2a1a12'); B.ventCover.visible = true;
  M.steelFront.opacity = 1; M.steelFront.depthWrite = true; M.lox.opacity = 0; M.ch4.opacity = 0;
  arms.forEach(a => a.piv.rotation.y = -a.s * .9);
  scene.environmentIntensity = .45; key.intensity = 1.8; hemi.intensity = .3;

  if (shot === SH[0]) {
    // full stack on the mount → lifts and explodes the booster; ship slides away
    const lift = eio(seg(t, T.apart - .1, T.apart + 1.4)), ek = pop(seg(t, T.sh - .3, T.sh + 1.0));
    B.g.visible = true; B.g.position.set(3 * lift, Y0 + 4 * lift, 0); boosterExplode(ek);
    S.g.visible = true; S.g.position.set(3 * lift + 5.5 * ek, Y0 + 7.2 + 4 * lift + 1.2 * ek, 0);
    const fk = seg(t, T.tanks - .1, T.tanks + .6);
    M.steelFront.opacity = 1 - .9 * fk; M.steelFront.depthWrite = fk < .05;
    M.lox.opacity = .95 * seg(t, T.lox - .2, T.lox + .3); M.ch4.opacity = .95 * seg(t, T.ch4 - .2, T.ch4 + .3);
    // engines glow on "thrust"
    const g = seg(t, T.thrust - .1, T.thrust + .4) * (1 - seg(t, T.tanks - .3, T.tanks + .1));
    M.bell.emissiveIntensity = .9 * g * (.85 + .15 * flick(t)); M.core.opacity = g;
    B.center.forEach(c => { c.d.visible = g > 0; });
  } else if (set === 'raptor') {
    rap.visible = true; rap.rotation.y = .25 * Math.sin(t * .25);
    const run = seg(t, T.raptor + .2, T.raptor + 1.0);
    spinners.forEach((s, i) => s.rotation.y = t * 9 * (i ? -1 : 1) * run);
    M.preO.emissiveIntensity = M.preF.emissiveIntensity = run * (t > T.pre - .1 && t < T.pump + 1.5 ? .9 + .3 * flick(t) : .25);
    M.core.opacity = run * (t > T.chamber - .2 ? .85 : .35) * (.85 + .15 * flick(t));
    setPlume(rapPlume, seg(t, T.nozzle - .3, T.nozzle + .4), t);
    for (const f of flow) { const u = ((f.i / FLOWN) + t * .16) % 1; f.m.position.copy(curves[f.s].getPointAt(u)); f.m.visible = run > .5; f.m.material.color.set(u > HOT ? '#ff9a4a' : f.s ? '#9be86f' : '#6cc4ff'); }
    exh.forEach((m, i) => { const u = ((i / exh.length) + t * .5) % 1; const a = i * 2.4; m.position.set(Math.sin(a) * .4 * u, 2.6 - u * 5.4, Math.cos(a) * .25 * u - .1); m.material.opacity = run * (1 - u) * .8; m.scale.setScalar(1 + u * 2); m.visible = t > T.chamber - .3; });
    marsBall.visible = t > T.mars0 - .4; marsBall.position.set(1.15, 4.6, .8); marsBall.scale.setScalar(eo(seg(t, T.mars0 - .4, T.mars0 + .4))); marsBall.rotation.y = t * .3;
  } else if (shot === SH[2]) {
    // hot staging in the sky: ship lights through the vented ring, then separates; booster falls back, fins deploy
    B.g.visible = true; S.g.visible = true;
    const ign = seg(t, T.stage + .2, T.stage + .6), sep = ei(seg(t, T.ring - .2, T.home + .2));
    S.g.position.y = 7.2 + 3.2 * sep; B.g.position.y = -1.2 * sep;
    S.plumes.forEach(p => { if (!p.vac) setPlume(p.p, ign * (.25 + .75 * sep) * 1.0, t, 1); });
    B.ventCover.visible = false; M.vent.color.setRGB(1, .45 + .1 * flick(t), .15).multiplyScalar(.2 + 1.6 * ign * (1 - sep * .8));
    B.fins.forEach(f => f.rotation.x = 1.35 * eio(seg(t, T.ring + .3, T.ring + 1.2)));
  } else if (shot === SH[3]) {
    // booster returns to the tower and the arms close
    B.g.visible = true; const d = eio(seg(t, T.home - .1, T.catch + .9));
    B.g.position.y = lerp(CATCHY + 8, CATCHY, 1 - Math.pow(1 - d, 1.6));
    B.fins.forEach(f => f.rotation.x = 1.35);
    const burn = seg(t, T.catch - 2.2, T.catch - 1.8) * (1 - seg(t, T.catch + .7, T.catch + 1.1));
    B.center.forEach((c, i) => setPlume(c.p, burn, t, i)); B.center.forEach(c => c.d.visible = burn > 0); M.core.opacity = burn;
    const close = eio(seg(t, T.catch + .1, T.catch + 1.05)); arms.forEach(a => a.piv.rotation.y = -a.s * .9 * (1 - close));
  } else if (set === 'studio') {
    // ship teardown
    S.g.visible = true; const ek = pop(seg(t, T.ship, T.ship + 1.0)); S.g.position.y = .6; S.g.rotation.y = .15 * Math.sin(t * .3);
    shipExplode(S, ek);
    const fl = seg(t, T.flaps, T.flaps + .4); S.flaps.forEach((f, i) => f.rotation.y = fl * .45 * Math.sin((t - T.flaps) * 4 + i));
    const gl = seg(t, T.slvac, T.slvac + .3) * (1 - seg(t, T.tiles - .2, T.tiles + .2)); M.bell.emissiveIntensity = .8 * gl; M.core.opacity = gl;
  } else if (shot === SH[5]) {
    // orbit: ship tilted over Earth, door opens, satellites slide out
    earth.position.set(0, -44, 14); earth.rotation.set(1.1, t * .01, 0);
    S.g.visible = true; S.g.position.set(-Math.sin(.5) * 2.6, -Math.cos(.5) * 2.6, 0); S.g.rotation.set(0, 0, 0); S.g.rotation.z = -.5; S.g.updateMatrixWorld(true);
    S.doorPiv.rotation.x = -1.2 * eio(seg(t, T.orbit, T.orbit + .8));
    sats.forEach((s, i) => { const t0 = SAT_T0 + i * SAT_DT; if (t < t0) return; s.visible = true; const u = t - t0; const p = wp(S.g, 0, 3.75, -R - .05 - .9 * u); p.x += Math.sin(i * 2.1) * .12 * u; p.y += Math.cos(i * 1.7) * .1 * u; s.position.copy(p); s.rotation.set(.2 * u + i, .5 * i, .1 * u); });
  } else if (shot === SH[6]) {
    // refueling: tanker docks tail-to-tail, propellant flows across
    earth.position.set(0, -46, -18); earth.rotation.set(1.1, t * .01, 0);
    const ax = 1.0;   // axis tilt
    const dock = eio(seg(t, T.refuel - .15, T.refuel + 1.2));
    for (const [s, sign] of [[S, 1], [TK, -1]]) { s.g.visible = true; s.g.rotation.set(0, 0, 0); s.g.rotation.z = sign > 0 ? -ax + Math.PI / 2 - Math.PI / 2 : Math.PI - ax; }
    // ship: tail at origin, nose along +dir; tanker: tail at origin, nose along -dir
    const dir = V(Math.sin(ax), Math.cos(ax), 0);
    S.g.rotation.z = -ax; S.g.position.copy(dir.clone().multiplyScalar(.04)).add(V(0, -.2, 0));
    TK.g.rotation.z = Math.PI - ax; TK.g.position.copy(dir.clone().multiplyScalar(-.04 - 1.2 * (1 - dock))).add(V(0, -.2, 0));
    const fl = seg(t, T.refuel + 1.3, T.refuel + 1.7);
    flowBeads.forEach((b, i) => { b.visible = fl > 0; const u = ((i / flowBeads.length) + t * .35) % 1; b.position.copy(dir.clone().multiplyScalar(lerp(-1.6, 1.6, u))).add(V(0, -.2, .55)); b.scale.setScalar(fl); });
  } else if (set === 'moon') {
    HLS.g.visible = true; resetShip(HLS); HLS.g.position.set(0, .22, 0); HLS.g.rotation.y = .4;
    key.intensity = 2.4; hemi.intensity = .12; scene.environmentIntensity = .35;
  } else if (set === 'mars') {
    const land = [T.mars - .1, T.cargo - .4, T.cargo + .6];
    MS.forEach((m, i) => { m.g.visible = true; resetShip(m); const k = eo(seg(t, land[i], land[i] + 1.3)); const [x, z] = [[-1.2, -.4], [1.3, -1.2], [.1, 1.0]][i]; m.g.position.set(x, .02 + 9 * (1 - k), z); m.g.rotation.y = i;
      m.plumes.forEach(p => { if (!p.vac) setPlume(p.p, (k < 1 ? 1 : 0) * seg(t, land[i], land[i] + .1), t, i); }); });
    domes.forEach((d, i) => { const k = back(seg(t, T.city + i * .12, T.city + i * .12 + .5)); d.visible = k > 0; d.scale.setScalar(Math.max(.001, k)); d.position.set(DOMEP[i][0], 0, DOMEP[i][1]); });
    M.dome.emissiveIntensity = .25 * seg(t, T.city + .5, T.city + 1.2);
  } else {
    // final pad shot: full stack back on the mount
    B.g.visible = true; B.g.position.y = Y0; S.g.visible = true; S.g.position.set(0, Y0 + 7.2, 0);
  }

  // camera
  const [az, el, dist, tx, ty, tz, fov] = shot.tr(t), A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.fov = fov; camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 120; post.dof.maxCoc = 6;
  const la = A - .9; key.position.set(tx + 14 * Math.sin(la), ty + 16, tz + 14 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 12 * Math.sin(A + Math.PI * .85), ty + 4, tz + 12 * Math.cos(A + Math.PI * .85)); rim.target.position.set(tx, ty, tz);
  if (set === 'space') { key.position.set(tx + 20, ty + 6, tz + 6); key.intensity = 2.6; hemi.intensity = .08; scene.environmentIntensity = .3; }
  scene.updateMatrixWorld(true);
  post.composer.render();
  drawMarks(t, shot);
};
const pop = x => 1 - Math.pow(1 - ss(x), 3);
const back = (x, s = 1.6) => { x = clamp(x); if (x <= 0) return 0; x -= 1; return 1 + x * x * ((s + 1) * x + s); };

// ================= overlay =================
const { MONO, SANS, INK, DIM, ACC } = O;
function drawMarks(t, shot) {
  O.begin(camera, W, H);
  const P = v => O.proj(v);
  if (shot === SH[0]) {
    O.card(t, [{ id: 't1', font: `800 120px ${SANS}`, col: INK, text: 'STARSHIP', y: 290, d: .05 }, { id: 't2', font: `600 36px ${MONO}`, col: ACC, text: 'SUPER HEAVY + SHIP · TAKEN APART', y: 350, d: .25 }, { id: 'tag', font: `500 26px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · SCHEMATIC MODEL', y: 400, d: .4 }], 0, T.tall - .1);
    // height dimension
    if (t > T.tall - .2 && t < T.apart + .3) { const a = P(V(0, Y0 + 12.45, 0)), b = P(V(0, Y0, 0)); O.dimLine(t, a[0] - 110, a[1], b[1], '≈ 124 m · 408 ft', T.tall + .2, T.apart + .3); }
    O.label(t, { id: 'shp', t0: T.tall + .5, t1: T.apart + .3, a: P(wp(S.g, .3, 2.5, 0)), ly: 560, idx: 'STAGE 2', name: 'Ship', spec: '6 Raptors', side: 'R', lx: 640 });
    O.label(t, { id: 'shb', t0: T.tall + .7, t1: T.apart + .3, a: P(wp(B.g, .3, 3.5, 0)), ly: 1100, idx: 'STAGE 1', name: 'Super Heavy', spec: '33 Raptors', side: 'R', lx: 640 });
    O.label(t, { id: 'sh', t0: T.sh + .9, t1: T.eng33 - .1, a: P(wp(B.g, .35, 3.0, 0)), ly: 700, idx: 'STAGE 1 · V3', name: 'Super Heavy', spec: 'booster · ~72 m tall', side: 'R', lx: 640 });
    O.label(t, { id: 'e33', t0: T.eng33 + .8, t1: T.tanks - .3, a: P(wp(B.P.eng, .375, 0, 0)), ly: 620, idx: '01', name: '33 Raptor engines', spec: '3 center · 10 inner · 20 outer', side: 'R', lx: 120 });
    O.card(t, [{ id: 'th1', font: `800 92px ${SANS}`, col: ACC, text: '18,000,000+ lbf', y: 290, d: 0 }, { id: 'th2', font: `500 30px ${MONO}`, col: INK, text: 'LIFTOFF THRUST · SPACEX V3 FIGURE', y: 345, d: .2 }], T.thrust, T.tanks - .2);
    O.label(t, { id: 'ss', t0: T.tanks + .5, t1: T.raptor, a: P(wp(B.P.lox, -.44, 2.6, .1)), ly: 520, idx: '02', name: 'Stainless-steel hull', spec: 'the tank walls are the body', side: 'L', lx: 1000 });
    O.label(t, { id: 'lx', t0: T.lox + .2, t1: T.raptor, a: P(wp(B.P.lox, .1, 2.0, .3)), ly: 1150, idx: '03', name: 'Liquid oxygen', spec: 'LOX · boils at −183 °C', side: 'R', lx: 620, idxCol: O.BLUE });
    O.label(t, { id: 'ch', t0: T.ch4 + .1, t1: T.raptor, a: P(wp(B.P.ch4, .1, 5.4, .3)), ly: 760, idx: '04', name: 'Liquid methane', spec: 'CH₄ · boils at −162 °C', side: 'R', lx: 620, idxCol: O.GREEN });
  } else if (shot.set === 'raptor') {
    O.card(t, [{ id: 'r1', font: `800 78px ${SANS}`, col: INK, text: 'RAPTOR ENGINE', y: 270, d: 0 }, { id: 'r2', font: `600 32px ${MONO}`, col: ACC, text: 'FULL-FLOW STAGED COMBUSTION', y: 325, d: .3 }], T.raptor, T.why - .1);
    O.legend(t, [[O.BLUE, 'oxygen'], [O.GREEN, 'methane'], ['#ff9a4a', 'hot gas']], 395, T.ffsc + .2, T.why - .1);
    const L = (x, y, z) => P(rap.localToWorld(V(x, y, z)));
    O.label(t, { id: 'po', t0: T.pre + .1, t1: T.pump + .2, a: L(-PX, 3.85, .17), ly: 560, idx: 'O₂-RICH', name: 'Preburner', spec: 'burns a little fuel', side: 'R', lx: 640, idxCol: O.BLUE });
    O.label(t, { id: 'pf', t0: T.pre + .4, t1: T.pump + .2, a: L(PX, 3.85, .17), ly: 1180, idx: 'FUEL-RICH', name: 'Preburner', spec: 'burns a little oxygen', side: 'L', lx: 1000, idxCol: O.GREEN });
    O.label(t, { id: 'tp', t0: T.pump + .3, t1: T.chamber - .05, a: L(PX, 3.0, .27), ly: 560, idx: '×2', name: 'Turbopumps', spec: 'hot gas spins the turbine', side: 'L', lx: 1000 });
    O.label(t, { id: 'cc', t0: T.chamber + .2, t1: T.nozzle + .1, a: L(0, 2.4, 0), ly: 1180, idx: 'ALL PROPELLANT', name: 'Combustion chamber', spec: 'nothing dumped overboard', side: 'R', lx: 120 });
    O.label(t, { id: 'nz', t0: T.nozzle + .3, t1: T.why - .1, a: L(.7, .6, 0), ly: 1180, idx: 'EXIT', name: 'Nozzle', spec: 'thrust', side: 'L', lx: 1000 });
    O.card(t, [{ id: 'm1', font: `800 92px ${SANS}`, col: INK, text: 'WHY METHANE?', y: 290, d: 0 }], T.why - .05, T.stage);
    O.card(t, [{ id: 'm2', font: `700 44px ${SANS}`, col: INK, text: 'Burns cleaner than kerosene', y: 380, d: 0 }, { id: 'm3', font: `400 28px ${MONO}`, col: DIM, text: 'less soot (coking) → easier reuse', y: 428, d: .2 }], T.clean, T.stage);
    O.card(t, [{ id: 'm4', font: `700 44px ${SANS}`, col: ACC, text: 'Makeable on Mars', y: 1150, d: 0 }, { id: 'm5', font: `500 30px ${MONO}`, col: INK, text: 'CO₂ + H₂O → CH₄ + O₂ · SpaceX plan', y: 1200, d: .2 }], T.mars0 + .2, T.stage);
  } else if (shot === SH[2]) {
    O.card(t, [{ id: 'hs', font: `800 72px ${SANS}`, col: INK, text: 'HOT STAGING', y: 290, d: 0 }, { id: 'hs2', font: `500 28px ${MONO}`, col: DIM, text: 'SHIP ENGINES LIGHT BEFORE SEPARATION', y: 340, d: .2 }], T.stage, T.home);
    O.label(t, { id: 'vr', t0: T.ring + .1, t1: T.home, a: P(wp(B.g, .44, 7.0, .05)), ly: 1150, idx: '05', name: 'Hot-staging ring', spec: 'vents the ship’s exhaust', side: 'L', lx: 960 });
  } else if (shot === SH[3]) {
    O.label(t, { id: 'gf', t0: T.home + .3, t1: T.catch + .2, a: P(wp(B.fins[0].parent, 0, .1, .15)), ly: 560, idx: '06', name: 'Grid fins', spec: 'steer it home', side: 'R', lx: 640 });
    O.card(t, [{ id: 'c1', font: `800 70px ${SANS}`, col: ACC, text: 'CAUGHT BY THE TOWER', y: 290, d: 0 }, { id: 'c2', font: `500 28px ${MONO}`, col: INK, text: 'FIRST CATCH · FLIGHT 5 · OCT 13, 2024', y: 340, d: .25 }], T.catch + 1.0, T.ship - .1);
  } else if (shot.set === 'studio') {
    O.card(t, [{ id: 's1', font: `800 78px ${SANS}`, col: INK, text: 'THE SHIP', y: 280, d: 0 }, { id: 's2', font: `500 28px ${MONO}`, col: DIM, text: 'STAGE 2 · ~52 m', y: 330, d: .2 }], T.ship, T.slvac);
    const L = (o, x, y, z) => P(o.localToWorld(V(x, y, z)));
    O.label(t, { id: 'sl', t0: T.slvac + .1, t1: T.tiles - .2, a: L(S.P.sl, 0, .1, .1), ly: 560, idx: '×3', name: 'Sea-level Raptors', spec: 'gimbal to steer', side: 'L', lx: 1000 });
    O.label(t, { id: 'vc', t0: T.slvac + .45, t1: T.tiles - .2, a: L(S.vacBells[2], 0, .1, .12), ly: 1180, idx: '×3', name: 'Raptor Vacuum', spec: 'big nozzles for space', side: 'R', lx: 80 });
    O.label(t, { id: 'tl', t0: T.tiles + .4, t1: T.f14, a: L(S.P.tank, .15, 2.0, R), ly: 1180, idx: '07', name: 'Heat-shield tiles', spec: 'thousands of hex tiles', side: 'L', lx: 1000 });
    O.label(t, { id: 'fl', t0: T.flaps + .2, t1: T.f14, a: L(S.flaps[1], .15, .5, 0), ly: 560, idx: '08', name: 'Flaps', spec: '2 forward · 2 aft', side: 'L', lx: 1000 });
  } else if (shot === SH[5]) {
    O.card(t, [{ id: 'o1', font: `800 84px ${SANS}`, col: INK, text: 'FLIGHT 14', y: 280, d: 0 }, { id: 'o2', font: `500 30px ${MONO}`, col: ACC, text: 'SEP 28, 2026 · FIRST TIME IN ORBIT', y: 332, d: .2 }, { id: 'o3', font: `500 30px ${MONO}`, col: INK, text: '26 STARLINK V3 SATELLITES DEPLOYED', y: 380, d: .9 }], T.f14, T.next + .2);
    O.label(t, { id: 'pb', t0: T.bay, t1: T.next + .2, a: P(wp(S.g, 0, 3.75, -R)), ly: 1170, idx: '09', name: 'Payload bay', spec: 'satellites slide out a slot', side: 'R', lx: 100 });
    O.pill(t, 'NEXT · SPACEX SAYS', 470, T.next, T.refuel);
  } else if (shot === SH[6] || shot.set === 'moon' || shot.set === 'mars') {
    O.pill(t, 'PLANNED · NOT DONE YET', 200, shot === SH[6] ? T.refuel - .15 : shot.t0, T.ask - .3);
    if (shot === SH[6]) O.card(t, [{ id: 'f1', font: `800 72px ${SANS}`, col: INK, text: 'ORBITAL REFUELING', y: 300, d: 0 }, { id: 'f2', font: `500 28px ${MONO}`, col: DIM, text: 'TANKER → SHIP · NASA EXPECTS A DEMO ~2027', y: 350, d: .25 }], T.refuel - .15, T.moon);
    if (shot.set === 'moon') O.card(t, [{ id: 'n1', font: `800 72px ${SANS}`, col: INK, text: 'STARSHIP HLS', y: 300, d: 0 }, { id: 'n2', font: `500 28px ${MONO}`, col: DIM, text: 'MOON LANDER FOR NASA’S ARTEMIS', y: 350, d: .25 }], T.moon - .1, T.mars);
    if (shot.set === 'mars') {
      O.card(t, [{ id: 'a1', font: `800 92px ${SANS}`, col: ACC, text: 'MARS', y: 300, d: 0 }, { id: 'a2', font: `500 28px ${MONO}`, col: INK, text: 'SPACEX’S STATED GOAL', y: 350, d: .25 }], T.mars - .1, T.ask - .3);
      O.legend(t, [[ACC, 'cargo'], [INK, 'crews'], ['#ffcf8a', 'a city']], 420, T.cargo, T.ask - .3);
    }
  } else {
    O.card(t, [{ id: 'q1', font: `800 76px ${SANS}`, col: INK, text: 'WHAT SHOULD WE', y: 280, d: 0 }, { id: 'q2', font: `800 76px ${SANS}`, col: ACC, text: 'TAKE APART NEXT?', y: 365, d: .15 }], T.ask - .1, T.congrats - .05);
    O.card(t, [{ id: 'e1', font: `800 92px ${SANS}`, col: ACC, text: 'CONGRATS!', y: 280, d: 0 }, { id: 'e2', font: `700 44px ${SANS}`, col: INK, text: 'You’ve discovered the rocket built for Mars', y: 350, d: .3 }, { id: 'e3', font: `500 26px ${MONO}`, col: DIM, text: 'SCHEMATIC MODEL · SOURCES IN CAPTION', y: 405, d: .6 }], T.congrats, 99);
  }
  O.captions(t);
}
window.TEXTS = () => O.overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
