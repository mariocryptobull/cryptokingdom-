# How Train Systems Operate — Treatment

**Format:** Exploded Teardown · 1080×1920 vertical · ~60 s · 24 fps · US male narrator (Kokoro `am_michael`) · English captions
**Subject:** a generic modern electric passenger train, shown as a **model**. No CAD exists for a public trainset, so every dimension is left off-screen unless sourced. The model is labelled "Illustrative model" in the opening frame, as STYLE.md §2 requires.

## Three candidate structures
1. **One orbit, two stops.** The closed railcar turns, lifts apart, and the camera stops at the pantograph and at the wheelset. This is clean, but it skips the signalling side of a "system".
2. **Follow the power (chosen).** A "how it works" path that follows energy from the wire down to the rail, then up to the signal layer. Each layer lifts in the same order the electricity flows through it, so the separation order *is* the explanation. This covers "system", not just "train".
3. **Diesel vs electric side by side.** Two powertrains apart with differences named. This doubles the modelling work, and the comparison buries the hook.

**Why 2:** the separation order (catenary → pantograph → transformer → converter → motors → gears → wheelset → rail) teaches the causal chain without any diagram text. The last beat rises above the train to PTC, which turns a "train" into a "train *system*".

## Logline and arc
A single railcar comes apart in the order its power flows, from a 25,000-volt wire down to a steel cone on a rail, then the camera rises to the invisible system that can stop it on its own.
- **Setup (0–6 s):** the closed car turns on the graphite sweep in silence, then a hard first hit.
- **Turn (6–44 s):** the dive down the power chain. The wheel-cone reveal is the payoff.
- **Ending (44–60 s):** the camera pulls back and rises; a PTC layer (GPS / radio / onboard computer) lights above the stack, then everything closes into one object with dimension lines.

## Shot list
| # | Time | Framing / move | Why |
|---|---|---|---|
| 1 | 0.0–5.5 | Wide, high 3/4 orbit on the closed car | Shows the whole before it opens; silence makes the first hit land |
| 2 | 5.5–9.0 | Layers lift top first (0.18 s stagger) while the orbit continues | Signature move: assembly order |
| 3 | 9.0–15.0 | Rise to the catenary + pantograph, then a slow push | The source; label `01 Catenary · 25 kV 60 Hz` |
| 4 | 15.0–23.0 | Dive between layers to the transformer → converter | Hidden components, "inside the gap"; lights come on inside |
| 5 | 23.0–29.0 | Descend to traction motor + gearbox | Power becomes torque |
| 6 | 29.0–40.0 | Grazing macro on the wheelset; the wheelset shifts sideways once (its one real motion) | Payoff: conical tread steers; an accent dimension line draws the taper |
| 7 | 40.0–44.0 | Hold on the motor; the energy arrow reverses up the stack | Regenerative braking |
| 8 | 44.0–54.0 | Fast pull back and rise above the stack; the PTC layer lights | System scale |
| 9 | 54.0–60.0 | Close bottom first; the closed car takes dimension lines | Synthesis ending |

## Voice script (~140 words, ~150 wpm)
1. Every electric train is a chain. Pull it apart, and you can see every link.
2. Up top: the catenary. Between New Haven and Boston, it carries twenty-five thousand volts.
3. A spring-loaded pantograph presses against the wire and pulls that power down.
4. Inside, a transformer steps it down, and a traction converter reshapes it for the motors.
5. The motors drive the axles through gears.
6. Now the clever part. The wheels aren't flat. They're cones.
7. On a curve, the wheelset slides outward, so the outer wheel rolls on a bigger diameter. The train steers itself.
8. And when it brakes, the motors become generators, sending energy back.
9. Above all of it: positive train control. GPS, radio, and onboard computers that can stop the train on their own.
10. Required by law since 2008. Live on every mandated line by the end of 2020.
11. Wire. Wheel. Signal. That's a train.

## Cue map
- 96 BPM, 4/4 (one bar ≈ 2.5 s). Marimba, vibraphone, round bass, dry small percussion.
- Bars 1–2: room tone only. First hit on the downbeat of bar 3 (5.0 s), when the layers lift.
- Bars 3–15: the pulse builds with each layer stop; there's a near-silence at 28.5 s before the wheel reveal.
- Bars 16–21: an airy pad as the PTC layer lights. The final landing thock on the downbeat at 57.5 s.
- Voice on top; music −10 dB under speech; loudness −14 LUFS.

## Sound design
| Section | Bed | Foley | Music |
|---|---|---|---|
| Open | room tone | soft turntable hum | silent |
| Separation | room tone | air swooshes per layer, panned | marimba pulse |
| Electrical | 60 Hz-ish transformer hum (low) | relay clicks, an arc tick at the pantograph | vibraphone added |
| Wheelset | rail ring | steel-on-steel roll, flange squeal one time | stripped to bass |
| PTC | airy | radio chirps, GPS ticks | pad |
| Close | room tone | thocks bottom-first, final clunk | resolve |

## Subtitles and labels
- Captions: centred, bottom 12 %, Inter 600 with a soft shadow, at most 2 lines, each held ≥ max(1.8 s, speech + 0.6 s).
- Labels: a two-digit index in accent **#ff6b3d**, the name in Inter 500, the spec in JetBrains Mono at 60 % ink. Ground #34363a → #0d0e10, ink #f1efe9.
- The opening frame tag "Illustrative model" in mono, small, top-left, for 3 s.
