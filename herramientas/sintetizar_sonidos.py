"""
CONTRAPRESIÓN · síntesis de los sonidos del juego.

Todos los sonidos se generan desde cero con este script (ruido, osciladores y
envolventes), sin grabaciones ni muestras de terceros. Por eso su autoría es
propia y se publican bajo CC0 1.0 (dominio público).

Uso:  python3 herramientas/sintetizar_sonidos.py
Salida: sonidos/*.wav (mono, 44.1 kHz, 16 bit)
"""
import os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "sonidos")
rng = np.random.default_rng(2019)  # semilla fija: el mismo archivo cada vez


def t(dur):
    return np.arange(int(SR * dur)) / SR


def noise(dur):
    return rng.uniform(-1, 1, int(SR * dur))


def bp(x, lo, hi, order=2):
    b, a = butter(order, [lo / (SR / 2), hi / (SR / 2)], btype="band")
    return lfilter(b, a, x)


def lp(x, f, order=2):
    b, a = butter(order, f / (SR / 2), btype="low")
    return lfilter(b, a, x)


def hp(x, f, order=2):
    b, a = butter(order, f / (SR / 2), btype="high")
    return lfilter(b, a, x)


def env(n, a=0.005, d=0.2, curve=4.0):
    """Ataque lineal + caída exponencial."""
    tt = np.arange(n) / SR
    e = np.where(tt < a, tt / max(a, 1e-6), np.exp(-(tt - a) * curve / max(d, 1e-6)))
    return e


def fade(x, ms=8):
    n = int(SR * ms / 1000)
    x[:n] *= np.linspace(0, 1, n)
    x[-n:] *= np.linspace(1, 0, n)
    return x


def save(name, x, gain=0.9):
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    wavfile.write(os.path.join(OUT, name), SR, (x * 32767).astype(np.int16))
    print(f"{name:22s} {len(x) / SR:4.2f} s")


def seamless(x, ms=120):
    """Cruza el final con el inicio para que el bucle no haga clic."""
    n = int(SR * ms / 1000)
    head, tail = x[:n].copy(), x[-n:].copy()
    w = np.linspace(0, 1, n)
    x = x[:-n].copy()
    x[:n] = tail * (1 - w) + head * w
    return x


os.makedirs(OUT, exist_ok=True)

# 1. paso: golpe sordo de zapatilla sobre asfalto
d = 0.32
x = lp(noise(d), 900) * env(int(SR * d), 0.002, 0.06, 5)
x += np.sin(2 * np.pi * 70 * t(d)) * env(int(SR * d), 0.002, 0.05, 6) * 0.8
x += bp(noise(d), 2500, 6000) * env(int(SR * d), 0.001, 0.015, 6) * 0.25  # roce de grava
save("paso.wav", fade(x), 0.8)

# 2. salto: impulso + soplo que sube
d = 0.55
sweep = np.sin(2 * np.pi * np.cumsum(np.linspace(180, 900, int(SR * d))) / SR)
x = sweep * env(int(SR * d), 0.01, 0.35, 3) * 0.35
x += bp(noise(d), 800, 3500) * np.sin(np.pi * t(d) / d) ** 2 * 0.6
save("salto.wav", fade(x), 0.7)

# 3. carril: roce lateral corto (ropa + zapatilla)
d = 0.3
x = bp(noise(d), 1500, 7000) * np.sin(np.pi * t(d) / d) ** 3
save("carril.wav", fade(x), 0.55)

# 4. sirena: lamento de dos tonos (bucle de 4 s; el juego le cambia la velocidad con la presión)
d = 4.0
f = 650 + 300 * (0.5 + 0.5 * np.sin(2 * np.pi * t(d) / 2.0 - np.pi / 2))
ph = 2 * np.pi * np.cumsum(f) / SR
x = np.sign(np.sin(ph)) * 0.35 + np.sin(ph) * 0.5 + np.sin(2 * ph) * 0.2
x = lp(x, 3500)
save("sirena.wav", fade(x, 4), 0.6)

# 5. chorro: agua a presión (bucle de 3 s)
d = 3.2
n = noise(d)
x = bp(n, 300, 5000, 3) * 0.7 + hp(n, 6000) * 0.3
x *= 1 + 0.15 * np.sin(2 * np.pi * 7.3 * t(d)) + 0.08 * rng.standard_normal(int(SR * d)).cumsum() / 4000
save("chorro.wav", seamless(x), 0.75)

# 6. impacto de agua: golpe contra el cuerpo + salpicadura
d = 0.9
x = lp(noise(d), 400) * env(int(SR * d), 0.003, 0.12, 4)
x += bp(noise(d), 1200, 8000) * env(int(SR * d), 0.01, 0.6, 3) * 0.7
for k in range(14):  # gotas que caen
    s = int(SR * rng.uniform(0.15, 0.8))
    g = int(SR * 0.03)
    if s + g < len(x):
        fr = rng.uniform(1200, 3200)
        x[s:s + g] += np.sin(2 * np.pi * fr * t(0.03) * (1 + t(0.03) * 8)) * env(g, 0.001, 0.01, 4) * 0.25
save("impacto_agua.wav", fade(x), 0.85)

# 7. motor: diésel del vehículo blindado, ralentí grave (bucle de 2 s)
d = 2.0
rpm = 32.0
ph = 2 * np.pi * rpm * t(d)
x = (np.sin(ph) + 0.6 * np.sin(2 * ph) + 0.4 * np.sign(np.sin(ph * 0.5)) * 0.5)
x *= 0.6 + 0.4 * (np.sin(ph * 2) > 0.3)
x += lp(noise(d), 250) * 1.5
x = lp(x, 600)
save("motor.wav", seamless(x), 0.7)

# 8. valla: sacudida metálica de la valla papal al saltarla
d = 1.2
x = np.zeros(int(SR * d))
for fr, amp, dec in [(410, 1, 0.5), (1130, .6, 0.35), (1920, .45, 0.25), (2870, .3, 0.2), (3960, .2, 0.15)]:
    x += np.sin(2 * np.pi * fr * t(d)) * amp * env(int(SR * d), 0.001, dec, 4)
x *= 1 + 0.4 * np.sin(2 * np.pi * 9 * t(d))  # traqueteo
x += bp(noise(d), 2000, 7000) * env(int(SR * d), 0.001, 0.05, 5) * 0.8
save("valla.wav", fade(x), 0.7)

# 9. cacerola: golpe de cuchara contra olla (se usa como hito de avance)
d = 0.8
x = np.zeros(int(SR * d))
for fr, amp, dec in [(720, 1, 0.45), (1855, .7, 0.3), (2990, .55, 0.22), (4410, .35, 0.15), (5200, .2, 0.1)]:
    x += np.sin(2 * np.pi * fr * t(d) + rng.uniform(0, 6)) * amp * env(int(SR * d), 0.0005, dec, 5)
x += hp(noise(d), 3000) * env(int(SR * d), 0.0005, 0.02, 6) * 1.2
save("cacerola.wav", fade(x, 3), 0.75)

# 10. silbato: pito policial con trino
d = 1.1
fr = 2900 + 120 * np.sign(np.sin(2 * np.pi * 26 * t(d)))
x = np.sin(2 * np.pi * np.cumsum(fr) / SR) + bp(noise(d), 2500, 3500) * 0.4
x *= np.minimum(1, t(d) * 30) * np.minimum(1, (d - t(d)) * 12)
save("silbato.wav", fade(x), 0.55)

# 11. detenido: portazo metálico grave + golpe seco
d = 1.6
x = lp(noise(d), 180) * env(int(SR * d), 0.002, 0.25, 4) * 2
for fr, amp, dec in [(95, 1, 0.9), (233, .6, 0.6), (517, .4, 0.4), (1210, .2, 0.25)]:
    x += np.sin(2 * np.pi * fr * t(d)) * amp * env(int(SR * d), 0.002, dec, 4)
save("detenido.wav", fade(x), 0.95)

# 12. latido: pulso del cuerpo que se cubre (bucle de 1 s, ~72 ppm)
d = 0.84
x = np.zeros(int(SR * d))
for s, a in [(0.0, 1.0), (0.18, 0.6)]:
    i = int(SR * s)
    seg = np.sin(2 * np.pi * 48 * t(0.16)) * env(int(SR * 0.16), 0.004, 0.08, 4) * a
    x[i:i + len(seg)] += seg
x = lp(x, 160)
save("latido.wav", fade(x, 4), 0.9)


# 13. multitud: coro lejano de voces (bucle de 4 s). YA NO SE USA EN EL JUEGO: lo reemplazó sonidos/estallido.mp3.
#     Se deja aquí por si se quiere volver a generar; el juego no lo carga.
d = 4.0
x = np.zeros(int(SR * d))
pulso = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * t(d) * 1.5))          # ritmo de consigna, 3 sílabas por segundo
for v in range(40):
    f0 = rng.uniform(140, 330)
    vib = 1 + 0.01 * np.sin(2 * np.pi * rng.uniform(4, 6) * t(d) + rng.uniform(0, 6))
    ph = 2 * np.pi * np.cumsum(f0 * vib) / SR
    voz = sum(np.sin(k * ph) / k for k in range(1, 9))                  # diente de sierra suave: cuerdas vocales
    a = rng.uniform(0.3, 1)
    x += voz * a
x = bp(x, 500, 1500) * 1.0 + bp(x, 2200, 3000) * 0.4                   # formantes de una "a" abierta
x *= 0.55 + 0.45 * lp(pulso, 6)
x += bp(noise(d), 300, 3000) * 0.25                                      # rumor de gente
save("multitud.wav", seamless(x, 200), 0.6)

# 14. fuego: crepitar de barricada (bucle de 3 s)
d = 3.0
x = lp(noise(d), 500) * 0.6
for k in range(260):
    s0 = int(SR * rng.uniform(0, d - 0.02)); g = int(SR * rng.uniform(0.002, 0.012))
    chispa = hp(rng.uniform(-1, 1, g), 1500)
    x[s0:s0 + g] += chispa * rng.uniform(0.3, 1.4) * np.exp(-np.arange(g) / (g / 4))
save("fuego.wav", seamless(x, 150), 0.6)

# 15. dron: zumbido grave de la ciudad de noche (bucle de 5 s): cinemática y toque de queda
d = 5.0
x = np.zeros(int(SR * d))
for f, a in [(55, 1), (82.4, .6), (110.3, .35), (164.8, .2)]:
    x += np.sin(2 * np.pi * f * t(d) + 0.6 * np.sin(2 * np.pi * 0.2 * t(d))) * a
x *= 0.8 + 0.2 * np.sin(2 * np.pi * t(d) / d)
x += lp(noise(d), 200) * 0.6
save("dron.wav", seamless(x, 250), 0.6)

print("listo:", OUT)
