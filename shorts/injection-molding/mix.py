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

# ---------------- score: D minor, 96 BPM, 4 chords per 4 bars ----------------
CH = [(50, [62, 65, 69, 74]), (46, [62, 65, 70, 74]), (53, [60, 65, 69, 72]), (48, [60, 64, 67, 72])]   # Dm Bb F C (bass root, marimba tones)
ARP = [0, 2, 1, 3, 2, 1, 3, 2]
def state(t):   # which parts play when
    s = dict(mar=0., kick=0., hat=0., bass=0., vib=0., pad=0.)
    if t < 7.0: s.update(mar=.5, vib=.5)
    elif t < 18.4: s.update(mar=.8, kick=1, hat=.5 if t > 9.5 else 0, bass=1)
    elif t < 27.6: s.update(mar=.7, kick=1, hat=.7, bass=1)
    elif t < 34.4: s.update(mar=.8, kick=1, hat=.8, bass=1, pad=1)
    elif t < 39.2: s.update(bass=.9, kick=.8)
    elif t < 45.8: s.update(vib=.9, bass=.7)                 # cooling: calm, sustained
    elif t < 58.6: s.update(mar=.75, kick=1, hat=.6, bass=1, pad=1 if t > 50 else 0)
    elif t < 62.8: s.update(mar=.9, kick=1, hat=.9, bass=1)
    return s
b = 0
while b * BEAT < DUR - 3.5:
    t = b * BEAT; bar = b // 4; root, tones = CH[bar % 4]; s = state(t)
    for e in range(2):   # eighth notes
        te = t + e * BEAT / 2; se = state(te)
        if se['mar'] > 0:
            m = tones[ARP[(b % 4) * 2 % 8 + e]] + (12 if (b % 8) >= 4 and e == 1 else 0)
            add(mus, marimba(m, .22 * se['mar']), te, pan=-.35 + .7 * ((b * 2 + e) % 4) / 3)
        if se['hat'] > 0: add(mus, hat(.08 * se['hat'] * (1.0 if e else .6)), te, pan=.3)
    if s['kick'] > 0 and b % 2 == 0: add(mus, kick(.42 * s['kick']), t)
    if s['bass'] > 0 and b % 2 == 0: add(mus, bass(root - 12 + 12 * (b % 4 == 2) * 0, .26 * s['bass'], BEAT * 1.8), t)
    if s['vib'] > 0 and b % 4 == 0: add(mus, vibe(tones[1] + 12, .2 * s['vib']), t, pan=-.2); add(mus, vibe(tones[3], .14 * s['vib']), t + BEAT * 2, pan=.2)
    if s['pad'] > 0 and b % 4 == 0: add(mus, pad([root + 12, tones[1], tones[2]], BAR + .4, .09), t)
    b += 1
add(mus, pad([50, 62, 65, 69], DUR - 62.6, .1), 62.6)
for m, dt in [(74, 0), (69, .02), (65, .04)]: add(mus, vibe(m, .22, 3.0), 62.8 + dt)
add(mus, bass(38, .4, 2.5), 62.8)

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
for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'lift': add(fx, whoosh(.5, .26), t - .05)
    elif ty == 'land': add(fx, thump(.45, 90), t); add(fx, clack(.8, .2), t)
    elif ty == 'pellets': add(fx, rattle(3.0, .35), t, pan=.2)
    elif ty == 'plunge': add(fx, thump(.8, 60), t); add(fx, hiss(.4, .25), t)
    elif ty == 'inject': add(fx, whoosh(.9, .3), t); add(fx, hiss(.7, .12), t + .1)
    elif ty == 'clamp': add(fx, thump(1.0, 48), t); add(fx, clack(.5, .35), t)
    elif ty == 'water': pass
    elif ty == 'open': add(fx, hiss(.8, .18), t); add(fx, creak(.15), t + .1)
    elif ty == 'eject': add(fx, click(.9, .4), t); add(fx, clack(1.2, .25), t + .08)
    elif ty == 'drop': add(fx, rattle(.5, .45), t + .35)
    elif ty == 'card': add(fx, ding(.18), t)
def bed(t0, t1, fn, gain):
    s, e = int(t0 * SR), int(t1 * SR); tt = np.arange(e - s) / SR; x = fn(tt, t0); k = np.minimum(1, np.minimum(tt / .6, (t1 - t0 - tt) / .6))
    fx[s:e, 0] += x * k * gain; fx[s:e, 1] += x * k * gain
T = {e['type']: e['t'] for e in EV}
def whir(tt, t0):
    ph = 2 * np.pi * np.cumsum(np.full(len(tt), 180.0)) / SR
    return np.sin(ph) + .35 * np.sin(3 * ph) + .15 * np.sin(7 * ph)
bed(T['spin'] - .3, T['plunge'], whir, .03)
bed(T['water'] - .3, T['open'], lambda tt, t0: bp(noise(len(tt) / SR), 300, 1800) * (.7 + .3 * np.sin(2 * np.pi * 1.3 * tt)), .02)
# label ticks
for e in EV:
    if e['type'] == 'label': add(fx, click(1.6, .12), e['t'] + .18)
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
mus *= (.2 / 3.16) / rms(mus.mean(1))
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
