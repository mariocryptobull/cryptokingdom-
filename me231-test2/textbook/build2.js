// Builds "ME231 Test 2 Textbook Practice.docx": 16 White 9th-ed problems cropped onto engineering paper + step-by-step solutions.
const L = require('../lib.js');
const { fs, path, PAGE, FONT, P, H1, H2, H3, EQ, B, BR, table, whiteBox, paperHeader, plainHeader,
  Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, LevelFormat } = L;
const CROPS = path.join(__dirname, 'crops');

function crop(label) {
  const buf = fs.readFileSync(path.join(CROPS, label + '.png'));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  let wIn = Math.min(6.0, (w / 300) * 1.45);       // enlarge ~45% over book size for readability
  if (wIn * h / w > 5.6) wIn = 5.6 * w / h;          // cap height so work space remains
  const W = Math.round(wIn * 96);
  return new Paragraph({ children: [new ImageRun({ type: 'png', data: buf, transformation: { width: W, height: Math.round(W * h / w) } })], alignment: AlignmentType.CENTER, spacing: { before: 60, after: 0 } });
}

const probs = [
  { id: 'P3.117', ch: 'Ch 3 · Bernoulli', concept: 'Bernoulli between two points with V = 0: tank pressure head converts to jet height', ans: 'H ≈ 8.5 m' },
  { id: 'P3.121', ch: 'Ch 3 · Bernoulli + continuity', concept: 'Venturi meter with a gas: ideal-gas density, manometer Δp, then Bernoulli', ans: 'p₂ ≈ 169.4 kPa; Q ≈ 224 m³/h' },
  { id: 'P3.126', ch: 'Ch 3 · Bernoulli / energy eq.', concept: 'Pressurized tank draining; adding a head-loss term to Bernoulli', ans: '(a) 0.197 ft³/s  (b) 0.084 ft³/s' },
  { id: 'P4.3', ch: 'Ch 4 · Kinematics', concept: 'Convective acceleration from a velocity field; vector components and directions', ans: 'a = 18i + 26j; V₄₀ = −5.39' },
  { id: 'P4.17', ch: 'Ch 4 · Continuity', concept: 'Integrate continuity to get v from u in a growing boundary layer', ans: 'v_max ≈ 0.005 m/s' },
  { id: 'P4.57', ch: 'Ch 4 · ψ and φ', concept: 'Stream function exists if continuity holds; potential exists only if irrotational', ans: 'ψ = (V/L)(2xy − y²); no φ' },
  { id: 'P4.80', ch: 'Ch 4 · Exact Navier–Stokes', concept: 'Gravity-driven film: reduce Navier–Stokes, no-slip wall + zero-shear free surface', ans: 'w = −(ρg/2μ)x(2δ − x)' },
  { id: 'P5.25', ch: 'Ch 5 · Pi theorem', concept: '6 variables, 3 dimensions → 3 groups', ans: 'F/(ρV²D²) = f(ΩD/V, ρVD/μ)' },
  { id: 'P5.29', ch: 'Ch 5 · Pi theorem', concept: '5 variables → 2 groups; a fractional exponent is fine', ans: 't_tr(a/D)^½ = f(ρa^½D³ᐟ²/μ)' },
  { id: 'P5.66', ch: 'Ch 5 · Similarity (cavitation no.)', concept: 'Hold the cavitation number constant between two operating conditions', ans: '27 m/s; ≈ 26.5 m' },
  { id: 'P5.71', ch: 'Ch 5 · Model scaling', concept: 'Match the Euler number to scale a venturi meter to another fluid', ans: 'D ≈ 15 cm' },
  { id: 'P6.11', ch: 'Ch 6 · Energy eq. + manometer', concept: 'Manometer on an inclined pipe reads piezometric head = head loss', ans: 'Δp ≈ 46 kPa; h_f ≈ 1.70 m; f ≈ 0.025' },
  { id: 'P6.14', ch: 'Ch 6 · Laminar flow', concept: 'Energy eq. with laminar h_f; Re limit sets a maximum H', ans: 'H ≳ 1.0 m turbulent; Q ≈ 1.85×10⁻⁶ m³/s' },
  { id: 'P6.41', ch: 'Ch 6 · Turbulent, Type 2', concept: 'Find the roughness that still delivers the required flow', ans: 'galvanized & steel OK; cast iron no' },
  { id: 'P6.44', ch: 'Ch 6 · Turbulent, Type 1', concept: 'Smooth-pipe friction factor at high Re', ans: 'h_f ≈ 10.5 m; Δp ≈ 1.4 MPa' },
  { id: 'P6.62', ch: 'Ch 6 · Pump + pipe system', concept: 'Pump head = lift + friction; power = ρgQh/η', ans: '≈ 204 hp' },
];

const S = {
  'P3.117': [
    H3('Given'), P('Water 20 °C (γ = 9790 N/m³). Air at 75 kPa gage above the water surface, which is 0.85 m above the outlet level. Free jet rises to height H (measured from the outlet level).'),
    H3('Assumptions'), P('Steady, frictionless, incompressible, along a streamline from the water surface (1) to the top of the jet (2).'),
    H3('Solution'),
    P('**Step 1: pick the two points.** At (1): p₁ = 75 kPa gage, V₁ ≈ 0 (large tank), z₁ = 0.85 m. At (2), the top of the jet: p₂ = 0 gage (open air), V₂ = 0 (the jet stops rising), z₂ = H.'),
    P('**Step 2: Bernoulli.**'),
    EQ('p₁/γ + V₁²/2g + z₁ = p₂/γ + V₂²/2g + z₂'),
    EQ('75 000/9790 + 0 + 0.85 = 0 + 0 + H'),
    EQ('H = 7.66 + 0.85 = 8.51 m'),
    H3('Takeaway'), P('The jet top has V = 0, so all the pressure head plus elevation head reappears as height. With no friction, the pipe geometry between the points doesn\'t matter.'),
  ],
  'P3.121': [
    H3('Given'), P('CO₂ at 20 °C, p₁ = 170 kPa (absolute), R = 189 J/(kg·K). D₁ = 10 cm, D₂ = 6 cm → β = 0.6. Meriam red oil SG = 0.827 → ρ_m = 0.827(998) = 825 kg/m³; h = 8 cm.'),
    H3('Assumptions'), P('Steady, frictionless; the gas is treated as incompressible because Δp ≪ p (check at the end).'),
    H3('Solution'),
    P('**Step 1: gas density** (ideal gas, Table A.4 R for CO₂):'),
    EQ('ρ = p/(RT) = 170 000/(189 × 293) = 3.07 kg/m³'),
    P('**Step 2: manometer.** Both legs contain CO₂, so subtract the gas density:'),
    EQ('p₁ − p₂ = (ρ_m − ρ)gh = (825 − 3.07)(9.81)(0.08) = 645 Pa'),
    EQ('(a)  p₂ = 170 000 − 645 ≈ 169.4 kPa'),
    P('**Step 3: continuity + Bernoulli** (horizontal, V₁ = β²V₂):'),
    EQ('p₁ − p₂ = ½ρV₂²(1 − β⁴)   ⟹   V₂ = √[2(645)/(3.07 × (1 − 0.6⁴))] = √[1290.6/2.670] = 22.0 m/s'),
    EQ('(b)  Q = V₂ π(0.06)²/4 = 22.0 × 0.002827 = 0.0622 m³/s ≈ 224 m³/h'),
    P('Check: Δp/p = 645/170 000 = 0.4%, so treating the gas as incompressible is fine.'),
    H3('Takeaway'), P('A gas Venturi works the same way as a liquid one. Get ρ from p/RT first. With a liquid manometer, ρ_gas is negligible next to ρ_m, but writing (ρ_m − ρ) shows you understand it.'),
  ],
  'P3.126': [
    H3('Given'), P('Kerosene 20 °C: ρ = 1.56 slug/ft³ (804 kg/m³). Tank air p = 20 lbf/in² abs; exit to p_a = 14.7 lbf/in² abs. Depth above the pipe centerline h = 5 ft. D = 1 in.'),
    H3('Solution'),
    P('**Step 1: points.** (1) the free surface in the tank: p₁ = 20 psia, V₁ ≈ 0, z₁ = 5 ft. (2) the pipe exit: p₂ = 14.7 psia, V₂ = V, z₂ = 0.'),
    EQ('p₁ − p₂ = (20 − 14.7)(144) = 763 lbf/ft²'),
    P('**(a) No losses:**'),
    EQ('(p₁ − p₂)/ρ + g h = V²/2   ⟹   V = √[2(763/1.56 + 32.2 × 5)] = √[2(489 + 161)] = 36.1 ft/s'),
    EQ('Q = V π(1/12)²/4 = 36.1 × 0.005454 = 0.197 ft³/s   (≈ 0.0056 m³/s)'),
    P('**(b) With losses h_f = 4.5V²/(2g):** the energy equation gains one term on the right side:'),
    EQ('(p₁ − p₂)/ρg + h = V²/2g + 4.5V²/2g = 5.5 V²/2g'),
    EQ('V = 36.1/√5.5 = 15.4 ft/s,    Q = 15.4 × 0.005454 = 0.084 ft³/s   (≈ 0.0024 m³/s)'),
    H3('Takeaway'), P('The loss term is written as K·V²/2g. Lump it with the exit kinetic energy, so (1 + K) multiplies V²/2g. Here the losses cut the flow by more than half. Watch BG units: ρ is in slug/ft³ and pressure in lbf/ft².'),
  ],
  'P4.3': [
    H3('Given'), P('`u = x² − y² + x`,  `v = −(2xy + y)`, steady 2-D, evaluate at (x, y) = (1, 2).'),
    H3('Solution'),
    P('**Step 1: velocity and gradients at (1, 2):** u = 1 − 4 + 1 = −2, v = −(4 + 2) = −6.'),
    EQ('∂u/∂x = 2x + 1 = 3,   ∂u/∂y = −2y = −4,   ∂v/∂x = −2y = −4,   ∂v/∂y = −(2x + 1) = −3'),
    P('**(a) Convective acceleration** (steady, so there is no ∂/∂t term):'),
    EQ('a_x = u ∂u/∂x + v ∂u/∂y = (−2)(3) + (−6)(−4) = 18'),
    EQ('a_y = u ∂v/∂x + v ∂v/∂y = (−2)(−4) + (−6)(−3) = 26'),
    P('**(b) Component of V in the direction θ = 40°:** dot V with the unit vector n = (cos 40°, sin 40°):'),
    EQ('V·n = (−2)(0.766) + (−6)(0.643) = −5.39'),
    P('**(c) Direction of maximum velocity** is along V itself: θ = atan2(−6, −2) = **251.6°** (|V| = 6.32).'),
    P('**(d) Direction of maximum acceleration:** θ = atan2(26, 18) = **55.3°** (|a| = 31.6).'),
    P('Check: ∂u/∂x + ∂v/∂y = 3 − 3 = 0, so the flow is incompressible.'),
    H3('Takeaway'), P('Write all four derivatives first, then plug in. The point and the sign bookkeeping are where exam points get lost. "Component in direction θ" means a dot product.'),
  ],
  'P4.17': [
    H3('Given'), P('`u = U(2η − 2η³ + η⁴)`, η = y/δ, δ = C x^½ (so dδ/dx = δ/(2x)). 2-D incompressible. Part (b): x = 1 m, U = 3 m/s, δ = 1.1 cm.'),
    H3('Solution'),
    P('**Step 1: ∂u/∂x by the chain rule.** u depends on x only through η = y/δ(x): ∂η/∂x = −(y/δ²)(dδ/dx) = −η/(2x).'),
    EQ('∂u/∂x = U f′(η)·∂η/∂x = −U η f′(η)/(2x),    f′(η) = 2 − 6η² + 4η³'),
    P('**Step 2: continuity**, ∂v/∂y = −∂u/∂x. Integrate from the wall with dy = δ dη, using v(0) = 0 (no slip):'),
    EQ('v = (Uδ/2x) ∫₀^η η f′ dη = (Uδ/2x) ∫₀^η (2η − 6η³ + 4η⁴) dη'),
    EQ('(a)  v = (Uδ/2x)(η² − 1.5η⁴ + 0.8η⁵),   η = y/δ'),
    P('**(b) Maximum v.** dv/dη ∝ 2η − 6η³ + 4η⁴ = 2η(1 − η)²(1 + 2η) ≥ 0, so v increases all the way to η = 1, where the bracket equals 1 − 1.5 + 0.8 = 0.3.'),
    EQ('v_max = 0.3 Uδ/(2x) = 0.15 Uδ/x = 0.15(3)(0.011)/1 = 0.0050 m/s'),
    P('That is only 0.17% of U: v is very small in a boundary layer.'),
    H3('Takeaway'), P('Given u, find v: (1) differentiate u with respect to x (chain rule when δ = δ(x)), (2) integrate continuity in y, (3) fix the constant with a boundary condition, usually v = 0 at the wall.'),
  ],
  'P4.57': [
    H3('Given'), P('`u = 2V(x/L − y/L)`,   `v = −2V y/L`.'),
    H3('Solution'),
    P('**Step 1: continuity.** If it holds, ψ exists. ∂u/∂x + ∂v/∂y = 2V/L − 2V/L = 0 ✓.'),
    P('**Step 2: stream function.** Integrate u = ∂ψ/∂y:'),
    EQ('ψ = ∫ 2V(x − y)/L dy = (V/L)(2xy − y²) + f(x)'),
    EQ('v = −∂ψ/∂x = −2Vy/L − f′(x)  ⟹  f′ = 0   ⟹   ψ = (V/L)(2xy − y²)'),
    P('**Step 3: vorticity.** If it is zero, φ exists:'),
    EQ('ω_z = ∂v/∂x − ∂u/∂y = 0 − (−2V/L) = 2V/L ≠ 0'),
    P('The flow is **rotational**, so **no velocity potential exists**.'),
    H3('Takeaway'), P('ψ needs continuity only (2-D incompressible). φ needs irrotationality. Always check before integrating. On an exam, show the check explicitly.'),
  ],
  'P4.80': [
    H3('Given'), P('Oil film of constant thickness δ on a vertical plate; x is normal to the plate, z is up, gravity acts in −z. w = w(x) only; air exerts no shear at x = δ.'),
    H3('Assumptions'), P('Steady, incompressible, fully developed (∂/∂z = 0), u = v = 0. Pressure equals atmospheric everywhere, so ∂p/∂z = 0.'),
    H3('Solution'),
    P('**Step 1: continuity.** ∂w/∂z = 0 ✓, consistent with w = w(x).'),
    P('**Step 2: z-momentum Navier–Stokes.**'),
    EQ('ρ(∂w/∂t + u∂w/∂x + v∂w/∂y + w∂w/∂z) = −∂p/∂z − ρg + μ(∂²w/∂x² + ∂²w/∂y² + ∂²w/∂z²)'),
    P('The left side is 0 (steady, u = v = 0, ∂w/∂z = 0), ∂p/∂z = 0, and only ∂²w/∂x² survives:'),
    EQ('μ d²w/dx² = ρg   ⟹   w = (ρg/2μ)x² + C₁x + C₂'),
    P('**Step 3: boundary conditions.** No slip: w(0) = 0 → C₂ = 0. Free surface (no shear): dw/dx(δ) = 0 → C₁ = −ρgδ/μ.'),
    EQ('(a)  w(x) = −(ρg/2μ)·x(2δ − x)'),
    P('The profile is a half-parabola: zero at the wall, most negative (fastest downward) at the free surface, w_surface = −ρgδ²/(2μ), with zero slope there. Flow per unit width: q = −ρgδ³/(3μ).'),
    P('**(b)** At the wall, dw/dx = −ρgδ/μ, so'),
    EQ('μ = −ρgδ / (dw/dx)_wall'),
    H3('Takeaway'), P('A free surface means τ = μ dw/dx = 0 there, which replaces the second no-slip condition. Gravity plays the role of the pressure gradient in driving the flow.'),
  ],
  'P5.25': [
    H3('Solution'),
    P('**Step 1: list variables and dimensions.** F = f(D, Ω, V, ρ, μ).'),
    table([['', 'F', 'D', 'Ω', 'V', 'ρ', 'μ'], ['Dims', 'MLT⁻²', 'L', 'T⁻¹', 'LT⁻¹', 'ML⁻³', 'ML⁻¹T⁻¹']], [1288, 1333, 1333, 1333, 1333, 1333, 1335]),
    P(''),
    P('n = 6 variables, j = 3 dimensions → **k = 3** groups. Repeating variables: ρ, V, D.'),
    P('**Π₁ = F ρᵃVᵇDᶜ:** M: 1 + a = 0 → a = −1. T: −2 − b = 0 → b = −2. L: 1 − 3a + b + c = 0 → c = −2.'),
    EQ('Π₁ = F/(ρV²D²)    (thrust coefficient)'),
    P('**Π₂ = Ω ρᵃVᵇDᶜ:** M: a = 0. T: −1 − b = 0 → b = −1. L: b + c = 0 → c = 1.'),
    EQ('Π₂ = ΩD/V    (inverse of the advance ratio)'),
    P('**Π₃ = μ ρᵃVᵇDᶜ:** a = −1, b = −1, c = −1, giving μ/(ρVD). Invert it to the Reynolds number.'),
    EQ('F/(ρV²D²) = fcn( ΩD/V ,  ρVD/μ )'),
    H3('Takeaway'), P('Propeller practice uses ρ, Ω, D instead: C_T = F/(ρΩ²D⁴) and J = V/(ΩD). Any valid set is correct, because groups can be multiplied and inverted into one another.'),
  ],
  'P5.29': [
    H3('Solution'),
    P('**Step 1:** t_tr = f(D, a, ρ, μ). Dimensions: t_tr is T, D is L, a is LT⁻², ρ is ML⁻³, μ is ML⁻¹T⁻¹.'),
    P('n = 5, j = 3 → **k = 2** groups. Repeating variables: D, a, ρ.'),
    P('**Π₁ = t_tr Dᵃ aᵇ ρᶜ:** M: c = 0. T: 1 − 2b = 0 → b = ½. L: a + b − 3c = 0 → a = −½.'),
    EQ('Π₁ = t_tr (a/D)^½'),
    P('**Π₂ = μ Dᵃ aᵇ ρᶜ:** M: 1 + c = 0 → c = −1. T: −1 − 2b = 0 → b = −½. L: −1 + a + b − 3c = 0 → −1 + a − ½ + 3 = 0 → a = −3/2.'),
    EQ('Π₂ = μ/(ρ a^½ D³ᐟ²)    (invert it to a Reynolds-type number ρa^½D³ᐟ²/μ)'),
    EQ('t_tr (a/D)^½ = fcn( ρ a^½ D³ᐟ² / μ )'),
    P('Check: √(aD) is a velocity scale, so ρ√(aD)·D/μ is a Reynolds number ✓.'),
    H3('Takeaway'), P('Fractional exponents are normal when no repeating variable has the time dimension alone. Check each group by spotting a physical velocity or Reynolds number inside it.'),
  ],
  'P5.66': [
    H3('Given'), P('Seawater ρ = 1025 kg/m³, p_v ≈ 2337 Pa, p_a = 101 kPa. Cavitates at 21 m/s at 8 m depth. Re and Fr effects neglected.'),
    H3('Solution'),
    P('**Step 1: governing group.** Cavitation depends on the cavitation number, which must be the same at incipient cavitation:'),
    EQ('Ca = (p_∞ − p_v)/(½ρV²),    p_∞ = p_a + ρgh'),
    EQ('Ca = [101 000 + 1025(9.81)(8) − 2337] / [½(1025)(21²)] = 179 100/226 000 = 0.792'),
    P('**Step 2: at 20 m depth,** solve for V with the same Ca:'),
    EQ('V = √[2(p_a + ρgh − p_v)/(ρ·Ca)] = √[2(101 000 + 201 100 − 2337)/(1025 × 0.792)] = 27.2 m/s'),
    P('**Step 3: depth for 30 m/s:**'),
    EQ('ρgh = Ca·½ρV² + p_v − p_a = 0.792(0.5)(1025)(900) + 2337 − 101 000 = 266 900 Pa'),
    EQ('h = 266 900/(1025 × 9.81) ≈ 26.5 m'),
    H3('Takeaway'), P('When the problem says "Re and Fr negligible", the remaining group (here Ca) must stay constant. Deeper water means higher ambient pressure, which allows a higher speed before cavitation.'),
  ],
  'P5.71': [
    H3('Given'), P('Model: water (998 kg/m³), V_m = 4 m/s, Δp_m = 5 kPa. Prototype: gasoline (680 kg/m³), Q = 9 m³/min = 0.15 m³/s, Δp_p = 15 kPa. Δp depends only on ρ, V and the diameter ratio.'),
    H3('Solution'),
    P('**Step 1: dimensional analysis.** Δp = f(ρ, V, β) gives Δp/(ρV²) = fcn(β). Geometric similarity (same β) means equal Euler numbers.'),
    EQ('Eu = Δp_m/(ρ_m V_m²) = 5000/(998 × 4²) = 0.313'),
    P('**Step 2: prototype velocity:**'),
    EQ('V_p = √[Δp_p/(ρ_p Eu)] = √[15 000/(680 × 0.313)] = 8.39 m/s'),
    P('**Step 3: diameter from the flow rate:**'),
    EQ('D_p = √(4Q/(πV_p)) = √(4 × 0.15/(π × 8.39)) = 0.151 m ≈ 15 cm'),
    H3('Takeaway'), P('Scaling recipe: (1) find which groups matter, (2) hold them constant, (3) use the remaining given (here Q) to size the prototype. Viscosity is dropped here because the problem says Δp doesn\'t depend on it.'),
  ],
  'P6.11': [
    H3('Given'), P('Water 20 °C, V = 4 m/s, D = 6 cm, L = 5 m, z₂ − z₁ = 3 m (flow upward). Mercury manometer h = 135 mm, p₁ higher.'),
    H3('Solution'),
    P('**(a) Manometer.** Walking through the manometer gives the difference in piezometric pressure:'),
    EQ('(p₁ + γz₁) − (p₂ + γz₂) = (γ_Hg − γ_w) h'),
    EQ('p₁ − p₂ = (13 550 − 998)(9.81)(0.135) + 9790(3) = 16 620 + 29 370 ≈ 46.0 kPa'),
    P('**(b) Energy equation 1 → 2.** Same D, so V₁ = V₂:'),
    EQ('h_f = (p₁ − p₂)/γ − (z₂ − z₁) = 46 000/9790 − 3 = 4.70 − 3 = 1.70 m'),
    EQ('Equivalently:  h_f = (ρ_Hg/ρ_w − 1) h = (12.58)(0.135) = 1.70 m'),
    P('**(c) Yes.** The manometer measures the drop in p + γz, which for a constant-area pipe is exactly h_f, whatever the pipe slope. Elevation cancels inside the manometer.'),
    P('**(d) Friction factor:**'),
    EQ('f = h_f (D/L)(2g/V²) = 1.70(0.06/5)(19.62/16) = 0.025'),
    P('Check: Re = VD/ν = 4(0.06)/1.002×10⁻⁶ = 2.4×10⁵, which is turbulent. f = 0.025 matches the Moody chart for a slightly rough pipe.'),
    H3('Takeaway'), P('This is a favorite exam concept: on an inclined pipe the manometer reads head loss directly, while Δp includes the elevation change.'),
  ],
  'P6.14': [
    H3('Given'), P('Water 20 °C (ρ = 998, μ = 0.001 kg/(m·s), ν = 1.002×10⁻⁶ m²/s). Tube L = 1 m, d = 2 mm; exit H below the tank surface (free jet). Neglect curvature and entrance losses.'),
    H3('Solution'),
    P('**Step 1: energy equation**, from the tank surface to the exit (both at p_atm, V_surface ≈ 0):'),
    EQ('H = V²/2g + h_f,    laminar:  h_f = (64/Re)(L/d)(V²/2g) = 32μLV/(ρgd²)'),
    P('**Step 2: laminar limit.** Re = 2300 gives V = 2300ν/d = 1.15 m/s:'),
    EQ('H = (1.15)²/19.62 + 32(0.001)(1)(1.15)/(998 × 9.81 × 0.002²) = 0.068 + 0.941 ≈ 1.0 m'),
    P('So the flow may stop being laminar if **H exceeds about 1.0 m**.'),
    P('**Step 3: H = 0.5 m.** Solve the quadratic in V, where 32μL/(ρgd²) = 0.817 s:'),
    EQ('V²/19.62 + 0.817 V − 0.5 = 0   ⟹   V = 0.590 m/s'),
    EQ('Q = V π d²/4 = 0.590 × 3.14×10⁻⁶ = 1.85×10⁻⁶ m³/s ≈ 6.7 L/h'),
    P('Check: Re = 0.59(0.002)/1.002×10⁻⁶ = 1180 < 2300, so the flow is laminar ✓. Using α = 2 for the laminar exit kinetic energy changes V by only a few percent.'),
    H3('Takeaway'), P('In a laminar tube problem, h_f is linear in V, so the energy equation becomes a quadratic. Always confirm Re afterward.'),
  ],
  'P6.41': [
    H3('Given'), P('Δz = 40 m, L = 350 m, D = 8 cm, water 20 °C, required weight flow 130 N/s. Neglect minor losses.'),
    H3('Solution'),
    P('**Step 1: required flow:** Q = 130/9790 = 0.01328 m³/s, V = Q/A = 0.01328/0.005027 = 2.64 m/s, Re = VD/ν = 2.11×10⁵.'),
    P('**Step 2: energy equation**, surface to surface: all 40 m goes to friction, h_f = 40 m. The maximum allowable f is'),
    EQ('f = h_f (D/L)(2g/V²) = 40(0.08/350)(19.62/2.64²) = 0.0257'),
    P('**Step 3: allowable roughness.** Solve Colebrook for ε/D with f = 0.0257 and Re = 2.11×10⁵:'),
    EQ('ε/D = 3.7[10^(−1/(2√f)) − 2.51/(Re√f)] = 0.0025   ⟹   ε_max ≈ 0.20 mm'),
    table([
      ['Material', 'ε (mm)', 'Actual f', 'Q delivered (m³/s)', 'Weight flow (N/s)', 'OK?'],
      ['(a) Galvanized iron', '0.15', '0.0239', '0.0138', '135', 'Yes'],
      ['(b) Commercial steel', '0.046', '0.0189', '0.0155', '152', 'Yes'],
      ['(c) Cast iron', '0.26', '0.0274', '0.0129', '126', 'No'],
    ], [2200, 1000, 1300, 1900, 1800, 1088]),
    P(''),
    P('The "Q delivered" column comes from solving the Type 2 problem for each material (iterate V = √(2gh_fD/(fL)) with Colebrook).'),
    H3('Takeaway'), P('Turn "can material X work?" into "what is the maximum allowable f, or ε?". That gives one calculation instead of three iterations.'),
  ],
  'P6.44': [
    H3('Given'), P('Mercury 20 °C: ρ = 13 550 kg/m³, μ = 1.56×10⁻³ kg/(m·s). D = 7 mm, L = 4 m, V = 5 m/s, glass tubing (smooth, ε ≈ 0).'),
    H3('Solution'),
    EQ('Re = ρVD/μ = 13 550(5)(0.007)/0.00156 = 3.04×10⁵   (turbulent)'),
    P('Smooth-pipe Colebrook (ε = 0), iterated: `1/√f = −2 log₁₀(2.51/(Re√f))`'),
    EQ('f = 0.0144'),
    EQ('h_f = f (L/D)(V²/2g) = 0.0144(4/0.007)(25/19.62) = 10.5 m'),
    EQ('Δp = ρg h_f = 13 550(9.81)(10.5) = 1.40×10⁶ Pa ≈ 1400 kPa'),
    H3('Takeaway'), P('Head loss is in meters of the flowing fluid. Mercury is 13.6 times denser than water, so the same h_f costs 13.6 times more pressure. Always use the flowing fluid\'s ρ in Δp = ρgh_f.'),
  ],
  'P6.62': [
    H3('Given'), P('Water 20 °C (BG): ρ = 1.94 slug/ft³, μ = 2.09×10⁻⁵ slug/(ft·s), γ = 62.4 lbf/ft³. Q = 3 ft³/s, L = 2000 ft, D = 6 in = 0.5 ft, cast iron ε = 0.00085 ft, Δz = 120 ft, η = 0.75. Minor losses neglected.'),
    H3('Solution'),
    P('**Step 1: flow parameters:**'),
    EQ('V = Q/A = 3/(π(0.5)²/4) = 15.3 ft/s,    Re = ρVD/μ = 1.94(15.3)(0.5)/2.09×10⁻⁵ = 7.09×10⁵'),
    EQ('ε/D = 0.00085/0.5 = 0.0017   ⟹   Colebrook:  f = 0.0227'),
    P('**Step 2: head loss:**'),
    EQ('h_f = f (L/D)(V²/2g) = 0.0227(4000)(15.3²/64.4) = 330 ft'),
    P('**Step 3: energy equation**, surface 1 → surface 2 (p = p_atm and V ≈ 0 at both):'),
    EQ('z₁ + h_pump = z₂ + h_f   ⟹   h_pump = 120 + 330 = 450 ft'),
    P('**Step 4: power:**'),
    EQ('P = γQh_pump/η = 62.4(3)(450)/0.75 = 112 000 ft·lbf/s ÷ 550 = 204 hp'),
    H3('Takeaway'), P('Pump head = static lift + all losses. Divide by efficiency to get shaft power. Remember 1 hp = 550 ft·lbf/s. Friction (330 ft) dominates the 120-ft lift here, which is why pipe diameter matters so much.'),
  ],
};

// ---------- assemble ----------
const sections = [];
const coverRows = [['#', 'Problem', 'Topic', 'Answer (self-check)']].concat(probs.map((p, i) => [String(i + 1), p.id, p.ch, p.ans]));
sections.push({ properties: { page: PAGE }, headers: { default: paperHeader() }, children: [whiteBox([
  new Paragraph({ children: [new TextRun({ text: 'ME 231 Fluid Mechanics · Test #2 (Mon 11/9)', font: FONT, size: 26, bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
  new Paragraph({ children: [new TextRun({ text: 'Textbook Practice Set', font: FONT, size: 44, bold: true, color: '1F3864' })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
  new Paragraph({ children: [new TextRun({ text: 'White & Xue, Fluid Mechanics 9th ed. · Ch 3 (Bernoulli), 4, 5, 6', font: FONT, size: 22 })], alignment: AlignmentType.CENTER, spacing: { after: 160 } }),
  P('These problems are **not** your assigned homework. They sit next to your HW problems in the book and test the same skills. Work each one on its engineering-paper page using Given / Find / Solution, then check the step-by-step solutions at the back.'),
  table(coverRows, [500, 1100, 3600, 3688]),
  P(''),
  P('_Properties are from White Table A.3 at 20 °C (water ρ = 998 kg/m³, μ = 1.00×10⁻³ kg/(m·s)). All answers were checked numerically (solve2.py)._', { size: 18 }),
])] });
probs.forEach((p) => {
  sections.push({ properties: { page: PAGE }, headers: { default: paperHeader() }, children: [whiteBox([
    new Paragraph({ children: [new TextRun({ text: `${p.id} · ${p.ch} · Test #2 practice`, font: FONT, size: 20, bold: true, color: '1F3864' })], spacing: { after: 40 } }),
    crop(p.id),
  ])] });
});
const sol = [H1('Step-by-step solutions')];
probs.forEach((p, i) => {
  if (i > 0) sol.push(BR());
  sol.push(H2(`${p.id} · ${p.ch}`), P(`**Concept:** ${p.concept}.`), ...S[p.id], P(`**Answer:** ${p.ans}`));
});
sections.push({ properties: { page: PAGE }, headers: { default: plainHeader() }, children: sol });

const doc = new Document({
  creator: 'Mario', title: 'ME231 Test 2 Textbook Practice',
  styles: { default: { document: { run: { font: FONT, size: 22 } } } },
  numbering: { config: [
    { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
    { reference: 'num2', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
  ] },
  sections,
});
const out = path.join(__dirname, 'ME231 Test 2 Textbook Practice.docx');
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(out, b); console.log('wrote', out); });
