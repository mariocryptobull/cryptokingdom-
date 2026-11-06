# Recon drone teardown: facts and sources

## Does Palantir make a drone?
No public evidence that it does. Palantir sells software. It works with drone makers and on drone data, not airframes:
- Palantir's own blog says it has spent 10+ years integrating drone platforms into intelligence/surveillance/target-acquisition/recon workflows, aimed at third-party drone makers (blog.palantir.com, "The Open Standard that Ensures Your Drone is a Major Player on the Battlefield").
- Red Cat press release, 16 Dec 2024: partnership to put Palantir's Visual Navigation (VNav) software on Red Cat's Black Widow drone for GPS-compromised environments; flight tests reported 27 Oct 2025 (redcat.red; GPS World; Unmanned Systems Technology).
- Commentary (Benzinga, Mar 2026) frames Palantir as the software layer and drone firms such as Ondas as hardware makers.
- Fact check: a viral "Palantir killer mini-drone" video is from the fiction short "Slaughterbots" (Myth Detector).
So the short shows a **generic** small fixed-wing recon drone (no real product, no logos) and explains where Palantir software fits.

## Claims in the script
| Claim | Source(s) | Notes |
|---|---|---|
| Small recon drones are often hand-launched planes | AeroVironment Raven datasheet (07/2021): hand-launched, deep-stall recovery; US Air Force RQ-11B fact sheet | Generic model based on this class. |
| Under 2 kg, wingspan ≈ 1.4–1.5 m | Raven datasheet & af.mil: 4.2 lb (1.9 kg), 4.5 ft (1.4 m) wingspan | VO says "around one and a half meters"; on-screen says ≈1.4 m (e.g. RQ-11B). |
| Electric motor spins the propeller | af.mil RQ-11B fact sheet (electric motor); Raven datasheet | |
| Rechargeable battery, an hour or more aloft | Raven datasheet: 60–90 min endurance; rechargeable Li-ion | On-screen "~60–90 min". |
| Flight controller with gyros + accelerometers (IMU) and GPS | General UAS/autopilot architecture; Raven: GPS-aided navigation (af.mil, Army.mil) | Standard component description, no specs claimed. |
| Autopilot flies preplanned waypoints, or a pilot flies by hand | af.mil RQ-11B: "can be flown manually or can autonomously follow a preplanned route" | |
| Radio datalink streams live video to a ground station, ~10 km | Raven datasheet: 10 km link range, common ground control station; Army.mil (digital data link) | |
| Stabilized gimbal turret with daylight (EO) + thermal (IR) cameras | Army.mil "RQ-11B Raven SUAS": gimbaled EO/IR payload replacing fixed cameras; af.mil | |
| Palantir doesn't build the drone; it builds software | See section above | |
| Maven (Pentagon) — Maven Smart System built largely on Palantir software | The Defense Post (30 May 2024): Palantir awarded $480M to prototype Maven Smart System; Tom's Hardware / heise (2026): Pentagon makes Palantir's Maven a core system / program of record | |
| Maven began (2017) to analyze drone full-motion video with computer vision, flagging objects | Wikipedia "Project Maven" (DoD memo 26 Apr 2017: computer vision for PED of full-motion video); militaryaerospace.com (2017) | |
| Fuses drone video with other feeds and puts them on a map for analysts | Interesting Engineering & C4ISRNET coverage of Maven Smart System: combines satellite, drone and other sensor data on a map; Palantir describes it as decision support | Kept to "flags objects ... for human analysts". No targeting/weapons detail. |

## Deliberately left out
Weapons integration, strike/targeting process detail, build or modification info, contract-value claims beyond the 2024 award, unverified figures from low-quality blogs.
