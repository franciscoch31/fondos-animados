"use strict";
// Línea de comandos. La plataforma web (servidor.js) usa el mismo motor.
//
//   node crear.js --img "ruta.jpg" --estilo ultra --salida "Goku.mp4"
//   node crear.js --img "ruta.png" --estilo augurio --muestra
//
// Opciones: --ancho 1080  --alto 2400  --seg 6  --fps 30  --muestra

const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { ESTILOS, clonar } = require("./src/estilos");
const { detectarModo } = require("./src/recorte");
const { renderizar, cuadroSuelto } = require("./src/render");

function argumentos(lista) {
  const o = {};
  for (let i = 0; i < lista.length; i++) {
    const a = lista[i];
    if (!a.startsWith("--")) continue;
    const clave = a.slice(2);
    const sig = lista[i + 1];
    if (!sig || sig.startsWith("--")) o[clave] = true;
    else { o[clave] = sig; i++; }
  }
  return o;
}

async function principal() {
  const a = argumentos(process.argv.slice(2));

  if (!a.img) { console.error("Falta --img con la ruta de la ilustración."); process.exit(1); }
  if (!fs.existsSync(a.img)) { console.error(`No encuentro el archivo: ${a.img}`); process.exit(1); }

  const nombreEstilo = a.estilo || "ultra";
  if (!ESTILOS[nombreEstilo]) {
    console.error(`Estilo desconocido: ${nombreEstilo}. Hay: ${Object.keys(ESTILOS).join(", ")}`);
    process.exit(1);
  }
  const estilo = clonar(ESTILOS[nombreEstilo]);

  const ancho = parseInt(a.ancho, 10) || 1080;
  const alto = parseInt(a.alto, 10) || 2400;
  const fps = parseInt(a.fps, 10) || 30;
  const seg = parseFloat(a.seg) || 6;

  console.log(`Leyendo ${path.basename(a.img)}...`);
  const imagen = await loadImage(a.img);
  console.log(`  ${imagen.width}x${imagen.height}`);

  const crearLienzo = (w, h) => createCanvas(w, h);
  const modoReal = detectarModo(imagen, crearLienzo);
  if (modoReal !== estilo.modo) {
    console.log(`  AVISO: la imagen parece de tipo "${modoReal}" y el estilo es "${estilo.modo}".`);
  }
  if (imagen.width < ancho * 0.6) {
    console.log(`  AVISO: la imagen es chica para ${ancho}x${alto}; se va a ver suave.`);
  }

  if (a.muestra) {
    const salida = typeof a.salida === "string" ? a.salida : `muestra-${nombreEstilo}.png`;
    console.log("Preparando escena...");
    const png = cuadroSuelto({
      imagen, estilo, ancho, alto, crearLienzo,
      fase: 0.28, cuadro: Math.round(seg * fps * 0.28),
    });
    fs.writeFileSync(salida, png);
    console.log(`Muestra guardada: ${path.resolve(salida)}`);
    return;
  }

  const salida = typeof a.salida === "string" ? a.salida : `fondo-${nombreEstilo}.mp4`;
  console.log("Preparando escena (recorte y halos)...");
  await renderizar({
    imagen, estilo, ancho, alto, fps, seg, salida, crearLienzo,
    alAvanzar: (hecho, total) => {
      if (hecho % 30 === 0 || hecho === total) process.stdout.write(`\r  ${hecho}/${total}`);
    },
  });
  process.stdout.write("\n");

  const kb = Math.round(fs.statSync(salida).size / 1024);
  console.log(`Listo: ${path.resolve(salida)} (${kb} KB)`);
}

principal().catch((e) => {
  console.error("\nFalló:", e.message);
  process.exit(1);
});
