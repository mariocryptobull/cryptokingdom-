# PS1 Retro — channel house style

The look of a 1997 console game recorded off a CRT: chunky low-poly models with tiny textures, wobbling vertices, dithered 15-bit colour, a tiled liminal room, and a low-poly mascot cat who "takes things apart". Reference implementation: `shorts/turbo-ps1/src/main.js` (v2).

## Why this style
- **Fast on CPU-only machines**: about 0.1–0.4 s per frame at 270×480, versus about 10 s for the Exploded Teardown style. A 1-minute video renders in minutes.
- **A brand**: one mascot, one room, one caption look means every video is recognisable in the first frame.
- **On-trend**: the low-poly/PS1 look and "low poly animal" meme formats read instantly on Reels and TikTok.

## Invariants (keep all of these)
| Trait | Rule | Implementation |
|---|---|---|
| Resolution | 270×480 internal, shown at exactly 4× (1080×1920), nearest sampling | low-res render target → CRT pass samples with `floor(uv*res)` |
| Vertex wobble | snap clip-space positions to the 270×480 grid | `p.xy = floor(p.xy/p.w*grid+.5)/grid*p.w` in the vertex shader |
| Affine warp | no perspective-correct texturing | pass `uv*w` and `w`, divide in the fragment shader (GLSL ES has no `noperspective`) |
| Subdivision | big planes get 8–12 segments so the warp reads as PS1, not as a glitch | `PlaneGeometry(w, h, 12, 8)` |
| Textures | 8–32 px, hand-drawn in code, posterized to ~12 levels per channel, nearest filter, no mipmaps; repeat through a `uRep` uniform | `tex()` helper |
| Lighting | Gouraud only (per vertex): soft directional + one warm bare-bulb point light + contact darkening near the floor; no shadows except a blob under characters | vertex shader `vShade` |
| Colour | ordered 4×4 Bayer dither, then quantize to 5 bits per channel | fragment shader |
| Fog | short draw distance into the room colour (#1b1d24), start ≈5.5, end ≈13 | per-vertex fog |
| CRT | mild tube curvature, composite colour bleed (R/B offset ≈0.4 source px), horizontal smear 12 %, one dark scanline per source row, vignette, 2-px grain | `crt` pass |
| Animation | characters posed **on twos (12 fps)**; camera, particles and UI stay at 24 fps; camera has a few pixels of handheld jitter | `t = floor(t*12)/12` inside the character block |
| Set | tiled corner room: blue-grey wall tiles with white grout, green stone floor, dark baseboard, one bare bulb on a cord, a wooden crate as the plinth | — |
| Mascot | orange tabby built from boxes and 4-sided cones: blink every ~3.3 s, head tilt, tail sway; reaction kit = swipe, fur puff, jump, head-shake "nope", **owl head spin** (full 360°+ turns on punchlines; viewers loved it), slow blink at the end. Every pose must be a pure function of t: never accumulate rotations across frames (an accumulating head turn once produced random spins that differed by worker) | `cat` group |
| Type | Pixelify Sans (OFL). Captions: yellow #ffe14a, thick navy #16207a outline, blue glow, at y≈1300 (clear of TikTok UI). Labels: navy boxes with white 6-px borders on a 6-px grid. One giant meme word per video (e.g. BOOST) | `overlay.js` |
| HUD | at most one game-style bar or counter per video, when it explains a quantity | power bar in the turbo video |
| Sound | chiptune square lead + square bass, small dry percussion; foley is synthesized (whoosh, pop, thump, hiss); a two-note "nope" cue; voice ducks the music ~10 dB; −14 LUFS | `mix.py` |

## Pitfalls seen so far
- Posterizing to 6 levels turned fur and cast iron into blotches: keep ~12.
- `ShaderMaterial` ignores `texture.repeat`: pass it as a uniform or tiles render one-per-wall.
- Pipes hide the flow particles inside them: make pipes translucent (opacity ≈0.45) and particles larger than the pipe radius.
- Cameras that cross the cat or the turbo block the subject: hold the key shot, then move.
- Particle cubes under 0.05 units vanish at 270×480: use ≥0.075.
- GLSL ES 3.0: declare your own `out vec4` (no `gl_FragColor`).

## Format
- 61–65 s (just over 1 minute for TikTok rewards), hook line in the first 2 s, title card for the first ~5 s, end card "X IN · Y OUT" style summary, final line "Follow for the next teardown."
- Facts in `FACTS.md` per video, from course material first, then manufacturer or standards sources.
