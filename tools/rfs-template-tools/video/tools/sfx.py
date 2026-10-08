#!/usr/bin/env python3
"""Deterministic SFX track generator (all sounds synthesized, no samples).

Usage:
    python tools/sfx.py events.json out.wav [--lufs -18] [--ceiling -1] [--seed 1234]

events.json:
    {"duration": 150.0,
     "seed": 1234,                      # optional global seed
     "events": [
        {"t": 12.3, "type": "click", "gain": 1.0},
        {"t": 14.0, "type": "whoosh", "pan": 0.2},
        {"t": 20.0, "type": "type", "n": 12, "dur": 1.4},
        {"t": 0.0,  "type": "bed", "gain": 0.15}
     ]}

Common optional fields on every event:
    gain  linear multiplier (default 1.0)
    pan   -1..1 (default per type, mostly centre)
    send  reverb send 0..1 (default per type)
    seed  per-event seed override
Type-specific fields:
    cam/draw/riser/shimmer/type : dur (seconds)
    type                        : n (keystrokes)
    pop                         : pitch (semitone offset from D6)
    bed                         : dur (defaults to rest of track), gain ~0.15

Output: 48 kHz, 16-bit, stereo, exactly round(duration*48000) samples.
"""
import json
import sys
import zlib
import argparse

import numpy as np
from scipy import signal
from scipy.io import wavfile
from scipy.ndimage import minimum_filter1d, uniform_filter1d

SR = 48000
TWO_PI = 2.0 * np.pi


# ----------------------------------------------------------------- helpers
def db(x):
    return 10.0 ** (x / 20.0)


def midi_hz(m):
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


def tvec(n):
    return np.arange(n) / SR


def sos(kind, f, order=2):
    if kind == "bp":
        return signal.butter(order, [f[0] / (SR / 2), min(f[1] / (SR / 2), 0.999)], "bandpass", output="sos")
    return signal.butter(order, min(f / (SR / 2), 0.999), kind, output="sos")


def filt(x, kind, f, order=2):
    return signal.sosfilt(sos(kind, f, order), x, axis=-1)


def adenv(n, attack, tau):
    """Linear-ish (sine) attack then exponential decay (tau seconds)."""
    t = tvec(n)
    a = np.clip(t / max(attack, 1e-5), 0, 1)
    a = np.sin(0.5 * np.pi * a) ** 2
    return a * np.exp(-np.maximum(t - attack, 0) / tau)


def fade_tail(x, sec):
    k = min(int(sec * SR), x.shape[-1])
    if k > 1:
        x[..., -k:] *= np.cos(np.linspace(0, 0.5 * np.pi, k)) ** 2
    return x


def damped_sine(n, f, tau, attack=0.0003, amp=1.0, phase=0.0):
    t = tvec(n)
    return amp * np.sin(TWO_PI * f * t + phase) * adenv(n, attack, tau)


def chirp_sine(n, f_of_t):
    """Sine with instantaneous frequency array f_of_t (Hz)."""
    ph = TWO_PI * np.cumsum(f_of_t) / SR
    return np.sin(ph)


def pan_gains(p):
    p = np.clip(p, -1, 1)
    ang = (p + 1) * 0.25 * np.pi
    return np.cos(ang), np.sin(ang)


def to_stereo(mono, pan=0.0, haas_ms=0.0):
    """Equal-power pan (pan may be scalar or per-sample array) + tiny Haas offset for width."""
    gl, gr = pan_gains(pan)
    L = mono * gl
    R = mono * gr
    d = int(abs(haas_ms) * SR / 1000)
    if d > 0:
        if haas_ms > 0:
            R = np.concatenate([np.zeros(d), R[:-d]])
        else:
            L = np.concatenate([np.zeros(d), L[:-d]])
    return np.stack([L, R]) * np.sqrt(2)  # centre stays at unity


def stereo_noise(n, rng, corr=0.5):
    """Two partially correlated white-noise channels (corr=1 mono, 0 fully wide)."""
    c = rng.standard_normal(n)
    a = rng.standard_normal((2, n))
    return np.sqrt(corr) * c + np.sqrt(1 - corr) * a


def swept_noise(n, rng, fc, bw_oct=1.0, corr=0.5, nper=1024):
    """Band of noise whose centre follows fc(frac) (callable, frac 0..1).
    Implemented as a time-varying spectral mask in the STFT domain."""
    hop = nper // 4
    pad = nper
    x = stereo_noise(n + 2 * pad, rng, corr)
    f, tt, Z = signal.stft(x, fs=SR, nperseg=nper, noverlap=nper - hop)
    frac = np.clip((tt - pad / SR) / max(n / SR, 1e-6), 0, 1)
    centres = np.asarray([fc(v) for v in frac])
    sig = bw_oct / 2.355
    lf = np.log2(np.maximum(f, 10.0))[:, None]
    mask = np.exp(-0.5 * ((lf - np.log2(centres)[None, :]) / sig) ** 2)
    _, y = signal.istft(Z * mask[None], fs=SR, nperseg=nper, noverlap=nper - hop)
    y = y[:, pad:pad + n]
    if y.shape[1] < n:
        y = np.pad(y, ((0, 0), (0, n - y.shape[1])))
    return y


def norm(x, peak=1.0):
    m = np.max(np.abs(x))
    return x * (peak / m) if m > 0 else x


# ----------------------------------------------------------------- voices
# Every voice returns a stereo array normalised to peak 1.0; level is set by LEVEL_DB.

def v_click(rng, ev, soft=False):
    n = int(0.055 * SR)
    t = tvec(n)
    j = lambda s: 1 + rng.uniform(-s, s)
    # 1) contact transient: band-limited noise, ~2.5 ms
    tr = filt(rng.standard_normal(n), "bp", (2500, 9000) if not soft else (3500, 11000), 2)
    tr *= adenv(n, 0.0003, 0.0022 if not soft else 0.0016)
    # 2) woody/plastic body: a few damped modes
    base = (1750 if not soft else 2600) * j(0.03)
    modes = [(1.0, 0.55, 0.009), (1.68, 0.30, 0.006), (2.51, 0.14, 0.0035)]
    body = sum(damped_sine(n, base * r * j(0.01), tau * (0.8 if soft else 1.0), amp=a,
                           phase=rng.uniform(0, TWO_PI) * 0) for r, a, tau in modes)
    # 3) tiny low thump (pitch-dropping sine)
    if not soft:
        f = 120 + 100 * np.exp(-t / 0.006)
        th = chirp_sine(n, f) * adenv(n, 0.0008, 0.010) * 0.2
    else:
        th = np.zeros(n)
    x = 0.55 * tr + body + th
    # 4) key release "clack", quieter and brighter, ~24 ms later
    d = int((0.024 if not soft else 0.018) * SR)
    rel = filt(rng.standard_normal(n - d), "bp", (3000, 10000), 2) * adenv(n - d, 0.0003, 0.0014)
    rel += damped_sine(n - d, base * 1.35, 0.004, amp=0.35)
    x[d:] += rel * (0.28 if not soft else 0.18)
    x = filt(x, "hp", 70 if not soft else 180, 2)
    x = filt(x, "lp", 12000, 2)
    x = fade_tail(x, 0.006)
    s = to_stereo(x, ev.get("pan", rng.uniform(-0.06, 0.06)))
    # width: a faint, decorrelated high "air" tick on each side (noise, so no mono cancellation)
    w = filt(stereo_noise(n, rng, 0.2), "hp", 5000, 2) * adenv(n, 0.0003, 0.003)
    s += w * (0.12 * np.max(np.abs(s)) / (np.max(np.abs(w)) + 1e-9))
    return norm(s)


def v_softclick(rng, ev):
    return v_click(rng, ev, soft=True)


def v_whoosh(rng, ev):
    dur = float(ev.get("dur", 0.55))
    n = int(dur * SR)
    frac = np.linspace(0, 1, n)
    main = swept_noise(n, rng, lambda u: 380 * (3400 / 380) ** (u ** 1.15), bw_oct=1.3, corr=0.35)
    air = swept_noise(n, rng, lambda u: 3500 * (8500 / 3500) ** u, bw_oct=1.0, corr=0.2)
    pk = 0.58
    env = np.where(frac < pk, (frac / pk) ** 2.2, np.exp(-(frac - pk) / 0.14))
    env = env * np.sin(np.pi * np.minimum(frac / 0.08, 1) * 0.5)  # soft onset
    x = (main + 0.35 * air) * env
    x = filt(x, "hp", 160, 2)
    x = fade_tail(x, 0.05)
    p = float(ev.get("pan", 0.0))
    gl, gr = pan_gains(np.clip(p + np.linspace(-0.25, 0.25, n), -1, 1))
    x = np.stack([x[0] * gl, x[1] * gr]) * np.sqrt(2)
    return norm(x)


def v_whoosh_out(rng, ev):
    dur = float(ev.get("dur", 0.3))
    n = int(dur * SR)
    frac = np.linspace(0, 1, n)
    x = swept_noise(n, rng, lambda u: 2800 * (650 / 2800) ** u, bw_oct=1.4, corr=0.35)
    pk = 0.7
    env = np.where(frac < pk, (frac / pk) ** 1.6, np.cos(0.5 * np.pi * (frac - pk) / (1 - pk)) ** 2)
    x = x * env
    x = filt(x, "hp", 200, 2)
    p = float(ev.get("pan", 0.0))
    gl, gr = pan_gains(np.clip(p + np.linspace(0.2, -0.2, n), -1, 1))
    return norm(np.stack([x[0] * gl, x[1] * gr]) * np.sqrt(2))


def v_cam(rng, ev):
    dur = max(float(ev.get("dur", 1.0)), 0.2)
    n = int(dur * SR)
    frac = np.linspace(0, 1, n)
    x = swept_noise(n, rng, lambda u: 170 * (1 + 1.1 * np.sin(np.pi * u)), bw_oct=1.6, corr=0.3, nper=2048)
    env = np.sin(np.pi * frac) ** 1.6
    x = x * env
    x = filt(x, "hp", 55, 2)
    x = filt(x, "lp", 1400, 2)
    return norm(x)


def v_type(rng, ev):
    k = max(int(ev.get("n", 8)), 1)
    dur = max(float(ev.get("dur", 0.12 * k)), 0.05)
    n = int((dur + 0.08) * SR)
    out = np.zeros((2, n))
    sp = dur / k
    times = np.arange(k) * sp + rng.uniform(-0.28, 0.28, k) * sp
    times[0] = 0.0
    times = np.clip(times, 0, dur)
    m = int(0.045 * SR)
    t = tvec(m)
    for i, ts in enumerate(times):
        big = rng.random() < 0.14  # occasional space/enter: lower, fuller
        g = rng.uniform(0.55, 1.0) * (1.1 if big else 1.0)
        tr = filt(rng.standard_normal(m), "bp", (2800, 9500), 2) * adenv(m, 0.0003, 0.0016)
        fb = rng.uniform(1000, 1500) * (0.7 if big else 1.0)
        body = damped_sine(m, fb, 0.005, amp=0.5) + damped_sine(m, fb * 1.73, 0.003, amp=0.2)
        thock = chirp_sine(m, 180 + 120 * np.exp(-t / 0.005)) * adenv(m, 0.0006, 0.008) * (0.35 if big else 0.18)
        x = 0.6 * tr + body + thock
        d = int(rng.uniform(0.018, 0.03) * SR)
        x[d:] += 0.18 * filt(rng.standard_normal(m - d), "bp", (3500, 9000), 2) * adenv(m - d, 0.0003, 0.0012)
        x = filt(x, "hp", 150, 2) * g
        s = to_stereo(x, rng.uniform(-0.18, 0.18))
        i0 = int(ts * SR)
        e = min(i0 + m, n)
        out[:, i0:e] += s[:, :e - i0]
    return norm(fade_tail(out, 0.02))


def bell_tone(n, f, parts, attack=0.003, rng=None, detune=0.0):
    t = tvec(n)
    x = np.zeros(n)
    for r, a, tau in parts:
        ff = f * r + detune
        if ff > 16000:
            continue
        x += a * np.sin(TWO_PI * ff * t) * adenv(n, attack, tau)
    return x


def v_pop(rng, ev):
    f0 = midi_hz(86 + float(ev.get("pitch", 0)))  # D6
    n = int(0.9 * SR)
    parts = [(1.0, 1.0, 0.16), (2.0, 0.22, 0.08), (2.76, 0.10, 0.045), (0.5, 0.18, 0.10)]
    L = bell_tone(n, f0, parts, attack=0.0025, detune=-0.4)
    R = bell_tone(n, f0, parts, attack=0.0025, detune=+0.4)
    tick = filt(rng.standard_normal(n), "bp", (4000, 10000), 2) * adenv(n, 0.0002, 0.0015) * 0.06
    x = np.stack([L + tick, R + tick])
    x = filt(x, "hp", 250, 2)
    x = filt(x, "lp", 7000, 2)
    x = fade_tail(x, 0.2)
    gl, gr = pan_gains(float(ev.get("pan", 0.0)))
    x[0] *= gl * np.sqrt(2)
    x[1] *= gr * np.sqrt(2)
    return norm(x)


def v_dialog(rng, ev):
    n = int(0.55 * SR)
    x = np.zeros(n)
    for delay, m, a in ((0.0, 81, 0.8), (0.07, 86, 1.0)):  # A5 -> D6
        d = int(delay * SR)
        f = midi_hz(m)
        seg = bell_tone(n - d, f, [(1.0, 1.0, 0.075), (2.0, 0.15, 0.04), (3.0, 0.05, 0.02)], attack=0.004)
        x[d:] += a * seg
    x = filt(x, "hp", 300, 2)
    x = filt(x, "lp", 3800, 2)  # muted
    x = fade_tail(x, 0.1)
    return norm(to_stereo(x, float(ev.get("pan", 0.0))))


def v_draw(rng, ev):
    dur = max(float(ev.get("dur", 1.0)), 0.1)
    n = int(dur * SR)
    frac = np.linspace(0, 1, n)
    x = swept_noise(n, rng, lambda u: 2600 * (4800 / 2600) ** u, bw_oct=1.1, corr=0.6)
    # graphite grain: slow random amplitude texture (~30 Hz) + slight fine grit
    grain = filt(rng.standard_normal(n), "lp", 35, 2)
    grain = np.abs(grain) / (np.std(grain) + 1e-9)
    grain = 0.55 + 0.45 * np.clip(grain, 0, 2.5) / 2.5
    env = np.minimum(frac / 0.08, 1) * np.minimum((1 - frac) / 0.12, 1)
    env = np.sin(0.5 * np.pi * np.clip(env, 0, 1)) ** 2 * (0.75 + 0.25 * frac)
    x = x * grain * env
    x = filt(x, "hp", 1500, 2)
    return norm(x)


def v_riser(rng, ev):
    dur = max(float(ev.get("dur", 3.0)), 0.5)
    tail = 0.7
    n = int((dur + tail) * SR)
    t = tvec(n)
    u = np.clip(t / dur, 0, 1)
    # swell to 100% at 90% of dur, then gentle release through the tail
    pk = 0.9
    env = np.where(u < pk, (u / pk) ** 2.4, 1.0)
    rel_start = pk * dur
    env = env * np.where(t > rel_start, np.exp(-(t - rel_start) / 0.28), 1.0)
    noise = swept_noise(n, rng, lambda v: 280 * (3600 / 280) ** min(v * (dur + tail) / dur, 1) ** 1.4,
                        bw_oct=1.6, corr=0.25, nper=2048)
    # soft D-major pad underneath (D3 A3 D4 F#4 A4), detuned L/R
    pad = np.zeros((2, n))
    for m, a in ((50, 0.5), (57, 0.45), (62, 0.4), (66, 0.28), (69, 0.22)):
        f = midi_hz(m)
        for ch, c in ((0, -3), (1, 3)):
            ff = f * 2 ** (c / 1200)
            pad[ch] += a * (np.sin(TWO_PI * ff * t) + 0.18 * np.sin(TWO_PI * 2 * ff * t))
    pad_env = np.where(u < pk, (u / pk) ** 1.6, 1.0) * np.where(t > rel_start, np.exp(-(t - rel_start) / 0.35), 1.0)
    pad = filt(pad, "lp", 2200, 2) * pad_env * 0.12
    x = noise * env * 0.9 + pad
    x = filt(x, "hp", 90, 2)
    x = fade_tail(x, 0.15)
    return norm(x)


def v_impact(rng, ev):
    n = int(3.2 * SR)
    t = tvec(n)
    # sub: pitch drop 62 -> 41 Hz, gently saturated so it reads on small speakers
    f = 41 + 21 * np.exp(-t / 0.09)
    sub = chirp_sine(n, f) * adenv(n, 0.004, 0.42)
    sub = np.tanh(1.6 * sub) / np.tanh(1.6)
    body = filt(rng.standard_normal(n), "lp", 380, 2) * adenv(n, 0.002, 0.05) * 0.5
    # upper-bass body (octave of the sub) so the hit still reads on laptop/phone speakers
    body += chirp_sine(n, 2 * f) * adenv(n, 0.003, 0.18) * 0.32
    knock = filt(rng.standard_normal(n), "bp", (900, 2600), 2) * adenv(n, 0.0005, 0.006) * 0.12
    mono = sub + body + knock
    mono = filt(mono, "hp", 28, 2)
    s = to_stereo(mono, 0.0)
    air = swept_noise(n, rng, lambda u: 6500 * (2600 / 6500) ** (u ** 0.5), bw_oct=2.0, corr=0.1, nper=2048)
    air = air * adenv(n, 0.015, 0.55) * 0.16
    air = filt(air, "hp", 1200, 2)
    x = s + air
    x = fade_tail(x, 0.6)
    return norm(x)


def v_shimmer(rng, ev):
    dur = max(float(ev.get("dur", 1.2)), 0.3)
    tail = 1.0
    n = int((dur + tail) * SR)
    notes = [86, 88, 90, 93, 95, 98, 100, 102, 105]  # D major pentatonic, D6 upward
    out = np.zeros((2, n))
    k = len(notes)
    for i, m in enumerate(notes):
        ts = dur * i / (k - 1) * 0.92
        d = int(ts * SR)
        seg = bell_tone(n - d, midi_hz(m), [(1.0, 1.0, 0.32), (2.0, 0.12, 0.12), (3.0, 0.04, 0.06)], attack=0.006)
        a = 0.9 - 0.35 * i / (k - 1)
        p = -0.55 + 1.1 * i / (k - 1)
        out[:, d:] += a * to_stereo(seg, p)
    nn = int(dur * SR)
    fr = np.linspace(0, 1, nn)
    air = swept_noise(nn, rng, lambda u: 4200 * (9500 / 4200) ** u, bw_oct=1.0, corr=0.2)
    air *= np.sin(np.pi * fr) ** 1.5 * 0.5
    out[:, :nn] += air * np.max(np.abs(out)) / (np.max(np.abs(air)) + 1e-9) * 0.35
    out = filt(out, "hp", 500, 2)
    out = filt(out, "lp", 11000, 2)
    return norm(fade_tail(out, 0.3))


def v_chime(rng, ev):
    n = int(5.5 * SR)
    out = np.zeros((2, n))
    # warm bell partials: hum, prime, fifth-ish, nominal, a touch of inharmonic sparkle
    parts = [(0.5, 0.30, 3.2), (1.0, 1.0, 2.6), (1.5, 0.10, 1.4), (2.0, 0.28, 1.5),
             (3.0, 0.10, 0.8), (4.07, 0.04, 0.35)]
    for delay, m, a, p in ((0.0, 74, 1.0, 0.0), (0.06, 81, 0.42, -0.25), (0.12, 86, 0.26, 0.25)):
        d = int(delay * SR)
        f = midi_hz(m)
        L = bell_tone(n - d, f, parts, attack=0.004, detune=-0.35)
        R = bell_tone(n - d, f, parts, attack=0.004, detune=+0.35)
        gl, gr = pan_gains(p)
        out[0, d:] += a * L * gl * np.sqrt(2)
        out[1, d:] += a * R * gr * np.sqrt(2)
    mallet = filt(rng.standard_normal(n), "bp", (1500, 5000), 2) * adenv(n, 0.0005, 0.004) * 0.05
    out += mallet
    out = filt(out, "hp", 120, 2)
    out = filt(out, "lp", 6500, 2)
    return norm(fade_tail(out, 1.2))


def v_bed(rng, ev, total_n):
    t0 = float(ev["t"])
    dur = float(ev.get("dur", total_n / SR - t0))
    n = max(int(dur * SR), 1)
    chords = [
        [50, 57, 64, 66, 69],  # Dadd9
        [47, 54, 62, 66, 69],  # Bm7
        [43, 50, 57, 59, 66],  # Gmaj9-ish
        [45, 52, 57, 62, 64],  # Asus4
    ]
    seg = 8.0
    xf = 3.0
    out = np.zeros((2, n))
    nseg = int(np.ceil(dur / seg)) + 1
    for i in range(nseg):
        s0 = i * seg - xf / 2
        s1 = s0 + seg + xf
        a0, a1 = max(int(s0 * SR), 0), min(int(s1 * SR), n)
        if a1 <= a0:
            continue
        tt = np.arange(a0, a1) / SR  # absolute time within bed (phase-continuous)
        loc = tt - s0
        env = np.ones_like(tt)
        env *= np.where(loc < xf, np.sin(0.5 * np.pi * np.clip(loc / xf, 0, 1)) ** 2, 1.0)
        env *= np.where(loc > seg, np.cos(0.5 * np.pi * np.clip((loc - seg) / xf, 0, 1)) ** 2, 1.0)
        ch = chords[i % len(chords)]
        buf = np.zeros((2, a1 - a0))
        for j, m in enumerate(ch):
            f = midi_hz(m)
            a = 0.9 if m < 52 else 0.6
            lfo = 0.8 + 0.2 * np.sin(TWO_PI * (0.05 + 0.013 * j) * tt + j * 1.7)
            def tone(ff):
                return (np.sin(TWO_PI * ff * tt + j) + 0.28 * np.sin(TWO_PI * 2 * ff * tt + 2 * j)
                        + 0.1 * np.sin(TWO_PI * 3 * ff * tt))
            centre = tone(f)  # mono-safe core; detuned copies add slow, gentle width
            for c, cents in ((0, -3.0), (1, 3.0)):
                buf[c] += a * lfo * (0.7 * centre + 0.45 * tone(f * 2 ** (cents / 1200)))
        out[:, a0:a1] += buf * env
    out = filt(out, "lp", 1300, 2)
    out = filt(out, "hp", 60, 2)
    # global fades
    k = min(int(3.0 * SR), n // 2)
    out[:, :k] *= np.sin(0.5 * np.pi * np.linspace(0, 1, k)) ** 2
    out = fade_tail(out, min(4.0, dur / 2))
    return norm(out)


def v_felt(rng, ev):
    """부드러운 펠트 피아노 — notes(미디 번호 목록)를 한 번에 누른다. 반짝임 없이 따뜻하게."""
    notes = ev.get("notes", [62])
    n = int(4.0 * SR)
    t = tvec(n)
    out = np.zeros((2, n))
    for i, m in enumerate(notes):
        f = midi_hz(m)
        d = int(float(ev.get("spread", 0.0)) * i * SR)
        seg_n = n - d
        tt = t[:seg_n]
        env = (1 - np.exp(-tt / 0.006)) * np.exp(-tt / 1.3)
        tone = (np.sin(TWO_PI * f * tt) + 0.35 * np.sin(TWO_PI * 2 * f * tt) * np.exp(-tt / 0.4)
                + 0.12 * np.sin(TWO_PI * 3 * f * tt) * np.exp(-tt / 0.2))
        hammer = filt(rng.standard_normal(seg_n), "lp", 900, 2) * adenv(seg_n, 0.001, 0.012) * 0.15
        seg = (tone * env + hammer) * (1.0 - 0.12 * i)
        p = -0.3 + 0.6 * i / max(len(notes) - 1, 1)
        out[:, d:] += to_stereo(seg, p)
    out = filt(out, "lp", 2600, 2)
    out = filt(out, "hp", 70, 2)
    return norm(fade_tail(out, 0.8))


def v_swell(rng, ev):
    """역재생 심벌 같은 짧은 공기 부풀음 — 다음 박자로 빨려 들어간다."""
    dur = max(float(ev.get("dur", 1.2)), 0.3)
    n = int(dur * SR)
    fr = np.linspace(0, 1, n)
    x = swept_noise(n, rng, lambda u: 1800 * (7000 / 1800) ** u, bw_oct=1.8, corr=0.3, nper=2048)
    x = x * (fr ** 2.6)
    x = filt(x, "hp", 600, 2)
    return norm(x)


def v_tick(rng, ev):
    """아주 작은 UI 틱 — 종이 위 펜 끝 같은 짧은 톡."""
    n = int(0.06 * SR)
    x = filt(rng.standard_normal(n), "bp", (2500, 7000), 2) * adenv(n, 0.0003, 0.004)
    x += np.sin(TWO_PI * 1800 * tvec(n)) * adenv(n, 0.0005, 0.006) * 0.3
    return norm(to_stereo(x, float(ev.get("pan", 0.0))))


VOICES = {
    "click": v_click, "softclick": v_softclick, "whoosh": v_whoosh, "whoosh_out": v_whoosh_out,
    "cam": v_cam, "type": v_type, "pop": v_pop, "dialog": v_dialog, "draw": v_draw,
    "riser": v_riser, "impact": v_impact, "shimmer": v_shimmer, "chime": v_chime, "bed": None,
    "felt": v_felt, "swell": v_swell, "tick": v_tick,
}

# peak level (dBFS, pre-master) for gain=1.0, and reverb send
LEVEL_DB = {
    "click": -6, "softclick": -12, "whoosh": -14, "whoosh_out": -19, "cam": -26, "type": -15,
    "pop": -13, "dialog": -15, "draw": -25, "riser": -12, "impact": -5, "shimmer": -16,
    "chime": -9, "bed": -6, "felt": -10, "swell": -20, "tick": -20,
}
SEND = {
    "click": 0.06, "softclick": 0.06, "whoosh": 0.2, "whoosh_out": 0.15, "cam": 0.1, "type": 0.04,
    "pop": 0.3, "dialog": 0.25, "draw": 0.12, "riser": 0.35, "impact": 0.4, "shimmer": 0.45,
    "chime": 0.5, "bed": 0.3, "felt": 0.35, "swell": 0.3, "tick": 0.05,
}


# ----------------------------------------------------------------- master
def make_ir(rng, sec=2.4, predelay=0.018):
    n = int(sec * SR)
    t = tvec(n)
    ir = stereo_noise(n, rng, corr=0.0)
    # frequency-dependent decay: split into low/high bands with different RT
    lo = filt(ir, "lp", 2500, 2) * np.exp(-t / 0.55)
    hi = filt(ir, "hp", 2500, 2) * np.exp(-t / 0.28)
    ir = lo + 0.6 * hi
    ir = filt(ir, "hp", 200, 2)
    ir[:, :int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))
    ir /= np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))
    pd = int(predelay * SR)
    return np.concatenate([np.zeros((2, pd)), ir], axis=1)


def k_weight(x):
    b1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]
    a1 = [1.0, -1.69065929318241, 0.73248077421585]
    b2 = [1.0, -2.0, 1.0]
    a2 = [1.0, -1.99004745483398, 0.99007225036621]
    return signal.lfilter(b2, a2, signal.lfilter(b1, a1, x, axis=-1), axis=-1)


def integrated_lufs(x):
    """BS.1770-style gated integrated loudness (48 kHz)."""
    y = k_weight(x)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    if y.shape[1] < blk:
        return -70.0
    p = y ** 2
    cs = np.concatenate([np.zeros((2, 1)), np.cumsum(p, axis=1)], axis=1)
    starts = np.arange(0, y.shape[1] - blk + 1, hop)
    ms = (cs[:, starts + blk] - cs[:, starts]) / blk
    z = ms.sum(axis=0)
    lk = -0.691 + 10 * np.log10(np.maximum(z, 1e-12))
    g = z[lk > -70]
    if g.size == 0:
        return -70.0
    rel = -0.691 + 10 * np.log10(g.mean()) - 10
    g2 = z[(lk > -70) & (lk > rel)]
    return float(-0.691 + 10 * np.log10(g2.mean()))


def compress(x, thresh_db=-16.0, ratio=2.0, knee=6.0, att=0.008, rel=0.18):
    """Gentle RMS bus compressor, detector at 1 ms resolution."""
    hop = SR // 1000
    n = x.shape[1]
    nb = int(np.ceil(n / hop))
    p = np.pad(np.max(x ** 2, axis=0), (0, nb * hop - n)).reshape(nb, hop).mean(axis=1)
    lvl = 10 * np.log10(np.maximum(p, 1e-12))
    ov = lvl - thresh_db
    gr = np.where(ov <= -knee / 2, 0.0,
                  np.where(ov >= knee / 2, ov * (1 - 1 / ratio),
                           (1 - 1 / ratio) * (ov + knee / 2) ** 2 / (2 * knee)))
    ca, cr = np.exp(-1 / (att * 1000)), np.exp(-1 / (rel * 1000))
    sm = np.zeros(nb)
    s = 0.0
    for i in range(nb):
        g = gr[i]
        c = ca if g > s else cr
        s = c * s + (1 - c) * g
        sm[i] = s
    gain = db(-np.repeat(sm, hop)[:n])
    return x * gain


def limit(x, ceiling_db=-1.0, look_ms=2.5):
    c = db(ceiling_db)
    L = max(int(look_ms * SR / 1000), 1)
    pk = np.max(np.abs(x), axis=0)
    req = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    g = minimum_filter1d(req, size=2 * L + 1, mode="nearest")
    # averaging a min-filtered curve over a window no wider than the min window keeps g <= req
    g = uniform_filter1d(g, size=L, mode="nearest")
    y = x * g
    return np.clip(y, -c, c)


# ----------------------------------------------------------------- render
def render(spec, target_lufs=-18.0, ceiling_db=-1.0, seed=None, verbose=True):
    dur = float(spec["duration"])
    N = int(round(dur * SR))
    base_seed = int(seed if seed is not None else spec.get("seed", 1234))
    pad = int(6.0 * SR)  # room for tails; trimmed later
    dry = np.zeros((2, N + pad))
    send = np.zeros((2, N + pad))
    for idx, ev in enumerate(spec.get("events", [])):
        typ = ev.get("type")
        if typ not in VOICES:
            print(f"[sfx] skip unknown type {typ!r} at event {idx}", file=sys.stderr)
            continue
        t = float(ev.get("t", 0.0))
        if t < 0 or t >= dur:
            continue
        es = int(ev.get("seed", base_seed * 1000003 + idx * 7919 + zlib.crc32(typ.encode())) % (2 ** 32))
        rng = np.random.default_rng(es)
        x = v_bed(rng, ev, N) if typ == "bed" else VOICES[typ](rng, ev)
        g = float(ev.get("gain", 1.0))
        if typ == "bed":
            g = g if "gain" in ev else 0.15
        x = x * db(LEVEL_DB[typ]) * g
        i0 = int(round(t * SR))
        e = min(i0 + x.shape[1], N + pad)
        dry[:, i0:e] += x[:, :e - i0]
        send[:, i0:e] += x[:, :e - i0] * float(ev.get("send", SEND[typ]))
    rng = np.random.default_rng(base_seed + 99)
    wet = signal.oaconvolve(send, make_ir(rng), axes=1)[:, :N + pad]
    mix = (dry + wet)[:, :N]
    mix = filt(mix, "hp", 25, 2)
    mix = np.nan_to_num(mix)

    if not np.any(mix):
        out = mix
        stats = dict(lufs=-70.0, peak_db=-np.inf)
    else:
        def loud_gain(y):
            l = integrated_lufs(y)
            pk = np.max(np.abs(y))
            g = target_lufs - l
            # never ask the limiter for more than ~5 dB of gain reduction
            g = min(g, ceiling_db + 5.0 - 20 * np.log10(pk))
            return g
        g1 = loud_gain(mix)
        mix = mix * db(g1)
        pre = mix
        mix = compress(mix)
        comp_gr = 20 * np.log10(np.max(np.abs(pre)) / max(np.max(np.abs(mix)), 1e-12))
        g2 = loud_gain(mix)
        mix = mix * db(g2)
        pk_pre = 20 * np.log10(np.max(np.abs(mix)))
        out = limit(mix, ceiling_db)
        # if still below the ceiling, bring peaks up to it (without passing target loudness by >1 LU)
        pk = np.max(np.abs(out))
        headroom = ceiling_db - 20 * np.log10(pk)
        room = target_lufs + 1.0 - integrated_lufs(out)
        up = min(headroom, max(room, 0.0))
        if up > 0.05:
            out = out * db(up)
        stats = dict(lufs=integrated_lufs(out), peak_db=20 * np.log10(np.max(np.abs(out))),
                     gain_db=g1 + g2 + max(up, 0), limiter_db=max(pk_pre - ceiling_db, 0.0), comp_peak_db=comp_gr)
    fade_tail(out, 0.01)
    # TPDF dither to 16 bit
    drng = np.random.default_rng(base_seed + 7)
    d = (drng.random(out.shape) - drng.random(out.shape))
    pcm = np.clip(np.round(out * 32767 + d), -32767, 32767).astype(np.int16)
    if verbose:
        print(f"[sfx] {N} samples ({N / SR:.3f}s)  integrated {stats['lufs']:.1f} LUFS  "
              f"peak {stats['peak_db']:.2f} dBFS  (makeup {stats.get('gain_db', 0):+.1f} dB, "
              f"limiter <= {stats.get('limiter_db', 0):.1f} dB)")
    return pcm, stats


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("events")
    ap.add_argument("out")
    ap.add_argument("--lufs", type=float, default=-18.0)
    ap.add_argument("--ceiling", type=float, default=-1.0)
    ap.add_argument("--seed", type=int, default=None)
    a = ap.parse_args(argv)
    with open(a.events, encoding="utf-8") as f:
        spec = json.load(f)
    pcm, _ = render(spec, a.lufs, a.ceiling, a.seed)
    wavfile.write(a.out, SR, pcm.T.copy())


if __name__ == "__main__":
    main()
