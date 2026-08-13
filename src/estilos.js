/* estilos.js — las recetas de partida.

   Un estilo ya no trae los efectos metidos en el código: trae una LISTA de
   efectos del banco (efectos.js), en orden, cada uno con sus números. Se
   pueden apagar, reordenar y agregar otros desde la interfaz.

   Todo es DATO, no funciones: así el navegador puede mandarle un estilo
   modificado al servidor en un JSON y no se pierde nada por el camino. */

(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (raiz.Motor = raiz.Motor || {}).estilos = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const ESTILOS = {
    ultra: {
      nombre: "Ultra Instinto",
      pista: "Una figura sola con fondo blanco. Aura plateada que fluye.",
      modo: "recorte",
      colocacion: "auto",
      cielo: ["#05060d", "#0b1226", "#04050b"],
      auraLejana: "#9fc6ff",
      auraCercana: "#eaf4ff",
      // figura sola y estrecha: aguanta un halo ancho y fuerte
      halo: { lejos: 0.075, cerca: 0.022, fuerza: 0.16, alfaLejos: [0.22, 0.26], alfaCerca: [0.40, 0.42] },
      // el aura de Ultra Instinto no late fuerte: fluye
      pulso: { tipo: "fluido", base: 0.5, amp1: 0.30, frec1: 1, amp2: 0.20, frec2: 3, desf2: 1.1 },
      efectos: [
        { tipo: "nebulosa", color: "#78aaff", alfa: 0.055 },
        { tipo: "resplandor", color: "#a0c8ff", color2: "#5a8ce6" },
        { tipo: "rayos", color: "#e8f2ff" },
        { tipo: "chispas", cantidad: 150, colores: ["#ffffff", "#bcd9ff", "#8fb8ff"] },
        { tipo: "vineta" },
        { tipo: "grano" },
      ],
    },

    saiyajin: {
      nombre: "Equipo Saiyajin",
      pista: "Varios personajes con fondo blanco. Cada uno trae su color.",
      modo: "recorte",
      colocacion: "auto",
      cielo: ["#07050f", "#150a24", "#05040c"],
      auraLejana: "#b79bff",
      auraCercana: "#f2ecff",
      // grupo apretado: halo angosto y flojo, si no se rellenan los huecos
      halo: { lejos: 0.030, cerca: 0.010, fuerza: 0.040, alfaLejos: [0.14, 0.16], alfaCerca: [0.20, 0.24] },
      pulso: { tipo: "fluido", base: 0.5, amp1: 0.32, frec1: 1, amp2: 0.18, frec2: 4, desf2: 0.7 },
      efectos: [
        { tipo: "nebulosa", color: "#aa78ff", alfa: 0.06 },
        { tipo: "resplandor", color: "#a0c8ff", color2: "#5a8ce6" },
        { tipo: "rayos", color: "#d9b6ff" },
        { tipo: "chispas", cantidad: 190,
          colores: ["#ffffff", "#c9a8ff", "#a6ff8f", "#ffb45e", "#8fd8ff"] },
        { tipo: "vineta" },
        { tipo: "grano" },
      ],
    },

    augurio: {
      nombre: "Augurio",
      pista: "La imagen ya trae su atmósfera. Sólo se le anima la luz encima.",
      modo: "lamina",
      colocacion: "auto",
      // "cubrir" tapa la pantalla recortando; "contener" la mete completa y
      // rellena alrededor. Con una imagen chica y casi cuadrada, cubrir se
      // comería el centro, así que por defecto va contenida.
      encaje: "contener",
      cielo: ["#050102", "#120407", "#040101"],
      auraLejana: "#8c0f1a",
      auraCercana: "#ff2f42",
      halo: { lejos: 0.040, cerca: 0.014, fuerza: 0.09, alfaLejos: [0.18, 0.20], alfaCerca: [0.26, 0.30] },
      pulso: { tipo: "latido" },
      efectos: [
        { tipo: "nebulosa", color: "#ff2836", alfa: 0.05, cantidad: 4,
          radio: 0.55, vaiven: 0.12, ampX: 0.26, ampY: 0.22, centroY: 0.44, separacion: 1.7 },
        // sobre una lámina el resplandor va ENCIMA, no detrás
        { tipo: "resplandor", capa: "frente", centro: "pantalla",
          color: "#ff2c3a", color2: "#aa0e1a",
          a1: 0, a1p: 0.20, a2: 0, a2p: 0.10, corte: 0.5, radio: 0.34, radioP: 0.05 },
        { tipo: "chispas", cantidad: 110, colores: ["#ff6a2b", "#ff2138", "#ffb27a"] },
        { tipo: "vineta" },
        { tipo: "grano" },
      ],
    },
  };

  // El pulso se guarda como dato y se convierte en función aquí.
  function hacerPulso(p) {
    if (!p || p.tipo === "fluido") {
      const c = Object.assign(
        { base: 0.5, amp1: 0.30, frec1: 1, amp2: 0.20, frec2: 3, desf2: 1.1 }, p || {});
      return (f) => c.base
        + c.amp1 * Math.sin(f * Math.PI * 2 * c.frec1)
        + c.amp2 * Math.sin(f * Math.PI * 2 * c.frec2 + c.desf2);
    }
    // latido doble de corazón; el tercer golpe está fuera del rango a
    // propósito, para que el bucle cierre sin que se note el salto
    const golpe = (f, c, ancho, alto) =>
      alto * Math.exp(-((f - c) * (f - c)) / (2 * ancho * ancho));
    return (f) => Math.min(1,
      golpe(f, 0.06, 0.030, 1) + golpe(f, 0.20, 0.038, 0.55) + golpe(f, 1.06, 0.030, 1));
  }

  function clonar(estilo) {
    return JSON.parse(JSON.stringify(estilo));
  }

  return { ESTILOS, hacerPulso, clonar };
});
