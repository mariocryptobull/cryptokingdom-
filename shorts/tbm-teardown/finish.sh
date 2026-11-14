#!/bin/sh
# Resumable full render → mux → checks → phone copy. Safe to re-run: finished frames are kept in out/frames.
set -e
export PATH=/root/bin:$PATH
cd "$(dirname "$0")"; L=/root/lemo-opuscar
date -u +%H:%M
node $L/core/render/frames.mjs . --fps 24 --workers 3 --size 1080x1920 --out out/frames
n=$(ls out/frames | grep -c '^f_.*\.jpg$'); [ "$n" -eq 1764 ] || { echo "only $n/1764 frames"; exit 1; }
ffmpeg -y -loglevel error -framerate 24 -i out/frames/f_%05d.jpg -c:v libx264 -preset medium -crf 14 -pix_fmt yuv420p out/video.mp4
sh $L/core/render/mux.sh out/video.mp4 out/mix.wav out/tbm-teardown.mp4 24 1
ffmpeg -hide_banner -i out/tbm-teardown.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2
echo "black: $(ffmpeg -hide_banner -i out/tbm-teardown.mp4 -vf blackdetect=d=0.3 -an -f null - 2>&1 | grep -c black_start || true)"
mkdir -p out/check
ffmpeg -y -loglevel error -i out/tbm-teardown.mp4 -vf "fps=1/4,scale=270:-1,tile=6x4" -frames:v 1 out/check/sheet.jpg
cd out
ffmpeg -y -loglevel error -i tbm-teardown.mp4 -c:v libx264 -b:v 1550k -pass:v 1 -passlogfile:v p -an -f null /dev/null
ffmpeg -y -loglevel error -i tbm-teardown.mp4 -c:v libx264 -b:v 1550k -pass:v 2 -passlogfile:v p -c:a aac -b:a 160k -movflags +faststart tbm-teardown-phone.mp4
ls -l tbm-teardown-phone.mp4; date -u +%H:%M
