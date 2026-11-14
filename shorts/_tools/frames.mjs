// Resumable frame render: node core/render/frames.mjs <demo> --out <dir> [--fps 24] [--workers 3] [--size WxH] [--q k=v]
// Writes f_00000.jpg … to <dir>; frames already on disk are skipped, so an interrupted render picks up where it stopped.
// Assemble afterwards: ffmpeg -framerate 24 -i <dir>/f_%05d.jpg -c:v libx264 -crf 14 -pix_fmt yuv420p video.mp4
import fs from 'fs'; import path from 'path';
import { openDemo, closeServer, requireDemo, takeSize } from './page.mjs';
const args = process.argv.slice(2), { w: W, h: H } = takeSize(args), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const dir = args[0]; requireDemo(dir);
const FPS = +opt('--fps', 24), WK = +opt('--workers', 3), Q = opt('--q', ''), out = path.resolve(opt('--out', path.join(dir, 'out', 'frames')));
fs.mkdirSync(out, { recursive: true });
const name = f => path.join(out, `f_${String(f).padStart(5, '0')}.jpg`);
const probe = await openDemo(dir, { w: W, h: H, q: Q }); const DUR = await probe.page.evaluate(() => window.DUR); await probe.browser.close();
const TOTAL = Math.round(DUR * FPS), todo = [...Array(TOTAL).keys()].filter(f => !fs.existsSync(name(f))), t0 = Date.now();
console.log(`${TOTAL} frames, ${TOTAL - todo.length} already on disk, ${todo.length} to render`);
let done = 0;
await Promise.all([...Array(WK)].map(async (_, w) => {
  const mine = todo.filter((_, i) => i % WK === w); if (!mine.length) return;
  const { browser, page } = await openDemo(dir, { w: W, h: H, q: Q });
  for (const f of mine) {
    await page.evaluate(t => window.render(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    fs.writeFileSync(name(f) + '.tmp', buf); fs.renameSync(name(f) + '.tmp', name(f));   // atomic: a killed render never leaves a half-written frame
    if (++done % 60 === 0) console.log(`${done}/${todo.length}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await browser.close();
}));
console.log('done', TOTAL, 'frames', ((Date.now() - t0) / 1000).toFixed(0) + 's'); closeServer();
