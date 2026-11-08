// Builds "ME231 Test 2 Prep Packet.docx": study guide, practice problems on engineering paper, step-by-step solutions.
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Header, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, AlignmentType, HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom, TextWrappingType, HeadingLevel, PageBreak, LevelFormat,
} = require('docx');

const D = __dirname;
const FIG = (f) => fs.readFileSync(path.join(D, 'figs', f));
const PAPER = FIG('engineering_paper.jpg');
const FONT = 'Times New Roman';
const MATH = 'Cambria Math';
const PAGE = { size: { width: 12240, height: 15840 }, margin: { top: 1080, bottom: 864, left: 1584, right: 1368, header: 360, footer: 360 } };
const CW = 9288; // content width (DXA)

// ---------- text helpers ----------
// inline markup: **bold**, _italic_, `math`
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|(?<![\w])_[^_]+_(?![\w])|`[^`]+`)/g;
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

// ---------- problems ----------
const problems = [
  { id: 'P1', topic: 'Ch 4 · Kinematics, continuity, ψ, φ, Euler', fig: null, text: [
    'A steady, two-dimensional, incompressible flow of water (ρ = 998 kg/m³) in a horizontal plane has x-velocity `u = a(x² − y²)`, where a = 2 s⁻¹ and x, y are in meters.',
    '(a) Use continuity to find v(x, y), given v = 0 along y = 0.',
    '(b) Is the flow irrotational? If so, find the velocity potential φ.',
    '(c) Find the stream function ψ.',
    '(d) Find the acceleration vector and its magnitude at (x, y) = (1, 1) m.',
    '(e) Find the pressure gradient ∂p/∂x and ∂p/∂y at (1, 1) m. Do viscous terms matter here? Justify.'] },
  { id: 'P2', topic: 'Ch 4 · Exact Navier–Stokes solution (plane Poiseuille)', fig: 'p2.png', text: [
    'SAE 30 oil (ρ = 891 kg/m³, μ = 0.29 kg/(m·s)) flows steadily between two fixed, infinite, horizontal parallel plates spaced 2h = 4 mm apart. The pressure gradient is dp/dx = −1500 Pa/m.',
    '(a) Starting from continuity and the x-momentum Navier–Stokes equation, list your assumptions and derive u(y) with y measured from the centerline.',
    '(b) Find u_max, the average velocity V, and the flow rate per unit width q.',
    '(c) Find the wall shear stress τ_w.',
    '(d) Check that the flow is laminar (Reynolds number based on the gap 2h).'] },
  { id: 'P3', topic: 'Ch 3 · Bernoulli: siphon and cavitation', fig: 'p3.png', text: [
    'Water at 20 °C is siphoned from a large open tank through a 4 cm diameter tube. The tube exit (a free jet) is 3.0 m below the tank free surface, and the top of the tube (point A) is 1.5 m above the free surface. Neglect friction. Take p_atm = 101.35 kPa and p_v = 2.34 kPa.',
    '(a) Find the exit velocity and the flow rate.',
    '(b) Find the pressure at A, gage and absolute.',
    '(c) Keeping the exit 3.0 m below the surface, how high can A be raised before the water cavitates?'] },
  { id: 'P4', topic: 'Ch 3 · Bernoulli + continuity: Venturi meter', fig: 'p4.png', text: [
    'Water at 20 °C (ρ = 998 kg/m³) flows through a horizontal Venturi meter with inlet diameter D₁ = 10 cm and throat diameter D₂ = 5 cm. A mercury manometer (ρ = 13 550 kg/m³) connected between the inlet and the throat reads h = 20 cm.',
    '(a) Find the pressure difference p₁ − p₂.',
    '(b) Assuming ideal (frictionless) flow, find V₂, V₁ and the volume flow rate Q.'] },
  { id: 'P5', topic: 'Ch 5 · Buckingham Pi theorem', fig: null, text: [
    'The power P required to drive a centrifugal pump depends on fluid density ρ, rotation rate ω, impeller diameter D, volume flow rate Q, and fluid viscosity μ.',
    '(a) How many dimensionless groups describe this problem? Show the dimensions of every variable.',
    '(b) Using ρ, ω and D as repeating variables, find the Pi groups.',
    '(c) A geometrically similar pump twice the diameter runs at the same ω at high Reynolds number (viscous effects negligible) and at the same Q/(ωD³). By what factors do Q and P change?',
    '(d) The original pump is sped up by 50% (same conditions otherwise). By what factors do Q and P change?'] },
  { id: 'P6', topic: 'Ch 5 · Similitude and model testing', fig: null, text: [
    'A torpedo of diameter 0.5 m travels at 15 m/s deep in seawater (ρ = 1025 kg/m³, μ = 1.07 × 10⁻³ kg/(m·s)). A 1:5 scale model is tested in a water tunnel using fresh water at 20 °C (ρ = 998 kg/m³, μ = 1.00 × 10⁻³ kg/(m·s)).',
    '(a) Which dimensionless group must be matched, and why not the Froude number?',
    '(b) Find the required model test velocity.',
    '(c) The model drag is measured as 1500 N. Predict the prototype drag and the power needed to overcome it.',
    '(d) Comment on any practical problem with the model test speed.'] },
  { id: 'P7', topic: 'Ch 6 · Laminar pipe flow (Hagen–Poiseuille)', fig: null, text: [
    'Oil (ρ = 900 kg/m³, μ = 0.18 kg/(m·s)) flows at Q = 0.5 L/s through a 20 m long, horizontal, 3 cm diameter pipe.',
    '(a) Find the Reynolds number. Is the flow laminar? Is it fully developed over most of the pipe?',
    '(b) Find the friction factor, head loss and pressure drop. Check the pressure drop with the Hagen–Poiseuille formula.',
    '(c) Find the wall shear stress.',
    '(d) Find the pumping power needed to overcome friction.'] },
  { id: 'P8', topic: 'Ch 6 · Turbulent pipe flow, Type 1 (find Δp)', fig: null, text: [
    'Water at 20 °C (ρ = 998 kg/m³, μ = 1.00 × 10⁻³ kg/(m·s)) is pumped at Q = 0.02 m³/s through 150 m of 10 cm diameter cast-iron pipe (ε = 0.26 mm). The pipe outlet is 10 m higher than the inlet and the diameter is constant.',
    '(a) Find V, Re and ε/D.',
    '(b) Find the friction factor (Colebrook; check with Haaland or the Moody chart).',
    '(c) Find the head loss and the required pressure drop p₁ − p₂.',
    '(d) What fraction of the pressure drop is spent lifting the water?'] },
  { id: 'P9', topic: 'Ch 6 · Turbulent pipe flow, Type 2 (find Q)', fig: null, text: [
    'Water at 20 °C (ρ = 998 kg/m³, μ = 1.00 × 10⁻³ kg/(m·s)) flows through 50 m of horizontal 5 cm diameter commercial-steel pipe (ε = 0.046 mm). The measured head loss is 8 m.',
    '(a) Find the flow rate Q by iteration on f.',
    '(b) Verify with the direct method: compute Re·√f from the known head loss, then get f from Colebrook in one step.'] },
  { id: 'P10', topic: 'Ch 6 · Pipe system with minor losses', fig: 'p10.png', text: [
    'Water at 20 °C (ρ = 998 kg/m³, μ = 1.00 × 10⁻³ kg/(m·s)) flows by gravity from reservoir A to reservoir B, whose free surfaces differ by 20 m. The connecting pipe is 100 m of 8 cm diameter commercial steel (ε = 0.046 mm). Loss coefficients: sharp-edged entrance K = 0.5, two elbows K = 0.3 each, open gate valve K = 0.15, submerged exit K = 1.0.',
    '(a) Write the energy equation from free surface A to free surface B.',
    '(b) Find the velocity and the flow rate.',
    '(c) What percentage of the total loss comes from minor losses?'] },
];

// ---------- solutions ----------
const sol = {
  P1: [
    H3('Given'), P('`u = a(x² − y²)`, a = 2 s⁻¹, 2-D, steady, incompressible, ρ = 998 kg/m³, horizontal plane.'),
    H3('Find'), P('v, irrotationality and φ, ψ, acceleration at (1,1), ∇p at (1,1).'),
    H3('Solution'),
    P('**(a) Continuity.** For 2-D incompressible flow, `∂u/∂x + ∂v/∂y = 0`.'),
    EQ('∂v/∂y = −∂u/∂x = −2ax   ⟹   v = −2axy + f(x)'),
    P('The condition v = 0 at y = 0 gives f(x) = 0, so **v = −2axy**.'),
    P('**(b) Vorticity.** `ω_z = ∂v/∂x − ∂u/∂y = (−2ay) − (−2ay) = 0`, so the flow **is irrotational** and φ exists with u = ∂φ/∂x, v = ∂φ/∂y.'),
    EQ('φ = ∫u dx = a(x³/3 − xy²) + g(y);   ∂φ/∂y = −2axy + g′(y) = v  ⟹  g = const'),
    P('So **φ = a(x³/3 − xy²)**.'),
    P('**(c) Stream function.** Use u = ∂ψ/∂y and v = −∂ψ/∂x.'),
    EQ('ψ = ∫u dy = a(x²y − y³/3) + h(x);   −∂ψ/∂x = −2axy − h′(x) = v  ⟹  h = const'),
    P('So **ψ = a(x²y − y³/3)**. Check: the lines of constant φ and constant ψ are orthogonal, and both satisfy Laplace\'s equation.'),
    P('**(d) Acceleration.** The flow is steady, so only the convective terms remain: `a_x = u ∂u/∂x + v ∂u/∂y`, `a_y = u ∂v/∂x + v ∂v/∂y`.'),
    P('At (1,1): u = 2(1 − 1) = 0, v = −2(2)(1)(1) = −4 m/s. The derivatives are ∂u/∂x = 2ax = 4, ∂u/∂y = −2ay = −4, ∂v/∂x = −2ay = −4, ∂v/∂y = −2ax = −4 (units s⁻¹).'),
    EQ('a_x = 0(4) + (−4)(−4) = 16 m/s²,   a_y = 0(−4) + (−4)(−4) = 16 m/s²'),
    P('**|a| = √(16² + 16²) = 22.6 m/s²**, directed at 45°.'),
    P('**(e) Pressure gradient.** `∇²u = 2a − 2a = 0` and `∇²v = 0`, so μ∇²**V** = 0. Viscous stresses exist, but their net force vanishes, so Navier–Stokes reduces exactly to Euler. In a horizontal plane gravity has no x or y component:'),
    EQ('∂p/∂x = −ρa_x = −998(16) = −1.60 × 10⁴ Pa/m,   ∂p/∂y = −ρa_y = −1.60 × 10⁴ Pa/m'),
    H3('Takeaway'), P('Kinematics sequence: continuity → v; vorticity check → φ; ψ from u and v; acceleration by the material derivative; pressure from Euler or Navier–Stokes, with ∇p = −ρ**a** when gravity and viscous terms drop out.'),
  ],
  P2: [
    H3('Given'), P('Fixed plates at y = ±h, h = 2 mm; dp/dx = −1500 Pa/m; μ = 0.29 kg/(m·s); ρ = 891 kg/m³.'),
    H3('Find'), P('u(y), u_max, V, q, τ_w, Re.'),
    H3('Assumptions'),
    B('Steady (∂/∂t = 0); incompressible; laminar.'),
    B('Infinite plates, fully developed: v = w = 0 and nothing depends on z.'),
    B('Gravity acts in −y, so it affects only the y-equation (hydrostatic across the gap).'),
    H3('Solution'),
    P('**Step 1: continuity.** `∂u/∂x + ∂v/∂y + ∂w/∂z = 0` with v = w = 0 gives ∂u/∂x = 0, so u = u(y) only.'),
    P('**Step 2: x-momentum Navier–Stokes.**'),
    EQ('ρ(∂u/∂t + u ∂u/∂x + v ∂u/∂y + w ∂u/∂z) = −∂p/∂x + ρg_x + μ(∂²u/∂x² + ∂²u/∂y² + ∂²u/∂z²)'),
    P('Every inertial term is zero (steady, ∂u/∂x = 0, v = w = 0), g_x = 0, and only ∂²u/∂y² survives:'),
    EQ('0 = −dp/dx + μ d²u/dy²   ⟹   d²u/dy² = (1/μ)(dp/dx)'),
    P('**Step 3: integrate twice.** `u = (1/2μ)(dp/dx) y² + C₁y + C₂`.'),
    P('**Step 4: boundary conditions** (no slip): u(+h) = 0 and u(−h) = 0. Symmetry gives C₁ = 0, and C₂ = −(1/2μ)(dp/dx)h².'),
    EQ('u(y) = (−dp/dx)(h² − y²) / (2μ)'),
    P('**(b)** At y = 0:'),
    EQ('u_max = (−dp/dx)h²/(2μ) = 1500(0.002)²/(2·0.29) = 0.0103 m/s = 10.3 mm/s'),
    P('Average velocity: `V = (1/2h)∫u dy = (2/3)u_max = 6.90 mm/s`.'),
    EQ('q = V·(2h) = 0.00690 × 0.004 = 2.76 × 10⁻⁵ m²/s   [ = 2h³(−dp/dx)/(3μ) ]'),
    P('**(c) Wall shear.** `τ_w = |μ du/dy| at y = h = (−dp/dx)·h = 1500 × 0.002 = 3.0 Pa`. As a check, a force balance on the slab gives 2τ_w = (−dp/dx)(2h).'),
    P('**(d)** `Re = ρV(2h)/μ = 891(0.0069)(0.004)/0.29 = 0.085`, which is far below ~1000, so the flow is **laminar** and the assumptions hold.'),
    H3('Takeaway'), P('Exam recipe for any exact solution: (1) assumptions, (2) continuity, (3) cross out Navier–Stokes terms one by one and say why, (4) integrate twice, (5) apply BCs (no-slip, moving wall u = U, symmetry du/dy = 0, free surface τ = 0), (6) get Q, V, τ_w.'),
  ],
  P3: [
    H3('Given'), P('D = 4 cm; exit 3.0 m below the surface; A 1.5 m above the surface; water 20 °C, γ = ρg = 9790 N/m³; p_atm = 101.35 kPa; p_v = 2.34 kPa.'),
    H3('Assumptions'), P('Steady, incompressible, frictionless, along one streamline. The tank is large, so V₁ ≈ 0.'),
    H3('Solution'),
    P('**(a) Bernoulli from surface (1) to exit (2).** Use datum z = 0 at the exit. p₁ = p₂ = p_atm (free surface and free jet), V₁ ≈ 0.'),
    EQ('p₁/γ + V₁²/2g + z₁ = p₂/γ + V₂²/2g + z₂   ⟹   3.0 = V₂²/2g'),
    EQ('V₂ = √(2·9.81·3.0) = 7.67 m/s,    Q = V₂·πD²/4 = 7.67 × π(0.04)²/4 = 9.64 × 10⁻³ m³/s'),
    P('**(b) Bernoulli from 1 to A.** Continuity with constant D gives V_A = V₂, and z_A − z₁ = 1.5 m. In gage pressure:'),
    EQ('0 + 0 + 0 = p_A/γ + V_A²/2g + 1.5   ⟹   p_A = −γ(1.5 + 3.0) = −9790 × 4.5'),
    P('**p_A = −44.1 kPa gage = 101.35 − 44.06 = 57.3 kPa absolute.** The top of a siphon is always the lowest-pressure point.'),
    P('**(c) Cavitation limit.** Let A be height H above the surface. V is unchanged because the exit depth is unchanged. Set p_A,abs = p_v:'),
    EQ('p_atm − γ(H + 3.0) = p_v   ⟹   H = (101 350 − 2337)/9790 − 3.0 = 10.11 − 3.0 = 7.11 m'),
    H3('Takeaway'), P('Pick points where you know p and V: free surfaces and free jets are at p_atm. Constant pipe area means constant V. Check cavitation with **absolute** pressure.'),
  ],
  P4: [
    H3('Given'), P('D₁ = 10 cm, D₂ = 5 cm, β = D₂/D₁ = 0.5; ρ = 998 kg/m³; ρ_Hg = 13 550 kg/m³; h = 0.20 m; horizontal.'),
    H3('Solution'),
    P('**(a) Manometer.** Walk from tap 1 down to the mercury, across, and up to tap 2. The water columns above the lower mercury level cancel, leaving:'),
    EQ('p₁ − p₂ = (ρ_Hg − ρ_w) g h = (13 550 − 998)(9.81)(0.20) = 24.6 kPa'),
    P('A common mistake is using ρ_Hg·g·h alone. That is wrong whenever the manometer legs are full of the flowing fluid.'),
    P('**(b) Continuity:** `V₁A₁ = V₂A₂ ⟹ V₁ = β²V₂`. **Bernoulli** (z₁ = z₂):'),
    EQ('p₁ − p₂ = ½ρ(V₂² − V₁²) = ½ρV₂²(1 − β⁴)'),
    EQ('V₂ = √[2(p₁ − p₂)/(ρ(1 − β⁴))] = √[2(24 627)/(998 × 0.9375)] = 7.26 m/s'),
    EQ('V₁ = 0.25 × 7.26 = 1.81 m/s,    Q = V₂ π(0.05)²/4 = 0.0142 m³/s'),
    H3('Takeaway'), P('Bernoulli + continuity + manometer is the standard flow-meter problem (Venturi, nozzle, orifice). A real meter multiplies by a discharge coefficient C_d (≈ 0.98 for a Venturi).'),
  ],
  P5: [
    H3('(a) List variables and dimensions'),
    table([
      ['Variable', 'P', 'ρ', 'ω', 'D', 'Q', 'μ'],
      ['Dimensions', 'ML²T⁻³', 'ML⁻³', 'T⁻¹', 'L', 'L³T⁻¹', 'ML⁻¹T⁻¹'],
    ], [1588, 1283, 1283, 1283, 1283, 1283, 1285]),
    P(''),
    P('n = 6 variables, j = 3 dimensions (M, L, T), so **k = n − j = 3** Pi groups.'),
    H3('(b) Method of repeating variables (ρ, ω, D)'),
    P('The repeating variables together contain M, L and T, are independent of each other, and exclude the dependent variable P.'),
    P('**Π₁ = P ρᵃ ωᵇ Dᶜ.** Dimensions: (ML²T⁻³)(ML⁻³)ᵃ(T⁻¹)ᵇ(L)ᶜ = M⁰L⁰T⁰.'),
    B('M: 1 + a = 0 → a = −1'),
    B('T: −3 − b = 0 → b = −3'),
    B('L: 2 − 3a + c = 0 → c = −5'),
    EQ('Π₁ = P/(ρω³D⁵)    (power coefficient)'),
    P('**Π₂ = Q ρᵃ ωᵇ Dᶜ:** M: a = 0; T: −1 − b = 0 → b = −1; L: 3 + c = 0 → c = −3.'),
    EQ('Π₂ = Q/(ωD³)    (flow coefficient)'),
    P('**Π₃ = μ ρᵃ ωᵇ Dᶜ:** M: 1 + a = 0 → a = −1; T: −1 − b = 0 → b = −1; L: −1 + 3 + c = 0 → c = −2.'),
    EQ('Π₃ = μ/(ρωD²)    (1/Reynolds number; may be inverted to ρωD²/μ)'),
    EQ('P/(ρω³D⁵) = F( Q/(ωD³), ρωD²/μ )'),
    H3('(c) Scaling, D → 2D at the same ω'),
    P('Same Π₂ and negligible Re effect give the same Π₁. So Q ∝ D³ gives **×8**, and P ∝ D⁵ gives **×32**.'),
    H3('(d) Scaling, ω → 1.5ω'),
    P('Q ∝ ω gives **×1.5**, and P ∝ ω³ gives **1.5³ = ×3.375**. These are the pump affinity laws.'),
    H3('Takeaway'), P('Always check that each Π is dimensionless and that the repeating variables cannot form a Π among themselves. Exams often ask you to identify the result as a named group (Re, Fr, Eu, C_D, C_P).'),
  ],
  P6: [
    H3('Given'), P('Prototype D_p = 0.5 m, V_p = 15 m/s, seawater ρ_p = 1025, μ_p = 1.07×10⁻³. Model 1:5 (L_p/L_m = 5), fresh water ρ_m = 998, μ_m = 1.00×10⁻³. F_m = 1500 N.'),
    H3('Solution'),
    P('**(a)** The torpedo runs fully submerged, so there is no free surface and gravity waves don\'t matter, which removes Fr. Drag is governed by inertia vs. viscosity: **match Re**, and then C_D = F/(ρV²D²) is equal for model and prototype.'),
    P('**(b)** Set Re_m = Re_p:'),
    EQ('ρ_m V_m D_m/μ_m = ρ_p V_p D_p/μ_p   ⟹   V_m = V_p (ρ_p/ρ_m)(μ_m/μ_p)(D_p/D_m)'),
    EQ('V_m = 15 (1025/998)(1.00/1.07)(5) = 72.0 m/s'),
    P('**(c)** Equal force coefficients give `F_p/F_m = (ρ_p/ρ_m)(V_p/V_m)²(D_p/D_m)²`.'),
    EQ('F_p = 1500 (1.027)(15/72.0)²(25) = 1672 N ≈ 1.67 kN'),
    EQ('Power = F_p·V_p = 1672 × 15 = 25.1 kW'),
    P('**(d)** 72 m/s in a water tunnel is very fast. The low pressure on the model would likely cause **cavitation**, which changes the drag. In practice the test is run at the highest feasible Re, relying on the fact that C_D becomes nearly independent of Re at high Re.'),
    H3('Takeaway'), P('Match Re for closed or submerged flows (pipes, submarines, aircraft at low Mach). Match Fr for free-surface flows (ships, spillways, open channels). Then scale forces with ρV²L² and power with ρV³L².'),
  ],
  P7: [
    H3('Given'), P('ρ = 900 kg/m³, μ = 0.18 kg/(m·s), D = 0.03 m, L = 20 m, Q = 5×10⁻⁴ m³/s, horizontal.'),
    H3('Solution'),
    P('**(a)** `A = πD²/4 = 7.069×10⁻⁴ m²`, `V = Q/A = 0.707 m/s`.'),
    EQ('Re = ρVD/μ = 900(0.707)(0.03)/0.18 = 106   <  2300   ⟹  laminar'),
    P('Entrance length: `L_e ≈ 0.06 Re D = 0.06(106)(0.03) = 0.19 m`, which is ≪ 20 m, so the flow is fully developed over most of the pipe.'),
    P('**(b)**'),
    EQ('f = 64/Re = 64/106.1 = 0.603'),
    EQ('h_f = f (L/D)(V²/2g) = 0.603 (20/0.03)(0.707²/(2·9.81)) = 10.3 m'),
    EQ('Δp = ρg h_f = 900(9.81)(10.26) = 90.5 kPa'),
    EQ('Check:  Δp = 128 μ L Q/(πD⁴) = 128(0.18)(20)(5×10⁻⁴)/(π·0.03⁴) = 90.5 kPa ✓'),
    P('**(c)** A force balance on the fluid cylinder gives `Δp·πR² = τ_w·2πRL`, so τ_w = ΔpD/(4L) = 90 541(0.03)/(4·20) = **34.0 Pa**.'),
    P('**(d)** `P = QΔp = 5×10⁻⁴ × 90 541 = 45.3 W`.'),
    H3('Takeaway'), P('Always compute Re first, because it decides which f formula applies. For laminar flow f = 64/Re does not depend on roughness, and Δp ∝ Q. Doubling Q doubles Δp.'),
  ],
  P8: [
    H3('Given'), P('Q = 0.02 m³/s, D = 0.10 m, L = 150 m, ε = 0.26 mm, Δz = +10 m, water: ν = μ/ρ = 1.002×10⁻⁶ m²/s, γ = 9790 N/m³.'),
    H3('Solution'),
    P('**(a)** `V = Q/(πD²/4) = 0.02/0.007854 = 2.55 m/s`.'),
    EQ('Re = VD/ν = 2.546(0.10)/1.002×10⁻⁶ = 2.54×10⁵ (turbulent),   ε/D = 0.26/100 = 0.0026'),
    P('**(b) Colebrook:** `1/√f = −2.0 log₁₀[ (ε/D)/3.7 + 2.51/(Re√f) ]`. Start with the fully rough guess f₀ = 0.025 and iterate two or three times:'),
    EQ('f = 0.0257'),
    P('Haaland check: `1/√f ≈ −1.8 log₁₀[ ((ε/D)/3.7)^1.11 + 6.9/Re ]` gives f = 0.0257 ✓ (Moody chart: ≈ 0.026).'),
    EQ('h_f = f (L/D)(V²/2g) = 0.0257 (1500)(2.546²/19.62) = 12.76 m'),
    P('**(c) Energy equation 1 → 2.** Same D, so V₁ = V₂ and the velocity heads cancel:'),
    EQ('p₁/γ + z₁ = p₂/γ + z₂ + h_f   ⟹   p₁ − p₂ = γ(Δz + h_f) = 9790(10 + 12.76)'),
    EQ('p₁ − p₂ = 223 kPa'),
    P('**(d)** The lift accounts for 10/22.76 = **44%** of the pressure drop and friction for the other 56%.'),
    H3('Takeaway'), P('Type 1 problems are direct: V → Re, ε/D → f → h_f → energy equation. The energy equation adds the elevation change on top of friction.'),
  ],
  P9: [
    H3('Given'), P('D = 0.05 m, L = 50 m, h_f = 8 m, ε = 0.046 mm → ε/D = 0.00092, ν = 1.002×10⁻⁶ m²/s.'),
    H3('(a) Iteration'),
    P('From Darcy, `V = √(2g h_f D/(f L)) = √(0.1570/f)`. Guess f, compute V and Re, update f from Colebrook, repeat:'),
    table([
      ['Iter', 'f (guess)', 'V (m/s)', 'Re', 'f (Colebrook)'],
      ['1', '0.0200', '2.801', '139 800', '0.02125'],
      ['2', '0.02125', '2.718', '135 600', '0.02131'],
      ['3', '0.02131', '2.714', '135 400', '0.02131 ✓'],
    ], [1300, 1900, 1900, 2000, 2188]),
    P(''),
    EQ('V = 2.71 m/s,   Q = V πD²/4 = 2.714 × 0.001963 = 5.33 × 10⁻³ m³/s = 5.33 L/s'),
    H3('(b) Direct method (no iteration)'),
    P('Re√f contains only known quantities:'),
    EQ('Re√f = √(2g h_f D³/(L ν²)) = √(2·9.81·8·0.05³ / (50·(1.002×10⁻⁶)²)) = 19 770'),
    EQ('1/√f = −2 log₁₀[0.00092/3.7 + 2.51/19 770] = 6.851   ⟹   f = 0.02131'),
    EQ('Re = 19 770/√0.02131 = 135 400  ⟹  V = Re ν/D = 2.71 m/s ✓'),
    H3('Takeaway'), P('For Type 2 (unknown Q), start with the fully rough f for your ε/D. It usually converges in two or three passes. The Re√f trick is fastest on an exam.'),
  ],
  P10: [
    H3('Given'), P('Δz = 20 m, D = 0.08 m, L = 100 m, ε/D = 0.046/80 = 0.000575, ΣK = 0.5 + 2(0.3) + 0.15 + 1.0 = 2.25.'),
    H3('Solution'),
    P('**(a) Energy equation**, free surface A → free surface B. Both are at p_atm with V ≈ 0:'),
    EQ('z_A = z_B + h_f + Σh_m   ⟹   Δz = (V²/2g)(f L/D + ΣK)'),
    P('The exit loss K = 1.0 is the jet\'s kinetic energy dissipated in reservoir B. Don\'t also add V²/2g at B.'),
    P('**(b) Solve for V iteratively:** `V = √(2gΔz/(fL/D + ΣK)) = √(392.4/(1250f + 2.25))`.'),
    table([
      ['Iter', 'f (guess)', 'V (m/s)', 'Re', 'f (Colebrook)'],
      ['1', '0.0200', '3.795', '303 000', '0.01861'],
      ['2', '0.01861', '3.922', '313 100', '0.01857'],
      ['3', '0.01857', '3.926', '313 400', '0.01857 ✓'],
    ], [1300, 1900, 1900, 2000, 2188]),
    P(''),
    EQ('V = 3.93 m/s,   Q = 3.926 × π(0.08)²/4 = 0.0197 m³/s ≈ 19.7 L/s'),
    P('**(c)** `h_f = f(L/D)V²/2g = 18.23 m`, `Σh_m = 2.25 V²/2g = 1.77 m`. The sum is 20.0 m = Δz ✓. Minor losses are **8.8%** of the total.'),
    H3('Takeaway'), P('In long pipes (L/D > ~1000) minor losses are small. In short systems with many fittings they can dominate. Always list the K values and sum them before solving.'),
  ],
};

// ---------- study guide ----------
const guide = [
  H1('ME 231 Test #2: Study Guide'),
  P('**Test:** Mon 11/9/2026, 10:45 AM–12:00 PM, Packard 466 (in lecture). **Covers** everything since Test #1: White Ch 4 (differential relations), the Bernoulli material of Ch 3, Ch 5 (dimensional analysis and similitude) and Ch 6 (viscous pipe flow). The 11/4 lecture was the review.'),
  H2('How to use this packet'),
  N('Read one guide section, then work its practice problems on the engineering-paper pages **without looking at the solutions**. Use the professor\'s format: Given / Find / Solution.'),
  N('Grade yourself against Part C. Re-do any problem you missed the next day without notes.'),
  N('Finish by re-working 4–6 of your graded homework problems from the textbook (list at the end of this guide).'),
  table([
    ['Block (Sun 11/8)', 'Read', 'Do'],
    ['1 · 60 min', '§1 Differential relations, §2 exact solutions', 'P1, P2'],
    ['2 · 60 min', '§3 Bernoulli and energy equation', 'P3, P4'],
    ['3 · 60 min', '§4 Dimensional analysis', 'P5, P6'],
    ['4 · 90 min', '§5 Pipe flow', 'P7, P8, P9, P10'],
    ['5 · 60 min', 'Mistakes list (§6)', '4–6 graded HW problems, mixed chapters'],
    ['Mon AM · 30 min', 'Formula summary tables only', 'Re-read your own missed steps'],
  ], [2300, 4300, 2688]),

  H2('§1 Differential relations (Ch 4)'),
  H3('Acceleration (material derivative)'),
  EQ('a = DV/Dt = ∂V/∂t + u ∂V/∂x + v ∂V/∂y + w ∂V/∂z'),
  P('The first term is the local acceleration (zero if steady). The rest is convective, and it is **not** zero in steady flow when V varies in space.'),
  H3('Continuity'),
  EQ('∂ρ/∂t + ∇·(ρV) = 0      Incompressible:  ∂u/∂x + ∂v/∂y + ∂w/∂z = 0'),
  EQ('Cylindrical (incompressible):  (1/r)∂(r v_r)/∂r + (1/r)∂v_θ/∂θ + ∂v_z/∂z = 0'),
  P('Typical question: "given u, find v" or "is this flow physically possible?" Plug into continuity.'),
  H3('Stream function ψ (2-D incompressible)'),
  EQ('u = ∂ψ/∂y,     v = −∂ψ/∂x        (polar: v_r = (1/r)∂ψ/∂θ,  v_θ = −∂ψ/∂r)'),
  B('Continuity is satisfied automatically. ψ is constant along a streamline.'),
  B('Flow rate per unit depth between two streamlines: q = ψ₂ − ψ₁.'),
  H3('Vorticity and velocity potential φ'),
  EQ('ω_z = ∂v/∂x − ∂u/∂y.   Irrotational ⟺ ω = 0 ⟺ V = ∇φ  (u = ∂φ/∂x, v = ∂φ/∂y)'),
  P('Incompressible + irrotational gives ∇²φ = 0 and ∇²ψ = 0. Lines of constant φ and ψ are perpendicular.'),
  H3('Navier–Stokes (incompressible, constant μ)'),
  EQ('ρ DV/Dt = ρg − ∇p + μ∇²V'),
  EQ('x:  ρ(∂u/∂t + u∂u/∂x + v∂u/∂y + w∂u/∂z) = −∂p/∂x + ρg_x + μ(∂²u/∂x² + ∂²u/∂y² + ∂²u/∂z²)'),
  P('Set μ = 0 to get the **Euler equation** `ρ DV/Dt = ρg − ∇p`. Integrating Euler along a streamline (steady, incompressible) gives **Bernoulli**.'),

  H2('§2 Exact viscous solutions'),
  P('Recipe: assumptions → continuity → cross out terms in Navier–Stokes, saying why → integrate twice → apply BCs → Q, V, τ_w.'),
  table([
    ['Flow', 'Velocity profile', 'Key results'],
    ['Couette: plate at y = h moves at U, no ∂p/∂x', 'u = U y/h', 'τ = μU/h (constant)'],
    ['Plane Poiseuille: fixed plates at y = ±h', 'u = (−dp/dx)(h² − y²)/(2μ)', 'V = ⅔u_max;  q = 2h³(−dp/dx)/(3μ)'],
    ['Pipe (Hagen–Poiseuille), radius R', 'u = (−dp/dx)(R² − r²)/(4μ)', 'V = ½u_max;  Q = πR⁴(−dp/dx)/(8μ) = πD⁴Δp/(128μL)'],
    ['Inclined or vertical', 'replace p by p + ρgz', '−dp/dx → −d(p + ρgz)/dx'],
  ], [3000, 3300, 2988]),
  P(''),
  P('**Boundary conditions:** no-slip (u = wall velocity), symmetry (du/dy = 0 at the centerline), free surface (τ = μ du/dy = 0), and finite velocity at r = 0 (kills the ln r term).'),

  H2('§3 Bernoulli and the energy equation'),
  EQ('p₁/ρg + V₁²/2g + z₁ = p₂/ρg + V₂²/2g + z₂'),
  P('**Valid only if:** steady, incompressible, frictionless, along a streamline, and no pump, turbine or heat transfer between the points.'),
  table([
    ['Situation', 'Result'],
    ['Draining tank (Torricelli)', 'V = √(2gh)'],
    ['Stagnation point', 'p₀ = p + ½ρV²'],
    ['Pitot-static tube', 'V = √(2(p₀ − p)/ρ)'],
    ['Venturi / nozzle meter', 'Q = A₂ √(2Δp/(ρ(1 − β⁴))),  β = d/D'],
    ['Manometer, same fluid in legs', 'p₁ − p₂ = (ρ_m − ρ)g h  (horizontal pipe)'],
    ['Free surface / free jet', 'p = p_atm (0 gage)'],
    ['Cavitation check', 'p_abs ≥ p_v (2.34 kPa for water at 20 °C)'],
  ], [3800, 5488]),
  P(''),
  P('**Steady-flow energy equation** (with losses and machines, used in Ch 6):'),
  EQ('p₁/ρg + α₁V₁²/2g + z₁ + h_pump = p₂/ρg + α₂V₂²/2g + z₂ + h_turbine + h_f + Σh_m'),
  P('α ≈ 1 for turbulent flow and α = 2 for laminar pipe flow. The **HGL** is p/ρg + z and the **EGL** is HGL + V²/2g. The EGL drops by h_f along a pipe and jumps up by h_pump at a pump. Pump power: `P = ρgQh_p/η`.'),

  H2('§4 Dimensional analysis and similitude (Ch 5)'),
  P('**Pi theorem:** n variables in j fundamental dimensions give k = n − j independent Pi groups.'),
  N('List all n variables (dependent one first).', 'num2'),
  N('Write each in M, L, T (Θ if temperature matters). j = number of dimensions (check the rank).', 'num2'),
  N('Choose j repeating variables: together they contain every dimension, they cannot form a Π by themselves, and they exclude the dependent variable. Typical choice: ρ, V (or ω), L (or D).', 'num2'),
  N('Π = (variable)·ρᵃVᵇLᶜ; solve the exponent equations for M, L, T.', 'num2'),
  N('Check that each Π is dimensionless; rearrange into named groups.', 'num2'),
  table([
    ['Quantity', 'Dims', 'Quantity', 'Dims'],
    ['Force F', 'MLT⁻²', 'Viscosity μ', 'ML⁻¹T⁻¹'],
    ['Pressure, stress', 'ML⁻¹T⁻²', 'Kinematic viscosity ν', 'L²T⁻¹'],
    ['Energy, work, torque', 'ML²T⁻²', 'Surface tension Υ', 'MT⁻²'],
    ['Power', 'ML²T⁻³', 'Flow rate Q', 'L³T⁻¹'],
    ['Density ρ', 'ML⁻³', 'ω, frequency', 'T⁻¹'],
  ], [2500, 2144, 2500, 2144]),
  P(''),
  table([
    ['Group', 'Definition', 'Meaning / when to match'],
    ['Reynolds', 'Re = ρVL/μ', 'inertia/viscous. Closed conduits, submerged bodies.'],
    ['Froude', 'Fr = V/√(gL)', 'inertia/gravity. Free surface: ships, channels, spillways.'],
    ['Euler / pressure coeff.', 'Eu = Δp/(ρV²),  C_p = (p − p∞)/(½ρV²)', 'pressure/inertia'],
    ['Mach', 'Ma = V/a', 'compressibility (Ma > 0.3)'],
    ['Weber', 'We = ρV²L/Υ', 'surface tension: drops, small models'],
    ['Drag / lift coeff.', 'C_D = F/(½ρV²A)', 'force non-dimensionalized'],
    ['Roughness', 'ε/L', 'geometric similarity includes roughness'],
  ], [2300, 3300, 3688]),
  P(''),
  P('**Similarity:** geometric (same shape and ratios), kinematic (velocity ratios equal) and dynamic (force ratios equal, i.e. all relevant Πs matched). You can\'t usually match both Re and Fr with the same fluid. Match the dominant group.'),
  EQ('Re match:  V_m = V_p (ν_m/ν_p)(L_p/L_m)        Fr match:  V_m = V_p √(L_m/L_p)'),
  EQ('Forces:  F_p/F_m = (ρ_p/ρ_m)(V_p/V_m)²(L_p/L_m)²        Power:  P = F·V'),
  EQ('Pumps:  C_Q = Q/(nD³),  C_H = gH/(n²D²),  C_P = P/(ρn³D⁵)'),

  H2('§5 Viscous pipe flow (Ch 6)'),
  EQ('Re_D = ρVD/μ = VD/ν:   laminar < 2300,   transition 2300–4000,   turbulent > 4000'),
  EQ('Entrance length:  L_e/D ≈ 0.06 Re (laminar),   L_e/D ≈ 4.4 Re^(1/6) (turbulent)'),
  EQ('Darcy–Weisbach:  h_f = f (L/D)(V²/2g),   τ_w = f ρV²/8,   Δp = 4τ_w L/D (horizontal)'),
  EQ('Laminar:  f = 64/Re'),
  EQ('Colebrook:  1/√f = −2.0 log₁₀[ (ε/D)/3.7 + 2.51/(Re√f) ]'),
  EQ('Haaland (explicit, ±2%):  1/√f ≈ −1.8 log₁₀[ ((ε/D)/3.7)^1.11 + 6.9/Re ]'),
  table([
    ['Material', 'ε (mm)', 'Minor loss', 'K'],
    ['Drawn tubing / glass', '0.0015', 'Sharp-edged entrance', '0.5'],
    ['Commercial steel', '0.046', 'Well-rounded entrance', '≈0.04'],
    ['Galvanized iron', '0.15', 'Submerged exit', '1.0'],
    ['Cast iron', '0.26', 'Sudden expansion d→D', '(1 − d²/D²)²  on V_small'],
    ['Concrete', '0.3–3.0', 'Sudden contraction', '≈0.42(1 − d²/D²)'],
    ['PVC / plastic', '≈0 (smooth)', 'Minor-loss head', 'h_m = K V²/2g'],
  ], [2400, 1700, 2900, 2288]),
  P(''),
  H3('Three problem types'),
  B('**Type 1, find h_f or Δp** (Q and D known): V → Re, ε/D → f → h_f → energy equation. Direct.'),
  B('**Type 2, find Q** (h_f and D known): guess f (fully rough value), V from Darcy, Re, new f, repeat. Or compute Re√f = √(2gh_fD³/(Lν²)), get f from Colebrook in one step, then Re = (Re√f)/√f.'),
  B('**Type 3, find D** (Q and h_f known): write V = 4Q/(πD²), so h_f = 8fLQ²/(π²gD⁵). Guess f, solve for D, compute Re and ε/D, update f, repeat. Round up to the next available pipe size.'),
  P('**Non-circular ducts:** use the hydraulic diameter D_h = 4A/P (wetted perimeter) in Re, ε/D and h_f. For a wide channel or parallel plates of gap 2h, D_h = 4h.'),

  H2('§6 Common mistakes'),
  B('Using Bernoulli across a pump, through friction, or between two different streamlines in rotational flow.'),
  B('Forgetting continuity: V changes with area.'),
  B('Gage vs absolute pressure: cavitation needs absolute.'),
  B('Manometer: (ρ_m − ρ)gh, not ρ_m·gh, when the legs hold the flowing fluid.'),
  B('Using f = 64/Re in turbulent flow, or using roughness in laminar flow.'),
  B('Exit loss: K = 1 already accounts for the exit kinetic energy. Don\'t count V²/2g twice.'),
  B('Pi theorem: the dependent variable must not be a repeating variable. Check that every Π is dimensionless.'),
  B('Navier–Stokes: write the full equation, then cross out terms with a reason. That earns partial credit.'),
  B('Units: μ in kg/(m·s) = Pa·s; 1 cP = 0.001 Pa·s; ν = μ/ρ.'),
  B('Unit for q in plate flow: m²/s (per unit width), not m³/s.'),

  H2('Your graded homework: re-work list (White 9th ed.)'),
  table([
    ['Due', 'Problems', 'Topic'],
    ['Wed 10/14', '4.1, 4.4, 4.9, 4.47, 4.51, 4.59, 4.27, 4.34', 'Differential relations, ψ/φ, Navier–Stokes exact solutions'],
    ['Mon 10/19', '3.114, 3.124, 3.127', 'Bernoulli'],
    ['Mon 10/26', '5.24, 5.31, 5.37, 5.72, 5.73, 5.74', 'Pi theorem, similitude'],
    ['Mon 11/2', '6.4, 6.8, 6.18, 6.19, 6.43', 'Pipe flow: laminar, turbulent'],
    ['Wed 11/4', '6.52, 6.55, 6.103, 6.124', 'Pipe flow: types 2–3, minor losses, systems'],
  ], [1400, 4000, 3888]),
  P(''),
  P('Your professor wrote and graded these, so they are the best predictor of test problems. Re-do one or two per chapter cold, then compare with your graded copy.'),
];

// ---------- assemble ----------
const sections = [];
// cover
sections.push({ properties: { page: PAGE }, headers: { default: paperHeader() }, children: [
  whiteBox([
    new Paragraph({ children: [new TextRun({ text: 'ME 231 Fluid Mechanics', font: FONT, size: 28, bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: 'Test #2 Prep Packet', font: FONT, size: 44, bold: true, color: '1F3864' })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: 'Mon 11/9/2026 · 10:45 AM–12:00 PM · Packard 466 · Prof. Oztekin', font: FONT, size: 22 })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
    P('**Part A.** Study guide: concepts, formulas, procedures, mistakes list, HW re-work list.'),
    P('**Part B.** 10 practice problems, one per page on engineering paper. Work them here.'),
    P('**Part C.** Step-by-step solutions (Given / Find / Solution). Don\'t look until you\'ve tried.'),
    P(''),
    table([['#', 'Topic', 'Answer (for self-check)'],
      ['P1', 'Kinematics, ψ, φ, Euler', '|a| = 22.6 m/s²'],
      ['P2', 'Plane Poiseuille flow (Navier–Stokes)', 'τ_w = 3.0 Pa'],
      ['P3', 'Siphon, cavitation', 'H_max = 7.11 m'],
      ['P4', 'Venturi meter', 'Q = 0.0142 m³/s'],
      ['P5', 'Pi theorem: pump power', '3 groups'],
      ['P6', 'Model testing (Re match)', 'F_p ≈ 1.67 kN'],
      ['P7', 'Laminar pipe flow', 'Δp = 90.5 kPa'],
      ['P8', 'Turbulent, Type 1', 'Δp = 223 kPa'],
      ['P9', 'Turbulent, Type 2', 'Q = 5.33 L/s'],
      ['P10', 'System with minor losses', 'Q = 19.7 L/s'],
    ], [900, 4800, 3188]),
    P(''),
    P('_These are original practice problems written in the style of White Ch 3–6, not copied from the textbook. Answers were checked numerically (solve.py)._', { size: 18 }),
  ]),
] });
// Part A
sections.push({ properties: { page: PAGE }, headers: { default: plainHeader() }, children: [
  new Paragraph({ children: [new TextRun({ text: 'PART A', font: FONT, size: 20, bold: true, color: '888888' })] }), ...guide] });
// Part B
problems.forEach((p, i) => {
  const kids = [new Paragraph({ children: [new TextRun({ text: `${p.id} · ${p.topic}`, font: FONT, size: 20, bold: true, color: '1F3864' })], spacing: { after: 80 } }),
    ...p.text.map((t) => P(t, { after: 70 }))];
  if (p.fig) kids.push(IMG(p.fig, p.id === 'P3' ? 4.2 : 5.2));
  sections.push({ properties: { page: PAGE }, headers: { default: paperHeader() }, children: [whiteBox(kids)] });
});
// Part C
const solKids = [new Paragraph({ children: [new TextRun({ text: 'PART C', font: FONT, size: 20, bold: true, color: '888888' })] }), H1('Step-by-step solutions')];
problems.forEach((p, i) => {
  if (i > 0) solKids.push(BR());
  solKids.push(H2(`${p.id} · ${p.topic}`), ...sol[p.id]);
});
sections.push({ properties: { page: PAGE }, headers: { default: plainHeader() }, children: solKids });

const doc = new Document({
  creator: 'Mario', title: 'ME231 Test 2 Prep Packet',
  styles: { default: { document: { run: { font: FONT, size: 22 } } } },
  numbering: { config: [
    { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }, { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1000, hanging: 270 } } } }] },
    { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
    { reference: 'num2', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
  ] },
  sections,
});
const out = path.join(D, 'ME231 Test 2 Prep Packet.docx');
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(out, b); console.log('wrote', out); });
