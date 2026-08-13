"use strict";
// Los cuadros se le pasan a ffmpeg crudos por tubería. Escribir 200 PNG a
// disco y volverlos a leer tarda mucho más y no aporta nada.

const { spawn } = require("child_process");
const ffmpeg = require("ffmpeg-static");

function abrirVideo({ ancho, alto, fps, salida }) {
  const args = [
    "-y", "-hide_banner", "-loglevel", "error",
    "-f", "rawvideo",
    "-pixel_format", "rgba",
    "-video_size", `${ancho}x${alto}`,
    "-framerate", String(fps),
    "-i", "pipe:0",
    "-an",
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    salida,
  ];

  const ff = spawn(ffmpeg, args, { stdio: ["pipe", "ignore", "pipe"] });
  let error = "";
  ff.stderr.on("data", (b) => { error += b.toString(); });

  const terminado = new Promise((resolve, reject) => {
    ff.on("error", reject);
    ff.on("close", (codigo) => {
      if (codigo === 0) resolve();
      else reject(new Error(`ffmpeg salió con ${codigo}\n${error}`));
    });
  });

  return {
    async escribir(buffer) {
      if (!ff.stdin.write(buffer)) {
        await new Promise((r) => ff.stdin.once("drain", r));
      }
    },
    async cerrar() {
      ff.stdin.end();
      await terminado;
    },
  };
}

module.exports = { abrirVideo };
