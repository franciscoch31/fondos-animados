/* recorte.js — quita el fondo blanco de una ilustración.

   No recibe una librería de canvas: recibe una función `crearLienzo(w,h)`.
   Así el mismo archivo corre en Node (@napi-rs/canvas) y en el navegador
   (document.createElement), y la vista previa coincide con el render. */

(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (raiz.Motor = raiz.Motor || {}).recorte = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Se hace por inundación desde los bordes, NO por umbral global: el pelo de
  // Goku es casi blanco y un umbral global se lo comería. Como el dibujo está
  // cerrado con líneas oscuras, la inundación entra por fuera y se detiene sola.
  function quitarFondo(img, crearLienzo, opciones) {
    opciones = opciones || {};
    const umbral = opciones.umbral != null ? opciones.umbral : 226;
    const croma = opciones.croma != null ? opciones.croma : 26;
    const minHueco = opciones.minHueco != null ? opciones.minHueco : 2500;

    const w = img.width;
    const h = img.height;

    const c = crearLienzo(w, h);
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);

    const datos = g.getImageData(0, 0, w, h);
    const d = datos.data;

    const claro = (i) => {
      const r = d[i * 4], v = d[i * 4 + 1], b = d[i * 4 + 2];
      const max = Math.max(r, v, b);
      const min = Math.min(r, v, b);
      return min >= umbral && max - min <= croma;
    };

    const fondo = new Uint8Array(w * h);
    const pila = [];

    const sembrar = (x, y) => {
      const i = y * w + x;
      if (!fondo[i] && claro(i)) { fondo[i] = 1; pila.push(i); }
    };

    for (let x = 0; x < w; x++) { sembrar(x, 0); sembrar(x, h - 1); }
    for (let y = 0; y < h; y++) { sembrar(0, y); sembrar(w - 1, y); }

    while (pila.length) {
      const i = pila.pop();
      const x = i % w;
      const y = (i / w) | 0;
      if (x > 0)     sembrar(x - 1, y);
      if (x < w - 1) sembrar(x + 1, y);
      if (y > 0)     sembrar(x, y - 1);
      if (y < h - 1) sembrar(x, y + 1);
    }

    // Huecos encerrados: pedazos de fondo que quedaron rodeados por el dibujo
    // (entre la tela y el brazo, por ejemplo) y que la inundación no alcanza.
    // Se piden dos cosas para no borrar los brillos del pelo: blanco casi puro
    // y una mancha grande. Los brillos del pelo son trazos finos y no califican.
    const blancoPuro = (i) => {
      const r = d[i * 4], v = d[i * 4 + 1], b = d[i * 4 + 2];
      return Math.min(r, v, b) >= 246 && Math.max(r, v, b) - Math.min(r, v, b) <= 9;
    };

    const visto = new Uint8Array(w * h);
    for (let inicio = 0; inicio < w * h; inicio++) {
      if (fondo[inicio] || visto[inicio] || !blancoPuro(inicio)) continue;

      const grupo = [];
      const cola = [inicio];
      visto[inicio] = 1;

      while (cola.length) {
        const i = cola.pop();
        grupo.push(i);
        const x = i % w;
        const y = (i / w) | 0;
        const vecinos = [];
        if (x > 0)     vecinos.push(i - 1);
        if (x < w - 1) vecinos.push(i + 1);
        if (y > 0)     vecinos.push(i - w);
        if (y < h - 1) vecinos.push(i + w);
        for (let k = 0; k < vecinos.length; k++) {
          const j = vecinos[k];
          if (!visto[j] && !fondo[j] && blancoPuro(j)) { visto[j] = 1; cola.push(j); }
        }
      }

      if (grupo.length >= minHueco) for (let k = 0; k < grupo.length; k++) fondo[grupo[k]] = 1;
    }

    // Erosión de un pixel: el JPG deja un halo blancuzco pegado al contorno y
    // sobre fondo oscuro ese halo se ve como un recorte mal hecho.
    const borde = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (fondo[i]) continue;
        const vecinoFuera =
          (x > 0 && fondo[i - 1]) || (x < w - 1 && fondo[i + 1]) ||
          (y > 0 && fondo[i - w]) || (y < h - 1 && fondo[i + w]);
        if (vecinoFuera) borde[i] = 1;
      }
    }

    for (let i = 0; i < w * h; i++) {
      if (fondo[i]) d[i * 4 + 3] = 0;
      else if (borde[i]) d[i * 4 + 3] = 90;   // el filo queda semitransparente
    }

    g.putImageData(datos, 0, 0);
    return c;
  }

  // Caja que realmente ocupa el dibujo, para encuadrarlo sin aire de más.
  function recuadro(lienzo) {
    const g = lienzo.getContext("2d");
    const w = lienzo.width, h = lienzo.height;
    const d = g.getImageData(0, 0, w, h).data;

    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 12) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return { x: 0, y: 0, w: w, h: h };
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  // ¿La ilustración trae fondo blanco (se puede recortar) o ya trae su propia
  // atmósfera? Se mira el marco: si casi todo el borde es blanco, es recortable.
  function detectarModo(img, crearLienzo) {
    const c = crearLienzo(img.width, img.height);
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    const w = img.width, h = img.height;
    const d = g.getImageData(0, 0, w, h).data;

    let blancos = 0, total = 0;
    const mirar = (x, y) => {
      const i = (y * w + x) * 4;
      const min = Math.min(d[i], d[i + 1], d[i + 2]);
      const max = Math.max(d[i], d[i + 1], d[i + 2]);
      total++;
      if (min >= 226 && max - min <= 26) blancos++;
    };
    for (let x = 0; x < w; x++) { mirar(x, 0); mirar(x, h - 1); }
    for (let y = 0; y < h; y++) { mirar(0, y); mirar(w - 1, y); }

    return blancos / total > 0.85 ? "recorte" : "lamina";
  }

  return { quitarFondo, recuadro, detectarModo };
});
