#!/bin/sh
# Render toolchain for the shorts: lemo-opuscar toolkit + Kokoro voices + HDRIs + ffmpeg 7 + resumable renderer.
# Idempotent: safe to run on every new session (fast when everything is already there).
# Use as the cloud environment's setup script, or run once at the start of a session:
#   sh shorts/_tools/setup.sh
set -e
L=/root/lemo-opuscar
FF_URL=https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz

# 1. toolkit
[ -d "$L/.git" ] || git clone --depth 1 https://github.com/lemomo-ai/lemo-opuscar.git "$L"

# 2. ffmpeg 7 (the system one is 6.x, too old)
if [ ! -x /root/bin/ffmpeg ]; then
  mkdir -p /root/bin; T=$(mktemp -d)
  curl -fsSL -o "$T/f.tar.xz" "$FF_URL" && tar xf "$T/f.tar.xz" -C "$T"
  cp "$T"/ffmpeg-*/bin/ffmpeg "$T"/ffmpeg-*/bin/ffprobe /root/bin/; rm -rf "$T"
fi
export PATH=/root/bin:$PATH

# 3. node + python deps, Kokoro voice model, studio HDRIs
cd "$L"
sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice
ls core/assets/polyhaven/*.hdr >/dev/null 2>&1 || sh tools/fetch.sh hdri

# 4. resumable frame renderer (kept in this repo; must sit next to page.mjs)
for f in /home/user/*/shorts/_tools/frames.mjs "$(dirname "$0")/frames.mjs"; do
  [ -f "$f" ] && { cp "$f" "$L/core/render/frames.mjs"; break; }
done

/root/bin/ffmpeg -version | head -1
[ -f "$L/core/render/frames.mjs" ] && echo "frames.mjs ok" || echo "! frames.mjs missing: run 'sh shorts/_tools/setup.sh' from the repo"
echo "shorts toolchain ready"
