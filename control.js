/* CONTRAPRESIÓN v2 · control del teléfono
 *
 * Usa el mismo protocolo MQTT de Tacto: tacto/<sala>/<dispositivo>/status | touch | motion
 * y agrega:
 *   status.caps.rol  'c1' | 'c2' | 'c3' | 'poc'   (puesto en la pantalla) · status.name = nombre del jugador
 *   touch.k          fuerza 0–1 ya calibrada (presión real, o diámetro del dedo si el teléfono no mide presión)
 *   …/evento         {tipo:'salto'}: el tirón se detecta aquí, con el acelerómetro a frecuencia completa
 * Escucha …/cmd: {ping} · {vib:[ms]} · {estado:'detenido'|'corriendo'|'espera'}
 */
'use strict';
const $ = s => document.querySelector(s);
const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch {} return null; };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const r3 = v => Math.round(v * 1000) / 1000;
const Q = new URLSearchParams(location.search);
const ES_CIUDADANO = r => r === 'c1' || r === 'c2' || r === 'c3';
const NOMBRE_ROL = { c1: 'Ciudadano 1', c2: 'Ciudadano 2', c3: 'Ciudadano 3', poc: 'POC' };
const VERSION = '11-11 soplo5';   // se ve arriba a la derecha del teléfono: confirma que el teléfono cargó la versión nueva

// ---------- entrada ----------
// El puesto no se elige: lo sortea la pantalla y llega por …/cmd {rol}. Se recuerda por sala, para no perderlo al recargar.
let rol = '';
$('#sala').value = Tacto.clean(Q.get('sala')) || Tacto.clean(ls('tacto.sala')) || '';
$('#nombre').value = ls('cp.nombre') || '';
const GUIA = {
  ciudadano: [['Inclina', 'el teléfono a un lado: cambias de calle'], ['Tira', 'el teléfono hacia arriba: saltas (o doble toque)'], ['Desliza', 'un dedo de arriba hacia abajo: te agachas bajo lo que cuelga'], ['Escudo', 'apoya 3 dedos: bloqueas el agua. Los tres escudos juntos la detienen']],
  poc: [['Sopla', 'al micrófono: sale el agua. Más fuerte, más agua'], ['Apunta', 'con el dedo: el agua cae donde tocas'], ['Toca', 'para encender balizas y sirena'], ['Agita', 'el teléfono: llena el estanque. Vacío, no sale agua']],
};
function recibirRol(r) {
  if (!NOMBRE_ROL[r]) return;
  const nuevo = r !== rol; rol = r;
  ls('cp.rol.' + sala, rol);
  document.body.className = 'tel grano ' + rol;
  $('#rolNombre').textContent = rol === 'poc' ? 'POC · lanzaaguas' : nombre || NOMBRE_ROL[rol];
  $('#guia').innerHTML = GUIA[rol === 'poc' ? 'poc' : 'ciudadano'].map(([a, b]) => `<div><b>${a}</b>${b}</div>`).join('');
  $('#aviso').textContent = nuevo ? `Te tocó: ${NOMBRE_ROL[rol]}${rol === 'poc' ? ' (carro lanzaaguas)' : ''}.` : $('#aviso').textContent;
  if (nuevo && navigator.vibrate) navigator.vibrate([60, 60, 60]);
  $('#btnMic').hidden = rol !== 'poc' || mic.on;   // el POC necesita el micrófono: se activa con un toque (lo exige el navegador)
  if (rol === 'poc' && !mic.on && mic.error) $('#aviso').textContent = mic.error;   // al POC se le explica cómo desbloquearlo
  publicarEstado();
}

// ---------- micrófono (POC): soplar suelta el agua ----------
// Soplar sobre el micrófono produce un ruido muy fuerte en los GRAVES (bajo 500 Hz): el viento golpea la cápsula.
// Se mide esa banda en decibeles, sobre el ruido de fondo de la sala (que se aprende solo), así funciona igual en
// iPhone y Android aunque cada micrófono tenga distinta ganancia.
// Se publica en el canal mic de Tacto: {t, l, b:[graves, medios, agudos]}, con l = soplo 0–1.
const SOPLO_DB = 26;        // dB sobre el fondo que cuentan como "soplar a fondo" (más bajo = más sensible)
const SOPLO_MIN_DB = 8;    // dB sobre el fondo que se ignoran (ruido de la sala, voces lejanas)
const mic = { on: false, ac: null, an: null, fdb: null, fd: null, piso: null, graves: 0, soplo: 0, bandas: [0, 0, 0] };
// se pide al tocar "Entrar" (todos los teléfonos, porque el puesto se sortea y cualquiera puede ser POC),
// y de nuevo con el botón amarillo si falló. Solo el POC lo analiza; a los ciudadanos no se les escucha.
async function activarMic(alEntrar = false) {
  if (mic.on) return;
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Este navegador no deja usar el micrófono aquí (necesita HTTPS).');
    // el AudioContext se crea DENTRO del toque, antes de esperar el permiso: si no, iPhone lo deja suspendido y mide silencio
    const ac = mic.ac || new (window.AudioContext || window.webkitAudioContext)(); mic.ac = ac; ac.resume();
    const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    await ac.resume();
    const an = ac.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0.2; an.minDecibels = -100; an.maxDecibels = -10;
    ac.createMediaStreamSource(st).connect(an);
    Object.assign(mic, { on: true, an, fdb: new Float32Array(an.frequencyBinCount), fd: new Uint8Array(an.frequencyBinCount), piso: null, n: 0 });
    $('#btnMic').hidden = true; pintarEstadoMic();
    if (!alEntrar || rol === 'poc') $('#aviso').textContent = 'Micrófono listo: sopla para soltar el agua.';
    publicarEstado();
  } catch (e) {
    pintarEstadoMic();
    const iphone = /iPhone|iPad/.test(navigator.userAgent);
    const motivo = e && e.name === 'NotAllowedError'
      ? `El micrófono está bloqueado para esta página. ${iphone ? 'En iPhone: toca "aA" en la barra de Safari → Ajustes del sitio web → Micrófono → Permitir, y recarga.' : 'En Android: toca el candado junto a la dirección → Permisos → Micrófono → Permitir, y recarga.'}`
      : e && e.name === 'NotFoundError' ? 'Este teléfono no tiene micrófono disponible.' : (e && e.message) || 'No se pudo usar el micrófono.';
    mic.error = motivo + ' Sin micrófono el POC no puede lanzar agua: el agua sale solo soplando.';
    if (rol === 'poc' || !alEntrar) { $('#aviso').textContent = mic.error; $('#btnMic').hidden = false; }
  }
}
function pintarEstadoMic() { $('#info').textContent = `sala ${sala} · mic ${mic.on ? '●' : '○'} · v${VERSION}`; }
setInterval(() => {
  if (!mic.on || rol !== 'poc') return;
  if (mic.ac && mic.ac.state !== 'running') mic.ac.resume();
  mic.an.getFloatFrequencyData(mic.fdb); mic.an.getByteFrequencyData(mic.fd);
  // energía de los graves (de ~40 a 500 Hz), promediando potencia y volviendo a dB
  const hz = mic.ac.sampleRate / mic.an.fftSize, hasta = Math.max(2, Math.round(500 / hz));
  let pot = 0; for (let i = 1; i <= hasta; i++) pot += Math.pow(10, Math.max(-140, mic.fdb[i]) / 10);
  const db = 10 * Math.log10(pot / hasta + 1e-14);
  // los primeros cuadros llegan vacíos (silencio digital): no sirven para aprender el fondo
  if (!isFinite(db) || db < -125) return;
  // ruido de fondo: el primer segundo se aprende rápido; después baja rápido y sube muy lento
  // (así un soplo largo no se vuelve "fondo")
  mic.n = (mic.n || 0) + 1;
  if (mic.piso == null || !isFinite(mic.piso)) mic.piso = db;
  const ritmo = mic.n < 30 ? 0.2 : db < mic.piso ? 0.3 : 0.004;
  mic.piso += (db - mic.piso) * ritmo;
  mic.graves = db - mic.piso;
  const n = mic.fd.length, banda = (a, b) => { let x = 0; for (let i = Math.floor(a * n); i < Math.floor(b * n); i++) x += mic.fd[i]; return x / ((b - a) * n * 255); };
  mic.bandas = [banda(0, 0.04), banda(0.04, 0.2), banda(0.2, 0.6)];
  const crudo = clamp((mic.graves - SOPLO_MIN_DB) / SOPLO_DB);
  mic.soplo += (crudo - mic.soplo) * (crudo > mic.soplo ? 0.6 : 0.35);   // sube rápido, baja rápido
  if (mic.soplo < 0.02) mic.soplo = 0;
  // se envía SOLO cuando cambia (o un latido cada 0,4 s). Enviar 30 mensajes por segundo llenaba la cola del broker:
  // el agua llegaba tarde (al dejar de soplar) y seguía saliendo un rato
  const ahora = performance.now(), cambio = Math.abs(mic.soplo - (mic.enviado ?? -1));
  if ((cambio > 0.04 && ahora - (mic.tEnvio || 0) > 66) || (mic.soplo === 0 && mic.enviado !== 0) || ahora - (mic.tEnvio || 0) > (mic.soplo > 0 ? 200 : 400)) {
    mic.enviado = mic.soplo; mic.tEnvio = ahora;
    pub('mic', { t: Date.now(), l: r3(mic.soplo), b: mic.bandas.map(v => Math.round(v * 100) / 100) });
  }
}, 33);

// ---------- MQTT ----------
let client = null, base = '', sala = '', nombre = '';
const dev = ls('tacto.dev') || (ls('tacto.dev', Tacto.rand(6)), ls('tacto.dev')) || Tacto.rand(6);
const pub = (kind, obj, qos = 0, retain = false) => client && client.connected && client.publish(`${base}/${kind}`, JSON.stringify(obj), { qos, retain });
const publicarEstado = () => pub('status', { online: true, name: nombre, caps: { rol, motion: motionOn, presion: calidadPresion(), mic: mic.on } }, 1, true);
let detenido = false, contra = 0, estanque = 1, seco = false, ultimaSacudida = 0, sacudida = 0;
// POC: agitar el teléfono llena el estanque. Cada sacudida es un evento {tipo:'agitar'}
function agitar() {
  const ahora = performance.now(); if (ahora - ultimaSacudida < 140) return; ultimaSacudida = ahora;
  pub('evento', { t: Date.now(), tipo: 'agitar' });
  sacudida = 1; if (navigator.vibrate) navigator.vibrate(12);
}

async function conectar() {
  base = `tacto/${sala}/${dev}`;
  const will = { topic: `${base}/status`, payload: JSON.stringify({ online: false, name: nombre, caps: { rol } }), qos: 1, retain: true };
  const o = await Tacto.open({ clientId: 'tel-' + dev, will });
  client = o.client;
  pintarEstadoMic();
  client.on('connect', () => { $('#estado').textContent = '● conectado'; $('#estado').className = 'on'; client.subscribe(`${base}/cmd`); publicarEstado(); });
  client.on('reconnect', () => { $('#estado').textContent = 'reconectando…'; $('#estado').className = 'mal'; });
  client.on('offline', () => { $('#estado').textContent = 'sin conexión'; $('#estado').className = 'mal'; });
  client.on('message', (t, p) => {
    try {
      const m = JSON.parse(p.toString());
      if (m.ping != null) pub('pong', { t: m.ping });
      if (m.vib && navigator.vibrate) navigator.vibrate(m.vib);
      if (m.estado) { detenido = m.estado === 'detenido'; $('#detenido').hidden = !detenido; }
      if (m.rol) recibirRol(m.rol);                        // la pantalla sorteó el puesto de este teléfono
      if (typeof m.contra === 'number') contra = m.contra;
      if (typeof m.estanque === 'number') { estanque = m.estanque; seco = !!m.seco; } // POC: agua que le queda
    } catch {}
  });
}

// ---------- fuerza: presión real o, si no existe, diámetro del contacto ----------
// Cada teléfono mide distinto: el contacto más chico visto es "apoyar" y el más grande es "aplastar".
const F = { fmin: 9, fmax: -1, n: 0, dmin: 1e9, dmax: 0 };
function calidadPresion() { return F.n < 15 ? 'sin datos aún' : F.fmax - F.fmin > 0.05 && F.fmax > 0.02 ? 'presión' : 'diámetro'; }
function fuerza(p) {
  if (!p.length) return 0;
  let k = 0;
  for (const z of p) {
    F.n++; F.fmin = Math.min(F.fmin, z.f); F.fmax = Math.max(F.fmax, z.f);
    if (z.d > 0) { F.dmin = Math.min(F.dmin, z.d); F.dmax = Math.max(F.dmax, z.d); }
    const porDiametro = z.d > 0 ? clamp((z.d - F.dmin) / Math.max(14, F.dmax - F.dmin)) : 0;
    k = Math.max(k, calidadPresion() === 'presión' ? z.f : porDiametro);
  }
  return clamp(k + (p.length - 1) * 0.15); // más dedos, más peso
}

// ---------- tacto ----------
const sup = $('#sup'), cv = $('#cv'), g = cv.getContext('2d');
let cur = { n: 0, p: [], ar: 1, k: 0 }, lastN = 0, cola = false;
function ajustar() { const d = devicePixelRatio || 1, r = sup.getBoundingClientRect(); cv.width = r.width * d; cv.height = r.height * d; g.setTransform(d, 0, 0, d, 0, 0); }
addEventListener('resize', ajustar);
const enviarTacto = qos => pub('touch', { t: Date.now(), n: cur.n, ar: cur.ar, k: r3(cur.k), p: cur.p.map(z => ({ i: z.i, x: r3(z.x), y: r3(z.y), f: r3(z.f), d: Math.round(z.d) })) }, qos);
function ponerToques(p, r) {
  cur = { n: p.length, p, ar: r3(r.width / r.height), k: fuerza(p) };
  if (cur.n !== lastN) { lastN = cur.n; enviarTacto(1); }
  else if (!cola) { cola = true; setTimeout(() => { cola = false; enviarTacto(0); }, 50); }   // al mover el dedo: 20 por segundo como máximo
}
const casillas = new Map();
function casilla(id) { if (casillas.has(id)) return casillas.get(id); const u = new Set(casillas.values()); for (let s = 1; s <= 5; s++) if (!u.has(s)) { casillas.set(id, s); return s; } return null; }
let ultimoToque = 0, desliz = null, baja = 0;
function agacharse() {
  pub('evento', { t: Date.now(), tipo: 'agacharse' }, 1);
  if (navigator.vibrate) navigator.vibrate(25);
  baja = 1;
}
function enToque(e) {
  e.preventDefault();
  const r = sup.getBoundingClientRect(), list = Array.from(e.targetTouches), ids = new Set(list.map(t => t.identifier));
  for (const id of [...casillas.keys()]) if (!ids.has(id)) casillas.delete(id);
  if (e.type === 'touchstart' && rol === 'poc' && seco && !motionOn) agitar(); // sin sensores (sin HTTPS): tocar rápido bombea agua
  if (e.type === 'touchstart' && ES_CIUDADANO(rol) && e.touches.length === 1) { // doble toque: salto de respaldo
    const ahora = performance.now(); if (ahora - ultimoToque < 280) saltar('doble toque'); ultimoToque = ahora;
  }
  // agacharse: deslizar UN dedo de arriba hacia abajo (rápido y vertical)
  if (ES_CIUDADANO(rol)) {
    const t0 = e.touches[0];
    if (e.type === 'touchstart' && e.touches.length === 1) desliz = { y: (t0.clientY - r.top) / r.height, x: (t0.clientX - r.left) / r.width, t: performance.now(), hecho: false };
    else if (e.type === 'touchmove' && desliz && !desliz.hecho && e.touches.length === 1) {
      const dy = (t0.clientY - r.top) / r.height - desliz.y, dx = Math.abs((t0.clientX - r.left) / r.width - desliz.x);
      if (dy > 0.18 && dy > dx * 1.3 && performance.now() - desliz.t < 700) { desliz.hecho = true; agacharse(); }
    } else if (e.touches.length !== 1) desliz = null;
  }
  const p = [];
  for (const t of list) {
    const i = casilla(t.identifier); if (!i) continue;
    const rx = t.radiusX ?? t.webkitRadiusX ?? 0, ry = t.radiusY ?? t.webkitRadiusY ?? 0;
    p.push({ i, x: clamp((t.clientX - r.left) / r.width), y: clamp((t.clientY - r.top) / r.height), f: t.force ?? t.webkitForce ?? 0, d: rx + ry });
  }
  ponerToques(p.sort((a, b) => a.i - b.i), r);
}
['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(n => sup.addEventListener(n, enToque, { passive: false }));
['gesturestart', 'gesturechange'].forEach(n => document.addEventListener(n, e => e.preventDefault()));
sup.addEventListener('contextmenu', e => e.preventDefault());
// ratón (pruebas en computador): mantener apretado sube la fuerza poco a poco
let raton = null;
sup.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') return; sup.setPointerCapture(e.pointerId); raton = { e, t0: performance.now() }; });
sup.addEventListener('pointermove', e => { if (raton) raton.e = e; });
const soltar = () => { if (!raton) return; raton = null; ponerToques([], sup.getBoundingClientRect()); };
sup.addEventListener('pointerup', soltar); sup.addEventListener('pointercancel', soltar);
setInterval(() => { if (!raton) return; const r = sup.getBoundingClientRect(), e = raton.e, k = clamp((performance.now() - raton.t0) / 1500);
  ponerToques([{ i: 1, x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height), f: k, d: 20 + k * 40 }], r); }, 33);

// ---------- giro, aceleración y salto ----------
let motionOn = false, ligado = false, ang = [0, 0, 0], rot = [0, 0, 0], acc = [0, 0, 0], sucio = false, ultimoSalto = 0, pico = 0;
async function pedirMovimiento() {
  for (const R of [window.DeviceMotionEvent, window.DeviceOrientationEvent])
    if (R && typeof R.requestPermission === 'function') {
      const r = await R.requestPermission();
      if (r !== 'granted') throw new Error('Permiso de movimiento denegado. En iPhone: cierra Safari por completo y vuelve a entrar.');
    }
}
function saltar(origen) {
  const ahora = performance.now(); if (ahora - ultimoSalto < 650) return; ultimoSalto = ahora;
  pub('evento', { t: Date.now(), tipo: 'salto', origen }, 1);
  if (navigator.vibrate) navigator.vibrate(40);
  pico = 1;
}
function ligarMovimiento() {
  if (ligado) return; ligado = true;
  addEventListener('deviceorientation', e => { ang = [e.alpha || 0, e.beta || 0, e.gamma || 0]; sucio = true; });
  addEventListener('devicemotion', e => {
    const r = e.rotationRate, a = e.accelerationIncludingGravity;
    if (r) rot = [r.beta || 0, r.gamma || 0, r.alpha || 0];
    if (a) {
      acc = [a.x || 0, a.y || 0, a.z || 0];
      // tirón: la aceleración total se aleja mucho de la gravedad (9,8 m/s²). Solo se usa la magnitud (iOS invierte los signos).
      if (ES_CIUDADANO(rol) && Math.hypot(...acc) - 9.81 > 7) saltar('tirón');
      if (rol === 'poc' && Math.abs(Math.hypot(...acc) - 9.81) > 6) agitar(); // sacudir el teléfono: el agua entra al estanque
    }
    sucio = true;
  });
  // giro: 20 veces por segundo como máximo, y solo si cambió al menos medio grado (o un latido cada 0,5 s)
  let enviadoAng = null, tAng = 0;
  setInterval(() => { if (!motionOn || !sucio) return; sucio = false;
    const ahora = performance.now(), cambio = enviadoAng ? Math.max(...ang.map((v, i) => Math.abs(v - enviadoAng[i]))) : 99;
    if (cambio < 0.5 && ahora - tAng < 500) return;
    enviadoAng = [...ang]; tAng = ahora;
    pub('motion', { t: Date.now(), a: ang.map(v => Math.round(v * 10) / 10), r: rot.map(v => Math.round(v)), c: acc.map(v => Math.round(v * 10) / 10) }); }, 50);
}

// ---------- dibujo de la superficie ----------
const color = () => getComputedStyle(document.body).getPropertyValue('--color').trim() || '#efe9dc';
function dibujar() {
  const r = sup.getBoundingClientRect(), W = r.width, H = r.height, t = performance.now() / 1000;
  g.clearRect(0, 0, W, H);
  const gam = clamp(ang[2] / 40, -1, 1), col = color();
  if (ES_CIUDADANO(rol)) {
    const carril = ang[2] < -18 ? 0 : ang[2] > 18 ? 2 : 1;   // mismo umbral que la pantalla (CONFIG.inclinacionCarril)
    for (let i = 0; i < 3; i++) { g.globalAlpha = i === carril ? 0.25 : 0.05; g.fillStyle = i === carril ? col : '#efe9dc'; g.fillRect(i * W / 3 + 3, H * 0.45, W / 3 - 6, H * 0.55); }
    g.globalAlpha = 1; g.strokeStyle = 'rgba(239,233,220,.35)'; g.setLineDash([10, 12]);
    for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(i * W / 3, H * 0.45); g.lineTo(i * W / 3, H); g.stroke(); } g.setLineDash([]);
    const bx = W / 2 + gam * (W / 2 - 30); g.fillStyle = col; g.beginPath(); g.ellipse(bx, H * 0.36 + baja * 30, 16 + pico * 14, (16 + pico * 14) * (1 - baja * 0.5), 0, 0, 7); g.fill(); pico *= 0.9;
    if (baja > 0.05) { g.globalAlpha = baja; g.fillStyle = '#efe9dc'; g.font = '900 28px "Big Shoulders Stencil Display", Impact, sans-serif'; g.textAlign = 'center'; g.fillText('↓ AGACHADO', W / 2, H * 0.22); g.globalAlpha = 1; }
    baja *= 0.95;
    for (const z of cur.p) { g.fillStyle = 'rgba(239,233,220,.12)'; g.beginPath(); g.arc(z.x * W, z.y * H, 40 + z.d, 0, 7); g.fill(); }
    // escudo: con exactamente 3 dedos (mismo valor que CONFIG.dedosEscudo en la pantalla) se levanta y se ve aquí
    const DEDOS_ESCUDO = 3, arriba = cur.n === DEDOS_ESCUDO;
    if (arriba) {
      const w = W * 0.5, h = H * 0.36, x0 = W / 2 - w / 2, y0 = H * 0.5;
      g.fillStyle = '#23252f'; g.strokeStyle = col; g.lineWidth = 6;
      g.beginPath(); g.roundRect ? g.roundRect(x0, y0, w, h, 14) : g.rect(x0, y0, w, h); g.fill(); g.stroke(); g.lineWidth = 1;
      g.fillStyle = col; g.fillRect(x0 + w * 0.12, y0 + h * 0.44, w * 0.76, h * 0.12);
      g.beginPath(); g.arc(W / 2, y0 + h * 0.24, Math.min(w, h) * 0.12, 0, 7); g.fill();
    }
    if (cur.n) {
      g.fillStyle = '#efe9dc'; g.font = '700 13px "Space Mono", monospace'; g.textAlign = 'center';
      g.fillText(arriba ? 'ESCUDO ARRIBA · BLOQUEAS EL AGUA' : cur.n > DEDOS_ESCUDO ? `SOLO ${DEDOS_ESCUDO} DEDOS PARA EL ESCUDO (${cur.n})` : `APOYA ${DEDOS_ESCUDO} DEDOS PARA EL ESCUDO (${cur.n})`, W / 2, H - 18);
    }
    $('#rolDato').textContent = `${nombre || NOMBRE_ROL[rol]} · inclinación ${Math.round(ang[2])}° · calle ${['izquierda', 'centro', 'derecha'][carril]}`;
  } else if (rol === 'poc') {
    // con micrófono, la fuerza es el soplo y el umbral es más bajo (mismo valor que CONFIG.umbralSoplo en la pantalla)
    // el agua sale solo soplando (mismo umbral que CONFIG.umbralSoplo en la pantalla); sin micrófono no hay agua
    const k = mic.on ? mic.soplo : 0, umbral = 0.12, on = cur.n > 0 || (mic.on && k > umbral);
    if (on) { const azul = Math.floor(t * 6) % 2; g.fillStyle = azul ? 'rgba(31,91,255,.30)' : 'rgba(232,32,42,.22)'; g.fillRect(0, 0, W, H); }
    // medidor: la barra sube al soplar; sobre la línea amarilla sale agua
    g.fillStyle = 'rgba(239,233,220,.06)'; g.fillRect(W - 46, 90, 26, H - 120);
    g.fillStyle = k > umbral ? '#6f95ff' : '#efe9dc'; g.fillRect(W - 46, 90 + (H - 120) * (1 - k), 26, (H - 120) * k);
    g.strokeStyle = '#ffd400'; g.beginPath(); g.moveTo(W - 52, 90 + (H - 120) * (1 - umbral)); g.lineTo(W - 14, 90 + (H - 120) * (1 - umbral)); g.stroke();
    if (mic.on) { g.fillStyle = '#a39f95'; g.font = '700 10px "Space Mono", monospace'; g.textAlign = 'center'; g.fillText(k > umbral ? 'AGUA' : 'SOPLA', W - 33, 82); }
    for (const z of cur.p) { g.strokeStyle = '#efe9dc'; g.lineWidth = 2; g.beginPath(); g.arc(z.x * W, z.y * H, 24 + k * 60, 0, 7); g.stroke(); }
    g.lineWidth = 1;
    // contrapresión: los escudos de los ciudadanos empujan desde arriba contra el agua
    if (contra > 0.02) { g.fillStyle = `rgba(239,233,220,${0.08 + contra * 0.25})`; g.fillRect(0, 0, W, H * 0.5 * contra); }
    const apunta = on && cur.p.length ? cur.p[0].x * 2 - 1 : gam;
    g.fillStyle = '#2f4a32'; const vx = W / 2 + apunta * (W / 2 - 60); g.fillRect(vx - 28, H - 70, 56, 40);
    g.fillStyle = Math.floor(t * 6) % 2 ? '#1f5bff' : '#e8202a'; g.fillRect(vx - 14, H - 80, 28, 10);
    const resiste = contra > 0.1 ? ` · ${Math.round(contra * 3)} escudo${Math.round(contra * 3) === 1 ? '' : 's'} arriba` : '';
    // estanque: barra horizontal abajo; al agitar se sacude
    const sx = (Math.random() - 0.5) * sacudida * 10; sacudida *= 0.85;
    g.strokeStyle = 'rgba(239,233,220,.35)'; g.strokeRect(16 + sx, H - 22, W - 80, 10);
    g.fillStyle = seco ? '#ffd400' : '#6f95ff'; g.fillRect(16 + sx, H - 22, (W - 80) * estanque, 10);
    if (seco) { // estanque vacío: el dedo no saca agua hasta llenarlo agitando
      g.fillStyle = 'rgba(7,8,13,.6)'; g.fillRect(0, 0, W, H - 30);
      g.fillStyle = '#ffd400'; g.font = '900 34px "Big Shoulders Stencil Display", Impact, sans-serif'; g.textAlign = 'center';
      g.fillText('SIN AGUA', W / 2 + sx, H / 2); g.font = '700 14px "Space Mono", monospace';
      g.fillText(motionOn ? '¡AGITA EL TELÉFONO!' : 'TOCA RÁPIDO PARA BOMBEAR', W / 2, H / 2 + 28);
      g.fillText(`estanque ${Math.round(estanque * 100)} %`, W / 2, H / 2 + 50);
      $('#rolDato').textContent = `sin agua · ${motionOn ? 'agita' : 'toca rápido'} para llenar el estanque`;
    } else {
      $('#rolDato').textContent = !mic.on ? 'SIN MICRÓFONO NO HAY AGUA · toca "Activar micrófono"'
        : k > umbral ? `AGUA · fuerza ${Math.round(k * 100)} %${resiste}`
        : `sopla al micrófono · graves +${Math.max(0, Math.round(mic.graves))} dB`;
    }
  }
  requestAnimationFrame(dibujar);
}

// ---------- entrar ----------
async function despertar() { try { await navigator.wakeLock?.request('screen'); } catch {} }
$('#btnMic').onclick = () => activarMic();
$('#ir').onclick = async () => {
  sala = Tacto.clean($('#sala').value);
  if (sala.length < 4) { $('#err').textContent = 'Escribe la sala que muestra la pantalla (mínimo 4 caracteres).'; return; }
  nombre = $('#nombre').value.trim().slice(0, 14);
  ls('tacto.sala', sala); ls('cp.nombre', nombre);
  rol = NOMBRE_ROL[ls('cp.rol.' + sala)] ? ls('cp.rol.' + sala) : ''; // si recargó en la misma sala, conserva su puesto
  // micrófono: se pide AQUÍ, en el mismo toque de "Entrar" (iPhone y Android solo muestran el permiso tras un toque)
  const pidiendoMic = activarMic(true);
  try { await pedirMovimiento(); ligarMovimiento(); motionOn = true; }
  catch (e) { $('#aviso').textContent = e.message + ' Sin giro, juega solo con el tacto.'; }
  if (!window.isSecureContext) $('#aviso').textContent = 'Los sensores de movimiento necesitan HTTPS: abre la versión publicada en GitHub Pages.';
  $('#rolNombre').textContent = 'Sorteando puesto…';
  $('#rolDato').textContent = 'mira la pantalla grande';
  if (rol) recibirRol(rol);
  $('#entrar').hidden = true; $('#jugar').hidden = false; pintarEstadoMic();
  pidiendoMic.then(() => { if (rol === 'poc') { $('#btnMic').hidden = mic.on; if (!mic.on && mic.error) $('#aviso').textContent = mic.error; } });
  ajustar(); dibujar(); despertar();
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && despertar());
  setInterval(publicarEstado, 3000);
  conectar().catch(e => { $('#estado').textContent = 'no se pudo conectar'; $('#aviso').textContent = e.message || String(e); });
};
