// Optimus teardown — Exploded Teardown, 1080×1920. A schematic humanoid (no logos, not to scale) on a studio plinth.
// Units ≈ metres. Y up, robot faces +z (toward the default camera).
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, eio, eo, track } from '/core/lib.js';
import { initOverlay, drawOverlay, overlayTexts } from './overlay.js';

const W = 1080, H = 1920;
const Q = new URLSearchParams(location.search);
const SSAA = +(Q.get('ssaa') || 1);
const TL = await (await fetch('timeline.json')).json();
const VDUR = await (await fetch('voice/dur.json')).json();
const DUR = TL.dur;
const CUES = []; for (const v of TL.vo) { const d = VDUR[v.id]; const n = v.chunks.map(c => c.replace(/[^A-Za-z0-9]/g, '').length + 2), tot = n.reduce((a, b) => a + b, 0); let t = v.t; v.chunks.forEach((c, i) => { CUES.push({ id: v.id, i, t }); t += d * n[i] / tot; }); }
const cue = (id, i) => CUES.find(c => c.id === id && c.i === i).t;
const T = {
  hook: cue('v01', 0), this: cue('v02', 0), optimus: cue('v02', 1), rule: cue('v02', 3), work: cue('v02', 4),
  inside: cue('v03', 0), act28: cue('v03', 1), designs: cue('v03', 2), rotary: cue('v03', 3), linear: cue('v03', 4),
  rot2: cue('v04', 0), lin2: cue('v04', 2), muscle: cue('v04', 3),
  prs0: cue('v05', 0), prs: cue('v05', 1), piano: cue('v05', 2),
  hands: cue('v06', 0), dof: cue('v06', 1), double: cue('v06', 2),
  power: cue('v07', 0), kwh: cue('v07', 1), torso: cue('v07', 2),
  eyes: cue('v08', 0), cams: cue('v08', 1), brain: cue('v08', 2), fsd: cue('v08', 3),
  learn: cue('v09', 0), show: cue('v09', 1), suits: cue('v09', 2), sim: cue('v09', 3),
  plan: cue('v10', 0), fact: cue('v10', 1), comp: cue('v10', 2), homes: cue('v10', 3),
  goals: cue('v11', 0), line: cue('v11', 1), price: cue('v11', 3),
  course: cue('v12', 0), beauty: cue('v12', 2), rise: cue('v12', 3), next: cue('v13', 0),
};
window.T = T;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, .05, 120);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, ao: false });
post.bloom.strength = .5; post.bloom.radius = .5; post.bloom.threshold = 1.6;
post.vig.uniforms.amt.value = .38; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .08;
const bgC = document.createElement('canvas'); bgC.width = 270; bgC.height = 480; const bgG = bgC.getContext('2d');
const bgTex = new THREE.CanvasTexture(bgC); bgTex.colorSpace = THREE.SRGBColorSpace; scene.background = bgTex;
let bgKey = '';
function paintBg(a, b, c) { const k = a + b + c; if (k === bgKey) return; bgKey = k; const gr = bgG.createRadialGradient(140, 215, 20, 135, 240, 380); gr.addColorStop(0, a); gr.addColorStop(.45, b); gr.addColorStop(1, c); bgG.fillStyle = gr; bgG.fillRect(0, 0, 270, 480); bgTex.needsUpdate = true; }
const mixHex = (a, b, k) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), clamp(k)).getHexString();
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = .55; scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff1e2', 1.7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 40 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 6, 3, 4); scene.add(rim);
const hemi = new THREE.HemisphereLight('#c9d3e0', '#1a1712', .25); scene.add(hemi);
const glow = new THREE.PointLight('#ffb070', 0, 8, 1.4); scene.add(glow);   // sunrise in the closer

// ---------- materials ----------
const M = {
  shell: new THREE.MeshPhysicalMaterial({ color: '#eceae4', roughness: .32, metalness: .05, clearcoat: .8, clearcoatRoughness: .2, side: THREE.DoubleSide, transparent: true }),
  shellF: null,
  dark: new THREE.MeshPhysicalMaterial({ color: '#25272b', roughness: .45, metalness: .5 }),
  bone: new THREE.MeshStandardMaterial({ color: '#5a5f66', roughness: .4, metalness: .8 }),
  visor: new THREE.MeshPhysicalMaterial({ color: '#07080a', roughness: .08, metalness: .2, clearcoat: 1, side: THREE.DoubleSide, transparent: true }),
  rot: new THREE.MeshPhysicalMaterial({ color: '#3d8bff', roughness: .35, metalness: .5, clearcoat: .4, emissive: '#3d8bff', emissiveIntensity: 0 }),
  lin: new THREE.MeshPhysicalMaterial({ color: '#ff6b3d', roughness: .35, metalness: .4, clearcoat: .4, emissive: '#ff6b3d', emissiveIntensity: 0 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#d4d8dc', roughness: .12, metalness: 1 }),
  cell: new THREE.MeshPhysicalMaterial({ color: '#2b3a30', roughness: .4, metalness: .3, emissive: '#4dff9a', emissiveIntensity: 0 }),
  pcb: new THREE.MeshPhysicalMaterial({ color: '#1d5b3a', roughness: .5 }),
  chip: new THREE.MeshPhysicalMaterial({ color: '#16181b', roughness: .3, metalness: .6, emissive: '#59d4ff', emissiveIntensity: 0 }),
  lens: new THREE.MeshPhysicalMaterial({ color: '#0b0c0e', roughness: .05, metalness: .3, emissive: '#59d4ff', emissiveIntensity: 0 }),
  cone: new THREE.MeshBasicMaterial({ color: '#59d4ff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
  plinth: new THREE.MeshPhysicalMaterial({ color: '#1b1d20', roughness: .55, metalness: .3, clearcoat: .3 }),
  ring: new THREE.MeshBasicMaterial({ color: '#ff6b3d', transparent: true, opacity: .0 }),
  crate: new THREE.MeshPhysicalMaterial({ color: '#c8a46a', roughness: .7 }),
  ghost: new THREE.MeshBasicMaterial({ color: '#59d4ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
  dot: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 }),
  wire: new THREE.MeshBasicMaterial({ color: '#59d4ff', wireframe: true, transparent: true, opacity: 0, depthWrite: false }),
  nut: new THREE.MeshPhysicalMaterial({ color: '#ff6b3d', roughness: .3, metalness: .4, transparent: true, opacity: .32, side: THREE.DoubleSide, depthWrite: false }),
};
M.shellF = M.shell.clone();   // front shell halves fade separately (so the battery/computer show through)
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };

// ---------- geometry helpers ----------
// lathe a capsule-like profile; half: 'F' front (z>0) or 'B' back
function capsuleProfile(r0, r1, len, n = 10) { // r0 at top (y=0), r1 at bottom (y=-len)
  const p = []; for (let i = 0; i <= n; i++) { const a = Math.PI / 2 * i / n; p.push(new THREE.Vector2(Math.sin(a) * r0 + 1e-4, -r0 + Math.cos(a) * r0)); }
  for (let i = n; i >= 0; i--) { const a = Math.PI / 2 * i / n; p.push(new THREE.Vector2(Math.sin(a) * r1 + 1e-4, -len + r1 - Math.cos(a) * r1)); }
  return p.reverse().map(v => v).reverse();
}
const lathe = (pts, half) => new THREE.LatheGeometry(pts, 28, half === 'F' ? -Math.PI / 2 : Math.PI / 2, Math.PI);
const cyl = (r, h, mat, seg = 24) => sh(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat));

// ---------- the robot rig ----------
// shells: [{ m, dir: Vector3 (local push direction), k }] — exploded by ek
function makeRobot(opt = {}) {
  const R = { shells: [], rot: [], lin: [], fingers: { L: [], R: [] }, J: {} };
  const simple = !!opt.simple, shellMat = opt.mat || M.shell, shellFMat = opt.mat || M.shellF;
  const root = new THREE.Group(); R.root = root;
  const addShell = (parent, pts, y = 0, sx = 1, sz = 1, push = .09) => {
    for (const h of ['F', 'B']) {
      const m = sh(new THREE.Mesh(lathe(pts, h), h === 'F' ? shellFMat : shellMat)); m.position.y = y; m.scale.set(sx, 1, sz); parent.add(m);
      R.shells.push({ m, base: m.position.clone(), dir: new THREE.Vector3(0, 0, h === 'F' ? 1 : -1), k: push, front: h === 'F' });
    }
  };
  const bone = (parent, len, r = .022) => { if (simple) return; const b = cyl(r, len, M.bone, 10); b.position.y = -len / 2; parent.add(b); };
  const rotAct = (parent, x, y, z, r = .045, h = .05, axis = 'x') => { if (simple) return; const m = cyl(r, h, M.rot, 24); m.position.set(x, y, z); if (axis === 'x') m.rotation.z = Math.PI / 2; if (axis === 'z') m.rotation.x = Math.PI / 2; parent.add(m); R.rot.push(m); };
  const linAct = (parent, x, y0, z, len, r = .02) => { if (simple) return; const g = new THREE.Group(); g.position.set(x, y0, z); parent.add(g);
    const body = cyl(r, len * .6, M.lin, 16); body.position.y = -len * .3; g.add(body); const rod = cyl(r * .45, len * .5, M.chrome, 10); rod.position.y = -len * .72; g.add(rod); R.lin.push({ g, body, rod, len }); };
  // pelvis
  const hips = new THREE.Group(); hips.position.y = .96; root.add(hips); R.J.hips = hips;
  addShell(hips, capsuleProfile(.11, .09, .16), .06, 1.35, .85, .06);
  // waist → torso
  const waist = new THREE.Group(); waist.position.y = .06; hips.add(waist); R.J.waist = waist;
  rotAct(waist, 0, .02, 0, .06, .05, 'y'); rotAct(waist, 0, .075, 0, .055, .05, 'x');
  const torso = new THREE.Group(); torso.position.y = .44; waist.add(torso); R.J.torso = torso;
  { const p = []; const prof = [[0, .0], [.085, .0], [.13, -.03], [.15, -.12], [.14, -.24], [.115, -.34], [.105, -.40], [0, -.40]]; for (const [r, y] of prof) p.push(new THREE.Vector2(r + 1e-4, y));
    addShell(torso, p, 0, 1.25, .78, .16); }
  if (!simple) { const spine = cyl(.025, .42, M.bone, 10); spine.position.set(0, -.2, -.05); torso.add(spine); }
  // battery pack + computer inside the torso
  const batt = new THREE.Group(); batt.position.set(0, -.22, .0); torso.add(batt); R.batt = batt;
  if (!simple) { batt.add(sh(new THREE.Mesh(new RoundedBoxGeometry(.24, .2, .13, 3, .015), M.dark)));
    const cg = new THREE.CylinderGeometry(.013, .013, .16, 10); for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { const c = new THREE.Mesh(cg, M.cell); c.position.set(-.085 + i * .034, 0, .03 + j * .0); c.position.z = .068; c.rotation.x = 0; if (j) continue; batt.add(c); } }
  const comp = new THREE.Group(); comp.position.set(0, -.07, .02); torso.add(comp); R.comp = comp;
  if (!simple) { comp.add(sh(new THREE.Mesh(new THREE.BoxGeometry(.2, .1, .012), M.pcb))); const ch = sh(new THREE.Mesh(new THREE.BoxGeometry(.05, .05, .012), M.chip)); ch.position.set(-.04, 0, .01); comp.add(ch); const ch2 = ch.clone(); ch2.position.x = .04; comp.add(ch2); }
  // neck + head
  const neck = new THREE.Group(); neck.position.y = .03; torso.add(neck); R.J.neck = neck;
  if (!simple) { const nk = cyl(.03, .07, M.dark, 12); nk.position.y = .035; neck.add(nk); }
  const head = new THREE.Group(); head.position.y = .07; neck.add(head); R.J.head = head;
  { const p = []; const prof = [[0, .2], [.06, .195], [.095, .17], [.105, .12], [.1, .05], [.085, .01], [0, 0]]; for (const [r, y] of prof.reverse()) p.push(new THREE.Vector2(r + 1e-4, y));
    p.reverse(); addShell(head, p.reverse(), 0, .95, 1.05, .09);
    const vg = new THREE.SphereGeometry(.104, 32, 16, Math.PI * .18, Math.PI * .64, Math.PI * .34, Math.PI * .28); const visor = sh(new THREE.Mesh(vg, opt.mat || M.visor)); visor.position.y = .1; visor.scale.set(.97, 1.1, 1.13); head.add(visor); R.visor = visor; R.shells.push({ m: visor, base: visor.position.clone(), dir: new THREE.Vector3(0, 0, 1), k: .09, front: true }); }
  if (!simple) { const cm = new THREE.Group(); cm.position.set(0, .11, .07); head.add(cm); R.cams = []; R.cones = [];
    for (const x of [-.035, .035]) { const l = sh(new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .02, 16).rotateX(Math.PI / 2), M.lens)); l.position.set(x, 0, 0); cm.add(l); R.cams.push(l);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(.35, 1.4, 32, 1, true).rotateX(-Math.PI / 2).translate(0, 0, .7), M.cone); cone.position.set(x, 0, .01); cm.add(cone); R.cones.push(cone); }
    const brainBox = sh(new THREE.Mesh(new THREE.BoxGeometry(.1, .05, .05), M.dark)); brainBox.position.set(0, .11, .0); head.add(brainBox); }
  // arms
  const side = s => (s === 'L' ? 1 : -1);
  for (const S of ['L', 'R']) { const sx = side(S);
    const shoulder = new THREE.Group(); shoulder.position.set(.2 * sx, -.06, -.01); torso.add(shoulder); R.J['sh' + S] = shoulder;
    rotAct(shoulder, -.03 * sx, 0, 0, .05, .05, 'x'); rotAct(shoulder, .02 * sx, -.04, 0, .045, .045, 'z'); rotAct(shoulder, .02 * sx, -.1, 0, .04, .04, 'y');
    addShell(shoulder, capsuleProfile(.06, .052, .3), .04, 1, 1, .08);
    bone(shoulder, .3);
    const elbow = new THREE.Group(); elbow.position.y = -.28; shoulder.add(elbow); R.J['el' + S] = elbow;
    rotAct(elbow, 0, 0, 0, .04, .05, 'x');
    addShell(elbow, capsuleProfile(.048, .04, .26), .01, 1, 1, .07);
    bone(elbow, .24, .016);
    linAct(elbow, .022 * sx, -.03, -.01, .18, .014); linAct(elbow, -.022 * sx, -.03, -.01, .18, .014);
    const wrist = new THREE.Group(); wrist.position.y = -.25; elbow.add(wrist); R.J['wr' + S] = wrist;
    rotAct(wrist, 0, 0, 0, .025, .04, 'y');
    const hand = new THREE.Group(); hand.rotation.y = -sx * Math.PI / 2; wrist.add(hand); R.J['hand' + S] = hand;
    const palm = sh(new THREE.Mesh(new RoundedBoxGeometry(.08, .09, .03, 2, .01), opt.mat || M.shell)); palm.position.y = -.055; hand.add(palm);
    if (!simple) { const fg = new THREE.BoxGeometry(.016, .028, .018); const fx = [-.03, -.01, .01, .03];
      for (let f = 0; f < 5; f++) { const thumb = f === 4; let parent = new THREE.Group(); if (thumb) { parent.position.set(.045 * 1, -.04, .0); parent.rotation.z = .7; } else parent.position.set(fx[f], -.1, 0); hand.add(parent); const chain = [parent];
        const n = thumb ? 2 : 3; let p = parent; for (let k = 0; k < n; k++) { const seg = new THREE.Group(); if (k) seg.position.y = -.03; p.add(seg); const m = sh(new THREE.Mesh(fg, k % 2 ? M.dark : M.shell)); m.position.y = -.015; m.scale.set(1, thumb ? 1 : (1 - k * .12), 1); seg.add(m); chain.push(seg); p = seg; }
        R.fingers[S].push(chain); } }
  }
  // legs
  for (const S of ['L', 'R']) { const sx = side(S);
    const hip = new THREE.Group(); hip.position.set(.09 * sx, -.04, 0); hips.add(hip); R.J['hip' + S] = hip;
    rotAct(hip, .0, 0, 0, .055, .05, 'x'); rotAct(hip, .0, .03, -.04, .045, .04, 'z'); rotAct(hip, .0, -.06, 0, .045, .045, 'y');
    addShell(hip, capsuleProfile(.075, .058, .42), .02, 1, 1, .09);
    bone(hip, .42, .025);
    linAct(hip, .03 * sx, -.08, -.03, .3, .022);
    const knee = new THREE.Group(); knee.position.y = -.42; hip.add(knee); R.J['kn' + S] = knee;
    addShell(knee, capsuleProfile(.058, .045, .4), .02, 1, 1, .08);
    bone(knee, .4, .02);
    linAct(knee, .025 * sx, -.04, -.035, .3, .018); linAct(knee, -.025 * sx, -.04, -.035, .3, .018);
    const ankle = new THREE.Group(); ankle.position.y = -.42; knee.add(ankle); R.J['an' + S] = ankle;
    const foot = sh(new THREE.Mesh(new RoundedBoxGeometry(.1, .05, .24, 2, .02), opt.mat || M.dark)); foot.position.set(0, -.025, .04); ankle.add(foot);
  }
  R.nRot = R.rot.length; R.nLin = R.lin.length;
  return R;
}

const bot = makeRobot(); scene.add(bot.root);
window.ACT = [bot.nRot, bot.nLin];

// plinth
const plinth = sh(new THREE.Mesh(new THREE.CylinderGeometry(.75, .8, .08, 64), M.plinth)); plinth.position.y = -.04; scene.add(plinth);
const ringL = new THREE.Mesh(new THREE.TorusGeometry(.76, .006, 6, 96), M.ring); ringL.rotation.x = Math.PI / 2; ringL.position.y = .002; scene.add(ringL);
const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshPhysicalMaterial({ color: '#141518', roughness: .8 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.08; floor.receiveShadow = true; scene.add(floor);
const grid = new THREE.GridHelper(40, 80, '#59d4ff', '#59d4ff'); grid.material.transparent = true; grid.material.opacity = 0; grid.material.depthWrite = false; grid.position.y = -.075; scene.add(grid);

// crate ("built to work")
const crate = sh(new THREE.Mesh(new RoundedBoxGeometry(.42, .24, .26, 2, .015), M.crate)); scene.add(crate);

// ---------- planetary roller screw (exploded beside the thigh) ----------
const prs = new THREE.Group(); scene.add(prs);
const PRS_POS = new THREE.Vector3(.55, .95, .25);
const prsScrew = new THREE.Group(); prs.add(prsScrew);
{ const core = cyl(.03, .7, M.chrome, 24); prsScrew.add(core);
  const pts = []; for (let i = 0; i <= 500; i++) { const u = i / 500, a = u * 70; pts.push(new THREE.Vector3(Math.cos(a) * .031, -.35 + u * .7, Math.sin(a) * .031)); }
  prsScrew.add(sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 900, .005, 5), M.bone))); }
const rollers = [];
for (let k = 0; k < 8; k++) { const g = new THREE.Group(); prs.add(g); const r = cyl(.012, .16, M.bone, 12); g.add(r);
  for (let j = 0; j < 9; j++) { const tr = new THREE.Mesh(new THREE.TorusGeometry(.012, .003, 4, 14), M.chrome); tr.rotation.x = Math.PI / 2; tr.position.y = -.07 + j * .0175; g.add(tr); } rollers.push(g); }
const prsNut = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .2, 40, 1, true), M.nut); prs.add(prsNut);
const prsNutEnds = [-.1, .1].map(y => { const m = new THREE.Mesh(new THREE.TorusGeometry(.07, .006, 6, 40), M.lin); m.rotation.x = Math.PI / 2; m.position.y = y; prs.add(m); return m; });

// ---------- hero hand (exploded out beside the robot for the hand beat) ----------
const hero = new THREE.Group(); scene.add(hero);
const HERO_POS = new THREE.Vector3(-.5, 1.2, .5);
const heroF = [];
{ const hs = new THREE.MeshPhysicalMaterial({ color: '#eceae4', roughness: .32, clearcoat: .8, clearcoatRoughness: .2 });
  const palm = sh(new THREE.Mesh(new RoundedBoxGeometry(.3, .32, .09, 3, .03), hs)); hero.add(palm);
  const wristB = cyl(.07, .1, M.dark, 24); wristB.position.y = -.2; hero.add(wristB);
  const fx = [-.105, -.035, .035, .105], fl = [.07, .08, .075, .06];
  for (let f = 0; f < 5; f++) { const thumb = f === 4; const base = new THREE.Group(); if (thumb) { base.position.set(.17, -.02, .0); base.rotation.z = -.55; } else base.position.set(fx[f], .16, 0); hero.add(base);
    const chain = []; let par = base; const n = 3;
    for (let k = 0; k < n; k++) { const sg = new THREE.Group(); if (k) sg.position.y = (thumb ? .07 : fl[f]) + .012; par.add(sg);
      const j = cyl(.026, .062, M.rot, 16); j.rotation.z = Math.PI / 2; sg.add(j);
      const L = (thumb ? .07 : fl[f]) * (1 - k * .1); const ph = sh(new THREE.Mesh(new RoundedBoxGeometry(.05, L, .05, 2, .016), hs)); ph.position.y = L / 2 + .012; sg.add(ph);
      chain.push(sg); par = sg; }
    heroF.push(chain); }
  for (const x of fx) { const tn = cyl(.004, .3, M.lin, 6); tn.position.set(x * .6, -.05, .05); hero.add(tn); } }
const heroK = t => eio(seg(t, T.hands - .35, T.hands + .45)) * (1 - eio(seg(t, T.power - .35, T.power + .25)));

// ---------- human demo ghost (motion-capture suit) + simulation copies ----------
const ghost = makeRobot({ simple: true, mat: M.ghost }); scene.add(ghost.root); ghost.root.position.set(-.75, 0, -.1);
const mocap = []; { const pts = [ghost.J.head, ghost.J.shL, ghost.J.shR, ghost.J.elL, ghost.J.elR, ghost.J.wrL, ghost.J.wrR, ghost.J.knL, ghost.J.knR, ghost.J.anL, ghost.J.anR, ghost.J.hips];
  for (const p of pts) { const d = new THREE.Mesh(new THREE.SphereGeometry(.018, 10, 8), M.dot); d.position.z = .07; p.add(d); mocap.push(d); } }
const sims = []; for (let i = 0; i < 10; i++) { const r = makeRobot({ simple: true, mat: M.wire }); const row = Math.floor(i / 5), col = i % 5; r.root.position.set((col - 2) * 1.1, 0, -1.6 - row * 1.4); r.root.visible = false; scene.add(r.root); sims.push(r); }
// production row (goal: volume)
const lineBots = []; for (let i = 0; i < 12; i++) { const r = makeRobot({ simple: true }); r.root.position.set(-.9 - (i % 6) * .62, 0, -.6 - Math.floor(i / 6) * 1.0 - (i % 6) * .55); r.root.visible = false; scene.add(r.root); lineBots.push(r); }

// ---------- poses ----------
const zeroPose = () => ({ waistY: 0, torsoX: 0, neckX: 0, neckY: 0, shLx: 0, shLz: .08, shRx: 0, shRz: .08, elL: .15, elR: .15, wrL: 0, wrR: 0, hipLx: 0, hipRx: 0, knL: 0, knR: 0, anL: 0, anR: 0, curlL: .15, curlR: .15, y: 0 });
function applyPose(R, p, curlSeq) {
  const J = R.J; J.waist.rotation.y = p.waistY; J.torso.rotation.x = p.torsoX; J.neck.rotation.x = p.neckX; J.neck.rotation.y = p.neckY;
  J.shL.rotation.set(-p.shLx, 0, p.shLz); J.shR.rotation.set(-p.shRx, 0, -p.shRz);
  J.elL.rotation.x = -p.elL; J.elR.rotation.x = -p.elR; J.wrL.rotation.y = p.wrL; J.wrR.rotation.y = p.wrR;
  J.hipL.rotation.x = -p.hipLx; J.hipR.rotation.x = -p.hipRx; J.knL.rotation.x = p.knL; J.knR.rotation.x = p.knR; J.anL.rotation.x = p.anL; J.anR.rotation.x = p.anR;
  R.root.position.y = p.y;
  for (const S of ['L', 'R']) R.fingers[S].forEach((ch, f) => { const c = curlSeq ? curlSeq(S, f) : p['curl' + S]; ch.slice(1).forEach((sg, k) => { sg.rotation.x = c * (k ? 1.1 : .9); }); });
}
const blend = (a, b, k) => { const o = {}; for (const n in a) o[n] = lerp(a[n], b[n] ?? a[n], k); return o; };
const P0 = zeroPose();
const P_HUNCH = { ...P0, neckX: .45, torsoX: .12, shLz: .05, shRz: .05, elL: .25, elR: .25, curlL: .6, curlR: .6, knL: .06, knR: .06, hipLx: .03, hipRx: .03 };
const P_CARRY = { ...P0, shLx: .55, shRx: .55, shLz: .12, shRz: .12, elL: 1.25, elR: 1.25, wrL: .0, wrR: .0, curlL: .9, curlR: .9, neckX: .15 };
const P_SQUAT = { ...P0, hipLx: .9, hipRx: .9, knL: 1.5, knR: 1.5, anL: -.6, anR: -.6, torsoX: .25, shLx: .9, shRx: .9, elL: .3, elR: .3, y: -.13 };
const P_REACH = { ...P0, shRx: 1.2, shRz: .15, elR: .35, curlR: .1, neckX: .25, torsoX: .1, waistY: -.15 };
const P_GRAB = { ...P_REACH, curlR: 1.1 };
const P_WAVE = { ...P0, shRx: .4, shRz: 2.3, elR: 1.1, neckX: -.25 };
const P_HAND = { ...P0, shRx: 1.25, shRz: .02, elR: .2, curlR: .15 };
const P_LOOKUP = { ...P0, neckX: -.35, shLz: .15, shRz: .15 };
function poseAt(t) {
  let p = blend(P_HUNCH, P0, eio(seg(t, T.hook + .5, T.this + .4)));
  p = blend(p, P_LOOKUP, ss(seg(t, T.hook + 1.0, T.this)) * (1 - ss(seg(t, T.optimus, T.rule))));
  const carry = eio(seg(t, T.work - .3, T.work + .7)) * (1 - eio(seg(t, T.inside - .3, T.inside + .4)));
  p = blend(p, P_CARRY, carry);
  // v04: rotary twist (shoulder & waist) then linear push (squat)
  const tw = seg(t, T.rot2, T.lin2); if (tw > 0 && tw < 1) { const s = Math.sin(tw * Math.PI * 2) * Math.sin(tw * Math.PI); p.waistY += .5 * s; p.shLx += .6 * s; p.shRx -= .6 * s; }
  const sq = Math.sin(Math.PI * seg(t, T.lin2 - .1, T.prs0 + .2)); p = blend(p, P_SQUAT, eio(sq) * .75);
  // v09: copy the human demo (delayed)
  const dem = demoK(t - .55); p = blend(p, P_REACH, dem.reach); p = blend(p, P_GRAB, dem.grab);
  // v12: look up into the light
  p = blend(p, P_LOOKUP, ss(seg(t, T.rise - .4, T.rise + 1.2)));
  p = blend(p, P_WAVE, eio(seg(t, T.next - .1, T.next + .8)) * .9);
  return p;
}
function demoK(t) { return { reach: eio(seg(t, T.show - .1, T.show + .9)) * (1 - eio(seg(t, T.sim + .4, T.sim + 1.3))), grab: ss(seg(t, T.suits, T.suits + .5)) * (1 - eio(seg(t, T.sim + .4, T.sim + 1.3))) }; }

// ---------- motion keys ----------
const explK = t => eo(seg(t, T.inside - .1, T.inside + 1.0)) * (1 - eio(seg(t, T.learn - .5, T.learn + .4)));
const handShellK = t => 0;
const batK = t => seg(t, T.power - .3, T.power + .3) * (1 - seg(t, T.learn - .5, T.learn));
const prsK = t => eio(seg(t, T.prs0 - .2, T.prs0 + .7)) * (1 - eio(seg(t, T.hands - .3, T.hands + .3)));

// ---------- camera: [t, az°, el°, dist, tx, ty, tz] ----------
const CAMK = [
  [0.0, 8, -12, 3.6, 0, 1.3, 0],
  [T.this - .1, 14, -6, 4.2, 0, 1.1, 0],
  [T.rule, 22, 4, 4.6, 0, 1.0, 0],
  [T.inside, 25, 6, 4.4, 0, 1.0, 0],
  [T.designs, 32, 8, 3.6, 0, 1.05, 0],
  [T.linear + .3, 28, 6, 3.5, 0, 1.0, 0],
  [T.rot2 + .3, 38, 10, 2.4, .05, 1.25, 0],
  [T.lin2 + .2, 30, 4, 2.8, .05, .65, 0],
  [T.prs0 + .3, 26, 4, 2.6, .25, .85, .1],
  [T.prs + .8, 34, 8, 1.4, .5, .95, .2],
  [T.piano + .5, 44, 10, 1.6, .48, .95, .2],
  [T.hands + .3, 30, 8, 2.9, -.2, 1.3, .3],
  [T.dof + .4, 36, 10, 2.5, -.2, 1.3, .3],
  [T.double + .5, 42, 12, 2.6, -.2, 1.3, .3],
  [T.power + .2, 22, 6, 2.2, 0, 1.2, 0],
  [T.kwh + .4, 26, 6, 1.6, 0, 1.25, 0],
  [T.torso + .6, 30, 6, 1.6, 0, 1.3, 0],
  [T.eyes + .3, 22, 2, 1.2, 0, 1.55, 0],
  [T.cams + .6, 32, 2, 1.05, 0, 1.6, 0],
  [T.brain + .1, 40, 6, 1.5, 0, 1.45, 0],
  [T.fsd + .9, 44, 8, 1.5, 0, 1.4, 0],
  [T.learn + .2, 10, 6, 4.0, -.35, 1.0, 0],
  [T.suits + .6, 4, 6, 3.9, -.35, 1.0, 0],
  [T.sim + .3, 12, 14, 6.2, -.1, 1.0, -.8],
  [T.plan + .1, 18, 14, 6.6, -.1, 1.3, -.8],
  [T.fact + .3, 24, 6, 5.4, -.3, 1.45, -.3],
  [T.homes + .4, 30, 6, 5.8, -.8, 1.45, -.6],
  [T.goals + .2, 36, 10, 5.6, -1.2, 1.0, -1.0],
  [T.price + .8, 42, 12, 6.0, -1.4, 1.0, -1.2],
  [T.course + .4, 14, 4, 4.6, 0, 1.1, 0],
  [T.rise + .3, 6, -8, 3.8, 0, 1.3, 0],
  [T.next, 4, -10, 3.7, 0, 1.25, 0],
  [DUR, 2, -8, 4.2, 0, 1.2, 0],
];
const camTrack = track(CAMK.map(k => [k[0], k.slice(1)]));
const HANDW = new THREE.Vector3();
function setCamera(t) {
  let [az, el, dist, tx, ty, tz] = camTrack(t);
  { const hk = heroK(t); if (hk > 0) { HANDW.copy(HERO_POS); HANDW.y += .02; tx = lerp(tx, HANDW.x, hk); ty = lerp(ty, HANDW.y, hk); tz = lerp(tz, HANDW.z, hk); } } const A = az * Math.PI / 180, E = el * Math.PI / 180;
  camera.position.set(tx + dist * Math.cos(E) * Math.sin(A), ty + dist * Math.sin(E), tz + dist * Math.cos(E) * Math.cos(A)); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  post.dof.focus = dist; post.dof.aper = 120; post.dof.maxCoc = 8;
  const la = A - .9; key.position.set(tx + 6 * Math.sin(la), ty + 7, tz + 6 * Math.cos(la)); key.target.position.set(tx, ty, tz);
  rim.position.set(tx + 4 * Math.sin(A + Math.PI * .85), ty + 1.5, tz + 4 * Math.cos(A + Math.PI * .85)); rim.lookAt(tx, ty, tz);
  return dist;
}

// ---------- events ----------
const EV = [{ t: T.hook + .1, type: 'drill' }, { t: T.this, type: 'land' }, { t: T.work, type: 'clunk' }, { t: T.inside, type: 'spread' }, { t: T.act28, type: 'pins' }, { t: T.rotary, type: 'label' }, { t: T.linear, type: 'label' },
  { t: T.rot2, type: 'buzz' }, { t: T.lin2, type: 'hydraulic' }, { t: T.prs0, type: 'lift' }, { t: T.prs, type: 'buzz' }, { t: T.piano, type: 'land' }, { t: T.dof, type: 'pins' }, { t: T.double, type: 'label' },
  { t: T.kwh, type: 'buzz' }, { t: T.cams, type: 'label' }, { t: T.fsd, type: 'label' }, { t: T.learn, type: 'land' }, { t: T.show, type: 'label' }, { t: T.sim, type: 'spread' },
  { t: T.fact, type: 'card' }, { t: T.comp, type: 'card' }, { t: T.homes, type: 'card' }, { t: T.line + .3, type: 'coin' }, { t: T.price + .3, type: 'coin' }, { t: T.next, type: 'card' }];
window.EV = EV.sort((a, b) => a.t - b.t); window.DUR = DUR;

// ---------- frame ----------
await initOverlay({ VDUR, TL });
window.render = t => {
  // mood: red hook → neutral studio → warm closer
  const red = 1 - ss(seg(t, T.this - .3, T.this + .6)), warm = ss(seg(t, T.course, T.rise + 1)), simB = ss(seg(t, T.sim - .3, T.sim + .4)) * (1 - ss(seg(t, T.plan, T.plan + .6)));
  let c0 = mixHex('#34363a', '#3a1414', red), c1 = mixHex('#222427', '#1c0a0a', red), c2 = mixHex('#0d0e10', '#060303', red);
  c0 = mixHex(c0, '#5a3a22', warm); c1 = mixHex(c1, '#2a1a12', warm); c0 = mixHex(c0, '#0f2a38', simB); c1 = mixHex(c1, '#0a1822', simB); paintBg(c0, c1, c2);
  key.intensity = lerp(1.7, .35, red); rim.color.set(mixHex(mixHex('#dfe9ff', '#ff3a2a', red), '#ffb070', warm)); rim.intensity = lerp(6, 14, red) + 6 * warm;
  hemi.intensity = lerp(.25, .08, red); scene.environmentIntensity = lerp(.55, .2, red);
  glow.position.set(0, 1.8 + warm * 1.2, -2.4); glow.intensity = 6 * warm;
  // pose
  const p = poseAt(t);
  const dofSeq = (S, f) => { if (t > T.dof - .2 && t < T.power) { const ph = (t - T.dof) * 3.2 - f * .55; return .15 + .95 * Math.max(0, Math.sin(ph)) ** 2; } return p['curl' + S]; };
  applyPose(bot, p, dofSeq);
  // turntable spin in the teardown, faces front otherwise
  bot.root.rotation.y = .35 * Math.sin(seg(t, T.inside, T.prs0) * Math.PI) * 0;
  // explode shells
  const ek = explK(t), bk = batK(t), hd = seg(t, T.eyes - .3, T.eyes + .3) * (1 - seg(t, T.learn - .5, T.learn));
  for (const s of bot.shells) { const extra = s.front ? (bk * .1) : 0; s.m.position.copy(s.base).addScaledVector(s.dir, (s.k * ek + extra) * (s.front ? 1 : .6)); }
  M.shellF.opacity = lerp(1, .22, ek); M.shellF.depthWrite = ek < .5; M.shell.opacity = lerp(1, .55, ek); M.shell.depthWrite = ek < .5;
  M.visor.opacity = lerp(1, .3, Math.max(ek * .4, hd));
  // actuator highlight
  const rk = ss(seg(t, T.rotary - .1, T.rotary + .3)) * (1 - ss(seg(t, T.prs0, T.prs0 + .4))), lk = ss(seg(t, T.linear - .1, T.linear + .3)) * (1 - ss(seg(t, T.prs0 + .6, T.prs0 + 1)));
  const count = clamp((t - T.act28) / 1.2) * bot.rot.length * 0 ;
  M.rot.emissiveIntensity = .9 * rk + .35 * ek * (1 - rk) * seg(t, T.act28, T.act28 + .4); M.lin.emissiveIntensity = .9 * lk + .35 * ek * (1 - lk) * seg(t, T.act28, T.act28 + .4);
  const spinOn = t > T.rot2 && t < T.lin2 + .3; bot.rot.forEach((m, i) => { if (spinOn) m.rotation.y = (t - T.rot2) * 6; });
  bot.lin.forEach(l => { const ext = p.knL > .2 ? .4 * p.knL / 1.5 : 0; l.rod.position.y = -l.len * (.72 + ext * .4); });
  // battery / computer / cameras
  M.cell.emissiveIntensity = 1.6 * ss(seg(t, T.kwh - .2, T.kwh + .3)) * (1 - seg(t, T.eyes, T.eyes + .4)) * (.75 + .25 * Math.sin(t * 6));
  const camK = ss(seg(t, T.cams - .2, T.cams + .3)) * (1 - seg(t, T.brain + .2, T.brain + .6));
  M.lens.emissiveIntensity = 2.5 * camK; M.cone.opacity = .14 * camK;
  M.chip.emissiveIntensity = 2.2 * ss(seg(t, T.fsd - .2, T.fsd + .3)) * (1 - seg(t, T.learn - .5, T.learn)) * (.8 + .2 * Math.sin(t * 9));
  bot.cones.forEach(c => c.visible = camK > .01);
  bot.root.updateMatrixWorld(true);
  // crate
  const carry = eio(seg(t, T.work - .3, T.work + .7)), drop = eio(seg(t, T.inside - .3, T.inside + .4));
  crate.visible = carry > 0 && drop < 1; { const a = bot.J.handL.getWorldPosition(new THREE.Vector3()), b = bot.J.handR.getWorldPosition(new THREE.Vector3()); const hy = (a.y + b.y) / 2 - .17, hz = (a.z + b.z) / 2 + .02; crate.position.set(0, lerp(.11, hy, carry) - drop * (hy - .11), lerp(.6, hz, carry)); }
  // hero hand: flies out of the right wrist, fingers wave through their joints
  { const hk = heroK(t); hero.visible = hk > .01; bot.J.handR.getWorldPosition(HANDW); hero.position.lerpVectors(HANDW, HERO_POS, hk); hero.scale.setScalar(lerp(.25, 1, hk)); hero.rotation.set(0, -.25, 0);
    heroF.forEach((ch, f) => { const ph = (t - T.dof) * 2.6 - f * .5; const c = t > T.dof - .3 ? .15 + 1.0 * Math.max(0, Math.sin(ph)) ** 2 : .12; ch.forEach((sg, k) => { sg.rotation.x = -c * (k ? 1.0 : .7); }); });
    bot.J.handR.visible = hk < .5; }
  // planetary roller screw
  const pk = prsK(t); prs.visible = pk > .01; prs.position.copy(PRS_POS).add(new THREE.Vector3(-.4 * (1 - pk), -.1 * (1 - pk), 0)); prs.scale.setScalar(lerp(.3, 1.2, pk)); prs.rotation.z = -.35;
  const spin = t * 5; prsScrew.position.y = .12 * Math.sin(t * 1.4); prsNut.position.y = 0;
  rollers.forEach((g, k) => { const a = k / 8 * Math.PI * 2 + spin * .4; g.position.set(Math.cos(a) * .043, prsScrew.position.y * .5, Math.sin(a) * .043); g.rotation.y = -spin * 2; });
  prsScrew.rotation.y = spin;
  // human demo ghost + mocap dots
  const gk = ss(seg(t, T.learn + .2, T.show)) * (1 - ss(seg(t, T.sim + .6, T.sim + 1.4)));
  M.ghost.opacity = .22 * gk; M.dot.opacity = gk; ghost.root.visible = gk > .01;
  { const d = demoK(t); let gp = blend(P0, { ...P_REACH, shRx: P_REACH.shRx, waistY: .15 }, d.reach); gp = blend(gp, { ...P_GRAB, waistY: .15 }, d.grab); applyPose(ghost, gp); }
  // simulation copies
  M.wire.opacity = .5 * simB; grid.material.opacity = .35 * simB;
  sims.forEach((r, i) => { r.root.visible = simB > .01; const ph = t * 1.3 + i * 1.7; const pp = blend(P0, i % 3 ? P_REACH : P_SQUAT, .5 + .5 * Math.sin(ph)); applyPose(r, pp); r.root.rotation.y = Math.sin(i * 2.1) * .6; });
  // production row (volume goal)
  const lk2 = seg(t, T.goals - .4, T.goals + 1.4) , lout = ss(seg(t, T.course - .2, T.course + .8));
  lineBots.forEach((r, i) => { const k = ss(clamp(lk2 * 2.2 - i * .1)) * (1 - lout); r.root.visible = k > .01; r.root.scale.setScalar(Math.max(k, .001)); applyPose(r, P0); });
  // plinth ring
  M.ring.opacity = .6 * (1 - red) * (1 - simB);
  bot.root.updateMatrixWorld(true);
  const dist = setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { W, H, T, bot, prs, ghost, ek, lineBots });
};
window.TEXTS = () => overlayTexts();
await document.fonts.ready;
window.render(Number(Q.get('t') || 0));
window.READY = true;
