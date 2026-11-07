"""Foley + voice → out/mix.wav (48 kHz stereo). No music (the user adds a track in-app). Driven by timeline.json and events.json."""
import json, sys, os
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.environ.get('LIB', '/root/lemo-opuscar'), 'core', 'audio'))
from sfx import SR, t_, env_exp, bp, lp, hp, noise, whoosh, thump, clack, click, ding, compress, limit, add, brown

TL = json.load(open(f'{HERE}/timeline.json'))
EVJ = json.load(open(f'{HERE}/events.json'))
EV, DUR = EVJ['ev'], EVJ['dur']
N = int((DUR + .5) * SR)
mus = np.zeros((N, 2)); fx = np.zeros((N, 2)); vox = np.zeros((N, 2))
rng = np.random.default_rng(11)

def tone(f, d, v=1.0, tau=.08):
    tt = t_(d); x = np.sin(2 * np.pi * f * tt) * env_exp(d, tau); x[:48] *= np.linspace(0, 1, 48); return x * v
def hum(d=1.6, v=1.0):   # inductive charging: soft 120 Hz-ish buzz with a swell
    tt = t_(d); x = np.sin(2 * np.pi * 110 * tt) + .4 * np.sin(2 * np.pi * 220 * tt) + .15 * np.sin(2 * np.pi * 330 * tt)
    return lp(x, 900) * np.sin(np.pi * tt / d) ** 2 * v
def servo(d=.9, v=1.0):
    tt = t_(d); f = 380 + 160 * np.sin(np.pi * tt / d)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + .3 * np.sign(np.sin(2 * np.pi * np.cumsum(f * 2) / SR))
    return lp(x, 2500) * np.minimum(1, tt / .05) * np.minimum(1, (d - tt) / .1) * v
def spike(v=1.0):   # electrode "pop" like a spike on an audio monitor
    d = .03; tt = t_(d); return hp(noise(d), 1500) * env_exp(d, .004) * v + tone(1800, d, .3 * v, .003)

for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'lift': add(fx, whoosh(.6, .3), t - .05)
    elif ty == 'land': add(fx, thump(.6, 90), t); add(fx, clack(1.4, .25), t + .02)
    elif ty == 'label': add(fx, click(1.6, .12), t + .18)
    elif ty == 'spread': [add(fx, whoosh(.3, .12), t + k * .14, pan=(-.3 + .15 * k)) for k in range(5)]
    elif ty == 'hum': add(fx, hum(1.8, .12), t)
    elif ty == 'servo': add(fx, servo(.9, .06), t)
    elif ty == 'tick': add(fx, click(2.2, .22), t); add(fx, tone(2400, .05, .05, .01), t + .02)
    elif ty == 'sweep':
        k = 0.0
        while k < e['d']: add(fx, click(2.0 + rng.random() * .6, .1), t + k, pan=-.4 + .8 * k / e['d']); k += .065
    elif ty == 'spike': add(fx, spike(.12), t, pan=rng.uniform(-.3, .3))
    elif ty == 'beep': add(fx, tone(1320, .12, .07, .05), t); add(fx, tone(1760, .1, .05, .04), t + .07)
    elif ty == 'card': add(fx, ding(.16), t)
rt = lp(brown(DUR + .5), 400) * .005; fx[:len(rt), 0] += rt; fx[:len(rt), 1] += rt

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
