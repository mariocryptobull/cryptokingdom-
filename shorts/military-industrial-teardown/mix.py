"""Foley + voice → out/mix.wav (48 kHz stereo). No music: the user adds a track in-app. Driven by timeline.json and events.json."""
import json, sys, os
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.environ.get('LIB', '/root/lemo-opuscar'), 'core', 'audio'))
from sfx import SR, t_, env_exp, bp, lp, hp, noise, whoosh, thump, clack, click, ding, quindar, ignite, roar, rumble, compress, limit, add, brown

TL = json.load(open(f'{HERE}/timeline.json'))
EVJ = json.load(open(f'{HERE}/events.json'))
EV, DUR = EVJ['ev'], EVJ['dur']
N = int((DUR + .5) * SR)
mus = np.zeros((N, 2)); fx = np.zeros((N, 2)); vox = np.zeros((N, 2))
rng = np.random.default_rng(11)

# ---------------- foley from the page's events ----------------
def hiss(d=.6, v=1.0): return hp(noise(d), 2500) * np.minimum(1, t_(d) / .03) * env_exp(d, d / 3) * v
def flyby(d=2.2, v=1.0):
    tt = t_(d); x = bp(noise(d), 300, 3000) * np.exp(-((tt - d * .45) / (d * .22)) ** 2); return x * v
def buzz(d=2.0, v=1.0, f=180):
    tt = t_(d); x = sum(np.sign(np.sin(2 * np.pi * (f + 9 * k) * tt + k)) for k in range(4)) / 4
    return lp(x, 2200) * np.minimum(1, tt / .4) * np.minimum(1, (d - tt) / .6) * v
def coin(v=1.0):
    d = .5; tt = t_(d); return (np.sin(2 * np.pi * 2600 * tt) + .6 * np.sin(2 * np.pi * 3900 * tt)) * env_exp(d, .09) * v
for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'lift': add(fx, whoosh(.6, .3), t - .05)
    elif ty == 'land': add(fx, thump(.6, 85), t); add(fx, clack(.8, .25), t + .02)
    elif ty == 'label': add(fx, click(1.6, .12), t + .18)
    elif ty == 'card': add(fx, ding(.16), t)
    elif ty == 'coin': [add(fx, coin(.07), t + k * .11, pan=(-.3 + .2 * k)) for k in range(4)]
    elif ty == 'pins': [add(fx, click(1.2 + .1 * (k % 3), .22), t + k * .09, pan=(k % 5 - 2) * .2) for k in range(9)]
    elif ty == 'spread': [add(fx, whoosh(.35, .16), t + k * .1) for k in range(5)]
    elif ty == 'clunk': add(fx, thump(.45, 90), t); add(fx, clack(.6, .22), t + .02)
    elif ty == 'hiss': add(fx, hiss(1.4, .12), t); add(fx, lp(brown(1.6), 260) * np.sin(np.pi * t_(1.6) / 1.6) * 1.0, t)
    elif ty == 'flyby': add(fx, flyby(2.4, .5), t)
    elif ty == 'launch': add(fx, ignite(.5), t); add(fx, roar(2.2, .35), t + .1)
    elif ty == 'buzz': add(fx, buzz(1.4, .05, 210), t, pan=-.3)
    elif ty == 'swarm': add(fx, buzz(5.5, .06, 190), t, pan=.2); add(fx, buzz(5.0, .04, 240), t + .3, pan=-.3)
    elif ty == 'ping': [add(fx, quindar(.06, 1800 + 300 * k), t + k * .35) for k in range(3)]
rt = (lp(brown(DUR + .5), 400) * .006)[:N]; fx[:len(rt), 0] += rt; fx[:len(rt), 1] += rt

# ---------------- voice ----------------
for v in TL['vo']:
    x, sr = sf.read(f'{HERE}/voice/{v["id"]}.wav', dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    x = soxr.resample(x, sr, SR); add(vox, x, v['t'], 1.0)
vm = compress(vox[:, 0], thr=.12, ratio=3.0); vox[:, 0] = vm; vox[:, 1] = vm

rms = lambda x: np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2)) if np.any(np.abs(x) > 1e-4) else 1e-9
vox *= .2 / rms(vox[:, 0])
fx *= .9
out = mus + fx + vox
for c in range(2): out[:, c] = limit(out[:, c], .95)
os.makedirs(f'{HERE}/out', exist_ok=True)
sf.write(f'{HERE}/out/mix.wav', out.astype(np.float32), SR)
print(f'mix.wav {len(out) / SR:.1f}s  peak {np.abs(out).max():.2f}')
