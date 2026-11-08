// Builds "ME231 Test 2 Prep Packet.docx": study guide, practice problems on engineering paper, step-by-step solutions.
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Header, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, AlignmentType, HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom, TextWrappingType, HeadingLevel, PageBreak, LevelFormat,
} = require('docx');

const D = __dirname;
const FIG = (f) => fs.readFileSync(path.isAbsolute(f) ? f : path.join(D, 'figs', f));
const PAPER = FIG('engineering_paper.jpg');
const FONT = 'Times New Roman';
const MATH = 'Cambria Math';
const PAGE = { size: { width: 12240, height: 15840 }, margin: { top: 1080, bottom: 864, left: 1584, right: 1368, header: 360, footer: 360 } };
const CW = 9288; // content width (DXA)

// ---------- text helpers ----------
// inline markup: **bold**, _italic_, `math`
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), font: FONT, ...base }));
    const t = m[0];
    if (t.startsWith('**')) out.push(new TextRun({ text: t.slice(2, -2), bold: true, font: FONT, ...base }));
    else if (t.startsWith('_')) out.push(new TextRun({ text: t.slice(1, -1), italics: true, font: FONT, ...base }));
    else out.push(new TextRun({ text: t.slice(1, -1), font: MATH, ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), font: FONT, ...base }));
  return out;
}
const P = (t, o = {}) => new Paragraph({ children: runs(t, { size: o.size || 22 }), spacing: { after: o.after ?? 100, line: 276 }, alignment: o.align });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, font: FONT, bold: true, size: 32, color: '1F3864' })], spacing: { before: 120, after: 160 }, keepNext: true });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: FONT, bold: true, size: 26, color: '2E5597' })], spacing: { before: 200, after: 100 }, keepNext: true });
const H3 = (t) => new Paragraph({ children: [new TextRun({ text: t, font: FONT, bold: true, size: 23 })], spacing: { before: 140, after: 60 }, keepNext: true });
const EQ = (t) => new Paragraph({ children: [new TextRun({ text: t, font: MATH, size: 22 })], alignment: AlignmentType.CENTER, spacing: { before: 60, after: 100 } });
const B = (t, lvl = 0) => new Paragraph({ children: runs(t, { size: 22 }), numbering: { reference: 'bul', level: lvl }, spacing: { after: 60, line: 264 } });
const N = (t, ref = 'num') => new Paragraph({ children: runs(t, { size: 22 }), numbering: { reference: ref, level: 0 }, spacing: { after: 60, line: 264 } });
const BR = () => new Paragraph({ children: [new PageBreak()] });
const IMG = (file, wIn) => {
  const buf = FIG(file);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20); // PNG IHDR
  const W = Math.round(wIn * 96);
  return new Paragraph({ children: [new ImageRun({ type: 'png', data: buf, transformation: { width: W, height: Math.round(W * h / w) } })], alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 } });
};
const thin = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
function table(rows, widths, header = true) {
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths,
    rows: rows.map((r, i) => new TableRow({
      tableHeader: header && i === 0,
      children: r.map((c, j) => new TableCell({
        width: { size: widths[j], type: WidthType.DXA },
        shading: header && i === 0 ? { type: ShadingType.CLEAR, fill: 'D9E2F3', color: 'auto' } : undefined,
        margins: { top: 50, bottom: 50, left: 90, right: 90 },
        borders: { top: thin, bottom: thin, left: thin, right: thin },
        children: [new Paragraph({ children: runs(c, { size: 20, bold: header && i === 0 }) })],
      })),
    })),
  });
}
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
function whiteBox(children) {
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
    borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
    rows: [new TableRow({ children: [new TableCell({ width: { size: CW, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: 'FFFFFF', color: 'auto' }, margins: { top: 140, bottom: 140, left: 200, right: 200 }, borders: { top: none, bottom: none, left: none, right: none }, children })] })],
  });
}
const paperHeader = () => new Header({ children: [new Paragraph({ children: [new ImageRun({
  type: 'jpg', data: PAPER, transformation: { width: 816, height: 1056 },
  floating: { horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 }, verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 }, behindDocument: true, allowOverlap: true, wrap: { type: TextWrappingType.NONE } },
})] })] });
const plainHeader = () => new Header({ children: [new Paragraph({ children: [new TextRun({ text: 'ME 231 · Test #2 Prep · Mon 11/9/2026', font: FONT, size: 16, color: '888888' })], alignment: AlignmentType.RIGHT })] });


module.exports = { fs, path, D, FIG, PAPER, FONT, MATH, PAGE, CW, runs, P, H1, H2, H3, EQ, B, N, BR, IMG, table, whiteBox, paperHeader, plainHeader, Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, LevelFormat, PageBreak };
