/* efectos.js — el banco de efectos.

   Cada efecto es una pieza suelta: se prende, se apaga, se le cambian sus
   números y se combina con las demás. `escena.js` sólo los ordena y los llama.

   TODOS deben cerrar el bucle: nada de tiempo absoluto ni de azar por cuadro.
   Se mueven con `fase` (0 a 1) y frecuencias enteras, o con partículas que
   recorren su camino un número exacto de veces por vuelta.

   Cada uno declara:
     nombre, pista  — para la interfaz
     capa           — "fondo" (antes de la figura) o "frente" (después)
     def            — sus valores por defecto
     campos         — qué se le deja tocar al usuario y cómo
     preparar(c)    — opcional, para calcular una vez lo que no cambia
     dibujar(g,p,c) — pinta el cuadro */

(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (raiz.Motor = raiz.Motor || {}).efectos = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const TAU = Math.PI * 2;

  function azar(semilla) {
    let s = semilla >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  // "#ff2233" + 0.4 → "rgba(255,34,51,0.4)"
  function rgba(hex, alfa) {
    const h = String(hex).replace("#", "");
    const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alfa})`;
  }

  const BANCO = {

    // ------------------------------------------------------------- fondo

    estrellas: {
      nombre: "Estrellas",
      pista: "Puntos lejanos que titilan.",
      capa: "fondo",
      def: { cantidad: 90, color: "#ffffff", alfa: 0.5, titileo: 2 },
      campos: [
        { clave: "cantidad", etiqueta: "Cantidad", tipo: "rango", min: 0, max: 400, paso: 10 },
        { clave: "color", etiqueta: "Color", tipo: "color" },
        { clave: "alfa", etiqueta: "Brillo", tipo: "rango", min: 0, max: 100, paso: 5, escala: 100 },
      ],
      preparar(p, c) {
        const r = azar(4477);
        const lista = [];
        for (let i = 0; i < p.cantidad; i++) {
          lista.push({
            x: r() * c.W, y: r() * c.H,
            radio: 0.5 + r() * 1.4,
            frec: 1 + Math.floor(r() * 3),   // entera: cierra el bucle
            desf: r() * TAU,
          });
        }
        return lista;
      },
      dibujar(g, p, c, lista) {
        g.save();
        g.globalCompositeOperation = "lighter";
        g.fillStyle = p.color;
        for (let i = 0; i < lista.length; i++) {
          const e = lista[i];
          const t = 0.55 + 0.45 * Math.sin(c.fase * TAU * e.frec + e.desf);
          g.globalAlpha = p.alfa * t * (p.titileo ? 1 : 0.8);
          g.beginPath();
          g.arc(e.x, e.y, e.radio, 0, TAU);
          g.fill();
        }
        g.restore();
      },
    },

    nebulosa: {
      nombre: "Nebulosa",
      pista: "Manchones de color que se mecen despacio.",
      capa: "fondo",
      def: { color: "#78aaff", alfa: 0.055, cantidad: 5, radio: 0.50, vaiven: 0.10,
             ampX: 0.20, ampY: 0.12, centroY: 0.42, separacion: 1.3 },
      campos: [
        { clave: "color", etiqueta: "Color", tipo: "color" },
        { clave: "alfa", etiqueta: "Densidad", tipo: "rango", min: 0, max: 20, paso: 1, escala: 100 },
        { clave: "cantidad", etiqueta: "Manchones", tipo: "rango", min: 1, max: 10, paso: 1 },
        { clave: "radio", etiqueta: "Tamaño", tipo: "rango", min: 10, max: 120, paso: 5, escala: 100 },
      ],
      dibujar(g, p, c) {
        g.save();
        g.globalCompositeOperation = "lighter";
        for (let i = 0; i < p.cantidad; i++) {
          const a = c.fase * TAU * (i % 2 ? 1 : -1) + i * p.separacion;
          const cx = c.W * (0.5 + Math.cos(a) * p.ampX);
          const cy = c.H * (p.centroY + Math.sin(a) * p.ampY);
          const rr = c.W * (p.radio + p.vaiven * Math.sin(a * 2));
          const nb = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
          nb.addColorStop(0, rgba(p.color, p.alfa));
          nb.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = nb;
          g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
        }
        g.restore();
      },
    },

    humo: {
      nombre: "Niebla",
      pista: "Bruma que cruza la pantalla sin prisa.",
      capa: "fondo",
      def: { color: "#9fb4d8", alfa: 0.05, cantidad: 6, tamano: 0.55 },
      campos: [
        { clave: "color", etiqueta: "Color", tipo: "color" },
        { clave: "alfa", etiqueta: "Densidad", tipo: "rango", min: 0, max: 20, paso: 1, escala: 100 },
        { clave: "cantidad", etiqueta: "Bancos", tipo: "rango", min: 1, max: 14, paso: 1 },
        { clave: "tamano", etiqueta: "Tamaño", tipo: "rango", min: 20, max: 120, paso: 5, escala: 100 },
      ],
      preparar(p) {
        const r = azar(9182);
        const lista = [];
        for (let i = 0; i < p.cantidad; i++) {
          lista.push({ y: r(), desf: r(), vueltas: 1 + Math.floor(r() * 2), esc: 0.6 + r() * 0.8 });
        }
        return lista;
      },
      dibujar(g, p, c, lista) {
        g.save();
        g.globalCompositeOperation = "lighter";
        for (let i = 0; i < lista.length; i++) {
          const e = lista[i];
          // cruza de lado a lado un número entero de veces: el bucle cierra
          const u = (c.fase * e.vueltas + e.desf) % 1;
          const cx = c.W * (-0.3 + u * 1.6);
          const cy = c.H * e.y;
          const rr = c.W * p.tamano * e.esc;
          const nb = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
          nb.addColorStop(0, rgba(p.color, p.alfa * Math.sin(u * Math.PI)));
          nb.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = nb;
          g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
        }
        g.restore();
      },
    },

    resplandor: {
      nombre: "Resplandor",
      pista: "La luz grande que sale de atrás de la figura.",
      capa: "fondo",
      def: { color: "#a0c8ff", color2: "#5a8ce6", a1: 0.20, a1p: 0.16, a2: 0.09, a2p: 0.07,
             radio: 0.85, radioP: 0.10, corte: 0.45, centro: "figura" },
      campos: [
        { clave: "color", etiqueta: "Color", tipo: "color" },
        { clave: "a1", etiqueta: "Intensidad", tipo: "rango", min: 0, max: 60, paso: 2, escala: 100 },
        { clave: "radio", etiqueta: "Tamaño", tipo: "rango", min: 20, max: 200, paso: 5, escala: 100 },
      ],
      dibujar(g, p, c) {
        const enFigura = p.centro === "figura" && c.esRecorte;
        const cx = enFigura ? c.fx + c.fw / 2 : c.W / 2;
        const cy = enFigura ? c.fy + c.fh * 0.42 : c.H * 0.44;
        const base = enFigura ? c.fw : Math.max(c.W, c.H);
        const rr = base * (p.radio + p.radioP * c.p);

        const res = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
        res.addColorStop(0, rgba(p.color, p.a1 + p.a1p * c.p));
        res.addColorStop(p.corte, rgba(p.color2, p.a2 + p.a2p * c.p));
        res.addColorStop(1, "rgba(0,0,0,0)");
        g.save();
        g.globalCompositeOperation = "lighter";
        g.fillStyle = res;
        g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
        g.restore();
      },
    },

    rayosLuz: {
      nombre: "Rayos de luz",
      pista: "Aspas de luz girando detrás de la figura.",
      capa: "fondo",
      def: { color: "#ffffff", alfa: 0.07, cuantos: 14, giro: 1, largo: 1.1 },
      campos: [
        { clave: "color", etiqueta: "Color", tipo: "color" },
        { clave: "alfa", etiqueta: "Intensidad", tipo: "rango", min: 0, max: 30, paso: 1, escala: 100 },
        { clave: "cuantos", etiqueta: "Aspas", tipo: "rango", min: 3, max: 40, paso: 1 },
        { clave: "giro", etiqueta: "Vueltas", tipo: "rango", min: 1, max: 4, paso: 1 },
      ],
      dibujar(g, p, c) {
        const cx = c.esRecorte ? c.fx + c.fw / 2 : c.W / 2;
        const cy = c.esRecorte ? c.fy + c.fh * 0.40 : c.H * 0.44;
        const largo = Math.max(c.W, c.H) * p.largo;

        g.save();
        g.globalCompositeOperation = "lighter";
        g.translate(cx, cy);
        // vueltas enteras por bucle: al terminar queda igual que al empezar
        g.rotate(c.fase * TAU * p.giro);
        for (let i = 0; i < p.cuantos; i++) {
          const a = (i / p.cuantos) * TAU;
          const ancho = (TAU / p.cuantos) * 0.32;
          const gr = g.createRadialGradient(0, 0, 0, 0, 0, largo);
          gr.addColorStop(0, rgba(p.color, p.alfa * (0.55 + 0.45 * c.p)));
          gr.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = gr;
          g.beginPath();
          g.moveTo(0, 0);
          g.arc(0, 0, largo, a - ancho, a + ancho);
          g.closePath();
          g.fill();
        }
        g.restore();
      },
    },

    anillo: {
      nombre: "Anillo de energía",
      pista: "Un aro segmentado que gira detrás de la figura.",
      capa: "fondo",
      def: { color: "#c9a8ff", alfa: 0.30, radio: 0.62, grosor: 3, segmentos: 26, giro: 1 },
      campos: [
        { clave: "color", etiqueta: "Color", tipo: "color" },
        { clave: "alfa", etiqueta: "Brillo", tipo: "rango", min: 0, max: 100, paso: 5, escala: 100 },
        { clave: "radio", etiqueta: "Tamaño", tipo: "rango", min: 20, max: 120, paso: 2, escala: 100 },
        { clave: "segmentos", etiqueta: "Segmentos", tipo: "rango", min: 4, max: 60, paso: 2 },
        { clave: "giro", etiqueta: "Vueltas", tipo: "rango", min: 1, max: 4, paso: 1 },
      ],
      dibujar(g, p, c) {
        const cx = c.esRecorte ? c.fx + c.fw / 2 : c.W / 2;
        const cy = c.esRecorte ? c.fy + c.fh * 0.42 : c.H * 0.44;
        const rr = (c.esRecorte ? c.fw : Math.min(c.W, c.H)) * p.radio * (1 + 0.04 * c.p);

        g.save();
        g.globalCompositeOperation = "lighter";
        g.translate(cx, cy);
        g.rotate(c.fase * TAU * p.giro);
        g.strokeStyle = p.color;
        g.lineWidth = p.grosor * Math.max(0.4, c.W / 1080) * 2;
        g.globalAlpha = p.alfa * (0.5 + 0.5 * c.p);
        const paso = TAU / p.segmentos;
        for (let i = 0; i < p.segmentos; i++) {
          g.beginPath();
          g.arc(0, 0, rr, i * paso, i * paso + paso * 0.55);
          g.stroke();
        }
        g.restore();
      },
    },

    // ------------------------------------------------------------ frente

    ondas: {
      nombre: "Ondas expansivas",
      pista: "Aros que se abren desde el centro y se desvanecen.",
      capa: "frente",
      def: { color: "#ffffff", alfa: 0.28, cuantas: 3, grosor: 2, alcance: 1.0 },
      campos: [
        { clave: "color", etiqueta: "Color", tipo: "color" },
        { clave: "alfa", etiqueta: "Brillo", tipo: "rango", min: 0, max: 100, paso: 5, escala: 100 },
        { clave: "cuantas", etiqueta: "Cuántas", tipo: "rango", min: 1, max: 8, paso: 1 },
        { clave: "alcance", etiqueta: "Alcance", tipo: "rango", min: 30, max: 200, paso: 10, escala: 100 },
      ],
      dibujar(g, p, c) {
        const cx = c.esRecorte ? c.fx + c.fw / 2 : c.W / 2;
        const cy = c.esRecorte ? c.fy + c.fh * 0.42 : c.H * 0.44;
        const maxR = Math.max(c.W, c.H) * 0.75 * p.alcance;

        g.save();
        g.globalCompositeOperation = "lighter";
        g.strokeStyle = p.color;
        for (let i = 0; i < p.cuantas; i++) {
          // cada aro va desfasado; cada uno completa su viaje una vez por bucle
          const u = (c.fase + i / p.cuantas) % 1;
          g.globalAlpha = p.alfa * (1 - u) * (1 - u);
          g.lineWidth = Math.max(1, p.grosor * (1 - u) * Math.max(0.4, c.W / 1080) * 2);
          g.beginPath();
          g.arc(cx, cy, maxR * u, 0, TAU);
          g.stroke();
        }
        g.restore();
      },
    },

    chispas: {
      nombre: "Chispas",
      pista: "Brasas o ki que suben.",
      capa: "frente",
      def: { cantidad: 150, colores: ["#ffffff", "#bcd9ff", "#8fb8ff"], tamano: 1, alfa: 1 },
      campos: [
        { clave: "cantidad", etiqueta: "Cantidad", tipo: "rango", min: 0, max: 400, paso: 10 },
        { clave: "colores", etiqueta: "Colores", tipo: "colores" },
        { clave: "tamano", etiqueta: "Tamaño", tipo: "rango", min: 30, max: 300, paso: 10, escala: 100 },
      ],
      preparar(p) {
        // El ORDEN de estas llamadas es parte del resultado: cambiarlo recorre
        // la secuencia del generador y las chispas caen en otro lado. Se ve
        // igual de bien, pero deja de reproducir renders anteriores.
        const rnd = azar(20260731);
        const lista = [];
        for (let i = 0; i < p.cantidad; i++) {
          const vueltas = 1 + Math.floor(rnd() * 3);
          lista.push({
            x: rnd(),
            desfase: rnd(),
            vueltas: vueltas,
            deriva: (rnd() - 0.5) * 0.10,
            onda: 0.004 + rnd() * 0.016,
            frecOnda: 1 + Math.floor(rnd() * 3),
            r: 0.8 + rnd() * 2.4,
            color: p.colores[Math.floor(rnd() * p.colores.length)],
            desde: 0.55 + rnd() * 0.5,
          });
        }
        return lista;
      },
      dibujar(g, p, c, lista) {
        const esc = Math.max(0.3, c.W / 1080) * p.tamano;
        g.save();
        g.globalCompositeOperation = "lighter";
        for (let i = 0; i < lista.length; i++) {
          const ch = lista[i];
          const u = (c.fase * ch.vueltas + ch.desfase) % 1;
          const y = c.H * (ch.desde - u * (ch.desde + 0.08));
          const x = c.W * (ch.x + ch.deriva * u
                    + ch.onda * Math.sin((u * ch.frecOnda + ch.desfase) * TAU));
          g.globalAlpha = Math.sin(u * Math.PI) * (0.35 + 0.55 * c.p) * p.alfa;
          g.fillStyle = ch.color;
          g.beginPath();
          g.arc(x, y, ch.r * esc, 0, TAU);
          g.fill();
        }
        g.restore();
      },
    },

    ceniza: {
      nombre: "Ceniza",
      pista: "Partículas que caen, al revés de las chispas.",
      capa: "frente",
      def: { cantidad: 60, color: "#8e9bb5", alfa: 0.16, tamano: 1 },
      campos: [
        { clave: "cantidad", etiqueta: "Cantidad", tipo: "rango", min: 0, max: 300, paso: 10 },
        { clave: "color", etiqueta: "Color", tipo: "color" },
        { clave: "alfa", etiqueta: "Brillo", tipo: "rango", min: 0, max: 60, paso: 2, escala: 100 },
      ],
      preparar(p) {
        const r = azar(5150);
        const lista = [];
        for (let i = 0; i < p.cantidad; i++) {
          lista.push({
            x: r(), desfase: r(), vueltas: 1 + Math.floor(r() * 2),
            deriva: (r() - 0.5) * 0.08, onda: 0.004 + r() * 0.012,
            frecOnda: 1 + Math.floor(r() * 3), radio: 0.4 + r() * 1.2,
          });
        }
        return lista;
      },
      dibujar(g, p, c, lista) {
        const esc = Math.max(0.3, c.W / 1080) * p.tamano;
        g.save();
        for (let i = 0; i < lista.length; i++) {
          const e = lista[i];
          const u = (c.fase * e.vueltas + e.desfase) % 1;
          const y = c.H * (-0.05 + u * 1.1);
          const x = c.W * (e.x + e.deriva * u
                    + e.onda * Math.sin((u * e.frecOnda + e.desfase) * TAU));
          g.globalAlpha = p.alfa * Math.sin(u * Math.PI);
          g.fillStyle = p.color;
          g.beginPath();
          g.arc(x, y, e.radio * esc, 0, TAU);
          g.fill();
        }
        g.restore();
      },
    },

    rayos: {
      nombre: "Rayos eléctricos",
      pista: "Descargas cortas sobre la figura.",
      capa: "frente",
      def: { color: "#e8f2ff", alfa: 0.30, alfaP: 0.45, cuantos: 2, largo: 0.13, umbral: 0.4 },
      campos: [
        { clave: "color", etiqueta: "Color", tipo: "color" },
        { clave: "alfa", etiqueta: "Brillo", tipo: "rango", min: 0, max: 100, paso: 5, escala: 100 },
        { clave: "cuantos", etiqueta: "Cuántos", tipo: "rango", min: 1, max: 6, paso: 1 },
        { clave: "largo", etiqueta: "Largo", tipo: "rango", min: 3, max: 40, paso: 1, escala: 100 },
      ],
      dibujar(g, p, c) {
        if (!c.esRecorte) return;
        // se sortean con semilla derivada del número de cuadro: el patrón se
        // repite igual en cada vuelta del bucle
        const cuantos = c.p > 0.62 ? p.cuantos : c.p > p.umbral ? Math.max(1, p.cuantos - 1) : 0;
        if (!cuantos) return;

        g.save();
        g.globalCompositeOperation = "lighter";
        g.strokeStyle = p.color;
        g.lineWidth = Math.max(1, c.W * 0.0018);
        g.globalAlpha = p.alfa + p.alfaP * c.p;

        for (let i = 0; i < cuantos; i++) {
          const r = azar(c.cuadro * 97 + i * 7919);
          let x = c.fx + r() * c.fw;
          let y = c.fy + r() * c.fh;
          const largo = c.fh * (0.05 + r() * p.largo);
          let ang = -Math.PI / 2 + (r() - 0.5) * 2.2;

          g.beginPath();
          g.moveTo(x, y);
          const tramos = 5 + Math.floor(r() * 5);
          for (let k = 0; k < tramos; k++) {
            ang += (r() - 0.5) * 1.5;
            x += Math.cos(ang) * (largo / tramos);
            y += Math.sin(ang) * (largo / tramos);
            g.lineTo(x, y);
          }
          g.stroke();
        }
        g.restore();
      },
    },

    lluvia: {
      nombre: "Lluvia",
      pista: "Hilos inclinados cayendo.",
      capa: "frente",
      def: { cantidad: 120, color: "#b9d2ff", alfa: 0.22, largo: 0.05, inclinacion: 0.18 },
      campos: [
        { clave: "cantidad", etiqueta: "Cantidad", tipo: "rango", min: 0, max: 400, paso: 10 },
        { clave: "color", etiqueta: "Color", tipo: "color" },
        { clave: "alfa", etiqueta: "Brillo", tipo: "rango", min: 0, max: 80, paso: 2, escala: 100 },
        { clave: "inclinacion", etiqueta: "Inclinación", tipo: "rango", min: -60, max: 60, paso: 2, escala: 100 },
      ],
      preparar(p) {
        const r = azar(3311);
        const lista = [];
        for (let i = 0; i < p.cantidad; i++) {
          lista.push({ x: r(), desfase: r(), vueltas: 2 + Math.floor(r() * 3), esc: 0.6 + r() * 0.8 });
        }
        return lista;
      },
      dibujar(g, p, c, lista) {
        g.save();
        g.strokeStyle = p.color;
        g.lineWidth = Math.max(1, c.W * 0.0014);
        for (let i = 0; i < lista.length; i++) {
          const e = lista[i];
          const u = (c.fase * e.vueltas + e.desfase) % 1;
          const x = c.W * (e.x + p.inclinacion * u * 0.3);
          const y = c.H * (-0.08 + u * 1.16);
          const l = c.H * p.largo * e.esc;
          g.globalAlpha = p.alfa * Math.sin(u * Math.PI);
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + c.W * p.inclinacion * 0.12, y + l);
          g.stroke();
        }
        g.restore();
      },
    },

    meteoros: {
      nombre: "Meteoros",
      pista: "Estelas que cruzan en diagonal de vez en cuando.",
      capa: "fondo",
      def: { cantidad: 5, color: "#ffffff", alfa: 0.5, largo: 0.18, angulo: 0.6 },
      campos: [
        { clave: "cantidad", etiqueta: "Cuántos", tipo: "rango", min: 1, max: 20, paso: 1 },
        { clave: "color", etiqueta: "Color", tipo: "color" },
        { clave: "alfa", etiqueta: "Brillo", tipo: "rango", min: 0, max: 100, paso: 5, escala: 100 },
        { clave: "largo", etiqueta: "Estela", tipo: "rango", min: 5, max: 60, paso: 1, escala: 100 },
      ],
      preparar(p) {
        const r = azar(7788);
        const lista = [];
        for (let i = 0; i < p.cantidad; i++) {
          lista.push({ x: r(), y: r() * 0.7, desfase: r(), esc: 0.7 + r() * 0.7 });
        }
        return lista;
      },
      dibujar(g, p, c, lista) {
        const dx = Math.cos(p.angulo), dy = Math.sin(p.angulo);
        g.save();
        g.globalCompositeOperation = "lighter";
        for (let i = 0; i < lista.length; i++) {
          const e = lista[i];
          const u = (c.fase + e.desfase) % 1;
          // sólo se ve un ratito de todo el bucle: por eso parece esporádico
          if (u > 0.22) continue;
          const t = u / 0.22;
          const viaje = Math.max(c.W, c.H) * 1.3;
          const x = c.W * e.x + dx * viaje * t;
          const y = c.H * e.y + dy * viaje * t;
          const l = Math.max(c.W, c.H) * p.largo * e.esc;

          const gr = g.createLinearGradient(x, y, x - dx * l, y - dy * l);
          gr.addColorStop(0, rgba(p.color, p.alfa * Math.sin(t * Math.PI)));
          gr.addColorStop(1, "rgba(0,0,0,0)");
          g.strokeStyle = gr;
          g.lineWidth = Math.max(1, c.W * 0.0025 * e.esc);
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x - dx * l, y - dy * l);
          g.stroke();
        }
        g.restore();
      },
    },

    orbitas: {
      nombre: "Órbitas",
      pista: "Luces girando alrededor de la figura.",
      capa: "frente",
      def: { cantidad: 22, color: "#ffffff", alfa: 0.6, radio: 0.55, aplanado: 0.35, giro: 1 },
      campos: [
        { clave: "cantidad", etiqueta: "Cuántas", tipo: "rango", min: 1, max: 80, paso: 1 },
        { clave: "color", etiqueta: "Color", tipo: "color" },
        { clave: "radio", etiqueta: "Radio", tipo: "rango", min: 20, max: 120, paso: 2, escala: 100 },
        { clave: "giro", etiqueta: "Vueltas", tipo: "rango", min: 1, max: 5, paso: 1 },
      ],
      preparar(p) {
        const r = azar(6060);
        const lista = [];
        for (let i = 0; i < p.cantidad; i++) {
          lista.push({ desfase: r(), alturaY: r(), esc: 0.6 + r() * 0.9, radio: 0.7 + r() * 0.5 });
        }
        return lista;
      },
      dibujar(g, p, c, lista) {
        const cx = c.esRecorte ? c.fx + c.fw / 2 : c.W / 2;
        const base = c.esRecorte ? c.fw : Math.min(c.W, c.H);
        g.save();
        g.globalCompositeOperation = "lighter";
        g.fillStyle = p.color;
        for (let i = 0; i < lista.length; i++) {
          const e = lista[i];
          const a = (c.fase * p.giro + e.desfase) * TAU;
          const rr = base * p.radio * e.radio;
          const cy = (c.esRecorte ? c.fy + c.fh * (0.15 + e.alturaY * 0.7) : c.H * e.alturaY);
          const x = cx + Math.cos(a) * rr;
          const y = cy + Math.sin(a) * rr * p.aplanado;
          // las de atrás se ven más tenues: da sensación de vuelta completa
          g.globalAlpha = p.alfa * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(a))) * (0.5 + 0.5 * c.p);
          g.beginPath();
          g.arc(x, y, Math.max(0.6, 2.2 * e.esc * Math.max(0.3, c.W / 1080)), 0, TAU);
          g.fill();
        }
        g.restore();
      },
    },

    charco: {
      nombre: "Charco de luz",
      pista: "Un halo tendido a los pies de la figura.",
      capa: "fondo",
      def: { color: "#7fb2ff", alfa: 0.30, ancho: 0.9, alto: 0.10 },
      campos: [
        { clave: "color", etiqueta: "Color", tipo: "color" },
        { clave: "alfa", etiqueta: "Brillo", tipo: "rango", min: 0, max: 100, paso: 5, escala: 100 },
        { clave: "ancho", etiqueta: "Ancho", tipo: "rango", min: 20, max: 180, paso: 5, escala: 100 },
      ],
      dibujar(g, p, c) {
        if (!c.esRecorte) return;
        const cx = c.fx + c.fw / 2;
        const cy = c.fy + c.fh * 0.98;
        const rx = c.fw * p.ancho * (1 + 0.05 * c.p);
        const ry = c.fh * p.alto;

        g.save();
        g.globalCompositeOperation = "lighter";
        g.translate(cx, cy);
        g.scale(1, ry / rx);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
        gr.addColorStop(0, rgba(p.color, p.alfa * (0.6 + 0.4 * c.p)));
        gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr;
        g.beginPath();
        g.arc(0, 0, rx, 0, TAU);
        g.fill();
        g.restore();
      },
    },

    contorno: {
      nombre: "Contorno encendido",
      pista: "El filo de la figura se enciende con el pulso.",
      capa: "frente",
      def: { color: "#ffffff", alfa: 0.5, grosor: 3 },
      campos: [
        { clave: "color", etiqueta: "Color", tipo: "color" },
        { clave: "alfa", etiqueta: "Brillo", tipo: "rango", min: 0, max: 100, paso: 5, escala: 100 },
        { clave: "grosor", etiqueta: "Grosor", tipo: "rango", min: 1, max: 14, paso: 1 },
      ],
      // La silueta es una mancha SÓLIDA: correrla y dibujarla encima taparía
      // la figura entera de color. Para quedarse sólo con el filo hay que
      // dilatarla y después restarle la silueta original.
      preparar(p, c) {
        if (!c.esRecorte || !c.silueta) return null;
        const d = Math.max(1, p.grosor * Math.max(0.4, c.W / 1080) * 2);
        const aro = c.crearLienzo(c.silueta.width, c.silueta.height);
        const g = aro.getContext("2d");

        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * TAU;
          g.drawImage(c.silueta, Math.cos(a) * d, Math.sin(a) * d);
        }
        g.globalCompositeOperation = "destination-out";
        g.drawImage(c.silueta, 0, 0);
        g.globalCompositeOperation = "source-in";
        g.fillStyle = p.color;
        g.fillRect(0, 0, aro.width, aro.height);
        return aro;
      },
      dibujar(g, p, c, aro) {
        if (!aro) return;
        g.save();
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = p.alfa * (0.25 + 0.75 * c.p);
        g.drawImage(aro, c.fx, c.fy + c.bob, c.fw, c.fh);
        g.restore();
      },
    },

    rejilla: {
      nombre: "Rejilla en fuga",
      pista: "Piso cuadriculado que corre hacia el horizonte.",
      capa: "fondo",
      def: { color: "#a06bff", alfa: 0.30, lineas: 14, horizonte: 0.62, velocidad: 1 },
      campos: [
        { clave: "color", etiqueta: "Color", tipo: "color" },
        { clave: "alfa", etiqueta: "Brillo", tipo: "rango", min: 0, max: 100, paso: 5, escala: 100 },
        { clave: "lineas", etiqueta: "Líneas", tipo: "rango", min: 4, max: 40, paso: 1 },
        { clave: "horizonte", etiqueta: "Horizonte", tipo: "rango", min: 20, max: 90, paso: 2, escala: 100 },
      ],
      dibujar(g, p, c) {
        const hy = c.H * p.horizonte;
        g.save();
        g.globalCompositeOperation = "lighter";
        g.strokeStyle = p.color;
        g.globalAlpha = p.alfa * (0.6 + 0.4 * c.p);
        g.lineWidth = Math.max(1, c.W * 0.0016);

        // fugadas: convergen todas en el punto de fuga
        for (let i = 0; i <= p.lineas; i++) {
          const x = (i / p.lineas) * c.W * 3 - c.W;
          g.beginPath();
          g.moveTo(x, c.H);
          g.lineTo(c.W / 2, hy);
          g.stroke();
        }
        // horizontales: se acercan al horizonte y reaparecen, una vez por bucle
        for (let i = 0; i < p.lineas; i++) {
          const u = ((i / p.lineas) + c.fase * p.velocidad) % 1;
          const y = hy + (c.H - hy) * (u * u);
          g.globalAlpha = p.alfa * u * (0.6 + 0.4 * c.p);
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(c.W, y);
          g.stroke();
        }
        g.restore();
      },
    },

    escaneo: {
      nombre: "Líneas de escaneo",
      pista: "Rayas horizontales de monitor viejo, con una banda que baja.",
      capa: "frente",
      def: { alfa: 0.10, separacion: 3, banda: 0.35 },
      campos: [
        { clave: "alfa", etiqueta: "Fuerza", tipo: "rango", min: 0, max: 50, paso: 1, escala: 100 },
        { clave: "separacion", etiqueta: "Separación", tipo: "rango", min: 2, max: 10, paso: 1 },
        { clave: "banda", etiqueta: "Banda que baja", tipo: "rango", min: 0, max: 100, paso: 5, escala: 100 },
      ],
      dibujar(g, p, c) {
        const paso = Math.max(2, Math.round(p.separacion * Math.max(0.4, c.W / 1080) * 2));
        g.save();
        g.globalAlpha = p.alfa;
        g.fillStyle = "#000000";
        for (let y = 0; y < c.H; y += paso) g.fillRect(0, y, c.W, Math.max(1, paso / 2));

        if (p.banda > 0) {
          const by = ((c.fase) % 1) * c.H * 1.4 - c.H * 0.2;
          const alto = c.H * 0.16;
          const gr = g.createLinearGradient(0, by, 0, by + alto);
          gr.addColorStop(0, "rgba(255,255,255,0)");
          gr.addColorStop(0.5, `rgba(255,255,255,${0.05 * p.banda})`);
          gr.addColorStop(1, "rgba(255,255,255,0)");
          g.globalAlpha = 1;
          g.fillStyle = gr;
          g.fillRect(0, by, c.W, alto);
        }
        g.restore();
      },
    },

    relampago: {
      nombre: "Relámpago de fondo",
      pista: "El cielo se ilumina de golpe cada vuelta.",
      capa: "fondo",
      def: { color: "#cddfff", alfa: 0.35, cuando: 0.35, duracion: 0.06 },
      campos: [
        { clave: "color", etiqueta: "Color", tipo: "color" },
        { clave: "alfa", etiqueta: "Fuerza", tipo: "rango", min: 0, max: 100, paso: 5, escala: 100 },
        { clave: "cuando", etiqueta: "Momento", tipo: "rango", min: 0, max: 95, paso: 5, escala: 100 },
        { clave: "duracion", etiqueta: "Duración", tipo: "rango", min: 1, max: 30, paso: 1, escala: 100 },
      ],
      dibujar(g, p, c) {
        const d = Math.abs(((c.fase - p.cuando) % 1 + 1) % 1);
        if (d > p.duracion) return;
        const t = 1 - d / p.duracion;
        // dos golpes: el relámpago real parpadea, no se apaga liso
        const parpadeo = t * (0.55 + 0.45 * Math.sin(t * 28));
        g.save();
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = p.alfa * parpadeo;
        g.fillStyle = p.color;
        g.fillRect(0, 0, c.W, c.H);
        g.restore();
      },
    },

    destello: {
      nombre: "Destello",
      pista: "La pantalla entera se enciende en el pico del pulso.",
      capa: "frente",
      def: { color: "#ffffff", alfa: 0.14, umbral: 0.75 },
      campos: [
        { clave: "color", etiqueta: "Color", tipo: "color" },
        { clave: "alfa", etiqueta: "Fuerza", tipo: "rango", min: 0, max: 60, paso: 2, escala: 100 },
        { clave: "umbral", etiqueta: "Umbral", tipo: "rango", min: 10, max: 95, paso: 5, escala: 100 },
      ],
      dibujar(g, p, c) {
        if (c.p <= p.umbral) return;
        const fuerza = (c.p - p.umbral) / Math.max(0.01, 1 - p.umbral);
        g.save();
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = p.alfa * fuerza;
        g.fillStyle = p.color;
        g.fillRect(0, 0, c.W, c.H);
        g.restore();
      },
    },
    // --------------------------------------------------------- acabado

    vineta: {
      nombre: "Viñeta",
      pista: "Oscurece las orillas para que la vista caiga al centro.",
      capa: "acabado",
      def: { color: "#000000", alfa: 0.72, apertura: 0.30 },
      campos: [
        { clave: "color", etiqueta: "Color", tipo: "color" },
        { clave: "alfa", etiqueta: "Fuerza", tipo: "rango", min: 0, max: 100, paso: 5, escala: 100 },
        { clave: "apertura", etiqueta: "Apertura", tipo: "rango", min: 5, max: 80, paso: 5, escala: 100 },
      ],
      dibujar(g, p, c) {
        const vi = g.createRadialGradient(c.W / 2, c.H * 0.45, Math.min(c.W, c.H) * p.apertura,
                                          c.W / 2, c.H / 2, Math.max(c.W, c.H) * 0.72);
        vi.addColorStop(0, rgba(p.color, 0));
        vi.addColorStop(1, rgba(p.color, p.alfa));
        g.fillStyle = vi;
        g.fillRect(0, 0, c.W, c.H);
      },
    },

    grano: {
      nombre: "Grano de película",
      pista: "Ruido fino que quita el aspecto de plástico.",
      capa: "acabado",
      def: { alfa: 0.55 },
      campos: [
        { clave: "alfa", etiqueta: "Fuerza", tipo: "rango", min: 0, max: 100, paso: 5, escala: 100 },
      ],
      preparar(p, c) {
        const tiles = [];
        for (let k = 0; k < 4; k++) {
          const t = c.crearLienzo(200, 200);
          const gg = t.getContext("2d");
          const img = gg.createImageData(200, 200);
          const d = img.data;
          const rnd = azar(9000 + k);
          for (let i = 0; i < d.length; i += 4) {
            const v = rnd() * 255;
            d[i] = d[i + 1] = d[i + 2] = v;
            d[i + 3] = 13;
          }
          gg.putImageData(img, 0, 0);
          tiles.push(t);
        }
        return tiles;
      },
      dibujar(g, p, c, tiles) {
        const t = tiles[c.cuadro % tiles.length];
        g.save();
        g.globalAlpha = p.alfa;
        g.fillStyle = g.createPattern(t, "repeat");
        g.fillRect(0, 0, c.W, c.H);
        g.restore();
      },
    },
  };

  // La vibración no pinta nada: mueve la figura. Se resuelve aparte.
  const VIBRACION = {
    nombre: "Vibración",
    pista: "La figura tiembla cuando el pulso llega a su punto alto.",
    capa: "figura",
    def: { fuerza: 3, umbral: 0.7 },
    campos: [
      { clave: "fuerza", etiqueta: "Fuerza", tipo: "rango", min: 0, max: 20, paso: 1 },
      { clave: "umbral", etiqueta: "Umbral", tipo: "rango", min: 10, max: 95, paso: 5, escala: 100 },
    ],
  };

  BANCO.vibracion = VIBRACION;

  function conDefectos(tipo, valores) {
    const base = BANCO[tipo];
    if (!base) return null;
    return Object.assign({}, base.def, valores || {});
  }

  return { BANCO, azar, rgba, conDefectos, TAU };
});
