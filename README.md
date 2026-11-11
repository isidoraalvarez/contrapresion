# CONTRAPRESIÓN

**Tres personas corren por la Alameda. Una cuarta, desde un carro lanzaaguas, aprieta. Cuatro teléfonos, una pantalla.**

- Plataforma publicada: `https://<usuario>.github.io/<repositorio>/`
- Control para los teléfonos: `https://<usuario>.github.io/<repositorio>/control.html` (la pantalla muestra un QR por puesto)
- Video de demostración (30–60 s): `<enlace>`
- Construido sobre [Tacto](https://github.com/fefeliperoar/tacto), de fefeliperoar: protocolo MQTT, librería `tacto.js` y servidor local.

---

## 1. Concepto

Santiago de Chile, desde el 18 de octubre de 2019. Contrapresión es una carrera grupal de resistencia: **tres ciudadanos** huyen juntos por la Alameda mientras un **cuarto jugador** los persigue desde un carro lanzaaguas del **POC** (Policía del Orden de Chile, una institución ficticia). A medida que la carrera avanza por tres niveles, la ciudad cambia: del caos del estallido al toque de queda de la pandemia, y de ahí a un país tapizado de vallas y propaganda que dice "ORDEN" y "TODO VA A ESTAR BIEN".

La relación entre tocar, ver y oír se arma sobre una asimetría física:

- **Los ciudadanos tocan con todo el cuerpo.** No hay botones: para cambiar de calle hay que inclinarse, para saltar una barricada hay que tirar el teléfono hacia arriba, y para pasar bajo lo que cuelga hay que cubrirse, apoyando la mano sobre la pantalla como quien se protege la cabeza.
- **El POC toca con un solo dedo.** La presión del dedo sobre el vidrio *es* la presión del agua. El POC no apunta a nadie: al apretar fuerte inunda **la pantalla compartida** con agua, desenfoque, destellos rojos y azules, y un ruido que ensordece todo lo demás. El daño no es a un cuerpo sino a lo que los tres pueden ver y oír.

En una frase: **apretar fuerte un vidrio borra la vista y la voz de un grupo entero.**

Lo que queremos que la persona descubra jugando:

- **La voz es colectiva.** Una multitud suena mientras haya gente corriendo. Cada detención apaga un tercio de esa voz; cuando queda una sola persona, ya no se oye la multitud sino su latido.
- **Basta con que una llegue.** Si un ciudadano choca aparece "¡DETENIDO!" con su nombre y desaparece, pero la carrera sigue para los demás. Los ciudadanos pasan de nivel si al menos uno llega a la meta. El POC gana si detiene a los tres antes.
- **La luz que ciega es la única que muestra.** En el toque de queda la niebla no deja ver nada; los obstáculos solo aparecen con los destellos de las balizas. El POC tiene que decidir si encender las luces que ciegan y a la vez guían.

### Cinemática

Al empezar, una secuencia de placas cuenta el contexto: el alza de 30 pesos del Metro, las evasiones masivas, la marcha del 25 de octubre de 2019, el cambio de nombre de Plaza Italia a Plaza Dignidad. Se puede saltar, pero hay que mantener apretado espacio (o el botón) durante 3 segundos; si se suelta, el avance retrocede. Saltarse la historia cuesta un esfuerzo.

### Personajes

| Quién | Jugador | Cómo se ve |
|---|---|---|
| Ciudadano 1 · 2 · 3 | Sí, cada uno escribe su nombre (en el teléfono o en la sala) | Figura encapuchada de espaldas; la pañoleta y la etiqueta con el nombre llevan su color: **rojo**, **azul**, **verde** |
| POC · carro lanzaaguas | Sí, el cuarto teléfono | Blindado verde oscuro que asoma por el borde inferior, con balizas y cañón |
| El Sistema (`CONFIG.antagonista`, hoy "KAST", nombre por cambiar) | No | Su nombre llena los carteles, pasacalles y muros del nivel 3 |

### Niveles

| Nivel | Lugar y fecha | Ritmo | Obstáculos (saltar · esquivar · agacharse) | Muros y fondo | Agua del POC |
|---|---|---|---|---|---|
| 1 · **El Estallido** | Alameda → Plaza Dignidad · octubre 2019 | normal (9 → 12,5 m/s), 500 m | barricadas con fuego · señalética arrancada · semáforo colgando | rayados EVADE, DESPERTÓ, NO +; humo naranja; el monumento con banderas al fondo | se vacía rápido |
| 2 · **El Toque de Queda** | Centro de Santiago · 2020, pandemia | 10 → 13,5 m/s, 550 m | vallas papales · letrero "TOQUE DE QUEDA 22:00" · cinta de cuarentena | niebla de gas casi total; cortinas metálicas; HAMBRE proyectado en la torre | normal |
| 3 · **La Elección** | Alameda → La Moneda | muy rápido (15 → 20 m/s), 700 m | vallas alineadas · carteles "ORDEN" · pasacalles "TODO VA A ESTAR BIEN" | muros limpios tapizados de carteles gigantes; vallas en las veredas; La Moneda crece al fondo | infinita |

Quien es detenido vuelve a la calle en el nivel siguiente. Si el POC gana un nivel, aparece "PROTESTA DISUELTA" y el nivel se reintenta.

### Gráfica

| Elemento | Decisión | Por qué |
|---|---|---|
| Nombre | **Contrapresión** | El dispositivo central es la presión del dedo; el juego es la presión contraria de los cuerpos que resisten. |
| Títulos | *Big Shoulders Stencil Display* | Letra de plantilla (esténcil): la del rayado hecho con cartón y spray. Es también la letra de los muros del juego. |
| Texto | *Space Mono* | Letra de máquina, de parte policial y de registro: fechas, metros, instrucciones. |
| Color | noche `#07080d`, cal `#efe9dc`, amarillo valla `#ffd400`; ciudadanos `#e8202a` · `#3d8bff` · `#22c16b`; blindado `#2f4a32` | Cada ciudadano tiene su color en toda la interfaz (QR, teléfono, pañoleta, ficha, sello). Rojo y azul juntos solo aparecen como baliza. En el nivel 3 el color se retira: muros grises y carteles azul marino. |
| Composición | Cámara detrás de los tres; el carro asoma abajo; el destino (la plaza, La Moneda) crece en el horizonte | Quien mira la pantalla queda en el lugar del perseguidor. |

---

## 2. Funcionamiento

### Archivos

```
index.html     pantalla compartida: inicio, cinemática, sala con 4 QR, HUD, placas
style.css      identidad gráfica (pantalla y teléfonos)
script.js      el juego: CONFIG, teléfonos, teclado, audio, flujo, simulación y dibujo
control.html   página del teléfono (4 puestos)
control.js     sensores del teléfono → MQTT
config.js      broker MQTT (el del curso)
tacto.js       librería de Tacto (sin cambios)
vendor/        mqtt.min.js
sonidos/       15 sonidos .wav propios
herramientas/sintetizar_sonidos.py   genera los sonidos desde cero
server.js      modo local (de Tacto): sirve el proyecto con HTTPS y broker embebido
```

Todo lo ajustable está en `CONFIG`, al inicio de `script.js`: el nombre del antagonista, las metas, velocidades, el gasto de agua y la niebla de cada nivel, las frases de los muros y las placas de la cinemática.

### Tabla de conexiones

| Jugador | Gesto | Dato (canal MQTT) | Variable | Imagen | Sonido | Sentido |
|---|---|---|---|---|---|---|
| Ciudadano | Inclinar a un lado | `motion.a[2]` → `ang.g` (±14°, histéresis 4°) | calle (3) | el cuerpo cambia de calle; la cámara sigue al grupo | `carril.wav` paneado | esquivar es ladear el cuerpo |
| Ciudadano | Tirón hacia arriba | `evento {tipo:'salto'}` (el teléfono mide aceleración − 9,8 > 7 m/s²); respaldo: doble toque | salto | el cuerpo sube | `salto.wav`; `valla.wav` al pasar sobre la barricada o valla | el salto nace de un impulso del brazo |
| Ciudadano | Mano apoyada en la pantalla | `touch.n` | cubrirse (0–1) | se agacha y sube los brazos a la cabeza; pasa bajo semáforos, cintas y pasacalles; corre 40 % más lento | — | protegerse la cabeza con la mano es el mismo gesto en el vidrio |
| Ciudadano | (salida) chocar | `…/cmd {estado:'detenido', vib}` | vivo / detenido | sello "¡DETENIDO!" con su nombre; el cuerpo cae y desaparece; su teléfono se apaga en su color | `detenido.wav`, `silbato.wav`; la multitud baja un tercio | la detención llega también a la mano |
| POC | Inclinar | `ang.g` (±35°) | posición del carro y puntería | el carro se mueve con retardo; el chorro cae y la deformación se concentra hacia ese lado | `motor.wav` | un vehículo pesado que no apunta a una persona, sino a una zona de la calle |
| POC | Tocar | `touch.down` | balizas (0–1) | destellos dobles rojo/azul sobre toda la pantalla; en el nivel 2 abren la niebla | `sirena.wav` | encender las luces ya ocupa la vista y el oído de todos |
| POC | Apretar fuerte (presión, o diámetro del dedo si el teléfono no mide presión; más dedos suman) | `touch.k` (fuerza 0–1 calibrada en el teléfono) o `touch.f` / `touch.d` | agua (sobre 0,42) | arco de agua, desenfoque, franjas que ondulan, gotas en la pantalla, estática; luces más intensas | `chorro.wav` (su filtro se abre con la fuerza), `impacto_agua.wav`; **todo lo demás se ensordece** (filtro pasa-bajos sobre pasos, multitud y fuego) | la fuerza del dedo es la fuerza del agua; el estanque limita cuánto se puede apretar |
| Sistema | — | — | personas corriendo | fichas y nombres en el HUD | `multitud.wav` = vivos / 3; `latido.wav` cuando queda una; `cacerola.wav` cada 100 m | la voz colectiva se apaga con cada detención |

### Cómo se conectan los teléfonos por MQTT

1. La pantalla abre una **sala** (código de 6 letras) y muestra **cuatro QR**: `control.html?sala=…&rol=c1`, `c2`, `c3` y `poc`.
2. El teléfono se conecta al broker del curso (`config.js`) y publica, con el mismo formato de Tacto, en `tacto/<sala>/<dispositivo>/…`:
   - `status` (retenido, con último testamento): `{online, name, caps:{rol}}`; `name` es el nombre que escribió la persona
   - `touch` (~60/s): `{t, n, ar, k, p:[{i,x,y,f,d}]}`, donde `k` es la fuerza calibrada
   - `motion` (~30/s): `{t, a:[α,β,γ], r, c}`
   - `evento`: `{tipo:'salto'}`
3. La pantalla se suscribe a `tacto/<sala>/#`, asigna cada teléfono a su puesto según `caps.rol` y lee sus canales en cada cuadro.
4. La pantalla responde en `tacto/<sala>/<dispositivo>/cmd`: `{vib:[…]}` para vibrar, `{estado:'detenido'|'corriendo'}` y `{ping}` para medir la latencia.

Los puestos sin teléfono se juegan con el teclado: **A D W S** (rojo), **J L I K** (azul), **← → ↑ ↓** (verde) y, para el POC, **Espacio** mantenido (la fuerza sube con el tiempo) con **Q E** o el ratón para apuntar. **M** silencia.

### Cómo abrirlo

- **Publicado (entrega):** en GitHub, *Settings → Pages → Deploy from a branch → `main` / root*. La pantalla queda en `https://<usuario>.github.io/<repositorio>/` y los teléfonos escanean los QR.
- **Desde VS Code:** abre `index.html` con la extensión Live Server (o con doble clic). La pantalla usa el mismo broker en la nube, así que los teléfonos pueden conectarse desde la versión publicada: escribe la dirección de GitHub Pages en `CONFIG.urlPublica` y los QR apuntarán allí. Los sensores del teléfono necesitan HTTPS, por eso conviene que el control venga de GitHub Pages.
- **Modo local con menos retraso:** `npm install` y `node server.js` (ver el README de Tacto).

### Sonidos

Los 15 sonidos son **de autoría propia**: se sintetizaron desde cero con `herramientas/sintetizar_sonidos.py` (Python + NumPy/SciPy: ruido filtrado, osciladores y envolventes), sin grabaciones ni muestras de terceros. Licencia **CC0 1.0 (dominio público)**.

| Archivo | Duración | Qué es | Dónde suena |
|---|---|---|---|
| `paso.wav` | 0,32 s | zapatilla sobre asfalto | cada paso de cada ciudadano |
| `salto.wav` | 0,55 s | soplo ascendente | al saltar |
| `carril.wav` | 0,30 s | roce de ropa | al cambiar de calle (paneado) |
| `valla.wav` | 1,20 s | sacudida metálica | al pasar sobre un obstáculo bajo |
| `sirena.wav` | 4,00 s | lamento de dos tonos (bucle) | mientras el POC toca; acelera con la fuerza |
| `chorro.wav` | 3,08 s | agua a presión (bucle) | mientras sale agua |
| `impacto_agua.wav` | 0,90 s | golpe y salpicadura | durante el chorro |
| `motor.wav` | 1,88 s | diésel grave (bucle) | el carro, siempre |
| `latido.wav` | 0,84 s | doble pulso (bucle) | cuando queda una sola persona |
| `cacerola.wav` | 0,80 s | cuchara contra olla | cada 100 m, al pasar de nivel y en la cinemática |
| `silbato.wav` | 1,10 s | pito policial | al partir y en cada detención |
| `detenido.wav` | 1,60 s | portazo metálico | en cada detención |
| `multitud.wav` | 3,80 s | coro de 40 voces sintéticas con ritmo de consigna (bucle) | la voz colectiva: su volumen es la cantidad de personas corriendo |
| `fuego.wav` | 2,85 s | crepitar de barricada (bucle) | nivel 1 |
| `dron.wav` | 4,75 s | zumbido grave de ciudad (bucle) | cinemática y nivel 2 |

Tipografías: Big Shoulders Stencil Display y Space Mono, de Google Fonts (SIL Open Font License).

---

## 3. Reflexión

> Borrador escrito desde el diseño. Complétenlo con lo que observen al jugar con cuatro teléfonos.

**Qué descubrimos al traducir el tacto en imagen y sonido.**
La presión es el dato más expresivo y el menos confiable: muchos teléfonos no la miden y hubo que usar el diámetro del dedo, que crece al aplastar la yema. Eso cambia el gesto: no se aprieta con la punta sino con la yema plana. Descubrimos también que la asimetría no está en las reglas sino en los cuerpos: tres personas se inclinan, saltan y se agachan mientras una sola aprieta un dedo y con eso les quita la vista y el sonido a todas. Al pasar del ataque a un jugador (versión 1) al ataque a la pantalla compartida (versión 2), el agua dejó de ser un "disparo" y se volvió un ambiente: nadie es el blanco y todos lo sufren. Y la voz colectiva, que se apaga con cada detención, hizo que perder a un compañero se oyera antes de verse.

**Qué queda fuera del sistema.**
El olor del gas, el ardor en los ojos, el peso del agua en la ropa, el frío. Las heridas oculares y las personas que perdieron la vista, que ningún efecto de desenfoque puede representar. La multitud real: aquí son tres. El tiempo: semanas y años comprimidos en minutos. Y la latencia: con el broker en la nube hay unos 200 ms entre el dedo y el agua, que debilitan la sensación de causa y efecto.

**Mejoras concretas.**
1. **Micrófono de los ciudadanos (`mic.level`):** gritar o golpear una olla real sube el volumen de la multitud y limpia por un momento el agua de la pantalla. La voz como defensa.
2. **Juntarse protege:** si dos o tres ciudadanos corren en la misma calle, la deformación del agua les afecta menos. El cuerpo colectivo como escudo.
3. **Broker regional** (por ejemplo, en São Paulo) para bajar la latencia en la versión publicada.
4. **Ojos irritados:** después de un chorro fuerte, un velo rojizo que solo se limpia frotando la pantalla del teléfono con el dedo.

---

## Créditos

- Base técnica: [Tacto](https://github.com/fefeliperoar/tacto), de fefeliperoar (`tacto.js`, `server.js`, `vendor/mqtt.min.js`).
- Concepto, diseño, código del juego, control y sonidos: `<nombres>`.
- El POC es una institución ficticia. Los textos de carteles, muros y cinemática se configuran en `CONFIG` (`script.js`).
