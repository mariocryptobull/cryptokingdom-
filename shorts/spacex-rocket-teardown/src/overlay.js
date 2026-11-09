// Marks layer: anchored labels, cards, captions. 1080×1920. main.js drives what is shown when.
import * as THREE from 'three';
import { seg, ss, eo } from '/core/lib.js';

const cv = document.getElementById('ov'), g = cv.getContext('2d');
export const MONO = '"JBMono", monospace', SANS = '"Inter", sans-serif';
export const INK = '#f1efe9', DIM = 'rgba(241,239,233,.66)', ACC = '#ff6b3d', LINE = 'rgba(241,239,233,.78)', BLUE = '#6cc4ff', GREEN = '#9be86f';
const CAP = { font: `800 54px ${SANS}`, y: 1430, max: 960 };

let CUES = [], texts = [], CAM, Wd, Hd;
export function initOverlay({ VDUR, TL }) {
  for (let li = 0; li < TL.vo.length; li++) {
    const v = TL.vo[li], d = VDUR[v.id], next = TL.vo[li + 1] ? TL.vo[li + 1].t : TL.dur;
    const n = v.chunks.map(c => c.replace(/[^A-Za-z0-9]/g, '').length + 2), tot = n.reduce((a, b) => a + b, 0);
    let t = v.t;
    v.chunks.forEach((c, i) => { const dt = d * n[i] / tot, last = i === v.chunks.length - 1; CUES.push({ t0: t - .04, t1: last ? Math.min(t + dt + .45, next - .06) : t + dt - .02, text: c }); t += dt; });
  }
}
export const overlayTexts = () => texts;
const v3 = new THREE.Vector3();
export const proj = v => { v3.copy(v).project(CAM); return [(v3.x + 1) / 2 * Wd, (1 - v3.y) / 2 * Hd, v3.z]; };
export const fade = (t, a, d = .3) => ss(seg(t, a, a + d));
export function begin(cam, W, H) { CAM = cam; Wd = W; Hd = H; texts = []; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); }

export function label(t, o) {
  const { t0, t1, a, ly, idx, name, spec, id } = o;
  const side = o.side || (a[0] > 560 ? 'L' : 'R'), lx = o.lx ?? (side === 'L' ? 470 : 610), dir = side === 'L' ? -1 : 1;
  const dl = eo(seg(t, t0, t0 + .38)), tx = fade(t, t0 + .18, .32), out = 1 - fade(t, t1 - .3, .3);
  if (dl <= 0 || out <= 0) return;
  const [ax, ay] = a, ex = lx - dir * 46;
  g.globalAlpha = out;
  g.fillStyle = INK; g.beginPath(); g.arc(ax, ay, 5, 0, 7); g.fill();
  g.strokeStyle = 'rgba(241,239,233,.4)'; g.lineWidth = 1.5; g.beginPath(); g.arc(ax, ay, 5 + 9 * dl, 0, 7); g.stroke();
  const s1 = Math.hypot(ex - ax, ly - ay), s2 = Math.abs(lx - dir * 16 - ex), len = (s1 + s2) * dl;
  g.strokeStyle = LINE; g.lineWidth = 2; g.beginPath(); g.moveTo(ax, ay);
  if (len <= s1) g.lineTo(ax + (ex - ax) * len / s1, ay + (ly - ay) * len / s1);
  else { g.lineTo(ex, ly); g.lineTo(ex + dir * (len - s1), ly); }
  g.stroke();
  if (tx <= 0) return;
  g.globalAlpha = out * tx; const dx = (1 - tx) * 12 * dir;
  g.textAlign = side === 'L' ? 'right' : 'left'; g.textBaseline = 'alphabetic';
  g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 12;
  if (idx) { g.fillStyle = o.idxCol || ACC; g.font = `500 24px ${MONO}`; g.fillText(idx, lx + dx, ly - 40); }
  g.fillStyle = INK; g.font = `700 44px ${SANS}`; g.fillText(name, lx + dx, ly + 4);
  let w = g.measureText(name).width;
  if (spec) { g.fillStyle = DIM; g.font = `400 26px ${MONO}`; g.fillText(spec, lx + dx, ly + 42); w = Math.max(w, g.measureText(spec).width); }
  g.shadowBlur = 0; g.textAlign = 'left';
  if (tx > .99 && out > .99) { const x0 = side === 'L' ? lx - w : lx, x1 = side === 'L' ? lx : lx + w; texts.push({ id, text: name + (spec ? ' ' + spec : ''), x0: Math.max(0, x0), y0: ly - 64, x1: Math.min(Wd, x1), y1: ly + 50 }); }
}

export function card(t, items, t0, t1) {
  for (const it of items) {
    const a = fade(t, t0 + it.d, .45) * (1 - fade(t, t1 - .35, .35)); if (a <= 0) continue;
    g.globalAlpha = a; g.font = it.font; g.fillStyle = it.col; g.textAlign = 'center';
    g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 14;
    const w = g.measureText(it.text).width, s = Math.min(1, 1000 / w);
    g.save(); g.translate(Wd / 2, it.y + (1 - a) * 12); g.scale(s, s); g.fillText(it.text, 0, 0); g.restore(); g.shadowBlur = 0;
    if (a > .99) texts.push({ id: it.id, text: it.text, x0: Wd / 2 - w * s / 2, y0: it.y - 70, x1: Wd / 2 + w * s / 2, y1: it.y + 14 });
    g.textAlign = 'left';
  }
  g.globalAlpha = 1;
}
// small pill tag (e.g. "SPACEX SAYS · PLANNED")
export function pill(t, text, y, t0, t1, col = ACC) {
  const a = fade(t, t0, .3) * (1 - fade(t, t1 - .3, .3)); if (a <= 0) return;
  g.globalAlpha = a; g.font = `600 28px ${MONO}`; const w = g.measureText(text).width + 44;
  g.fillStyle = 'rgba(14,15,17,.78)'; g.strokeStyle = col; g.lineWidth = 2;
  g.beginPath(); g.roundRect(Wd / 2 - w / 2, y - 34, w, 50, 25); g.fill(); g.stroke();
  g.fillStyle = col; g.textAlign = 'center'; g.fillText(text, Wd / 2, y + 1); g.textAlign = 'left'; g.globalAlpha = 1;
}
// a vertical dimension line between two screen points
export function dimLine(t, x, yTop, yBot, text, t0, t1) {
  const a = fade(t, t0, .4) * (1 - fade(t, t1 - .3, .3)); if (a <= 0) return;
  const k = eo(seg(t, t0, t0 + .7)), ym = (yTop + yBot) / 2, h = (yBot - yTop) / 2 * k;
  g.globalAlpha = a; g.strokeStyle = ACC; g.lineWidth = 3;
  g.beginPath(); g.moveTo(x, ym - h); g.lineTo(x, ym + h); g.moveTo(x - 14, ym - h); g.lineTo(x + 14, ym - h); g.moveTo(x - 14, ym + h); g.lineTo(x + 14, ym + h); g.stroke();
  g.save(); g.translate(x - 22, ym); g.rotate(-Math.PI / 2); g.font = `700 36px ${SANS}`; g.fillStyle = INK; g.textAlign = 'center';
  g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 10; g.fillText(text, 0, 0); g.restore(); g.shadowBlur = 0; g.globalAlpha = 1;
}
export function legend(t, items, y, t0, t1) {
  const a = fade(t, t0, .3) * (1 - fade(t, t1 - .3, .3)); if (a <= 0) return;
  g.globalAlpha = a; g.font = `500 28px ${MONO}`;
  const ws = items.map(i => g.measureText(i[1]).width + 50), tot = ws.reduce((p, q) => p + q, 0) + 30 * (items.length - 1);
  let x = Wd / 2 - tot / 2;
  items.forEach((it, i) => { g.fillStyle = it[0]; g.beginPath(); g.arc(x + 12, y - 9, 11, 0, 7); g.fill(); g.fillStyle = INK; g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 10; g.fillText(it[1], x + 34, y); g.shadowBlur = 0; x += ws[i] + 30; });
  g.globalAlpha = 1;
}
export function captions(t) {
  for (const cu of CUES) {
    if (t < cu.t0 || t > cu.t1) continue;
    const k = Math.min(fade(t, cu.t0, .08), 1 - fade(t, cu.t1 - .08, .08));
    g.globalAlpha = k; g.textAlign = 'center'; g.font = CAP.font;
    const w = g.measureText(cu.text).width, s = Math.min(1, CAP.max / w);
    g.save(); g.translate(Wd / 2, CAP.y); g.scale(s, s);
    g.lineJoin = 'round'; g.lineWidth = 10; g.strokeStyle = 'rgba(10,10,12,.9)'; g.strokeText(cu.text, 0, 0);
    g.fillStyle = INK; g.fillText(cu.text, 0, 0); g.restore(); g.textAlign = 'left';
  }
  g.globalAlpha = 1;
}
export const ctx2d = g;
