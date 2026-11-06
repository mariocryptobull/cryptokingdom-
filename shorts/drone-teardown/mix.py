"""House bed + foley + voice → out/mix.wav (48 kHz stereo). Driven by timeline.json and events.json."""
import json, sys, os
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.environ.get('LIB', '/root/lemo-opuscar'), 'core', 'audio'))
sys.path.insert(0, os.path.join(HERE, '..', '_tools'))
from sfx import SR, t_, env_exp, bp, lp, hp, noise, whoosh, thump, clack, click, ding, quindar, compress, limit, add, brown
from house2 import bed

TL = json.load(open(f'{HERE}/timeline.json'))
EVJ = json.load(open(f'{HERE}/events.json'))
EV, DUR = EVJ['ev'], EVJ['dur']
VD = json.load(open(f'{HERE}/voice/dur.json'))
N = int((DUR + .5) * SR)
fx = np.zeros((N, 2)); vox = np.zeros((N, 2))
VT = {v['id']: v['t'] for v in TL['vo']}

# ---------------- music: deep house bed, one break before the Palantir payoff so the drop lands on it ----------------
END = max(e['t'] for e in EV if e['type'] == 'card') - .2
brk0 = VT['v07'] + VD['v07'] - .3
mus = bed('deep', N, END, breaks=[(brk0, VT['v08'])], tail=DUR - END)

# ---------------- foley ----------------
def whir(d, f0=90, v=1.0):
    tt = t_(d); f = f0 * (1 + .8 * np.minimum(1, tt / .6))
    x = 2 * ((np.cumsum(f) / SR) % 1) - 1
    return bp(x, 150, 2400) * np.minimum(1, tt / .15) * np.minimum(1, (d - tt) / .4) * v
def ping(v=1.0):
    d = .35; tt = t_(d); return np.sin(2 * np.pi * 1760 * tt) * env_exp(d, .07) * v
for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'lift': add(fx, whoosh(.6, .3), t - .05)
    elif ty == 'spread': [add(fx, whoosh(.35, .15), t + k * .12) for k in range(4)]
    elif ty == 'label': add(fx, click(1.6, .12), t + .18)
    elif ty == 'whir': add(fx, whir(2.2, 95, .05), t)
    elif ty == 'pin': add(fx, click(2.0, .18), t)
    elif ty == 'ping': add(fx, ping(.09), t, pan=-.3)
    elif ty == 'land': add(fx, thump(.5, 90), t); add(fx, clack(.8, .25), t + .02)
    elif ty == 'fly': add(fx, whoosh(1.0, .25), t)
    elif ty == 'card': add(fx, ding(.18), t)
# light prop drone under the flight section
f0 = next(e['t'] for e in EV if e['type'] == 'fly'); d = DUR - f0
x = whir(d, 110, .02) * (1 + .15 * np.sin(2 * np.pi * .4 * t_(d))); s0 = int(f0 * SR); fx[s0:s0 + len(x), 0] += x[:N - s0]; fx[s0:s0 + len(x), 1] += x[:N - s0]
rt = lp(brown(DUR + .5), 400) * .006; fx[:len(rt), 0] += rt; fx[:len(rt), 1] += rt

# ---------------- voice ----------------
for v in TL['vo']:
    x, sr = sf.read(f'{HERE}/voice/{v["id"]}.wav', dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    x = soxr.resample(x, sr, SR); add(vox, x, v['t'], 1.0)
vm = compress(vox[:, 0], thr=.12, ratio=3.0); vox[:, 0] = vm; vox[:, 1] = vm

# ---------------- balance: voice ~10 dB over music, music ducked under speech ----------------
rms = lambda x: np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2)) if np.any(np.abs(x) > 1e-4) else 1e-9
vox *= .2 / rms(vox[:, 0])
mus *= (.2 / 3.16) / rms(mus.mean(1))
env = np.abs(vox[:, 0]); from scipy.ndimage import uniform_filter1d, maximum_filter1d
env = uniform_filter1d(maximum_filter1d(env, int(.25 * SR)), int(.2 * SR)); duck = 1 - .45 * np.clip(env / .1, 0, 1)
mus *= duck[:, None]
fx *= .9
out = mus + fx + vox
for c in range(2): out[:, c] = limit(out[:, c], .95)
os.makedirs(f'{HERE}/out', exist_ok=True)
sf.write(f'{HERE}/out/mix.wav', out.astype(np.float32), SR)
print(f'mix.wav {len(out) / SR:.1f}s  peak {np.abs(out).max():.2f}')
