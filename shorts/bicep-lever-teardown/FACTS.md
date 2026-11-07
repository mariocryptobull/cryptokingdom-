# Your bicep is a lever: facts and sources

Numbers are for a representative adult arm. The model is schematic (bones as beams, biceps as an actuator); forearm and hand weight are ignored in the torque balance.

| Claim in script | Value used | Source(s) | Notes |
|---|---|---|---|
| Elbow flexion with the biceps is a third-class lever (pivot, effort, load) | — | OpenOregon *Body Physics* 2e, "Body Levers" (openoregon.pressbooks.pub/bodyphysics2ed/chapter/body-levers); vcalc "Simple machines: the lever" | Effort (biceps insertion) sits between the pivot (elbow) and the load (hand). |
| Biceps tendon anchors a few cm from the elbow | 4 cm | *Body Physics* worked example: biceps ~1.5 in (3.8 cm) from the elbow, load 13 in out; vcalc: "a few cm" | Peak biceps flexion moment arm in cadaver/MRI studies is on the order of 3.5–4.5 cm and varies between people (Murray, Delp & Buchanan, *J Biomech* 1995 28:513 and 2002 35:19; Pigeon et al. via *J Appl Biomech* 2012 28:63). |
| Dumbbell ~35 cm from the elbow | 35 cm | Forearm (elbow–wrist) mean 26.7 cm men / 24.0 cm women (US anthropometric survey, 2012); Hamadan study 27.8 cm men; plus ~8–9 cm wrist → centre of grip | Elbow-to-centre-of-grip is listed in NCSU / USMC anthropometry tables; 34–37 cm is a reasonable adult value. |
| 10 kg weighs ~98 N | 10 × 9.81 = 98.1 N | Definition (g = 9.81 m/s²) | |
| Load torque at 90° = 34 N·m | 98.1 N × 0.35 m = 34.3 N·m | Statics | |
| Biceps must pull ~860 N, ~9× the weight | 34.3 N·m ÷ 0.04 m = 858 N; ratio 8.75 | Statics with the values above | |
| Real arms run ~7–10× | — | vcalc lever page: "about ten times" (30 cm vs a few cm); worked example of 10 kg needing ~70 kg biceps force (≈7×) | Range, not a single measured value; depends on insertion distance, grip distance and angle. Brachialis and brachioradialis share the load in a real arm; the short treats the biceps as the single flexor. |
| 1 cm of muscle shortening ≈ 9 cm of hand travel | Δθ = 1 cm / 4 cm = 0.25 rad (14°); hand arc = 35 cm × 0.25 = 8.75 cm | Lever kinematics (same ratio as the force ratio) | The on-screen counters are computed from the model geometry. |
| Load torque is near zero with the arm hanging, maximum at 90°, falls again past it | τ = W·L·sin θ | Statics | "Sticking point" here means the angle of peak load torque for a standing curl. |
| Live biceps force through the curl | moment arm r(θ) = 4.0 − 2.5·((θ−95°)/95°)² cm | Smooth curve through typical values: ~1.5–2 cm near full extension, peak ~4 cm around 90–100° (Murray et al. 1995: flexion moment arms vary ≥30% over the range) | Illustrative fit, not one subject's data. Ratio stays ~7–9× over the working range (45°–135°). |
