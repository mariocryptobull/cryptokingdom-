"""Foley + voice → out/mix.wav (48 kHz stereo). Driven by timeline.json and events.json. No music bed."""
import json, sys, os
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.environ.get('LIB', '/root/lemo-opuscar'), 'core', 'audio'))
from sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, whoosh, thump, clack, click, creak, ding, quindar, compress, limit, add, brown

TL = json.load(open(f'{HERE}/timeline.json'))
EVJ = json.load(open(f'{HERE}/events.json'))
EV, DUR = EVJ['ev'], EVJ['dur']
N = int((DUR + .5) * SR)
mus = np.zeros((N, 2))   # no music: the user adds a track in-app
fx = np.zeros((N, 2)); vox = np.zeros((N, 2))
rng = np.random.default_rng(11)

# ---------------- motor hum: on/off envelope from motor_on / motor_off events ----------------
tt = np.arange(N) / SR
on = np.zeros(N)
state, last = 0, 0.0
sw = sorted([(e['t'], 1 if e['type'] == 'motor_on' else 0) for e in EV if e['type'] in ('motor_on', 'motor_off')])
for t0, s in sw + [(DUR + .5, None)]:
    i0, i1 = int(last * SR), int(min(t0, DUR + .5) * SR)
    on[i0:i1] = state; last = t0
    if s is not None: state = s
from scipy.ndimage import uniform_filter1d
on = uniform_filter1d(on, int(1.0 * SR))   # spin-up / coast-down
f0 = 95 * (.4 + .6 * on)
ph = 2 * np.pi * np.cumsum(f0) / SR
hum = (np.sin(ph) + .35 * np.sin(2 * ph) + .2 * np.sin(6 * ph)) * .03 + lp(brown(N / SR), 300)[:N] * .02 + bp(noise(N / SR), 600, 2200)[:N] * .006
hum *= on
fx[:, 0] += hum; fx[:, 1] += hum

# ---------------- foley from the page's events ----------------
def whir(d=1.6, v=1.0):
    t = t_(d); f = 220 + 60 * np.sin(np.pi * t / d)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + .4 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return x * np.minimum(1, t / .1) * np.minimum(1, (d - t) / .2) * v
def step(v=1.0):
    return lp(thump(.9, 70), 900) * v
for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'lift': add(fx, whoosh(.6, .3), t - .05)
    elif ty == 'spread': [add(fx, whoosh(.35, .15), t + k * .12) for k in range(4)]
    elif ty == 'land': add(fx, thump(.7, 80), t); add(fx, clack(.7, .3), t); add(fx, clack(.9, .2), t + .05)
    elif ty == 'label': add(fx, click(1.6, .12), t + .18)
    elif ty == 'tick': add(fx, click(2.2, .35), t, pan=.2); add(fx, ding(.05), t)
    elif ty == 'step': add(fx, step(.55), t, pan=-.1 if rng.random() < .5 else .1)
    elif ty == 'whir': add(fx, whir(1.8, .05), t)
    elif ty == 'whir_short': add(fx, whir(1.0, .04), t)
    elif ty == 'keypull': add(fx, clack(1.1, .35), t - .1); add(fx, whoosh(.3, .2), t - .1)
    elif ty == 'card': add(fx, ding(.18), t)
# room tone
rt = lp(brown(DUR + .5), 400) * .006; fx[:len(rt), 0] += rt; fx[:len(rt), 1] += rt

# ---------------- voice ----------------
for v in TL['vo']:
    x, sr = sf.read(f'{HERE}/voice/{v["id"]}.wav', dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    x = soxr.resample(x, sr, SR); add(vox, x, v['t'], 1.0)
vm = compress(vox[:, 0], thr=.12, ratio=3.0); vox[:, 0] = vm; vox[:, 1] = vm

# ---------------- balance ----------------
rms = lambda x: np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2)) if np.any(np.abs(x) > 1e-4) else 1e-9
vox *= .2 / rms(vox[:, 0])
fx *= .9
out = mus + fx + vox
for c in range(2): out[:, c] = limit(out[:, c], .95)
os.makedirs(f'{HERE}/out', exist_ok=True)
sf.write(f'{HERE}/out/mix.wav', out.astype(np.float32), SR)
print(f'mix.wav {len(out) / SR:.1f}s  peak {np.abs(out).max():.2f}')
