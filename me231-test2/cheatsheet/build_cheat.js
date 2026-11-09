// Builds "ME231 Test 2 Formula Sheet.docx": 3-page, 2-column formula sheet for Lectures 12-20 (White Ch 3 Bernoulli, 4, 5, 6).
const L = require('../lib.js');
const { fs, path, runs, Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat } = L;
const { Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, PageBreak, ColumnBreak } = require('docx');

const FONT = 'Times New Roman', MATH = 'Cambria Math';
const SZ = 23;
const COLW = 5310;          // column width (DXA)
const thin = { style: BorderStyle.SINGLE, size: 2, color: 'A6A6A6' };

const H = (t) => new Paragraph({ children: [new TextRun({ text: t, font: FONT, bold: true, size: 21, color: 'FFFFFF' })], shading: { type: ShadingType.CLEAR, fill: '1F3864', color: 'auto' }, spacing: { before: 70, after: 30 }, keepNext: true });
const S = (t) => new Paragraph({ children: [new TextRun({ text: t, font: FONT, bold: true, size: 20, color: '1F3864' })], spacing: { before: 45, after: 10 }, keepNext: true });
const T = (t) => new Paragraph({ children: runs(t, { size: SZ }), spacing: { after: 15, line: 228 } });
const E = (t) => new Paragraph({ children: [new TextRun({ text: t, font: MATH, size: SZ })], spacing: { before: 8, after: 14, line: 228 }, indent: { left: 120 } });
const Bu = (t) => new Paragraph({ children: runs(t, { size: SZ }), numbering: { reference: 'b', level: 0 }, spacing: { after: 8, line: 222 } });
function tbl(rows, fr, head = true) {
  const tot = fr.reduce((a, b) => a + b, 0); const w = fr.map((f) => Math.round(COLW * f / tot));
  w[w.length - 1] += COLW - w.reduce((a, b) => a + b, 0);
  return new Table({ width: { size: COLW, type: WidthType.DXA }, columnWidths: w, rows: rows.map((r, i) => new TableRow({ children: r.map((c, j) => new TableCell({
    width: { size: w[j], type: WidthType.DXA }, margins: { top: 10, bottom: 10, left: 50, right: 50 },
    shading: head && i === 0 ? { type: ShadingType.CLEAR, fill: 'D9E2F3', color: 'auto' } : undefined,
    borders: { top: thin, bottom: thin, left: thin, right: thin },
    children: [new Paragraph({ children: runs(c, { size: 21, bold: head && i === 0 }), spacing: { after: 0, line: 216 } })] })) })) });
}
const gap = () => new Paragraph({ children: [], spacing: { after: 30 } });

const C = [
  new Paragraph({ children: [new TextRun({ text: 'ME 231 Test #2 Formula Sheet', font: FONT, bold: true, size: 26, color: '1F3864' }), new TextRun({ text: '  ·  Lectures 12–20 · White 9th ed. Ch 4, Ch 3 (Bernoulli), Ch 5, Ch 6', font: FONT, size: 16 })], spacing: { after: 40 } }),

  // ===== Ch 4 =====
  H('1 · KINEMATICS (Ch 4, L12)'),
  S('Acceleration (material derivative)'),
  E('a = DV/Dt = ∂V/∂t + u ∂V/∂x + v ∂V/∂y + w ∂V/∂z'),
  E('a_x = ∂u/∂t + u ∂u/∂x + v ∂u/∂y + w ∂u/∂z  (same for a_y with v, a_z with w)'),
  T('Local term = ∂/∂t (0 if steady). Convective terms ≠ 0 in steady flow if V varies in space.'),
  T('Component of V or a in direction θ: dot with n = (cos θ, sin θ). Direction of a vector: θ = atan2(y-comp, x-comp).'),
  S('Continuity'),
  E('∂ρ/∂t + ∇·(ρV) = 0'),
  E('Incompressible:  ∂u/∂x + ∂v/∂y + ∂w/∂z = 0'),
  E('Cylindrical:  (1/r)∂(r v_r)/∂r + (1/r)∂v_θ/∂θ + ∂v_z/∂z = 0'),
  T('Given u, find v: v = −∫(∂u/∂x)dy + f(x); fix f with a BC (e.g., v = 0 at wall/axis).'),
  S('Stream function ψ (2-D, incompressible)'),
  E('u = ∂ψ/∂y,   v = −∂ψ/∂x        v_r = (1/r)∂ψ/∂θ,   v_θ = −∂ψ/∂r'),
  T('Exists iff continuity holds. ψ = const along streamlines. q (per depth) = ψ₂ − ψ₁. Solve: ψ = ∫u dy + f(x), then match v.'),
  S('Vorticity, irrotationality, potential φ'),
  E('ω = ∇×V;   ω_z = ∂v/∂x − ∂u/∂y        (polar: ω_z = (1/r)∂(r v_θ)/∂r − (1/r)∂v_r/∂θ)'),
  E('Irrotational (ω = 0) ⟺ V = ∇φ:  u = ∂φ/∂x,  v = ∂φ/∂y;   v_r = ∂φ/∂r,  v_θ = (1/r)∂φ/∂θ'),
  T('Incompressible + irrotational ⇒ ∇²φ = 0 and ∇²ψ = 0; φ-lines ⟂ ψ-lines. Rotational ⇒ no φ (ψ may still exist).'),
  E('∇²f = ∂²f/∂x² + ∂²f/∂y²        polar: (1/r)∂/∂r(r ∂f/∂r) + (1/r²)∂²f/∂θ²'),

  H('2 · MOMENTUM: NAVIER–STOKES & EULER (L13–14)'),
  E('ρ DV/Dt = ρg − ∇p + μ∇²V     (incompressible, constant μ)'),
  E('x: ρ(∂u/∂t + u∂u/∂x + v∂u/∂y + w∂u/∂z) = −∂p/∂x + ρg_x + μ(∂²u/∂x² + ∂²u/∂y² + ∂²u/∂z²)'),
  E('y: ρ(∂v/∂t + u∂v/∂x + v∂v/∂y + w∂v/∂z) = −∂p/∂y + ρg_y + μ(∂²v/∂x² + ∂²v/∂y² + ∂²v/∂z²)'),
  E('z: ρ(∂w/∂t + u∂w/∂x + v∂w/∂y + w∂w/∂z) = −∂p/∂z + ρg_z + μ(∂²w/∂x² + ∂²w/∂y² + ∂²w/∂z²)'),
  E('Pipe (cyl., axial v_z(r)):  0 = −dp/dz + ρg_z + μ (1/r) d/dr( r dv_z/dr )'),
  E('Euler (μ = 0):  ρ DV/Dt = ρg − ∇p      If ∇²V = 0 viscous term vanishes even with μ ≠ 0'),
  T('Gravity: g = −g k̂ if z up ⇒ ρg_z = −ρg. Inclined axis at angle θ: g_x = g sin θ (downslope). Pressure field: integrate ∂p/∂x, ∂p/∂y, ∂p/∂z and match the "+f(…)" terms.'),
  S('Exact-solution recipe (show every step for partial credit)'),
  Bu('Assume: steady, incompressible, laminar, fully developed (∂/∂x = 0), parallel (v = w = 0).'),
  Bu('Continuity ⇒ u = u(y). Write full Navier–Stokes, cross out terms **with reasons**.'),
  Bu('Integrate twice → C₁, C₂ from BCs → u(y); then q = ∫u dy, V = q/gap, τ = μ du/dy.'),
  T('**BCs:** no-slip (u = wall speed) · free surface τ = μ du/dy = 0 · symmetry du/dy = 0 · finite u at r = 0 (kills ln r).'),
  S('Standard results'),
  tbl([
    ['Flow', 'Profile', 'Results'],
    ['Couette, plate y=h at U', 'u = Uy/h', 'τ = μU/h const; q = Uh/2'],
    ['Plates y = ±h, fixed', 'u = (−dp/dx)(h²−y²)/(2μ)', 'u_max = (−dp/dx)h²/2μ; V = ⅔u_max; q = 2h³(−dp/dx)/(3μ); τ_w = (−dp/dx)h'],
    ['Couette–Poiseuille, gap h (0→h), top at U', 'u = Uy/h + (dp/dx)(y²−hy)/(2μ)', 'q = Uh/2 − (dp/dx)h³/(12μ); q = 0 when dp/dx = 6μU/h²'],
    ['Film, thickness h, incline θ', 'u = (ρg sinθ/2μ)(2hy − y²)', 'u_surf = ρg sinθ h²/2μ; q = ρg sinθ h³/(3μ)'],
    ['Pipe radius R (Hagen–Poiseuille)', 'u = (−dp/dx)(R²−r²)/(4μ)', 'V = ½u_max; Q = πR⁴(−dp/dx)/(8μ) = πD⁴Δp/(128μL); τ_w = (−dp/dx)R/2'],
  ], [2.2, 2.6, 3.6]),
  T('Inclined/vertical channels: replace p with p + ρgz (piezometric) — i.e., −dp/dx → −d(p + ρgz)/dx.'),

  // ===== Bernoulli =====
  H('3 · BERNOULLI & ENERGY (Ch 3, L15)'),
  E('p₁/ρg + V₁²/2g + z₁ = p₂/ρg + V₂²/2g + z₂     (= H, total head)'),
  T('**Valid:** steady · incompressible · frictionless · along one streamline (any two points if irrotational) · no pump/turbine/heat between points.'),
  T('**Pick points** where p and V are known: free surface (p_atm, V≈0 if large tank), free jet (p = p_atm across jet), stagnation point (V = 0). **Continuity:** V₁A₁ = V₂A₂.'),
  tbl([
    ['Situation', 'Result'],
    ['Torricelli / draining tank', 'V = √(2gh)   (Q = C_d A √(2gh))'],
    ['Stagnation pressure', 'p₀ = p + ½ρV²'],
    ['Pitot-static', 'V = √(2(p₀ − p)/ρ)'],
    ['Venturi / nozzle meter, β = d/D', 'Q = A_t √(2Δp / (ρ(1 − β⁴)));  real: × C_d'],
    ['Jet height (vertical, V=0 at top)', 'H = p_tank/γ + z_surface   (from Bernoulli)'],
    ['Siphon top (point A)', 'p_A = p_atm − ρg(z_A − z_exit);  need p_A,abs ≥ p_v'],
    ['Unsteady Bernoulli', '∫∂V/∂t ds + Δ(p/ρ + V²/2 + gz) = 0'],
  ], [3, 5.2]),
  S('Manometers'),
  E('Same fluid in legs:  (p₁ + γz₁) − (p₂ + γz₂) = (γ_m − γ) h'),
  T('Horizontal ⇒ p₁ − p₂ = (ρ_m − ρ)gh. Inclined pipe: manometer reads **piezometric** difference = h_f for constant-area pipe. Gas flowing: ρ ≪ ρ_m but write (ρ_m − ρ). Ideal gas: ρ = p/(RT), p absolute, T in K.'),
  S('Steady-flow energy equation (with losses & machines)'),
  E('p₁/γ + α₁V₁²/2g + z₁ + h_pump = p₂/γ + α₂V₂²/2g + z₂ + h_turb + h_f + Σh_m'),
  T('α ≈ 1 turbulent, α = 2 laminar. HGL = p/γ + z; EGL = HGL + V²/2g. EGL drops by h_f, jumps by h_p at pump.'),
  E('Pump power P = γQh_p/η_p     Turbine P = η_t γQh_t     1 hp = 745.7 W = 550 ft·lbf/s'),
  T('Cavitation: p_abs < p_v (water 20 °C: 2.34 kPa). Cavitation no. Ca = (p∞ − p_v)/(½ρV²).'),

  // ===== Ch 5 =====
  H('4 · DIMENSIONAL ANALYSIS (Ch 5, L15–17)'),
  T('**Pi theorem:** n variables, j dimensions (rank of dimensional matrix, usually 3: M, L, T) ⇒ **k = n − j** groups.'),
  Bu('List all n variables (dependent first) with dimensions.'),
  Bu('Pick j **repeating variables**: together contain M, L, T; can\'t form a Π alone; exclude the dependent variable. Usual: ρ, V (or Ω), D (or L). Gravity problems: ρ, g, D.'),
  Bu('Π = (var)·ρᵃVᵇDᶜ → exponent eqns for M, L, T. Check each Π is dimensionless; rearrange to named groups (inverting/multiplying Πs is allowed).'),
  tbl([
    ['Quantity', 'Dims', 'Quantity', 'Dims'],
    ['Force F', 'MLT⁻²', 'Viscosity μ', 'ML⁻¹T⁻¹'],
    ['Pressure, stress, Δp', 'ML⁻¹T⁻²', 'Kin. viscosity ν', 'L²T⁻¹'],
    ['Δp/L (gradient)', 'ML⁻²T⁻²', 'Surface tension Υ', 'MT⁻²'],
    ['Energy, work, torque M', 'ML²T⁻²', 'Flow rate Q', 'L³T⁻¹'],
    ['Power P', 'ML²T⁻³', 'Mass flow ṁ', 'MT⁻¹'],
    ['Density ρ', 'ML⁻³', 'Ω, ω, frequency', 'T⁻¹'],
    ['Specific weight γ', 'ML⁻²T⁻²', 'Acceleration a, g', 'LT⁻²'],
    ['Speed of sound a', 'LT⁻¹', 'Elastic modulus E', 'ML⁻¹T⁻²'],
  ], [2.6, 1.6, 2.6, 1.6]),
  gap(),
  tbl([
    ['Group', 'Definition', 'Ratio / when it matters'],
    ['Reynolds', 'Re = ρVL/μ = VL/ν', 'inertia/viscous: pipes, submerged bodies'],
    ['Froude', 'Fr = V/√(gL)', 'inertia/gravity: free surface, ships, weirs'],
    ['Euler / C_p', 'Eu = Δp/(ρV²); C_p = Δp/(½ρV²)', 'pressure/inertia'],
    ['Cavitation', 'Ca = (p − p_v)/(½ρV²)', 'cavitation onset'],
    ['Mach', 'Ma = V/a', 'compressibility (Ma > 0.3)'],
    ['Weber', 'We = ρV²L/Υ', 'surface tension'],
    ['Strouhal', 'St = fL/V', 'oscillation / shedding'],
    ['Force coeff.', 'C_F = F/(½ρV²A) or F/(ρV²L²)', 'drag, lift, thrust'],
    ['Moment coeff.', 'C_M = M/(ρV²L³)', 'torque, pitching moment'],
    ['Roughness', 'ε/L', 'part of geometric similarity'],
  ], [1.7, 3.4, 3.3]),
  S('Similarity & scaling (L_r = L_m/L_p)'),
  T('Geometric (shapes, ε/L) + kinematic (V ratios) + dynamic (all relevant Πs equal). Can\'t match Re and Fr with same fluid → match the dominant one.'),
  E('Re match: V_m = V_p (ν_m/ν_p)(L_p/L_m)        Fr match: V_m = V_p √L_r'),
  E('Fr scaling: V ∝ L^½,  t ∝ L^½,  Q ∝ L⁵ᐟ²,  F ∝ ρL³,  P ∝ ρL⁷ᐟ²'),
  E('Forces: F_p/F_m = (ρ_p/ρ_m)(V_p/V_m)²(L_p/L_m)²     Moments: × L ratio     Power: P = F·V'),
  E('Same Ma: V_p/V_m = a_p/a_m;  a = √(kRT)  (air k = 1.4, R = 287 J/kg·K)'),
  E('Pumps/fans/turbines: C_Q = Q/(nD³), C_H = gH/(n²D²), C_P = P/(ρn³D⁵)  ⇒ Q ∝ nD³, P ∝ ρn³D⁵'),
  T('"Re effects negligible" (high Re) ⇒ drop the Re group: C_F const. Data reduction: plot C_F vs Re, read off at prototype Re.'),

  // ===== Ch 6 =====
  H('5 · VISCOUS PIPE FLOW (Ch 6, L17–20)'),
  E('Re_D = ρVD/μ = VD/ν = 4ρQ/(πμD):  laminar < 2300 · transition 2300–4000 · turbulent > 4000'),
  E('Entrance length:  L_e/D ≈ 0.06 Re (lam.)     L_e/D ≈ 4.4 Re¹ᐟ⁶ (turb.)'),
  E('Darcy–Weisbach:  h_f = f (L/D)(V²/2g)      Δp = ρg h_f (horizontal, const D)'),
  E('Wall shear:  τ_w = f ρV²/8    force balance:  Δp = 4τ_w L/D   ( = 2τ_w L/R )'),
  E('h_f = (Δp/γ) + Δz   (const-area pipe, flow uphill: Δz = z₂ − z₁)'),
  S('Laminar (any roughness)'),
  E('f = 64/Re     h_f = 32μLV/(ρgD²)     Q = πD⁴Δp/(128μL)     Δp ∝ Q'),
  S('Turbulent'),
  E('Colebrook:  1/√f = −2.0 log₁₀[ (ε/D)/3.7 + 2.51/(Re√f) ]'),
  E('Haaland (explicit, ±2%):  1/√f ≈ −1.8 log₁₀[ ((ε/D)/3.7)^1.11 + 6.9/Re ]'),
  E('Smooth (ε = 0):  1/√f = 2.0 log₁₀(Re√f) − 0.8        Fully rough:  1/√f = −2.0 log₁₀(ε/3.7D)'),
  E('Velocity profile (approx.):  u/u_max ≈ (1 − r/R)¹ᐟ⁷;   V ≈ 0.82 u_max;   u* = √(τ_w/ρ)'),
  S('Roughness ε (White Table 6.1)'),
  tbl([
    ['Material', 'ε (mm)', 'ε (ft)'],
    ['Glass, drawn tubing', '0.0015', '5×10⁻⁶'],
    ['Plastic / PVC', '≈ 0 (smooth)', '≈ 0'],
    ['Commercial steel, wrought iron', '0.046', '0.00015'],
    ['Asphalted cast iron', '0.12', '0.0004'],
    ['Galvanized iron', '0.15', '0.0005'],
    ['Cast iron', '0.26', '0.00085'],
    ['Wood stave', '0.18–0.9', '0.0006–0.003'],
    ['Concrete', '0.3–3.0', '0.001–0.01'],
    ['Riveted steel', '0.9–9.0', '0.003–0.03'],
  ], [3.6, 1.8, 1.8]),
  S('Minor losses  h_m = K V²/2g  (V in the smaller pipe)'),
  tbl([
    ['Fitting', 'K', 'Fitting', 'K'],
    ['Sharp-edged entrance', '0.5', 'Submerged exit', '1.0'],
    ['Well-rounded entrance', '≈ 0.04', 'Re-entrant inlet', '≈ 1.0'],
    ['Sudden expansion d→D', '(1 − d²/D²)²', 'Sudden contraction', '≈ 0.42(1 − d²/D²)'],
    ['90° elbow (flanged)', '≈ 0.3', '90° elbow (screwed)', '≈ 0.9–1.5'],
    ['Gate valve, open', '≈ 0.15–0.2', 'Globe valve, open', '≈ 6–10'],
  ], [2.8, 1.5, 2.6, 1.9]),
  T('Equivalent length: L_eq = KD/f. **Free-jet exit:** no exit loss — the jet keeps its V²/2g (count it once). **Reservoir exit:** K = 1 absorbs V²/2g.'),
  S('Problem types'),
  Bu('**Type 1 (find h_f, Δp):** V = 4Q/πD² → Re, ε/D → f → h_f → energy eq. Direct.'),
  Bu('**Type 2 (find Q):** guess f = fully rough value → V = √(2gh_fD/(fL)) → Re → new f → repeat (2–3 passes). **Direct:** Re√f = √(2gh_fD³/(Lν²)) → f from Colebrook in one step → Re = (Re√f)/√f.'),
  Bu('**Type 3 (find D):** h_f = 8fLQ²/(π²gD⁵) → guess f, solve D, compute Re & ε/D, update f; round D up.'),
  Bu('**Systems:** z₁ − z₂ (+ h_p) = (V²/2g)(fL/D + ΣK [+ 1 if free jet]). Pump to raise Q: h ∝ V², so 2Q needs ≈ 4× head.'),
  Bu('**Allowable material:** compute f_max = h_f(D/L)(2g/V²) at required Q → ε_max from Colebrook → compare to table.'),
  S('Non-circular ducts'),
  E('D_h = 4A/P_wetted:  annulus D_h = D_o − D_i;  wide plates gap 2h → D_h = 4h;  square a → D_h = a'),
  T('Use D_h in Re, ε/D, h_f (turbulent ≈ OK). Laminar f·Re depends on shape (plates: 96/Re_Dh).'),

  // ===== Data =====
  H('6 · PROPERTIES & CONSTANTS (20 °C, 1 atm, White Table A.3)'),
  tbl([
    ['Fluid', 'ρ (kg/m³)', 'μ (kg/m·s)', 'ν (m²/s)'],
    ['Water', '998', '1.00×10⁻³', '1.00×10⁻⁶'],
    ['Seawater', '1025', '1.07×10⁻³', '1.04×10⁻⁶'],
    ['Air', '1.205', '1.80×10⁻⁵', '1.50×10⁻⁵'],
    ['Mercury', '13 550', '1.56×10⁻³', '1.15×10⁻⁷'],
    ['Gasoline', '680', '2.92×10⁻⁴', '4.29×10⁻⁷'],
    ['Kerosene', '804', '1.92×10⁻³', '2.39×10⁻⁶'],
    ['Ethyl alcohol', '789', '1.20×10⁻³', '1.52×10⁻⁶'],
    ['SAE 10W oil', '870', '1.04×10⁻¹', '1.20×10⁻⁴'],
    ['SAE 30 oil', '891', '0.29', '3.25×10⁻⁴'],
    ['SAE 50W oil', '902', '0.86', '9.53×10⁻⁴'],
    ['Glycerin', '1260', '1.49', '1.18×10⁻³'],
  ], [2.4, 1.7, 2.0, 2.0]),
  gap(),
  tbl([
    ['Constant / conversion', 'Value'],
    ['g', '9.81 m/s² = 32.2 ft/s²'],
    ['p_atm (sea level)', '101.35 kPa = 14.7 lbf/in² = 2116 lbf/ft²'],
    ['γ_water', '9790 N/m³ = 62.4 lbf/ft³'],
    ['Water (BG)', 'ρ = 1.94 slug/ft³, μ = 2.09×10⁻⁵ slug/ft·s'],
    ['p_v water 20 °C', '2.337 kPa'],
    ['Gas constants R', 'air 287, CO₂ 189, N₂ 297, He 2077 J/kg·K'],
    ['Length / volume', '1 ft = 0.3048 m; 1 in = 2.54 cm; 1 ft³ = 0.02832 m³ = 7.48 gal; 1 L = 10⁻³ m³'],
    ['Pressure', '1 lbf/in² = 6895 Pa; 1 lbf/ft² = 47.88 Pa'],
    ['Speed', '1 mi/h = 0.447 m/s = 1.467 ft/s'],
    ['Power', '1 hp = 745.7 W = 550 ft·lbf/s'],
    ['Viscosity', '1 cP = 10⁻³ Pa·s;  1 slug/ft·s = 47.88 Pa·s'],
  ], [2.6, 5.6]),
  H('7 · CHECKLIST — WHERE POINTS GET LOST'),
  Bu('Bernoulli across a pump, through friction, or between streamlines in rotational flow.'),
  Bu('Forgot continuity (V changes with A). Gage vs absolute (cavitation, ideal gas need absolute).'),
  Bu('Manometer: (ρ_m − ρ)gh, not ρ_m gh. Inclined pipe: manometer = h_f, not Δp/γ.'),
  Bu('f = 64/Re only if Re < 2300. Check Re **after** every answer.'),
  Bu('Counting exit V²/2g twice (free jet + K = 1). ρ in Δp = ρgh_f is the **flowing** fluid.'),
  Bu('Dependent variable chosen as repeating variable. Πs not checked dimensionless.'),
  Bu('q (per width, m²/s) vs Q (m³/s). Units: μ in kg/(m·s); BG: slug, lbf, ft.'),
];

const doc = new Document({
  creator: 'Mario', title: 'ME231 Test 2 Formula Sheet',
  styles: { default: { document: { run: { font: FONT, size: SZ } } } },
  numbering: { config: [{ reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 200, hanging: 140 } } } }] }] },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 540, bottom: 540, left: 540, right: 540 } }, column: { space: 540, count: 2, separate: true } }, children: C }],
});
const out = path.join(__dirname, 'ME231 Test 2 Formula Sheet.docx');
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(out, b); console.log('wrote', out); });
