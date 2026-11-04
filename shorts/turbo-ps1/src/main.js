// How A Turbo Works — PS1-style short, 1080×1920 (rendered at 360×640, upscaled with hard pixels). render(t) is pure.
// Look: unlit-ish low-poly, nearest-filtered tiny textures, vertex snapping, affine texture warp, ordered dither + 15-bit colour.
import * as THREE from 'three';
import { clamp, lerp, seg, ss, eio, eo, track } from '/core/lib.js';
import { initOverlay, drawOverlay, overlayTexts, makeCues } from './overlay.js';

const RW = 270, RH = 480, W = 1080, H = 1920;   // PS1-ish internal resolution, shown at exactly 4×
const Q = new URLSearchParams(location.search);
const TL = await (await fetch('timeline.json')).json();
const VDUR = await (await fetch('voice/dur.json')).json();
const DUR = TL.dur;
const CUES = makeCues(TL, VDUR);
const cue = (id, i) => CUES.find(c => c.id === id && c.i === i).t0 + .04;
const T = {
  swipe: cue('v02', 0) + .9, explode: cue('v02', 0) + 1.3,
  exhaust: cue('v03', 0), spin: cue('v03', 2) - .3, turbineLbl: cue('v03', 2),
  shaft: cue('v04', 0), compLbl: cue('v04', 1),
  assemble: 20.6, air: cue('v05', 0), engine: cue('v05', 1), boost: cue('v05', 4),
  hot: cue('v06', 0), ic: cue('v06', 3), dense: cue('v07', 0), cyl: cue('v07', 2),
  power: cue('v08', 2), notFree: cue('v09', 0), drive: cue('v09', 2),
  outro: cue('v10', 0), follow: cue('v11', 0),
};
window.T = T;

// ---------- renderer ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
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
const SHARED = { uLight: { value: LIGHT }, uFogC: { value: new THREE.Color('#1b1d24') }, uFog: { value: new THREE.Vector2(5.5, 13) }, uBulb: { value: new THREE.Vector3(.2, 2.55, -1.3) } };
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
  steel: psx({ color: '#b8bcc2' }), dark: psx({ color: '#33363c' }), pipe: psx({ color: '#c3cad2', transparent: true, opacity: .42, amb: .7 }), pipeHot: psx({ color: '#a8705a', transparent: true, opacity: .5, amb: .7 }),
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
  const back = mesh(new THREE.PlaneGeometry(16, 10, 12, 8), M.wall, 0, 5, -3.2); scene.add(back);
  const left = mesh(new THREE.PlaneGeometry(16, 10, 12, 8), M.wall, -3.2, 5, 0); left.rotation.y = Math.PI / 2; scene.add(left);
  const fl = mesh(new THREE.PlaneGeometry(16, 16, 12, 12), M.floor, 0, 0, 0); fl.rotation.x = -Math.PI / 2; scene.add(fl);
}
{
  scene.add(boxM(16, .14, .04, psx({ color: '#3a3430' }), 0, .07, -3.17)); const bb = boxM(.04, .14, 16, psx({ color: '#3a3430' }), -3.17, .07, 0); scene.add(bb);
  scene.add(cyl(.008, .008, .5, psx({ color: '#111' }), .2, 2.85, -1.3, 4), mesh(new THREE.IcosahedronGeometry(.06, 0), psx({ color: '#000', emissive: '#fff2c4', amb: 0 }), .2, 2.57, -1.3));
}
// pedestal crate
const B = new THREE.Vector3(.55, .8, -1.25);
scene.add(boxM(.8, .8, .8, M.crate, B.x, .4, B.z));

// ---------- turbo (vertical axis): turbine housing (bottom) · rotor + centre housing · compressor housing (top) ----------
const turbo = new THREE.Group(); turbo.position.copy(B); scene.add(turbo);
const TH = new THREE.Group(), MID = new THREE.Group(), CH = new THREE.Group(), rotor = new THREE.Group();
turbo.add(TH, MID, CH); MID.add(rotor);
function volute(r, tube, y, mat) { const v = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 12, Math.PI * 1.65), mat); v.rotation.x = Math.PI / 2; v.position.y = y; return v; }
TH.add(volute(.25, .1, .17, M.iron), cyl(.17, .19, .3, M.iron, 0, .15, 0), cyl(.11, .11, .2, M.iron, 0, -.05, 0));
TH.add(boxM(.16, .2, .2, M.iron, .3, .17, -.2));   // exhaust inlet flange
MID.add(cyl(.13, .13, .2, M.bronze, 0, .45, 0), cyl(.03, .03, .12, M.bronze, .15, .47, 0));
rotor.add(cyl(.022, .022, .75, M.steel, 0, .52, 0));
function wheel(y, r, n, h, mat) { const w = new THREE.Group(); w.position.y = y; w.add(cyl(.05, r * .45, h, mat, 0, 0, 0, 8)); for (let i = 0; i < n; i++) { const b = boxM(r, h * .9, .018, mat, 0, 0, 0); b.geometry.translate(r / 2, 0, 0); b.rotation.y = i / n * Math.PI * 2; b.rotation.x = .35; w.add(b); } return w; }
const tWheel = wheel(.18, .16, 9, .16, M.steel); const cWheel = wheel(.72, .2, 10, .14, M.alu);
rotor.add(tWheel, cWheel);
CH.add(volute(.29, .11, .72, M.alu), cyl(.17, .21, .18, M.alu, 0, .7, 0), cyl(.2, .15, .28, M.alu, 0, .92, 0));
CH.add(cyl(.09, .09, .3, M.alu, 0, 0, 0)); CH.children[CH.children.length - 1].rotation.z = Math.PI / 2; CH.children[CH.children.length - 1].position.set(-.3, .72, .18);   // compressor outlet
// ---------- engine, intercooler, plumbing ----------
const engine = new THREE.Group(); engine.position.set(1.45, 0, -2.25); scene.add(engine);
engine.add(boxM(1.5, .8, .85, M.block, 0, .4, 0), boxM(1.4, .18, .7, psx({ color: '#c8402e' }), 0, .89, 0));
const flames = []; for (let i = 0; i < 4; i++) { const f = boxM(.2, .12, .2, M.flame, -.5 + i * .33, 1.02, 0); engine.add(f); flames.push(f); }
engine.add(boxM(1.3, .14, .16, M.steel, 0, .78, .5));   // intake runner rail
const icool = new THREE.Group(); icool.position.set(-1.55, 0, -2.55); scene.add(icool);
icool.add(boxM(1.3, .75, .16, M.ic, 0, .75, 0), boxM(.12, .85, .2, M.dark, -.7, .75, 0), boxM(.12, .85, .2, M.dark, .7, .75, 0));
const P = {   // flow paths (world)
  exhaust: [[.75, .55, -1.82], [.95, .95, -1.55], [B.x + .3, B.y + .17, B.z - .2]],
  airIn: [[B.x, B.y + 1.9, B.z], [B.x, B.y + 1.05, B.z]],
  hotPipe: [[B.x - .45, B.y + .72, B.z + .18], [-.6, 1.6, -1.6], [-1.2, 1.45, -2.4], [-2.25, 1.0, -2.55]],
  coldPipe: [[-.85, .5, -2.55], [-.1, .35, -2.2], [.5, .55, -1.85], [1.45, .78, -1.75]],
};
const curve = pts => new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
const C = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, curve(v)]));
scene.add(mesh(new THREE.TubeGeometry(C.exhaust, 16, .07, 6), M.pipeHot));
const hotTube = mesh(new THREE.TubeGeometry(C.hotPipe, 24, .07, 6), M.pipe); scene.add(hotTube);
const coldTube = mesh(new THREE.TubeGeometry(C.coldPipe, 24, .07, 6), M.pipe); scene.add(coldTube);
const plumbing = [hotTube, coldTube];

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

// ---------- particles ----------
const NP = 26;
const mkParts = mat => [...Array(NP)].map(() => { const m = boxM(.075, .075, .075, mat, 0, -9, 0); scene.add(m); return m; });
const PX = { exh: mkParts(M.exh), airIn: mkParts(M.airHot), hot: mkParts(M.airHot), cold: mkParts(M.airCold) };
PX.airIn.forEach(m => m.material = M.airCold);

// ---------- motion ----------
const explodeE = t => eo(seg(t, T.explode, T.explode + .7)) * (1 - eio(seg(t, T.assemble, T.assemble + .8)));
function spinAngle(t) { let a = 0; for (let x = T.spin; x < t; x += 1 / 48) a += (seg(x, T.spin, T.spin + 1.2) * 10 + seg(x, T.boost - .5, T.boost + .5) * 8) / 48; return a; }
function flow(parts, crv, t, on, speed = .45, phase = 0, swirl = null) {
  parts.forEach((m, i) => {
    if (on <= .01) { m.position.y = -9; return; }
    const u = ((i / parts.length + t * speed + phase) % 1);
    let p;
    if (swirl) p = swirl(u); else p = crv.getPointAt(u);
    m.position.copy(p); m.rotation.set(t * 3 + i, t * 2 + i, 0); m.scale.setScalar(on);
  });
}
const tAt = (u, y, r0, r1, turns, cx, cz, a0 = 0) => { const a = a0 + u * turns * Math.PI * 2, r = lerp(r0, r1, u); return new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r); };

// ---------- camera: [t, px, py, pz, tx, ty, tz] ----------
const CAMK = [
  [0.0, .05, 1.2, 2.4, .05, .75, -1.0],
  [6.6, .1, 1.25, 2.2, .1, .8, -1.0],
  [T.explode - .3, .3, 1.3, 2.0, .35, .9, -1.1],
  [T.explode + .9, .9, 1.8, 1.6, .55, 1.5, -1.25],
  [T.exhaust + .6, 1.6, 1.5, .5, .55, 1.3, -1.25],
  [T.shaft, 1.4, 1.7, .5, .55, 1.6, -1.25],
  [T.compLbl + .8, 1.3, 2.1, .6, .55, 1.9, -1.25],
  [T.assemble + .9, .4, 3.2, 5.5, -.1, .9, -1.8],
  [T.boost - .6, .6, 3.0, 5.0, -.05, .95, -1.8],
  [T.boost + .4, -.3, 1.1, 1.3, -.4, .7, -.85],
  [T.hot + .4, -.2, 2.4, 1.6, -1.0, 1.1, -2.2],
  [T.ic, -.9, 1.5, .3, -1.55, .8, -2.5],
  [T.dense - .1, -.9, 1.5, .3, -1.55, .8, -2.5],
  [T.dense + .9, 1.0, 1.8, .2, 1.45, .8, -2.25],
  [T.power - .5, 1.2, 2.0, .4, 1.45, .9, -2.25],
  [T.notFree - .2, .9, 2.6, 2.4, .5, 1.0, -1.8],
  [T.outro, .1, 1.2, 2.2, 0, .75, -1.0],
  [DUR, -.05, 1.1, 1.9, -.1, .72, -.95],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) { const [px, py, pz, tx, ty, tz] = camTrack(t); const j = .004; camera.position.set(px + Math.sin(t * 13) * j, py + Math.sin(t * 11) * j, pz); camera.lookAt(tx, ty, tz); }

// ---------- events ----------
const EV = [{ t: T.swipe, type: 'swipe' }, { t: T.explode, type: 'explode' }, { t: T.exhaust, type: 'exhaust' }, { t: T.spin, type: 'spin' }, { t: T.assemble + .8, type: 'clunk' },
  { t: T.air, type: 'air' }, { t: T.boost, type: 'boost' }, { t: T.ic, type: 'cool' }, { t: T.power, type: 'power' }, { t: T.notFree, type: 'nope' }, { t: T.outro + 2.4, type: 'card' }];
for (const lt of [T.turbineLbl, T.shaft + .3, T.compLbl, T.engine, T.ic + .2, T.cyl]) EV.push({ t: +lt.toFixed(2), type: 'label' });
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay(CUES);
window.render = (t) => {
  // turbo explode (top first) and rotor spin
  const e = explodeE(t);
  CH.position.y = 1.25 * e; MID.position.y = .55 * e;
  rotor.rotation.y = spinAngle(t);
  const sys = seg(t, T.assemble + .4, T.assemble + 1.2);
  for (const p of plumbing) p.visible = sys > .5;
  // cat: posed on twos (12 fps) like hand-keyed PS1 animation; camera and particles stay at 24
  { const t0 = t; t = Math.floor(t * 12) / 12;
  const bob = Math.sin(t * 2.2) * .012;
  body.position.y = bob; body.scale.setScalar(1);
  const puff = t > T.boost - .1 ? Math.max(0, Math.sin(clamp((t - T.boost + .1) / .9) * Math.PI)) : 0;
  body.scale.set(1 + .28 * puff, 1 + .18 * puff, 1 + .28 * puff);
  const jump = Math.max(0, Math.sin(clamp((t - T.power) / .6) * Math.PI)) * .25; cat.position.y = jump;
  const look = t < T.explode - .5 ? .2 : t < T.assemble ? .55 : -.1;
  head.rotation.y = lerp(head.rotation.y, 0, 0) + look * ss(seg(t, 1, 2)) + Math.sin(t * .9) * .06;
  head.rotation.z = Math.sin(t * 1.3) * .05 + .12 * Math.sin(clamp((t - 3.6) / .5) * Math.PI);   // the head tilt
  const nope = t > T.notFree && t < T.notFree + 1.2 ? Math.sin((t - T.notFree) * 18) * .35 * (1 - (t - T.notFree) / 1.2) : 0;
  head.rotation.y += nope;
  const sw = seg(t, T.swipe - .35, T.swipe), back = seg(t, T.swipe + .1, T.swipe + .6);
  pawR.rotation.x = -1.9 * eo(sw) * (1 - back); pawR.rotation.z = -.6 * sw * (1 - back);
  tail.forEach((g, i) => { g.rotation.x = -.25 + Math.sin(t * 2.6 - i * .6) * .18; g.rotation.z = Math.sin(t * 1.7 - i * .5) * .2; });
  const blink = (t % 3.3) < .12 || (t > T.outro + 2.6 && t < T.outro + 3.0);
  M.face.uniforms.map.value = blink ? FACE.blink : (t > T.power - .2 && t < T.power + 1.6) || (t > T.boost && t < T.boost + 1.2) ? FACE.wide : FACE.open;
  t = t0; }
  // flows
  const exOn = seg(t, T.exhaust - .2, T.exhaust + .3);
  const exPath = u => u < .45 ? C.exhaust.getPointAt(u / .45) : tAt((u - .45) / .55, B.y + .17, .4, .08, 1.4, B.x, B.z, -.6);
  flow(PX.exh, C.exhaust, t, exOn, .5, 0, exPath);
  const airOn = seg(t, T.air - .2, T.air + .3);
  const airPath = u => u < .45 ? C.airIn.getPointAt(u / .45) : tAt((u - .45) / .55, B.y + .72, .05, .3, 1.3, B.x, B.z, 0);
  flow(PX.airIn, C.airIn, t, airOn, .55, 0, airPath);
  const hotOn = seg(t, T.engine - .3, T.engine + .3);
  flow(PX.hot, C.hotPipe, t, hotOn, .35);
  flow(PX.cold, C.coldPipe, t, hotOn, .35, .5);
  // combustion flashes: bigger once the extra air arrives
  const pw = .6 + .9 * seg(t, T.power - .6, T.power);
  flames.forEach((f, i) => { const on = t > T.engine && Math.sin(t * 26 + i * 1.9) > .3; f.visible = on; f.scale.set(pw, pw * (1 + Math.sin(t * 40 + i)), pw); });
  setCamera(t);
  renderer.setRenderTarget(rt); renderer.render(scene, camera);
  renderer.setRenderTarget(null); crt.material.uniforms.tSrc.value = rt.texture; crt.material.uniforms.time.value = t; renderer.render(crtScene, crtCam);
  drawOverlay(t, camera, { W, H, T, B, MID, CH, rotor, tWheel, cWheel, engine, icool, C, cat, head });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
