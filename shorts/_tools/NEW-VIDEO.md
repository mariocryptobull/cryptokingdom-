# Starting a new short in a fresh session

Paste into a new Claude Code session (one video per session; they render in parallel):

> Run `sh shorts/_tools/setup.sh`, then read `shorts/_tools/NEW-VIDEO.md` and make a teardown short about **TOPIC**. Work on your own branch.

## House rules
- 1080×1920, 60–75 s, English captions, delivered in chat with SendUserFile (phone copy).
- Voice: Kokoro `am_michael`, speed ~1.0–1.08 (trim to fit 60–75 s).
- Styles: Exploded Teardown (template: `shorts/tbm-teardown`, `shorts/bliss-st-teardown`) or PS1 low-poly with the orange tabby cat (template: `shorts/subway-ps1`).
- Music: NONE by default (the user adds their own house track in-app). In mix.py set `mus = np.zeros((N, 2))`; keep voice + foley, -14 LUFS. Add to POST.md: "No music: add your track in-app, ~15–20 dB under the voice." (Deep house bed `house2.bed('deep', ...)` only if asked.)
- Closer: an on-screen + spoken "What should we take apart next?" beat, then "Congrats! You've discovered …".
- Style: Exploded Teardown only (the PS1 cat format is retired for now).
- Research: facts table with sources in `FACTS.md`; captions + hashtags in `POST.md`; credits in `CREDITS`.
- Before rendering: test stills across the timeline and fix framing/overlaps.
- Render: copy `finish.sh` from a template, set the frame count (= round(dur × 24)), run it in the background with the max timeout; it resumes if killed (render ~2 h on 4 CPUs, 3 workers).
- Check: −14 LUFS, 0 black frames, review `out/check/sheet.jpg`, then send `out/<name>-phone.mp4` + `POST.md`, commit the phone cut, push.
- Toolkit paths: `/root/lemo-opuscar` (stills: `core/render/still.mjs`, events: `core/render/events.mjs`, TTS: `.venv/bin/python core/tts/tts.py lines.json voice`, mux: `core/render/mux.sh`). Always `export PATH=/root/bin:$PATH`.
- Music change after the render: edit the music line in mix.py, then `sh shorts/_tools/swap_audio.sh shorts/<name>`. It re-mixes and swaps the audio into the phone cut at -14 LUFS. No frame re-render.
