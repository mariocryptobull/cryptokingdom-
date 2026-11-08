// Builds "ME231 Test 2 Homework Collection.docx": every assigned HW problem since Test #1, one per page on engineering paper.
const L = require('../lib.js');
const { fs, path, PAGE, FONT, P, table, whiteBox, paperHeader, Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, LevelFormat } = L;
const CROPS = path.join(__dirname, 'crops');

const sets = [
  { due: 'Wed 10/14', topic: 'Differential relations (Ch 4)', probs: ['P4.1', 'P4.4', 'P4.9', 'P4.47', 'P4.51', 'P4.59', 'P4.27', 'P4.34'] },
  { due: 'Mon 10/19', topic: 'Bernoulli (Ch 3)', probs: ['P3.114', 'P3.124', 'P3.127'] },
  { due: 'Mon 10/26', topic: 'Dimensional analysis (Ch 5)', probs: ['P5.24', 'P5.31', 'P5.37', 'P5.72', 'P5.73', 'P5.74'] },
  { due: 'Mon 11/2', topic: 'Pipe flow (Ch 6)', probs: ['P6.4', 'P6.8', 'P6.18', 'P6.19', 'P6.43'] },
  { due: 'Wed 11/4', topic: 'Pipe flow (Ch 6)', probs: ['P6.52', 'P6.55'], missing: ['P6.103', 'P6.124'] },
];

function crop(label) {
  const buf = fs.readFileSync(path.join(CROPS, label + '.png'));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  let wIn = Math.min(6.0, (w / 300) * 1.45);
  if (wIn * h / w > 5.6) wIn = 5.6 * w / h;
  const W = Math.round(wIn * 96);
  return new Paragraph({ children: [new ImageRun({ type: 'png', data: buf, transformation: { width: W, height: Math.round(W * h / w) } })], alignment: AlignmentType.CENTER, spacing: { before: 60, after: 0 } });
}

const rows = [['Due', 'Topic', 'Problems']].concat(sets.map((s) => [s.due, s.topic, s.probs.map((p) => p.slice(1)).join(', ') + (s.missing ? `  (+ ${s.missing.map((p) => p.slice(1)).join(', ')}: not in the uploaded pages)` : '')]));
const sections = [{ properties: { page: PAGE }, headers: { default: paperHeader() }, children: [whiteBox([
  new Paragraph({ children: [new TextRun({ text: 'ME 231 Fluid Mechanics · Test #2 (Mon 11/9)', font: FONT, size: 26, bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
  new Paragraph({ children: [new TextRun({ text: 'Homework Collection', font: FONT, size: 44, bold: true, color: '1F3864' })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
  new Paragraph({ children: [new TextRun({ text: 'Every problem assigned since Test #1 · White & Xue, Fluid Mechanics 9th ed.', font: FONT, size: 22 })], alignment: AlignmentType.CENTER, spacing: { after: 160 } }),
  table(rows, [1300, 2600, 5388]),
  P(''),
  P('One problem per page, in syllabus order. Re-work each one cold on the grid below it, then compare with your graded copy. Your professor wrote and graded these, so they are the closest preview of the test.'),
  P('_P6.103 and P6.124 (due 11/4) are on book pages after 440, past the end of the uploaded PDF, so they are not included._', { size: 18 }),
])] }];
sets.forEach((s) => s.probs.forEach((id) => {
  sections.push({ properties: { page: PAGE }, headers: { default: paperHeader() }, children: [whiteBox([
    new Paragraph({ children: [new TextRun({ text: `${id} · HW due ${s.due} · ${s.topic}`, font: FONT, size: 20, bold: true, color: '1F3864' })], spacing: { after: 40 } }),
    crop(id),
  ])] });
}));

const doc = new Document({
  creator: 'Mario', title: 'ME231 Test 2 Homework Collection',
  styles: { default: { document: { run: { font: FONT, size: 22 } } } },
  numbering: { config: ['bul', 'num', 'num2'].map((r) => ({ reference: r, levels: [{ level: 0, format: r === 'bul' ? LevelFormat.BULLET : LevelFormat.DECIMAL, text: r === 'bul' ? '•' : '%1.', alignment: AlignmentType.LEFT }] })) },
  sections,
});
const out = path.join(__dirname, 'ME231 Test 2 Homework Collection.docx');
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(out, b); console.log('wrote', out); });
