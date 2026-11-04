// Jacked Cat — single PS1-style hero frame, 1080×1920 (rendered at 270×480, shown at 4× through the CRT pass).
// Same house kit as turbo-ps1: vertex snapping, affine UVs, Gouraud, Bayer dither + 15-bit colour, posterized tiny textures.
import * as THREE from 'three';

const RW = 270, RH = 480, W = 1080, H = 1920;
const Q = new URLSearchParams(location.search);

// ---------- renderer ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
const rt = new THREE.WebGLRenderTarget(RW, RH, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
const FOG = '#1b1d24';
const scene = new THREE.Scene(); scene.background = new THREE.Color(FOG);
const camera = new THREE.PerspectiveCamera(50, RW / RH, .05, 60);

// ---------- CRT pass ----------
const crt = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false,
  uniforms: { tSrc: { value: null }, res: { value: new THREE.Vector2(RW, RH) }, time: { value: 0 } },
  vertexShader: `out vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `out vec4 o; in vec2 vUv; uniform sampler2D tSrc; uniform vec2 res; uniform float time;
    vec3 px(vec2 uv){ return texture(tSrc, (floor(uv * res) + .5) / res).rgb; }
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + time * 7.0) * 43758.5453); }
    void main(){
      vec2 c = vUv - .5; c *= 1.0 + .028 * dot(c * vec2(1.0, 1.78), c * vec2(1.0, 1.78));
      vec2 uv = c + .5;
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }
      float dx = .4 / res.x;
      vec3 col = vec3(px(uv + vec2(dx, 0.0)).r, px(uv).g, px(uv - vec2(dx, 0.0)).b);
      col = mix(col, (px(uv - vec2(1.0 / res.x, 0.0)) + px(uv + vec2(1.0 / res.x, 0.0))) * .5, .12);
      col *= mod(gl_FragCoord.y, 4.0) < 1.0 ? .84 : 1.0;
      col *= 1.0 - .35 * smoothstep(.35, .78, length(c * vec2(1.0, .8)));
      col += (h(floor(gl_FragCoord.xy / 2.0)) - .5) * .045;
      o = vec4(col, 1.0);
    }`,
}));
const crtScene = new THREE.Scene(); crtScene.add(crt); const crtCam = new THREE.Camera();

// ---------- PS1 material (key light + warm bulb + cool rim for muscle read) ----------
const LIGHT = new THREE.Vector3(-.55, .75, .5).normalize();
const SHARED = { uLight: { value: LIGHT }, uFogC: { value: new THREE.Color(FOG) }, uFog: { value: new THREE.Vector2(5.5, 13) },
  uBulb: { value: new THREE.Vector3(.1, 2.6, .9) }, uRim: { value: new THREE.Vector3(.8, .35, -.6).normalize() } };
const VS = `
uniform vec3 uLight; uniform float uAmb; uniform vec2 uFog; uniform vec3 uBulb; uniform vec2 uRep; uniform vec3 uRim;
out vec3 vUvW; out float vShade; out float vFog; out float vRim;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec4 p = projectionMatrix * mv;
  vec2 grid = vec2(${RW}.0, ${RH}.0);
  p.xy = floor(p.xy / p.w * grid + .5) / grid * p.w;
  gl_Position = p;
  vUvW = vec3(uv * uRep * p.w, p.w);
  vec3 n = normalize(mat3(modelMatrix) * normal);
  vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
  vec3 tb = uBulb - wp; float db = length(tb);
  float bulb = max(dot(n, tb / db), 0.0) * 1.6 / (1.0 + db * db * .35);
  float ground = mix(.62, 1.0, clamp(wp.y / 1.1, 0.0, 1.0));
  float key = max(dot(n, uLight), 0.0);
  vShade = (uAmb + (1.0 - uAmb) * key * .95 + bulb * .45) * ground;
  vRim = pow(max(dot(n, uRim), 0.0), 2.0) * .55;
  vFog = clamp((-mv.z - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0);
}`;
const FS = `
out vec4 fragOut;
uniform sampler2D map; uniform float useMap; uniform vec3 color; uniform vec3 emissive; uniform vec3 uFogC; uniform float opacity; uniform float rimK;
in vec3 vUvW; in float vShade; in float vFog; in float vRim;
float bayer(vec2 p){ int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0)); int i = x + y * 4;
  int b[16] = int[16](0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5); return float(b[i]) / 16.0 - .5; }
void main(){
  vec2 vUv = vUvW.xy / vUvW.z;
  vec4 tx = useMap > .5 ? texture(map, vUv) : vec4(1.0);
  if (tx.a < .5) discard;
  vec3 c = tx.rgb * color * vShade + emissive + vec3(.55, .75, 1.0) * vRim * rimK;
  c = mix(c, uFogC, vFog);
  c += bayer(gl_FragCoord.xy) / 24.0;
  c = floor(c * 31.0 + .5) / 31.0;
  fragOut = vec4(c, opacity);
}`;
function psx({ map = null, color = '#ffffff', emissive = '#000000', amb = .45, transparent = false, opacity = 1, rim = 0 } = {}) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: FS, transparent, depthWrite: !transparent,
    uniforms: { ...SHARED, map: { value: map }, useMap: { value: map ? 1 : 0 }, uRep: { value: map ? map.repeat.clone() : new THREE.Vector2(1, 1) },
      color: { value: new THREE.Color(color) }, emissive: { value: new THREE.Color(emissive) }, uAmb: { value: amb }, opacity: { value: opacity }, rimK: { value: rim } },
  });
}

// ---------- textures ----------
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function tex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const id = g.getImageData(0, 0, w, h), d = id.data, L = 12;
  for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] / 255 * (L - 1)) / (L - 1) * 255;
  g.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.colorSpace = THREE.NoColorSpace; return t;
}
const noiseFill = (g, w, h, base, amt) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = (rnd() - .5) * amt; g.fillStyle = `rgb(${base[0] + v},${base[1] + v},${base[2] + v})`; g.fillRect(x, y, 1, 1); } };
const TX = {
  wall: tex(16, 16, (g, w, h) => { noiseFill(g, w, h, [96, 102, 116], 14); g.fillStyle = '#d8dce4'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); }, [28, 18]),
  mat: tex(16, 16, (g, w, h) => { noiseFill(g, w, h, [44, 46, 52], 18); g.fillStyle = '#5c606a'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h); }, [10, 10]),
  floor: tex(16, 16, (g, w, h) => { noiseFill(g, w, h, [78, 98, 86], 26); g.fillStyle = '#b7bdb2'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); }, [20, 20]),
  fur: tex(16, 16, (g, w, h) => { noiseFill(g, w, h, [220, 130, 50], 24); g.fillStyle = '#9a4d18'; for (let y = 1; y < h; y += 5) for (let x = 0; x < w; x++) if (Math.sin(x * .6 + y) > .25) g.fillRect(x, y, 1, 2); }),
  cream: tex(8, 8, (g, w, h) => noiseFill(g, w, h, [242, 232, 214], 14)),
  iron: tex(16, 16, (g, w, h) => noiseFill(g, w, h, [58, 60, 66], 26)),
  crate: tex(32, 32, (g, w, h) => { noiseFill(g, w, h, [142, 104, 62], 30); g.fillStyle = '#5b3d1f'; for (const y of [0, 15, 30]) g.fillRect(0, y, w, 2); g.fillRect(0, 0, 2, h); g.fillRect(30, 0, 2, h); }),
};
// smug "I lift" face: half-lidded eyes, raised brow, smirk
const FACE = tex(32, 32, (g) => {
  noiseFill(g, 32, 32, [220, 130, 50], 20);
  g.fillStyle = '#8f4512'; g.fillRect(13, 1, 2, 6); g.fillRect(17, 1, 2, 6); g.fillRect(10, 3, 2, 4); g.fillRect(20, 3, 2, 4);
  g.fillStyle = '#f2ece2'; g.beginPath(); g.ellipse(16, 25, 10, 7, 0, 0, 7); g.fill();
  g.fillStyle = '#f4f0d0'; g.fillRect(6, 13, 8, 5); g.fillRect(18, 13, 8, 5);     // eye whites (yellow-green cat eyes below)
  g.fillStyle = '#b8d23a'; g.fillRect(7, 14, 6, 4); g.fillRect(19, 14, 6, 4);
  g.fillStyle = '#111'; g.fillRect(9, 14, 2, 4); g.fillRect(21, 14, 2, 4);          // slit pupils
  g.fillStyle = '#7a3a10'; g.fillRect(5, 11, 10, 3); g.fillRect(17, 12, 10, 2); g.fillRect(25, 11, 2, 1);   // heavy lids, one brow cocked
  g.fillStyle = '#e88a96'; g.fillRect(15, 21, 3, 2);
  g.fillStyle = '#3a2418'; g.fillRect(16, 23, 1, 2); g.fillRect(13, 25, 3, 1); g.fillRect(17, 25, 2, 1); g.fillRect(19, 24, 2, 1);   // smirk
});

const M = {
  wall: psx({ map: TX.wall, amb: .7 }), floor: psx({ map: TX.floor, amb: .7 }), mat: psx({ map: TX.mat, amb: .7 }), crate: psx({ map: TX.crate }),
  fur: psx({ map: TX.fur, amb: .34, rim: 1 }), cream: psx({ map: TX.cream, amb: .4, rim: .8 }), face: psx({ map: FACE, amb: .55, rim: .5 }),
  pink: psx({ color: '#e88a96', amb: .5 }), tan: psx({ map: TX.cream, color: '#f7cf98', amb: .38, rim: .9 }), red: psx({ color: '#d8312a', amb: .45, rim: .6 }), white: psx({ color: '#f2f2f2', amb: .5 }),
  iron: psx({ map: TX.iron, amb: .4, rim: 1 }), chrome: psx({ color: '#c8ccd2', amb: .5, rim: 1 }),
  shadow: psx({ color: '#000', transparent: true, opacity: .5, amb: 1 }), dark: psx({ color: '#3a3430' }),
};
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };
const boxM = (sx, sy, sz, m, x, y, z) => mesh(new THREE.BoxGeometry(sx, sy, sz), m, x, y, z);
const cyl = (r1, r2, h, m, x, y, z, s = 8) => mesh(new THREE.CylinderGeometry(r1, r2, h, s), m, x, y, z);
const SPH = new THREE.SphereGeometry(1, 8, 6);
const blob = (rx, ry, rz, m, x, y, z, rot = [0, 0, 0]) => { const o = mesh(SPH, m, x, y, z); o.scale.set(rx, ry, rz); o.rotation.set(...rot); return o; };

// ---------- set: tiled corner gym ----------
{
  const back = mesh(new THREE.PlaneGeometry(16, 10, 12, 8), M.wall, 0, 5, -2.2); scene.add(back);
  const left = mesh(new THREE.PlaneGeometry(16, 10, 12, 8), M.wall, -2.6, 5, 0); left.rotation.y = Math.PI / 2; scene.add(left);
  const fl = mesh(new THREE.PlaneGeometry(16, 16, 12, 12), M.floor, 0, 0, 0); fl.rotation.x = -Math.PI / 2; scene.add(fl);
  const mat = mesh(new THREE.PlaneGeometry(3.2, 2.6, 8, 6), M.mat, 0, .006, .2); mat.rotation.x = -Math.PI / 2; scene.add(mat);
  scene.add(boxM(16, .14, .04, M.dark, 0, .07, -2.17)); scene.add(boxM(.04, .14, 16, M.dark, -2.57, .07, 0));
  scene.add(cyl(.008, .008, .5, psx({ color: '#111' }), .1, 2.9, .9, 4), mesh(new THREE.IcosahedronGeometry(.06, 0), psx({ color: '#000', emissive: '#fff2c4', amb: 0 }), .1, 2.62, .9));
  // dumbbell rack on the back wall
  const rack = new THREE.Group(); rack.position.set(-.95, 0, -1.75); scene.add(rack);
  for (const x of [-.45, .45]) rack.add(boxM(.06, .62, .06, M.iron, x, .31, 0));
  for (const y of [.3, .56]) rack.add(boxM(1.0, .04, .22, M.iron, 0, y, 0));
  for (let i = 0; i < 4; i++) for (const y of [.36, .62]) { const d = dumbbell(.16 + .02 * i); d.position.set(-.33 + i * .22, y, 0); d.rotation.y = Math.PI / 2; rack.add(d); }
  // poster: a pixel cat-paw logo
  const posterTex = tex(16, 24, (g, w, h) => { g.fillStyle = '#16207a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffe14a'; g.fillRect(6, 9, 5, 5); g.fillRect(4, 6, 2, 2); g.fillRect(7, 5, 2, 2); g.fillRect(10, 5, 2, 2); g.fillRect(12, 7, 2, 2); g.fillStyle = '#fff'; g.fillRect(2, 18, 12, 1); g.fillRect(4, 20, 8, 1); });
}
function dumbbell(r = .17) {
  const d = new THREE.Group();
  const bar = cyl(.025, .025, .5, M.chrome, 0, 0, 0, 6); bar.rotation.z = Math.PI / 2; d.add(bar);
  for (const s of [-1, 1]) { const p = cyl(r * .5, r * .5, .09, M.iron, s * .18, 0, 0, 6); p.rotation.z = Math.PI / 2; d.add(p); }
  return d;
}
{ const d = dumbbell(.2); d.position.set(.62, .1, .55); d.rotation.y = .5; scene.add(d); const d2 = dumbbell(.2); d2.position.set(-.7, .1, .35); d2.rotation.y = -.3; scene.add(d2); }

// ---------- the jacked cat: double-biceps pose ----------
const cat = new THREE.Group(); cat.rotation.y = -.18; scene.add(cat);
const F = M.fur, C = M.cream;
// legs: big quad sweep, diamond calves, white socks
for (const s of [-1, 1]) {
  cat.add(blob(.13, .21, .14, F, s * .14, .44, .02, [0, 0, s * -.12]));          // quads
  cat.add(blob(.085, .1, .1, F, s * .12, .33, .1));                                // teardrop (vastus medialis)
  cat.add(blob(.075, .07, .075, F, s * .155, .26, .04));                           // knees
  cat.add(blob(.08, .12, .09, F, s * .17, .16, -.03));                             // calves
  cat.add(blob(.07, .05, .12, C, s * .17, .04, .06));                              // paws
  for (const k of [-1, 0, 1]) cat.add(blob(.022, .02, .02, M.pink, s * .17 + k * .035, .02, .175));   // toe beans peeking
}
// pelvis + V-taper torso
cat.add(blob(.2, .12, .14, F, 0, .62, 0));                                             // hips
cat.add(blob(.16, .17, .13, F, 0, .76, 0));                                            // narrow waist
for (const s of [-1, 1]) cat.add(blob(.15, .24, .1, F, s * .15, .95, -.04, [0, 0, s * .42]));   // lat wings (V-taper)
cat.add(blob(.2, .2, .13, F, 0, 1.0, -.02));                                           // ribcage
for (let r = 0; r < 3; r++) for (const s of [-1, 1]) cat.add(blob(.052, .036, .03, M.tan, s * .054, .89 - r * .075, .115));   // six-pack
for (const s of [-1, 1]) cat.add(blob(.14, .085, .06, F, s * .115, 1.05, .1, [0, s * .3, s * .2]));   // pecs: wide flat slabs
cat.add(blob(.24, .1, .14, F, 0, 1.18, -.04));                                         // traps
cat.add(cyl(.11, .13, .14, F, 0, 1.24, 0));                                            // neck
// arms: delts, horizontal upper arm, forearm up, fist
for (const s of [-1, 1]) {
  cat.add(blob(.12, .11, .12, F, s * .34, 1.12, 0));                                   // delt cap
  cat.add(blob(.15, .08, .09, F, s * .5, 1.08, -.03));                                 // triceps
  cat.add(blob(.11, .1, .095, F, s * .49, 1.155, .03));                                // biceps peak
  cat.add(blob(.035, .03, .03, F, s * .47, 1.255, .04));                               // peak vein-bump
  cat.add(blob(.085, .17, .085, F, s * .64, 1.24, 0, [0, 0, s * .12]));                // forearm
  cat.add(cyl(.072, .072, .05, M.red, s * .615, 1.38, .0, 8));                         // wristband
  cat.add(blob(.07, .065, .07, C, s * .61, 1.44, .01));                                // paw fist
  for (const k of [-1, 0, 1]) cat.add(blob(.018, .016, .014, M.pink, s * .61 + k * .028, 1.45, .085));
}
// head: big cat head (stays cat), cheek floof, ears, sweatband
const head = new THREE.Group(); head.position.set(0, 1.47, .04); head.rotation.set(-.06, .1, .05); cat.add(head);
head.add(mesh(new THREE.BoxGeometry(.44, .36, .36), [F, F, F, F, M.face, F]));
for (const s of [-1, 1]) {
  const ch = mesh(new THREE.ConeGeometry(.07, .14, 4), F, s * .25, -.08, .02); ch.rotation.z = s * Math.PI / 2; head.add(ch);   // cheek floof
  const e = mesh(new THREE.ConeGeometry(.1, .18, 4), F, s * .15, .26, -.02); e.rotation.y = Math.PI / 4; e.rotation.z = -s * .12; head.add(e);
  const i = mesh(new THREE.ConeGeometry(.05, .1, 4), M.pink, s * .15, .25, .03); i.rotation.y = Math.PI / 4; i.rotation.z = -s * .12; head.add(i);
  for (const k of [0, 1]) { const w = boxM(.18, .008, .008, M.white, s * .3, -.06 - k * .035, .17); w.rotation.z = s * (.1 - k * .18); head.add(w); }   // whiskers
}
head.add(boxM(.46, .055, .38, M.red, 0, .12, 0));                                      // sweatband
head.add(boxM(.06, .12, .02, M.red, -.2, .04, -.2));                                   // band tails
// tail: thick, curling up behind
{ let par = cat; for (let i = 0; i < 6; i++) { const g = new THREE.Group(); g.position.set(i ? 0 : .1, i ? .1 : .6, i ? 0 : -.14); g.rotation.set(i ? -.28 : -1.0, 0, i ? .14 : .5); g.add(boxM(.08 - i * .005, .12, .08 - i * .005, F, 0, .05, 0)); par.add(g); par = g; } }
const shadow = mesh(new THREE.CircleGeometry(.42, 8), M.shadow, 0, .012, .03); shadow.rotation.x = -Math.PI / 2; cat.add(shadow);

// ---------- overlay ----------
const ov = document.getElementById('ov'), g2 = ov.getContext('2d');
function meme(text, x, y, size) {
  g2.font = `700 ${size}px "Pix", monospace`; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.lineJoin = 'miter';
  g2.shadowColor = 'rgba(80,150,255,.9)'; g2.shadowBlur = 18; g2.strokeStyle = '#16207a'; g2.lineWidth = size * .22; g2.strokeText(text, x, y);
  g2.shadowBlur = 0; g2.fillStyle = '#ffe14a'; g2.fillText(text, x, y);
  const w = g2.measureText(text).width; g2.fillStyle = 'rgba(255,255,255,.35)'; g2.fillRect(x - w / 2, y - size * .32, w, size * .08);
}

window.DUR = 1; window.EV = []; window.TEXTS = () => [];
await document.fonts.ready;
window.render = (t) => {
  camera.position.set(.72, .55, 2.95); camera.lookAt(0, 1.0, 0);
  renderer.setRenderTarget(rt); renderer.render(scene, camera);
  renderer.setRenderTarget(null); crt.material.uniforms.tSrc.value = rt.texture; crt.material.uniforms.time.value = t; renderer.render(crtScene, crtCam);
  g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, W, H);
  if (Q.get('text') !== '0') meme('GAINS', W / 2, 250, 170);
};
window.render(0);
window.READY = true;
