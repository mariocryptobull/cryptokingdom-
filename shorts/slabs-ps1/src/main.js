// How A Turbo Works — PS1-style short, 1080×1920 (rendered at 360×640, upscaled with hard pixels). render(t) is pure.
// Look: unlit-ish low-poly, nearest-filtered tiny textures, vertex snapping, affine texture warp, ordered dither + 15-bit colour.
import * as THREE from 'three';
import { clamp, lerp, seg, ss, eio, eo, track } from '/core/lib.js';
import { initOverlay, drawOverlay, overlayTexts, makeCues } from './overlay.js';

const RW = 270, RH = 480, W = 1080, HH = 1920;   // PS1-ish internal resolution, shown at exactly 4×
const Q = new URLSearchParams(location.search);
const TL = await (await fetch('timeline.json')).json();
const VDUR = await (await fetch('voice/dur.json')).json();
const DUR = TL.dur;
const CUES = makeCues(TL, VDUR);
const cue = (id, i) => CUES.find(c => c.id === id && c.i === i).t0 + .04;
const T = {
  rain: .4, cat: cue('v01', 3), trib: cue('v02', 2), ratio: cue('v03', 1), oneNum: cue('v04', 0), oneWay: cue('v04', 2),
  across: cue('v05', 0), uniform: cue('v05', 4), squish: cue('v06', 0), twoNum: cue('v06', 1), twoWay: cue('v06', 3),
  lines: cue('v07', 0), flow4: cue('v07', 2), tri: cue('v08', 0), trap: cue('v08', 1), same: cue('v09', 0), sum: cue('v10', 0), follow: cue('v11', 0),
};
window.T = T;

// ---------- renderer ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, HH, false);
const rt = new THREE.WebGLRenderTarget(RW, RH, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;   // textures and colours are authored as display values
const scene = new THREE.Scene(); scene.background = new THREE.Color('#1b1d24');
const camera = new THREE.PerspectiveCamera(52, RW / RH, .05, 60);

// ---------- CRT / composite pass (output resolution) ----------
const crt = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false,
  uniforms: { tSrc: { value: null }, res: { value: new THREE.Vector2(RW, RH) }, time: { value: 0 } },
  vertexShader: `out vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `out vec4 o; in vec2 vUv; uniform sampler2D tSrc; uniform vec2 res; uniform float time;
    vec3 px(vec2 uv){ return texture(tSrc, (floor(uv * res) + .5) / res).rgb; }
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + time * 7.0) * 43758.5453); }
    void main(){
      vec2 c = vUv - .5; c *= 1.0 + .028 * dot(c * vec2(1.0, 1.78), c * vec2(1.0, 1.78));   // mild tube curvature
      vec2 uv = c + .5;
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }
      float dx = .4 / res.x;
      vec3 col = vec3(px(uv + vec2(dx, 0.0)).r, px(uv).g, px(uv - vec2(dx, 0.0)).b);       // composite colour bleed
      col = mix(col, (px(uv - vec2(1.0 / res.x, 0.0)) + px(uv + vec2(1.0 / res.x, 0.0))) * .5, .12);
      float line = mod(gl_FragCoord.y, 4.0) < 1.0 ? .84 : 1.0;                              // one dark output row per source row
      col *= line;
      col *= 1.0 - .35 * smoothstep(.35, .78, length(c * vec2(1.0, .8)));                   // vignette
      col += (h(floor(gl_FragCoord.xy / 2.0)) - .5) * .045;                                  // grain
      o = vec4(col, 1.0);
    }`,
}));
const crtScene = new THREE.Scene(); crtScene.add(crt); const crtCam = new THREE.Camera();

// ---------- PS1 material ----------
const LIGHT = new THREE.Vector3(-.45, .8, .55).normalize();
const SHARED = { uLight: { value: LIGHT }, uFogC: { value: new THREE.Color('#1b1d24') }, uFog: { value: new THREE.Vector2(7.5, 16) }, uBulb: { value: new THREE.Vector3(.4, 3.4, -.6) } };
const VS = `
uniform vec3 uLight; uniform float uAmb; uniform vec2 uFog; uniform vec3 uBulb; uniform vec2 uRep;
out vec3 vUvW; out float vShade; out float vFog;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec4 p = projectionMatrix * mv;
  vec2 grid = vec2(${RW}.0, ${RH}.0);
  p.xy = floor(p.xy / p.w * grid + .5) / grid * p.w;          // vertex snapping (wobble)
  gl_Position = p;
  vUvW = vec3(uv * uRep * p.w, p.w);                                 // affine texture warp (PS1 had no perspective correction)
  vec3 n = normalize(mat3(modelMatrix) * normal);
  vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
  vec3 tb = uBulb - wp; float db = length(tb);
  float bulb = max(dot(n, tb / db), 0.0) * 1.6 / (1.0 + db * db * .35);
  float ground = mix(.62, 1.0, clamp(wp.y / 1.1, 0.0, 1.0));      // baked contact darkening near the floor
  vShade = (uAmb + (1.0 - uAmb) * max(dot(n, uLight), 0.0) * .8 + bulb * .5) * ground;
  vFog = clamp((-mv.z - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0);
}`;
const FS = `
out vec4 fragOut;
uniform sampler2D map; uniform float useMap; uniform vec3 color; uniform vec3 emissive; uniform vec3 uFogC; uniform float opacity;
in vec3 vUvW; in float vShade; in float vFog;
float bayer(vec2 p){ int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0)); int i = x + y * 4;
  int b[16] = int[16](0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5); return float(b[i]) / 16.0 - .5; }
void main(){
  vec2 vUv = vUvW.xy / vUvW.z;
  vec4 tx = useMap > .5 ? texture(map, vUv) : vec4(1.0);
  if (tx.a < .5) discard;
  vec3 c = tx.rgb * color * vShade + emissive;
  c = mix(c, uFogC, vFog);
  c += bayer(gl_FragCoord.xy) / 24.0;                          // ordered dither
  c = floor(c * 31.0 + .5) / 31.0;                             // 15-bit colour
  fragOut = vec4(c, opacity);
}`;
function psx({ map = null, color = '#ffffff', emissive = '#000000', amb = .45, transparent = false, opacity = 1, side = THREE.FrontSide } = {}) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: FS, transparent, side, depthWrite: !transparent,
    uniforms: { ...SHARED, map: { value: map }, useMap: { value: map ? 1 : 0 }, uRep: { value: map ? map.repeat.clone() : new THREE.Vector2(1, 1) }, color: { value: new THREE.Color(color) }, emissive: { value: new THREE.Color(emissive) }, uAmb: { value: amb }, opacity: { value: opacity } },
  });
}

// ---------- tiny procedural textures (nearest-filtered) ----------
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function tex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const id = g.getImageData(0, 0, w, h), d = id.data, L = 12;   // posterize: ~6 levels per channel, like hand-reduced PS1 textures
  for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] / 255 * (L - 1)) / (L - 1) * 255;
  g.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.colorSpace = THREE.NoColorSpace; return t;
}
const noiseFill = (g, w, h, base, amt) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = (rnd() - .5) * amt; g.fillStyle = `rgb(${base[0] + v},${base[1] + v},${base[2] + v})`; g.fillRect(x, y, 1, 1); } };
const TX = {
  wall: tex(16, 16, (g, w, h) => { noiseFill(g, w, h, [96, 102, 116], 14); g.fillStyle = '#d8dce4'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); }, [28, 18]),
  floor: tex(16, 16, (g, w, h) => { noiseFill(g, w, h, [78, 98, 86], 26); for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(30,40,34,${rnd() * .5})`; g.fillRect(rnd() * w, rnd() * h, 2, 1); } g.fillStyle = '#b7bdb2'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); }, [20, 20]),
  concrete: tex(16, 16, (g, w, h) => { noiseFill(g, w, h, [158, 156, 150], 30); for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(90,88,84,.6)'; g.fillRect(rnd() * w, rnd() * h, 1, 1); } }, [6, 18]),
  crate: tex(32, 32, (g, w, h) => { noiseFill(g, w, h, [142, 104, 62], 30); g.fillStyle = '#5b3d1f'; for (const y of [0, 15, 30]) g.fillRect(0, y, w, 2); g.fillRect(0, 0, 2, h); g.fillRect(30, 0, 2, h); }),
  iron: tex(16, 16, (g, w, h) => { noiseFill(g, w, h, [88, 70, 60], 40); }),
  alu: tex(16, 16, (g, w, h) => { noiseFill(g, w, h, [190, 194, 200], 26); }),
  bronze: tex(16, 16, (g, w, h) => { noiseFill(g, w, h, [178, 134, 66], 30); }),
  block: tex(32, 32, (g, w, h) => { noiseFill(g, w, h, [128, 132, 140], 22); g.fillStyle = '#2b2c30'; g.fillRect(0, 30, w, 2); }),
  ic: tex(32, 32, (g, w, h) => { g.fillStyle = '#2a2e34'; g.fillRect(0, 0, w, h); g.fillStyle = '#8c939b'; for (let x = 0; x < w; x += 2) g.fillRect(x, 0, 1, h); g.fillStyle = '#4b5058'; for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 1); }),
  fur: tex(16, 16, (g, w, h) => { noiseFill(g, w, h, [214, 128, 52], 26); g.fillStyle = '#9a4d18'; for (let y = 1; y < h; y += 4) for (let x = 0; x < w; x++) if (Math.sin(x * .7 + y) > .2) g.fillRect(x, y, 1, 2); }),
  belly: tex(16, 16, (g, w, h) => { noiseFill(g, w, h, [214, 128, 52], 26); g.fillStyle = '#f2ece2'; g.beginPath(); g.ellipse(8, 10, 5, 7, 0, 0, 7); g.fill(); }),
  white: tex(8, 8, (g, w, h) => noiseFill(g, w, h, [238, 232, 222], 14)),
};
function faceTex(blink, wide) {
  return tex(32, 32, (g) => {
    noiseFill(g, 32, 32, [214, 128, 52], 22);
    g.fillStyle = '#8f4512'; g.fillRect(13, 2, 2, 7); g.fillRect(17, 2, 2, 7); g.fillRect(10, 4, 2, 5); g.fillRect(20, 4, 2, 5);   // M stripes
    g.fillStyle = '#f2ece2'; g.beginPath(); g.ellipse(16, 24, 10, 8, 0, 0, 7); g.fill();
    if (blink) { g.fillStyle = '#111'; g.fillRect(7, 15, 6, 1); g.fillRect(19, 15, 6, 1); }
    else { const r = wide ? 4 : 3.2; g.fillStyle = '#111'; g.beginPath(); g.arc(10, 15, r, 0, 7); g.arc(22, 15, r, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(11, 13, 2, 2); g.fillRect(23, 13, 2, 2); }
    g.fillStyle = '#e88a96'; g.fillRect(15, 20, 3, 2); g.fillStyle = '#3a2418'; g.fillRect(16, 22, 1, 2); g.fillRect(14, 24, 2, 1); g.fillRect(17, 24, 2, 1);
  });
}
const FACE = { open: faceTex(false, false), blink: faceTex(true, false), wide: faceTex(false, true) };

const M = {
  wall: psx({ map: TX.wall, amb: .7 }), floor: psx({ map: TX.floor, amb: .7 }), crate: psx({ map: TX.crate }),
  iron: psx({ map: TX.iron }), alu: psx({ map: TX.alu }), bronze: psx({ map: TX.bronze }), block: psx({ map: TX.block }), ic: psx({ map: TX.ic, amb: .6 }),
  steel: psx({ color: '#b8bcc2' }), concrete: psx({ map: TX.concrete, amb: .6 }), beam: psx({ color: '#3d6fa8' }), col: psx({ color: '#2d4f78' }), dark: psx({ color: '#33363c' }), pipe: psx({ color: '#c3cad2', transparent: true, opacity: .42, amb: .7 }), pipeHot: psx({ color: '#a8705a', transparent: true, opacity: .5, amb: .7 }),
  fur: psx({ map: TX.fur, amb: .55 }), belly: psx({ map: TX.belly, amb: .55 }), white: psx({ map: TX.white, amb: .6 }), face: psx({ map: FACE.open, amb: .6 }),
  pink: psx({ color: '#e88a96' }), shadow: psx({ color: '#000000', transparent: true, opacity: .45, amb: 1 }),
  exh: psx({ color: '#000', emissive: '#ff6a2a', amb: 0 }), airHot: psx({ color: '#000', emissive: '#ffb04a', amb: 0 }), airCold: psx({ color: '#000', emissive: '#59d4ff', amb: 0 }),
  flame: psx({ color: '#000', emissive: '#ffcf4a', amb: 0, transparent: true, opacity: 1 }),
};
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };
const boxM = (sx, sy, sz, m, x, y, z) => mesh(new THREE.BoxGeometry(sx, sy, sz), m, x, y, z);
const cyl = (r1, r2, h, m, x, y, z, s = 8) => mesh(new THREE.CylinderGeometry(r1, r2, h, s), m, x, y, z);

// ---------- room: a tiled corner ----------
{
  const back = mesh(new THREE.PlaneGeometry(16, 10, 12, 8), M.wall, 0, 5, -4.6); scene.add(back);
  const left = mesh(new THREE.PlaneGeometry(16, 10, 12, 8), M.wall, -3.4, 5, 0); left.rotation.y = Math.PI / 2; scene.add(left);
  const fl = mesh(new THREE.PlaneGeometry(16, 16, 12, 12), M.floor, 0, 0, 0); fl.rotation.x = -Math.PI / 2; scene.add(fl);
}
{
  scene.add(boxM(16, .14, .04, psx({ color: '#3a3430' }), 0, .07, -4.57)); const bb = boxM(.04, .14, 16, psx({ color: '#3a3430' }), -3.37, .07, 0); scene.add(bb);
  scene.add(cyl(.008, .008, .9, psx({ color: '#111' }), .4, 3.85, -.6, 4), mesh(new THREE.IcosahedronGeometry(.08, 0), psx({ color: '#000', emissive: '#fff2c4', amb: 0 }), .4, 3.4, -.6));
}
// ---------- the slab system: frame + slab + tributary regions + load bars (long axis = Z, short = X) ----------
const H = 1.2, P0 = new THREE.Vector3(0, H, -.6);          // slab centre; 1 unit = 3 ft
const LONG0 = 6, SHORT0 = 2, LONG1 = 4, SHORT1 = 3;        // 18×6 ft → 12×9 ft
const frame = new THREE.Group(); frame.position.set(P0.x, 0, P0.z); scene.add(frame);
const cols = [...Array(4)].map(() => { const c = boxM(.16, H, .16, M.col, 0, H / 2, 0); frame.add(c); return c; });
const longB = [0, 1].map(() => { const b = boxM(1, .2, .16, M.beam, 0, H - .1, 0); frame.add(b); return b; });
const shortB = [0, 1].map(() => { const b = boxM(.16, .2, 1, M.beam, 0, H - .1, 0); frame.add(b); return b; });
const slab = boxM(1, .08, 1, M.concrete, 0, H + .04, 0); frame.add(slab);
const LONGC = '#59d4ff', SHORTC = '#ffd23f';
const regMat = c => psx({ color: '#000', emissive: c, amb: 0, transparent: true, opacity: .5, side: THREE.DoubleSide });
function polyMesh(mat) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12 * 3), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(12 * 3).map((_, i) => i % 3 === 1 ? 1 : 0), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(12 * 2), 2)); const m = new THREE.Mesh(g, mat); m.frustumCulled = false; frame.add(m); return m; }
const regions = { longA: polyMesh(regMat(LONGC)), longB: polyMesh(regMat(LONGC)), shortA: polyMesh(regMat(SHORTC)), shortB: polyMesh(regMat(SHORTC)) };
function setPoly(m, pts, y) {   // pts: [[x,z],...] convex, fan-triangulated
  const a = m.geometry.attributes.position.array; a.fill(0); let k = 0;
  for (let i = 1; i < pts.length - 1; i++) for (const p of [pts[0], pts[i], pts[i + 1]]) { a[k++] = p[0]; a[k++] = y; a[k++] = p[1]; }
  m.geometry.attributes.position.needsUpdate = true;
}
const lineMat = psx({ color: '#000', emissive: '#ffffff', amb: 0 });
const diag = [...Array(5)].map(() => { const l = boxM(.035, .02, 1, lineMat, 0, H + .1, 0); frame.add(l); return l; });
// load bars along each beam (blocky load diagram)
const NB = 14, barMat = { long: psx({ color: '#000', emissive: LONGC, amb: 0 }), short: psx({ color: '#000', emissive: SHORTC, amb: 0 }) };
const bars = { longA: [], longB: [], shortA: [], shortB: [] };
for (const k of Object.keys(bars)) for (let i = 0; i < NB; i++) { const b = boxM(1, 1, 1, k.startsWith('long') ? barMat.long : barMat.short, 0, 0, 0); frame.add(b); bars[k].push(b); }
// load rain + flow particles
const NP = 60, rainMat = psx({ color: '#000', emissive: '#ff6a3d', amb: 0 });
const parts = [...Array(NP)].map((_, i) => { const m = boxM(.07, .07, .07, rainMat, 0, -9, 0); frame.add(m); return { m, fx: ((i * .6180339) % 1) - .5, fz: ((i * .41421356 + .17) % 1) - .5, ph: (i * .7548776) % 1 }; });
const flowMats = { long: psx({ color: '#000', emissive: LONGC, amb: 0 }), short: psx({ color: '#000', emissive: SHORTC, amb: 0 }), rain: rainMat };

// ---------- the cat ----------
const cat = new THREE.Group(); cat.position.set(-.45, 0, -.85); cat.rotation.y = .35; scene.add(cat);
const body = new THREE.Group(); cat.add(body);
body.add(mesh(new THREE.BoxGeometry(.44, .52, .34), [M.fur, M.fur, M.fur, M.fur, M.belly, M.fur], 0, .38, 0));
const head = new THREE.Group(); head.position.set(0, .78, .02); body.add(head);
head.add(mesh(new THREE.BoxGeometry(.48, .4, .38), [M.fur, M.fur, M.fur, M.fur, M.face, M.fur], 0, 0, 0));
for (const s of [-1, 1]) { const e = mesh(new THREE.ConeGeometry(.1, .17, 4), M.fur, s * .15, .26, 0); e.rotation.y = Math.PI / 4; head.add(e); const i = mesh(new THREE.ConeGeometry(.05, .1, 4), M.pink, s * .15, .25, .045); i.rotation.y = Math.PI / 4; head.add(i); }
const pawL = new THREE.Group(), pawR = new THREE.Group(); pawL.position.set(-.12, .3, .16); pawR.position.set(.12, .3, .16); body.add(pawL, pawR);
for (const p of [pawL, pawR]) { p.add(boxM(.11, .3, .11, M.fur, 0, -.15, 0)); p.add(boxM(.13, .07, .15, M.white, 0, -.3, .02)); }
for (const s of [-1, 1]) body.add(boxM(.14, .12, .2, M.white, s * .15, .06, .12));
const tail = []; { let par = body; for (let i = 0; i < 5; i++) { const g = new THREE.Group(); g.position.set(i ? 0 : .12, i ? .1 : .12, i ? 0 : -.18); g.add(boxM(.07, .11, .07, M.fur, 0, .05, 0)); par.add(g); tail.push(g); par = g; } }
const shadow = mesh(new THREE.CircleGeometry(.32, 8), M.shadow, 0, .005, 0); shadow.rotation.x = -Math.PI / 2; cat.add(shadow);

cat.position.set(P0.x + .1, H + .08, P0.z + 1.2); cat.rotation.y = .15; cat.scale.setScalar(.95);

// ---------- motion ----------
const squishK = t => eio(seg(t, T.squish + .3, T.squish + 2.2));
const twK = t => eo(seg(t, T.lines, T.lines + 2.0));             // 45° lines grow: one-way strips become triangles + trapezoids
const lookAt = x => x < T.squish ? .1 : -.15;
function chaosSpin(t) { let a = 0; const n = Math.floor(t * 12); for (let k = 0; k <= n; k++) { const x = k / 12; a += lookAt(x) * ss(seg(x, 1, 2)) + Math.sin(x * .9) * .06; } return a; }
const flowOn = t => seg(t, T.across - .3, T.across + .3);
const regOn = t => seg(t, T.trib - .2, T.trib + .3);
const barsOn = t => eo(seg(t, T.uniform - .6, T.uniform + .4));

// ---------- camera: [t, px, py, pz, tx, ty, tz] ----------
const CAMK = [
  [0.0, .5, 2.75, 3.6, .1, 1.75, .5],
  [5.4, .6, 2.85, 3.4, .1, 1.7, .4],
  [T.trib - .6, 3.2, 5.3, 4.8, 0, 1.0, -.6],
  [T.ratio, .6, 7.6, 2.8, 0, 1.0, -.7],
  [T.oneWay + .8, .6, 7.6, 2.6, 0, 1.0, -.7],
  [T.across + .8, 3.8, 3.3, 3.2, 0, 1.3, -.7],
  [T.squish - .2, 3.6, 3.4, 3.4, 0, 1.3, -.7],
  [T.squish + .6, 1.2, 2.9, 3.0, .05, 1.65, .35],
  [T.twoNum, 1.0, 7.2, 2.6, 0, 1.0, -.6],
  [T.flow4 + .6, .9, 7.4, 2.4, 0, 1.0, -.6],
  [T.tri + .2, 3.6, 3.3, 3.2, 0, 1.4, -.6],
  [T.same + .2, -3.4, 3.5, 2.8, 0, 1.3, -.6],
  [T.sum, 2.8, 4.9, 4.4, 0, 1.0, -.6],
  [T.follow, .4, 2.7, 3.1, .1, 1.75, .45],
  [DUR, .3, 2.65, 2.9, .1, 1.72, .5],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) { const [px, py, pz, tx, ty, tz] = camTrack(t); const j = .005; camera.position.set(px + Math.sin(t * 13) * j, py + Math.sin(t * 11) * j, pz); camera.lookAt(tx, ty, tz); }

// ---------- events ----------
const EV = [{ t: T.rain, type: 'rain' }, { t: T.trib, type: 'trib' }, { t: T.oneWay, type: 'stamp' }, { t: T.across, type: 'flow' }, { t: T.uniform - .4, type: 'bars' },
  { t: T.squish + .3, type: 'squish' }, { t: T.twoWay, type: 'stamp' }, { t: T.lines, type: 'lines' }, { t: T.tri, type: 'bars' }, { t: T.trap, type: 'bars' }, { t: T.follow + 1.6, type: 'card' }];
for (const lt of [T.ratio, T.uniform, T.tri + .1, T.trap + .1]) EV.push({ t: +lt.toFixed(2), type: 'label' });
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay(CUES);
window.render = (t) => {
  const sq = squishK(t), L = lerp(LONG0, LONG1, sq), S = lerp(SHORT0, SHORT1, sq), tw = twK(t);
  // frame members
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) => cols[i].position.set(sx * S / 2, H / 2, sz * L / 2));
  longB.forEach((b, i) => { b.scale.set(1, 1, L); b.position.set((i ? 1 : -1) * S / 2, H - .1, 0); b.geometry = b.geometry; });
  shortB.forEach((b, i) => { b.scale.set(S, 1, 1); b.position.set(0, H - .1, (i ? 1 : -1) * L / 2); });
  longB.forEach(b => { b.scale.set(1, 1, 1); b.geometry.dispose(); b.geometry = new THREE.BoxGeometry(.16, .2, L); });
  shortB.forEach(b => { b.scale.set(1, 1, 1); b.geometry.dispose(); b.geometry = new THREE.BoxGeometry(S, .2, .16); });
  slab.scale.set(S, 1, L);
  // tributary regions: "long" beams run along Z at x = ±S/2. Ridge half-length r goes from L/2 (one-way) to L/2 − S/2 (two-way)
  const r = lerp(L / 2, L / 2 - S / 2, tw), y = H + .09, ro = regOn(t);
  setPoly(regions.longA, [[-S / 2, -L / 2], [-S / 2, L / 2], [0, r], [0, -r]], y);
  setPoly(regions.longB, [[S / 2, -L / 2], [0, -r], [0, r], [S / 2, L / 2]], y);
  setPoly(regions.shortA, [[-S / 2, L / 2], [S / 2, L / 2], [0, r]], y + .002);
  setPoly(regions.shortB, [[-S / 2, -L / 2], [0, -r], [S / 2, -L / 2]], y + .002);
  for (const k in regions) { regions[k].visible = ro > .01; regions[k].material.uniforms.opacity.value = .5 * ro * (.85 + .15 * Math.sin(t * 5)); }
  // 45° lines + ridge
  const lk = tw;
  const segs = [[[-S / 2, -L / 2], [0, -r]], [[S / 2, -L / 2], [0, -r]], [[-S / 2, L / 2], [0, r]], [[S / 2, L / 2], [0, r]], [[0, -r], [0, r]]];
  diag.forEach((l, i) => {
    const [a, b] = segs[i]; const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) * (i < 4 ? lk : Math.max(lk, ro > .5 ? 1 : 0));
    l.visible = len > .01 && (i < 4 ? lk > .01 : ro > .5); l.scale.set(1, 1, Math.max(len, .001));
    l.position.set(a[0] + dx / 2 * (i < 4 ? lk : 1), H + .1, a[1] + dz / 2 * (i < 4 ? lk : 1)); l.rotation.y = Math.atan2(dx, dz);
  });
  // load bars: w·tributary width. Long beams: min(S/2, (L/2 − |s|)/tw) (uniform when tw = 0, trapezoid when tw = 1); short: tw·(S/2 − |s|)
  const bo = barsOn(t), kH = .42, wB = .14;
  for (const k of ['longA', 'longB']) bars[k].forEach((b, i) => {
    const s = (i + .5) / NB * L - L / 2, hgt = kH * Math.min(S / 2, (L / 2 - Math.abs(s)) / Math.max(tw, 1e-3)) * bo;
    b.visible = hgt > .005; b.scale.set(wB, Math.max(hgt, .001), L / NB * .82); b.position.set((k === 'longA' ? -1 : 1) * (S / 2 + .18), H + hgt / 2, s);
  });
  for (const k of ['shortA', 'shortB']) bars[k].forEach((b, i) => {
    const s = (i + .5) / NB * S - S / 2, hgt = kH * tw * (S / 2 - Math.abs(s)) * bo;
    b.visible = hgt > .005; b.scale.set(S / NB * .82, Math.max(hgt, .001), wB); b.position.set(s, H + hgt / 2, (k === 'shortA' ? 1 : -1) * (L / 2 + .18));
  });
  // load: rain onto the slab, then (once flowing) slide to the beam that owns that patch
  const fo = flowOn(t), rainOn = seg(t, T.rain, T.rain + .4);
  parts.forEach((p, i) => {
    if (rainOn < .01) { p.m.position.y = -9; return; }
    const x = p.fx * S * .96, z = p.fz * L * .96, u = (p.ph + t * .33) % 1;
    const dLong = S / 2 - Math.abs(x), dShort = L / 2 - Math.abs(z);
    const toShort = Math.abs(z) > r && dShort < dLong;
    p.m.material = fo < .5 ? flowMats.rain : (toShort ? flowMats.short : flowMats.long);
    if (u < .35 || fo < .01) { const k = Math.min(u / .35, 1); p.m.position.set(x, H + .12 + (1 - k) * 1.8 * (fo < .01 ? 1 : 1), z); if (fo < .01 && u >= .35) p.m.position.y = H + .12; }
    else { const k = ss((u - .35) / .55); const ex = toShort ? x : Math.sign(x || 1) * S / 2, ez = toShort ? Math.sign(z || 1) * L / 2 : z; p.m.position.set(lerp(x, ex, k), H + .12 - (u > .9 ? (u - .9) * 2 : 0), lerp(z, ez, k)); }
    p.m.scale.setScalar(rainOn);
  });
  // cat (on twos)
  { const t0 = t; t = Math.floor(t * 12) / 12;
    body.position.y = Math.sin(t * 2.2) * .012;
    const puff = t > T.twoWay - .1 ? Math.max(0, Math.sin(clamp((t - T.twoWay + .1) / .9) * Math.PI)) : 0;
    body.scale.set(1 + .25 * puff, 1 + .16 * puff, 1 + .25 * puff);
    cat.position.y = H + .08 + Math.max(0, Math.sin(clamp((t - T.sum - 2.2) / .6) * Math.PI)) * .25;
    head.rotation.y = chaosSpin(t);
    head.rotation.z = Math.sin(t * 1.3) * .05 + .14 * Math.sin(clamp((t - T.cat) / .5) * Math.PI);
    const sw = seg(t, T.squish, T.squish + .35), back = seg(t, T.squish + .6, T.squish + 1.1);
    pawR.rotation.x = -1.7 * eo(sw) * (1 - back); pawL.rotation.x = -1.7 * eo(sw) * (1 - back);
    tail.forEach((g, i) => { g.rotation.x = -.25 + Math.sin(t * 2.6 - i * .6) * .18; g.rotation.z = Math.sin(t * 1.7 - i * .5) * .2; });
    const blink = (t % 3.3) < .12 || (t > T.follow + .8 && t < T.follow + 1.2);
    M.face.uniforms.map.value = blink ? FACE.blink : (t > T.cat && t < T.cat + 1.4) || (t > T.twoWay && t < T.twoWay + 1.2) ? FACE.wide : FACE.open;
    t = t0; }
  setCamera(t);
  renderer.setRenderTarget(rt); renderer.render(scene, camera);
  renderer.setRenderTarget(null); crt.material.uniforms.tSrc.value = rt.texture; crt.material.uniforms.time.value = t; renderer.render(crtScene, crtCam);
  drawOverlay(t, camera, { W, H: 1920, T, P0, L, S, tw, frame, HS: H });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
