# Hydraulic press: facts and sources

Direct page fetches are blocked on this network; figures come from search-result text of the pages below. Numbers in the worked example are derived from the cited ratings (arithmetic shown).

| Claim in script | Source(s) | Notes |
|---|---|---|
| Parts: frame, hand pump with small piston (plunger), reservoir, check valves, main cylinder/ram, release valve, gauge | Tameson "Learn How Hydraulic Jacks Work"; US patent 11952248 (hydraulic jack, release valve drains oil to reservoir); press explainers (Kintek FAQ) | Schematic model, not a specific product, no brands. |
| Handle up: piston draws oil from reservoir through a check valve; handle down: oil forced out through a second check valve; it can't flow back to the pump | Tameson; Kintek "How does a hydraulic press work" ("check valve prevents fluid return from the ram cylinder to the plunger cylinder") | |
| Pascal's law: pressure in a confined fluid is transmitted equally; F = P × A | Standard physics (Pascal's principle); Kintek/Tameson explainers | |
| Hand pump rated 10,000 psi; second-stage displacement 0.151 in³ per stroke; piston stroke 1 in; max handle effort 93 lb | Enerpac P-392 listings: RS Online 2831250, Alaska Rubber Group, IMTEK (2.47 cm³ / 42.2 kg) | 0.151 in³ ÷ 1 in = **0.15 in² effective piston area → ⌀ ≈ 0.44 in ≈ 7/16 in** (derived). |
| "90-lb pull → 1,500 lb on the small piston" | 0.151 in² × 10,000 psi = 1,510 lbf; handle effort 93 lb ⇒ lever ratio ≈ 16:1 | Rounded to 90 lb / 1,500 lb in VO. |
| Ram area 4 in², ⌀ ≈ 2¼ in for 20 tons at 10,000 psi | 20 short tons = 40,000 lbf; 40,000 ÷ 10,000 psi = 4.0 in² → ⌀ = 2.26 in (derived). Real 20 t cylinders at 10,000 psi: Enerpac RCS-201 lists 4.43 in² (RS Online); 20 t 10,000 psi cylinders (VEVOR listing) | Hydraulic shop tools are commonly rated 10,000 psi (700 bar). |
| 26× the area | 4.0 ÷ 0.151 = 26.5 | |
| ~1 mm of ram travel per stroke | 0.151 in³ ÷ 4.0 in² = 0.038 in = 0.96 mm | Same energy in and out (minus losses): 26× force, 1/26 travel. |
| Gauge shows pressure; release valve returns oil to the reservoir | US patent 11952248; Kintek | |
| Empty aluminum can buckles at about 200 lb | US patent 12384590 (900 N ≈ 200 lb axial load target); US patent 4290354 ("an all aluminum can will support 210 pounds before collapsing"); MDPI Materials 2023 axial-load study | Readout peaks at ~205 lb; the post-buckle trace (drop while folding, rise when flat) is illustrative of typical axial-crush behaviour, not a measurement. |
| Half a percent of the press | 200 ÷ 40,000 = 0.5 %; ~50 psi in the oil (200 lb ÷ 4 in²) | |
