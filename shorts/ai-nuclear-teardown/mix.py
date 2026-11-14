"""Foley + voice → out/mix.wav (48 kHz stereo). No music (the user adds a track in-app). Driven by timeline.json and events.json."""
import json, sys, os
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.environ.get('LIB', '/root/lemo-opuscar'), 'core', 'audio'))
from sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, whoosh, thump, clack, click, creak, ding, compress, limit, add, brown

TL = json.load(open(f'{HERE}/timeline.json'))
EVJ = json.load(open(f'{HERE}/events.json'))
EV, DUR = EVJ['ev'], EVJ['dur']
N = int((DUR + .5) * SR)
mus = np.zeros((N, 2)); fx = np.zeros((N, 2)); vox = np.zeros((N, 2))
rng = np.random.default_rng(11)

def hiss(d=.6, v=1.0): return hp(noise(d), 2500) * np.minimum(1, t_(d) / .03) * env_exp(d, d / 3) * v
def drone(d=3.0, v=1.0):
    tt = t_(d); x = sum(a * np.sin(2 * np.pi * f * tt) for f, a in [(55, 1), (82.4, .5), (110.3, .3)]) + .4 * lp(brown(d), 200)
    return x * np.minimum(1, tt / .6) * np.minimum(1, (d - tt) / 1.0) * v
def hum(d=1.5, v=1.0):
    tt = t_(d); x = np.sin(2 * np.pi * 60 * tt) + .4 * np.sin(2 * np.pi * 120 * tt) + .2 * np.sin(2 * np.pi * 180 * tt)
    return x * np.minimum(1, tt / .4) * env_exp(d, d / 2) * v
def spinup(d=1.6, v=1.0):
    tt = t_(d); f = 80 + 220 * (tt / d) ** .7
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * .6 + hp(noise(d), 1500) * .3) * np.minimum(1, tt / .3) * env_exp(d, d / 1.5) * v
for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'drone': add(fx, drone(3.2, .5), t)
    elif ty == 'power': add(fx, thump(.8, 60), t); add(fx, hum(2.0, .35), t + .05); add(fx, whoosh(.8, .25), t)
    elif ty == 'lift': add(fx, whoosh(.6, .3), t - .05)
    elif ty == 'spread': [add(fx, whoosh(.35, .15), t + k * .12) for k in range(3)]
    elif ty == 'land': add(fx, thump(.7, 80), t); add(fx, clack(.7, .3), t); add(fx, clack(.9, .2), t + .05)
    elif ty == 'label': add(fx, click(1.6, .12), t + .18)
    elif ty == 'pins': [add(fx, click(1.2, .25), t + k * .1) for k in range(6)]
    elif ty == 'clunk': add(fx, thump(.5, 90), t); add(fx, clack(.6, .25), t + .02)
    elif ty == 'hiss': add(fx, hiss(1.2, .22), t)
    elif ty == 'spin': add(fx, spinup(1.8, .35), t)
    elif ty == 'step': add(fx, click(1.4, .2), t)
    elif ty == 'buzz': add(fx, hum(1.0, .3), t); [add(fx, click(2.0, .12), t + k * .07) for k in range(6)]
    elif ty == 'coin': [add(fx, ding(.1), t + k * .2) for k in range(3)]
    elif ty == 'rise': [add(fx, whoosh(.5, .2), t + .3 + k * .25) for k in range(3)]
    elif ty == 'card': add(fx, ding(.18), t)
rt = lp(brown(DUR + .5), 400) * .006; fx[:len(rt), 0] += rt; fx[:len(rt), 1] += rt

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
