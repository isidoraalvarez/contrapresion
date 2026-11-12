/* CONTRAPRESIÓN v2 · pantalla compartida
 *
 * Cuatro teléfonos por MQTT (librería tacto.js):
 *   CIUDADANOS 1·2·3   inclinación (ang.g) → calle · tirón (evento salto) → salto
 *                      2 dedos (touch.n) → levanta el ESCUDO, que bloquea el agua (contrapresión)
 *                      deslizar un dedo hacia abajo (evento agacharse) → se agacha bajo lo que cuelga
 *   POC                posición del dedo (touch.x) → dónde cae el agua · inclinación (ang.g) → carro, si no toca
 *                      toque (touch.down) → balizas y sirena · SOPLO al micrófono (mic.level) → agua (único gesto del agua)
 *   Agua en la pantalla = fuerza del POC × (1 − escudos arriba de los ciudadanos en carrera / 3 × CONFIG.contrapresion)
 * Se juega SOLO con teléfonos: mínimo 2 (el POC y un ciudadano). Los puestos sin teléfono no corren.
 *
 * Índice
 *   1. CONFIG              niveles, textos, nombre del antagonista
 *   2. TELÉFONOS (MQTT)    asignación de puestos y lectura de canales
 *   3. TECLADO Y RATÓN
 *   4. AUDIO
 *   5. ESTADO Y FLUJO      inicio → cinemática → sala → nivel → resultado
 *   6. SIMULACIÓN
 *   7. DIBUJO
 *   8. ARRANQUE
 */
'use strict';

// ============================ 1. CONFIG ============================
const CONFIG = {
  // Nombre del antagonista simbólico (no es un jugador). Aparece en carteles y pasacalles del nivel 3. Por cambiar.
  antagonista: 'KAST',
  // Dirección pública del juego (GitHub Pages), para que los QR funcionen aunque abras la pantalla desde VS Code.
  // Ej: 'https://usuario.github.io/contrapresion/'. Si queda vacía, los QR usan la dirección de esta página.
  urlPublica: 'https://isidoraalvarez.github.io/contrapresion/',
  anchoCarril: 1.25,          // metros
  inclinacionCarril: 14,      // grados de inclinación lateral (ang.g, ya corregida en el teléfono) para cambiar de calle
  histeresis: 5,             // margen para volver al centro (evita que tiemble entre dos calles)
  suavizadoGiro: 7,           // qué tan rápido sigue al giro (más bajo = más calmado, más lento)
  pausaCarril: 0.28,          // segundos sin poder cambiar de calle tras un cambio
  pausaSalto: 0.5,            // segundos sin cambiar de calle tras un salto (el tirón mueve el teléfono)
  inclinacionCarro: 35,       // grados de ang.g para llevar el carro al borde
  umbralSoplo: 0.12,          // soplo mínimo (0–1) para que salga agua. Más bajo = basta un soplo suave
  contrapresion: 0.9,         // cuánta agua bloquean los tres escudos juntos (0–1). Un escudo bloquea un tercio de eso
  dedosEscudo: 2,             // dedos apoyados (exactamente) para levantar el escudo
  duracionAgachado: 0.9,      // segundos que queda agachado tras deslizar un dedo hacia abajo
  volumenProtesta: 0.85,      // volumen de la multitud protestando (InspectorJ, Freesound), la calle de fondo (0–1)
  llenadoPorSacudida: 0.07,   // cada sacudida del teléfono del POC llena esto del estanque (~15 sacudidas = lleno)
  saltarCinematica: 3,        // segundos que hay que mantener apretado para saltar la cinemática
  esperaDerrota: 3,           // segundos que se ve "Protesta disuelta" antes de volver a la sala con nuevo sorteo
  esperaFinal: 12,            // segundos que se ve "Llegaron a La Moneda" antes de volver a la sala con nuevo sorteo
  esperaSiguiente: 7,         // segundos que se muestran las estrellas antes de pasar al siguiente nivel
  niveles: [
    {
      nombre: 'El Estallido', fecha: 'Octubre 2019', desde: 'Alameda', hasta: 'Plaza Dignidad',
      texto: 'Barricadas improvisadas, señales arrancadas. Los muros hablan. El estanque del carro se vacía rápido.',
      meta: 500, vel: [9, 12.5], separacion: [15, 23], dobles: 0.3,
      chorro: 2, niebla: 0,     // estanque: 2 s de chorro a toda fuerza. Solo se vuelve a llenar agitando el teléfono del POC
      mezcla: { bajo: 0.45, alto: 0.35, colgante: 0.2 },
      tipos: { bajo: 'barricada', alto: 'senal', colgante: 'semaforo' },
      muro: 'multitud', rayados: ['EVADE', 'DESPERTÓ', 'NO +', 'DIGNIDAD', 'NO SON 30 PESOS', 'RENUNCIA'],
      cielo: 'dia', hito: 'plaza', ambiente: 'fuego',
    },
    {
      nombre: 'El Toque de Queda', fecha: '2020 · Pandemia', desde: 'Universidad de Chile', hasta: 'Cerro Santa Lucía',
      texto: 'Noche profunda y gas en el aire. No se ve nada: solo los destellos de las balizas muestran lo que viene.',
      meta: 550, vel: [10, 13.5], separacion: [15, 22], dobles: 0.35,
      chorro: 2.5, niebla: 0.92,
      mezcla: { bajo: 0.45, alto: 0.3, colgante: 0.25 },
      tipos: { bajo: 'valla', alto: 'toque', colgante: 'cinta' },
      muro: 'cortinas', rayados: ['NO OLVIDAMOS', 'RESISTE', '18/O', 'HAMBRE', 'NI PERDÓN NI OLVIDO'],
      cielo: 'noche', hito: 'hambre', ambiente: 'dron',
    },
    {
      nombre: 'La Elección', fecha: 'Camino a La Moneda', desde: 'Alameda', hasta: 'La Moneda',
      texto: 'Muros limpios, carteles gigantes, vallas alineadas. Todo va muy rápido. El estanque del carro es más grande.',
      meta: 700, vel: [15, 20], separacion: [13, 19], dobles: 0.6,
      chorro: 3, niebla: 0,
      mezcla: { bajo: 0.42, alto: 0.38, colgante: 0.2 },
      tipos: { bajo: 'valla', alto: 'cartel', colgante: 'pasacalle' },
      muro: 'carteles', rayados: [],
      cielo: 'gris', hito: 'moneda', ambiente: null,
    },
  ],
  // Cinemática: cada placa dura `s` segundos.
  cinematica: [
    { s: 4.5, fecha: 'Santiago de Chile', texto: '18 de octubre de 2019' },
    { s: 6, fecha: 'Metro de Santiago', texto: 'El pasaje sube 30 pesos.', nota: 'Estudiantes secundarios saltan los torniquetes. En los muros aparece una palabra: EVADE.' },
    { s: 6.5, fecha: '25 de octubre de 2019', texto: 'Más de un millón de personas en la calle.', nota: 'Una de las marchas más grandes de la historia de Chile. En los carteles se lee: «No son 30 pesos, son 30 años».' },
    { s: 6, fecha: 'Plaza Italia → Plaza Dignidad', texto: 'La plaza cambia de nombre.', nota: 'Cada tarde llegan el agua, el gas y las luces. El carro lanzaaguas se vuelve parte del paisaje.' },
    // la ironía: de la revuelta por una vida digna al voto por "el orden", y lo que vino después
    { s: 6.5, fecha: 'Unos años después', texto: 'El país que salió a pedir dignidad votó por el orden.', nota: 'Vueltas que da la vida. Los muros se pintaron de gris.' },
    { s: 6, fecha: 'Hoy', texto: 'Sube la bencina. Se recortan los beneficios.', nota: 'Todo va a estar bien. Eso dicen los carteles.' },
    { s: 6, fecha: 'Ahora', texto: 'Tres personas corren por la Alameda.', nota: '¿Qué hicieron? Mandaron un meme burlándose del gobierno.' },
    { s: 6.5, fecha: 'Ahora', texto: 'No es el crimen del siglo.', nota: 'Igual viene el agua detrás. Si una cae, las otras siguen. Mientras una llegue, la voz sigue viva.' },
    { s: 4, titulo: true },
  ],
};
const COLORES = ['#e8202a', '#3d8bff', '#22c16b'];
const PUESTOS = ['c1', 'c2', 'c3', 'poc'];

// ============================ utilidades ============================
const $ = s => document.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const rnd = (a, b) => a + Math.random() * (b - a);
const suave = (dt, vel) => 1 - Math.exp(-dt * vel);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const Q = new URLSearchParams(location.search);

// ============================ 2. TELÉFONOS (MQTT) ============================
const tacto = new Tacto();
const jugadores = { c1: null, c2: null, c3: null, poc: null };   // id del teléfono en cada puesto
const ultimoTacto = {}, calib = {}, ultimoMic = {}, desfase = {};

function rolDe(d) {
  const r = (d.caps && d.caps.rol) || '';
  if (PUESTOS.includes(r)) return r;
  if (r === 'carabinero') return 'poc';                       // control de la versión 1
  if (r === 'ciudadano') return 'c';
  const n = (d.name || '').toLowerCase();                     // control original de Tacto: decide el nombre
  if (/poc|carab|paco|zorr|guanac|polic/.test(n)) return 'poc';
  return '';
}
function asignar() {
  for (const k of PUESTOS) { const d = tacto.devices[jugadores[k]]; if (!d || !d.online) jugadores[k] = null; }
  const usados = () => new Set(Object.values(jugadores).filter(Boolean));
  const libres = [];
  for (const d of Object.values(tacto.devices)) {
    if (!d.online || usados().has(d.id)) continue;
    const r = rolDe(d);
    if (PUESTOS.includes(r) && !jugadores[r]) jugadores[r] = d.id;    // ya tenía puesto en esta sala (por ejemplo, recargó la página)
    else if (r === 'c') { const k = ['c1', 'c2', 'c3'].find(k => !jugadores[k]); if (k) jugadores[k] = d.id; }
    else libres.push(d);
  }
  // los puestos se sortean: nadie elige si es ciudadano o POC
  for (const d of libres) { const vacios = PUESTOS.filter(k => !jugadores[k]); if (vacios.length) jugadores[vacios[Math.floor(Math.random() * vacios.length)]] = d.id; }
  asegurarPOC();
  avisarPuestos();
  // el nombre que escribió la persona en su teléfono pasa a la pantalla
  ['c1', 'c2', 'c3'].forEach((k, i) => { const d = tacto.devices[jugadores[k]]; if (d && d.name && d.name !== d.id) corredores[i].nombre = d.name.slice(0, 14); });
  pintarPuestos(); pintarFichas();
}
// cada teléfono recibe el puesto que le tocó (…/cmd {rol}); se repite hasta que el teléfono lo confirma en su status
function avisarPuestos(forzar = false) {
  for (const k of PUESTOS) { const d = tacto.devices[jugadores[k]]; if (d && (forzar || (d.caps && d.caps.rol) !== k)) ordenar(k, { rol: k }, forzar ? 0 : 1000); }
}
// con dos teléfonos o más, uno SIEMPRE es el POC: si nadie tiene el carro, se le pasa a un ciudadano al azar.
// Solo fuera de la carrera (en la sala), para no cambiarle el puesto a nadie mientras corre.
function asegurarPOC() {
  if (jugadores.poc || ['placa', 'juego', 'resultado'].includes(estado.fase)) return;
  const ciud = ['c1', 'c2', 'c3'].filter(k => jugadores[k]);
  if (ciud.length < 2) return;
  const k = ciud[Math.floor(Math.random() * ciud.length)], i = +k[1] - 1;
  jugadores.poc = jugadores[k]; jugadores[k] = null; corredores[i].nombre = `Ciudadano ${i + 1}`;
}
// sortear de nuevo los teléfonos conectados entre los cuatro puestos (con 2 o más, uno es el POC)
function sortearPuestos() {
  const ids = PUESTOS.map(k => jugadores[k]).filter(Boolean);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  const ciudadanos = ['c1', 'c2', 'c3'].sort(() => Math.random() - 0.5);
  const orden = ids.length >= 2 ? ['poc', ...ciudadanos] : [...PUESTOS].sort(() => Math.random() - 0.5);
  PUESTOS.forEach(k => { jugadores[k] = null; });
  ids.forEach((id, i) => { jugadores[orden[i]] = id; });
  corredores.forEach((c, i) => { c.nombre = `Ciudadano ${i + 1}`; });
  ['c1', 'c2', 'c3'].forEach((k, i) => { const d = tacto.devices[jugadores[k]]; if (d && d.name && d.name !== d.id) corredores[i].nombre = d.name.slice(0, 14); });
  avisarPuestos(true); pintarPuestos(); pintarFichas();
}
tacto.on('dispositivo', asignar);
tacto.on('estado', s => { const el = $('#conexion'); el.textContent = s === 'conectado' ? '● MQTT conectado' : s; el.classList.toggle('on', s === 'conectado'); });
tacto.on('datos', (d, kind, m) => {
  if (!Object.values(jugadores).includes(d.id)) asignar();
  if (kind === 'touch') ultimoTacto[d.id] = m;
  if (kind === 'mic') {
    // soplo atrasado: si el mensaje llega con más de 0,6 s de retraso (cola del broker), no se usa.
    // El reloj del teléfono no coincide con el de la pantalla: se estima la diferencia con el mensaje más rápido visto.
    const dif = Date.now() - (m.t || Date.now());
    desfase[d.id] = desfase[d.id] == null ? dif : Math.min(desfase[d.id] + 2, dif);
    if (dif - desfase[d.id] > 600) d.ch['mic.level'] = 0;
    else ultimoMic[d.id] = performance.now();
  }
  if (kind === 'evento' && m.tipo === 'agitar' && jugadores.poc === d.id) estado.agitar = (estado.agitar || 0) + 1; // el POC agita: entra agua al estanque
  if (kind === 'evento' && m.tipo === 'agacharse') { const i = ['c1', 'c2', 'c3'].findIndex(k => jugadores[k] === d.id); if (i >= 0) corredores[i].agachaHasta = estado.t + CONFIG.duracionAgachado; }
  if (kind === 'evento') { d._evento = true; if (m.tipo === 'salto') { const i = ['c1', 'c2', 'c3'].findIndex(k => jugadores[k] === d.id); if (i >= 0) corredores[i].quiereSaltar = true; } }
  if (kind === 'motion' && m.c && !d._evento && !(d.caps && PUESTOS.includes(d.caps.rol))) { // solo para el control original de Tacto (el nuestro detecta el tirón en el teléfono)
    const i = ['c1', 'c2', 'c3'].findIndex(k => jugadores[k] === d.id);
    if (i >= 0 && Math.hypot(m.c[0], m.c[1], m.c[2]) - 9.81 > 8) corredores[i].quiereSaltar = true;
  }
});
tacto.on('rtt', () => pintarPuestos());
const canal = (puesto, nombre) => (jugadores[puesto] ? tacto.get(nombre, jugadores[puesto]) : null);
// fuerza del agua: el SOPLO al micrófono del POC (canal mic.level). Sin micrófono, la presión del dedo como respaldo
const POCsopla = () => { const id = jugadores.poc; return !!(id && ultimoMic[id] && performance.now() - ultimoMic[id] < 700); };
// el agua sale SOLO soplando: sin micrófono no hay agua (ni el dedo ni otro gesto la activan)
function fuerzaPOC() {
  const id = jugadores.poc; if (!id || !POCsopla()) return 0;
  return performance.now() - ultimoMic[id] > 600 ? 0 : clamp(canal('poc', 'mic.level') || 0);   // sin noticias recientes: no sale agua
}
// escudo: un ciudadano apoya 2 dedos sobre su vidrio → levanta el escudo (0/1).
// (La palma entera no sirve: los teléfonos la descartan como toque accidental.)
function escudoDe(puesto) {
  return (canal(puesto, 'touch.n') || 0) === CONFIG.dedosEscudo ? 1 : 0;   // exactamente 2: ni 1 ni 3
}
const ultimaOrden = {};
function ordenar(puesto, msg, cada = 0) { // la pantalla le habla al teléfono: vibración y estado
  const id = jugadores[puesto]; if (!id || !tacto.client || !tacto.client.connected) return;
  const llave = puesto + Object.keys(msg)[0]; // cada tipo de orden lleva su propio ritmo
  const ahora = performance.now(); if (cada && ahora - (ultimaOrden[llave] || 0) < cada) return; ultimaOrden[llave] = ahora;
  tacto.client.publish(`tacto/${tacto.sala}/${id}/cmd`, JSON.stringify(msg));
}

// ============================ 3. TECLADO (solo la pantalla: sonido, cinemática, sala) ============================
// Los jugadores se juegan SOLO con el teléfono. El teclado del computador no controla a nadie.
const teclas = new Set();
let saltarCine = 0;
addEventListener('keydown', e => {
  if (e.target.matches && e.target.matches('input')) return;
  if (e.code === 'Space') e.preventDefault();
  if (e.repeat) return;
  teclas.add(e.code);
  if (e.code === 'KeyM') audio.silenciar();
  if (e.code === 'Minus' || e.code === 'NumpadSubtract') audio.ponerVolumen(audio.volumen - 0.1);
  if (e.code === 'Equal' || e.code === 'NumpadAdd' || e.code === 'BracketRight') audio.ponerVolumen(audio.volumen + 0.1);
  if (estado.pausa && e.code === 'KeyR') reanudar(0);
  if (estado.pausa && e.code === 'Escape') volverASala();
  if (e.code === 'Enter' && estado.fase === 'sala') salirALaCalle();
  if (e.code === 'Enter' && estado.fase === 'inicio') $('#btnInicio').click();
});
addEventListener('keyup', e => teclas.delete(e.code));
addEventListener('blur', () => teclas.clear());
const cv = $('#escena');
// saltar la cinemática: mantener espacio / Enter / el botón
const btnSaltar = $('#saltar');
btnSaltar.addEventListener('pointerdown', e => { btnSaltar.setPointerCapture(e.pointerId); btnSaltar._abajo = true; });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => btnSaltar.addEventListener(n, () => { btnSaltar._abajo = false; }));

// ============================ 4. AUDIO ============================
const SONIDOS = ['pasos', 'salto', 'carril', 'sirena', 'chorro', 'impacto_agua', 'motor', 'valla', 'cacerola', 'silbato', 'detenido', 'latido', 'fuego', 'dron', 'protesta'];
const BUCLES = ['motor', 'sirena', 'chorro', 'latido', 'fuego', 'dron', 'protesta', 'pasos', 'cacerolazo'];
// todos los archivos se llaman como el sonido (sonidos/<nombre>.wav); la autoría de los externos está en el README.
// protesta.wav y cacerola.wav se pasaron de 24 a 16 bits: algunos navegadores no reproducían los de 24 bits.
const ARCHIVO = { pasos: 'pasos.mp3' };                     // el único que no es .wav
// los sonidos largos se cortan al usarlos como golpe (segundos): la cacerola trae varios golpes, se usa uno
const DURACION = { cacerola: 1.2, silbato: 1.1 };
// ganancia por sonido: los archivos externos vienen grabados mucho más bajos que los sintetizados
// (medido: multitud −24 dB, cacerola −24,5 dB, pasos −39 dB de volumen promedio, contra −12 dB del motor).
// Se suben para que la calle, la sirena y el cacerolazo se escuchen claros.
const GANANCIA = { protesta: 4.5, cacerola: 3.5, cacerolazo: 3, sirena: 2.2, pasos: 4, fuego: 1.8, valla: 1.5, motor: 0.7 };
// bucles que reutilizan el archivo de otro sonido: el cacerolazo de fondo es el mismo archivo de la cacerola, en bucle
const BUFFER_DE = { cacerolazo: 'cacerola' };
const ganancia = n => GANANCIA[n] || 1;
const VERSION_SONIDOS = 9;   // igual que el ?v= de index.html: evita que el navegador use sonidos viejos guardados
const rutaSonido = n => `sonidos/${encodeURIComponent(ARCHIVO[n] || n + '.wav')}?v=${VERSION_SONIDOS}`;
const DEL_POC = new Set(['sirena', 'chorro', 'impacto_agua']); // suenan encima de todo; el resto ("el mundo") se apaga bajo el agua
const audio = {
  ctx: null, buf: {}, bucles: {}, mudo: false, modoElem: false, el: {}, sordera: 0,
  volumen: (() => { try { const v = parseFloat(localStorage.getItem('cp.volumen')); return isFinite(v) ? clamp(v) : 0.8; } catch { return 0.8; } })(),
  // volumen general de la pantalla (0–1), desde el control del computador
  ponerVolumen(v) {
    this.volumen = clamp(v); try { localStorage.setItem('cp.volumen', this.volumen); } catch {}
    if (this.salida) this.salida.gain.setTargetAtTime(this.mudo ? 0 : 0.9 * this.volumen, this.ctx.currentTime, 0.03);
    pintarVolumen();
  },
  async iniciar() {
    if (this.ctx) { this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = (this.ctx = new C());
    // compresor + ganancia final: todo suena más fuerte sin saturar (el compresor aplana los picos y la ganancia sube el resto)
    const comp = ctx.createDynamicsCompressor();
    // compresión suave: una compresión fuerte hacía que la sirena "aplastara" a la calle y al cacerolazo
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3.5; comp.attack.value = 0.01; comp.release.value = 0.25;
    const fuerte = ctx.createGain(); fuerte.gain.value = 2.0; comp.connect(fuerte); fuerte.connect(ctx.destination);
    this.salida = ctx.createGain(); this.salida.gain.value = this.mudo ? 0 : 0.9 * this.volumen; this.salida.connect(comp);
    this.mundo = ctx.createBiquadFilter(); this.mundo.type = 'lowpass'; this.mundo.frequency.value = 18000; this.mundo.connect(this.salida);
    // cada bucle empieza APENAS se carga su archivo (antes se esperaba a que cargaran los 15, y los archivos grandes
    // —la multitud y la sirena— dejaban la historia en silencio los primeros segundos)
    await Promise.all(SONIDOS.map(async n => {
      try {
        this.buf[n] = await ctx.decodeAudioData(await (await fetch(rutaSonido(n))).arrayBuffer());
        if (BUCLES.includes(n)) this.bucle(n);
        for (const [bucle, de] of Object.entries(BUFFER_DE)) if (de === n) this.bucle(bucle);   // p. ej. el cacerolazo de fondo
        if (n === 'chorro' && this.bucles.chorro) { // el chorro se abre (más agudo, más áspero) con la fuerza del soplo
          const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
          this.bucles.chorro.src.disconnect(); this.bucles.chorro.src.connect(f); f.connect(this.bucles.chorro.g); this.filtroChorro = f;
        }
      } catch (e) { console.warn('No se pudo cargar', rutaSonido(n), e && e.message); /* abierto como archivo: se usa el respaldo */ }
    }));
    if (!Object.keys(this.buf).length) { this.elementos(); return; }
    // si falta algún sonido (por ejemplo, no se subió a GitHub), se avisa en pantalla con el nombre del archivo
    const faltan = SONIDOS.filter(n => !this.buf[n]).map(n => ARCHIVO[n] || n + '.wav');
    if (faltan.length) {
      const el = document.createElement('div'); el.id = 'avisoSonido'; el.setAttribute('role', 'alert');
      el.textContent = `No se pudieron cargar estos sonidos: ${faltan.join(', ')}. Revisa que estén en la carpeta sonidos/ (también en GitHub).`;
      document.body.appendChild(el); setTimeout(() => el.remove(), 15000);
    }
  },
  // abierto con doble clic (file://) el navegador no deja leer los .wav con fetch: se usan etiquetas <audio>
  elementos() {
    this.modoElem = true;
    for (const n of SONIDOS) { const a = new Audio(rutaSonido(n)); a.preload = 'auto'; a.preservesPitch = false; this.el[n] = a; }
    for (const n of BUCLES) { const a = BUFFER_DE[n] ? new Audio(rutaSonido(BUFFER_DE[n])) : this.el[n]; a.loop = true; a.volume = 0; a.play().catch(() => {}); this.bucles[n] = { elem: a }; }
  },
  bucle(n) {
    const buf = this.buf[BUFFER_DE[n] || n]; if (!buf || this.bucles[n]) return;
    const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
    src.buffer = buf; src.loop = true; g.gain.value = 0; src.connect(g); g.connect(DEL_POC.has(n) ? this.salida : this.mundo); src.start();
    this.bucles[n] = { src, g };
  },
  nivel(n, v, rate) {
    const b = this.bucles[n]; if (!b) return;
    v *= ganancia(n);
    if (b.elem) { const k = DEL_POC.has(n) ? 1 : 1 - this.sordera * 0.75; b.elem.volume = this.mudo ? 0 : clamp(v * k * this.volumen); if (rate) b.elem.playbackRate = clamp(rate, 0.5, 2); return; }
    const t = this.ctx.currentTime; b.g.gain.setTargetAtTime(v, t, 0.06); if (rate) b.src.playbackRate.setTargetAtTime(rate, t, 0.08);
  },
  tocar(n, vol = 1, rate = 1, pan = 0) {
    if (!this.ctx) return;
    vol *= ganancia(n);
    if (this.modoElem) {
      if (this.mudo || !this.el[n]) return;
      const a = this.el[n].cloneNode(); a.preservesPitch = false; a.volume = clamp(vol * 0.9 * this.volumen * (DEL_POC.has(n) ? 1 : 1 - this.sordera * 0.75)); a.playbackRate = clamp(rate, 0.5, 2); a.play().catch(() => {});
      if (DURACION[n]) setTimeout(() => a.pause(), DURACION[n] * 1000 / a.playbackRate);
      return;
    }
    if (!this.buf[n]) return;
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(), p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    s.buffer = this.buf[n]; s.playbackRate.value = rate; g.gain.value = vol; s.connect(g);
    const destino = DEL_POC.has(n) ? this.salida : this.mundo;
    if (p) { p.pan.value = clamp(pan, -1, 1); g.connect(p); p.connect(destino); } else g.connect(destino);
    const t = this.ctx.currentTime, dur = DURACION[n];
    if (dur) { // corta el sonido largo con un desvanecimiento breve (sin chasquido)
      const fin = t + dur / rate; g.gain.setValueAtTime(vol, fin - 0.08); g.gain.linearRampToValueAtTime(0, fin); s.start(t, 0); s.stop(fin + 0.02);
    } else s.start();
  },
  // el agua ensordece: todo lo que no es del POC (pasos, multitud, fuego) se oye como bajo el agua
  ensordecer(k) { this.sordera = k; if (this.mundo) this.mundo.frequency.setTargetAtTime(lerp(18000, 900, k), this.ctx.currentTime, 0.08); },
  silenciar() {
    this.mudo = !this.mudo;
    if (this.salida) this.salida.gain.value = this.mudo ? 0 : 0.9 * this.volumen;
    if (this.modoElem) for (const b of Object.values(this.bucles)) b.elem.muted = this.mudo;
    pintarVolumen();
  },
};
// control de volumen en la pantalla del computador (no depende de los teléfonos)
const volRango = $('#volRango'), volBoton = $('#volBoton');
function pintarVolumen() {
  if (!volRango) return;
  const v = audio.mudo ? 0 : audio.volumen;
  volRango.value = Math.round(audio.volumen * 100);
  volRango.style.setProperty('--lleno', Math.round(v * 100) + '%');
  $('#volValor').textContent = audio.mudo ? 'silencio' : Math.round(audio.volumen * 100) + ' %';
  volBoton.setAttribute('aria-pressed', audio.mudo);
  volBoton.setAttribute('aria-label', audio.mudo ? 'Activar sonido' : 'Silenciar');
  document.getElementById('volumen').classList.toggle('mudo', audio.mudo || audio.volumen === 0);
}
if (volRango) {
  volRango.addEventListener('input', () => { if (audio.mudo) audio.silenciar(); audio.ponerVolumen(volRango.value / 100); });
  // al soltar, el foco vuelve al juego: las flechas son del ciudadano verde, no del volumen
  ['change', 'pointerup'].forEach(n => volRango.addEventListener(n, () => volRango.blur()));
  volBoton.addEventListener('click', () => { audio.silenciar(); volBoton.blur(); });
  pintarVolumen();
}

// ============================ 5. ESTADO Y FLUJO ============================
const ZJ = 6.5;   // profundidad a la que corren los ciudadanos (m delante de la cámara)
const corredores = [0, 1, 2].map(i => ({
  i, nombre: `Ciudadano ${i + 1}`, color: COLORES[i],
  carril: i, x: (i - 1) * CONFIG.anchoCarril, xv: 0, y: 0, vy: 0, cub: 0, fasePaso: i * 0.33,
  vivo: true, llego: false, salida: 0, quiereSaltar: false, carrilTeclado: null,
}));
const estado = {
  fase: 'inicio',          // inicio | cine | sala | placa | juego | resultado
  nivel: 0, t: 0, faseT: 0,
  metros: 0, vel: 9, obst: [], proxFila: 30, hitos: 100,
  vehX: 0, apunta: 0, balizas: 0, fuerza: 0, agua: 0, estanque: 1, ruido: 0, flash: 0,
  gotas: [], particulas: [], cineI: 0, cineT: 0, despues: null, estrellas: [], estrellasMax: [],
};
const nivelActual = () => CONFIG.niveles[estado.nivel];
const vivos = () => corredores.filter(c => c.vivo);

function irA(fase) {
  estado.fase = fase; estado.faseT = 0;
  $('#inicio').hidden = fase !== 'inicio';
  $('#cine').hidden = fase !== 'cine'; btnSaltar.hidden = fase !== 'cine';
  $('#sala').hidden = fase !== 'sala';
  $('#placa').hidden = !(fase === 'placa' || fase === 'resultado');
  $('#hud').hidden = !(fase === 'juego' || fase === 'placa');
  if (fase !== 'juego') $('#sellos').innerHTML = '';
}

// ---------- inicio y cinemática ----------
$('#btnInicio').onclick = () => { audio.iniciar(); irA('cine'); estado.cineI = -1; estado.cineT = 0; siguientePlaca(); };
function siguientePlaca() {
  estado.cineI++; estado.cineT = 0;
  const p = CONFIG.cinematica[estado.cineI];
  if (!p) return terminarCine();
  $('#cinePlaca').innerHTML = p.titulo
    ? `<p class="fecha">Plaza Dignidad · Alameda · La Moneda</p><h2 class="marca" style="font-size:clamp(70px,14vw,190px)"><span class="contra">Contra</span><br><span class="presion">presión</span></h2>`
    : `<p class="fecha">${esc(p.fecha)}</p><p class="texto">${esc(p.texto)}</p>${p.nota ? `<p class="nota">${esc(p.nota)}</p>` : ''}`;
  // (sin cacerola en la historia: el cacerolazo suena solo durante la carrera)
}
function terminarCine() { saltarCine = 0; irA('sala'); pintarPuestos(); pintarQR(); }

// ---------- sala ----------
function pintarPuestos() {
  const cont = $('#puestos'); if (!cont) return;
  if (!cont.children.length) {
    cont.innerHTML = PUESTOS.map((k, i) => `
      <article class="puesto ${k}">
        <h3>${k === 'poc' ? 'POC · lanzaaguas' : 'Ciudadano ' + (i + 1)}</h3>
        <div class="estado" id="est-${k}">libre · no juega</div>
        <div class="teclas">${k === 'poc' ? 'Policía del Orden de Chile. Sopla para el agua, el dedo apunta, agita para llenar el estanque.' : 'Inclina, tira para saltar, desliza hacia abajo para agacharte, 2 dedos para el escudo.'}</div>
      </article>`).join('');
  }
  PUESTOS.forEach(k => {
    const d = tacto.devices[jugadores[k]], on = !!(d && d.online);
    const rtt = d && d.rtt.length ? ' · ' + Math.round([...d.rtt].sort((a, b) => a - b)[d.rtt.length >> 1]) + ' ms' : '';
    const apodo = on && d.name && d.name !== d.id && k !== 'poc' ? ` · ${d.name.slice(0, 14)}` : '';
    // ciudadano conectado: solo su apodo
    const i = PUESTOS.indexOf(k), nombre = apodo ? d.name.slice(0, 14) : (k !== 'poc' ? corredores[i].nombre : '');
    const el = $('#est-' + k); el.textContent = on ? (k === 'poc' ? `● le tocó a un teléfono${rtt}` : nombre) : 'libre · no juega'; el.classList.toggle('on', on);
    el.closest('.puesto').classList.toggle('vacio', !on);
  });
  // se juega solo con teléfonos: hacen falta al menos 2 (el POC y un ciudadano). Los puestos libres no corren.
  const listo = puedeSalir(), btn = $('#btnSalir');
  if (btn) { btn.disabled = !listo; btn.title = listo ? '' : 'Faltan teléfonos'; }
  const falta = $('#faltan');
  if (falta) falta.textContent = listo ? '' : 'Se necesitan al menos dos jugadores';
}
const ciudadanosConTelefono = () => ['c1', 'c2', 'c3'].filter(k => { const d = tacto.devices[jugadores[k]]; return d && d.online; });
function puedeSalir() { const d = tacto.devices[jugadores.poc]; return !!(d && d.online) && ciudadanosConTelefono().length >= 1; }
const qrLib = () => window.qrcode ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
async function servidorLocal() { try { const i = await (await fetch('info', { cache: 'no-store' })).json(); return i && i.baseUrl; } catch { return null; } }
async function pintarQR() {
  $('#salaId').textContent = tacto.sala;
  if (window.CP_VISTA_PREVIA) { $('#qrUnico').textContent = 'QR en la versión publicada'; return; }
  const local = await servidorLocal();
  let base = null;
  if (CONFIG.urlPublica) base = new URL('control.html', CONFIG.urlPublica.replace(/\/?$/, '/'));
  else if (local) base = new URL('control.html', local + '/');
  else if (location.protocol.startsWith('http')) base = new URL('control.html', location.href);
  const aviso = $('#avisoQR');
  // sin texto bajo el QR: solo se avisa si algo impide conectar los teléfonos
  if (!base) { aviso.innerHTML = '<b>Sin códigos QR:</b> la página está abierta como archivo. Ábrela desde GitHub Pages.'; return; }
  aviso.innerHTML = base.protocol === 'http:' && !/localhost|127\./.test(base.host)
    ? '<b>Ojo:</b> los teléfonos abrirán una página sin HTTPS y no podrán usar el micrófono ni la inclinación. Usa GitHub Pages.'
    : '';
  // un solo código para todos: lleva la sala, no el puesto (el puesto lo sortea la pantalla)
  const u = new URL(base); u.search = ''; u.searchParams.set('sala', tacto.sala);
  if (Q.get('broker')) u.searchParams.set('broker', Q.get('broker'));
  const caja = $('#qrUnico');
  try {
    if (local && !CONFIG.urlPublica) { caja.innerHTML = `<img alt="Código QR para entrar a la sala" src="qr.svg?u=${encodeURIComponent(u.href)}">`; return; }
    await qrLib(); const q = window.qrcode(0, 'M'); q.addData(u.href); q.make();
    caja.innerHTML = `<img alt="Código QR para entrar a la sala" src="${q.createDataURL(6, 1)}">`;
  } catch { caja.textContent = 'sin internet para el QR'; }
}
$('#btnSortear').onclick = () => sortearPuestos();
$('#btnNuevaSala').onclick = () => { tacto.cambiarSala(); PUESTOS.forEach(k => { jugadores[k] = null; }); pintarQR(); pintarPuestos(); };
$('#btnSalir').onclick = () => salirALaCalle();
function salirALaCalle() { if (!puedeSalir()) return; if (document.activeElement) document.activeElement.blur(); empezarNivel(0); }

// ---------- niveles ----------
function empezarNivel(n) {
  estado.nivel = n;
  if (n === 0) { estado.estrellas = []; estado.estrellasMax = []; }   // partida nueva: las estrellas parten de cero
  const niv = nivelActual();
  Object.assign(estado, { metros: 0, vel: niv.vel[0], obst: [], proxFila: 32, hitos: 100, estanque: 1, recargando: false, gotas: [], particulas: [], agua: 0 });
  // solo corren los ciudadanos que tienen teléfono; los puestos libres no aparecen
  corredores.forEach((c, i) => { const activo = !!jugadores['c' + (i + 1)]; Object.assign(c, { activo, vivo: activo, llego: false, salida: activo ? 0 : 1, carril: i, carrilTeclado: null, x: (i - 1) * CONFIG.anchoCarril, y: 0, vy: 0, cub: 0, escudo: 0, agachaHasta: 0, quiereSaltar: false }); });
  estado.enJuego = corredores.filter(c => c.activo).length;
  PUESTOS.forEach(k => ordenar(k, { estado: 'corriendo' }));   // nuevo nivel: todos los teléfonos sacan el mensaje de resultado
  $('#hudNum').textContent = `Nivel ${n + 1} de ${CONFIG.niveles.length}`;
  $('#hudNivel').textContent = niv.nombre; $('#hudFecha').textContent = niv.fecha;
  $('#hudDesde').textContent = niv.desde; $('#hudHasta').textContent = niv.hasta;
  $('#hudEstanque').classList.remove('recargando');
  $('#hudEstanqueTxt').textContent = 'POC · estanque';
  pintarFichas();
  irA('placa'); $('#placa').className = 'capa';
  estado.despues = 'juego';
}
function pintarPlacaNivel() {
  const niv = nivelActual(), n = 3 - Math.floor(estado.faseT - 2.2);
  $('#placaCaja').innerHTML = `
    <p class="num">Nivel ${estado.nivel + 1} de ${CONFIG.niveles.length} · ${esc(niv.fecha)}</p>
    <h2 class="titulo">${esc(niv.nombre)}</h2>
    <p class="sub">${esc(niv.desde)} → ${esc(niv.hasta)} · ${niv.meta} m</p>
    <p class="det">${esc(niv.texto)}</p>
    <div class="cuenta${estado.faseT < 2.2 ? ' vacia' : ''}">${estado.faseT < 2.2 ? '&nbsp;' : n > 0 ? n : '¡Corre!'}</div>`;
}
function terminarNivel(ganan) {
  const niv = nivelActual(), ultimo = estado.nivel === CONFIG.niveles.length - 1;
  const enJuego = corredores.filter(c => c.activo), na = Math.max(1, enJuego.length);
  const nombres = enJuego.map(c => `<span class="c${c.i + 1}${c.llego ? '' : ' fuera'}" style="--color:${c.color}">${esc(c.nombre)}</span>`).join('');
  irA('resultado');
  // estrellas: una por cada persona que llega a la meta, sobre las que jugaban. La nota es del grupo, no de quien llegó
  const llegan = enJuego.filter(c => c.llego).length;
  // con 2 jugadores (el POC y un solo ciudadano), llegar a la meta vale siempre las 3 estrellas
  const solo = enJuego.length === 1, n = solo && llegan ? 3 : llegan, nMax = solo ? 3 : na;
  if (ganan) { estado.estrellas[estado.nivel] = n; estado.estrellasMax[estado.nivel] = nMax; }
  const total = estado.estrellas.reduce((s, x) => s + (x || 0), 0);
  const max = CONFIG.niveles.reduce((s, _, i) => s + (estado.estrellasMax[i] ?? nMax), 0);
  const numero = ['', 'una', 'dos', 'tres'];
  const frase = solo ? 'Llegó a la meta.' : llegan === na ? `Llegaron ${na === 2 ? 'las dos' : 'las tres'} personas juntas.` : `Llegaron ${numero[llegan]} de ${numero[na]}.`;
  const premio = ['', 'Una estrella', 'Dos estrellas', 'Tres estrellas'][n];
  const motivo = solo ? 'por llegar a la meta' : llegan === 1 ? 'por sobrevivir una persona' : llegan === na ? `por sobrevivir ${na === 2 ? 'las dos' : 'las tres'} personas` : `por sobrevivir ${numero[llegan]} personas`;
  if (ganan) setTimeout(() => sonarEstrellas(n), 450);
  avisarResultado(ganan, ultimo, n);
  if (ganan && ultimo) {
    $('#placa').className = 'capa final';
    $('#placaCaja').innerHTML = `<p class="num">Fin del recorrido</p><h2 class="titulo">Llegaron a La Moneda</h2>${estrellasHTML(n, nMax)}<div class="nombres">${nombres}</div>
      <p class="sub">${frase} Recorrido completo: <b>${total} de ${max}</b> estrellas · ${CONFIG.niveles.map((v, i) => `${esc(v.nombre)} ${'★'.repeat(estado.estrellas[i] || 0)}${'☆'.repeat(Math.max(0, (estado.estrellasMax[i] ?? nMax) - (estado.estrellas[i] || 0)))}`).join(' · ')}</p>
      <p class="det">${total === max ? 'Nadie quedó atrás.' : 'Bastó con que una persona llegara, pero la voz es más fuerte cuando llegan todas.'} Las vallas siguen ahí, los carteles también. La calle sigue hablando.</p>
      <p class="siguiente">Volviendo a la sala · nuevo sorteo de puestos en <span id="cuentaSig">${CONFIG.esperaFinal}</span></p>`;
    // fin de la partida ganando: igual que al perder, vuelve sola a la sala y sortea de nuevo los puestos
    estado.despues = 'salaFinal';
  } else if (ganan) {
    $('#placa').className = 'capa';
    const sig = CONFIG.niveles[estado.nivel + 1];
    $('#placaCaja').innerHTML = `<p class="num">Nivel ${estado.nivel + 1} superado · Llegaron a ${esc(niv.hasta)}</p>${estrellasHTML(n, nMax)}
      <h2 class="titulo premio">${premio}</h2>
      <p class="sub">${motivo} · llevan <b>${total} de ${max}</b> estrellas</p>
      <div class="nombres">${nombres}</div>
      <p class="det">Quienes quedaron fuera vuelven a correr en el siguiente nivel.</p>
      <p class="siguiente">Siguiente nivel: <b>${esc(sig.nombre)}</b> en <span id="cuentaSig">${CONFIG.esperaSiguiente}</span></p>`;
    estado.despues = 'siguiente';
  } else {
    $('#placa').className = 'capa disuelta';
    $('#placaCaja').innerHTML = `<p class="num">${esc(niv.nombre)} · ${Math.floor(estado.metros)} de ${niv.meta} m</p><h2 class="titulo">Esta vez no llegaron</h2><div class="nombres">${nombres}</div>
      <p class="det">El agua alcanzó a ${na === 1 ? 'la persona que corría' : `${na === 2 ? 'las dos' : 'las tres'} personas`} antes de llegar a ${esc(niv.hasta)}. Se vuelve a intentar, juntos.</p>
      <p class="siguiente">Volviendo a la sala · nuevo sorteo de puestos en <span id="cuentaSig">${Math.ceil(CONFIG.esperaDerrota)}</span></p>`;
    // perder: de vuelta a la sala y se sortean otra vez los puestos (la partida empieza de nuevo en el nivel 1)
    estado.despues = 'sala';
  }
}
// al terminar un nivel, cada teléfono sabe si su lado ganó o perdió (los ciudadanos y también el POC)
const FRASES_POC_GANA = ['¿Disfrutas oprimiendo la libertad de expresión de la gente?', 'Veo que disfrutas ejercer tu poder.'];
function avisarResultado(ganan, ultimo, estrellas) {
  const poc = ganan
    ? { gana: false, titulo: 'Perdiste', texto: 'La revolución siempre ganará.' }
    : { gana: true, titulo: 'Ganaste', texto: FRASES_POC_GANA[Math.floor(Math.random() * FRASES_POC_GANA.length)] };
  const ciudadanos = ganan
    ? { gana: true, titulo: ultimo ? '¡Llegaron a La Moneda!' : '¡Llegaron!', texto: `${'★'.repeat(estrellas)} · ${ultimo ? 'Terminaron el recorrido.' : 'El grupo pasa al siguiente nivel.'}` }
    : { gana: false, titulo: 'Esta vez no llegaron', texto: 'El agua los alcanzó a todos. Vuelven a la sala para un nuevo sorteo.' };
  ordenar('poc', { resultado: poc });
  ['c1', 'c2', 'c3'].forEach(k => { if (jugadores[k]) ordenar(k, { resultado: ciudadanos }); });
}
const estrellasHTML = (n, max = 3) => `<div class="estrellas" aria-label="${n} de ${max} estrellas">${Array.from({ length: max }, (_, i) => i).map(i => `<span class="${i < n ? 'on' : ''}" style="animation-delay:${0.45 + i * 0.3}s">★</span>`).join('')}</div>`;
function sonarEstrellas(n) { for (let i = 0; i < n; i++) setTimeout(() => audio.tocar('cacerola', 0.75, 0.95 + i * 0.07), i * 300); } // cada estrella, un golpe de olla
function reanudar(n) { if (!estado.pausa) return; estado.pausa = false; empezarNivel(n); }
function volverASalaYSortear() {
  estado.despues = null; estado.pausa = false; estado.estrellas = [];
  PUESTOS.forEach(k => ordenar(k, { estado: 'corriendo' }));   // los teléfonos (también el POC) dejan la pantalla de resultado
  irA('sala'); pintarQR(); sortearPuestos();
}
function volverASala() { // los teléfonos siguen conectados; se pueden cambiar nombres y puestos antes de salir otra vez
  if (!estado.pausa) return; estado.pausa = false;
  ['c1', 'c2', 'c3'].forEach(k => ordenar(k, { estado: 'corriendo' }));
  irA('sala'); pintarPuestos(); pintarQR();
}
function pintarFichas() {
  const cont = $('#fichas'); if (!cont) return;
  cont.innerHTML = corredores.filter(c => c.activo).map(c => `<div class="ficha${c.vivo ? '' : ' fuera'}" style="--color:${c.color}"><b>${esc(c.nombre)}</b><span>${c.llego ? 'llegó' : c.vivo ? 'corriendo' : 'fuera de la ronda'}</span></div>`).join('')
    + `<div class="ficha poc" style="--color:var(--poc)"><b>POC</b><span>lanzaaguas</span></div>`;
}
function sello(c) {
  const el = document.createElement('div'); el.className = 'sello'; el.style.setProperty('--color', c.color);
  el.innerHTML = `¡Alcanzado!<small>${esc(c.nombre)} vuelve en el siguiente nivel</small>`;
  $('#sellos').appendChild(el); setTimeout(() => el.remove(), 3200);
}

// ============================ 6. SIMULACIÓN ============================
function leerCorredores(dt) {
  corredores.forEach((c, i) => {
    const k = 'c' + (i + 1);   // (carrilTeclado solo lo usa el modo de espera, cuando corren solos de fondo)
    const crudo = canal(k, 'ang.g');
    // giro calmado: se recorta (un giro brusco no pasa de ±45°), se suaviza, y tras un salto o un cambio de calle
    // hay una pausa corta. Así un movimiento fuerte no hace saltar al personaje de una calle a otra.
    if (crudo != null) c.gSuave = lerp(c.gSuave ?? crudo, clamp(crudo, -45, 45), suave(dt, CONFIG.suavizadoGiro));
    c.espera = Math.max(0, (c.espera || 0) - dt);
    const g = crudo == null ? null : c.gSuave;
    if (g != null && c.espera <= 0) { // inclinación con histéresis: no tiembla entre dos calles
      const u = CONFIG.inclinacionCarril, h = CONFIG.histeresis;
      let n = c.carril;
      if (n === 1) { if (g < -u - h) n = 0; else if (g > u + h) n = 2; }
      else if (n === 0) { if (g > -u + h) n = 1; }      // de a una calle por vez: nunca de izquierda a derecha de golpe
      else if (g < u - h) n = 1;
      if (n !== c.carril) c.espera = CONFIG.pausaCarril;
      if (c.carrilTeclado != null && n === c.carril) n = c.carrilTeclado; else c.carrilTeclado = null;
      cambiarCarril(c, n);
    } else if (c.carrilTeclado != null) cambiarCarril(c, c.carrilTeclado);
    // escudo: 2 dedos levantan el escudo, que bloquea el agua
    const esc = escudoDe(k);
    if (esc && !c.conEscudo && estado.fase === 'juego' && c.vivo) audio.tocar('valla', 0.45, 1.35, c.x / 3); // el escudo se levanta: golpe metálico
    c.conEscudo = esc > 0;
    c.escudo = lerp(c.escudo || 0, c.vivo ? esc : 0, suave(dt, 14));
    // agacharse: deslizar un dedo hacia abajo (evento 'agacharse') lo agacha un momento
    const abajo = estado.t < (c.agachaHasta || 0);
    if (abajo && !c.abajo && estado.fase === 'juego' && c.vivo) audio.tocar('carril', 0.6, 0.75, c.x / 3);   // roce al agacharse
    c.abajo = abajo;
    c.cub = lerp(c.cub, abajo ? 1 : 0, suave(dt, 14));
  });
}
function cambiarCarril(c, n) {
  c.carrilTeclado = n;
  if (n === c.carril) return;
  c.carril = n;
  if (estado.fase === 'juego' && c.vivo) audio.tocar('carril', 0.6, rnd(0.9, 1.15), (n - 1) * 0.7);
}
function leerPOC(dt) {
  const e = estado;
  const g = canal('poc', 'ang.g'), dedo = canal('poc', 'touch.down') ? canal('poc', 'touch.x') : null;
  let objetivo;
  if (dedo != null) objetivo = (clamp(dedo) * 2 - 1) * 1.6;           // el agua cae donde está el dedo: se toca la imagen
  else if (g != null) objetivo = clamp(g / CONFIG.inclinacionCarro, -1, 1) * 1.6;
  else objetivo = e.vehX;
  e.vehX = lerp(e.vehX, objetivo, suave(dt, dedo != null ? 5 : 2.2));   // el carro pesa; con el dedo responde más rápido
  const tocando = canal('poc', 'touch.down') || 0;
  const f = fuerzaPOC();
  e.balizas = lerp(e.balizas, tocando || f > 0.2 ? 1 : 0, suave(dt, 10));   // soplar también enciende las balizas
  e.fuerza = lerp(e.fuerza, f, suave(dt, 12));
}

function actualizar(dt) {
  const e = estado; e.t += dt; e.faseT += dt;
  const niv = e.fase === 'juego' || e.fase === 'placa' || e.fase === 'resultado' ? nivelActual() : CONFIG.niveles[0];
  const jugando = e.fase === 'juego';
  leerCorredores(dt); leerPOC(dt);

  if (e.fase === 'cine') {
    e.cineT += dt;
    if (e.cineT > CONFIG.cinematica[e.cineI].s) siguientePlaca();
    const mantiene = teclas.has('Space') || teclas.has('Enter') || btnSaltar._abajo;
    saltarCine = mantiene ? saltarCine + dt : Math.max(0, saltarCine - dt * 2);
    $('#saltarAvance').style.strokeDashoffset = 88 * (1 - saltarCine / CONFIG.saltarCinematica);
    if (saltarCine >= CONFIG.saltarCinematica) terminarCine();
  }
  if (e.fase === 'placa') {
    pintarPlacaNivel();
    if (e.faseT > 2.2 + 3.6) { irA('juego'); audio.tocar('silbato', 0.6); }
  }
  if (e.fase === 'resultado' && e.despues) {
    if (e.despues === 'siguiente') { // se ven las estrellas, cuenta regresiva y pasa solo al siguiente nivel
      const quedan = Math.ceil(CONFIG.esperaSiguiente - e.faseT), el = $('#cuentaSig');
      if (el && el.textContent !== String(quedan)) el.textContent = Math.max(1, quedan);
      if (e.faseT > CONFIG.esperaSiguiente) empezarNivel(e.nivel + 1);
    }
    if (e.despues === 'sala' || e.despues === 'salaFinal') {   // fin de la partida (perder o ganar): sala y sorteo automático
      const espera = e.despues === 'sala' ? CONFIG.esperaDerrota : CONFIG.esperaFinal;
      const quedan = Math.max(1, Math.ceil(espera - e.faseT)), el = $('#cuentaSig');
      if (el && el.textContent !== String(quedan)) el.textContent = quedan;
      if (e.faseT > espera) volverASalaYSortear();
    }
  }

  // modo de espera (inicio, cinemática, sala): tres personas corren solas, el carro las sigue con balizas
  const espera = e.fase === 'inicio' || e.fase === 'cine' || e.fase === 'sala';
  if (espera) {
    // de fondo corren los tres (es solo ambiente); en la partida, solo los que tienen teléfono
    corredores.forEach(c => { c.vivo = true; c.salida = 0; if (Math.random() < dt * 0.25) c.carrilTeclado = Math.floor(rnd(0, 3)); if (c.carrilTeclado != null) c.carril = c.carrilTeclado; });
    e.balizas = lerp(e.balizas, Math.sin(e.t * 0.4) > 0.3 ? 1 : 0, suave(dt, 3));
    e.vehX = Math.sin(e.t * 0.3) * 1.2;
  }

  // ---- ciudadanos ----
  const ocupacion = [0, 0, 0], puesto = [];
  corredores.forEach(c => { if (c.vivo) puesto[c.i] = ocupacion[c.carril]++; });
  corredores.forEach(c => {
    if (!c.vivo) { c.salida = Math.min(1, c.salida + dt * 1.6); return; }
    const mismos = ocupacion[c.carril], desfase = mismos > 1 ? (puesto[c.i] - (mismos - 1) / 2) * 0.36 : 0;
    const lento = 1 - c.cub * 0.4;
    c.x = lerp(c.x, (c.carril - 1) * CONFIG.anchoCarril + desfase, suave(dt, 11 * lento));
    if (c.quiereSaltar) { c.quiereSaltar = false; c.espera = Math.max(c.espera || 0, CONFIG.pausaSalto); if ((jugando || espera) && c.y <= 0.001 && c.cub < 0.5) { c.vy = 5.6; if (jugando) { audio.tocar('salto', 0.7, rnd(0.95, 1.1), c.x / 2); ordenar('c' + (c.i + 1), { vib: 30 }); } } }
    c.y = Math.max(0, c.y + c.vy * dt); c.vy = c.y > 0 ? c.vy - 16 * dt : 0;
    c.fasePaso += dt * (e.vel / 3.2) * lento;   // los pasos suenan como bucle (audio continuo, más abajo)
  });

  // ---- POC: agua y estanque ----
  // umbral: soplar tiene uno más bajo que apretar (un soplo normal ya debe sacar agua)
  const umbral = CONFIG.umbralSoplo;
  const quiere = e.fuerza > umbral ? Math.min(1, (e.fuerza - umbral) / (1 - umbral) * 1.25) : 0;
  // contrapresión: los escudos de los ciudadanos en carrera bloquean el agua. Uno solo no alcanza; los tres juntos sí
  // escudos arriba (0–1), sobre los ciudadanos que juegan: con 2 jugadores, cada escudo bloquea la mitad
  e.contra = jugando ? vivos().reduce((s, c) => s + c.escudo, 0) / Math.max(1, e.enJuego || 3) : 0;
  // si un teléfono se desconecta en plena carrera, su ciudadano sale (sin sello)
  if (jugando) corredores.forEach(c => { if (c.activo && c.vivo && !jugadores['c' + (c.i + 1)]) { c.vivo = false; pintarFichas(); } });
  // estanque: se gasta al apretar y NO se llena solo. Se llena agitando el teléfono del POC (evento 'agitar').
  // Si se vacía, el carro queda SECO hasta llenarlo entero.
  const sale = jugando && !e.recargando ? quiere : 0;                           // lo que sopla el POC (y gasta)
  e.agua = sale * (1 - e.contra * CONFIG.contrapresion);                        // lo que llega a la pantalla
  if (jugando) e.estanque = clamp(e.estanque - sale * dt / niv.chorro);
  if (e.agitar) {
    if (jugando && e.estanque < 1) { e.estanque = clamp(e.estanque + e.agitar * CONFIG.llenadoPorSacudida); audio.tocar('impacto_agua', 0.3, rnd(0.55, 0.7), e.vehX / 2); } // el agua golpea dentro del estanque
    e.agitar = 0;
  }
  if (jugando && !e.recargando && e.estanque <= 0) {
    e.recargando = true; audio.tocar('valla', 0.6, 0.7, e.apunta / 2);        // el chorro tose y se corta
    ordenar('poc', { vib: [80, 60, 80] });
  }
  if (e.recargando && e.estanque >= 1) { e.recargando = false; audio.tocar('silbato', 0.35, 1.25); ordenar('poc', { vib: [30] }); }
  if (jugando) ordenar('poc', { estanque: Math.round(e.estanque * 100) / 100, seco: e.recargando }, 200); // el teléfono del POC muestra su estanque
  const vv = vivos(), unidos = vv.length >= 1 && vv.every(c => c.escudo > 0.8) && sale > 0.1;   // todos los escudos arriba frenan el chorro: suena la olla
  if (unidos && !e.unidos) audio.tocar('cacerola', 0.7, 1);
  e.unidos = unidos;
  if (jugando) ordenar('poc', { contra: Math.round(e.contra * 100) / 100 }, 200);   // el POC siente la resistencia en su pantalla
  e.sale = sale;
  if (sale > 0.2) vivos().forEach(c => ordenar('c' + (c.i + 1), { vib: [18] }, 700)); // y el agua llega a la mano de los ciudadanos
  // el agua golpea los escudos levantados: salpica y suena contra el metal
  if (sale > 0.15) vivos().forEach(c => { if (c.escudo > 0.5 && Math.random() < dt * 3) audio.tocar('impacto_agua', 0.3 * sale, rnd(1.2, 1.5), c.x / 2); });
  e.apunta = lerp(e.apunta, e.vehX, suave(dt, 4));
  // destello de balizas: doble golpe rojo / azul
  const ciclo = (e.t * 2.2) % 1, dob = ciclo % 0.5, destello = dob < 0.08 || (dob > 0.14 && dob < 0.22);
  e.flash = e.balizas * (destello ? 1 : 0.18);
  e.ruido = clamp(e.agua * 0.95 + e.balizas * 0.2);
  if (e.agua > 0.2) { ordenar('poc', { vib: 25 }, 900); if (Math.random() < dt * 2.5) audio.tocar('impacto_agua', 0.4 + e.agua * 0.5, rnd(0.85, 1.2), e.apunta / 2); }

  // ---- avance, obstáculos, colisiones ----
  if (jugando) {
    const avance = clamp(e.metros / niv.meta);
    e.vel = lerp(niv.vel[0], niv.vel[1], avance);
    const dz = e.vel * dt;
    e.metros += dz;
    for (const o of e.obst) { o.zAntes = o.z; o.z -= dz; }
    e.proxFila -= dz;
    if (e.proxFila <= 0 && e.metros < niv.meta - 40) { nuevaFila(niv); e.proxFila = rnd(...niv.separacion); }
    for (const o of e.obst) {
      // barrido: con mucha velocidad un obstáculo puede saltarse la ventana de un cuadro al otro
      if (o.zAntes < ZJ - 0.35 || o.z > ZJ + 0.35) continue;
      for (const c of corredores) {
        if (!c.vivo || o.vistos[c.i]) continue;
        if (Math.abs(o.x - (c.carril - 1) * CONFIG.anchoCarril) > CONFIG.anchoCarril * 0.5) continue;
        o.vistos[c.i] = true;
        if (o.cat === 'bajo' && c.y > 0.5) { audio.tocar('valla', 0.5, rnd(0.9, 1.1), o.x / 2); continue; }
        if (o.cat === 'colgante' && c.cub > 0.55 && c.y < 0.3) continue;
        detener(c, o);
      }
    }
    e.obst = e.obst.filter(o => o.z > -2);
    if (e.metros >= e.hitos) { e.hitos += 100; audio.tocar('cacerola', 0.55, 1); }
    if (!vivos().length) terminarNivel(false);
    else if (e.metros >= niv.meta) { corredores.forEach(c => { c.llego = c.vivo; }); terminarNivel(true); }
  } else if (espera) {
    e.metros += 6 * dt; e.vel = 6; e.obst = [];
  }

  // ---- audio continuo ----
  if (audio.ctx) {
    const enCalle = !espera, nv = vivos().length, na = Math.max(1, e.enJuego || 3);
    audio.ensordecer(e.agua * 0.75);   // el agua apaga la calle, pero sin dejarla muda
    audio.nivel('motor', enCalle ? 0.3 + e.agua * 0.25 : 0.1, 0.85 + e.agua * 0.35);
    // la sirena solo suena en la carrera. En la historia y la sala las balizas del fondo se prenden y apagan solas,
    // y la sirena se escuchaba ~5 s y se cortaba: parecía que el sonido fallaba
    // durante la carrera la sirena suena SIEMPRE (el carro viene detrás); cuando el POC toca o sopla, las balizas
    // la suben y la aceleran. Antes solo sonaba con las balizas encendidas y se cortaba cada vez que el POC soltaba.
    // (suave de base para no tapar la calle; fuerte con las balizas)
    audio.nivel('sirena', jugando ? 0.13 + e.balizas * 0.3 : 0, 0.85 + e.balizas * 0.15 + e.fuerza * 0.35);
    audio.nivel('chorro', e.agua * 0.95);
    if (audio.filtroChorro) audio.filtroChorro.frequency.setTargetAtTime(400 + e.agua * 8000, audio.ctx.currentTime, 0.05);
    audio.nivel('latido', jugando && nv === 1 && na > 1 ? 0.75 : 0);           // queda una sola persona: se oye su cuerpo
    // pasos de carrera: bucle mientras corren; más gente, más fuerte; más velocidad, más rápido
    audio.nivel('pasos', jugando ? 0.25 + 0.35 * (nv / na) : 0, 0.85 + e.vel / 40);
    // la calle (sonido de protesta) es la voz colectiva: suena desde que empieza la partida, baja con cada detención
    // y sube cuando los escudos bloquean el agua. El agua la apaga (filtro del mundo).
    const enPartida = e.fase === 'placa' || e.fase === 'juego' || (e.fase === 'resultado' && !e.pausa);
    const voz = jugando ? 0.4 + 0.6 * (nv / na) + e.contra * 0.3 : 1;
    // antes de la partida (inicio, historia y sala) la calle suena de fondo, más suave y sin cortes
    // protesta y cacerolazo: SOLO durante la carrera (no en la historia, ni en la sala, ni en las pantallas de nivel)
    audio.nivel('protesta', jugando ? clamp(CONFIG.volumenProtesta * voz) : 0);
    // cacerolazo de fondo: siempre, más presente en la carrera; baja con cada persona fuera, como la voz de la calle
    audio.nivel('cacerolazo', jugando ? 0.5 * clamp(voz) : 0);   // junto a la protesta durante toda la carrera
    audio.nivel('fuego', (enCalle && niv.ambiente === 'fuego') ? 0.35 : 0);
    audio.nivel('dron', e.fase === 'cine' ? 0.5 : (enCalle && niv.ambiente === 'dron') ? 0.55 : 0);
  }

  // ---- partículas del chorro y gotas sobre la pantalla ----
  if (e.agua > 0.02) for (let i = 0; i < 1 + e.agua * 3; i++) e.particulas.push({ k: 0, v: rnd(0.9, 1.25), off: rnd(-1, 1) });
  for (const p of e.particulas) p.k += dt * 1.6 * p.v;
  e.particulas = e.particulas.filter(p => p.k < 1.08);
  if (e.agua > 0.05 && Math.random() < e.agua * dt * 16) e.gotas.push({ x: clamp(0.5 + e.apunta / 3.2 + rnd(-0.28, 0.28)), y: rnd(0.05, 0.9), r: rnd(10, 36) * (0.5 + e.agua), vida: 1, vy: rnd(0.01, 0.05) });
  for (const d of e.gotas) { d.vida -= dt * 0.5; d.y += d.vy * dt; }
  e.gotas = e.gotas.filter(d => d.vida > 0).slice(-40);

  // HUD
  if (!$('#hud').hidden) {
    const nivx = nivelActual();
    $('#hudMetros').firstChild.nodeValue = Math.floor(Math.min(e.metros, nivx.meta)).toLocaleString('es-CL');
    $('#hudMetros').lastChild.textContent = ` / ${nivx.meta} m`;
    $('#hudRuta').style.width = (clamp(e.metros / nivx.meta) * 100).toFixed(1) + '%';
    $('#hudAgua').style.width = (e.estanque * 100).toFixed(1) + '%';
    $('#hudEstanque').classList.toggle('recargando', e.recargando);
    const txt = e.recargando ? `POC · sin agua · agitar para llenar ${Math.round(e.estanque * 100)} %` : 'POC · estanque';
    if ($('#hudEstanqueTxt').textContent !== txt) $('#hudEstanqueTxt').textContent = txt;
  }
}
function nuevaFila(niv) {
  // nunca se cierran las tres calles: como máximo dos obstáculos por fila
  const carriles = [0, 1, 2].sort(() => Math.random() - 0.5), n = Math.random() < niv.dobles ? 2 : 1;
  for (let i = 0; i < n; i++) {
    let r = Math.random(), cat = 'bajo';
    for (const [k, p] of Object.entries(niv.mezcla)) { if (r < p) { cat = k; break; } r -= p; }
    estado.obst.push({ cat, tipo: niv.tipos[cat], x: (carriles[i] - 1) * CONFIG.anchoCarril, z: 85, zAntes: 85, vistos: [false, false, false], semilla: Math.random() });
  }
}
function detener(c, o) {
  c.vivo = false; c.salida = 0;
  audio.tocar('detenido', 0.9, rnd(0.95, 1.05), c.x / 2); setTimeout(() => audio.tocar('silbato', 0.55, 0.95), 220);
  ordenar('c' + (c.i + 1), { vib: [150], estado: 'detenido' });   // vibración corta y suave
  ordenar('poc', { vib: [120] });
  sello(c); pintarFichas();
}

// ============================ 7. DIBUJO ============================
const ctx = cv.getContext('2d');
const buf = document.createElement('canvas'), b = buf.getContext('2d');   // la escena se pinta aquí y luego el agua la deforma
let W = 0, H = 0, DPR = 1;
function ajustar() {
  DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
  for (const c of [cv, buf]) { c.width = W * DPR; c.height = H * DPR; }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); b.setTransform(DPR, 0, 0, DPR, 0, 0);
  hacerCordillera();
}
addEventListener('resize', ajustar);

const cam = { x: 0, y: 2.0 };
const HZ = () => H * 0.36;
const FOC = () => Math.min(W, H * 1.6) * 0.62;
function P(x, y, z) { const s = FOC() / Math.max(0.05, z); return { x: W / 2 + (x - cam.x) * s, y: HZ() + (cam.y - y) * s, s }; }
function quad(g, a, b2, c, d, fill) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b2.x, b2.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath(); g.fillStyle = fill; g.fill(); }
const ST = "'Big Shoulders Stencil Display', Impact, 'Arial Narrow', sans-serif", MONO = "'Space Mono', monospace";

let cord = [];
function hacerCordillera() {
  cord = [];
  for (const c of [{ alto: 0.2, rug: 0.7, col: '#2a2140', nieve: 0.6 }, { alto: 0.11, rug: 1, col: '#18132a', nieve: 0 }]) {
    const pts = []; let y = 0.5;
    for (let i = 0; i <= 140; i++) { y = clamp(y + rnd(-0.16, 0.16) * c.rug, 0.1, 1); const pico = Math.pow(Math.sin(i / 140 * Math.PI * 2.3 + c.alto * 9) * 0.5 + 0.5, 1.6); pts.push(clamp(y * 0.4 + pico * 0.7)); }
    cord.push({ ...c, pts });
  }
}
const estrellas = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * 0.8, a: Math.random() }));
const edificios = Array.from({ length: 34 }, (_, i) => ({ x: i / 34, w: rnd(0.015, 0.04), h: rnd(0.02, 0.09), v: Math.random() }));
const PALETA = {
  // nivel 1 · de día, como en las fotos del estallido: cielo azul, cordillera nevada, edificios claros
  dia: { cielo: ['#3a78c0', '#86b6e0', '#dcd6c8'], smog: 'rgba(225,205,180,.4)', asfalto: ['#55565c', '#66676d'], vereda: '#8f8a7f',
    fachadas: ['#d9d2c3', '#cbc2b0', '#bdb4a2', '#e4ded2', '#aaa497', '#c9b9a3'], ventana: '#5a6b80', bruma: '214,214,210', noche: false },
  humo: { cielo: ['#07060b', '#2a1420', '#6a2a1e'], smog: 'rgba(255,120,50,.28)', asfalto: ['#15161d', '#22232c'], vereda: '#17171d',
    fachadas: ['#1c1a24'], ventana: '#0d0c13', bruma: '20,18,26', noche: true },
  // nivel 2 · centro de noche: fachadas antiguas, casi todas las ventanas apagadas
  noche: { cielo: ['#020306', '#07080f', '#10121a'], smog: 'rgba(120,130,150,.18)', asfalto: ['#0e0f14', '#17181f'], vereda: '#15161b',
    fachadas: ['#1b1c22', '#202027', '#17171c', '#22201e'], ventana: '#0b0c10', bruma: '24,26,33', noche: true },
  // nivel 3 · nublado, fachadas limpias de piedra gris
  gris: { cielo: ['#2b3346', '#56607a', '#8b90a0'], smog: 'rgba(230,230,240,.15)', asfalto: ['#2a2b31', '#3b3c43'], vereda: '#5b5c63',
    fachadas: ['#a7a7ab', '#9b9ca2', '#b4b4b7', '#8f9097'], ventana: '#596070', bruma: '139,144,160', noche: false },
};
const hsh = (i, k = 0) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

function cielo(g, t, niv) {
  const hz = HZ(), pal = PALETA[niv.cielo];
  const gr = g.createLinearGradient(0, 0, 0, hz); gr.addColorStop(0, pal.cielo[0]); gr.addColorStop(0.65, pal.cielo[1]); gr.addColorStop(1, pal.cielo[2]);
  g.fillStyle = gr; g.fillRect(0, 0, W, hz + 2);
  if (niv.cielo === 'noche' || niv.cielo === 'humo') for (const s of estrellas) { g.fillStyle = `rgba(239,233,220,${(niv.cielo === 'noche' ? 0.15 : 0.3) + 0.4 * Math.abs(Math.sin(t * 0.7 + s.a * 9))})`; g.fillRect(s.x * W, s.y * hz * 0.6, 1.5, 1.5); }
  if (niv.cielo === 'humo' || niv.cielo === 'dia') { // cordillera con paralaje (nivel 1: se corre hacia el oriente)
    cord.forEach((c, ci) => {
      const off = -cam.x * (ci ? 12 : 6);
      g.beginPath(); g.moveTo(-20, hz + 1);
      c.pts.forEach((p, i) => g.lineTo(off - 20 + i / (c.pts.length - 1) * (W + 40), hz - p * c.alto * H));
      g.lineTo(W + 20, hz + 1); g.closePath(); g.fillStyle = niv.cielo === 'dia' ? (ci ? '#7c8599' : '#98a1b6') : c.col; g.fill();
      if (c.nieve) { g.save(); g.clip(); const sg = g.createLinearGradient(0, hz - c.alto * H, 0, hz - c.alto * H * c.nieve); sg.addColorStop(0, `rgba(245,245,250,${niv.cielo === 'dia' ? 0.95 : 0.8})`); sg.addColorStop(1, 'rgba(245,245,250,0)'); g.fillStyle = sg; g.fillRect(0, hz - c.alto * H - 5, W, c.alto * H * (1 - c.nieve) + 5); g.restore(); }
    });
  }
  const sm = g.createLinearGradient(0, hz - H * 0.14, 0, hz); sm.addColorStop(0, 'rgba(0,0,0,0)'); sm.addColorStop(1, pal.smog);
  g.fillStyle = sm; g.fillRect(0, hz - H * 0.14, W, H * 0.14);
  // ciudad baja
  if (niv.cielo === 'dia') ciudadDeDia(g, t);
  else for (const e of edificios) {
    const x = e.x * W - cam.x * 18, h = e.h * H;
    g.fillStyle = niv.cielo === 'gris' ? '#4a4d5a' : '#0c0b14'; g.fillRect(x, hz - h, e.w * W, h + 1);
    if (e.v > (niv.cielo === 'noche' ? 0.8 : 0.4) && niv.cielo !== 'gris') { g.fillStyle = 'rgba(255,200,120,.35)'; for (let k = 0; k < 4; k++) if ((k * 7 + Math.floor(e.v * 10)) % 3) g.fillRect(x + 3 + (k % 2) * e.w * W * 0.45, hz - h + 4 + Math.floor(k / 2) * 8, 2, 3); }
  }
  const avance = estado.fase === 'juego' || estado.fase === 'resultado' ? clamp(estado.metros / niv.meta) : 0.2;
  FONDOS[niv.hito](g, t, avance, niv);
}

// ---------- lugares de Santiago en el horizonte ----------
// Cada nivel corre por un tramo real de la Alameda; los hitos están del lado y en la dirección en que se ven.
const FONDOS = {
  // Nivel 1 · hacia el oriente, a Plaza Dignidad: cerro San Cristóbal a la izquierda, Gran Torre Santiago al fondo,
  // torre Telefónica a la derecha de la plaza y el monumento al centro de la rotonda.
  plaza(g, t, k, niv) {
    sanCristobal(g, t, 0.15, '#6f7259', false);
    granTorre(g, t, 0.86, 0.2, '#8396ad', false);
    telefonica(g, t, 0.62, 0.36, '#4f6178', false);
    plaza(g, t, k);
  },
  // Nivel 2 · centro, de noche, hacia el oriente: cerro Santa Lucía adelante a la izquierda, iglesia San Francisco
  // a la derecha, y a lo lejos la torre Telefónica con la palabra HAMBRE proyectada (mayo de 2020).
  hambre(g, t, k, niv) {
    telefonica(g, t, 0.56, 0.2, '#0b0b12', true);
    santaLucia(g, t, 0.2, k);
    sanFrancisco(g, t, 0.84, k);
  },
  // Nivel 3 · hacia el poniente, a La Moneda: torre Entel a la derecha, la bandera de la Plaza de la Ciudadanía
  // y el palacio al fondo. Mirando al poniente la cordillera queda a la espalda.
  moneda(g, t, k, niv) {
    entel(g, t, 0.74, '#5b6072');
    moneda(g, t, k);
    granBandera(g, t, 0.36, k);
  },
};
const par = f => W * f - cam.x * 18;   // posición en el horizonte con un poco de paralaje
function sanCristobal(g, t, f, col, noche) {
  const hz = HZ(), x = par(f), w = W * 0.26, h = H * 0.17;
  g.fillStyle = col; g.beginPath(); g.moveTo(x - w, hz);
  const perfil = [[-1, 0], [-0.75, 0.3], [-0.5, 0.55], [-0.3, 0.7], [-0.12, 0.92], [0, 1], [0.1, 0.94], [0.3, 0.78], [0.45, 0.82], [0.6, 0.62], [0.8, 0.35], [1, 0]];
  for (const [a, b2] of perfil) g.lineTo(x + a * w, hz - b2 * h);
  g.closePath(); g.fill();
  if (!noche) { g.fillStyle = 'rgba(70,90,55,.55)'; for (let i = 0; i < 30; i++) { const a = -0.9 + hsh(i, 3) * 1.8, alto = (1 - Math.abs(a)) * 0.75 * hsh(i, 4); g.beginPath(); g.arc(x + a * w, hz - alto * h, w * 0.03, 0, 7); g.fill(); } }
  // antenas en la cumbre secundaria
  g.strokeStyle = '#2a2633'; g.lineWidth = 1.5;
  for (const dx of [0.42, 0.48]) { g.beginPath(); g.moveTo(x + dx * w, hz - 0.8 * h); g.lineTo(x + dx * w, hz - 1.15 * h); g.stroke(); g.fillStyle = Math.sin(t * 2 + dx * 9) > 0 ? '#e8202a' : '#5a1215'; g.fillRect(x + dx * w - 1.5, hz - 1.16 * h, 3, 3); }
  // la Virgen de la cumbre: pedestal y figura blanca iluminada
  const vx = x, vy = hz - h, s = H * 0.0011;
  if (noche) { const gl = g.createRadialGradient(vx, vy - 14 * s, 0, vx, vy - 14 * s, 40 * s); gl.addColorStop(0, 'rgba(240,240,255,.35)'); gl.addColorStop(1, 'rgba(240,240,255,0)'); g.fillStyle = gl; g.beginPath(); g.arc(vx, vy - 14 * s, 40 * s, 0, 7); g.fill(); }
  g.fillStyle = '#9a96a6'; g.fillRect(vx - 4 * s, vy - 8 * s, 8 * s, 8 * s);
  g.fillStyle = '#f2f0f6'; g.beginPath(); g.moveTo(vx - 4 * s, vy - 8 * s); g.lineTo(vx, vy - 26 * s); g.lineTo(vx + 4 * s, vy - 8 * s); g.fill();
  g.beginPath(); g.arc(vx, vy - 28 * s, 2.4 * s, 0, 7); g.fill();
  g.fillRect(vx - 7 * s, vy - 22 * s, 14 * s, 1.6 * s); // brazos abiertos
}
function granTorre(g, t, f, alto, col, noche) {
  // Gran Torre Santiago: prisma de vidrio que se angosta, con la corona de vigas abierta
  const hz = HZ(), x = par(f) - cam.x * 4, h = H * alto, w = W * 0.022;
  g.fillStyle = col; g.beginPath(); g.moveTo(x - w, hz); g.lineTo(x - w * 0.78, hz - h); g.lineTo(x + w * 0.78, hz - h); g.lineTo(x + w, hz); g.fill();
  g.fillStyle = 'rgba(120,140,190,.12)'; g.beginPath(); g.moveTo(x, hz); g.lineTo(x, hz - h); g.lineTo(x + w * 0.78, hz - h); g.lineTo(x + w, hz); g.fill();
  g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath();
  for (const dx of [-0.75, -0.25, 0.25, 0.75]) { g.moveTo(x + dx * w * 0.78, hz - h); g.lineTo(x + dx * w * 0.9, hz - h * 1.09); } g.stroke();
  if (noche) for (let i = 0; i < 18; i++) if ((i * 7) % 5 < 2) { g.fillStyle = 'rgba(255,220,160,.35)'; g.fillRect(x - w * 0.6 + (i % 3) * w * 0.5, hz - h * (0.1 + i * 0.045), 2, 2); }
  g.fillStyle = Math.floor(t * 1.1) % 2 ? '#e8202a' : 'rgba(232,32,42,.25)'; g.fillRect(x - 1.5, hz - h * 1.1, 3, 3);
}
function telefonica(g, t, f, alto, col, hambre) {
  // torre Telefónica, en Plaza Dignidad: el edificio con forma de teléfono celular y su antena
  const hz = HZ(), x = par(f), th = H * alto, tw = W * (hambre ? 0.026 : 0.034);
  g.fillStyle = col;
  g.beginPath(); g.moveTo(x - tw, hz); g.lineTo(x - tw, hz - th); g.quadraticCurveTo(x, hz - th * 1.08, x + tw, hz - th); g.lineTo(x + tw, hz); g.fill();
  if (!hambre) { // de día: vidrio azulado con franjas verticales y el reflejo del cielo en un costado
    const gl = g.createLinearGradient(x - tw, 0, x + tw, 0); gl.addColorStop(0, 'rgba(160,190,225,.35)'); gl.addColorStop(0.5, 'rgba(160,190,225,0)'); gl.addColorStop(1, 'rgba(20,30,45,.35)');
    g.fillStyle = gl; g.fillRect(x - tw, hz - th, tw * 2, th);
    g.strokeStyle = 'rgba(200,215,235,.35)'; g.lineWidth = 1; g.beginPath();
    for (let i = 1; i < 8; i++) { const xx = x - tw + tw * 2 * i / 8; g.moveTo(xx, hz - th * 1.02); g.lineTo(xx, hz); } g.stroke();
    g.strokeStyle = 'rgba(40,50,65,.4)'; g.beginPath(); for (let i = 1; i < 30; i++) { const yy = hz - th * i / 30; g.moveTo(x - tw, yy); g.lineTo(x + tw, yy); } g.stroke();
    g.fillStyle = '#3f4a5a'; g.fillRect(x + tw * 0.25, hz - th * 1.04, tw * 0.3, th * 0.04);
    g.fillStyle = col; g.fillRect(x - tw * 1.15, hz - th * 0.12, tw * 2.3, th * 0.12);
  }
  g.fillStyle = hambre ? col : '#3f4a5a'; g.fillRect(x + tw * 0.35, hz - th * 1.28, 3, th * 0.24);
  g.fillStyle = Math.floor(t * 1.2) % 2 ? '#e8202a' : 'rgba(232,32,42,.3)'; g.fillRect(x + tw * 0.35 - 1, hz - th * 1.29, 4, 4);
  if (hambre) {
    g.save(); g.font = `900 ${tw * 0.66}px ${ST}`; g.textAlign = 'center'; g.fillStyle = `rgba(250,250,255,${0.78 + 0.2 * Math.sin(t * 3)})`;
    g.shadowColor = 'rgba(255,255,255,.85)'; g.shadowBlur = 14;
    'HAMBRE'.split('').forEach((l, i) => g.fillText(l, x, hz - th * 0.9 + i * tw * 0.62));
    g.restore();
  }
  if (false) for (let i = 0; i < 12; i++) if ((i * 5) % 3) { g.fillStyle = 'rgba(255,200,120,.3)'; g.fillRect(x - tw * 0.6 + (i % 2) * tw * 0.9, hz - th * (0.12 + i * 0.065), 2, 2); }
}
function santaLucia(g, t, f, k) {
  // cerro Santa Lucía: roca con árboles, terrazas y el torreón almenado arriba; se acerca a medida que se avanza
  const hz = HZ(), x = par(f) - cam.x * 10 * k, esc = 0.8 + k * 0.7, w = W * 0.15 * esc, h = H * 0.16 * esc;
  g.fillStyle = '#0d1012'; g.beginPath(); g.moveTo(x - w, hz);
  for (const [a, b2] of [[-0.9, 0.25], [-0.7, 0.42], [-0.5, 0.5], [-0.35, 0.7], [-0.18, 0.78], [-0.05, 0.92], [0.12, 0.9], [0.28, 0.72], [0.5, 0.6], [0.7, 0.4], [0.9, 0.2], [1, 0]]) g.lineTo(x + a * w, hz - b2 * h);
  g.closePath(); g.fill();
  g.fillStyle = '#121a14'; for (let i = 0; i < 14; i++) { const a = -0.85 + i * 0.13; g.beginPath(); g.arc(x + a * w, hz - (0.22 + Math.sin(i * 1.7) * 0.08 + (1 - Math.abs(a)) * 0.45) * h, w * 0.07, 0, 7); g.fill(); }
  // torreón y muros almenados
  const cx = x + 0.02 * w, cy = hz - 0.92 * h, tw = w * 0.1, th = h * 0.22;
  g.fillStyle = '#171a1f'; g.fillRect(cx - tw / 2, cy - th, tw, th);
  for (let i = 0; i < 4; i++) g.fillRect(cx - tw / 2 + i * tw / 3.5, cy - th - tw * 0.14, tw / 7, tw * 0.14);
  g.fillRect(cx - w * 0.22, cy - th * 0.35, w * 0.18, th * 0.35); g.fillRect(cx + w * 0.06, cy - th * 0.3, w * 0.16, th * 0.3);
  g.fillStyle = 'rgba(255,200,110,.55)'; for (const [dx, dy] of [[-0.2, 0.2], [0.1, 0.18], [0, 0.6], [-0.1, 0.65]]) g.fillRect(cx + dx * tw * 2, cy - dy * th, 2, 3);
  g.strokeStyle = '#2a2a33'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx, cy - th - tw * 0.14); g.lineTo(cx, cy - th * 1.7); g.stroke();
  g.fillStyle = '#d52b1e'; g.fillRect(cx, cy - th * 1.7, tw * 0.6, tw * 0.25); g.fillStyle = '#f2f2f2'; g.fillRect(cx, cy - th * 1.7, tw * 0.6, tw * 0.12);
}
function sanFrancisco(g, t, f, k) {
  // iglesia de San Francisco, en la Alameda: nave baja de piedra y torre roja con reloj y remate puntiagudo
  const hz = HZ(), esc = 0.8 + k * 0.6, x = par(f) + cam.x * 6 * k, s = H * 0.001 * esc;
  g.fillStyle = '#1c1210'; g.fillRect(x - 120 * s, hz - 38 * s, 150 * s, 38 * s);
  g.beginPath(); g.moveTo(x - 124 * s, hz - 38 * s); g.lineTo(x - 45 * s, hz - 58 * s); g.lineTo(x + 34 * s, hz - 38 * s); g.fill();
  const tx = x + 40 * s;
  g.fillStyle = '#3a1712'; g.fillRect(tx - 18 * s, hz - 120 * s, 36 * s, 120 * s);
  g.fillStyle = '#4a1d16'; g.fillRect(tx - 14 * s, hz - 160 * s, 28 * s, 40 * s);
  g.fillRect(tx - 10 * s, hz - 185 * s, 20 * s, 25 * s);
  g.beginPath(); g.moveTo(tx - 10 * s, hz - 185 * s); g.lineTo(tx, hz - 222 * s); g.lineTo(tx + 10 * s, hz - 185 * s); g.fill();
  g.strokeStyle = '#4a1d16'; g.lineWidth = Math.max(1, 1.5 * s); g.beginPath(); g.moveTo(tx, hz - 222 * s); g.lineTo(tx, hz - 236 * s); g.moveTo(tx - 5 * s, hz - 230 * s); g.lineTo(tx + 5 * s, hz - 230 * s); g.stroke();
  g.fillStyle = 'rgba(245,235,200,.9)'; g.beginPath(); g.arc(tx, hz - 140 * s, 7 * s, 0, 7); g.fill(); // reloj iluminado
  g.strokeStyle = '#3a1712'; g.lineWidth = Math.max(1, s); g.beginPath(); g.moveTo(tx, hz - 140 * s); g.lineTo(tx, hz - 145 * s); g.moveTo(tx, hz - 140 * s); g.lineTo(tx + 4 * s, hz - 140 * s); g.stroke();
  g.fillStyle = 'rgba(255,190,110,.35)'; for (let i = 0; i < 3; i++) g.fillRect(tx - 6 * s + i * 5 * s, hz - 176 * s, 2 * s, 8 * s);
}
function entel(g, t, f, col) {
  // torre Entel: fuste delgado de hormigón, plataforma cilíndrica arriba y mástil de antenas
  const hz = HZ(), x = par(f), h = H * 0.24, w = W * 0.007;
  g.fillStyle = col; g.fillRect(x - w, hz - h, w * 2, h);
  g.fillRect(x - w * 3.2, hz - h * 1.1, w * 6.4, h * 0.1);
  g.fillStyle = '#7a8094'; g.fillRect(x - w * 3.2, hz - h * 1.07, w * 6.4, h * 0.015);
  g.fillStyle = col; g.fillRect(x - w * 2, hz - h * 1.18, w * 4, h * 0.08);
  g.fillRect(x - 1.5, hz - h * 1.45, 3, h * 0.27);
  g.fillStyle = Math.floor(t * 1.2) % 2 ? '#e8202a' : 'rgba(232,32,42,.3)'; g.fillRect(x - 2, hz - h * 1.46, 4, 4);
  g.fillStyle = '#52576a'; g.fillRect(x - w * 4, hz - h * 0.25, w * 8, h * 0.25);
}
function granBandera(g, t, f, k) {
  // la bandera de la Plaza de la Ciudadanía, frente a La Moneda: mástil altísimo y paño enorme
  const hz = HZ(), s = (0.35 + k * 1.6) * H * 0.001, x = W * f - cam.x * 30, top = hz - 175 * s, fw = 90 * s, fh = 60 * s;
  g.strokeStyle = '#6a6e7c'; g.lineWidth = Math.max(1.2, 2.5 * s); g.beginPath(); g.moveTo(x, hz); g.lineTo(x, top); g.stroke();
  g.save(); g.beginPath();
  const ond = (u, v) => ({ x: x + u * fw, y: top + v * fh + Math.sin(t * 2.2 + u * 5) * 6 * s * u });
  const franja = (v0, v1, u0, u1, col) => { g.fillStyle = col; g.beginPath(); const a = ond(u0, v0), b2 = ond(u1, v0), c = ond(u1, v1), d = ond(u0, v1); g.moveTo(a.x, a.y);
    for (let i = 1; i <= 8; i++) { const p = ond(u0 + (u1 - u0) * i / 8, v0); g.lineTo(p.x, p.y); } for (let i = 8; i >= 0; i--) { const p = ond(u0 + (u1 - u0) * i / 8, v1); g.lineTo(p.x, p.y); } g.fill(); };
  franja(0, 0.5, 0, 1, '#f2f2f2'); franja(0.5, 1, 0, 1, '#d52b1e'); franja(0, 0.5, 0, 1 / 3, '#0039a6');
  const e = ond(1 / 6, 0.25); g.fillStyle = '#fff'; g.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 * s : 10 * s, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r); } g.fill();
  g.restore();
}
function plaza(g, t, k) {
  // Plaza Dignidad como en las fotos: la rotonda llena de gente, el monumento rayado con personas y banderas arriba
  const hz = HZ(), s = (0.55 + k * 1.5) * H * 0.001, cx = W / 2 - cam.x * 30;
  // la multitud de la plaza, hasta donde alcanza la vista
  for (let i = 0; i < 900; i++) {
    const u = hsh(i, 1), v = hsh(i, 2), x = W * (0.02 + u * 0.96) - cam.x * 26, y = hz - 2 - v * H * 0.022 * (0.4 + k);
    g.fillStyle = ROPA[Math.floor(hsh(i, 3) * ROPA.length)]; g.fillRect(x, y, 2 + v * 2, 3 + v * 3);
    if (hsh(i, 5) > 0.985) { g.fillStyle = '#2a2a2a'; g.fillRect(x, y - 14 * s - 6, 1, 14 * s + 6); g.fillStyle = BANDERAS[i % BANDERAS.length].c[0]; g.fillRect(x, y - 14 * s - 6, 9 * s + 5, 6 * s + 3); }
  }
  // gradas de piedra y pedestal rayado
  g.fillStyle = '#a8a39a'; g.beginPath(); g.moveTo(cx - 95 * s, hz); g.lineTo(cx - 80 * s, hz - 18 * s); g.lineTo(cx + 80 * s, hz - 18 * s); g.lineTo(cx + 95 * s, hz); g.fill();
  g.fillStyle = '#bcb7ad'; g.fillRect(cx - 62 * s, hz - 40 * s, 124 * s, 22 * s);
  g.fillStyle = '#c9c4ba'; g.fillRect(cx - 40 * s, hz - 128 * s, 80 * s, 88 * s);
  g.fillStyle = '#b2ada3'; g.fillRect(cx + 14 * s, hz - 128 * s, 26 * s, 88 * s);
  for (let i = 0; i < 26; i++) { // rayados de colores sobre la piedra
    g.fillStyle = ['rgba(232,32,42,.7)', 'rgba(20,20,20,.6)', 'rgba(34,193,107,.6)', 'rgba(61,139,255,.55)', 'rgba(150,60,170,.55)'][i % 5];
    g.fillRect(cx + (hsh(i, 7) - 0.5) * 76 * s, hz - (44 + hsh(i, 8) * 80) * s, (6 + hsh(i, 9) * 18) * s, (2 + hsh(i, 10) * 5) * s);
  }
  g.fillStyle = 'rgba(20,20,20,.75)'; g.font = `900 ${12 * s}px ${ST}`; g.textAlign = 'center'; g.fillText('DIGNIDAD', cx, hz - 70 * s);
  // estatua ecuestre de bronce
  g.fillStyle = '#3b3a35';
  g.beginPath(); g.moveTo(cx - 34 * s, hz - 128 * s); g.lineTo(cx - 30 * s, hz - 150 * s); g.lineTo(cx - 10 * s, hz - 158 * s); g.lineTo(cx + 18 * s, hz - 156 * s);
  g.lineTo(cx + 30 * s, hz - 172 * s); g.lineTo(cx + 38 * s, hz - 168 * s); g.lineTo(cx + 32 * s, hz - 150 * s); g.lineTo(cx + 30 * s, hz - 128 * s); g.fill();
  g.fillRect(cx - 4 * s, hz - 182 * s, 10 * s, 26 * s); g.beginPath(); g.arc(cx + 1 * s, hz - 186 * s, 5 * s, 0, 7); g.fill();
  // gente arriba del monumento y en el pedestal, con banderas
  for (let i = 0; i < 14; i++) {
    const px = cx + (i - 6.5) * 6 * s, py = i % 3 ? hz - 128 * s : hz - 40 * s - (i % 2) * 2 * s, sube = i % 4 === 0 ? 4 * s * Math.sin(t * 3 + i) : 0;
    g.fillStyle = ROPA[(i * 3) % ROPA.length]; g.fillRect(px - 2 * s, py - 12 * s, 4 * s, 12 * s);
    g.fillStyle = PIEL[i % PIEL.length]; g.beginPath(); g.arc(px, py - 14 * s, 2.2 * s, 0, 7); g.fill();
    if (i % 4 === 0) { g.strokeStyle = PIEL[i % PIEL.length]; g.lineWidth = Math.max(1, 1.2 * s); g.beginPath(); g.moveTo(px + 2 * s, py - 10 * s); g.lineTo(px + 4 * s, py - 20 * s - sube); g.stroke(); }
  }
  for (const [dx, h, bi] of [[-30, 215, 0], [8, 236, 1], [30, 205, 2], [-12, 200, 3]]) {
    const fx = cx + dx * s, fy = hz - h * s;
    g.strokeStyle = '#2a2a2a'; g.lineWidth = Math.max(1, 1.4 * s); g.beginPath(); g.moveTo(fx, hz - 135 * s); g.lineTo(fx, fy); g.stroke();
    bandera(g, t + dx, fx, fy, 38 * s, 24 * s, BANDERAS[bi]);
  }
  // humo de bengalas y barricadas
  for (let i = 0; i < 6; i++) { const x = cx + (i - 2.5) * 110 * s + Math.sin(t * 0.3 + i) * 20, y = hz - 30 * s - ((t * 14 + i * 50) % 200) * s, a = 1 - ((t * 14 + i * 50) % 200) / 200;
    g.fillStyle = i % 3 === 1 ? `rgba(255,120,120,${0.25 * a})` : `rgba(150,145,140,${0.22 * a})`; g.beginPath(); g.arc(x, y, (30 + (1 - a) * 40) * s, 0, 7); g.fill(); }
}
// ---------- multitud ----------
const ROPA = ['#1d1d22', '#2b2f3a', '#e8202a', '#3d3a35', '#f0ece2', '#22c16b', '#6b4a8a', '#1f4f8a', '#5a5a5a', '#8a2d2d', '#0f0f12', '#c7b38a'];
const PIEL = ['#c99c7c', '#a87454', '#8a5a3c', '#e0b898', '#6e4630'];
const BANDERAS = [
  { tipo: 'chile', c: ['#f2f2f2', '#d52b1e', '#0039a6'] },
  { tipo: 'liso', c: ['#111111'] },                         // bandera chilena negra: dibujada como paño negro con estrella gris
  { tipo: 'liso', c: ['#22c16b'] },                         // pañuelo verde
  { tipo: 'liso', c: ['#7b3fa0'] },                         // morado feminista
];
function bandera(g, t, x, y, w, h, b2) {
  const ond = u => Math.sin(t * 3.4 + u * 5) * h * 0.12 * u;
  const franja = (u0, u1, v0, v1, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i <= 6; i++) { const u = u0 + (u1 - u0) * i / 6; g.lineTo(x + u * w, y + v0 * h + ond(u)); } for (let i = 6; i >= 0; i--) { const u = u0 + (u1 - u0) * i / 6; g.lineTo(x + u * w, y + v1 * h + ond(u)); } g.fill(); };
  if (b2.tipo === 'chile') { franja(0, 1, 0, 0.5, b2.c[0]); franja(0, 1, 0.5, 1, b2.c[1]); franja(0, 1 / 3, 0, 0.5, b2.c[2]); }
  else { franja(0, 1, 0, 1, b2.c[0]); if (b2.c[0] === '#111111') { g.fillStyle = '#777'; g.beginPath(); g.arc(x + w / 6, y + h / 4 + ond(1 / 6), h * 0.08, 0, 7); g.fill(); } }
}
// Personas fijas en el mundo a ambos lados de la calle (nivel 1). Se generan una vez; la calle avanza bajo ellas.
const GENTE = Array.from({ length: 900 }, (_, i) => ({
  z: (i / 900) * 84, x: 0.25 + Math.pow(Math.random(), 1.4) * 10, lado: i % 2 ? 1 : -1, alto: rnd(1.55, 1.85),
  ropa: ROPA[Math.floor(Math.random() * ROPA.length)], piel: PIEL[Math.floor(Math.random() * PIEL.length)],
  brazo: Math.random() < 0.3, fase: Math.random() * 7,
  bandera: Math.random() < 0.06 ? BANDERAS[Math.floor(Math.random() * BANDERAS.length)] : null,
  cartel: Math.random() < 0.05, bengala: Math.random() < 0.025 ? (Math.random() < 0.5 ? '255,70,70' : '80,230,130') : null,
}));
const LIENZOS = [['HASTA QUE LA DIGNIDAD', 'SE HAGA COSTUMBRE'], ['NO SON 30 PESOS', 'SON 30 AÑOS'], ['CHILE', 'DESPERTÓ']];
function multitud(g, t) {
  const av = estado.metros, borde = CONFIG.anchoCarril * 1.5 + 0.45, lista = [];
  for (const p of GENTE) { const z = ((p.z - av) % 84 + 84) % 84 + 1.6; lista.push([z, p]); }
  lista.sort((a, b2) => b2[0] - a[0]);
  for (const [z, p] of lista) persona(g, t, p, p.lado * (borde + p.x), z);
}
function persona(g, t, p, xw, z) {
  const base = P(xw, 0, z), s = base.s, x = base.x, y = base.y;
  if (s < 3) { g.fillStyle = p.ropa; g.fillRect(x - 1, y - p.alto * s, 2, p.alto * s); return; }
  const hc = p.alto * s, salto = p.brazo ? Math.max(0, Math.sin(t * 5 + p.fase)) * 0.05 * s : 0;
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x, y, 0.28 * s, 0.06 * s, 0, 0, 7); g.fill();
  g.fillStyle = '#26262c'; g.fillRect(x - 0.15 * s, y - hc * 0.48 - salto, 0.3 * s, hc * 0.48);                 // piernas
  g.fillStyle = p.ropa; g.fillRect(x - 0.2 * s, y - hc * 0.84 - salto, 0.4 * s, hc * 0.4);                        // torso
  g.fillStyle = p.piel; g.beginPath(); g.arc(x, y - hc * 0.91 - salto, 0.11 * s, 0, 7); g.fill();               // cabeza
  if (p.brazo || p.bandera || p.bengala || p.cartel) {                                                         // brazo arriba
    const ax = x + 0.2 * s, ay = y - hc * 0.8 - salto, mx = ax + 0.08 * s, my = ay - 0.55 * s + Math.sin(t * 5 + p.fase) * 0.04 * s;
    g.strokeStyle = p.ropa; g.lineWidth = Math.max(1, 0.09 * s); g.lineCap = 'round'; g.beginPath(); g.moveTo(ax, ay); g.lineTo(mx, my); g.stroke();
    if (p.bandera) { g.strokeStyle = '#2a2a2a'; g.lineWidth = Math.max(1, 0.03 * s); g.beginPath(); g.moveTo(mx, my + 0.3 * s); g.lineTo(mx, my - 1.4 * s); g.stroke(); bandera(g, t + p.fase, mx, my - 1.4 * s, 0.9 * s, 0.6 * s, p.bandera); }
    else if (p.cartel) { g.fillStyle = '#efe9dc'; g.fillRect(mx - 0.35 * s, my - 0.45 * s, 0.7 * s, 0.4 * s); g.fillStyle = '#222'; for (let i = 0; i < 3; i++) g.fillRect(mx - 0.28 * s, my - 0.38 * s + i * 0.11 * s, (0.4 + hsh(i, p.fase) * 0.16) * s, 0.04 * s); }
    else if (p.bengala) { // bengala encendida y su humo de color
      const gl = g.createRadialGradient(mx, my, 0, mx, my, 0.5 * s); gl.addColorStop(0, `rgba(${p.bengala},1)`); gl.addColorStop(1, `rgba(${p.bengala},0)`);
      g.fillStyle = gl; g.beginPath(); g.arc(mx, my, 0.5 * s, 0, 7); g.fill();
      if (s < 90) for (let i = 0; i < 7; i++) { const k = ((t * 0.5 + i / 7 + p.fase) % 1); g.fillStyle = `rgba(${p.bengala},${0.2 * (1 - k)})`; g.beginPath(); g.arc(mx + Math.sin(k * 6 + p.fase) * 0.3 * s - k * 0.6 * s, my - k * 3.2 * s, (0.2 + k * 0.7) * s, 0, 7); g.fill(); }
    }
  }
}
function lienzo(g, t, x, z, textos) {
  // lienzo negro sostenido por dos personas, de frente a quien corre (como en Plaza Dignidad)
  const w = 3.4, l = P(x - w / 2, 2.15, z), r = P(x + w / 2, 2.15, z), bt = P(x, 1.0, z), s = l.s; if (s < 2) return;
  const ond = Math.sin(t * 2 + x) * s * 0.03;
  g.fillStyle = '#121212'; g.beginPath(); g.moveTo(l.x, l.y); g.quadraticCurveTo((l.x + r.x) / 2, l.y + ond, r.x, r.y); g.lineTo(r.x, bt.y); g.quadraticCurveTo((l.x + r.x) / 2, bt.y + ond, l.x, bt.y); g.fill();
  const alto = bt.y - l.y; g.fillStyle = '#f2f0ea'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 ${alto * 0.34}px ${ST}`; g.fillText(textos[0], (l.x + r.x) / 2, l.y + alto * 0.3, (r.x - l.x) * 0.72);
  g.fillText(textos[1], (l.x + r.x) / 2, l.y + alto * 0.72, (r.x - l.x) * 0.72); g.textBaseline = 'alphabetic';
  for (const ex of [l.x + (r.x - l.x) * 0.08, r.x - (r.x - l.x) * 0.08]) { // ojos dibujados en las puntas
    g.strokeStyle = '#f2f0ea'; g.lineWidth = Math.max(1, s * 0.025); g.beginPath(); g.ellipse(ex, l.y + alto * 0.5, alto * 0.16, alto * 0.08, 0, 0, 7); g.stroke();
    g.fillStyle = '#f2f0ea'; g.beginPath(); g.arc(ex, l.y + alto * 0.5, alto * 0.05, 0, 7); g.fill();
  }
  for (const [px, i] of [[x - w / 2, 1], [x + w / 2, 2]]) persona(g, t, { alto: 1.72, ropa: ROPA[i * 4 % ROPA.length], piel: PIEL[i], brazo: false, fase: i }, px, z + 0.05);
}
// ---------- ciudad de día al fondo ----------
const BLOQUES = Array.from({ length: 30 }, (_, i) => ({ x: i / 30 + rnd(-0.01, 0.01), w: rnd(0.025, 0.05), h: rnd(0.03, 0.11), c: ['#d9d3c6', '#c6bfb0', '#e6e1d6', '#b8b1a3'][i % 4] }));
function ciudadDeDia(g, t) {
  const hz = HZ();
  for (const e of BLOQUES) {
    const x = e.x * W - cam.x * 18, h = e.h * H, w = e.w * W;
    g.fillStyle = e.c; g.fillRect(x, hz - h, w, h + 1);
    g.fillStyle = 'rgba(70,85,105,.45)'; for (let r = 0; r < h / 7 - 1; r++) for (let c = 0; c < w / 6 - 1; c++) g.fillRect(x + 3 + c * 6, hz - h + 4 + r * 7, 3, 3);
    g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x + w * 0.7, hz - h, w * 0.3, h);
  }
  // grúas de construcción, como en la foto aérea
  for (const [f, h] of [[0.78, 0.15], [0.9, 0.13]]) { const x = W * f - cam.x * 18, y = HZ() - H * h;
    g.strokeStyle = '#d7a81e'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, HZ()); g.lineTo(x, y); g.moveTo(x - W * 0.03, y); g.lineTo(x + W * 0.06, y); g.moveTo(x, y - H * 0.015); g.lineTo(x + W * 0.06, y); g.stroke(); }
  // árboles del parque Forestal a la izquierda
  g.fillStyle = '#4c6b3c'; for (let i = 0; i < 16; i++) { const x = W * (0.02 + i * 0.022) - cam.x * 20; g.beginPath(); g.arc(x, hz - H * 0.012 - hsh(i, 2) * H * 0.012, H * (0.016 + hsh(i, 3) * 0.012), 0, 7); g.fill(); }
}
function moneda(g, t, k) {
  // La Moneda al fondo de la Alameda: fachada blanca, columnas, bandera; crece con el avance
  const hz = HZ(), s = (0.35 + k * 1.6) * H * 0.001, cx = W / 2 - cam.x * 30, w = 330 * s, h = 70 * s;
  g.fillStyle = '#e8e4da'; g.fillRect(cx - w / 2, hz - h, w, h);
  g.fillStyle = '#d6d1c5'; g.fillRect(cx - w * 0.14, hz - h * 1.25, w * 0.28, h * 0.25);
  g.beginPath(); g.moveTo(cx - w * 0.16, hz - h * 1.25); g.lineTo(cx, hz - h * 1.45); g.lineTo(cx + w * 0.16, hz - h * 1.25); g.fill();
  g.fillStyle = 'rgba(70,70,80,.45)';
  for (let i = 0; i < 22; i++) { const x = cx - w / 2 + w * (i + 0.5) / 22; g.fillRect(x - 2 * s, hz - h * 0.85, 4 * s, h * (i % 3 ? 0.3 : 0.65)); }
  g.fillStyle = '#c9c4b8'; g.fillRect(cx - w / 2, hz - h, w, 4 * s);
  // bandera
  const fx = cx, fy = hz - h * 2.3, fw = 46 * s, fh = 30 * s, o = Math.sin(t * 3) * 2 * s;
  g.strokeStyle = '#555'; g.lineWidth = Math.max(1, 1.5 * s); g.beginPath(); g.moveTo(fx, hz - h * 1.45); g.lineTo(fx, fy); g.stroke();
  g.fillStyle = '#f2f2f2'; g.fillRect(fx, fy + o, fw, fh / 2); g.fillStyle = '#d52b1e'; g.fillRect(fx, fy + fh / 2 + o, fw, fh / 2);
  g.fillStyle = '#0039a6'; g.fillRect(fx, fy + o, fw / 3, fh / 2);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(fx + fw / 6, fy + fh / 4 + o, fh / 10, 0, 7); g.fill();
}

function calle(g, t, niv) {
  const hz = HZ(), media = CONFIG.anchoCarril * 1.5 + 0.2, zF = 90, zN = 0.6, pal = PALETA[niv.cielo];
  g.fillStyle = pal.vereda; g.fillRect(0, hz, W, H - hz);
  quad(g, P(-media - 6, 0, zN), P(-media - 6, 0, zF), P(media + 6, 0, zF), P(media + 6, 0, zN), pal.vereda);
  const ag = g.createLinearGradient(0, hz, 0, H); ag.addColorStop(0, pal.asfalto[0]); ag.addColorStop(1, pal.asfalto[1]);
  quad(g, P(-media, 0, zN), P(-media, 0, zF), P(media, 0, zF), P(media, 0, zN), ag);
  if (estado.agua > 0.05) { g.fillStyle = `rgba(111,149,255,${0.1 * estado.agua})`; g.fillRect(0, hz, W, H - hz); }
  for (const xl of [-0.5, 0.5].map(v => v * CONFIG.anchoCarril)) for (let k = 0; k < 26; k++) {
    const z0 = k * 4 - (estado.metros % 4) + zN, z1 = z0 + 1.8; if (z0 < zN) continue;
    const w = 0.06; quad(g, P(xl - w, 0, z0), P(xl - w, 0, z1), P(xl + w, 0, z1), P(xl + w, 0, z0), 'rgba(239,233,220,.5)');
  }
  // escombros y piedras en el nivel 1
  if (niv.muro === 'multitud') for (let k = 0; k < 18; k++) {
    const z = ((k * 5.3 - estado.metros) % 90 + 90) % 90 + 1, x = ((k * 7919) % 100) / 100 * media * 2 - media, p = P(x, 0, z);
    g.fillStyle = 'rgba(80,72,70,.6)'; g.fillRect(p.x, p.y - p.s * 0.04, p.s * 0.12, p.s * 0.06);
  }
  for (const s of [-1, 1]) quad(g, P(s * media, 0, zN), P(s * media, 0, zF), P(s * (media + 0.12), 0.12, zF), P(s * (media + 0.12), 0.12, zN), '#5c5222');
}
function muros(g, objs, t, niv) {
  const media = { multitud: 22, cortinas: 11, carteles: 16 }[niv.muro] || 10, av = estado.metros, pal = PALETA[niv.cielo], L = 9;
  // fachadas de edificios a ambos lados, fijas en el mundo; se dibujan de la más lejana a la más cercana
  const lista = [];
  for (let k = -1; k < 11; k++) {
    const idx = Math.floor(av / L) + k, z0 = idx * L - av, z1 = z0 + L - 0.5;
    if (z1 < 0.8) continue;
    for (const s of [-1, 1]) lista.push({ idx, s, z0: Math.max(0.6, z0), zr: z0, z1 });
  }
  lista.sort((a, b2) => b2.z1 - a.z1);
  for (const f of lista) fachada(g, t, niv, pal, f, media);
  for (const f of lista) if (f.idx % 2 === 0 && f.zr > 1) {
    const x = f.s * (media - 0.02), z = f.zr + 1;
    if (niv.muro === 'carteles') afiche(g, x, z, f.s, f.idx); else rayado(g, x, z, niv.rayados[Math.abs(f.idx) % niv.rayados.length], f.s, niv);
  }
  if (niv.muro === 'multitud') {
    multitud(g, t);
    for (let k = 0; k < 4; k++) { // lienzos sostenidos por la gente, de frente
      const idx = Math.floor(av / 38) + k, z = idx * 38 - av + 20, s = idx % 2 ? 1 : -1;
      if (z > 2) objs.push({ z, d: () => lienzo(g, t, s * (CONFIG.anchoCarril * 1.5 + 2.4), z, LIENZOS[Math.abs(idx) % LIENZOS.length]) });
    }
  }
  for (let k = 0; k < 7; k++) { const z = k * 14 - (av % 14) + 2; if (z > 0.8) for (const s of [-1, 1]) objs.push({ z, d: () => poste(g, s * (CONFIG.anchoCarril * 1.5 + 0.9), z, niv) }); }
  if (niv.muro === 'carteles') for (let k = 0; k < 6; k++) { // nivel 3: vallas alineadas a lo largo de la vereda
    const z = k * 16 - (av % 16) + 7; if (z > 1) for (const lado of [-1, 1]) objs.push({ z, d: () => vallaBorde(g, lado * (CONFIG.anchoCarril * 1.5 + 0.55), z) });
  }
}
function fachada(g, t, niv, pal, f, media) {
  const { idx, s, z0, z1 } = f, x = s * media, r = hsh(idx, s);
  const h = niv.muro === 'multitud' ? 6 + r * 9 : niv.muro === 'carteles' ? 7 + r * 5 : 8 + r * 10;
  const col = pal.fachadas[Math.floor(hsh(idx, s + 5) * pal.fachadas.length)];
  quad(g, P(x, 0, z0), P(x, 0, z1), P(x, h, z1), P(x, h, z0), col);
  quad(g, P(x, h - 0.4, z0), P(x, h - 0.4, z1), P(x, h, z1), P(x, h, z0), 'rgba(0,0,0,.15)');            // cornisa
  quad(g, P(x, 0, z0), P(x, 0, z1), P(x, 3, z1), P(x, 3, z0), niv.muro === 'cortinas' ? '#2a2c33' : 'rgba(0,0,0,.18)'); // planta baja
  if (niv.muro === 'cortinas') { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.beginPath(); for (let y = 0.3; y < 3; y += 0.3) { const a = P(x, y, z0), b2 = P(x, y, z1); g.moveTo(a.x, a.y); g.lineTo(b2.x, b2.y); } g.stroke(); }
  const pisos = Math.floor((h - 3.4) / 3), cols = Math.max(1, Math.round((z1 - z0) / 2.1)), paso = (z1 - z0) / cols;
  for (let p = 0; p < pisos; p++) for (let q = 0; q < cols; q++) {
    const y0 = 3.6 + p * 3, za = z0 + q * paso + paso * 0.22, zb = za + paso * 0.56;
    const enc = pal.noche && hsh(idx * 31 + p * 7 + q, s) > 0.88;
    quad(g, P(x, y0, za), P(x, y0, zb), P(x, y0 + 1.6, zb), P(x, y0 + 1.6, za), enc ? '#e7b66a' : pal.ventana);
  }
  const bruma = clamp(f.z1 / 80) * (niv.cielo === 'dia' ? 0.55 : 0.35);                                   // perspectiva atmosférica
  if (bruma > 0.02) quad(g, P(x, 0, z0), P(x, 0, z1), P(x, h, z1), P(x, h, z0), `rgba(${pal.bruma},${bruma})`);
}
function poste(g, x, z, niv) {
  const a = P(x, 0, z), c = P(x, 4.6, z), w = Math.max(1, 0.08 * a.s);
  g.fillStyle = '#2a2a33'; g.fillRect(a.x - w / 2, c.y, w, a.y - c.y);
  const lx = P(x - Math.sign(x) * 1.1, 4.6, z);
  g.fillRect(Math.min(c.x, lx.x), c.y, Math.abs(lx.x - c.x), w);
  if (!PALETA[niv.cielo].noche) return;
  const r = 0.9 * a.s, gl = g.createRadialGradient(lx.x, lx.y, 0, lx.x, lx.y, r);
  gl.addColorStop(0, 'rgba(255,190,110,.6)'); gl.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = gl; g.beginPath(); g.arc(lx.x, lx.y, r, 0, 7); g.fill();
}
function textoEnMuro(g, x, z, txt, s, alto, fill, font, tam = 1.3, largo = 5) {
  const a = P(x, alto, z), c = P(x, alto, z + largo);
  if (a.s * tam < 5) return;
  const [izq, der] = a.x < c.x ? [a, c] : [c, a];
  g.save(); g.font = font || `900 100px ${ST}`;
  const tw = g.measureText(txt).width || 1;
  g.setTransform(DPR * (der.x - izq.x) / tw, DPR * (der.y - izq.y) / tw, 0, DPR * (izq.s + der.s) / 2 * tam / 100, DPR * izq.x, DPR * izq.y);
  g.globalAlpha *= clamp((z - 2) / 7);   // de cerca el muro pasa de largo: el texto se desvanece
  g.fillStyle = fill; g.textBaseline = 'middle'; g.fillText(txt, 0, 0); g.restore();
}
function rayado(g, x, z, txt, s, niv) {
  const fill = niv.muro === 'cortinas' ? 'rgba(239,233,220,.32)' : txt === 'NO +' ? 'rgba(239,233,220,.75)' : 'rgba(232,32,42,.68)';
  textoEnMuro(g, x, z, txt, s, 1.2, fill);
}
function afiche(g, x, z, s, idx) {
  // nivel 3: muros limpios tapizados de carteles gigantes
  const z0 = z, z1 = z + 7, a = P(x, 0.2, z0), b2 = P(x, 0.2, z1), c = P(x, 2.3, z1), d = P(x, 2.3, z0);
  g.fillStyle = '#f4f4f2'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b2.x, b2.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.fill();
  const a2 = P(x, 0.2, z0), b3 = P(x, 0.2, z1), c2 = P(x, 0.75, z1), d2 = P(x, 0.75, z0);
  g.fillStyle = '#10204f'; g.beginPath(); g.moveTo(a2.x, a2.y); g.lineTo(b3.x, b3.y); g.lineTo(c2.x, c2.y); g.lineTo(d2.x, d2.y); g.fill();
  const frase = idx % 3 === 2 ? 'TODO VA A ESTAR BIEN' : 'ORDEN';
  textoEnMuro(g, x, z0 + 0.6, frase, s, 1.45, '#10204f', null, 0.95, 6);
  textoEnMuro(g, x, z0 + 1.2, CONFIG.antagonista, s, 0.48, '#f4f4f2', `700 100px ${MONO}`, 0.38, 3);
}
function vallaBorde(g, x, z) {
  const a = P(x, 0, z), c = P(x, 1.05, z), w = 0.9 * a.s;
  if (a.s < 3) return;
  g.strokeStyle = '#ffd400'; g.lineWidth = Math.max(1, a.s * 0.035); g.strokeRect(a.x - w / 2, c.y, w, a.y - c.y);
  g.beginPath(); for (let i = 1; i < 6; i++) { const xx = a.x - w / 2 + w * i / 6; g.moveTo(xx, c.y); g.lineTo(xx, a.y); } g.stroke();
}

// ---------- obstáculos ----------
function sombra(g, cx, y, w, s) { g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(cx, y, w, s * 0.1, 0, 0, 7); g.fill(); }
function tinteBalizas(g, x, y, w, h) { if (estado.balizas > 0.1) { g.fillStyle = `rgba(${Math.floor(estado.t * 6) % 2 ? '31,91,255' : '232,32,42'},${0.25 * estado.balizas})`; g.fillRect(x, y, w, h); } }
const DIBUJA = {
  barricada(g, o, t) { // neumáticos, palets y fuego: se salta
    const w = CONFIG.anchoCarril * 0.48, bl = P(o.x - w, 0, o.z), br = P(o.x + w, 0, o.z), s = bl.s; if (s < 2) return;
    sombra(g, (bl.x + br.x) / 2, bl.y, (br.x - bl.x) * 0.55, s);
    g.fillStyle = '#4a3523'; g.save(); g.translate((bl.x + br.x) / 2, bl.y - s * 0.3); g.rotate((o.semilla - 0.5) * 0.3); g.fillRect(-s * 0.55, -s * 0.12, s * 1.1, s * 0.16); g.restore();
    for (let i = 0; i < 4; i++) { const cx = lerp(bl.x, br.x, 0.2 + i * 0.2), cy = bl.y - s * (0.12 + (i % 2) * 0.22);
      g.fillStyle = '#121216'; g.beginPath(); g.ellipse(cx, cy, s * 0.2, s * 0.12, 0, 0, 7); g.fill(); g.fillStyle = '#26262c'; g.beginPath(); g.ellipse(cx, cy, s * 0.08, s * 0.05, 0, 0, 7); g.fill(); }
    for (let i = 0; i < 5; i++) { const fx = lerp(bl.x, br.x, 0.2 + i * 0.15), fh = s * (0.35 + 0.25 * Math.abs(Math.sin(t * 9 + i * 2 + o.semilla * 9)));
      const gr = g.createLinearGradient(0, bl.y - s * 0.4 - fh, 0, bl.y - s * 0.3); gr.addColorStop(0, 'rgba(255,220,90,0)'); gr.addColorStop(0.5, 'rgba(255,140,40,.9)'); gr.addColorStop(1, 'rgba(232,60,20,.9)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(fx - s * 0.08, bl.y - s * 0.3); g.quadraticCurveTo(fx + Math.sin(t * 7 + i) * s * 0.05, bl.y - s * 0.3 - fh, fx + s * 0.08, bl.y - s * 0.3); g.fill(); }
    const gl = g.createRadialGradient((bl.x + br.x) / 2, bl.y - s * 0.5, 0, (bl.x + br.x) / 2, bl.y - s * 0.5, s * 1.4); gl.addColorStop(0, 'rgba(255,120,40,.25)'); gl.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = gl; g.beginPath(); g.arc((bl.x + br.x) / 2, bl.y - s * 0.5, s * 1.4, 0, 7); g.fill();
  },
  senal(g, o) { // señalética arrancada: plancha metálica y un PARE torcido. Alto: hay que cambiar de calle
    const w = CONFIG.anchoCarril * 0.46, bl = P(o.x - w, 0, o.z), br = P(o.x + w, 0, o.z), s = bl.s; if (s < 2) return;
    sombra(g, (bl.x + br.x) / 2, bl.y, (br.x - bl.x) * 0.55, s);
    g.save(); g.translate(lerp(bl.x, br.x, 0.4), bl.y); g.rotate(-0.12 + (o.semilla - 0.5) * 0.1);
    g.fillStyle = '#3c5a8a'; g.fillRect(-s * 0.5, -s * 1.9, s * 0.95, s * 1.75); // letrero azul de calle, doblado
    g.fillStyle = '#efe9dc'; g.font = `700 ${s * 0.2}px ${MONO}`; g.textAlign = 'center'; g.fillText('ALAMEDA', -s * 0.02, -s * 1.55);
    g.fillStyle = 'rgba(232,32,42,.85)'; g.font = `900 ${s * 0.42}px ${ST}`; g.fillText('EVADE', -s * 0.02, -s * 0.7);
    g.restore();
    const px = lerp(bl.x, br.x, 0.85); g.strokeStyle = '#777'; g.lineWidth = Math.max(1, s * 0.05); g.beginPath(); g.moveTo(px, bl.y); g.lineTo(px + s * 0.25, bl.y - s * 1.5); g.stroke();
    const cx = px + s * 0.25, cy = bl.y - s * 1.7, r = s * 0.3; g.fillStyle = '#c8102e'; g.beginPath();
    for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.fill();
    g.fillStyle = '#fff'; g.font = `900 ${s * 0.16}px ${ST}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PARE', cx, cy); g.textBaseline = 'alphabetic';
  },
  semaforo(g, o, t) { // semáforo colgando de un cable a la altura de la cabeza: hay que agacharse
    const w = CONFIG.anchoCarril * 0.6, l = P(o.x - w, 2.4, o.z), r = P(o.x + w, 2.4, o.z), s = l.s; if (s < 2) return;
    g.strokeStyle = '#111'; g.lineWidth = Math.max(1, s * 0.025); g.beginPath(); g.moveTo(l.x, l.y); g.quadraticCurveTo((l.x + r.x) / 2, l.y + s * 0.5, r.x, r.y); g.stroke();
    const sw = Math.sin(t * 2 + o.semilla * 6) * 0.08, cx = (l.x + r.x) / 2, top = l.y + s * 0.25;
    g.save(); g.translate(cx, top); g.rotate(sw);
    g.fillStyle = '#1a1a1a'; g.fillRect(-s * 0.16, 0, s * 0.32, s * 0.95);
    ['#e8202a', '#ffb000', '#22c16b'].forEach((c, i) => { g.fillStyle = (Math.floor(t * 2) % 3 === i) ? c : '#333'; g.beginPath(); g.arc(0, s * (0.17 + i * 0.3), s * 0.1, 0, 7); g.fill(); });
    g.fillStyle = 'rgba(239,233,220,.6)'; g.fillRect(-s * 0.6, s * 0.95, s * 1.2, s * 0.05);
    g.restore();
  },
  valla(g, o) { // valla papal amarilla: se salta
    const w = CONFIG.anchoCarril * 0.48, h = 1.05, bl = P(o.x - w, 0, o.z), br = P(o.x + w, 0, o.z), tl = P(o.x - w, h, o.z), s = bl.s; if (s < 2) return;
    sombra(g, (bl.x + br.x) / 2, bl.y, (br.x - bl.x) * 0.55, s);
    const lw = Math.max(1, s * 0.045); g.strokeStyle = '#ffd400'; g.lineWidth = lw;
    g.strokeRect(tl.x, tl.y, br.x - bl.x, bl.y - tl.y - s * 0.1);
    g.lineWidth = Math.max(1, lw * 0.6); g.beginPath(); for (let i = 1; i < 10; i++) { const x = lerp(tl.x, br.x, i / 10); g.moveTo(x, tl.y); g.lineTo(x, bl.y - s * 0.1); } g.stroke();
    g.lineWidth = lw; g.beginPath(); for (const px of [tl.x + lw, br.x - lw]) { g.moveTo(px, bl.y - s * 0.1); g.lineTo(px - s * 0.12, bl.y); g.moveTo(px, bl.y - s * 0.1); g.lineTo(px + s * 0.12, bl.y); } g.stroke();
    tinteBalizas(g, tl.x, tl.y, br.x - bl.x, bl.y - tl.y);
  },
  toque(g, o) { // letrero de toque de queda sobre caballetes: alto
    const w = CONFIG.anchoCarril * 0.5, bl = P(o.x - w, 0, o.z), br = P(o.x + w, 0, o.z), t0 = P(o.x - w, 2.6, o.z), m0 = P(o.x - w, 1.0, o.z), s = bl.s; if (s < 2) return;
    sombra(g, (bl.x + br.x) / 2, bl.y, (br.x - bl.x) * 0.5, s);
    const ancho = br.x - bl.x, alto = m0.y - t0.y;
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#f2f2f2' : '#c8102e'; g.fillRect(bl.x + ancho * i / 6, m0.y + (bl.y - m0.y) * 0.3, ancho / 6, (bl.y - m0.y) * 0.25); }
    g.fillStyle = '#3a3a44'; g.fillRect(lerp(bl.x, br.x, 0.15), m0.y, s * 0.05, bl.y - m0.y); g.fillRect(lerp(bl.x, br.x, 0.85), m0.y, s * 0.05, bl.y - m0.y);
    g.fillStyle = '#f2f2f2'; g.fillRect(t0.x, t0.y, ancho, alto);
    g.fillStyle = '#c8102e'; g.fillRect(t0.x, t0.y, ancho, alto * 0.22);
    g.textAlign = 'center'; g.fillStyle = '#f2f2f2'; g.font = `700 ${alto * 0.13}px ${MONO}`; g.fillText('ESTADO DE EXCEPCIÓN', t0.x + ancho / 2, t0.y + alto * 0.15, ancho * 0.9);
    g.fillStyle = '#111'; g.font = `900 ${alto * 0.3}px ${ST}`; g.fillText('TOQUE DE QUEDA', t0.x + ancho / 2, t0.y + alto * 0.55, ancho * 0.92);
    g.font = `900 ${alto * 0.28}px ${ST}`; g.fillText('22:00', t0.x + ancho / 2, t0.y + alto * 0.88);
    tinteBalizas(g, t0.x, t0.y, ancho, alto);
  },
  cinta(g, o, t) { // cinta de cuarentena cruzada con un letrero colgando: hay que agacharse
    const w = CONFIG.anchoCarril * 0.6, l = P(o.x - w, 1.45, o.z), r = P(o.x + w, 1.45, o.z), s = l.s; if (s < 2) return;
    g.fillStyle = '#3a3a44'; for (const p of [l, r]) g.fillRect(p.x - s * 0.03, p.y, s * 0.06, P(o.x, 0, o.z).y - p.y);
    const sag = s * 0.08;
    for (let i = 0; i < 12; i++) { const a = i / 12, b2 = (i + 1) / 12; g.strokeStyle = i % 2 ? '#111' : '#ffd400'; g.lineWidth = Math.max(2, s * 0.07);
      g.beginPath(); g.moveTo(lerp(l.x, r.x, a), l.y + Math.sin(a * Math.PI) * sag); g.lineTo(lerp(l.x, r.x, b2), l.y + Math.sin(b2 * Math.PI) * sag); g.stroke(); }
    const cx = (l.x + r.x) / 2, cy = l.y + sag + s * 0.06, sw = Math.sin(t * 2.5 + o.semilla * 5) * 0.1;
    g.save(); g.translate(cx, cy); g.rotate(sw); g.fillStyle = '#f2f2f2'; g.fillRect(-s * 0.4, 0, s * 0.8, s * 0.3);
    g.fillStyle = '#c8102e'; g.font = `900 ${s * 0.17}px ${ST}`; g.textAlign = 'center'; g.fillText('CUARENTENA', 0, s * 0.21); g.restore();
    tinteBalizas(g, l.x, l.y - s * 0.1, r.x - l.x, s * 0.5);
  },
  cartel(g, o) { // cartel de propaganda: alto
    const w = CONFIG.anchoCarril * 0.5, bl = P(o.x - w, 0, o.z), br = P(o.x + w, 0, o.z), t0 = P(o.x - w, 3.1, o.z), m0 = P(o.x - w, 1.3, o.z), s = bl.s; if (s < 2) return;
    sombra(g, (bl.x + br.x) / 2, bl.y, (br.x - bl.x) * 0.5, s);
    g.fillStyle = '#3a3a44'; const pw = Math.max(1, s * 0.07);
    g.fillRect(lerp(bl.x, br.x, 0.18) - pw / 2, m0.y, pw, bl.y - m0.y); g.fillRect(lerp(bl.x, br.x, 0.82) - pw / 2, m0.y, pw, bl.y - m0.y);
    const ancho = br.x - bl.x, alto = m0.y - t0.y;
    g.fillStyle = '#f2f2f2'; g.fillRect(t0.x, t0.y, ancho, alto);
    g.fillStyle = '#10204f'; g.fillRect(t0.x, t0.y + alto * 0.68, ancho, alto * 0.32);
    g.fillStyle = '#c8102e'; g.fillRect(t0.x, t0.y + alto * 0.64, ancho, alto * 0.05);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#10204f'; g.font = `900 ${alto * 0.5}px ${ST}`; g.fillText('ORDEN', t0.x + ancho / 2, t0.y + alto * 0.34, ancho * 0.9);
    g.fillStyle = '#f2f2f2'; g.font = `700 ${alto * 0.22}px ${MONO}`; g.fillText(CONFIG.antagonista, t0.x + ancho / 2, t0.y + alto * 0.84, ancho * 0.9);
    g.textBaseline = 'alphabetic';
    tinteBalizas(g, t0.x, t0.y, ancho, alto);
  },
  pasacalle(g, o, t) { // pasacalle de propaganda a la altura de la cabeza: hay que agacharse
    const w = CONFIG.anchoCarril * 0.62, l = P(o.x - w, 1.95, o.z), r = P(o.x + w, 1.95, o.z), bot = P(o.x, 1.3, o.z), s = l.s; if (s < 2) return;
    g.fillStyle = '#555'; for (const p of [l, r]) g.fillRect(p.x - s * 0.025, p.y, s * 0.05, P(o.x, 0, o.z).y - p.y);
    const ond = Math.sin(t * 3 + o.semilla * 6) * s * 0.03;
    g.fillStyle = '#10204f'; g.beginPath(); g.moveTo(l.x, l.y); g.lineTo(r.x, r.y + ond); g.lineTo(r.x, bot.y + ond); g.lineTo(l.x, bot.y); g.fill();
    g.fillStyle = '#f4f4f2'; g.font = `900 ${(bot.y - l.y) * 0.42}px ${ST}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('TODO VA A ESTAR BIEN', (l.x + r.x) / 2, l.y + (bot.y - l.y) * 0.42 + ond / 2, (r.x - l.x) * 0.92);
    g.font = `700 ${(bot.y - l.y) * 0.16}px ${MONO}`; g.fillText(CONFIG.antagonista, (l.x + r.x) / 2, l.y + (bot.y - l.y) * 0.82 + ond / 2);
    g.textBaseline = 'alphabetic';
    tinteBalizas(g, l.x, l.y, r.x - l.x, bot.y - l.y);
  },
};

// ---------- personajes ----------
function corredor(g, c, t) {
  // figura poligonal de espaldas: capucha, polerón, pañoleta del color del jugador, nombre encima
  const e = estado, alfa = c.vivo ? 1 : 1 - c.salida; if (alfa <= 0.01) return;
  const suelo = P(c.x, 0, ZJ), base = P(c.x, c.y, ZJ), s = base.s, x = base.x, y = base.y;
  const fase = c.fasePaso * Math.PI * 2, corre = e.fase === 'juego' || e.fase === 'inicio' || e.fase === 'cine' || e.fase === 'sala' ? 1 : 0.15, enc = c.cub;
  g.save(); g.globalAlpha = alfa;
  if (!c.vivo) { g.translate(x, y); g.rotate(c.salida * 0.6 * (c.i - 1 || 1)); g.translate(-x, -y); }
  g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(suelo.x, suelo.y, s * 0.3 / (1 + c.y), s * 0.07, 0, 0, 7); g.fill();
  const P2 = (dx, dy) => ({ x: x + dx * s, y: y - dy * s });
  const hombro = 1.48 - enc * 0.5, cad = 0.88 - enc * 0.35;
  for (const [lado, ph] of [[-1, 0], [1, Math.PI]]) {
    const k = Math.sin(fase + ph) * corre, ca = P2(lado * 0.1, cad), ro = P2(lado * (0.12 + enc * 0.08) + k * 0.05, 0.48 - enc * 0.12 + Math.max(0, k) * 0.12), pie = P2(lado * 0.11 - k * 0.03, Math.max(0, k) * 0.28);
    g.strokeStyle = '#1b1c26'; g.lineWidth = s * 0.13; g.lineCap = 'round'; g.beginPath(); g.moveTo(ca.x, ca.y); g.lineTo(ro.x, ro.y); g.lineTo(pie.x, pie.y); g.stroke();
    g.fillStyle = '#efe9dc'; g.fillRect(pie.x - s * 0.06, pie.y - s * 0.04, s * 0.12, s * 0.06);
  }
  g.fillStyle = '#2b2c38'; g.beginPath(); let a = P2(-0.24, hombro), b2 = P2(0.24, hombro), cc = P2(0.19, cad), d = P2(-0.19, cad);
  g.moveTo(a.x, a.y); g.lineTo(b2.x, b2.y); g.lineTo(cc.x, cc.y); g.lineTo(d.x, d.y); g.fill();
  for (const lado of [-1, 1]) { // brazos: corren, o suben a cubrir la cabeza
    const k = Math.sin(fase + (lado > 0 ? 0 : Math.PI)) * corre * (1 - enc);
    const h = P2(lado * 0.23, hombro - 0.04), co = P2(lado * (0.3 - enc * 0.05), hombro - 0.32 + k * 0.1 + enc * 0.5), m = P2(lado * (0.24 - enc * 0.2), hombro - 0.55 + k * 0.22 + enc * 0.85);
    g.strokeStyle = '#2b2c38'; g.lineWidth = s * 0.1; g.beginPath(); g.moveTo(h.x, h.y); g.lineTo(co.x, co.y); g.lineTo(m.x, m.y); g.stroke();
  }
  const cab = P2(0, hombro + 0.17);
  g.fillStyle = '#1f2029'; g.beginPath(); g.moveTo(cab.x - s * 0.13, cab.y + s * 0.08); g.lineTo(cab.x - s * 0.12, cab.y - s * 0.1); g.lineTo(cab.x, cab.y - s * 0.16); g.lineTo(cab.x + s * 0.12, cab.y - s * 0.1); g.lineTo(cab.x + s * 0.13, cab.y + s * 0.08); g.closePath(); g.fill();
  const nudo = P2(0, hombro + 0.07), fl = Math.sin(t * 14 + c.i) * 0.04 * (0.4 + corre);
  g.fillStyle = c.color;
  g.beginPath(); g.moveTo(nudo.x - s * 0.13, nudo.y - s * 0.02); g.lineTo(nudo.x + s * 0.13, nudo.y - s * 0.02); g.lineTo(nudo.x, nudo.y + s * 0.07); g.closePath(); g.fill();
  for (const lado of [-1, 1]) { const p1 = P2(lado * 0.02, hombro + 0.05), p2 = P2(lado * (0.12 + fl), hombro - 0.12 + fl * lado), p3 = P2(lado * 0.05, hombro - 0.1); g.beginPath(); g.moveTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.lineTo(p3.x, p3.y); g.fill(); }
  // escudo: lo sostiene sobre la espalda y la cabeza, de cara al carro (la cámara). Sube desde abajo al levantarlo.
  if (c.escudo > 0.03) {
    const k = c.escudo, w = s * 0.62, h = s * 0.82 * k, cx = x, cy = P2(0, hombro - 0.38 + 0.55 * k).y, r = s * 0.08;
    g.save(); g.globalAlpha = alfa * Math.min(1, k * 1.4);
    g.fillStyle = '#23252f'; g.strokeStyle = c.color; g.lineWidth = Math.max(2, s * 0.05);
    g.beginPath(); g.roundRect ? g.roundRect(cx - w / 2, cy - h / 2, w, h, r) : g.rect(cx - w / 2, cy - h / 2, w, h); g.fill(); g.stroke();
    // marca pintada a mano: franja y círculo del color del jugador, como los escudos de cartón y lata de la calle
    g.fillStyle = c.color; g.globalAlpha *= 0.85;
    g.fillRect(cx - w * 0.38, cy - h * 0.06, w * 0.76, h * 0.12);
    g.beginPath(); g.arc(cx, cy - h * 0.26, Math.min(w, h) * 0.13, 0, 7); g.fill();
    // el agua revienta contra el borde de arriba
    if ((e.sale || 0) > 0.1 && e.fase === 'juego') { g.fillStyle = 'rgba(225,238,255,.8)'; g.globalAlpha = alfa;
      for (let i = 0; i < 6 * e.sale; i++) { const px = cx + rnd(-w / 2, w / 2), py = cy - h / 2 - rnd(0, s * 0.25); g.beginPath(); g.arc(px, py, rnd(1, 3) * (s / 80), 0, 7); g.fill(); } }
    g.restore();
  }
  // nombre sobre la cabeza
  if (estado.fase !== 'inicio' && estado.fase !== 'cine') {
    const ty = cab.y - s * 0.32, fs = Math.max(11, s * 0.14);
    g.font = `800 ${fs}px ${ST}`; g.textAlign = 'center'; const tw = g.measureText(c.nombre.toUpperCase()).width;
    g.fillStyle = c.color; g.fillRect(x - tw / 2 - 6, ty - fs, tw + 12, fs * 1.2);
    g.fillStyle = '#07080d'; g.fillText(c.nombre.toUpperCase(), x, ty - fs * 0.08);
    g.beginPath(); g.moveTo(x - 5, ty + fs * 0.2); g.lineTo(x + 5, ty + fs * 0.2); g.lineTo(x, ty + fs * 0.2 + 6); g.fillStyle = c.color; g.fill();
  }
  g.restore();
}
function carro(g, t) {
  // carro lanzaaguas del POC visto desde atrás y arriba, asomado al borde inferior
  const e = estado, cx = P(e.vehX, 0, 2.6).x, ancho = Math.min(W * 0.2, H * 0.42), yb = H * 0.84, alto = H * 0.07;
  g.fillStyle = '#1d2e20'; g.beginPath(); g.moveTo(cx - ancho * 1.12, H + 2); g.lineTo(cx - ancho, yb); g.lineTo(cx + ancho, yb); g.lineTo(cx + ancho * 1.12, H + 2); g.fill();
  g.fillStyle = '#2f4a32'; g.beginPath(); g.moveTo(cx - ancho, yb); g.lineTo(cx - ancho * 0.78, yb - alto); g.lineTo(cx + ancho * 0.78, yb - alto); g.lineTo(cx + ancho, yb); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(cx + i * ancho * 0.24, yb + 6); g.lineTo(cx + i * ancho * 0.27, H); g.stroke(); }
  g.fillStyle = '#efe9dc'; g.font = `700 ${Math.round(alto * 0.32)}px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('POC · LA-17', cx, yb + alto * 0.7); g.textBaseline = 'alphabetic';
  const by = yb - alto - alto * 0.12, fase = Math.floor(t * 7) % 4, bh = alto * 0.28;
  g.fillStyle = '#0d0d12'; g.fillRect(cx - ancho * 0.62, by - bh, ancho * 1.24, bh * 1.1);
  for (const [i, col] of [[-1, '232,32,42'], [1, '31,91,255']]) {
    const lit = e.balizas > 0.05 && (fase === (i < 0 ? 0 : 2) || (fase === (i < 0 ? 1 : 3) && Math.sin(t * 60) > 0));
    g.fillStyle = `rgba(${col},${lit ? 1 : 0.28})`; g.fillRect(cx + (i < 0 ? -ancho * 0.6 : ancho * 0.04), by - bh * 0.9, ancho * 0.56, bh * 0.8);
    if (lit) { const r = ancho * 1.6 * e.balizas, gl = g.createRadialGradient(cx + i * ancho * 0.3, by, 0, cx + i * ancho * 0.3, by, r); gl.addColorStop(0, `rgba(${col},.6)`); gl.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gl; g.beginPath(); g.arc(cx + i * ancho * 0.3, by, r, 0, 7); g.fill(); }
  }
  // cañón: apunta hacia donde inclina el POC y se levanta con la presión del dedo
  const ty = by - bh * 0.4, obj = P(e.apunta * 1.3, 1.6, 14), dx = obj.x - cx, dy = obj.y - ty, d = Math.hypot(dx, dy) || 1;
  const largo = alto * (1.3 + e.fuerza * 0.5), bx = cx + dx / d * largo, byy = ty + dy / d * largo;
  g.fillStyle = '#243826'; g.beginPath(); g.arc(cx, ty, alto * 0.42, Math.PI, 0); g.fill();
  g.strokeStyle = '#3d5a40'; g.lineWidth = alto * 0.22; g.lineCap = 'butt'; g.beginPath(); g.moveTo(cx, ty); g.lineTo(bx, byy); g.stroke();
  return { x: bx, y: byy };
}
function chorro(g, boca) {
  // el agua no apunta a una persona: cae sobre la escena, hacia donde se inclina el carro
  const e = estado; if (e.agua < 0.02 && !e.particulas.length) return;
  const destino = P(e.apunta * 1.3, 1.4 + e.agua * 0.6, ZJ + 1 + (1 - e.agua) * 6);
  const ctrl = { x: (boca.x + destino.x) / 2, y: Math.min(boca.y, destino.y) - H * 0.14 * (0.4 + e.agua) };
  const en = (k, off) => { const u = 1 - k; return { x: u * u * boca.x + 2 * u * k * ctrl.x + k * k * destino.x + off * k * 40, y: u * u * boca.y + 2 * u * k * ctrl.y + k * k * destino.y + off * k * 16 }; };
  if (e.agua > 0.02) {
    g.strokeStyle = `rgba(200,220,255,${0.25 + e.agua * 0.4})`; g.lineWidth = 4 + e.agua * 16; g.lineCap = 'round';
    g.beginPath(); g.moveTo(boca.x, boca.y); g.quadraticCurveTo(ctrl.x, ctrl.y, destino.x, destino.y); g.stroke();
    g.strokeStyle = `rgba(255,255,255,${0.35 + e.agua * 0.35})`; g.lineWidth = 1.5 + e.agua * 4; g.stroke();
  }
  g.fillStyle = 'rgba(220,235,255,.75)';
  for (const p of e.particulas) { const q = en(Math.min(1, p.k), p.off); g.fillRect(q.x, q.y, 2 + p.k * 3, 2 + p.k * 3); }
  if (e.agua > 0.1) { g.fillStyle = 'rgba(230,240,255,.6)'; g.beginPath(); for (let i = 0; i < 8 * e.agua; i++) { const x = destino.x + rnd(-50, 50) * e.agua, y = destino.y + rnd(-30, 24), r = rnd(1, 4); g.moveTo(x + r, y); g.arc(x, y, r, 0, 7); } g.fill(); }
}

// ---------- niebla del toque de queda ----------
function visibilidad(z, niv) {
  if (!niv.niebla) return 1;
  const lejos = 16 + estado.flash * 60;              // los destellos de las balizas abren la vista
  return clamp(1 - ((z - lejos * 0.6) / (lejos * 0.6)) * niv.niebla, Math.max(0.12, 1 - niv.niebla), 1);
}
function niebla(g, t, niv) {
  if (!niv.niebla) return;
  const hz = HZ(), k = niv.niebla * (1 - estado.flash * 0.65);
  const gr = g.createLinearGradient(0, 0, 0, H * 0.9);   // el cielo queda más claro: los cerros y torres se leen como siluetas
  gr.addColorStop(0, `rgba(24,26,33,${0.5 * k})`); gr.addColorStop(0.3, `rgba(24,26,33,${0.92 * k})`); gr.addColorStop(0.6, `rgba(24,26,33,${0.92 * k})`); gr.addColorStop(1, `rgba(24,26,33,${0.3 * k})`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 7; i++) { const x = ((i * 0.19 + t * 0.012 * (i % 2 ? 1 : -1)) % 1.2 - 0.1) * W, y = hz + (i % 3) * H * 0.08;
    const r = W * 0.25, rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(60,62,72,${0.35 * k})`); rg.addColorStop(1, 'rgba(60,62,72,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); }
}

// copia chica de la escena para el desenfoque del agua, y una gota pintada una sola vez
const borroso = document.createElement('canvas'), bg = borroso.getContext('2d');
const gota = document.createElement('canvas'); gota.width = gota.height = 64;
(() => { const gg = gota.getContext('2d'), gr = gg.createRadialGradient(22, 22, 3, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(0.6, 'rgba(150,180,240,.12)'); gr.addColorStop(1, 'rgba(20,30,60,.3)');
  gg.fillStyle = gr; gg.beginPath(); gg.arc(32, 32, 32, 0, 7); gg.fill(); })();

// grano para la estática del agua
const grano = document.createElement('canvas'); grano.width = grano.height = 192;
(() => { const gg = grano.getContext('2d'), im = gg.createImageData(192, 192); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } gg.putImageData(im, 0, 0); })();

function dibujar(t) {
  const e = estado, niv = e.fase === 'juego' || e.fase === 'placa' || e.fase === 'resultado' ? nivelActual() : CONFIG.niveles[0];
  const vs = vivos(); cam.x = lerp(cam.x, (vs.length ? vs.reduce((a, c) => a + c.x, 0) / vs.length : 0) * 0.35, 0.06);
  const sacude = e.agua * 5;
  // 1) escena al búfer
  b.save(); b.translate(rnd(-1, 1) * sacude, rnd(-1, 1) * sacude);
  cielo(b, t, niv); calle(b, t, niv);
  const objs = [];
  muros(b, objs, t, niv);
  for (const o of e.obst) if (o.z > 0.6) objs.push({ z: o.z, d: () => DIBUJA[o.tipo](b, o, t) });
  for (const c of corredores) objs.push({ z: ZJ - c.i * 0.001, d: () => corredor(b, c, t), siempre: true });
  objs.sort((p, q) => q.z - p.z);
  if (niv.niebla) niebla(b, t, niv);
  for (const o of objs) { b.globalAlpha = o.siempre ? 1 : visibilidad(o.z, niv); o.d(); b.globalAlpha = 1; }
  const boca = carro(b, t);
  chorro(b, boca);
  b.restore();

  // 2) búfer → pantalla. El agua desenfoca todo y deforma con más fuerza la zona hacia donde apunta el carro
  // Rendimiento: nada de ctx.filter (blur) por franja, que era lo que trababa el juego. El desenfoque se hace
  // dibujando una copia chica de la escena (1/6) estirada encima: el suavizado del navegador la deja borrosa casi gratis.
  ctx.clearRect(0, 0, W, H);
  const a = e.agua;
  ctx.drawImage(buf, 0, 0, W, H);
  if (a > 0.03) {
    const bw = Math.max(32, Math.round(W / 6)), bh = Math.max(24, Math.round(H / 6));
    if (borroso.width !== bw || borroso.height !== bh) { borroso.width = bw; borroso.height = bh; }
    bg.drawImage(buf, 0, 0, bw, bh);
    ctx.save(); ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = clamp(a * 1.1); ctx.drawImage(borroso, 0, 0, W, H);   // velo borroso sobre toda la escena
    // zona donde cae el agua: franjas que ondulan (desde la copia chica, pocas y anchas)
    const zx = W / 2 + e.apunta / 1.6 * W * 0.35, zw = W * (0.24 + a * 0.26);
    ctx.beginPath(); ctx.ellipse(zx, H * 0.5, zw, H * 0.7, 0, 0, 7); ctx.clip();
    ctx.globalAlpha = clamp(0.4 + a * 0.6);
    const paso = 12, sy = bh / H;
    for (let y = 0; y < H; y += paso) { const off = Math.sin(y * 0.045 + t * 10) * a * 26 + Math.sin(y * 0.13 - t * 6) * a * 8; ctx.drawImage(borroso, 0, y * sy, bw, paso * sy, off, y, W, paso); }
    ctx.restore();
    ctx.fillStyle = `rgba(90,120,190,${0.12 * a})`; ctx.fillRect(0, 0, W, H);   // el agua lava el color
  }
  // 3) gotas sobre la pantalla: un solo dibujo de gota, reutilizado
  if (e.gotas.length) {
    ctx.save(); ctx.strokeStyle = 'rgba(200,220,255,.22)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (const d of e.gotas) {
      const x = d.x * W, y = d.y * H, r = d.r;
      ctx.globalAlpha = d.vida; ctx.drawImage(gota, x - r, y - r, r * 2, r * 2);
      ctx.moveTo(x, y + r); ctx.lineTo(x, y + r + d.vida * 50);
    }
    ctx.globalAlpha = 1; ctx.stroke(); ctx.restore();
  }
  if (a > 0.05) { ctx.strokeStyle = `rgba(210,225,255,${0.2 * a})`; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 45 * a; i++) { const x = Math.random() * W, y = Math.random() * H; ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 40); } ctx.stroke(); }
  // 4) luces cegadoras: rojo y azul inundan la pantalla
  if (e.balizas > 0.03) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const rojo = ((t * 2.2) % 1) < 0.5, f = e.balizas * (0.22 + e.fuerza * 0.55) * (e.flash > 0.5 ? 1 : 0.3) * (estado.nivel === CONFIG.niveles.length - 1 ? 1.3 : 1);
    const gr = ctx.createRadialGradient(rojo ? 0 : W, H, 0, rojo ? 0 : W, H, Math.max(W, H) * 1.1);
    gr.addColorStop(0, rojo ? `rgba(232,32,42,${f})` : `rgba(31,91,255,${f})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    if (e.flash > 0.5 && e.fuerza > 0.6) { ctx.fillStyle = rojo ? `rgba(232,32,42,${0.2 * e.fuerza})` : `rgba(31,91,255,${0.24 * e.fuerza})`; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }
  // 5) estática
  if (e.ruido > 0.05) { ctx.save(); ctx.globalAlpha = e.ruido * 0.35; ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = ctx.createPattern(grano, 'repeat'); ctx.translate(rnd(0, 192), rnd(0, 192)); ctx.fillRect(-192, -192, W + 384, H + 384); ctx.restore(); }
  // 6) queda una sola persona: el borde late en su color
  if (e.fase === 'juego' && vs.length === 1 && (e.enJuego || 3) > 1) { ctx.strokeStyle = vs[0].color; ctx.globalAlpha = 0.35 + 0.3 * Math.sin(t * 7.5); ctx.lineWidth = 14; ctx.strokeRect(0, 0, W, H); ctx.globalAlpha = 1; }
  // 7) cinemática: la escena queda en penumbra detrás del texto
  if (e.fase === 'cine') { ctx.fillStyle = 'rgba(7,8,13,.62)'; ctx.fillRect(0, 0, W, H); }
}

// ============================ 8. ARRANQUE ============================
let antes = performance.now();
function cuadro(ahora) {
  const dt = Math.min(0.05, (ahora - antes) / 1000); antes = ahora;
  actualizar(dt); dibujar(ahora / 1000);
  requestAnimationFrame(cuadro);
}
ajustar(); irA('inicio');
setInterval(asignar, 1500);
tacto.connect().catch(e => { $('#conexion').textContent = 'sin MQTT: ' + (e.message || e); });
requestAnimationFrame(cuadro);
