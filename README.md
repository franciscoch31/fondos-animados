# Taller de Fondos Animados

Convierte una ilustración en un video en bucle para usar de fondo de pantalla
en el celular. La ilustración no se redibuja: se anima la que tú le des.

## Cómo se usa

Doble clic a **`Iniciar.bat`**. Se abre solo en el navegador. Deja la ventana
negra abierta mientras la uses; para cerrar, Ctrl + C.

La primera vez instala lo que hace falta (tarda unos minutos, sólo pasa una vez).

También hay línea de comandos, por si quieres hacer varios de un jalón:

```bash
node crear.js --img "C:/ruta/imagen.jpg" --estilo ultra --muestra
node crear.js --img "C:/ruta/imagen.jpg" --estilo ultra --salida "Fondo.mp4"
```

Opciones: `--ancho 1080` `--alto 2400` `--seg 6` `--fps 30`

## Por qué el navegador no hace el video

El H.264 lo produce ffmpeg, que no existe en el navegador. Así que el navegador
es la interfaz y la vista previa, y Node hace el MP4 por detrás.

Para que la vista previa sea fiel, el motor (`src/`) corre en los dos lados: no
importa una librería de canvas, recibe una función `crearLienzo(w,h)`. En Node
le pasan `@napi-rs/canvas` y en el navegador `document.createElement`. Es el
mismo código dibujando, así que lo que ves es lo que sale.

## Las dos formas de tratar una imagen

| Modo | Cuándo | Qué hace |
|---|---|---|
| `recorte` | La ilustración trae **fondo blanco** | Recorta la figura y le arma una escena atrás |
| `lamina` | La ilustración **ya trae su atmósfera** | La usa completa y sólo le anima la luz encima |

El servidor lo detecta solo mirando el marco de la imagen (`/api/detectar`),
pero se puede cambiar a mano.

## El banco de efectos

Los efectos no están metidos en el motor: son piezas sueltas en
`src/efectos.js` que se prenden, se apagan, se reordenan y se combinan desde la
interfaz. Cada receta de `src/estilos.js` es sólo una lista de ellos con sus
números.

**Fondo** (antes de la figura) — estrellas, nebulosa, niebla, resplandor,
rayos de luz, anillo de energía, charco de luz, rejilla en fuga, meteoros,
relámpago de fondo.

**Frente** (después de la figura) — ondas expansivas, chispas, ceniza, lluvia,
órbitas, rayos eléctricos, contorno encendido, destello, líneas de escaneo.

**Acabado** — viñeta, grano de película.

**Aparte** — vibración, que no pinta nada: sacude la figura en el pico del pulso.

Un efecto puede cambiar de capa desde la receta (`capa: "frente"`): el
resplandor va detrás de una figura recortada, pero encima de una lámina.

### Para agregar uno nuevo

Una entrada más en `BANCO`, dentro de `src/efectos.js`:

```js
miEfecto: {
  nombre: "Mi efecto", pista: "Qué hace, en una línea.",
  capa: "fondo",                      // fondo | frente | acabado
  def: { color: "#ffffff", alfa: 0.3 },
  campos: [                           // qué se le deja tocar al usuario
    { clave: "color", etiqueta: "Color", tipo: "color" },
    { clave: "alfa", etiqueta: "Brillo", tipo: "rango", min: 0, max: 100, paso: 5, escala: 100 },
  ],
  preparar(p, c) { ... },             // opcional, se corre una sola vez
  dibujar(g, p, c, estado) { ... },
}
```

Aparece solo en la lista de la interfaz. `c` trae `W, H, fase, p` (el pulso),
`cuadro`, `esRecorte`, la caja de la figura (`fx, fy, fw, fh`), su `silueta` y
`crearLienzo`.

## Por qué el bucle no salta

Todo se mueve en función de `fase` (0 a 1) con frecuencias **enteras**, y cada
partícula recorre su camino un número exacto de veces por vuelta, con el brillo
entrando y saliendo en `sen(pi*u)`. Así el cuadro que sigue al último es
idéntico al primero.

Hay una prueba de esto: se dibuja el cuadro en fase 0 y en fase 1 y se comparan
píxel a píxel. Los 22 efectos dan 0%. Se salvan los rayos y la vibración, que
se sortean con semilla derivada del número de cuadro porque parpadean a
propósito.

## Detalles que cuestan caro si se olvidan

- **El halo se satura.** Se arma repitiendo la silueta en anillos y sumando con
  `lighter`. En una figura sola da un contorno; en una ilustración de grupo la
  dilatación cierra los huecos entre personajes y se vuelve un rectángulo
  sólido. Por eso el ancho y la fuerza son parámetros y no constantes.

- **El contorno hay que restarlo.** La silueta es una mancha sólida: correrla y
  dibujarla encima tapa la figura entera. Para quedarse con el filo se dilata y
  después se le resta la silueta original.

- **El orden del azar es parte del resultado.** Las chispas se generan con
  semilla fija; cambiar el orden en que se piden los números recorre la
  secuencia y caen en otro lado. Se ve igual de bien, pero deja de reproducir
  renders anteriores.

- **Los huecos encerrados del recorte.** La inundación entra desde los bordes y
  no alcanza el fondo que quedó rodeado por el dibujo (entre la tela y el
  brazo). Se borran aparte, pidiendo blanco casi puro **y** mancha grande, para
  no comerse los brillos finos del pelo.

- **La resolución de la fuente manda.** Una imagen de 352x452 estirada a
  1080x2400 sale suave. El programa avisa cuando la fuente se queda corta.

## Archivos

```
Iniciar.bat        doble clic
servidor.js        sirve la web, el motor y las salidas; hace los renders
crear.js           la línea de comandos
src/estilos.js     las recetas de partida (listas de efectos)
src/efectos.js     el banco de efectos
src/recorte.js     quitar el fondo blanco y detectar el modo
src/escena.js      arma la figura y ordena los efectos
src/render.js      cuadros → ffmpeg
src/video.js       la tubería a ffmpeg
web/               la interfaz
salidas/           los MP4 que vas haciendo
```
