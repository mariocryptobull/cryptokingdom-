"""Score + foley + voice → out/mix.wav (48 kHz stereo). Everything is driven by timeline.json and events.json."""
import json, sys, os
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.environ.get('LIB', '/root/lemo-opuscar'), 'core', 'audio'))
from sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, whoosh, thump, clack, click, creak, ding, quindar, compress, limit, add, brown

TL = json.load(open(f'{HERE}/timeline.json'))
EVJ = json.load(open(f'{HERE}/events.json'))
EV, DUR = EVJ['ev'], EVJ['dur']
VD = json.load(open(f'{HERE}/voice/dur.json'))
N = int((DUR + .5) * SR)
mus = np.zeros((N, 2)); fx = np.zeros((N, 2)); vox = np.zeros((N, 2))
rng = np.random.default_rng(11)
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
BEAT = 60 / 96; BAR = 4 * BEAT

# ---------------- instruments (synthesised) ----------------
def marimba(m, v=1.0, d=1.1):
    f = mtof(m); tt = t_(d)
    x = np.sin(2 * np.pi * f * tt) * env_exp(d, .38) + .32 * np.sin(2 * np.pi * f * 3.93 * tt) * env_exp(d, .07) + .08 * np.sin(2 * np.pi * f * 9.2 * tt) * env_exp(d, .02)
    x += hp(noise(d), 2000) * env_exp(d, .002) * .15
    x[:96] *= np.linspace(0, 1, 96); return x * v
def vibe(m, v=1.0, d=3.2):
    f = mtof(m); tt = t_(d)
    x = (np.sin(2 * np.pi * f * tt) * env_exp(d, 1.4) + .18 * np.sin(2 * np.pi * f * 4 * tt) * env_exp(d, .35)) * (1 - .28 * (1 - np.cos(2 * np.pi * 5.2 * tt)) / 2)
    x[:200] *= np.linspace(0, 1, 200); return x * v
def bass(m, v=1.0, d=1.2):
    f = mtof(m); tt = t_(d)
    x = np.sin(2 * np.pi * f * tt) + .38 * np.sin(4 * np.pi * f * tt) + .2 * np.sin(6 * np.pi * f * tt)
    e = np.minimum(1, tt / .008) * env_exp(d, .45); return lp(x * e, 900) * v
def kick(v=1.0):
    d = .4; tt = t_(d); f = 46 + 80 * np.exp(-tt / .03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .13) * v
def hat(v=1.0):
    d = .06; return hp(noise(d), 7000) * env_exp(d, .012) * v
def pad(ms, d, v=1.0):
    tt = t_(d); x = np.zeros_like(tt)
    for m in ms:
        for det in (-.07, .07):
            f = mtof(m + det); x += 2 * ((tt * f) % 1) - 1
    x = lp(x, 1100, 2); e = np.minimum(1, tt / 1.2) * np.minimum(1, (d - tt) / 1.2)
    return x * e * v / (2 * len(ms))

# ---------------- no music: the user adds their own track in-app ----------------
mus = np.zeros((N, 2))

# ---------------- foley from the page's events ----------------
def ring(f, d=1.2, v=1.0):
    tt = t_(d); return sum(a * np.sin(2 * np.pi * f * k * tt) * env_exp(d, tau) for k, a, tau in [(1, 1, .5), (2.76, .4, .25), (5.4, .2, .1)]) * v
def squeal(d=.9, v=1.0):
    tt = t_(d); f = 3100 + 80 * np.sin(2 * np.pi * 7 * tt)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) ** 2 * v
def crackle(d=.25, v=1.0):
    x = hp(noise(d), 3000) * (rng.random(int(round(d * SR))) > .985) * 4; return lp(x, 9000) * env_exp(d, .08) * v
def hiss(d=.6, v=1.0): return hp(noise(d), 2500) * np.minimum(1, t_(d) / .03) * env_exp(d, d / 3) * v
def rattle(d=1.2, v=1.0):
    out = np.zeros(int(d * SR))
    for k in range(40):
        s0 = int(rng.random() * (d - .1) * SR); c = click(1.4 + rng.random() * .8, .2 + rng.random() * .3); out[s0:s0 + len(c)] += c[:len(out) - s0]
    return out * v
def roar(d=2.0, v=1.0):
    x = lp(brown(d), 160) * 2.4 + lp(noise(d), 900) * .25
    return x * np.minimum(1, t_(d) / .15) * env_exp(d, d / 2.2) * v
for e in EV:
    t, ty = e['t'], e['type']
    if ty in ('lift', 'whoosh'): add(fx, whoosh(.6, .3), t - .05)
    elif ty == 'land': add(fx, thump(.6, 70), t); add(fx, roar(1.4, .5), t - 1.0)
    elif ty == 'label': add(fx, click(1.6, .12), t + .18)
    elif ty == 'card': add(fx, ding(.16), t)
    elif ty == 'pins': [add(fx, click(1.2, .22), t + k * .12) for k in range(7)]
    elif ty == 'spread': [add(fx, whoosh(.35, .15), t + k * .12) for k in range(4)]
    elif ty == 'clunk': add(fx, thump(.5, 90), t); add(fx, clack(.6, .25), t + .02)
    elif ty == 'hydraulic': add(fx, hiss(1.0, .2), t); add(fx, lp(brown(1.2), 300) * np.sin(np.pi * t_(1.2) / 1.2) * 1.4, t)
    elif ty == 'hiss': add(fx, hiss(1.4, .22), t)
    elif ty == 'roar': add(fx, roar(2.4, .9), t)
    elif ty == 'spin': add(fx, squeal(1.0, .05), t)
    elif ty == 'sat': add(fx, click(1.3, .15), t)
def bed(t0, t1, fn, gain):
    s, e = int(t0 * SR), int(t1 * SR); tt = np.arange(e - s) / SR; x = fn(tt, t0); k = np.minimum(1, np.minimum(tt / .6, (t1 - t0 - tt) / .6))
    fx[s:e, 0] += x * k * gain; fx[s:e, 1] += x * k * gain
# room tone
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

env = np.abs(vox[:, 0]); from scipy.ndimage import uniform_filter1d, maximum_filter1d
env = uniform_filter1d(maximum_filter1d(env, int(.25 * SR)), int(.2 * SR)); duck = 1 - .45 * np.clip(env / .1, 0, 1)
mus *= duck[:, None]
fx *= .9
out = mus + fx + vox
for c in range(2): out[:, c] = limit(out[:, c], .95)
os.makedirs(f'{HERE}/out', exist_ok=True)
sf.write(f'{HERE}/out/mix.wav', out.astype(np.float32), SR)
# band check: low end vs the rest
from scipy.signal import welch
f, p = welch(out.mean(1), SR, nperseg=8192)
lo = 10 * np.log10(p[(f >= 20) & (f < 120)].sum()); mid = 10 * np.log10(p[(f >= 120)].sum())
print(f'mix.wav {len(out) / SR:.1f}s  peak {np.abs(out).max():.2f}  low-vs-mid {lo - mid:+.1f} dB')
for name, x in [('mus', mus), ('fx', fx), ('vox', vox)]:
    f, p = welch(x.mean(1), SR, nperseg=8192)
    print(name, 'low-vs-rest', f'{10*np.log10(p[(f>=20)&(f<120)].sum()+1e-20) - 10*np.log10(p[f>=120].sum()+1e-20):+.1f} dB')
