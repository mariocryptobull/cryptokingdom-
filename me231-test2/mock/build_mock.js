// Builds "ME231 Test 2 Mock Exam.docx": 3 problems x 5 parts on engineering paper + step-by-step solutions with point values.
const L = require('../lib.js');
const { fs, path, PAGE, FONT, P, H1, H2, H3, EQ, B, BR, IMG, table, whiteBox, paperHeader, plainHeader,
  Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat } = L;
const fig = (f) => path.join(__dirname, 'figs', f);

const problems = [
  { id: 'Problem 1', pts: 33, topic: 'Ch 4 · Navier–Stokes exact solution (Couette–Poiseuille flow)', fig: 'q1.png', text: [
    'Oil (ρ = 900 kg/m³, μ = 0.40 kg/(m·s)) flows steadily and laminarly between two infinite horizontal parallel plates h = 5 mm apart. The lower plate is fixed; the upper plate moves in the +x direction at U = 2 m/s. A constant pressure gradient dp/dx acts along the gap. Gravity acts in −y.',
    '(a) [6 pts] List your assumptions and reduce continuity and the x-momentum Navier–Stokes equation to an ODE for u(y).',
    '(b) [8 pts] Solve it with the proper boundary conditions to show u(y) = Uy/h + (1/2μ)(dp/dx)(y² − hy).',
    '(c) [7 pts] Find dp/dx (value and sign) such that the net flow rate per unit width is zero.',
    '(d) [6 pts] For that dp/dx, find the shear stress τ = μ du/dy at the lower wall (y = 0) and the upper wall (y = h).',
    '(e) [6 pts] Where in the gap is the velocity most negative, and what is its value? Sketch the profile.',
  ] },
  { id: 'Problem 2', pts: 33, topic: 'Ch 3 + Ch 5 · Bernoulli, Pi theorem, Froude scaling', fig: 'q2.png', text: [
    'A large reservoir of water at 20 °C drains through a sharp-edged circular outlet of diameter D located a depth h below the free surface. The jet contracts to a vena contracta of area C_c·πD²/4 with C_c = 0.61. Assume the discharge Q depends on D, h, g, ρ and μ.',
    '(a) [7 pts] How many dimensionless groups describe the problem? Using ρ, g and D as repeating variables, find them.',
    '(b) [6 pts] Neglecting friction, apply Bernoulli from the free surface to the vena contracta and derive Q(C_c, D, g, h). Show that the result is a special case of part (a), and say which group drops out.',
    '(c) [6 pts] Compute Q for a prototype outlet with D = 1.2 m and h = 15 m.',
    '(d) [7 pts] A 1:20 scale model is tested with water. Which dimensionless group must be matched, and why? Find the model h, D and Q.',
    '(e) [7 pts] Is neglecting viscosity justified in the model? Support your answer with a number. If the model reservoir drains (to a geometrically similar level) in 12 min, how long does the prototype take?',
  ] },
  { id: 'Problem 3', pts: 34, topic: 'Ch 6 · Pipe flow, energy equation, pump sizing', fig: 'q3.png', text: [
    'Water at 20 °C (ρ = 998 kg/m³, μ = 1.00 × 10⁻³ kg/(m·s)) drains from a large open tank through a horizontal pipe 40 m long with D = 4 cm (commercial steel, ε = 0.046 mm). The pipe discharges as a free jet 12 m below the tank surface. The entrance is sharp-edged (K = 0.5); neglect all other minor losses.',
    '(a) [6 pts] Write the energy equation from the free surface (1) to the pipe exit (2). Why is there no exit-loss coefficient here?',
    '(b) [8 pts] Find the velocity V and the flow rate Q.',
    '(c) [6 pts] Find the wall shear stress τ_w.',
    '(d) [7 pts] Find the gage pressure at the pipe midpoint M.',
    '(e) [7 pts] A pump is installed in the line to double the flow rate. Find the required pump head and the power input if the pump is 70% efficient.',
  ] },
];

const sol = {
  'Problem 1': [
    H3('(a) Assumptions and reduced equations [6]'),
    B('Steady, incompressible, laminar, constant μ.'),
    B('Infinite plates, fully developed: v = w = 0 and ∂/∂z = 0.'),
    B('Gravity acts in −y only, so the y-equation is hydrostatic and the x-equation has no gravity term.'),
    P('**Continuity:** ∂u/∂x + ∂v/∂y + ∂w/∂z = 0 with v = w = 0 gives ∂u/∂x = 0, so **u = u(y)**.'),
    P('**x-momentum:** ρ(∂u/∂t + u∂u/∂x + v∂u/∂y + w∂u/∂z) = −∂p/∂x + ρg_x + μ∇²u. Every inertial term vanishes and g_x = 0:'),
    EQ('0 = −dp/dx + μ d²u/dy²'),
    H3('(b) Solve with boundary conditions [8]'),
    EQ('u = (1/2μ)(dp/dx) y² + C₁y + C₂'),
    P('No slip at the lower wall, u(0) = 0, gives C₂ = 0. No slip at the moving wall, u(h) = U, gives C₁ = U/h − (1/2μ)(dp/dx)h.'),
    EQ('u(y) = Uy/h + (1/2μ)(dp/dx)(y² − hy)   ✓'),
    P('This is Couette flow (the linear term) plus Poiseuille flow (the parabolic term).'),
    H3('(c) Zero net flow [7]'),
    EQ('q = ∫₀ʰ u dy = Uh/2 + (1/2μ)(dp/dx)(h³/3 − h³/2) = Uh/2 − (dp/dx)h³/(12μ)'),
    EQ('q = 0   ⟹   dp/dx = 6μU/h² = 6(0.40)(2)/(0.005)² = +1.92 × 10⁵ Pa/m'),
    P('The gradient is **positive (adverse)**: pressure rises in the direction the plate moves and pushes fluid back. This is how a slipper bearing builds pressure.'),
    H3('(d) Wall shear stresses [6]'),
    EQ('du/dy = U/h + (1/2μ)(dp/dx)(2y − h)'),
    EQ('τ(0) = μU/h − (dp/dx)h/2 = 160 − 480 = −320 Pa'),
    EQ('τ(h) = μU/h + (dp/dx)h/2 = 160 + 480 = +640 Pa'),
    P('The negative stress at the lower wall means the fluid there is moving backward (−x).'),
    H3('(e) Minimum velocity [6]'),
    P('Set du/dy = 0: y = h/2 − μU/(h·dp/dx) = h/2 − h/6 = **h/3 = 1.67 mm**. Substituting dp/dx = 6μU/h²:'),
    EQ('u_min = U/3 + (3U/h²)(h²/9 − h²/3) = U/3 − 2U/3 = −U/3 = −0.667 m/s'),
    P('**Sketch:** u = 0 at the lower wall, dips to −0.667 m/s at y = h/3, crosses zero at y = 2h/3, and reaches U = 2 m/s at the upper wall. The forward and backward areas cancel, giving q = 0.'),
  ],
  'Problem 2': [
    H3('(a) Pi groups [7]'),
    table([['', 'Q', 'D', 'h', 'g', 'ρ', 'μ'], ['Dims', 'L³T⁻¹', 'L', 'L', 'LT⁻²', 'ML⁻³', 'ML⁻¹T⁻¹']], [1288, 1333, 1333, 1333, 1333, 1333, 1335]),
    P(''),
    P('n = 6, j = 3 → **k = 3**.'),
    P('**Π₁ = Q ρᵃgᵇDᶜ:** M: a = 0. T: −1 − 2b = 0 → b = −½. L: 3 + b + c = 0 → c = −5/2. So **Π₁ = Q/(g^½ D⁵ᐟ²)**.'),
    P('**Π₂ = h/D** (two lengths).'),
    P('**Π₃ = μ ρᵃgᵇDᶜ:** M: a = −1. T: −1 − 2b = 0 → b = −½. L: −1 + 3 − ½ + c = 0 → c = −3/2. So **Π₃ = μ/(ρ g^½ D³ᐟ²)**.'),
    EQ('Q/(g^½ D⁵ᐟ²) = fcn( h/D ,  μ/(ρ g^½ D³ᐟ²) )'),
    H3('(b) Bernoulli [6]'),
    P('From the free surface (p_atm, V ≈ 0, z = h) to the vena contracta (p_atm because the streamlines are straight in a free jet, z = 0): V_j = √(2gh).'),
    EQ('Q = C_c (πD²/4) √(2gh)'),
    EQ('Q/(g^½D⁵ᐟ²) = C_c(π/4)√2 · (h/D)^½ = 0.678 (h/D)^½'),
    P('So Π₁ = fcn(Π₂) only. **Π₃ (viscosity) drops out** because we assumed frictionless flow.'),
    H3('(c) Prototype flow [6]'),
    EQ('Q = 0.61 × (π(1.2)²/4) × √(2·9.81·15) = 0.61 × 1.131 × 17.16 = 11.8 m³/s'),
    H3('(d) Model scaling [7]'),
    P('This is a free-surface, gravity-driven flow, so **match the Froude number**, which is equivalent to matching Π₁ and Π₂ with the same g. Π₃ cannot also be matched with water (it would need ν_m = ν_p/20³ᐟ²). It is dropped because its effect is small (see part e).'),
    EQ('h_m = 15/20 = 0.75 m,    D_m = 1.2/20 = 0.06 m'),
    EQ('Q_m = Q_p (1/20)⁵ᐟ² = 11.8/1789 = 6.62 × 10⁻³ m³/s ≈ 6.6 L/s'),
    P('Check with the formula: 0.61 × π(0.06)²/4 × √(2·9.81·0.75) = 6.62 × 10⁻³ m³/s ✓.'),
    H3('(e) Viscosity check and time scaling [7]'),
    EQ('V_m = √(2g·0.75) = 3.84 m/s,    Re_m = V_m D_m/ν = 3.84(0.06)/1.002×10⁻⁶ = 2.3 × 10⁵'),
    P('Re is high (Π₃ ≈ 2 × 10⁻⁵), so inertia dominates and neglecting viscosity is justified.'),
    P('Time scales like L/V ∝ L/√(gL) = √(L/g), so t_p/t_m = √20 (equivalently, volume ∝ L³ and Q ∝ L⁵ᐟ²):'),
    EQ('t_p = 12 × √20 = 53.7 min'),
  ],
  'Problem 3': [
    H3('(a) Energy equation [6]'),
    P('Point 1 is the free surface (p = 0 gage, V ≈ 0, z₁ = 12 m). Point 2 is the exit jet (p = 0 gage, V, z₂ = 0).'),
    EQ('z₁ = V²/2g + h_f + h_m   ⟹   12 = (V²/2g)(1 + K + fL/D) = (V²/2g)(1.5 + 1000f)'),
    P('The jet carries its kinetic energy V²/2g away as a free jet, and that term is already in the equation. An exit loss (K = 1) applies only when a pipe empties into a reservoir and that kinetic energy is dissipated there. Counting both would count the same energy twice.'),
    H3('(b) Velocity and flow rate (Type 2) [8]'),
    P('Use ε/D = 0.046/40 = 0.00115 and V = √(235.4/(1.5 + 1000f)). Iterate with Colebrook:'),
    table([
      ['Iter', 'f (guess)', 'V (m/s)', 'Re', 'f (Colebrook)'],
      ['1', '0.0200', '3.309', '132 100', '0.02217'],
      ['2', '0.02217', '3.154', '125 900', '0.02225'],
      ['3', '0.02225', '3.149', '125 700', '0.02225 ✓'],
    ], [1300, 1900, 1900, 2000, 2188]),
    P(''),
    EQ('V = 3.15 m/s,    Q = V πD²/4 = 3.148 × 1.257×10⁻³ = 3.96 × 10⁻³ m³/s ≈ 3.96 L/s'),
    H3('(c) Wall shear [6]'),
    EQ('τ_w = f ρV²/8 = 0.02225(998)(3.148²)/8 = 27.5 Pa'),
    H3('(d) Midpoint pressure [7]'),
    P('Write the energy equation from M to the exit. Both points have the same z and V, p₂ = 0, and the loss is friction over the last 20 m:'),
    EQ('p_M/γ = f (20/D)(V²/2g) = 0.02225 × 500 × 0.505 = 5.62 m'),
    EQ('p_M = 9790 × 5.62 = 55.0 kPa (gage)'),
    P('Check from 1 → M: 12 − 0.505(1 + 0.5 + 11.1) = 5.62 m ✓.'),
    H3('(e) Pump to double Q [7]'),
    EQ('V′ = 6.30 m/s,   Re′ = 2.51 × 10⁵   ⟹   f′ = 0.0214'),
    EQ('12 + h_p = (V′²/2g)(1.5 + f′L/D) = 2.021 × (1.5 + 21.4) = 46.2 m   ⟹   h_p = 34.2 m'),
    EQ('P = γQ′h_p/η = 9790 × (7.91×10⁻³) × 34.2/0.70 = 3.78 kW'),
    P('Doubling Q needs about 4× the total head because h ∝ V². That is why h_p (34 m) is much larger than the original 12 m.'),
  ],
};

// ---------- assemble ----------
const sections = [];
sections.push({ properties: { page: PAGE }, headers: { default: paperHeader() }, children: [whiteBox([
  new Paragraph({ children: [new TextRun({ text: 'ME 231 Fluid Mechanics · Prof. Oztekin', font: FONT, size: 26, bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
  new Paragraph({ children: [new TextRun({ text: 'Mock Test #2', font: FONT, size: 48, bold: true, color: '1F3864' })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
  new Paragraph({ children: [new TextRun({ text: 'Practice for Mon 11/9/2026 · 10:45 AM–12:00 PM · Packard 466', font: FONT, size: 22 })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
  P('Name: ____________________________________        Score: ________ / 100', { size: 24 }),
  P(''),
  P('**Instructions.** Allow yourself **75 minutes**, the real test length. Work each problem on its own page, using Given / Find / Solution. State your assumptions, write each governing equation before you simplify it, and box your final answers with units. Use the properties given in each problem. Use the Moody chart or Colebrook/Haaland for friction factors.'),
  table([['Problem', 'Topic', 'Points'],
    ['1', 'Ch 4 · Navier–Stokes exact solution (Couette–Poiseuille)', '33'],
    ['2', 'Ch 3 + 5 · Bernoulli, Pi theorem, Froude model scaling', '33'],
    ['3', 'Ch 6 · Pipe flow, energy equation, pump', '34'],
    ['', '**Total**', '**100**']], [1400, 6400, 1488]),
  P(''),
  P('_Suggested pace: about 25 minutes per problem. If a part stalls you, write the equation you would use and move on, because setup earns partial credit._', { size: 20 }),
  P('_Solutions with point breakdowns are at the back. Don\'t look until time is up._', { size: 20 }),
])] });
problems.forEach((p) => {
  const kids = [new Paragraph({ children: [new TextRun({ text: `${p.id}  (${p.pts} points) · ${p.topic}`, font: FONT, size: 22, bold: true, color: '1F3864' })], spacing: { after: 80 } }),
    ...p.text.map((t) => P(t, { after: 70 })), IMG(fig(p.fig), 5.0)];
  sections.push({ properties: { page: PAGE }, headers: { default: paperHeader() }, children: [whiteBox(kids)] });
});
const S = [H1('Mock Test #2: Solutions'), P('Each part shows its point value. Give yourself partial credit for correct setup (assumptions, the right governing equation, correct boundary conditions) even when the arithmetic is wrong.')];
problems.forEach((p, i) => { if (i > 0) S.push(BR()); S.push(H2(`${p.id} (${p.pts} pts) · ${p.topic}`), ...sol[p.id]); });
S.push(BR(), H2('Answer key'), table([
  ['Part', 'Problem 1', 'Problem 2', 'Problem 3'],
  ['(a)', '0 = −dp/dx + μu″', 'Q/(g^½D⁵ᐟ²) = f(h/D, μ/(ρg^½D³ᐟ²))', '12 = (V²/2g)(1.5 + fL/D)'],
  ['(b)', 'u = Uy/h + (dp/dx)(y² − hy)/(2μ)', 'Q = C_c(πD²/4)√(2gh)', 'V = 3.15 m/s, Q = 3.96 L/s'],
  ['(c)', 'dp/dx = +1.92×10⁵ Pa/m', 'Q_p = 11.8 m³/s', 'τ_w = 27.5 Pa'],
  ['(d)', 'τ(0) = −320 Pa, τ(h) = +640 Pa', 'Froude: h_m = 0.75 m, D_m = 6 cm, Q_m = 6.6 L/s', 'p_M = 55.0 kPa gage'],
  ['(e)', 'u_min = −0.667 m/s at y = h/3', 'Re_m = 2.3×10⁵; t_p = 53.7 min', 'h_p = 34.2 m, P = 3.78 kW'],
], [800, 2700, 3200, 2588]));
sections.push({ properties: { page: PAGE }, headers: { default: plainHeader() }, children: S });

const doc = new Document({
  creator: 'Mario', title: 'ME231 Mock Test 2',
  styles: { default: { document: { run: { font: FONT, size: 22 } } } },
  numbering: { config: [
    { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT }] },
    { reference: 'num2', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT }] },
  ] },
  sections,
});
const out = path.join(__dirname, 'ME231 Mock Test 2.docx');
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(out, b); console.log('wrote', out); });
