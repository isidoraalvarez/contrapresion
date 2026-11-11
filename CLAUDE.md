# CLAUDE.md · Contrapresión

Contexto para el agente que continúe este proyecto. Léelo completo antes de tocar código.

## Qué es

**Contrapresión** es la entrega del ramo *Dispositivos periféricos y plataformas para la interacción digital* (DPPI), Escuela de Diseño UDP, 2026. El encargo pide una plataforma web en la que el teléfono funcione como control remoto táctil de una experiencia de imagen y sonido, conectada por **MQTT**, publicada en **GitHub Pages**, con README (concepto, funcionamiento, reflexión), 5–15 sonidos con autoría declarada y un video de 30–60 s.

El juego es un *endless runner* asimétrico para **cuatro teléfonos y una pantalla compartida**, ambientado en Santiago de Chile desde el 18 de octubre de 2019:

- **Ciudadanos 1, 2 y 3** (rojo `#e8202a`, azul `#3d8bff`, verde `#22c16b`): huyen juntos por la Alameda. Cada uno escribe un nombre (usar **apodos**, no nombres reales: ver Seguridad).
- **POC** (Policía del Orden de Chile, institución **ficticia**): conduce un carro lanzaaguas que no ataca a nadie en particular. Al apretar fuerte su pantalla inunda la **pantalla compartida** de agua, desenfoque, luces rojo/azul y ruido.
- **El Sistema / antagonista**: no es jugador. Su nombre (hoy `KAST`, *nombre por cambiar*) solo aparece como texto en carteles y pasacalles del nivel 3, configurable en `CONFIG.antagonista`. **No dibujar rostros ni caricaturas de personas reales.**

Frase del concepto: *apretar fuerte un vidrio borra la vista y la voz de un grupo entero.*

## Reglas del mundo (implementadas)

- Avance automático. Cada ciudadano tiene **vida independiente**: si choca aparece un sello "¡DETENIDO!" con su nombre, desaparece y su teléfono recibe `{estado:'detenido'}`; los demás siguen.
- **Ganan los ciudadanos** si al menos uno llega a la meta del nivel. Los detenidos vuelven en el nivel siguiente.
- **Gana el POC** si detiene a los tres antes de la meta: placa "PROTESTA DISUELTA" y se repite el nivel.
- Tras el nivel 3: placa "Llegaron a La Moneda" y botón para volver a empezar.
- La voz colectiva: `multitud.wav` suena con volumen = vivos/3; con una sola persona viva suena `latido.wav` y el borde de la pantalla late en su color.
- El agua ensordece: un filtro pasa-bajos apaga "el mundo" (pasos, multitud, fuego) mientras `chorro`, `sirena` e `impacto_agua` suenan encima.

## Flujo de pantallas (`estado.fase`)

`inicio` (botón Comenzar; habilita audio) → `cine` (cinemática de 6 placas; **saltable solo manteniendo espacio/Enter o el botón 3 s**, el avance retrocede si se suelta) → `sala` (4 puestos con QR, nombres, teclado) → `placa` (título del nivel + cuenta 3-2-1) → `juego` → `resultado` → siguiente nivel / repetir / final.

## Niveles (en `CONFIG.niveles`, `script.js`)

| # | Nombre | Tramo | Ritmo | Obstáculos (bajo=saltar · alto=esquivar · colgante=agacharse) | Fondo | Agua POC |
|---|---|---|---|---|---|---|
| 1 | El Estallido (oct 2019) | Alameda → Plaza Dignidad, hacia el oriente | 9→12,5 m/s, 500 m | barricada con fuego · señalética arrancada (PARE, letrero "ALAMEDA/EVADE") · semáforo colgando | **De día**, como fotos reales: cielo azul, cordillera, multitud en ambas veredas con banderas (chilena, negra, verde, morada), carteles y bengalas; lienzos negros "HASTA QUE LA DIGNIDAD / SE HAGA COSTUMBRE", "NO SON 30 PESOS / SON 30 AÑOS", "CHILE / DESPERTÓ"; monumento rayado con gente arriba; torre Telefónica de vidrio, Gran Torre Santiago, cerro San Cristóbal con la Virgen, grúas | se gasta rápido (0,34/s) |
| 2 | El Toque de Queda (2020, pandemia) | Universidad de Chile → Cerro Santa Lucía | 10→13,5 m/s, 550 m | valla papal · letrero "TOQUE DE QUEDA 22:00" · cinta "CUARENTENA" | Noche, **niebla 0,92**: los obstáculos solo se ven con los destellos de las balizas; fachadas antiguas con cortinas metálicas; cerro Santa Lucía con torreón, iglesia San Francisco, torre Telefónica con "HAMBRE" proyectado (mayo 2020) | normal |
| 3 | La Elección | Alameda → La Moneda, hacia el poniente (sin cordillera) | 15→20 m/s, 700 m | valla papal · cartel "ORDEN / KAST" · pasacalle "TODO VA A ESTAR BIEN" | Nublado, fachadas grises limpias tapizadas de afiches; vallas a lo largo de la vereda; La Moneda crece al fondo; torre Entel; bandera de la Plaza de la Ciudadanía | infinita |

Nunca se cierran las tres calles en una fila (máximo dos obstáculos).

## Tabla de conexiones (gesto → variable)

| Jugador | Gesto | Canal MQTT / dato | Efecto |
|---|---|---|---|
| Ciudadano | Inclinar | `ang.g` (gamma), ±14° con histéresis 4° | cambia de calle (3) |
| Ciudadano | Tirón hacia arriba | `…/evento {tipo:'salto'}` (el teléfono mide `|acc| − 9,81 > 7`); respaldo: doble toque, o `motion.c` en la pantalla | salto |
| Ciudadano | Mano apoyada | `touch.n > 0` | se agacha/cubre; pasa bajo colgantes; corre 40 % más lento |
| POC | Inclinar | `ang.g`, ±35° | mueve el carro (con retardo) y la puntería; la deformación del agua se concentra hacia ese lado |
| POC | Tocar | `touch.down` | balizas + sirena (en nivel 2 abren la niebla) |
| POC | Apretar fuerte | `touch.k` (fuerza 0–1 calibrada en el teléfono: presión si el equipo la mide, si no diámetro del dedo; +0,15 por dedo extra) | agua sobre `CONFIG.umbralAgua = 0.42` |

Teclado (sin teléfonos): rojo `A D W S`, azul `J L I K`, verde `← → ↑ ↓` (izq, der, salto, agacharse); POC `Espacio` mantenido (fuerza sube en 1,1 s), `Q E` o ratón para apuntar; `M` silencia.

## Protocolo MQTT (formato de Tacto, no romperlo)

Temas: `tacto/<sala>/<dispositivo>/<tipo>`. La sala es un código aleatorio de 6 caracteres que genera la pantalla.

- Teléfono publica: `status` (retenido, con *last will*) `{online, name, caps:{rol:'c1'|'c2'|'c3'|'poc', motion, presion}}` · `touch` `{t, n, ar, k, p:[{i,x,y,f,d}]}` · `motion` `{t, a:[α,β,γ], r, c}` · `evento` `{tipo:'salto'}` · `pong`.
- Pantalla publica en `…/<dispositivo>/cmd`: `{ping}`, `{vib:[ms]}`, `{estado:'detenido'|'corriendo'}`, `{rol:'c1'|'c2'|'c3'|'poc'}` (puesto sorteado), `{contra:0–1}` (al POC: resistencia de las palmas).
- **Agua = soplo**: el POC activa el micrófono con un botón en su teléfono y publica `mic {t, l, b}` (l = soplo 0–1, calibrado sobre el ruido de fondo). La pantalla usa `mic.level` como fuerza; sin micrófono, cae a la presión del dedo (`touch.k`). Estanque: se llena agitando (`evento {tipo:'agitar'}`).
- **Perder** (los tres detenidos): "Protesta disuelta" 3 s (`CONFIG.esperaDerrota`) y vuelve a la sala con nuevo sorteo. Con 2+ teléfonos, uno siempre es POC (`asegurarPOC()`).
- **Los puestos se sortean**: un solo QR (`control.html?sala=…`), el teléfono entra sin rol y la pantalla le asigna uno al azar (`asignar()` / `sortearPuestos()`); el teléfono lo guarda en `cp.rol.<sala>` y lo publica en `caps.rol`.
- La pantalla se suscribe a `tacto/<sala>/#`. Asigna puestos por `caps.rol`; también acepta el control original de Tacto y el de la v1 (`'ciudadano'`, `'carabinero'`).
- **Todo debe seguir bajo `tacto/…`**: el broker propio solo autoriza `tacto/#` (ver Seguridad).

## Estructura de archivos (todo en la raíz; GitHub Pages: *Deploy from a branch → main / root*)

```
index.html      pantalla compartida: capas #inicio, #cine, #saltar, #sala, #placa, #hud, #sellos, canvas #escena
style.css       identidad gráfica (pantalla + teléfono); tokens en :root
script.js       el juego (~1300 líneas), secciones numeradas:
                1 CONFIG · 2 TELÉFONOS (MQTT) · 3 TECLADO Y RATÓN · 4 AUDIO · 5 ESTADO Y FLUJO
                6 SIMULACIÓN · 7 DIBUJO (cielo, FONDOS por nivel, fachadas, multitud, obstáculos DIBUJA{}, corredores, carro, chorro, niebla) · 8 ARRANQUE
control.html    página del teléfono: elegir puesto, apodo, sala
control.js      sensores → MQTT, calibración de fuerza, detección de tirón, pantalla "detenido"
config.js       window.TACTO_CONFIG = { broker, username, password } → lo edita la estudiante (paso 9)
tacto.js        librería de Tacto (fefeliperoar) SIN CAMBIOS: conexión, salas, canales (tacto.get('ang.g', id)…)
vendor/mqtt.min.js
sonidos/        15 .wav propios, CC0
herramientas/sintetizar_sonidos.py   genera los .wav (python3 herramientas/sintetizar_sonidos.py)
server.js, package.json   modo local de Tacto (node server.js), sirve la raíz con HTTPS y broker embebido
README.md       entrega: concepto, funcionamiento, sonidos, reflexión
.nojekyll, .gitignore, icon.svg
```

Detalles técnicos útiles:
- Render: canvas 2D pseudo-3D. `P(x,y,z)` proyecta metros del mundo a pantalla; `ZJ = 6.5` es la profundidad de los corredores. La escena se pinta en un búfer `b` y luego el agua la deforma al copiarla a `ctx`.
- Objetos del mundo fijos (fachadas, gente, postes, lienzos) se ubican con `idx * L - estado.metros` y `hsh(i,k)` para variación estable.
- Audio Web Audio con respaldo `<audio>` cuando se abre como archivo (`file://`).
- `window.CP_VISTA_PREVIA = true` desactiva los QR (se usó en la vista previa de claude.ai).
- `CONFIG.urlPublica`: dirección de GitHub Pages para que los QR apunten ahí aunque la pantalla se abra desde VS Code.
- Tipografías Google Fonts: *Big Shoulders Stencil Display* (títulos, rayados) y *Space Mono* (datos). QR con `qrcode-generator@1.4.4` desde jsDelivr.

## Identidad gráfica

Noche `#07080d`, cal `#efe9dc`, amarillo valla `#ffd400`, blindado `#2f4a32`; cada ciudadano lleva su color en QR, teléfono, pañoleta, etiqueta con nombre, ficha y sello. Rojo + azul juntos solo como baliza. Grano permanente y cinta de franjas amarillas. Textos de la interfaz en español de Chile, directos, sin adornos.

## Seguridad (guía del curso "Crea tu propio broker MQTT", EMQX Cloud) — obligatorio

Estado: la estudiante ya hizo los **pasos 1 a 8** (cuenta, broker Serverless *contrapresion* en North America, usuario `tacto_contrapresion`, regla Allow `tacto/#` Publish & Subscribe en la pestaña Username, regla Deny `#` en All Users = lista blanca, prueba con MQTTX). Falta el **paso 9**.

- **Nunca pidas, escribas ni muestres la contraseña del broker.** Usa marcadores `TU_USUARIO` / `TU_CLAVE`. La estudiante edita `config.js` ella misma.
- `config.js` hoy todavía trae el broker compartido del curso; hay que reemplazarlo por el propio: `broker: 'wss://<dirección>.emqxsl.com:8084/mqtt'` (siempre `wss://` y puerto 8084; nunca 1883/8083).
- No enviar datos personales por MQTT: los nombres de jugadores deben ser apodos.
- No usar `?broker=` ni el broker público para la versión final.
- En videos y capturas, que no se vea `config.js` ni MQTTX.

## Dónde quedamos y qué programar ahora

Hecho: juego v2 completo y probado en navegador sin errores (flujo completo, 4 teléfonos simulados, `file://`), vista previa aprobándose, fondos tipo foto.

Pendiente, en este orden:
1. **Paso 9 de la guía** (lo hace la estudiante): poner su dirección, usuario y clave en `config.js`, subir a GitHub y verificar que la pantalla diga "● MQTT conectado".
2. **Aviso de apodo** en `control.html`/`control.js`: el campo "Tu nombre" debe decir que use un apodo (no nombre real) y limitarlo a 14 caracteres (ya limitado).
3. Poner la URL de GitHub Pages en `CONFIG.urlPublica` (`script.js`).
4. **Probar con teléfonos reales** y ajustar en `CONFIG`: `inclinacionCarril`, `inclinacionCarro`, `umbralAgua`; umbral del tirón (`> 7` en `control.js`); dificultad (`separacion`, `dobles`, `vel`, `meta`).
5. Opcional pedido: bajar las fachadas del nivel 1 (`fachada()`, `h` para `'multitud'`) para que se vea más la cordillera.
6. **README.md desactualizado**: describir el nivel 1 de día con multitud y lugares reales, el nivel 2 como "Universidad de Chile → Cerro Santa Lucía", los hitos de cada nivel; completar la sección de broker propio (EMQX, lista blanca, sin claves); llenar `<usuario>`, `<repositorio>`, enlace al video, nombres; completar la reflexión con lo observado al jugar.
7. Video de 30–60 s mostrando los teléfonos controlando la experiencia.

Para probar localmente: abrir `index.html` con Live Server (VS Code) o `node server.js`. Los sensores del teléfono requieren HTTPS, por eso los teléfonos deben usar la versión de GitHub Pages.
