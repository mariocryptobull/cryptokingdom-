#!/bin/sh
# Re-mix a finished short's audio and swap it into the existing phone cut: no frame re-render.
#   sh shorts/_tools/swap_audio.sh shorts/<name>          (edit <name>/mix.py's music line first)
# Music line options in mix.py:
#   deep house : sys.path.insert(0, os.path.join(HERE, '..', '_tools')); from house2 import bed; mus = bed('deep', N, END, breaks=[(t0, t1)], tail=DUR - END)
#   no music   : mus = np.zeros((N, 2))
set -e
export PATH=/root/bin:$PATH
D=$(cd "$1" && pwd); n=$(basename "$D"); V="$D/$n-phone.mp4"
[ -f "$V" ] || V="$D/out/$n-phone.mp4"
[ -f "$V" ] || { echo "no phone cut found for $n"; exit 1; }
mkdir -p "$D/out"; cd "$D" && PYTHONDONTWRITEBYTECODE=1 /root/lemo-opuscar/.venv/bin/python mix.py > out/mix.log 2>&1 || { cat out/mix.log; exit 1; }; head -1 out/mix.log
J=$(ffmpeg -hide_banner -i out/mix.wav -af loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
AF="loudnorm=I=-14:TP=-1.2:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true"
T=$(mktemp --suffix=.mp4)
ffmpeg -y -loglevel error -i "$V" -i out/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -af "$AF" -ar 48000 -c:a aac -b:a 160k -shortest -movflags +faststart "$T"
mv "$T" "$V"
ffmpeg -hide_banner -i "$V" -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2
echo "swapped audio → $V"
