# AI data centers and water: facts and sources

Facts come from search-result text of the pages below (direct page fetches are limited on this network). Schematic model, not to scale.

| Claim in script / on screen | Source(s) | Notes |
|---|---|---|
| AI chips run hot; GPU racks are liquid-cooled | NVIDIA blog "Blackwell platform water efficiency / liquid cooling"; NVIDIA DGX GB200 user guide | GB200 NVL72 described as "rack-scale, liquid-cooled". |
| "One rack pulls 120 kilowatts" | NVIDIA DGX GB200 user guide (docs.nvidia.com): "rack power consumption is approximately 120kW"; eeNews Europe "Nvidia offers 120kW liquid cooled Blackwell rack" | Applies to a GB200 NVL72 rack (top-end AI rack). Partner sources quote up to 132 kW. |
| Cold plates on every GPU; coolant in cold, out hot (direct-to-chip) | NVIDIA blog: liquid runs through manifolds, "then through the cold plates that are attached to the CPUs and the GPUs in the tray" | |
| "Air can't keep up" | Same NVIDIA material (liquid cooling needed at ~120 kW/rack); Introl GB200 deployment guide (rack demand exceeds typical facility per-rack ratings) | Framed qualitatively. |
| Warm loop → chiller → rooftop towers; water lost by evaporation (vapour plume) | Microsoft "Sustainable by design" / zero-water datacenter posts (evaporative cooling vs. chip-level closed loop); EESI "Data centers and water consumption" | Standard evaporative-cooling description; schematic layout. |
| WUE = litres per kWh; AWS 0.15 L/kWh (2024) | AWS sustainability page: "global data center WUE of 0.15 liters of water withdrawn per kilowatt-hour of IT load (L/kWh) in 2024" | AWS later reported 0.12 for 2025 (Network World); we use the 2024 figure. |
| Microsoft 0.27 L/kWh (2025) | Microsoft blog, 24 Jun 2026, "Inside Microsoft's two-decade push to cut water intensity": WUE fell from 2.3 to 0.27 L/kWh across its owned fleet in 2025 | Earlier year: 0.30 L/kWh (39% better than 2021). |
| "Power plants drink too… hidden water is 12 times bigger" (US) | Lawrence Berkeley National Laboratory 2024 US Data Center Energy Usage Report, as reported by The Conversation / Civil Beat / Route Fifty: ~17 billion gal (64 bn L) direct in 2023 vs ~211 billion gal (800 bn L) indirect via electricity | 211/17 ≈ 12.4×. US 2023 estimate; ratio depends on grid mix. |
| One prompt ≈ five drops (0.26 mL) | Google Cloud blog "Measuring the environmental impact of AI inference" (Aug 2025) and arXiv 2508.15734: median Gemini Apps text prompt = 0.24 Wh, 0.03 gCO2e, 0.26 mL water | Google's own, not independently verified; on-site water only (critics note it excludes power-plant water; PC Gamer, The Verge). On screen: "on-site water only". |
| Large data center: up to 5 million gallons/day (≈19 million litres) | EESI "Data centers and water consumption": "Large data centers can consume up to 5 million gallons per day, equivalent to the water use of a town populated by 10,000 to 50,000 people" | Upper bound for the largest evaporatively cooled sites. 5M gal × 3.785 = 18.9M L. |
| Fix: closed loops that never evaporate | Microsoft (Aug 2024): new datacenter design "consumes zero water for cooling", chip-level cooling with closed-loop recycling; avoids >125 million litres/yr per datacenter (Microsoft projection) | Trade-off: more mechanical cooling energy (higher PUE), per Microsoft. |
| Fix: dry coolers instead of towers | Same Microsoft material (mechanical/dry heat rejection replaces evaporation; raises power use) | On-screen spec: "no evaporation · uses more power". |
| Fix: cooler climates | Microsoft regional WUE: 0.03 L/kWh in EMEA vs 0.34 in the Americas (Data Center Dynamics / Microsoft reporting) | Cool air allows "free cooling" with little or no evaporation. |
| Closer: "billions a day" | Axios, 21 Jul 2025 (confirmed by OpenAI; TechCrunch "ChatGPT users send 2.5 billion prompts a day"): ~2.5 billion ChatGPT prompts per day | Locked line; order of magnitude only. |
