# How air flows through a vent: facts and sources

Facts come from search-result text of the pages below (direct page fetches are restricted on this network). Numbers are typical residential values, not one specific house.

| Claim in script / on screen | Source(s) | Notes |
|---|---|---|
| Blower builds a pressure difference of about half an inch of water (≈125 Pa) | AHRI/LBNL residential furnace blower research ("realistic system static pressures of between 0.5 and 0.8 in. water (125 and 200 Pa)"); unitedhvacmotors.com "What is the ideal static pressure"; achrnews.com "Performing residential A/C airflow setup" | Most residential furnaces/air handlers are rated at 0.5 in. w.c. total external static pressure; field average is higher (~0.8). 125 Pa ÷ 101,325 Pa ≈ 0.12 % → "about 0.1 % of air pressure". |
| Main supply duct ≈ 900 ft/min | ACCA Manual D velocity guidance as quoted by open-exam-prep.com (NATE study guide: 700–900 FPM residential supply trunks), aircondlounge.com "Duct velocity" (supply max 900 FPM), Manual D velocity table (rigid trunks 700–900, max 1,000) | Upper end of the recommended trunk range. |
| Branch ducts ≈ 600 ft/min | open-exam-prep.com Manual D guides (supply branches 500–600 FPM; 600 FPM max) | |
| Narrower duct → faster; wider → slower, pressure recovers (A₁v₁ = A₂v₂; p + ½ρv² ≈ const) | Continuity equation and Bernoulli's principle (standard fluid mechanics) | Model throat is exaggerated (≈1.7× speed-up) to make the effect visible; real reducers are gentler. |
| Friction and fittings (elbows) cost pressure | ACCA Manual D equal-friction method (friction rate, equivalent length of fittings) via open-exam-prep.com | |
| Diffuser vanes turn the jet sideways along the ceiling | Krueger / Conklin ceiling-diffuser performance data (scribd, conklinmetal.com 800 Performance Data Sheet); open-exam-prep.com "Air distribution: throw, spread, drop" | Square cone diffuser with nested angled vanes, schematic. |
| Coandă effect: a low-pressure region forms between the jet and the ceiling, holding the jet against it | HVAC training material (NEBB basics, "Air Distribution Basics", vectree "ceiling airflow dynamics"): "low-pressure region … between the mass airflow and the ceiling" | Sources cite ~25–30 % longer throw with a ceiling present; not used on screen. |
| Turbulent mixing slows the jet; throw is designed to the point where it slows to 50 ft/min | Krueger training slide ("occupied-zone velocities ≤ 50 FPM"); open-exam-prep.com (throw to 50 FPM terminal velocity = edge of occupied zone) | |
| Gentle draft under 40 ft/min where you are | ASHRAE Standard 55 addenda (55-2013b, 55-2017d): still-air / draft threshold 0.20 m/s = 40 fpm | |
| Warm air rises, cool air sinks | Buoyancy (density falls as air warms); catalog throw data note cooling throw is shorter than isothermal (cold jet drops) | Speed colour in the video is speed only, not temperature. |

Sources (URLs):
- https://www.ahrinet.org/sites/default/files/2022-10/manual%20D%20calculation.pdf
- https://aircondlounge.com/duct-velocity
- https://open-exam-prep.com/study-guides/nate-hvac/comfort-airflow-psychrometrics/ductwork-design-blower-curves
- https://open-exam-prep.com/study-guides/ca-hvac-contractor/hvac-planning-load-calcs/duct-design-manual-d
- https://open-exam-prep.com/study-guides/mi-hvac-contractor/duct-design-air-distribution/air-distribution-registers-balancing
- https://www.conklinmetal.com/wp-content/uploads/2023/11/800-Performance-Data-Sheet.pdf
- https://www.scribd.com/document/513580673/Air-Distribution-Basics
- https://vectree.io/c/ceiling-airflow-dynamics
- https://www.ashrae.org/file%20library/technical%20resources/standards%20and%20guidelines/standards%20addenda/55_2013_b_20141209.pdf
- https://www.unitedhvacmotors.com/blogs/hvac-technical/what-is-the-ideal-static-pressure-in-hvac-systems
- https://achrnews.com/articles/92760-performing-residential-a-c-airflow-setup
