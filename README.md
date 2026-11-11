# CONTRAPRESIÓN

**Tres personas corren por la Alameda. Una cuarta, desde un carro lanzaaguas, sopla y el agua cae sobre la pantalla de todas. Solo con los tres escudos arriba se la puede detener.**

De 2 a 4 teléfonos y una pantalla compartida, conectados por MQTT. Se juega solo con el teléfono.

**Integrantes:**

- Isidora Alvarez: (https://github.com/isidoraalvarez)
- Dayana Pañitur: (https://github.com/dayanapanitrur)

- **Repositorio:** https://github.com/isidoraalvarez/contrapresion


---

## 1. Concepto

Santiago de Chile, desde el 18 de octubre de 2019. *Contrapresión* es una carrera colectiva de resistencia: **de uno a tres ciudadanos** avanzan juntos por la Alameda mientras **otro jugador** maneja un carro lanzaaguas del **POC** (Policía del Orden de Chile, una institución **ficticia**). La ciudad cambia en tres niveles: del estallido de 2019 al toque de queda de la pandemia, y de ahí a una Alameda limpia, llena de vallas y carteles que dicen "ORDEN" y "TODO VA A ESTAR BIEN".

### La relación entre tocar, ver y oír

- **El POC sopla.** Su aliento sobre el micrófono es la fuerza del agua. El agua no apunta a una persona, cae sobre **la pantalla compartida**, la desenfoca, la hace ondular, la llena de gotas, aparece sirenas tipicas de color rojo y azul y de un ruido que ensordece todo lo demás. Un gesto mínimo, casi invisible, le quita la vista y la voz a un grupo entero.
- **Los ciudadanos levantan escudos.** Apoyar **3 dedos** sobre el teléfono levanta un escudo, como los escudos de cartón y lata que la primera línea pintaba en la calle. Cada escudo bloquea una parte del agua, pero **uno solo no alcanza, solo los tres juntos detienen el chorro.** Esa es la contrapresión.

**un soplo borra la vista y la voz de un grupo; solo los escudos juntos lo detienen.**

### Lo que queremos que la persona sienta o descubra

- **La presión de uno se resiste en conjunto.** Cuando los tres escudos están arriba a la vez, la imagen se aclara, la multitud vuelve a oírse fuerte y suena una cacerola. Sostener el escudo ocupa la mano mientras hay que seguir inclinando, saltando y agachándose, resistir juntos es una decisión.
- **La voz es colectiva.** El sonido de la calle de una multitud protestand, suena mientras haya gente corriendo y baja cada vez que alguien queda fuera. Cuando queda una sola persona, ya no se oye la multitud sino su latido, y el borde de la pantalla late en su color.
- **Basta con que una llegue, pero no es lo mismo.** El grupo pasa de nivel si al menos una persona llega a la meta, pero gana **una estrella por cada persona que llega** (tantas como ciudadanos haya: con tres, hasta 3 por nivel y 9 en total). El puntaje premia llegar juntos.
- **La luz que ciega es la única que muestra.** En el toque de queda la niebla tapa la calle, los obstáculos solo aparecen con los destellos de las balizas del carro.
- **Nadie elige su lado.** Los puestos se sortean al entrar, cualquiera puede terminar soplando el agua o empujándola.

### Cómo se juega

> **Inicio y cinemática.** Unas placas cuentan el contexto: el alza de 30 pesos del Metro, las evasiones, la marcha del 25 de octubre, Plaza Italia que pasa a llamarse Plaza Dignidad. Se puede saltar, pero hay que mantener apretado 3 segundos: saltarse la historia cuesta un esfuerzo.

> **Sala.** Todos escanean **un solo QR** y escriben un **apodo**. La pantalla sortea los puestos: Ciudadano 1, 2, 3 o POC. Se necesitan **al menos 2 teléfonos**: siempre hay un POC y de 1 a 3 ciudadanos. **No se puede jugar de a uno**: el botón para salir a la calle queda bloqueado hasta que entren dos teléfonos. Los puestos sin teléfono no corren.

> **Carrera.** Avance automático por tres niveles. Cada ciudadano tiene vida propia. si choca con un obstáculo aparece "¡Alcanzado!" y sale de la ronda, pero los demás siguen.

> **Fin del nivel.** Hay dos maneras de terminar un nivel:

  - **Si al menos un ciudadano llega a la meta**, el grupo gana, aparecen las estrellas (una por cada persona que llegó) y, después de una cuenta regresiva, empieza el nivel siguiente. Los ciudadanos que el agua alcanzó en este nivel vuelven a jugar en el siguiente.

> **Si el agua alcanza a todos los ciudadanos antes de la meta**, el grupo pierde, aparece "Esta vez no llegaron" y, a los 3 segundos, el juego vuelve a la sala, sortea de nuevo los puestos y la partida empieza otra vez desde el nivel 1.

> **Final.** "Llegaron a La Moneda", con el total de estrellas del recorrido.

### Personajes

| Quién | Jugador | Cómo se ve |
|---|---|---|
| Ciudadano 1 · 2 · 3 | Sí, con apodo | Figura de espaldas con pañoleta y etiqueta en su color: **rojo**, **azul**, **verde**. Su escudo lleva ese color en el borde y en la marca pintada. |
| POC · carro lanzaaguas | Sí | Blindado verde oscuro que asoma por el borde inferior, con balizas y cañón. |
| El Sistema | No | Solo aparece como texto en carteles y pasacalles del nivel 3 (configurable en `CONFIG.antagonista`). No se dibujan rostros ni caricaturas de personas reales. |

### Niveles

| Nivel | Lugar y fecha | Ritmo | Obstáculos (saltar · esquivar · agacharse) | Imagen | Estanque del POC |
|---|---|---|---|---|---|
| 1 · **El Estallido** | Alameda → Plaza Dignidad · octubre 2019 | 9 → 12,5 m/s · 500 m | barricada con fuego · señalética arrancada · semáforo colgando | De día: cielo azul, cordillera, multitud con banderas en las veredas, lienzos ("Hasta que la dignidad se haga costumbre", "No son 30 pesos, son 30 años", "Chile despertó"), el monumento rayado al fondo | 2 s de chorro a toda fuerza |
| 2 · **El Toque de Queda** | Universidad de Chile → Cerro Santa Lucía · 2020, pandemia | 10 → 13,5 m/s · 550 m | valla papal · letrero "TOQUE DE QUEDA 22:00" · cinta "CUARENTENA" | Noche y niebla casi total: solo las balizas muestran lo que viene; cortinas metálicas; "HAMBRE" proyectado en la torre | 2,5 s |
| 3 · **La Elección** | Alameda → La Moneda | 15 → 20 m/s · 700 m | vallas · carteles "ORDEN" · pasacalles "TODO VA A ESTAR BIEN" | Nublado, muros grises limpios tapizados de afiches, vallas en las veredas; La Moneda crece al fondo | 3 s |

### Gráfica

| Elemento | Decisión | Por qué |
|---|---|---|
| Nombre | **Contrapresión** | El agua es una presión el juego es la presión contraria de los escudos que resisten juntos. |
| Títulos | *Big Shoulders Stencil Display* | Letra de plantilla (esténcil): la del rayado hecho con cartón y spray. Es también la letra de los muros del juego. |
| Texto | *Space Mono* | Letra de máquina, de parte y de registro: fechas, metros, instrucciones. |
| Color | noche `#07080d`, cal `#efe9dc`, amarillo valla `#ffd400`; ciudadanos `#e8202a` · `#3d8bff` · `#22c16b`; blindado `#2f4a32` | Cada ciudadano lleva su color en toda la interfaz (teléfono, pañoleta, ficha, escudo, sello). Rojo y azul juntos solo aparecen como baliza. En el nivel 3 el color se retira. |
| Textura | grano permanente y cinta de franjas amarillas | Fotocopia, afiche pegado en la calle, valla papal. |
| Composición | cámara detrás de los tres, el carro asoma abajo, el destino crece en el horizonte | Quien mira la pantalla queda en el lugar de quien persigue. |
| Lenguaje | "¡Alcanzado!", "Fuera de esta ronda", "Esta vez no llegaron" |
---

## 2. Funcionamiento

### Tabla de conexiones

| Jugador | Gesto | Dato (canal MQTT) | Variable | Imagen | Sonido | Sentido |
|---|---|---|---|---|---|---|
| **POC** | **Soplar** al micrófono | `mic.level` (soplo 0–1: energía de los graves sobre el ruido de fondo, medida en el teléfono) | fuerza del agua (sobre 0,12) | arco de agua, velo borroso, franjas que ondulan donde cae, gotas sobre el vidrio, estática, luces más intensas | `chorro` (su filtro se abre con la fuerza), `impacto_agua`; **el resto se ensordece** (filtro pasa-bajos sobre la calle, los pasos y el fuego) | el aliento es la fuerza del agua: un gesto mínimo que borra la vista y la voz de todos |
| POC | Posición del dedo | `touch.x` | dónde cae el agua | el carro y el chorro siguen al dedo; la deformación se concentra ahí | `motor` | se toca la imagen: el dedo señala una zona de la calle, no a una persona |
| POC | Tocar (o soplar) | `touch.down` | balizas (0–1) | destellos dobles rojo/azul sobre toda la pantalla; en el nivel 2 abren la niebla | `sirena` | encender las luces ya ocupa la vista y el oído de todos |
| POC | **Agitar** el teléfono | `evento {tipo:'agitar'}` (el teléfono mide la aceleración) | estanque (0–1) | barra del estanque en la pantalla y en el teléfono; vacío, no sale agua | `impacto_agua` grave (agua golpeando dentro); `valla` cuando se vacía; `silbato` cuando se llena | el agua no es infinita: cargarla es un esfuerzo físico, visible para todos |
| POC | Inclinar (sin tocar) | `ang.g` (±35°) | posición del carro | el carro se mueve con retardo, como un vehículo pesado | `motor` | — |
| **Ciudadano** | **3 dedos** apoyados | `touch.n` (= 3) | escudo arriba (0/1) y **contrapresión** | el personaje levanta un **escudo** con el borde y la marca de su color; el agua revienta contra él y la pantalla se aclara | golpe metálico al levantarlo (`valla` agudo); agua contra el escudo (`impacto_agua` agudo); la multitud sube; `cacerola` cuando todos los escudos están arriba | tres dedos sostienen el escudo como tres personas; uno solo no alcanza |
| Ciudadano | **Deslizar un dedo** de arriba hacia abajo | `evento {tipo:'agacharse'}` (el teléfono detecta el deslizamiento vertical) | agachado (0,9 s) | se agacha y se cubre la cabeza: pasa bajo semáforos, cintas y pasacalles | roce de ropa (`carril` grave) | el dedo baja y el cuerpo baja |
| Ciudadano | Inclinar a un lado | `ang.g` (±18°, suavizado, de a una calle por vez) | calle (3) | el cuerpo cambia de calle; la cámara sigue al grupo | `carril` paneado | esquivar es ladear el cuerpo |
| Ciudadano | Tirón hacia arriba | `evento {tipo:'salto'}` (aceleración − 9,8 > 7 m/s²); respaldo: doble toque | salto | el cuerpo sube | `salto`; `valla` al pasar sobre un obstáculo | el salto nace de un impulso del brazo |
| Ciudadano | (recibe) el agua | `…/cmd {vib}` | — | — | el teléfono vibra cuando sale agua | el agua llega también a la mano |
| Ciudadano | (recibe) quedar fuera | `…/cmd {estado:'detenido', vib}` | en carrera / fuera | sello "¡Alcanzado!"; el teléfono muestra "Fuera de esta ronda" | `detenido`, `silbato`; la calle baja un tercio | — |
| Sistema | — | — | personas corriendo | fichas con apodos; estrellas al final | `protesta` = la voz colectiva (sube con los escudos, baja con cada persona fuera); `pasos` en bucle; `latido` cuando queda una; `cacerola` cada 100 m y por cada estrella | la voz colectiva se apaga con cada persona que cae |

Mientras más escudos estén arriba al mismo tiempo, menos agua llega a la pantalla. Un escudo solo ayuda poco, cuando todos los ciudadanos levantan el suyo, el chorro casi desaparece. Si el teléfono del POC no permite usar el micrófono, el agua sale apretando fuerte la pantalla.

### Cómo se conecta el teléfono por MQTT

1. La pantalla abre una **sala** (código aleatorio de 6 letras) y muestra **un QR** con `control.html?sala=…`.
2. El teléfono pide permiso de **micrófono** y **movimiento** al tocar "Entrar", se conecta al broker y publica en `tacto/<sala>/<dispositivo>/…`, con el mismo formato de Tacto:
   - `status` (retenido, con *last will*): `{online, name, caps:{rol, motion, presion, mic}}`; `name` es el apodo
   - `touch`: `{t, n, ar, k, p:[{i,x,y,f,d}]}`, donde `k` es la fuerza calibrada
   - `motion`: `{t, a:[α,β,γ], r, c}`
   - `mic` (solo el POC): `{t, l, b:[graves, medios, agudos]}`, donde `l` es el soplo 0–1. **No se graba ni se envía sonido**, solo ese número.
   - `evento`: `{tipo:'salto'}` o `{tipo:'agitar'}`
3. La pantalla se suscribe a `tacto/<sala>/#`, **sortea un puesto** para cada teléfono y se lo comunica por `tacto/<sala>/<dispositivo>/cmd` con `{rol}`.
4. Por ese mismo canal la pantalla responde con `{vib:[…]}` (vibrar), `{estado:'detenido'|'corriendo'}`, `{contra}` (al POC: cuántos escudos están arriba), `{estanque, seco}` (al POC: agua que le queda) y `{ping}` (latencia).
5. Para no saturar el broker, el teléfono envía cada dato **solo cuando cambia** (como máximo 20 veces por segundo) y la pantalla **descarta los soplos que llegan con más de 0,6 s de atraso**.

### Broker propio y seguridad

El juego usa un broker propio en **EMQX Cloud** (Serverless), siguiendo la guía del curso:

- Conexión segura por **WebSocket con TLS** (`wss://…emqxsl.com:8084/mqtt`).
- Un usuario creado solo para el juego, con permiso únicamente sobre `tacto/#` (publicar y suscribir), y una regla que **niega todo lo demás** (lista blanca).
- La dirección y el usuario están en `config.js`. Como GitHub Pages es público, ese usuario no tiene acceso a nada fuera de `tacto/#`.
- Los jugadores escriben **apodos**, no nombres reales: no viajan datos personales por MQTT.

### Archivos

```
index.html     pantalla compartida: inicio, cinemática, sala con QR, HUD, placas, volumen
style.css      identidad gráfica (pantalla y teléfono)
script.js      el juego: CONFIG, teléfonos, audio, flujo, simulación y dibujo
control.html   página del teléfono: apodo, sala, permisos
control.js     sensores del teléfono → MQTT (tacto, giro, tirón, sacudida, soplo)
config.js      broker MQTT propio (EMQX)
tacto.js       librería de Tacto (sin cambios)
vendor/        mqtt.min.js
sonidos/       15 sonidos (10 sintetizados, 5 externos)
herramientas/sintetizar_sonidos.py   genera los sonidos sintetizados
server.js      modo local de Tacto (HTTPS + broker embebido)
```

### Sonidos

Hay **15 sonidos**: 10 sintetizados por código para este proyecto y 5 externos de uso libre.

#### Sonidos sintetizados

Los 10 sonidos sintetizados se generan con "herramientas/sintetizar_sonidos.py" (Python: ruido filtrado, osciladores y envolventes), sin grabaciones ni muestras de terceros. El código del sintetizador se escribió con ayuda de una IA (Claude, de Anthropic), nosotras definimos qué debía sonar en cada momento del juego, los probamos y elegimos cómo y dónde suenan. Se publican bajo licencia **CC0 1.0** (dominio público).

| Archivo | Duración | Qué es | Dónde suena |
|---|---|---|---|
| `salto.wav` | 0,55 s | soplo ascendente | al saltar |
| `carril.wav` | 0,30 s | roce de ropa | al cambiar de calle; más grave, al agacharse |
| `valla.wav` | 1,20 s | sacudida metálica | al pasar sobre un obstáculo; cuando el estanque se vacía |
| `chorro.wav` | 3,08 s | agua a presión (bucle) | mientras sale agua; se abre con la fuerza del soplo |
| `impacto_agua.wav` | 0,90 s | golpe y salpicadura | durante el chorro; más grave, al agitar el estanque |
| `motor.wav` | 1,88 s | diésel grave (bucle) | el carro, siempre |
| `latido.wav` | 0,84 s | doble pulso (bucle) | cuando queda una sola persona |
| `detenido.wav` | 1,60 s | golpe metálico | cuando alguien queda fuera |
| `fuego.wav` | 2,85 s | crepitar de barricada (bucle) | nivel 1 |
| `dron.wav` | 4,75 s | zumbido grave de ciudad (bucle) | cinemática y nivel 2 |

#### Sonidos externos: autoría y licencia

| Archivo en `sonidos/` | Sonido original | Autor | Origen | Licencia | Uso en el juego |
|---|---|---|---|---|---|
| `485621__inspectorj__protesting-crowd-climate-strike-guildford-01-01.wav` | "Protesting Crowd, Climate Strike, Guildford, 01-01" | InspectorJ | [Freesound](https://freesound.org/people/InspectorJ/sounds/485621/) | [CC0 1.0](http://creativecommons.org/publicdomain/zero/1.0/) | La calle de fondo durante la partida (bucle). Es la voz colectiva: su volumen depende de cuántas personas siguen corriendo y de cuántos escudos están arriba. Sin cambios en el archivo. |
| `METLImpt_Casserole 1 (ID 2956)_BigSoundBank.com.wav` | "Casserole #1" | Joseph SARDIN | [BigSoundBank](https://bigsoundbank.com/casserole-1-s2956.html) | CC0 (dominio público) | Cacerolazo corto (el juego usa los primeros 0,75 s): cada 100 m, por cada estrella, en la cinemática y cuando todos los escudos están arriba. |
| `sirena.wav` | "VEHSirn_Police Car Siren.Synthesized.Dry 1_EM.wav" | newlocknew | [Freesound](https://freesound.org/people/newlocknew/sounds/692524/) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Sirena del carro (bucle) mientras están encendidas las balizas. Renombrado. |
| `78508__joedeshon__referee_whistle_01.wav` | "referee_whistle_01.wav" | joedeshon | [Freesound](https://freesound.org/people/joedeshon/sounds/78508/) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Pito al partir, cuando alguien queda fuera y cuando el estanque se llena. Sin cambios. |
| `freesound_community-180904-woodland04-run-steps-skip-jump-clip-47486.mp3` | "180904-woodland04 run steps skip jump clip" | martian (Freesound), publicado en Pixabay por freesound_community | [Pixabay](https://pixabay.com/sound-effects/film-special-effects-180904-woodland04-run-steps-skip-jump-clip-47486/) | [Pixabay Content License](https://pixabay.com/service/license-summary/) | Pasos de carrera en bucle mientras corren; más fuertes con más gente y más rápidos con más velocidad. Sin cambios. |

**Atribuciones (CC BY 4.0):**
- "VEHSirn_Police Car Siren.Synthesized.Dry 1_EM.wav" de newlocknew (https://freesound.org/people/newlocknew/sounds/692524/), bajo licencia CC BY 4.0. Renombrado como `sirena.wav` para este proyecto.
- "referee_whistle_01.wav" de joedeshon (https://freesound.org/people/joedeshon/sounds/78508/), bajo licencia CC BY 4.0.

Aunque son CC0, también agradecemos a InspectorJ y a Joseph SARDIN (BigSoundBank).

Tipografías: Big Shoulders Stencil Display y Space Mono, de Google Fonts (SIL Open Font License).

---

## 3. Reflexión

**Qué descubrimos al traducir el tacto en imagen y sonido.**
La presión del dedo era el dato más expresivo y el menos confiable, muchos teléfonos no la miden, y el diámetro del contacto cambia según cada mano y cada pantalla. Por eso el agua pasó del dedo al **soplo**. El soplo resultó un gesto más justo para el concepto, es pequeño, casi invisible, y aun así borra la pantalla de todos. Pero cada micrófono escucha distinto, así que hubo que medir el soplo **en relación con el ruido de la sala** y no como un valor fijo.

También descubrimos que la asimetría no estaba en las reglas sino en los cuerpos, una persona sopla mientras tres se inclinan, saltan, se agachan y sostienen escudos. Primero probamos que los ciudadanos empujaran el agua con la **palma abierta**, pero los teléfonos descartan la mano entera como un toque accidental (rechazo de palma) y el gesto no respondía. Lo cambiamos por **3 dedos**, que el teléfono sí reconoce, y por un **escudo** visible, más cercano a la calle real. Agacharse pasó a ser **deslizar un dedo hacia abajo**: el dedo baja y el cuerpo baja. Con los escudos el juego cambió de sentido: uno solo no sirve; hay que ponerse de acuerdo. Y como la voz de la calle baja con cada persona que cae, perder a alguien se escucha antes de verse.

Al probar con teléfonos reales apareció lo técnico como parte de la experiencia. El giroscopio era tan sensible que un movimiento brusco tiraba al personaje de un lado a otro, hubo que suavizarlo y limitar los cambios a una calle por vez. Y al mandar demasiados mensajes por MQTT, el broker los ponía en fila: el agua llegaba **después** de soplar y seguía saliendo sola. La causa y el efecto, que son el centro del tacto, dependían de cuántos mensajes enviábamos.


**Qué queda fuera del sistema.**
El olor del gas, el ardor en los ojos, el peso del agua en la ropa, el frío. Las personas que perdieron la vista, que ningún desenfoque puede representar. La multitud real, aquí son tres. El tiempo: semanas y años comprimidos en minutos. Y la distancia entre jugar y vivirlo, el agua del juego no moja.

**Mejoras concretas.**
1. **La voz como defensa:** que los ciudadanos también usen el micrófono, y que gritar o golpear una olla real suba el volumen de la calle y limpie por un momento el agua de la pantalla.
2. **Calibración al entrar:** un paso de 5 segundos en el teléfono ("sopla fuerte", "inclina a cada lado") para ajustar el soplo y el giro a cada modelo, en vez de usar valores fijos.
3. **Broker más cercano** (por ejemplo, en São Paulo) para bajar la latencia entre el gesto y la imagen.
4. **Ojos irritados:** después de un chorro fuerte, un velo rojizo que solo se limpia frotando la pantalla del teléfono con el dedo.

---

## Créditos

- Concepto, diseño, código del juego, control y sonidos sintetizados: [isidoraalvarez](https://github.com/isidoraalvarez) y [dayanapanitrur](https://github.com/dayanapanitrur).
- Base técnica: [Tacto](https://github.com/fefeliperoar/tacto), de fefeliperoar (`tacto.js`, `server.js`, `vendor/mqtt.min.js`).
- Sonidos externos: ver la tabla de sonidos.
- El POC es una institución ficticia. Los textos de carteles, muros y cinemática se configuran en `CONFIG` (`script.js`).
