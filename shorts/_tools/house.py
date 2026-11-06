"""Catchy house bed for the shorts (synthesised, no samples). 124 BPM, Am-F-C-G, four-on-the-floor.

Use from a short's mix.py in place of the old score section:

    sys.path.insert(0, os.path.join(HERE, '..', '_tools')); from house import house
    mus = house(N, END, breaks=[(VT['v07'], VT['v08'])], tail=DUR - END)

- N: samples in the mix; END: when the end card lands (music resolves there, tail rings out).
- breaks: list of (t0, t1) seconds with no kick/clap (filtered breakdown, riser into the drop). Pick 1 short break
  before the payoff line so the drop lands on it.
- The intro (first 2 bars) opens with a filter sweep; everything except the kick is side-chained to the kick.
- Returns stereo float array (N, 2); mix.py's balance block levels and ducks it under the voice as before.
"""
import numpy as np
from sfx import SR, t_, env_exp, lp, hp, noise

BPM = 124; BEAT = 60 / BPM; BAR = 4 * BEAT; S16 = BEAT / 4
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
# Am  F  C  G  (bass root, chord tones)
PROG = [(45, [57, 60, 64, 69]), (41, [57, 60, 65, 69]), (48, [55, 60, 64, 67]), (43, [55, 59, 62, 67])]
# 2-bar lead hook (16th-step, midi offset from chord's top tone index, length in 16ths)
HOOK = [(0, 76, 2), (3, 74, 1), (4, 72, 2), (6, 74, 2), (10, 76, 2), (12, 79, 3), (16, 76, 2), (19, 74, 1), (20, 72, 2), (22, 71, 2), (26, 72, 4)]
STAB = [3, 6, 10, 14]        # 16th positions of chord stabs inside a bar (syncopated)


def saw(f, tt): return 2 * ((tt * f) % 1) - 1


def kick(v=1.0):
    d = .32; tt = t_(d); f = 48 + 110 * np.exp(-tt / .022)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .16) + hp(noise(d), 3000) * env_exp(d, .003) * .25
    return np.tanh(x * 1.6) * v


def clap(v=1.0):
    d = .25; x = np.zeros(int(d * SR))
    for k, a in [(0, .7), (.011, .8), (.022, 1.0)]:
        s = int(k * SR); n = hp(lp(noise(d - k), 5000), 900) * env_exp(d - k, .045 if a == 1 else .006) * a; x[s:s + len(n)] += n[:len(x) - s]
    return x * v


def hat(open_=False, v=1.0):
    d = .22 if open_ else .05; return hp(noise(d), 8000) * env_exp(d, .07 if open_ else .012) * v


def shaker(v=1.0):
    d = .07; tt = t_(d); return hp(noise(d), 5000) * np.sin(np.pi * tt / d) ** 2 * v


def bass(m, d, v=1.0):
    tt = t_(d); f = mtof(m)
    x = saw(f, tt) * .6 + np.sin(2 * np.pi * f * tt)
    e = np.minimum(1, tt / .004) * np.minimum(1, (d - tt) / .01); return lp(x * e, 700) * v


def stab(ms, d, v=1.0, cut=2600):
    tt = t_(d); x = np.zeros_like(tt)
    for m in ms:
        for det in (-.08, .08): x += saw(mtof(m + det), tt) + .5 * np.sin(2 * np.pi * mtof(m + 12) * tt)
    e = np.minimum(1, tt / .003) * env_exp(d, .09); return lp(x * e, cut) * v / (2 * len(ms))


def pluck(m, d, v=1.0):
    tt = t_(d); f = mtof(m)
    x = (saw(f, tt) * .5 + np.sin(2 * np.pi * f * tt)) * env_exp(d, .16) + np.sin(2 * np.pi * 2 * f * tt) * env_exp(d, .05) * .3
    x[:48] *= np.linspace(0, 1, 48); return lp(x, 3200) * v


def pad(ms, d, v=1.0):
    tt = t_(d); x = np.zeros_like(tt)
    for m in ms:
        for det in (-.1, .1): x += saw(mtof(m + det), tt)
    e = np.minimum(1, tt / .8) * np.minimum(1, (d - tt) / .8); return lp(x, 900) * e * v / (2 * len(ms))


def put(buf, x, t, pan=0.0):
    s = int(round(t * SR))
    if s >= len(buf) or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    n = min(len(x), len(buf) - s); l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    buf[s:s + n, 0] += x[:n] * l; buf[s:s + n, 1] += x[:n] * r


def house(N, END, breaks=(), tail=2.5, seed=7):
    rng = np.random.default_rng(seed)
    drums = np.zeros((N, 2)); kicks = np.zeros((N, 2)); music = np.zeros((N, 2))
    inbreak = lambda t: any(a <= t < b for a, b in breaks)
    nb = int(np.ceil((END - .05) / BAR))
    for bar in range(nb):
        t0 = bar * BAR; root, tones = PROG[bar % 4]; br = inbreak(t0 + BAR / 2)
        intro = bar < 2
        for s in range(16):
            t = t0 + s * S16
            if t >= END - .05: break
            sw = .012 if s % 2 else 0        # light swing on off-16ths
            if s % 4 == 0 and not br: put(kicks, kick(.9), t)
            if s in (4, 12) and not br and not intro: put(drums, clap(.5), t, .05)
            if s % 4 == 2 and not intro: put(drums, hat(True, .16 if not br else .08), t + sw, .25)
            if s % 2 == 1 and not br: put(drums, hat(False, .07 + .03 * rng.random()), t + sw, -.3)
            if not br and not intro: put(drums, shaker(.05 + .02 * rng.random()), t + sw, .4)
            # offbeat octave bass (the "and" of each beat), root on 1
            if not br:
                if s % 4 == 2: put(music, bass(root + (12 if s in (6, 14) else 0), S16 * 1.8, .55), t)
                if s == 0 and not intro: put(music, bass(root, S16 * 1.6, .45), t)
            if s in STAB: put(music, stab(tones, S16 * 2.2, .5 if not br else .3, cut=1400 if (intro or br) else 2600), t + sw, -.15 if s % 8 < 4 else .15)
        # pad under everything; brighter in breaks
        put(music, pad([tones[0], tones[1], tones[2]], BAR + .3, .16 if br else .08), t0)
        # 2-bar hook, from bar 4 on (not in the intro), every other phrase quieter
        if bar >= 4 and bar % 2 == 0:
            for st, m, ln in HOOK:
                t = t0 + st * S16
                if t < END - .1: put(music, pluck(m, ln * S16 + .15, .32 if (bar // 8) % 2 == 0 else .24), t, .2)
    # riser into the end of each break (noise sweep)
    for a, b in breaks:
        d = min(2 * BAR, b - a); x = hp(noise(d), 2000) * (t_(d) / d) ** 2 * .25; put(drums, x, b - d)
    # intro filter sweep (first 2 bars open up)
    k = int(2 * BAR * SR)
    if k < N:
        dark = lp(music[:k].copy(), 600); w = np.linspace(0, 1, k)[:, None] ** 1.5
        music[:k] = dark * (1 - w) + music[:k] * w
    # side-chain: duck everything but the kick on each kick
    sc = np.ones(N)
    for bar in range(nb):
        for q in range(4):
            t = bar * BAR + q * BEAT
            if t >= END or inbreak(t): continue
            s = int(t * SR); d = int(BEAT * SR); g = 1 - .55 * np.exp(-np.arange(d) / (SR * .07))
            sc[s:s + d] = np.minimum(sc[s:s + d], g[:max(0, min(d, N - s))])
    out = kicks + (drums + music) * sc[:, None]
    # ending: final Am chord + low A on the end card, ringing out
    put(out, stab([57, 60, 64, 69], 1.2, .55), END); put(out, pad([57, 60, 64], tail, .14), END); put(out, bass(33, 1.6, .5), END)
    put(out, kick(.9), END)
    return out
