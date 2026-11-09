# How a pedal moves a car: facts and sources

Direct page fetches are blocked on this network; facts come from search-result text of the pages below. The brake numbers are one worked example (a hard stop) built from typical published values, not one specific car.

| Claim in script / on screen | Source(s) | Notes |
|---|---|---|
| Gas pedal has no cable (drive-by-wire); two redundant pedal sensors read pedal position and send it to the ECU | automotivetechinfo.com "Throttle by Wire" (PDF); Haltech KB "Drive By Wire"; HP Academy forum "drive by wire throttle body TPS main and sub" | APP sensors are dual/redundant so the ECU can cross-check them; mismatch → failsafe. Most modern cars; some older cars still use a cable. |
| ECU commands a small DC motor that opens the electronic throttle | Same as above: "electronic throttle body containing a DC motor and dual throttle position sensors"; ECU drives the motor until throttle feedback matches target | |
| Fuel is added at about 14.7 : 1 air : fuel by mass (stoichiometric, gasoline) | Wikipedia "Air–fuel ratio" ("for every one gram of fuel, 14.7 grams of air"); aa1car.com "air/fuel ratios"; HP Tuners "Air-Fuel Ratios, Lambda, and Stoichiometry" | E10 ≈ 14.1, E85 ≈ 9.7; engines run near stoich in normal cruise. |
| Spark pushes the piston down; the crankshaft turns the pushes into rotation | Standard four-stroke engine operation (Wikipedia "Four-stroke engine") | Model shows an inline-4 with firing order 1-3-4-2. |
| Gearbox × differential multiply torque: ~4 : 1 first gear × ~3.5 : 1 final drive ≈ 14 : 1 | cars-data.com glossary "final drive ratio" (final drive = last reduction, in the differential); manual-transmission references: first gear typically ~4 : 1; differential ratios commonly 3–4 : 1 (e.g. 3.30, 3.70, 4.10) | Overall ratio = gear ratio × final drive. 4 × 3.5 = 14. Varies widely by car. Losses ignored. |
| Driveshaft + axles carry torque to the wheels | Standard front-engine rear-drive layout | Schematic model is RWD so the whole path is visible; FWD cars use a transaxle instead. |
| Four contact patches, each about the size of a hand | ISDA Center "The Tire Contact Patch"; Continental Tire "What is a contact patch: your car's footprint"; SimpleTire "Contact patch" | "About the size of your hand" / "typically about the size of an adult hand"; varies with load, pressure, tyre size. |
| Tyre pushes the road backward → car goes forward | Newton's third law (friction at the contact patch) | |
| Brake pedal is a lever, about 4 : 1 (power brakes) | Wilwood flyer FL640 (≈ 6 : 1 manual, ≈ 4 : 1 vacuum/hydro assist); NAPA Know How "How to measure brake pedal ratio"; Tomorrow's Technician (power 4–5 : 1, manual 5–7 : 1) | |
| 100 lb foot × 4 = 400 lb | Tomorrow's Technician / Brake & Front End "Brake math": "1-inch bore … ratio 4:1 … 100 pounds of pedal pressure … 400 pounds" | 100 lb = a hard/panic stop, not everyday braking. |
| Vacuum booster uses engine vacuum and "roughly doubles" the force → 800 lb | TheDrive "What is a brake booster"; Bendix AU "How brake boosters work"; Summit Racing KB (adds ~200–300 lb in many cases) | Sources give ~2–4× assist; we use the low end (×2). Engine-off: assist lost. |
| 1-inch master-cylinder bore → 0.785 in²; 800 lb ÷ 0.785 in² ≈ 1,019 psi ("about 1,000 psi") | Brake & Front End "Brake math" (1-in bore, 0.78 in² area, 434 lb → 556 psi) | Arithmetic: π × 0.5² = 0.785 in². Hard-stop line pressure of ~900–1,200 psi is cited by Classic Performance Products' brake calculator. |
| Pascal's law: pressure is the same throughout the fluid | Standard hydraulics (Pascal's principle) | Line/hose losses ignored. |
| Caliper piston six times bigger: 2.5-in piston = 4.91 in² (6.25× the 0.785 in² bore) | Arithmetic; 2–2.5 in single-piston floating calipers are common on passenger-car front axles (Brake & Front End example uses a 2-in piston) | Illustrative size. |
| ≈ 5,000 lb clamping force per caliper (1,000 psi × 4.9 in² ≈ 4,900 lb) | Underhood Service / Brake & Front End "BRAKE MATH: PSI & Clamping Forces" (clamp force = line pressure × piston area; "100 psi on 4 in² = 400 lb") | "Before losses": caliper flex, pad compression, hose expansion reduce it. |
| Pads squeeze rotors; kinetic energy becomes heat | Standard friction-brake operation | Rotor glow in the video is stylised. |
