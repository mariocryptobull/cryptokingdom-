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
  turf: cue('v01', 1), irt: cue('v02', 0), irtUnder: cue('v02', 1), bmt: cue('v03', 0), bmtSpread: cue('v03', 2), ind: cue('v04', 0), indName: cue('v04', 2),
  fares: cue('v05', 0), dup: cue('v05', 1), noConn: cue('v05', 2), nickel: cue('v05', 3), unify: cue('v06', 0), one: cue('v06', 2),
  transfers: cue('v07', 0), mta: cue('v07', 1), ibx: cue('v08', 0), ibxLine: cue('v08', 1), corridor: cue('v08', 3), stations: cue('v09', 0), review: cue('v10', 0), noDate: cue('v10', 2),
  congrats: cue('v11', 0), follow: cue('v11', 0),
};
window.T = T;

// ---------- renderer ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, HH, false);
const rt = new THREE.WebGLRenderTarget(RW, RH, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;   // textures and colours are authored as display values
const scene = new THREE.Scene(); scene.background = new THREE.Color('#0d1424');
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
const SHARED = { uLight: { value: LIGHT }, uFogC: { value: new THREE.Color('#0d1424') }, uFog: { value: new THREE.Vector2(7.5, 16) }, uBulb: { value: new THREE.Vector3(1.0, 3.6, -.4) } };
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
  water: tex(16, 16, (g, w, h) => { noiseFill(g, w, h, [52, 92, 140], 18); g.fillStyle = 'rgba(160,200,240,.5)'; for (let i = 0; i < 5; i++) g.fillRect(rnd() * w, rnd() * h, 3, 1); }, [60, 60]),
  land: tex(16, 16, (g, w, h) => { noiseFill(g, w, h, [84, 88, 96], 8); g.fillStyle = '#b8b4a4'; g.fillRect(0, 0, 2, h); g.fillRect(8, 0, 1, h); g.fillRect(0, 0, w, 2); }, [6, 6]),
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
  steel: psx({ color: '#b8bcc2' }), concrete: psx({ map: TX.concrete, amb: .6 }), water: psx({ map: TX.water, amb: .75 }), land: psx({ map: TX.land, amb: .7 }), table: psx({ map: TX.crate, amb: .6 }), dark: psx({ color: '#33363c' }), pipe: psx({ color: '#c3cad2', transparent: true, opacity: .42, amb: .7 }), pipeHot: psx({ color: '#a8705a', transparent: true, opacity: .5, amb: .7 }),
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
}
{
}
// ---------- NYC map diorama on a low table (map plane: x east, z south; schematic, not to scale) ----------
const TY = .45;                                         // table top
const map = new THREE.Group(); map.position.set(-.9, 0, -.6); scene.add(map);
const water = mesh(new THREE.PlaneGeometry(40, 40, 24, 24), M.water, 1.1, TY + .005, -.4); water.rotation.x = -Math.PI / 2; map.add(water);
const BORO = {
  Manhattan: [[-.15, -2.3], [.15, -2.25], [.35, -1.2], [.45, -.2], [.3, .9], [.05, 1.2], [-.15, .95], [-.2, -.2], [-.3, -1.3]],
  Bronx: [[-.1, -2.6], [.3, -3.3], [1.5, -3.4], [2.1, -2.7], [1.2, -2.15], [.4, -2.3]],
  Queens: [[.75, -1.95], [2.75, -2.05], [3.2, -.6], [2.95, .55], [1.65, .65], [1.0, .28], [.68, -.6]],
  Brooklyn: [[.48, .62], [1.0, .38], [1.65, .78], [2.95, .66], [2.7, 1.95], [1.45, 2.55], [.5, 2.35], [.22, 1.6]],
};
const LANDC = { Manhattan: '#ffffff', Bronx: '#e4f0d8', Queens: '#eef2dc', Brooklyn: '#f6ecd8' };
for (const [k, pts] of Object.entries(BORO)) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], -pts[0][1]); for (const p of pts.slice(1)) s.lineTo(p[0], -p[1]); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: .07, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, psx({ map: TX.land, color: LANDC[k], amb: .9 })); m.position.y = TY; map.add(m);
}
const LY = TY + .085;
// the rest of the region: flat green land (schematic), slightly lower than the boroughs
{
  const greenT = tex(16, 16, (g, w, h) => { noiseFill(g, w, h, [92, 140, 78], 18); g.fillStyle = 'rgba(60,100,50,.6)'; for (let i = 0; i < 10; i++) g.fillRect(rnd() * w, rnd() * h, 2, 1); }, [14, 14]);
  const REGION = {
    mainland: [[-12, -14], [-.55, -14], [-.5, -3.6], [-.45, -2.6], [-.55, -1.3], [-.6, .2], [-.55, 1.4], [-.9, 2.2], [-1.5, 2.6], [-12, 3.0]],   // New Jersey + upstate, west of the Hudson
    north: [[-.4, -14], [14, -14], [14, -3.6], [2.4, -3.0], [1.6, -3.55], [.4, -3.5], [-.35, -3.0]],                                        // Westchester / Connecticut, north of the Bronx
    longIsland: [[3.05, -1.4], [14, -2.6], [14, 1.9], [3.0, 1.75], [3.3, .3], [3.4, -.6]],                                                     // Long Island, east of Queens + Brooklyn
    staten: [[-1.2, 2.75], [-.35, 2.55], [-.15, 3.2], [-.55, 3.85], [-1.35, 3.6]],                                                            // Staten Island
  };
  const greenM = psx({ map: greenT, amb: .8 });
  for (const pts of Object.values(REGION)) {
    const sh = new THREE.Shape(); sh.moveTo(pts[0][0], -pts[0][1]); for (const p of pts.slice(1)) sh.lineTo(p[0], -p[1]); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: .045, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
    const m = new THREE.Mesh(g, greenM); m.position.y = TY; map.add(m);
  }
}
{
  const winT = tex(8, 16, (g, w, h) => { g.fillStyle = '#2a2f3c'; g.fillRect(0, 0, w, h); g.fillStyle = '#566070'; g.fillRect(0, 0, w, 1); for (let y = 2; y < h; y += 3) for (let x = 1; x < w; x += 3) { g.fillStyle = rnd() > .45 ? '#ffd98a' : '#3b4252'; g.fillRect(x, y, 1, 2); } });
  const inside = (pts, x, z) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
  const H0 = { Manhattan: [.12, .6], Bronx: [.05, .16], Queens: [.04, .14], Brooklyn: [.04, .15] };
  let r = 12345; const R = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const geos = [];
  for (const [k, pts] of Object.entries(BORO)) {
    const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]), step = k === 'Manhattan' ? .11 : .16;
    for (let x = Math.min(...xs); x < Math.max(...xs); x += step) for (let z = Math.min(...zs); z < Math.max(...zs); z += step) {
      const jx = x + (R() - .5) * .05, jz = z + (R() - .5) * .05; if (!inside(pts, jx, jz) || R() < .35) continue;
      const [h0, h1] = H0[k]; const hgt = h0 + (h1 - h0) * Math.pow(R(), k === 'Manhattan' ? 1.6 : 2.2) * (k === 'Manhattan' ? (1.1 - Math.abs(jz + .4) / 2.2) : 1);
      const sz = step * (.45 + R() * .3); const g = new THREE.BoxGeometry(sz, Math.max(hgt, .03), sz); { const uv = g.attributes.uv; for (let v = 8; v < 16; v++) uv.setXY(v, .5, .985); uv.setY; } g.translate(jx, TY + .07 + Math.max(hgt, .03) / 2, jz); geos.push(g);
    }
  }
  const BGU = await import('three/addons/utils/BufferGeometryUtils.js');
  const city = new THREE.Mesh(BGU.mergeGeometries(geos), psx({ map: winT, amb: .75 })); map.add(city);
}
const P = pts => new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, LY, z)), false, 'catmullrom', .2);
const LINES = {
  irt: { col: '#e8402e', paths: [[[.05, 1.0], [.15, .2], [.2, -.8], [.1, -1.8], [.2, -2.4], [.6, -2.95]], [[.05, 1.0], [.5, 1.1], [.95, 1.4], [1.45, 1.65]]] },
  bmt: { col: '#f2c230', paths: [[[.1, .7], [.6, .9], [1.3, 1.3], [1.85, 2.15]], [[.25, -.1], [.9, -.42], [1.6, -.9], [2.25, -1.25]], [[.6, .92], [1.9, 1.02], [2.45, .72]]] },
  ind: { col: '#3a78e8', paths: [[[-.02, 1.05], [-.06, .2], [-.02, -.9], [.03, -2.0]], [[.18, -.42], [1.0, -.82], [2.0, -.52], [2.75, -.42]], [[.3, .97], [.8, 1.55], [1.12, 2.25]]] },
  ibx: { col: '#b04ae8', paths: [[[.62, 2.05], [1.2, 1.62], [1.68, 1.12], [1.92, .6], [1.82, .02], [1.52, -.6], [1.3, -1.12]]] },
};
for (const L of Object.values(LINES)) {
  L.mat = psx({ color: '#000', emissive: L.col, amb: 0 }); L.mat.depthTest = false;
  L.tubes = L.paths.map(p => { const c = P(p); const g = new THREE.TubeGeometry(c, 60, .035, 4); const m = new THREE.Mesh(g, L.mat); m.renderOrder = 10; m.userData = { curve: c, count: g.index.count }; map.add(m); return m; });
  L.trains = L.paths.map((p, i) => { const tr = new THREE.Group(); for (let k = 0; k < 3; k++) { const tm = psx({ color: L.col, amb: .6 }); tm.depthTest = false; const b = boxM(.13, .07, .07, tm, -k * .14, .04, 0); b.renderOrder = 11; tr.add(b); } map.add(tr); return tr; });
}
// IBX is planned: dashed (gaps cut from the tube's draw range by showing every other chunk) + 18 station dots
const ibxCurve = LINES.ibx.tubes[0].userData.curve;
const stations = [...Array(18)].map((_, i) => { const p = ibxCurve.getPointAt(i / 17); const sm = psx({ color: '#000', emissive: '#ffffff', amb: 0 }); sm.depthTest = false; const m = cyl(.05, .05, .03, sm, p.x, LY + .03, p.z, 6); m.renderOrder = 12; map.add(m); return m; });
// problem markers: X where lines don't meet, and nickel coins per company
const xMat = psx({ color: '#000', emissive: '#ff3030', amb: 0 }); xMat.depthTest = false;
const xMarks = [[.62, .95], [.3, -.15], [.95, 1.42]].map(([x, z]) => { const g = new THREE.Group(); for (const r of [.785, -.785]) { const b = boxM(.26, .03, .05, xMat, 0, 0, 0); b.renderOrder = 12; b.rotation.y = r; g.add(b); } g.position.set(x, LY + .08, z); map.add(g); return g; });
const coinMat = psx({ color: '#c8ccd2', amb: .7 });
const coins = [[.35, -1.4], [1.95, 1.75], [2.4, -.9]].map(([x, z]) => { const c = cyl(.14, .14, .04, coinMat, x, LY + .5, z, 10); map.add(c); return c; });
// free-transfer squares at junctions (1948)
const xferMat = psx({ color: '#000', emissive: '#ffffff', amb: 0 }); xferMat.depthTest = false;
const xfers = [[.06, 1.0], [.12, .72], [.22, -.2], [.62, .92], [.3, .97]].map(([x, z]) => { const m = boxM(.11, .05, .11, xferMat, x, LY + .04, z); m.renderOrder = 12; map.add(m); return m; });
// confetti
const confC = ['#ffe14a', '#59d4ff', '#ff6a3d', '#7cf07c', '#ff7ad9'].map(c => psx({ color: '#000', emissive: c, amb: 0, side: THREE.DoubleSide }));
const confetti = [...Array(70)].map((_, i) => { const m = mesh(new THREE.PlaneGeometry(.07, .045), confC[i % 5], 0, -9, 0); scene.add(m); return { m, a: (i * 2.39996) % (Math.PI * 2), v: .9 + ((i * .618) % 1) * 1.4, up: 2.2 + ((i * .414) % 1) * 1.6 }; });

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

cat.position.set(map.position.x + .35, TY, map.position.z + 2.95); cat.rotation.y = .1; cat.scale.setScalar(1.5);
const M2W = (x, z, y = LY) => new THREE.Vector3(map.position.x + x, y, map.position.z + z);   // map coords → world

// ---------- motion ----------
const lookAt = x => x < T.unify ? .12 : -.12;
function chaosSpin(t) { let a = 0; const n = Math.floor(t * 12); for (let k = 0; k <= n; k++) { const x = k / 12; a += lookAt(x) * ss(seg(x, 1, 2)) + Math.sin(x * .9) * .06; } return a; }
const grow = { irt: t => eo(seg(t, T.irt, T.irt + 2.4)), bmt: t => eo(seg(t, T.bmt, T.bmt + 3.0)), ind: t => eo(seg(t, T.ind, T.ind + 2.6)), ibx: t => eo(seg(t, T.ibxLine, T.ibxLine + 3.0)) };

// ---------- camera: [t, px, py, pz, tx, ty, tz] ----------
const W2 = (x, z) => M2W(x, z, 0);
const C0 = W2(1.1, -.3);
const CAMK = [
  [0.0, .3, 2.8, 5.3, -.55, 1.25, 1.7],
  [4.6, C0.x + .4, 6.4, C0.z + 5.0, C0.x, .5, C0.z],
  [T.irt + .6, W2(.1, 0).x + 1.2, 3.6, W2(.1, 0).z + 3.3, W2(.1, -.6).x, .5, W2(.1, -.6).z],
  [T.bmt + .6, W2(1.4, .6).x + .6, 4.2, W2(1.4, .6).z + 3.4, W2(1.4, .4).x, .5, W2(1.4, .4).z],
  [T.ind + .5, C0.x + .3, 5.6, C0.z + 4.4, C0.x, .5, C0.z],
  [T.dup, W2(0, .2).x + .9, 2.6, W2(0, .2).z + 2.2, W2(0, -.3).x, .5, W2(0, -.3).z],
  [T.nickel, C0.x + .4, 6.0, C0.z + 4.8, C0.x, .5, C0.z],
  [T.unify + .5, C0.x, 7.4, C0.z + 3.6, C0.x, .5, C0.z - .2],
  [T.mta + 1.5, C0.x + 1.5, 6.6, C0.z + 4.6, C0.x, .5, C0.z],
  [T.ibxLine, W2(1.5, .6).x + 1.4, 4.3, W2(1.5, .6).z + 3.4, W2(1.5, .4).x, .5, W2(1.5, .4).z],
  [T.stations + 1.0, W2(1.5, .5).x - .4, 5.0, W2(1.5, .5).z + 3.2, W2(1.5, .4).x, .5, W2(1.5, .4).z],
  [T.noDate + 1.0, C0.x + .4, 6.2, C0.z + 4.8, C0.x, .5, C0.z],
  [T.congrats, .35, 2.9, 5.4, -.55, 1.3, 1.6],
  [DUR, .25, 2.85, 5.2, -.55, 1.28, 1.65],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
function setCamera(t) { const [px, py, pz, tx, ty, tz] = camTrack(t); const j = .005; camera.position.set(px + Math.sin(t * 13) * j, py + Math.sin(t * 11) * j, pz); camera.lookAt(tx, ty, tz); }

// ---------- events ----------
const EV = [{ t: T.irt, type: 'line' }, { t: T.bmt, type: 'line' }, { t: T.ind, type: 'line' }, { t: T.noConn, type: 'buzz' }, { t: T.nickel, type: 'coin' },
  { t: T.one, type: 'stamp' }, { t: T.transfers, type: 'blips' }, { t: T.mta, type: 'stamp' }, { t: T.ibxLine, type: 'line' }, { t: T.stations, type: 'blips' }, { t: T.congrats, type: 'congrats' }, { t: cue('v11', 3), type: 'card' }];
for (const lt of [T.irt + .3, T.bmt + .3, T.ind + .3, T.ibx + .3, T.review]) EV.push({ t: +lt.toFixed(2), type: 'label' });
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay(CUES);
window.render = (t) => {
  const uni = seg(t, T.one - .1, T.one + .3) * (1 - seg(t, T.one + 1.2, T.one + 1.8));   // white unification flash
  for (const [k, L] of Object.entries(LINES)) {
    const gk = grow[k](t);
    L.tubes.forEach((m, i) => {
      const n = Math.floor(m.userData.count * gk / 6) * 6; m.geometry.setDrawRange(0, n); m.visible = n > 0;
      if (k === 'ibx') m.visible = n > 0 && (Math.floor(t * 4) % 2 === 0 || t > T.stations);   // planned line blinks until its stations appear
    });
    L.mat.uniforms.emissive.value.set(L.col).lerp(new THREE.Color('#ffffff'), k === 'ibx' ? 0 : uni);
    const dupHi = k !== 'bmt' && k !== 'ibx' && t > T.dup && t < T.noConn ? (Math.sin(t * 14) > 0 ? 1.6 : 1) : 1;
    L.mat.uniforms.emissive.value.multiplyScalar(dupHi);
    L.trains.forEach((tr, i) => {
      const on = gk > .98 && (k !== 'ibx' || t > T.stations + .5); tr.visible = on; if (!on) return;
      const c = L.tubes[i].userData.curve, u = ((t * (k === 'ibx' ? .09 : .07) + i * .37 + (k === 'bmt' ? .2 : 0)) % 1);
      const p = c.getPointAt(u), q = c.getPointAt(Math.min(u + .01, 1)); tr.position.set(p.x, p.y, p.z); tr.rotation.y = Math.atan2(-(q.z - p.z), q.x - p.x);
    });
  }
  stations.forEach((s, i) => { const k = seg(t, T.stations + i * .06, T.stations + i * .06 + .2); s.visible = k > .01; s.scale.setScalar(Math.max(k, .01)); });
  xMarks.forEach((x, i) => { const k = seg(t, T.noConn + i * .25, T.noConn + i * .25 + .2) * (1 - seg(t, T.unify, T.unify + .4)); x.visible = k > .01; x.scale.setScalar(Math.max(k, .01) * (1 + .15 * Math.sin(t * 12))); });
  coins.forEach((c, i) => { const k = seg(t, T.nickel + i * .2, T.nickel + i * .2 + .3) * (1 - seg(t, T.unify - .3, T.unify + .2)); c.visible = k > .01; c.rotation.z = Math.PI / 2; c.rotation.y = t * 3 + i; c.position.y = LY + .45 + Math.sin(t * 3 + i) * .05; c.scale.setScalar(Math.max(k, .01)); });
  xfers.forEach((m, i) => { const k = seg(t, T.transfers + i * .15, T.transfers + i * .15 + .25); m.visible = k > .01; m.scale.setScalar(Math.max(k, .01)); });
  confetti.forEach((c, i) => { const k = t - T.congrats; if (k < 0 || k > 5) { c.m.position.y = -9; return; }
    c.m.position.set(cat.position.x + Math.cos(c.a) * c.v * k * .8, TY + 1.8 + c.up * k - 2.4 * k * k, cat.position.z + Math.sin(c.a) * c.v * k * .8); c.m.rotation.set(k * 7 + i, k * 5 + i * .5, 0); });
  // cat (on twos)
  { const t0 = t; t = Math.floor(t * 12) / 12;
    body.position.y = Math.sin(t * 2.2) * .012;
    const puff = t > T.one - .1 ? Math.max(0, Math.sin(clamp((t - T.one + .1) / .9) * Math.PI)) : 0;
    body.scale.set(1 + .25 * puff, 1 + .16 * puff, 1 + .25 * puff);
    cat.position.y = TY + Math.max(0, Math.sin(clamp((t - T.congrats) / .6) * Math.PI)) * .3;
    head.rotation.y = chaosSpin(t);
    head.rotation.z = Math.sin(t * 1.3) * .05 + .14 * Math.sin(clamp((t - T.turf) / .5) * Math.PI);
    const sw = seg(t, T.one - .4, T.one - .05), back = seg(t, T.one + .3, T.one + .8);
    pawR.rotation.x = -1.8 * eo(sw) * (1 - back);
    tail.forEach((g, i) => { g.rotation.x = -.25 + Math.sin(t * 2.6 - i * .6) * .18; g.rotation.z = Math.sin(t * 1.7 - i * .5) * .2; });
    const blink = (t % 3.3) < .12;
    M.face.uniforms.map.value = blink ? FACE.blink : (t > T.ibx && t < T.ibx + 1.6) || (t > T.one && t < T.one + 1.2) ? FACE.wide : FACE.open;
    t = t0; }
  setCamera(t);
  renderer.setRenderTarget(rt); renderer.render(scene, camera);
  renderer.setRenderTarget(null); crt.material.uniforms.tSrc.value = rt.texture; crt.material.uniforms.time.value = t; renderer.render(crtScene, crtCam);
  drawOverlay(t, camera, { W, H: 1920, T, M2W, LY, CUES });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
