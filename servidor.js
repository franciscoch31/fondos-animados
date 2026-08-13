"use strict";
/* servidor.js — la plataforma.
   El navegador es la interfaz y la vista previa; el MP4 lo hace Node, porque
   el H.264 lo produce ffmpeg y eso no existe en el navegador.

   Sirve tres cosas: la web (web/), el motor compartido (src/) para que la
   vista previa use exactamente el mismo código que el render, y las salidas. */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { loadImage, createCanvas } = require("@napi-rs/canvas");
const { ESTILOS } = require("./src/estilos");
const { detectarModo } = require("./src/recorte");
const { renderizar } = require("./src/render");

const PUERTO = 8788;
const RAIZ = __dirname;
const WEB = path.join(RAIZ, "web");
const SALIDAS = path.join(RAIZ, "salidas");
const TOPE_SUBIDA = 30 * 1024 * 1024;   // 30 MB de imagen es más que de sobra

if (!fs.existsSync(SALIDAS)) fs.mkdirSync(SALIDAS);

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".mp4": "video/mp4",
};

const trabajos = new Map();
let siguienteId = 1;

const json = (res, codigo, datos) => {
  const cuerpo = JSON.stringify(datos);
  res.writeHead(codigo, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(cuerpo),
  });
  res.end(cuerpo);
};

function leerCuerpo(req) {
  return new Promise((resolver, rechazar) => {
    const trozos = [];
    let tamano = 0;
    req.on("data", (t) => {
      tamano += t.length;
      if (tamano > TOPE_SUBIDA) {
        rechazar(new Error("La imagen pesa demasiado (tope 30 MB)."));
        req.destroy();
        return;
      }
      trozos.push(t);
    });
    req.on("end", () => resolver(Buffer.concat(trozos)));
    req.on("error", rechazar);
  });
}

// "fondo animado.mp4" → "fondo-animado.mp4", y nada de salirse de la carpeta
function nombreSeguro(bruto) {
  const limpio = String(bruto || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim().replace(/\s+/g, "-")
    .slice(0, 60);
  return (limpio || "fondo-" + Date.now()) + ".mp4";
}

function servirArchivo(res, destino, permitida) {
  const normal = path.normalize(destino);
  if (!normal.startsWith(permitida)) { res.writeHead(403).end("Prohibido"); return; }

  fs.readFile(normal, (err, datos) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("No encontrado");
      return;
    }
    res.writeHead(200, {
      "Content-Type": TIPOS[path.extname(normal).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(datos);
  });
}

async function arrancarTrabajo(cfg) {
  const id = String(siguienteId++);
  const estado = { progreso: 0, total: 1, listo: false, error: null, archivo: null };
  trabajos.set(id, estado);

  const datosImagen = Buffer.from(String(cfg.imagen).split(",")[1] || "", "base64");
  const archivo = nombreSeguro(cfg.nombre);
  const destino = path.join(SALIDAS, archivo);

  (async () => {
    try {
      const imagen = await loadImage(datosImagen);
      await renderizar({
        imagen,
        estilo: cfg.estilo,
        ancho: cfg.ancho,
        alto: cfg.alto,
        fps: cfg.fps,
        seg: cfg.seg,
        salida: destino,
        crearLienzo: (w, h) => createCanvas(w, h),
        alAvanzar: (hecho, total) => { estado.progreso = hecho; estado.total = total; },
      });
      estado.archivo = archivo;
      estado.listo = true;
    } catch (e) {
      estado.error = e.message;
      estado.listo = true;
    }
  })();

  return id;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const ruta = decodeURIComponent(url.pathname);

  try {
    if (ruta === "/api/estilos") return json(res, 200, ESTILOS);

    if (ruta === "/api/detectar" && req.method === "POST") {
      const cuerpo = JSON.parse((await leerCuerpo(req)).toString("utf8"));
      const datos = Buffer.from(String(cuerpo.imagen).split(",")[1] || "", "base64");
      const imagen = await loadImage(datos);
      return json(res, 200, {
        modo: detectarModo(imagen, (w, h) => createCanvas(w, h)),
        ancho: imagen.width,
        alto: imagen.height,
      });
    }

    if (ruta === "/api/render" && req.method === "POST") {
      const cuerpo = JSON.parse((await leerCuerpo(req)).toString("utf8"));
      if (!cuerpo.imagen) return json(res, 400, { error: "Falta la imagen." });
      const id = await arrancarTrabajo(cuerpo);
      return json(res, 200, { id });
    }

    if (ruta.startsWith("/api/trabajo/")) {
      const estado = trabajos.get(ruta.split("/").pop());
      if (!estado) return json(res, 404, { error: "Ese render ya no existe." });
      return json(res, 200, estado);
    }

    if (ruta === "/api/salidas") {
      const lista = fs.readdirSync(SALIDAS)
        .filter((f) => f.toLowerCase().endsWith(".mp4"))
        .map((f) => {
          const st = fs.statSync(path.join(SALIDAS, f));
          return { archivo: f, kb: Math.round(st.size / 1024), fecha: st.mtimeMs };
        })
        .sort((a, b) => b.fecha - a.fecha);
      return json(res, 200, lista);
    }

    // el motor compartido y las salidas se sirven tal cual
    if (ruta.startsWith("/src/")) return servirArchivo(res, path.join(RAIZ, ruta), RAIZ);
    if (ruta.startsWith("/salidas/")) return servirArchivo(res, path.join(RAIZ, ruta), SALIDAS);

    return servirArchivo(res, path.join(WEB, ruta === "/" ? "/index.html" : ruta), WEB);
  } catch (e) {
    json(res, 500, { error: e.message });
  }
}).listen(PUERTO, () => {
  const url = `http://localhost:${PUERTO}`;
  console.log(`\n  Taller de Fondos Animados corriendo en ${url}`);
  console.log("  Deja esta ventana abierta mientras uses la app.");
  console.log("  Para cerrar: Ctrl + C\n");
  const cmd = process.platform === "win32" ? `start "" "${url}"`
            : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  require("child_process").exec(cmd);
});
