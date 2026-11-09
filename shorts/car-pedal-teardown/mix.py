"""Foley + voice → out/mix.wav (48 kHz stereo). No music bed (the user adds a track in-app). Driven by timeline.json and events.json."""
import json, sys, os
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.environ.get('LIB', '/root/lemo-opuscar'), 'core', 'audio'))
from sfx import SR, t_, env_exp, lp, hp, bp, noise, whoosh, thump, clack, click, ding, compress, limit, add, brown

TL = json.load(open(f'{HERE}/timeline.json'))
EVJ = json.load(open(f'{HERE}/events.json'))
EV, DUR = EVJ['ev'], EVJ['dur']
N = int((DUR + .5) * SR)
mus = np.zeros((N, 2)); fx = np.zeros((N, 2)); vox = np.zeros((N, 2))
rng = np.random.default_rng(11)
VT = {v['id']: v['t'] for v in TL['vo']}
first = lambda ty: next(e['t'] for e in EV if e['type'] == ty)

# ---------------- foley ----------------
def hiss(d=.6, v=1.0): return hp(noise(d), 2500) * np.minimum(1, t_(d) / .03) * env_exp(d, d / 3) * v
def servo(d=.5, v=1.0):
    tt = t_(d); f = 380 + 260 * tt / d
    return bp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)), 300, 2500) * np.sin(np.pi * tt / d) ** .5 * v
def beep(v=1.0):
    d = .09; tt = t_(d); return np.sin(2 * np.pi * 2200 * tt) * np.minimum(1, (d - tt) / .01) * np.minimum(1, tt / .005) * v
def squeal(d=1.2, v=1.0):
    tt = t_(d); f = 2900 + 90 * np.sin(2 * np.pi * 6 * tt)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) ** 2 * v
def engine(d, f0, f1, v=1.0):   # firing-rate hum: harmonics of a rising fundamental + combustion noise
    tt = t_(d); f = f0 + (f1 - f0) * np.minimum(1, tt / 1.5); ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(a * np.sin(k * ph) for k, a in [(1, .5), (2, 1), (3, .5), (4, .35), (6, .15)])
    x = x * (1 + .35 * np.sin(ph / 2)) + lp(noise(d), 600) * .3
    return lp(x, 900) * v
for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'lift': add(fx, whoosh(.7, .3), t - .05)
    elif ty == 'spread': [add(fx, whoosh(.35, .14), t + k * .12, pan=(-.4 + .27 * k)) for k in range(4)]
    elif ty == 'label': add(fx, click(1.6, .12), t + .18)
    elif ty == 'pedal': add(fx, clack(.8, .25), t + .1); add(fx, thump(.25, 110), t + .5)
    elif ty == 'beep': add(fx, beep(.06), t); add(fx, beep(.05), t + .14)
    elif ty == 'servo': add(fx, servo(.6, .05), t + .1)
    elif ty == 'air': add(fx, bp(noise(2.2), 400, 3000) * np.sin(np.pi * t_(2.2) / 2.2) * .07, t - .8)
    elif ty == 'clunk': add(fx, thump(.5, 90), t); add(fx, clack(.6, .25), t + .02)
    elif ty == 'hiss': add(fx, hiss(1.4, .16), t)
    elif ty == 'flow': add(fx, lp(brown(1.6), 500) * np.sin(np.pi * t_(1.6) / 1.6) * .8, t)
    elif ty == 'clamp': add(fx, clack(.5, .35), t); add(fx, thump(.35, 70), t + .02)
    elif ty == 'squeal': add(fx, squeal(1.4, .025), t + .2)
    elif ty == 'card': add(fx, ding(.18), t)
def bed(t0, t1, x, gain, fi=.6, fo=.8):
    s, e = int(t0 * SR), int(t1 * SR); x = x[:e - s]; tt = np.arange(len(x)) / SR; k = np.minimum(1, np.minimum(tt / fi, (len(x) / SR - tt) / fo))
    fx[s:s + len(x), 0] += x * k * gain; fx[s:s + len(x), 1] += x * k * gain
# engine: idle from the throttle opening, revs up at the first spark, fades as we move to the brakes
t_on, t_rev, t_brk = first('servo'), first('rev'), VT['v07']
bed(t_on, t_rev + .2, engine(t_rev + .2 - t_on, 22, 26), .05)
bed(t_rev, t_brk + 1.5, engine(t_brk + 1.5 - t_rev, 26, 48), .07, fi=.4, fo=1.6)
# rolling tyres from the push until the brakes stop the car
t_roll, t_stop = first('roll'), first('squeal') + 2.2
bed(t_roll, t_stop, lp(brown(t_stop - t_roll), 350) * 1.6 + bp(noise(t_stop - t_roll), 200, 900) * .02, .5, fi=1.0, fo=1.8)
# room tone
rt = lp(brown(DUR + .5), 400) * .006; fx[:len(rt), 0] += rt; fx[:len(rt), 1] += rt

# ---------------- voice ----------------
for v in TL['vo']:
    x, sr = sf.read(f'{HERE}/voice/{v["id"]}.wav', dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    x = soxr.resample(x, sr, SR); add(vox, x, v['t'], 1.0)
vm = compress(vox[:, 0], thr=.12, ratio=3.0); vox[:, 0] = vm; vox[:, 1] = vm

# ---------------- balance: no music; foley sits under the voice ----------------
rms = lambda x: np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2)) if np.any(np.abs(x) > 1e-4) else 1e-9
vox *= .2 / rms(vox[:, 0])
fx *= .9
out = mus + fx + vox
for c in range(2): out[:, c] = limit(out[:, c], .95)
os.makedirs(f'{HERE}/out', exist_ok=True)
sf.write(f'{HERE}/out/mix.wav', out.astype(np.float32), SR)
from scipy.signal import welch
f, p = welch(out.mean(1), SR, nperseg=8192)
lo = 10 * np.log10(p[(f >= 20) & (f < 120)].sum()); mid = 10 * np.log10(p[(f >= 120)].sum())
print(f'mix.wav {len(out) / SR:.1f}s  peak {np.abs(out).max():.2f}  low-vs-mid {lo - mid:+.1f} dB')
