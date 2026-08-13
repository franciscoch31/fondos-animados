"use strict";
// El render que sí necesita Node: dibujar los cuadros y pasárselos a ffmpeg.
// El navegador reusa `escena.js` para la vista previa, pero el MP4 se hace
// aquí porque el H.264 lo produce ffmpeg, no el canvas.

const { createCanvas } = require("@napi-rs/canvas");
const { crearEscena } = require("./escena");
const { abrirVideo } = require("./video");

// `cuadro` no es decorativo: de él dependen el mosaico de grano y la semilla
// de los rayos. Se pasa aparte para que una muestra coincida exactamente con
// ese mismo cuadro del video.
function cuadroSuelto({ imagen, estilo, ancho, alto, crearLienzo, fase, cuadro }) {
  const hacer = crearLienzo || ((w, h) => createCanvas(w, h));
  const escena = crearEscena({ imagen, estilo, ancho, alto, crearLienzo: hacer });
  const lienzo = hacer(ancho, alto);
  escena.dibujar(lienzo.getContext("2d"), fase, cuadro != null ? cuadro : Math.round(fase * 180));
  return lienzo.toBuffer("image/png");
}

async function renderizar({ imagen, estilo, ancho, alto, fps, seg, salida, crearLienzo, alAvanzar }) {
  const hacer = crearLienzo || ((w, h) => createCanvas(w, h));
  const cuadros = Math.round(seg * fps);

  const escena = crearEscena({ imagen, estilo, ancho, alto, crearLienzo: hacer });
  const lienzo = hacer(ancho, alto);
  const g = lienzo.getContext("2d");

  const video = abrirVideo({ ancho, alto, fps, salida });

  for (let i = 0; i < cuadros; i++) {
    escena.dibujar(g, i / cuadros, i);
    const datos = g.getImageData(0, 0, ancho, alto).data;
    await video.escribir(Buffer.from(datos.buffer, datos.byteOffset, datos.byteLength));
    if (alAvanzar) alAvanzar(i + 1, cuadros);
  }

  await video.cerrar();
  return salida;
}

module.exports = { renderizar, cuadroSuelto };
