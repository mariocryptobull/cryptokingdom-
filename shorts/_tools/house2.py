"""Niche house beds (synthesised). Three flavours, same call shape as house.py:

    from house2 import bed
    mus = bed('deep', N, END, breaks=[(t0, t1)], tail=DUR - END)      # 'deep' | 'minimal' | 'garage'

deep    : 120 BPM lo-fi deep house. Dusty Rhodes 9th chords, vinyl crackle, warm sub, lazy swung hats, vowel chops.
minimal : 125 BPM minimal / tech house. Rolling 16th bassline, rim + clicky percussion, hypnotic one-note blips, no chords.
garage  : 132 BPM UK garage 2-step. Skippy kick pattern, heavy swing, organ bass, stabby minor 7ths, chopped vocal hits.
"""
import numpy as np
from sfx import SR, t_, env_exp, lp, hp, bp, noise
bpq = lambda x, fc, q=2: bp(x, fc / (1 + 1 / (2 * q)), min(fc * (1 + 1 / (2 * q)), SR / 2 - 100))

mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
saw = lambda f, tt: 2 * ((tt * f) % 1) - 1
sq = lambda f, tt: np.sign(np.sin(2 * np.pi * f * tt))


def put(buf, x, t, pan=0.0, g=1.0):
    s = int(round(t * SR))
    if s >= len(buf) or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    n = min(len(x), len(buf) - s); l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    buf[s:s + n, 0] += x[:n] * l * g; buf[s:s + n, 1] += x[:n] * r * g


# ---------- drums ----------
def kick(d=.38, f0=44, punch=100, v=1.0, drive=1.4):
    tt = t_(d); f = f0 + punch * np.exp(-tt / .025)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, d / 2.6) * drive) * v
def clap(v=1.0, tone=1200):
    d = .22; x = np.zeros(int(d * SR))
    for k, a in [(0, .6), (.009, .8), (.019, 1.0)]:
        s = int(k * SR); n = bpq(noise(d - k), tone, 1.2) * env_exp(d - k, .05 if a == 1 else .005) * a; x[s:s + len(n)] += n[:len(x) - s]
    return x * v
def rim(v=1.0):
    d = .05; tt = t_(d); return (np.sin(2 * np.pi * 1700 * tt) * .6 + bpq(noise(d), 3500, 2) * 2) * env_exp(d, .008) * v
def hat(d=.045, tau=.01, v=1.0, f=8500): return hp(noise(d), f) * env_exp(d, tau) * v
def shaker(v=1.0):
    d = .08; tt = t_(d); return hp(noise(d), 6000) * np.sin(np.pi * tt / d) ** 3 * v
def conga(m=62, v=1.0):
    d = .25; tt = t_(d); f = mtof(m) * (1 + .3 * np.exp(-tt / .01)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .07) * v
def click(v=1.0):
    d = .012; return hp(noise(d), 4000) * env_exp(d, .0015) * v
def crackle(d):
    n = int(d * SR); x = np.zeros(n); rng = np.random.default_rng(3)
    idx = rng.integers(0, n, int(d * 40)); x[idx] = rng.normal(0, 1, len(idx)) * (rng.random(len(idx)) ** 3)
    return lp(hp(x, 1500), 7000) * .5 + lp(hp(noise(d), 200), 1200) * .015


# ---------- tonal ----------
def rhodes(ms, d, v=1.0):
    tt = t_(d); x = np.zeros_like(tt)
    for m in ms:
        f = mtof(m); mod = np.sin(2 * np.pi * f * tt) * 1.4 * env_exp(d, .25)
        x += np.sin(2 * np.pi * f * tt + mod) * env_exp(d, 1.1) + .15 * np.sin(2 * np.pi * f * 7 * tt) * env_exp(d, .03)
    x *= 1 - .25 * (1 - np.cos(2 * np.pi * 4.5 * tt)) / 2; x[:64] *= np.linspace(0, 1, 64)
    return lp(x, 3000) * v / len(ms)
def sub(m, d, v=1.0):
    tt = t_(d); f = mtof(m); e = np.minimum(1, tt / .005) * np.minimum(1, (d - tt) / .02)
    return (np.sin(2 * np.pi * f * tt) + .15 * np.sin(4 * np.pi * f * tt)) * e * v
def rollbass(m, d, v=1.0):
    tt = t_(d); f = mtof(m); e = np.minimum(1, tt / .002) * env_exp(d, .07)
    return lp(saw(f, tt) * .7 + np.sin(2 * np.pi * f * tt), 450) * e * v
def organ(m, d, v=1.0):
    tt = t_(d); f = mtof(m); e = np.minimum(1, tt / .003) * np.minimum(1, (d - tt) / .01)
    return lp(sq(f, tt) * .5 + np.sin(2 * np.pi * f * tt) + .3 * np.sin(2 * np.pi * 2 * f * tt), 600) * e * v
def stab(ms, d, v=1.0, cut=2200):
    tt = t_(d); x = sum(saw(mtof(m + dt), tt) for m in ms for dt in (-.06, .06))
    return lp(x * np.minimum(1, tt / .002) * env_exp(d, .07), cut) * v / (2 * len(ms))
def blip(m, v=1.0):
    d = .14; tt = t_(d); f = mtof(m); return np.sin(2 * np.pi * f * tt + 2 * np.sin(2 * np.pi * f * 2 * tt) * env_exp(d, .02)) * env_exp(d, .045) * v
VOW = {'a': (800, 1150), 'e': (400, 2000), 'o': (450, 800), 'u': (325, 700), 'i': (300, 2300)}
def chop(m, vowel, d, v=1.0):
    tt = t_(d); src = saw(mtof(m), tt) + .5 * saw(mtof(m) * 1.005, tt); f1, f2 = VOW[vowel]
    x = bpq(src, f1, 4) + .7 * bpq(src, f2, 6); e = np.minimum(1, tt / .006) * np.minimum(1, (d - tt) / .03)
    return x * e * v * 2.5
def pad(ms, d, v=1.0, cut=800):
    tt = t_(d); x = sum(saw(mtof(m + dt), tt) for m in ms for dt in (-.1, .1))
    e = np.minimum(1, tt / 1.0) * np.minimum(1, (d - tt) / 1.0); return lp(x, cut) * e * v / (2 * len(ms))


def sidechain(N, beats, depth=.5, tau=.08, dur=.45):
    sc = np.ones(N)
    for t in beats:
        s = int(t * SR); d = int(dur * SR); g = 1 - depth * np.exp(-np.arange(d) / (SR * tau)); e = min(N, s + d)
        if s < N: sc[s:e] = np.minimum(sc[s:e], g[:e - s])
    return sc


# ---------- styles ----------
def bed(style, N, END, breaks=(), tail=2.5):
    inb = lambda t: any(a <= t < b for a, b in breaks)
    K = np.zeros((N, 2)); D = np.zeros((N, 2)); M = np.zeros((N, 2)); kicks = []
    if style == 'deep':
        BPM = 120; B = 60 / BPM; S = B / 4; SW = .028
        # Fm9  Dbmaj7  Ebm9->Ab13  Cm7   (bass roots + voicings)
        P = [(41, [56, 60, 63, 67]), (37, [56, 60, 63, 65]), (39, [54, 58, 61, 65]), (36, [55, 58, 63, 67])]
        nb = int(np.ceil(END / (4 * B)))
        for bar in range(nb):
            t0 = bar * 4 * B; root, ch = P[bar % 4]; br = inb(t0 + 2 * B)
            put(M, rhodes(ch, 4 * B + .4, .42 if not br else .5), t0 + S * 0, -.1)
            put(M, rhodes(ch, 2 * B, .24), t0 + S * 10 + SW, .15)
            if br: put(M, pad(ch, 4 * B + .3, .16, 1200), t0)
            for s in range(16):
                t = t0 + s * S + (SW if s % 2 else 0)
                if t >= END - .05: break
                if s % 4 == 0 and not br: put(K, kick(.42, 42, 70, .85, 1.2), t); kicks.append(t)
                if s in (4, 12) and not br and bar >= 1: put(D, clap(.32, 1000), t + .006, .05)
                if s % 4 == 2 and not br: put(D, hat(.12, .04, .07, 7000), t, .3)
                if s % 2 == 1: put(D, hat(.04, .008, .035, 9000), t, -.35)
                if s in (3, 7, 11, 13) and bar >= 2: put(D, conga(64 if s != 13 else 69, .12), t, .45)
                if not br and s in (0, 3, 6, 10): put(M, sub(root + (12 if s == 10 else 0), S * (2.6 if s != 10 else 1.6), .5), t)
            if bar >= 2 and bar % 2 == 1 and not br:     # little vowel chop answer
                for st, m, vw in [(8, ch[3] + 12, 'o'), (10, ch[2] + 12, 'a'), (14, ch[3] + 12, 'e')]:
                    put(M, chop(m, vw, S * 1.6, .1), t0 + st * S + SW, .25)
        cr = crackle(min(N / SR, END + tail)); put(M, cr, 0, 0, 1.0); put(M, cr[::-1].copy(), 0, .6, .6)
        end = lambda o: (put(o, rhodes([53, 56, 60, 63, 67], 3.5, .6), END), put(o, sub(29, 2.0, .5), END))
        out_lp = 4200
    elif style == 'minimal':
        BPM = 125; B = 60 / BPM; S = B / 4; SW = .012
        notes = [36, 36, 48, 36, 39, 36, 48, 41]      # C-based rolling bass, 16ths with gaps
        gate = [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1]
        nb = int(np.ceil(END / (4 * B)))
        for bar in range(nb):
            t0 = bar * 4 * B; br = inb(t0 + 2 * B); phrase = (bar // 4) % 2
            for s in range(16):
                t = t0 + s * S + (SW if s % 2 else 0)
                if t >= END - .05: break
                if s % 4 == 0 and not br: put(K, kick(.3, 50, 120, .95, 1.8), t); kicks.append(t)
                if s % 4 == 2: put(D, hat(.07, .02, .08 if not br else .04, 9500), t, .25)
                if s in (6, 14) or (phrase and s == 11): put(D, rim(.16), t, -.3)
                if s in (4, 12) and not br and bar >= 2: put(D, clap(.18, 1800), t, .1)
                if s % 2 == 1: put(D, click(.18 + .1 * (s % 3 == 0)), t, -.5 + (s % 5) / 4)
                if bar >= 1: put(D, shaker(.04), t, .45)
                if gate[s] and not br and bar >= 1: put(M, rollbass(notes[(s + bar) % 8], S * .9, .5), t)
                if s in (2, 9) and bar >= 2: put(M, blip(72 if s == 2 else 79 + phrase * 3, .13), t, .35 if s == 2 else -.35)
            if br: put(M, pad([60, 63, 67, 70], 4 * B + .3, .14, 1500), t0)
        end = lambda o: (put(o, blip(72, .3), END), put(o, blip(79, .2), END + .24), put(o, sub(24, 2.2, .55), END))
        out_lp = 9000
    elif style == 'garage':
        BPM = 132; B = 60 / BPM; S = B / 4; SW = .03
        P = [(45, [57, 60, 64, 67]), (41, [57, 60, 64, 65]), (43, [55, 59, 62, 67]), (40, [55, 59, 62, 64])]   # Am7 Fmaj7 G Em7
        KP = [0, 7, 10]                                 # 2-step kick: 1, the "a" of 2, the "e" of 3 (skippy)
        nb = int(np.ceil(END / (4 * B)))
        for bar in range(nb):
            t0 = bar * 4 * B; root, ch = P[bar % 4]; br = inb(t0 + 2 * B)
            for s in range(16):
                t = t0 + s * S + (SW if s % 2 else 0)
                if t >= END - .05: break
                if s in KP and not br: put(K, kick(.28, 48, 110, .9, 1.6), t); kicks.append(t)
                if s in (4, 12) and not br: put(D, clap(.3, 1600), t, .05); put(D, rim(.1), t + .01, -.2)
                if s % 2 == 1: put(D, hat(.04, .009, .07, 9000), t, -.3)
                if s in (2, 6, 10, 14): put(D, shaker(.06), t, .4)
                if s == 14 and bar % 2: put(D, hat(.15, .05, .08, 7500), t, .3)
                if not br and s in (0, 3, 6, 8, 11, 14): put(M, organ(root + (12 if s in (6, 14) else 0), S * 1.7, .38), t)
                if s in (3, 8, 11) and bar >= 1: put(M, stab(ch, S * 1.4, .42 if not br else .28, 2400 if not br else 1200), t, -.15 if s == 8 else .15)
            if bar >= 2 and bar % 2 == 0 and not br:      # chopped vocal hook
                for st, m, vw in [(0, 76, 'a'), (3, 74, 'e'), (6, 72, 'o'), (9, 74, 'a'), (12, 69, 'u')]:
                    put(M, chop(m, vw, S * 1.5, .12), t0 + st * S + SW, .2)
            if br: put(M, pad(ch, 4 * B + .3, .15, 1300), t0)
        end = lambda o: (put(o, stab([57, 60, 64, 67], .9, .6), END), put(o, organ(33, 1.5, .45), END), put(o, kick(.28, 48, 110, .9, 1.6), END))
        out_lp = 10000
    else:
        raise ValueError(style)
    for a, b in breaks:
        d = min(2 * 4 * B, b - a); x = hp(noise(d), 1500) * (t_(d) / d) ** 2 * .2; put(D, x, b - d)
    sc = sidechain(N, kicks, depth=.5 if style != 'minimal' else .35)
    out = K + (D + M) * sc[:, None]
    end(out)
    out[:, 0] = lp(out[:, 0], out_lp); out[:, 1] = lp(out[:, 1], out_lp)
    return out
